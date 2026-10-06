# Testing

```bash
createdb gymtrackey_test            # or set TEST_DATABASE_URL
npm run typecheck && npm run lint && npm test
```
`tests/global-setup.ts` applies migrations to the test DB. Suites:

| File | Covers |
|---|---|
| `tenant-isolation.test.ts` | **Critical:** Gym A cannot read/aggregate/update/delete Gym B data; hostile `tenantId` is overwritten; creates are stamped with the session tenant. |
| `payments.test.ts` | Tax/invoice numbering, collect → invoice → membership chain, pending dues, refunds, cross-tenant transactions, attendance rules, freeze, plan limits. |
| `billing.test.ts` | Razorpay signatures, order/verify/activate, webhook idempotency, coupons, daily jobs, sample data. |
| `features.test.ts` | CSV import, **member portal isolation**, **middleware: staff→/admin blocked, member→/dashboard blocked**, password reset (single-use/expiry), support/staff/announcement scoping, reminders, feature flags. |
| `auth.test.ts`, `permissions.test.ts` | Registration, hashing, sessions, rate limit, RBAC matrix. |

Known gap: no browser E2E in CI (manual Playwright pass was run during development).
