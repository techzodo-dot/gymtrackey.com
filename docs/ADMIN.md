# Super Admin guide (`/admin`)

Create the admin with `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` + `npm run db:seed` (idempotent). Log in at `/login` → redirected to `/admin`.

* **Overview** – gyms by status, members, MRR/ARR, revenue, registrations (30 d), new gyms chart, gyms by plan.
* **Gyms** – search/filter; open a gym to *extend trial*, *change plan*, *suspend/activate* (suspended users can't sign in; nothing is deleted), see usage, subscription history, activity.
* **Plans & pricing** – edit price, member/branch/staff limits (empty = unlimited) and feature flags per plan. Applies immediately to pricing page, billing and server-side enforcement.
* **Coupons** – create/disable; percentage or fixed, max discount, expiry, usage limit, plans.
* **Leads / Support / Blog / Settings** – lead pipeline (New → Converted/Lost) and contact inquiries; reply to tickets with status/priority; publish SEO blog posts; trial length, maintenance banner, integration status.
* The admin can **not** open gym dashboards (no tenant permissions by design) — use support tools or ask the owner.
