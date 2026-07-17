# test_credentials.md — gem2i

> Never print secrets in chat. Real values live only in the box `.env` / `gem_config` (Mongo) / a password manager — NEVER committed.

## Accounts (2026-07-15)
| Account | Login | Password location | Status |
|---|---|---|---|
| Product admin (CMS `/admin` + My Account) | **`carlos.m.artiles@gmail.com`** | Anthony's standard admin password — password manager. Stored on the box ONLY as a bcrypt hash in `members` (never plaintext; `.env` holds just `ADMIN_EMAIL`). | ✅ set + login-verified (200) |
| Test member | — | — | pending (seed after CMS rebrand) |
| Legacy members (1736, migrated 2026-07-17 session 5) | their legacy email (any casing) | their ORIGINAL legacy password (bcrypt-hashed at ETL, D2 — plaintext never stored) | ✅ active=527 can log in; estado 0/2 → deactivated (403-parity); 523 no-password rows → forgot-password only |

Set via `scripts`-style one-shot updater 2026-07-15 (creds piped over stdin, never in shell history). The old auto-generated `admin@gem2i.com` was the same doc and no longer works. Never print the password in chat or commit it.

## Legacy source (read-only, for ETL only)
- Legacy members carry **plaintext** passwords in the MySQL dump (`gem2ica_production`). Handled per D2 (bcrypt at ETL). Never surface these.

_Fill in the account matrix once Phase 0 stand-up seeds the admin + test member._
