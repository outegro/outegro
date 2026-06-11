import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { createLogger } from "@outegro/core";
import { AppModule } from "./app.module";
import { env } from "./config";

// Channel-agnostic delivery: consumes notify.* from RabbitMQ → Resend / Telegram.
const logger = createLogger({ service: "notifications-backend" });

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: ["error", "warn", "log"] });
  app.enableShutdownHooks();
  await app.listen(env.PORT, "0.0.0.0");
  logger.info("notifications-backend listening", { port: env.PORT });
}

bootstrap().catch((error) => {
  logger.error("bootstrap failed", { error: String(error) });
  process.exit(1);
});
