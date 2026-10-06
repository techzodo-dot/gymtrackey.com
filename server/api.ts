import { NextResponse } from "next/server";
import { ZodError, type ZodType, type ZodTypeDef } from "zod";
import { AuthError } from "@/server/auth/guard";
import { logger } from "@/lib/logger";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const fail = (message: string, status = 400, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error: message, ...extra }, { status });

/** CSRF defence for cookie-authenticated mutations: Origin must match the request host. */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return; // non-browser clients / same-origin GET
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host || new URL(origin).host !== host) throw new AuthError(403, "Cross-origin request blocked.", "CSRF");
}

export const clientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

export async function parseBody<T>(req: Request, schema: ZodType<T, ZodTypeDef, unknown>): Promise<T> {
  const raw = await req.json().catch(() => {
    throw new ZodError([{ code: "custom", message: "Invalid JSON body", path: [] }]);
  });
  return schema.parse(raw);
}

/** Uniform error mapping so no handler leaks stack traces or internals. */
export function handleError(err: unknown) {
  if (err instanceof ZodError) {
    return fail("Please check the highlighted fields.", 422, { issues: err.flatten().fieldErrors });
  }
  if (err instanceof AuthError) return fail(err.message, err.status, { code: err.code });
  logger.error("api.unhandled", { err: err instanceof Error ? err.message : String(err) });
  return fail("Something went wrong. Please try again.", 500);
}

/** Public origin of this request (works behind proxies). Never use a build-time env for redirects. */
export function publicOrigin(req: Request) {
  const u = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? u.host;
  const proto = req.headers.get("x-forwarded-proto") ?? u.protocol.replace(":", "");
  return `${proto}://${host}`;
}
