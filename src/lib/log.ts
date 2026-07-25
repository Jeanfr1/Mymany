/**
 * Minimal structured logger (JSON lines). Observability per brief §20.
 *
 * NEVER pass secrets (tokens, App Secret, service role key, cron secret) as
 * field values. Use maskToken() from src/lib/crypto/token.ts for token hints.
 * A defensive redactor strips obvious secret-looking keys as a backstop.
 */

type Level = "debug" | "info" | "warn" | "error";

export type LogFields = Record<string, unknown>;

const REDACT_KEYS = [
  "token",
  "access_token",
  "app_secret",
  "appsecret",
  "secret",
  "authorization",
  "service_role",
  "service_role_key",
  "password",
  "encryption_key",
  "signature",
];

function redact(fields: LogFields): LogFields {
  const out: LogFields = {};
  for (const [k, v] of Object.entries(fields)) {
    const lower = k.toLowerCase();
    if (REDACT_KEYS.some((r) => lower.includes(r))) {
      out[k] = "[redacted]";
    } else {
      out[k] = v;
    }
  }
  return out;
}

function emit(level: Level, message: string, fields: LogFields = {}) {
  const line = {
    ts: new Date().toISOString(),
    level,
    message,
    ...redact(fields),
  };
  const serialized = JSON.stringify(line);
  if (level === "error") console.error(serialized);
  else if (level === "warn") console.warn(serialized);
  else console.log(serialized);
}

export const log = {
  debug: (message: string, fields?: LogFields) => emit("debug", message, fields),
  info: (message: string, fields?: LogFields) => emit("info", message, fields),
  warn: (message: string, fields?: LogFields) => emit("warn", message, fields),
  error: (message: string, fields?: LogFields) => emit("error", message, fields),
};
