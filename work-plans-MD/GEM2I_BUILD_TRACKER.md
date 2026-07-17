# GEM2I_BUILD_TRACKER.md — live build tracker

> **CLAIMED BY:** (unclaimed — session 5 finished: Phase 3 DEPLOYED)
> **PHASE 3 ✅ (session 5, Anthony's machine, 2026-07-17):** member merge D2 DONE — 1736 legacy members migrated (bcrypt in Stage 1, plaintext never persisted; 527 active; no-password FB-only rows → forgot-password; membership_ids GEM-n; sponsor chains + 5 member types + follows member_id resolved; real ecommissions [30,20,15,10,5,2] loaded). Auth: verify_password hardened, case-insensitive email login, member_logins source 'gem2i'. **B7 formal-name gate LIVE** on guest-list + checkout (403 → GemFormalNameDialog → auto-retry). Deploy GREEN, live-verified. NEW scripts: gem2i_etl_members.py / gem2i_load_members.py.
> **STATUS:** ✅ Phase 2 core LIVE (session 3). ✅ **Session 4: admin manager UIs BUILT + DEPLOYED to beta** (3m29s green, health 200, admin gate 401-verified) — config-driven `GemCatalogManager` for all 6 catalogs at `/admin/gem-*`, sidebar "GEM2i Catalogs" group, `gem_*` CMS sections registered (operator-grantable), dead post-strip sidebar/section entries pruned, `ids` picker lookup + uploaded-image passthrough in the API. **Session-4 continuation:** events card/list toggle + country filter DEPLOYED (verified live); junk venues deactivated LIVE. **PHASE 4 CORE BUILT + DEPLOYED (3m3s green; 401 gates, email template + indexes verified on box):** `routes/gem_passes.py` (guest-list join/cancel, waiting list, QR e-passes, arithmetic-on-read stock w/ race guard, pass email template, admin transactions API) + `GemGuestListWidget` on event detail + `GemTransactionsManager` at /admin/gem-transactions + guest-list sub-editor in the Events manager + `gem_transactions` CMS section. **PHASE 5 CORE BUILT + DEPLOYED (3m6s green; availability/webhook/auth/config all verified live):** `routes/gem_tickets.py` — Stripe checkout (CMS key), **verified** webhook (signature-optional + server-to-server session retrieve + amount match; forged→400), per-tier arithmetic stock w/ 60-min pending holds, {cost,profit,commissions[6]} economics from gem_config ecommissions, idempotent completion → QR + `gem_ticket` email; `GemTicketWidget` + `/tickets/success` page; tiers sub-editor (6 legacy tiers) + currency in the Events manager. **Open:** e2e tests (guest list + sandbox purchase — need admin login, test member, Stripe test key in CMS); share→referral points (B5) + points writes → Phase 6; Phase-2 exit admin round-trip. Phase 3 waits on Anthony (legacy dump).
> **LAST SYNC:** 2026-07-17 (session 4, Carlos's machine — admin managers + events parity + Phase 4 guest-list/QR + Phase 5 e-ticketing/Stripe ALL deployed & API-verified live. See the three session-4 entries in memory/PROGRESS.md.)

The product spec is `GEM2I_MIGRATION_PLAN.md` (unchanged, still authoritative for features/schema/API/phases). This tracker records the **isolated-instance build** on box 34.198.159.54.

---

## STAGE 0 — Bootstrap (local) ✅ DONE (session 1)
- [x] SSH key locked (`icacls`), OpenSSH-ready.
- [x] Project scaffold at `C:\...\Gem2i.com` (memory brain, skills, reference, scripts).
- [x] `CLAUDE.md`, `.gitignore`.
- [x] `deploy_beta_gem2i.ps1` (ongoing smart-deploy, port 8050).
- [x] `provision_gem2i_box.ps1` (`-Inventory` / `-Clean` / `-Standup`).
- [x] GEM2I plan copied in.

## STAGE 1 — Server inventory (SAFE) ⏳ on GO
- [ ] `provision_gem2i_box.ps1 -Inventory` → review every app dir / vhost / cert / service / Mongo DB present on the clone. Record the output here.

## STAGE 2 — Clean the clone (DESTRUCTIVE) ⏳ on GO, after reviewing Stage 1
- [ ] `provision_gem2i_box.ps1 -Clean -IUnderstand` → remove all app artifacts, keep runtimes, drop non-system Mongo DBs. (Pre-clean backup staged in `/opt/_preclean_backup`.)
- [ ] Verify: `/opt` empty (bar backup), `nginx -t` ok, Mongo = admin/config/local, runtimes intact (python3/node/yarn/nginx/mongod/certbot report versions).

## STAGE 3 — Fork + strip the code (Phase 0 build) ⏳ on GO
Copy the CMS engine, then strip to gem2i-only, **build-verifying after the strip** (a clean `yarn build` + backend import).
- [ ] Copy `backend/` + `frontend/` from AUX-1.0 into this repo (exclude `node_modules/venv/build/.git/uploads` and the product subtrees `pms./lms./mms./journal./news.`).
- [ ] **Strip modules** (remove routes + registrations + frontend routes/pages/components + i18n keys, keep the build green):
  - Backend: KMS (`backend/kms/`), News, Morning Brief, legacy KMS/SSO sync, PMS/LMS/MMS bridges, points→MMS forwarding, brand-specific seeds. Keep: auth, members, geo, hero, contact, settings/runtime_config, uploads, email/SMTP, Stripe plumbing.
  - Frontend: brand themes (personalbrand/aurex sections, PersonalBrandSections, Aurex managers), KMS/News/MorningBrief/PMS/LMS/MMS pages+components, SSO-quicklinks to those. Keep: CMS admin shell, member auth, geo pickers, hero canvas, contact, i18n core, ui primitives.
  - Register the `gem2i` theme + a `GET /api/health` endpoint.
- [ ] `scripts/gem2i_nginx.conf` written (proxy `/api`→127.0.0.1:8050, serve the React build; used by `-Standup`).
- [ ] Local build-verify: `yarn build` clean; backend imports with no missing modules.

## STAGE 4 — Stand up the instance ⏳ on GO
- [ ] `provision_gem2i_box.ps1 -Standup -IUnderstand` → upload, venv, `.env` (fresh JWT, DB `gem2i_cms`), build, systemd `gem2i-backend`, nginx vhost, LE cert.
- [ ] `https://beta.gem2i.com/api/health` → 200; CMS shell renders with theme gem2i; http→https 301.
- [ ] Seed product admin + test member → record in `memory/test_credentials.md`.

## STAGE 5 — Git + GitHub ⏳ on GO
- [ ] `git init`, first commit, create the isolated GitHub repo, push `main`.

## THEN — the actual product build
Proceed with `GEM2I_MIGRATION_PLAN.md` Phase 1 → 7 (public shell → catalogs → membership → guest list/QR → e-ticketing/payments → admin/polish → walk-through/cutover). Data ETL (Phase 2+) uses the legacy dump already at `C:\2026\Acapitalgroup.com\gem2i.com\__bases_de_datos\`.
