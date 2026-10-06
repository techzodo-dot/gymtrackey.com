# Backup & restore

* **Database:** use a managed Postgres with automated daily snapshots **and** point-in-time recovery (WAL archiving), 7–30 day window (Neon/RDS/Supabase PITR). Keep a weekly logical dump off-provider: `pg_dump -Fc "$DATABASE_URL" > gymtrackey-$(date +%F).dump`.
* **Restore:** create a fresh database, `pg_restore -d NEW_URL --no-owner gymtrackey.dump` (or provider PITR to a new branch), then point `DATABASE_URL` at it and run `npx prisma migrate deploy` to confirm schema parity.
* **Files (when storage is enabled):** enable bucket versioning + cross-region replication.
* **Drill:** restore into a scratch DB quarterly and run `npm test` against it.
* **Retention:** expired gyms are read-only, never auto-deleted; define a purge policy (e.g. 12 months after expiry) before launch.
