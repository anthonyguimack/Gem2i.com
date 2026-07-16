# PROGRESS.md — gem2i deployment history

---

## 2026-07-15 (session 1, Anthony's machine) — PROJECT BOOTSTRAP (local prep only; nothing deployed)

Isolated product **gem2i** created at `C:\2026\Acapitalgroup.com_Emergent_Claude\Gem2i.com`. Architecture ruled by Anthony: **fork AUX-1.0 → strip to CMS core** (own repo/box/DB, keep methodology + stack + culture, keep none of the brands).

**Done (local, safe — no server action yet):**
- SSH key `Gem2i-LightsailDefaultKey-us-east-1.pem` locked (`icacls /inheritance:r`, granted current user only) so OpenSSH accepts it.
- Project scaffold: `.claude/skills/` (emil + impeccable + taste + review-animations + aux-migrate copied), settings, `memory/`, `work-plans-MD/` (GEM2I plan copied in + build tracker), `reference/`, `scripts/`.
- `CLAUDE.md` (gem2i-specific, same keywords/culture, isolation rules).
- `deploy_beta_gem2i.ps1` (ongoing smart-deploy; port 8050, svc gem2i-backend, no chains).
- `provision_gem2i_box.ps1` (one-time: `-Inventory` safe / `-Clean` guarded wipe / `-Standup`).

**GO given — server work executed (Anthony's machine, same session):**
- ✅ **Inventory** (read-only over direct SSH). Clone carried the full beta-carlos estate: 6 app services, 6 /opt app dirs + ~25 tarballs, 9 nginx vhosts, 10 LE certs, Mongo `carlosartiles_cms` (31.9 MB).
- ✅ **Clean** via `scripts/box_clean.sh` (uploaded + run). Removed ALL services/vhosts/certs/opt-dirs; dropped `carlosartiles_cms`; Mongo now admin/config/local only. Runtimes intact (Python 3.12 / Node 20 / nginx 1.24 / Mongo 7.0 / certbot 2.9). Rollback staged in `/opt/_preclean_backup` (nginx conf + unit files + mongodump).
- ✅ **Fork copy** done: AUX-1.0 `backend/` (13.5 MB) + `frontend/` (2.8 MB) copied into the repo (excluded node_modules/venv/build/.git/uploads/.env).

**⚠ Two things noted:**
- `provision_gem2i_box.ps1` `-Clean`/`-Standup` blocks have PS 5.1 parse errors (inline bash heredocs). The clean was run via the standalone `scripts/box_clean.sh` instead. → Refactor the PS script into a thin `.sh` wrapper (TODO); inventory + clean bash live in `scripts/`.

**✅ BACKEND STRIP DONE (this session):** Ruling "strip fully, then stand up."
- `server.py` rewritten → registers ONLY 12 CMS-core routers (auth, public, admin_content, admin_tools, payments, membership, landing, hero_ab, roles, email_templates, captcha) + NEW `GET /api/health`. Removed all brand router imports/includes + the 3 page mounts (/auxnews, /morning, /insights). Startup trimmed (dropped enrollment/opportunities/mail seeds); scheduler kept backups only.
- `scheduler.py` → backup loop only (mail-ingest + pro-engine loops removed).
- Deleted route files: enrollment, docs, calendar_events, calendar_helpers, mentor_slots, ical, bundles, payouts, coupons, aurex_sections, mail, news, morning, pros, points, companies, opportunities. Deleted `kms/` package + utils pro_engine/mail_ingest/mailbox.
- Neutralized-shim utils (kept filenames so kept routes import cleanly): kms_sync, mms_events, mms_roles, pms_roles, lms_roles = no-ops. Kept real utils: personality, social_catalog, leadcapture, email_render, runtime_config, stripe_helpers, rate_limit, captcha, discord, points.
- `seed.py` needs NO change (self-contained generic "Legacy" demo brand; idempotent).
- **Statically verified:** grep confirms NO kept file imports any deleted module. (Runtime import test happens on the box at standup — no local venv.)
- ⚠ `requirements.txt` kept AS-IS for the first standup (extra installed deps don't break boot; trim later).

**NOT done yet:**
1. **Frontend strip** — App.js (767 lines, ~60 imports) → keep CMS-core + gem2i surfaces; delete brand pages (Companies, News, Opportunities, FeaturedProjects, aurex/PB sections, bundles/calendar/mentor components, InvitedByBanner) + prune pages/admin (63 files). Then `yarn build` clean (iterate).
2. `scripts/gem2i_nginx.conf` + `scripts/box_standup.sh`.
3. Stand up → beta.gem2i.com health 200, CMS shell renders.
4. Seed admin + test member → test_credentials.
5. git init + GitHub repo + first push.

**Box:** 34.198.159.54 (clone of beta-carlos). **DB:** gem2i_cms. **Prefix:** gem_*. **Legacy source data** for the eventual ETL already backed up at `C:\2026\Acapitalgroup.com\gem2i.com\__bases_de_datos\` — no new backup needed.

**NEXT:** on GO → run `-Inventory`, review, then clean → fork → stand up.
