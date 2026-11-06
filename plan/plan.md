# VPS → MongoDB Atlas Migration Plan

Full migration of all production data from the VPS MongoDB instance to MongoDB Atlas (Cluster0 / traccia_fondi database), followed by switching the production app to operate exclusively from Atlas.

**Who it's for:** The platform owner, with 225 real clients on the VPS that must be preserved without data loss.

---

## What will be migrated

All collections from the VPS local MongoDB database used by the production app:
- `users` (225 clients)
- `traces` (183+ trace documents)
- `access_codes`
- `documents`
- `recovery_requests`
- `settings`
- Any other collections present in the VPS database that are discovered at dump time

---

## Migration approach

**Tool:** `mongodump` + `mongorestore` — the standard, safe MongoDB migration path. No custom scripts. No manual document copying.

**Steps (in order):**

1. SSH into the VPS (187.127.226.127, root)
2. Identify the exact database name in use on the VPS
3. Run `mongodump` to export the entire database to a compressed archive on the VPS
4. Copy the dump to a safe location (or pipe directly)
5. Run `mongorestore` pointing at the Atlas connection string — with `--drop` flag so existing test documents in Atlas are replaced cleanly
6. Verify document counts on Atlas match the VPS exactly (users, traces, all collections)
7. Only after verification is confirmed: update the production `MONGO_URL` environment variable on the VPS app to point to Atlas
8. Restart the production app on the VPS
9. Smoke-test: log in, check users list, check traces — confirm live traffic hits Atlas

---

## Safety measures

- The VPS database is **never touched or modified** — only read via `mongodump`
- The Atlas `--drop` only clears the destination (Atlas), not the source (VPS)
- Document counts are verified before switching the app
- The VPS app continues running on the old local database until the switch is confirmed safe
- If anything looks wrong after the switch, the VPS `MONGO_URL` can be reverted to `mongodb://localhost:27017` in under 1 minute

---

## Separation of environments

- **Production** (VPS app at traccia-fondi.com): will point to Atlas after migration
- **Preview / development** (this Emergent environment): stays on its own separate local MongoDB — untouched

---

## Assumptions

- The VPS runs MongoDB locally on the default port (27017) with no authentication, or with credentials discoverable from the app's config file on the VPS
- The database name on the VPS is the same as or equivalent to `traccia_fondi` — confirmed at step 2
- `mongodump` and `mongorestore` are available on the VPS (standard with any MongoDB installation); if not, they will be installed via `apt`
- The Atlas cluster allows inbound connections from the VPS IP — if Atlas IP whitelist blocks it, the VPS IP will need to be added to Atlas Network Access (this is a 30-second step in the Atlas UI)
- The 1 test document currently in Atlas users collection is expendable (confirmed by owner)
- No data transformation is needed — collections migrate as-is
