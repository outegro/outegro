/**
 * RabbitMQ topology + event payload types shared between publishers and
 * consumers. Wiring (channels, DLX, retries) lands in Chapter 5; this package
 * is the contract: exchange names, routing keys, and payload shapes.
 */

export const Exchanges = {
  /** Topic exchange for all asynchronous notifications. */
  Notify: "notify",
  /** Topic exchange for domain events emitted by auth-backend. */
  Auth: "auth",
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

/** Domain events published on `Exchanges.Auth` for other services to consume. */
export const AuthRoutingKeys = {
  /** A new user account was created (first login). */
  UserCreated: "auth.user.created",
  /** A session was revoked (logout, reuse-detection, or explicit terminate). */
  SessionTerminated: "auth.session.terminated",
} as const;
export type AuthRoutingKey = (typeof AuthRoutingKeys)[keyof typeof AuthRoutingKeys];

export interface AuthUserCreatedEvent {
  userId: string;
  email: string;
  createdAt: string;
}

export type NotificationChannel = "email" | "telegram";

/** Where to deliver. Publisher includes what it knows (auth knows the email). */
export interface NotifyTarget {
  email?: string;
  telegramChatId?: string;
}

export interface NotifyRequestedEvent {
  /** Idempotency key — consumers dedupe on this. */
  id: string;
  userId: string;
  /** Template name, e.g. "login_code" | "security_alert". */
  template: string;
  /** Preferred channels; mandatory templates ignore user opt-outs. */
  channels: NotificationChannel[];
  to: NotifyTarget;
  /** Template variables (e.g. { code: "123456" }). */
  data: Record<string, unknown>;
  /** ISO timestamp. */
  requestedAt: string;
}

/** Mandatory (security/transactional) templates always send, ignoring preferences. */
export const MandatoryTemplates = ["login_code", "security_alert"] as const;
export type MandatoryTemplate = (typeof MandatoryTemplates)[number];

export function isMandatory(template: string): boolean {
  return (MandatoryTemplates as readonly string[]).includes(template);
}

/** Map each routing key to its payload type for type-safe publish/consume. */
export interface EventPayloads {
  [RoutingKeys.NotifyRequested]: NotifyRequestedEvent;
  [RoutingKeys.NotifyLoginCode]: NotifyRequestedEvent;
  [RoutingKeys.NotifySecurityAlert]: NotifyRequestedEvent;
}
