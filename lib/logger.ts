/** Structured JSON logs. Redacts secret-looking keys; never pass raw passwords/tokens. */
const SECRET_KEY = /pass(word)?|secret|token|authorization|api[-_]?key|card/i;

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, SECRET_KEY.test(k) ? "[redacted]" : redact(v)]),
    );
  }
  return value;
}

function write(level: "info" | "warn" | "error", event: string, ctx: Record<string, unknown> = {}) {
  if (process.env.NODE_ENV === "test") return;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...(redact(ctx) as object) });
  (level === "error" ? console.error : console.log)(line);
}

export const logger = {
  info: (e: string, c?: Record<string, unknown>) => write("info", e, c),
  warn: (e: string, c?: Record<string, unknown>) => write("warn", e, c),
  error: (e: string, c?: Record<string, unknown>) => write("error", e, c),
};
