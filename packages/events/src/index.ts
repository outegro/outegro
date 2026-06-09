/**
 * RabbitMQ topology + event payload types shared between publishers and
 * consumers. Wiring (channels, DLX, retries) lands in Chapter 5; this package
 * is the contract: exchange names, routing keys, and payload shapes.
 */

export const Exchanges = {
  /** Topic exchange for all asynchronous notifications. */
  Notify: "notify",
} as const;
export type Exchange = (typeof Exchanges)[keyof typeof Exchanges];

export const RoutingKeys = {
  /** Generic notification request (email/telegram/...). */
  NotifyRequested: "notify.requested",
  /** High-priority login code path. */
  NotifyLoginCode: "notify.login_code",
  /** Security-related alert (new session, terminate, etc.). */
  NotifySecurityAlert: "notify.security_alert",
} as const;
export type RoutingKey = (typeof RoutingKeys)[keyof typeof RoutingKeys];

export type NotificationChannel = "email" | "telegram";

export interface NotifyRequestedEvent {
  /** Idempotency key — consumers dedupe on this. */
  id: string;
  userId: string;
  template: string;
  channels: NotificationChannel[];
  data: Record<string, unknown>;
  /** ISO timestamp. */
  requestedAt: string;
}

/** Map each routing key to its payload type for type-safe publish/consume. */
export interface EventPayloads {
  [RoutingKeys.NotifyRequested]: NotifyRequestedEvent;
  [RoutingKeys.NotifyLoginCode]: NotifyRequestedEvent;
  [RoutingKeys.NotifySecurityAlert]: NotifyRequestedEvent;
}
