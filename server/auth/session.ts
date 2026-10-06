import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";

export const SESSION_COOKIE = "gt_session";
const DEFAULT_TTL = 60 * 60 * 24 * 7;
export const REMEMBER_TTL = 60 * 60 * 24 * 30;

export type SessionClaims = { uid: string; role: Role; tid: string | null };

const key = () => {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET missing or too short");
  return new TextEncoder().encode(s);
};

export async function signSession(claims: SessionClaims, ttl = DEFAULT_TTL) {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttl}s`)
    .sign(key());
}

export async function readSession(token: string | undefined): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (typeof payload.uid !== "string" || typeof payload.role !== "string") return null;
    return { uid: payload.uid, role: payload.role as Role, tid: (payload.tid as string | null) ?? null };
  } catch {
    return null;
  }
}

export const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge,
});
