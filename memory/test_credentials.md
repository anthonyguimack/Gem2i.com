# test_credentials.md — gem2i

> Never print secrets in chat. Real values live only in the box `.env` / `gem_config` (Mongo) / a password manager — NEVER committed.

## Created at stand-up (Phase 0, 2026-07-15)
| Account | Login | Where the secret lives | Status |
|---|---|---|---|
| Product admin | `admin@gem2i.com` | box `.env` → `/opt/beta.gem2i.com/backend/.env` (`ADMIN_PASSWORD`, random bootstrap; change after first login) | ✅ seeded |
| Test member | — | — | pending (seed after CMS rebrand) |

Retrieve the admin password on the box: `ssh ... "grep ADMIN_PASSWORD /opt/beta.gem2i.com/backend/.env"`. Never printed in chat or committed.

## Legacy source (read-only, for ETL only)
- Legacy members carry **plaintext** passwords in the MySQL dump (`gem2ica_production`). Handled per D2 (bcrypt at ETL). Never surface these.

_Fill in the account matrix once Phase 0 stand-up seeds the admin + test member._
