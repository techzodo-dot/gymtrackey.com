# API reference

Most UI mutations use **Next.js server actions** (same security: session → permission → tenant-locked DB). The HTTP endpoints below are the public/programmatic surface. All mutating endpoints require a same-origin request (CSRF) and a valid session cookie unless noted. Errors are JSON `{ "error": string, "issues"?: {field: string[]}, "code"?: string }`.

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /api/auth/register` | none (rate-limited 5/h/IP) | Create gym + owner + default branch + settings + trial. Sets session cookie. |
| `POST /api/auth/login` | none (8 attempts / 15 min / IP+email) | `{email,password,remember}` → session cookie + `redirect` by role. |
| `POST /api/auth/logout` | session | Clears cookie. |
| `POST /api/auth/forgot` | none | `{email}` → emails a 30-min single-use link. Same response whether or not the account exists. |
| `POST /api/auth/reset` | token | `{token,password}` → sets new password; token is hashed at rest and single-use. |
| `GET /api/demo/enter` | none | Starts a **read-only** session in the shared demo gym. |
| `POST /api/leads` / `POST /api/contact` | none (rate-limited) | Demo-request / contact forms → Super Admin inbox. |
| `POST /api/members/import[?commit=1]` | `members` | Multipart `file` (CSV ≤1 MB). Without `commit` returns `{valid, invalid[], duplicate[]}`; with it imports valid rows (plan member limit enforced). |
| `GET /api/export/{members,payments,expenses,attendance,revenue,tax}` | per-resource permission | CSV of **your gym's** data only. Formula-injection safe. |
| `POST /api/billing/order` | `billing` | `{planCode, coupon?}` → creates a Razorpay order server-side. |
| `POST /api/billing/verify` | `billing` | Razorpay checkout result → verifies HMAC signature, activates plan (idempotent). |
| `POST /api/webhooks/razorpay` | HMAC signature | Raw-body signature verified; deduplicated via `WebhookEvent`. Handles `payment.captured`, `order.paid`, `payment.failed`, `refund.processed`. |
| `POST/GET /api/cron/daily` | `Authorization: Bearer $CRON_SECRET` | Daily jobs (see below). |

## Daily jobs (`/api/cron/daily`)
Expire trials & lapsed subscriptions · expire memberships (+ member status) · activate pending (future-dated) memberships · un-freeze · send fee reminders (7/3/1 days before, on due date, 3 days after) honouring each gym's settings. Idempotent.

## Where each spec endpoint lives
Members/payments/memberships/attendance/trainers CRUD are server actions under `app/dashboard/*/actions.ts`, backed by `server/services/*`. Reports are server components (`app/dashboard/reports`) over `server/services/reports.ts`.
