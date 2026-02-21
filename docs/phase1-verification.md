# Phase 1 Verification Report

Run the migration `supabase/migrations/001_initial_schema.sql` in the Supabase SQL Editor (Dashboard → SQL Editor → New query → paste → Run), then run the checks below.

---

## 1. Table counts (confirm seed data)

Run each query and note the count.

```sql
SELECT 'users' AS table_name, COUNT(*) AS count FROM users
UNION ALL SELECT 'drivers', COUNT(*) FROM drivers
UNION ALL SELECT 'offence_types', COUNT(*) FROM offence_types
UNION ALL SELECT 'penalty_rules', COUNT(*) FROM penalty_rules
UNION ALL SELECT 'offences', COUNT(*) FROM offences
UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs;
```

**Expected:**

| table_name    | count |
|---------------|-------|
| users         | 3     |
| drivers       | 20    |
| offence_types | 15    |
| penalty_rules | 3     |
| offences      | 0     |
| audit_logs    | 0     |

---

## 2. Spot-check seed data

```sql
-- Users with officer_id (login with officer_id or email)
SELECT id, officer_id, email, role, full_name FROM users ORDER BY officer_id;

-- First 3 drivers
SELECT id, full_name, license_no, plate_no, status, strike_count FROM drivers LIMIT 3;

-- Penalty rules (0-2, 3-5, 6+)
SELECT min_strikes, max_strikes, fine_multiplier, status_flag FROM penalty_rules ORDER BY min_strikes;
```

Expect: 3 users (1 admin, 2 officers), 20 drivers, 3 penalty tiers.

---

## 3. Indexes exist

```sql
SELECT indexname, tablename FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('drivers', 'offences')
  AND indexname IN ('idx_drivers_license_no', 'idx_drivers_plate_no', 'idx_offences_driver_id', 'idx_offences_issued_at');
```

Expected: 4 rows (or more if unique constraint created an index; `drivers_license_no_key` may appear for the unique on `license_no`).

---

## 4. RLS enabled

```sql
SELECT relname, relrowsecurity FROM pg_class
WHERE relname IN ('users', 'drivers', 'offences', 'offence_types', 'penalty_rules', 'audit_logs')
  AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
```

Expected: all 6 tables with `relrowsecurity = true`.

---

## 5. Foreign key (invalid reference should fail)

Run in a transaction so we can roll back:

```sql
BEGIN;
-- This should fail: invalid driver_id
INSERT INTO offences (driver_id, officer_id, offence_type_id, fine_amount, strike_delta)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  (SELECT id FROM users LIMIT 1),
  (SELECT id FROM offence_types LIMIT 1),
  10000,
  1
);
ROLLBACK;
```

Expected: error (foreign key violation). Then the DB is correctly enforcing FKs.

---

## 6. RLS test (optional, with Supabase Auth)

If you use Supabase Auth and sync `users.id` with `auth.users.id`:

- Log in as an **officer** (e.g. officer_id 100001) and query `users`: you should see only your own row.
- Log in as **admin** (000001) and query `users`: you should see all rows.
- As officer, try to DELETE from `offences`: should be denied (no DELETE policy).
- As officer, try to INSERT into `drivers`: should be denied (only admin can insert drivers).

Backend using **service_role** key bypasses RLS; these checks apply when using the **anon** or **authenticated** key with a user JWT.

---

## Verification checklist

- [x] Migration runs without errors *(applied via Supabase MCP 2026-02-21)*
- [x] Table counts match expected
- [x] Users have `officer_id` and can be identified for login
- [x] Indexes present on `drivers.license_no`, `drivers.plate_no`, `offences.driver_id`, `offences.issued_at`
- [x] RLS enabled on all 6 tables
- [x] Invalid foreign key insert is rejected
- [ ] (Optional) RLS behavior checked with officer vs admin JWT

---

## Last verification run (via Supabase MCP)

| Check | Result |
|-------|--------|
| Migration applied | `001_initial_schema` (version 20260221171928) |
| Table counts | users 3, drivers 20, offence_types 15, penalty_rules 3, offences 0, audit_logs 0 |
| Users | 000001 (admin), 100001 (officer), 100002 (officer) with officer_id + email |
| Indexes | drivers_license_no_key, idx_drivers_plate_no, idx_offences_driver_id, idx_offences_issued_at |
| RLS | All 6 tables `relrowsecurity = true` |
| FK test | Insert with invalid `driver_id` correctly failed (23503) |
