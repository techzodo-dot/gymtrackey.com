# Deployment

## Requirements
Node ≥ 20, PostgreSQL ≥ 14 (managed: Neon / Supabase / RDS / Railway), a host for Next.js (Vercel / Railway / Render / any Node host).

## Environment variables
| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string (use a pooled URL on serverless). |
| `AUTH_SECRET` | yes | ≥32 random chars: `openssl rand -base64 32`. Rotating it signs everyone out. |
| `NEXT_PUBLIC_APP_URL` | yes | Public https URL (used in emails/SEO). **Build-time** value. |
| `CRON_SECRET` | yes (prod) | Protects `/api/cron/daily`. |
| `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` | seed only | Read by `npm run db:seed`; never stored in code. |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | for billing | Without them, checkout reports "not configured" — it never fakes success. |
| `EMAIL_SERVER`, `EMAIL_FROM` | for email | SMTP URL, e.g. `smtps://user:pass@smtp.host:465`. Needed for password-reset & reminder emails. |
| `WHATSAPP_API_KEY`, `WHATSAPP_PHONE_ID` | optional | Meta WhatsApp Cloud API. |
| `SMS_API_KEY` | optional | Provider interface exists; implement `MessageProvider` for your SMS vendor. |
| `STORAGE_*` | optional | Reserved for progress photos/documents (not yet wired). |

## Vercel (recommended)
1. Import the GitHub repo in Vercel. `vercel.json` sets the build to `prisma migrate deploy && next build` and schedules the daily cron.
2. Add a Postgres database (Vercel Marketplace → Neon, or your own) and set the env vars above.
3. Deploy. Then seed once from your machine against the production DB:
   `DATABASE_URL=… SUPER_ADMIN_EMAIL=… SUPER_ADMIN_PASSWORD=… npm run db:seed`
   (add `SEED_DEMO=true` is **not** needed — the public demo gym is created on first click of *Explore Demo*.)
4. Razorpay dashboard → Webhooks → `https://YOUR_DOMAIN/api/webhooks/razorpay`, events: `payment.captured`, `order.paid`, `payment.failed`, `refund.processed`, with your `RAZORPAY_WEBHOOK_SECRET`.
5. Point `www.gymtrackey.com` at the project; set `NEXT_PUBLIC_APP_URL` accordingly and redeploy.

## Any Node host
`npm ci && npx prisma migrate deploy && npm run build && npm start`. Schedule `curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://YOUR_DOMAIN/api/cron/daily` daily.

## Scaling notes
* The login/register rate limiter is in-memory — replace `server/auth/rate-limit.ts` with Redis/Upstash when running >1 instance.
* All list pages are paginated and indexed on `(tenantId, …)`.
