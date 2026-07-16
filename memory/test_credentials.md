# test_credentials.md — gem2i

> Never print secrets in chat. Real values live only in the box `.env` / `gem_config` (Mongo) / a password manager — NEVER committed.

## To be created at stand-up (Phase 0)
| Account | Purpose | Where the secret lives | Status |
|---|---|---|---|
| Product admin | CMS admin login | `gem_config` (seeded at stand-up) | pending |
| Test member | member portal / gating | `members` (seeded) | pending |

## Legacy source (read-only, for ETL only)
- Legacy members carry **plaintext** passwords in the MySQL dump (`gem2ica_production`). Handled per D2 (bcrypt at ETL). Never surface these.

_Fill in the account matrix once Phase 0 stand-up seeds the admin + test member._
