import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { createLogger } from "@outegro/core";
import { AppModule } from "./app.module";
import { env } from "./config";

const logger = createLogger({ service: "example-api" });

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: ["error", "warn", "log"] });

  app.enableCors({
    origin: env.CORS_ORIGIN.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    credentials: true,
  });

  // Graceful SIGTERM/SIGINT — runs OnModuleDestroy hooks (closes DB pool).
  app.enableShutdownHooks();

  await app.listen(env.PORT, "0.0.0.0");
  logger.info("example-api listening", {
    port: env.PORT,
    dbEnabled: Boolean(env.DATABASE_URL),
    startedAt: new Date().toISOString(),
  });
}

bootstrap().catch((error) => {
  logger.error("bootstrap failed", { error: String(error) });
  process.exit(1);
});
