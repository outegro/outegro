import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { createLogger } from "@outegro/core";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { env } from "./config";

const logger = createLogger({ service: "auth-backend" });

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: ["error", "warn", "log"] });

  app.use(cookieParser());
  app.enableCors({
    origin: env.CORS_ORIGIN.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    credentials: true,
  });
  app.enableShutdownHooks();

  await app.listen(env.PORT, "0.0.0.0");
  logger.info("auth-backend listening", { port: env.PORT });
}

bootstrap().catch((error) => {
  logger.error("bootstrap failed", { error: String(error) });
  process.exit(1);
});
