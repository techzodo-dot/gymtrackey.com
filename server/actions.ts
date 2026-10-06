import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { ZodError } from "zod";
import { AuthError } from "@/server/auth/guard";
import { DomainError } from "@/server/errors";
import { logger } from "@/lib/logger";

export function withParam(path: string, key: string, value: string) {
  const [base, qs = ""] = path.split("?");
  const p = new URLSearchParams(qs);
  p.set(key, value);
  return `${base}?${p.toString()}`;
}

function messageOf(e: unknown): string {
  if (e instanceof ZodError) {
    const f = e.issues[0];
    return f ? `${f.path.join(".") || "Input"}: ${f.message}` : "Invalid input.";
  }
  if (e instanceof DomainError || e instanceof AuthError) return e.message;
  logger.error("action.unhandled", { err: e instanceof Error ? e.message : String(e) });
  return "Something went wrong. Please try again.";
}

/**
 * Runs a server action body. Return a path to redirect to on success (optionally
 * with ?ok=message). Expected errors redirect back to `failPath` with ?error=message.
 */
export async function act(failPath: string, fn: () => Promise<string | void>): Promise<never> {
  let dest: string | void;
  try {
    dest = await fn();
  } catch (e) {
    if (isRedirectError(e)) throw e;
    redirect(withParam(failPath, "error", messageOf(e)));
  }
  redirect(dest || failPath);
}

export const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
};
/** FormData -> plain object, empty strings dropped. */
export function formObject(fd: FormData): Record<string, string> {
  const o: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string" && v.trim() !== "" && !k.startsWith("$ACTION")) o[k] = v.trim();
  return o;
}
