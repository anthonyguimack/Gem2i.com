# GEM2I_BUILD_TRACKER.md — live build tracker

> **CLAIMED BY:** Anthony (2026-07-15)
> **STATUS:** Session 1 = local bootstrap DONE. Awaiting Anthony's **GO** to run the server steps (inventory → clean → fork → stand up).
> **LAST SYNC:** 2026-07-15

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
