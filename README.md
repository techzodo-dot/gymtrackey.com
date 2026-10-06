# GymTrackey

Multi-tenant gym management SaaS — *Track Members. Manage Fees. Grow Your Gym.*

Stack: Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 · PostgreSQL · Prisma 6 · Zod · jose (JWT sessions) · bcrypt · Vitest.

## What's in the box

A working multi-tenant gym SaaS: marketing site, signup → trial, gym dashboard (members, memberships, payments + invoices + receipts, dues, attendance + QR, trainers, workout & diet plans, measurements, expenses, reports/analytics, reminders, announcements, staff & permissions, branches, settings, billing with Razorpay, support tickets, global search, CSV import/export), member portal, Super Admin (gyms, plans/limits/feature flags, coupons, leads, tickets, blog, platform settings), read-only public demo, PWA shell. See [docs/ROADMAP.md](docs/ROADMAP.md) for exactly what is and isn't done.

**Try it in 2 minutes:** `npm i && npm run db:migrate && npm run dev`, open `/demo` → *Explore Demo*, or register a trial gym and click *Load sample data*.

## Setup

```bash
cp .env.example .env          # fill DATABASE_URL and AUTH_SECRET (openssl rand -base64 32)
npm install
npx prisma migrate dev        # applies prisma/migrations
SUPER_ADMIN_EMAIL=you@x.com SUPER_ADMIN_PASSWORD='…' npm run db:seed
npm run dev
```

Checks: `npm run typecheck && npm run lint && npm test`.
Tests use a separate DB via `TEST_DATABASE_URL`; migrations are applied by `tests/global-setup.ts`.

## Architecture

```
app/        routes (marketing, auth, /dashboard, /admin, /member, /trainer, /api)
components/ UI primitives (ui/), marketing/, dashboard/
server/     db/ (prisma + tenant client), auth/ (session, guard, permissions), services/ (business logic)
lib/        env, validation (Zod), logger, money, cn
prisma/     schema.prisma, migrations, seed.ts
tests/      isolation, auth, permissions
```

### Tenant isolation

* Every tenant-owned table has an indexed `tenantId` FK → `Tenant`.
* `tenantId` is **never read from request input**. `server/auth/guard.ts` resolves the user from the signed cookie, reloads them from the DB on every request (suspension/deactivation takes effect immediately) and returns `db = tenantDb(user.tenantId)`.
* `tenantDb()` (`server/db/tenant.ts`) is a Prisma client extension that **overwrites** `tenantId` on every read/update/delete filter and every create/createMany/upsert, so a hostile `tenantId` cannot widen scope. Prisma types still ask for `tenantId` on create; the value passed is replaced by the session tenant.
* The raw `prisma` client is for platform code only (auth lookup, super admin, webhooks).
* `tests/tenant-isolation.test.ts` proves Gym A cannot read, aggregate, update or delete Gym B's data. Keep it green before every deploy.
* Add any new tenant-owned model to `TENANT_MODELS` in `server/db/tenant.ts`.

### Auth & security

bcrypt (cost 12) · HS256 JWT in an `httpOnly`, `SameSite=Lax`, `Secure` (prod) cookie · edge middleware gates areas by role and server guards re-check · Origin check on mutating routes (CSRF) · login/register/lead rate limits (in-memory; use Redis when running more than one instance) · timing-equalised login · Zod validation on every body · security headers in `next.config.ts` · structured logs with secret redaction · audit log.

### Roles

`OWNER` all · `MANAGER` / `RECEPTIONIST` / `TRAINER` defaults in `server/auth/permissions.ts`, overridable per user via `User.permissions` · `MEMBER` own data only · `SUPER_ADMIN` platform only.

### Subscription state

Trial/expired/cancelled tenants are **read-only** (`AuthContext.readOnly`; `requirePermission(p, { write: true })` rejects writes). Data is never deleted on expiry.

## Environment variables

See `.env.example`. Required now: `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`. Super admin credentials are read only by the seed script from `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD`.

## Deployment

Vercel or any Node host plus managed PostgreSQL. Build with `npm run build`; release with `npx prisma migrate deploy`. Enable daily backups and point-in-time recovery on the database.

## More docs
[API](docs/API.md) · [Deployment](docs/DEPLOYMENT.md) · [Billing & Razorpay](docs/BILLING.md) · [Super Admin](docs/ADMIN.md) · [Testing](docs/TESTING.md) · [Backups](docs/BACKUPS.md) · [Roadmap/status](docs/ROADMAP.md)
