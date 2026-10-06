# SaaS billing & Razorpay

**Model:** monthly plans (Starter/Growth/Professional; Enterprise is custom/sales-led). Prices & limits live in `SubscriptionPlan` and are editable in **Super Admin → Plans & pricing** (the public pricing page reads the same table). Limits (members/branches/staff) and feature flags are enforced **on the server** (`server/services/limits.ts`) — creating members, importing, adding staff/branches and gated pages all check them and answer with an explanatory "Upgrade Plan / View Plans" message.

**Lifecycle:** `TRIAL` (14 days, configurable; all features) → pays → `ACTIVE` (30-day period) → period ends → `EXPIRED` (read-only; data kept) . Failed payment → `PAST_DUE`. Owner cancel → `CANCELLED` (access until period end). Suspended gyms cannot sign in.

## Payment flow
1. Browser → `POST /api/billing/order {planCode, coupon?}`. Server prices the plan (+coupon), calls Razorpay Orders API with the **secret key (server only)**, stores a `PENDING` `Subscription` keyed by `razorpayOrderId`.
2. Razorpay Checkout opens in the browser using only the public `key_id`.
3. On success the browser posts `{order_id, payment_id, signature}` to `/api/billing/verify`; server checks `HMAC_SHA256(order_id|payment_id, key_secret)` (constant-time) and that the order belongs to the caller's gym, then activates.
4. Independently, Razorpay calls `/api/webhooks/razorpay`; the **raw body** signature is verified with the webhook secret, the event id is stored in `WebhookEvent` (duplicates ignored), and the same idempotent `activateSubscription()` runs. `razorpayPaymentId` is unique, so a payment can never activate twice.

Refunds are handled in the Razorpay dashboard; the `refund.processed` webhook flags the subscription. Coupons: percentage/fixed, cap, expiry, usage limit, plan scope, one use per gym.

> Renewal is a manual monthly payment (Razorpay Orders). If you want auto-debit, switch step 1 to the Razorpay *Subscriptions* API and add `subscription.charged` to the webhook switch — the activation function is reusable.

## Testing it
Use Razorpay **test keys** (`rzp_test_…`) and a test card. `tests/billing.test.ts` covers signatures, activation idempotency, cross-tenant order checks, webhook dedupe, failure handling and coupons without calling Razorpay.
