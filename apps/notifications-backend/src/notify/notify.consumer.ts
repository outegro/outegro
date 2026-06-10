import { Nack, RabbitSubscribe } from "@golevelup/nestjs-rabbitmq";
import { Injectable } from "@nestjs/common";
import { createLogger } from "@outegro/core";
import { Exchanges, type NotifyRequestedEvent } from "@outegro/events";
import { DeliveryService } from "./delivery.service";

const logger = createLogger({ service: "notifications-backend" });

@Injectable()
export class NotifyConsumer {
  constructor(private readonly delivery: DeliveryService) {}

  @RabbitSubscribe({
    exchange: Exchanges.Notify,
    routingKey: "notify.#",
    queue: "notifications",
    queueOptions: {
      durable: true,
      arguments: { "x-max-priority": 10, "x-dead-letter-exchange": "notify.dlx" },
    },
  })
  async handle(event: NotifyRequestedEvent): Promise<Nack | undefined> {
    try {
      await this.delivery.deliver(event);
      return undefined; // ack
    } catch (error) {
      logger.error("delivery failed → DLX", { id: event?.id, error: String(error) });
      return new Nack(false); // park to notify.dlx (no requeue)
    }
  }

  // Park failed notifications so they're inspectable (v1 — real replay later).
  @RabbitSubscribe({
    exchange: "notify.dlx",
    routingKey: "#",
    queue: "notify.dlq",
    queueOptions: { durable: true },
  })
  async dead(event: NotifyRequestedEvent): Promise<void> {
    logger.warn("parked failed notification", { id: event?.id, template: event?.template });
  }
}
