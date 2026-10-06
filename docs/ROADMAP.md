# Build status

Legend: done = built and tested · partial · todo

## Phase 1 — Foundation
- done: strict TS, lint, Vitest, security headers
- done: full Prisma schema for all spec models + initial migration
- done: registration (tenant + gym + default branch + owner + settings + 14-day trial, transactional)
- done: login/logout, signed sessions, rate limiting, CSRF origin check
- done: RBAC model, route gating, read-only mode for expired tenants
- done: tenant isolation layer + automated isolation tests
- todo: password reset flow (token helpers + `PasswordResetToken` model exist; needs email sender + routes)
- todo: Google / OTP login (optional)

## Phase 2 — Onboarding, dashboard, members
- partial: dashboard shell (sidebar, mobile bottom nav, trial banner, theme toggle, live stat cards)
- todo: onboarding wizard, members CRUD/search/import/export, member profile

## Phases 3–6 — todo
Memberships, payments, invoices, receipts · attendance/QR, trainers, workouts, diets, measurements, photos · reports, expenses, notifications, reminder engine, cron jobs · SaaS billing, Razorpay (orders, verification, webhooks with idempotency via `WebhookEvent`), coupons, plan-limit enforcement.

## Phase 7 — Super Admin: partial (overview counts only)

## Phase 8 — Marketing site: partial
- done: home, pricing (DB-driven, falls back to defaults), login, register, demo/contact lead capture, legal placeholders, sitemap, robots, 404/500
- todo: blog, JSON-LD, PWA manifest/service worker, public demo mode

## Phase 9 — Hardening: partial (isolation, auth, permission tests exist; e2e and perf pending)
## Phase 10 — Deployment docs, backups: todo

## Backups (design)
Managed Postgres with daily snapshots + PITR (WAL archiving, 7–30 day window); S3 bucket versioning and cross-region replication for uploads; quarterly restore drill into a scratch database.

## Notes
- Legal pages are placeholders and need counsel review.
- Money is stored as integer minor units (paise).
