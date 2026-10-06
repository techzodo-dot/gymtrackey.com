import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";

const COST = process.env.NODE_ENV === "test" ? 4 : 12;

export const hashPassword = (plain: string) => bcrypt.hash(plain, COST);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

/** Token for emailed links. Only the sha256 is stored; the raw token is single-use and short-lived. */
export function newResetToken() {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: hashToken(raw) };
}
export const hashToken = (raw: string) => createHash("sha256").update(raw).digest("hex");

let dummy: Promise<string> | undefined;
/** Valid bcrypt hash used to equalise timing when the email is unknown. */
export const dummyHash = () => (dummy ??= hashPassword("gymtrackey-timing-equaliser"));
