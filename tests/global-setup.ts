import { execSync } from "node:child_process";

/** Applies migrations to the dedicated test database before any test runs. */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://postgres@localhost:5433/gymtrackey_test?host=/tmp";
  process.env.DATABASE_URL = url;
  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url }, stdio: "ignore" });
}
