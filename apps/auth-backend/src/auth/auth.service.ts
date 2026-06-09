import { createHash, randomInt } from "node:crypto";
import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { createLogger } from "@outegro/core";
import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { env } from "../config";
import { type AuthDb, DB } from "../db/db.module";
import { entitlements, identities, loginCodes, sessions, users } from "../db/schema";
import { TokensService } from "../tokens/tokens.service";
import { RateLimitService } from "./rate-limit.service";

const logger = createLogger({ service: "auth-backend" });

export interface ReqMeta {
  ip?: string;
  userAgent?: string;
  country?: string;
  city?: string;
}

export interface PublicUser {
  id: string;
  email: string;
  emailVerified: boolean;
  roles: string[];
}

function hashCode(email: string, code: string): string {
  return createHash("sha256").update(`${email}:${code}`).digest("hex");
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private readonly db: AuthDb,
    private readonly tokens: TokensService,
    private readonly rl: RateLimitService,
  ) {}

  async requestCode(email: string, meta: ReqMeta): Promise<void> {
    const emailOk = await this.rl.allow(`code:email:${email}`, 5, 3600);
    const ipOk = meta.ip ? await this.rl.allow(`code:ip:${meta.ip}`, 20, 3600) : true;
    if (!emailOk || !ipOk) {
      throw new HttpException("Too many requests", HttpStatus.TOO_MANY_REQUESTS);
    }

    const user = await this.findOrCreateUser(email);
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const expiresAt = new Date(Date.now() + env.CODE_TTL * 1000);
    await this.db
      .insert(loginCodes)
      .values({ userId: user.id, codeHash: hashCode(email, code), expiresAt });

    // Ch3: delivery stubbed — notifications-backend wires real email/Telegram in Ch5.
    logger.info("login code issued (DEV delivery — logged, not emailed)", { email, code });
    // TODO(ch5): publish auth.login.code_requested on the high-priority RabbitMQ path.
  }

  async verifyCode(
    email: string,
    code: string,
    meta: ReqMeta,
  ): Promise<{ accessToken: string; expiresIn: number; refreshToken: string; user: PublicUser }> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) throw new HttpException("Invalid code", HttpStatus.BAD_REQUEST);

    const [entry] = await this.db
      .select()
      .from(loginCodes)
      .where(
        and(
          eq(loginCodes.userId, user.id),
          isNull(loginCodes.consumedAt),
          gt(loginCodes.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(loginCodes.createdAt))
      .limit(1);

    if (!entry) throw new HttpException("Invalid code", HttpStatus.BAD_REQUEST);

    if (entry.attempts >= env.CODE_MAX_ATTEMPTS) {
      await this.db
        .update(loginCodes)
        .set({ consumedAt: new Date() })
        .where(eq(loginCodes.id, entry.id));
      throw new HttpException("Too many attempts", HttpStatus.BAD_REQUEST);
    }

    if (entry.codeHash !== hashCode(email, code)) {
      await this.db
        .update(loginCodes)
        .set({ attempts: entry.attempts + 1 })
        .where(eq(loginCodes.id, entry.id));
      throw new HttpException("Invalid code", HttpStatus.BAD_REQUEST);
    }

    await this.db
      .update(loginCodes)
      .set({ consumedAt: new Date() })
      .where(eq(loginCodes.id, entry.id));
    if (!user.emailVerified) {
      await this.db
        .update(users)
        .set({ emailVerified: true, updatedAt: new Date() })
        .where(eq(users.id, user.id));
    }

    const [session] = await this.db
      .insert(sessions)
      .values({
        userId: user.id,
        userAgent: meta.userAgent,
        ip: meta.ip,
        country: meta.country,
        city: meta.city,
      })
      .returning();
    if (!session)
      throw new HttpException("Failed to create session", HttpStatus.INTERNAL_SERVER_ERROR);

    const roles = await this.getRoles(user.id);
    const { accessToken, expiresIn } = await this.tokens.signAccess(
      user.id,
      session.id,
      email,
      roles,
    );
    const refreshToken = await this.tokens.issueRefresh(session.id, user.id);

    return {
      accessToken,
      expiresIn,
      refreshToken,
      user: { id: user.id, email, emailVerified: true, roles },
    };
  }

  async refresh(
    refreshToken: string,
    _meta: ReqMeta,
  ): Promise<{ accessToken: string; expiresIn: number; refreshToken: string }> {
    const rotated = await this.tokens.rotateRefresh(refreshToken);
    if (!rotated) throw new HttpException("Invalid refresh token", HttpStatus.UNAUTHORIZED);

    await this.db
      .update(sessions)
      .set({ lastActiveAt: new Date() })
      .where(eq(sessions.id, rotated.sessionId));

    const [user] = await this.db.select().from(users).where(eq(users.id, rotated.userId)).limit(1);
    if (!user) throw new HttpException("Invalid refresh token", HttpStatus.UNAUTHORIZED);

    const roles = await this.getRoles(user.id);
    const { accessToken, expiresIn } = await this.tokens.signAccess(
      user.id,
      rotated.sessionId,
      user.email,
      roles,
    );
    return { accessToken, expiresIn, refreshToken: rotated.token };
  }

  async logout(refreshToken: string): Promise<void> {
    const data = await this.tokens.readRefresh(refreshToken);
    if (!data) return;
    await this.tokens.revokeSession(data.sessionId);
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.id, data.sessionId));
  }

  async me(userId: string): Promise<PublicUser> {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new HttpException("Not found", HttpStatus.NOT_FOUND);
    const roles = await this.getRoles(userId);
    return { id: user.id, email: user.email, emailVerified: user.emailVerified, roles };
  }

  private async findOrCreateUser(email: string): Promise<typeof users.$inferSelect> {
    const [existing] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing) return existing;
    const [created] = await this.db.insert(users).values({ email }).returning();
    if (!created)
      throw new HttpException("Failed to create user", HttpStatus.INTERNAL_SERVER_ERROR);
    await this.db
      .insert(identities)
      .values({ userId: created.id, provider: "email", subject: email });
    logger.info("user created", { userId: created.id });
    return created;
  }

  private async getRoles(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ service: entitlements.service, role: entitlements.role })
      .from(entitlements)
      .where(
        and(
          eq(entitlements.userId, userId),
          or(isNull(entitlements.expiresAt), gt(entitlements.expiresAt, new Date())),
        ),
      );
    return rows.map((r) => `${r.service}:${r.role}`);
  }
}
