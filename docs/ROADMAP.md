# Build status (honest)

**Done & tested** — see `docs/TESTING.md` (57 automated tests; manual browser pass of every page, desktop + mobile).

| Area | Status |
|---|---|
| Multi-tenant isolation, RBAC, sessions, CSRF, rate limits, audit log | ✅ |
| Signup → tenant/gym/branch/owner/settings/trial; password reset | ✅ |
| Members: CRUD, search/filter/sort/paginate, soft-delete, CSV import (validate first) / export, profile with 10 tabs, QR card | ✅ (photo upload ❌) |
| Memberships: plans, start/renew (chained), freeze/unfreeze, daily expiry job | ✅ |
| Payments: collect/pending dues, GST (CGST/SGST/IGST), invoice numbers `GT-YYYY-NNNNNN`, receipts (print/PDF, WhatsApp & email links), refunds, due buckets | ✅ (server-generated PDF files ❌ — browser print-to-PDF) |
| Attendance: ID/phone/QR-scanner check-in, expiry/frozen blocking, peak hours, inactive members, birthdays | ✅ (camera QR scanning ❌ — USB/BT scanners work) |
| Trainers, workout plans (completion tracking), diet plans, measurements + BMI + charts | ✅ |
| Expenses, financial & member reports, analytics (renewal, churn, ARPM, collection…), CSV export | ✅ (Excel/PDF export ❌ — CSV opens in Excel; print → PDF) |
| Reminders engine + templates + provider interface (SMTP email, Meta WhatsApp) + in-app notifications + announcements | ✅ (SMS provider ❌ — interface only) |
| Staff & custom permissions, branches, plan limits & feature flags (server-enforced), upgrade prompts | ✅ |
| SaaS billing: Razorpay orders/verify/webhook (idempotent), coupons, cancel, history | ✅ needs your Razorpay keys; *auto-debit subscriptions ❌* |
| Super Admin: gyms, plans/pricing/flags, coupons, leads, tickets, blog, settings | ✅ |
| Marketing site, pricing from DB, SEO (meta, sitemap, robots, JSON-LD), blog, lead/contact capture, public read-only demo, PWA shell | ✅ |
| Member portal (membership, payments/receipts, workout, diet, weight chart, QR, notifications) | ✅ |

**Not built (be aware before selling):** progress-photo & document uploads (needs S3 wiring), referral campaigns, Google/OTP login, biometric integration, custom domains per gym, per-gym email branding, browser E2E in CI, SMS provider, legal pages are placeholders needing counsel review.
