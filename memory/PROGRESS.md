# PROGRESS.md — gem2i deployment history

---

## 2026-07-17 (session 4, Carlos's machine) — Phase-2 exit: ADMIN MANAGER UIs built + DEPLOYED

**Admin CRUD screens for all 6 catalogs** (Events/Artists/Venues/Festivals/Conferences/Clients) — the missing Phase-2 exit item. API CRUD already existed; this session added the CMS UI + permissions plumbing.

- **NEW `frontend/src/pages/admin/GemCatalogManager.js`** — one config-driven manager mounted per catalog (`/admin/gem-{events,artists,venues,festivals,conferences,clients}`): server-side search/status-filter/pagination (25/pg), thumbnail rows, soft-delete + restore (deleted rows show a RotateCcw restore), edit dialog generated from a per-catalog field schema. Special widgets: RefPicker (searchable single/multi picker → venue on events, artist line-up on events/festivals; resolves ids→names via new `ids` param), venue-type select (fed from `venue-types` catalog), roster rank inputs (1–100 clamped), CSV genres, socials grid, GalleryEditor (clients mode=gallery), ImageSlot per image key (legacy-filename input + CMS ImageUpload; clients use flat image_on/image_off).
- **`lib/api.js`:** new `gemAdminAPI` (list/create/update/remove).
- **Backend `gem_catalogs.py`:** `admin_list` gains `ids` (comma-separated id lookup for pickers); `_img` passes through values starting with `/` so CMS-uploaded `/api/uploads/...` paths work alongside legacy filenames.
- **`models/cms_sections.py`:** new **gem2i group** — sections `gem_events/gem_artists/gem_venues(+venue-types)/gem_festivals/gem_conferences/gem_clients/gem_content` now grantable to operators (required: `require_admin` fails CLOSED on unmapped `/api/admin/*` paths for non-admins). **Pruned dead sections** left from the strip (companies/sectors/industries, opportunities+types, enrollment, calendar×7, rewards, aurex_sections, mail, doc_*×7 + empty groups).
- **AdminLayout sidebar:** new "GEM2i Catalogs" group (CalendarDays/Music/MapPin/Tent/Presentation/Handshake icons); **pruned dead links** whose routes/back-ends were stripped (Companies, Sectors, Industries, Opportunities×2, Enrollment, Calendar group×7, Points & Rewards, Prompt Management, Section Manager, Documentation, Mail) — these 404'd for admins since session 1.
- Events manager scope = catalog subset (title/type/date/venue/lineup/desc/socials/flags/images). Tiers/benefits/points/payment sub-editors = Phase 4/5 per plan.
- Known minor: operators granted only gem sections can't use the image uploader (`/api/admin/upload` maps to the `settings` section) — admins unaffected; revisit if a catalogs-only operator role is created.

**Verify:** `py_compile` clean on both backend files; local `yarn build` GREEN (75s; only pre-existing exhaustive-deps warnings, none in new files). One gotcha hit: first build failed EPERM deleting `frontend/build/static` (Dropbox sync lock) — fix = `Remove-Item -Recurse -Force frontend\build`, rebuild.

**Deploy:** `deploy_beta_gem2i.ps1 -y` GREEN (3m29s, 30 files — this machine's stamp was pre-session-3 so it re-uploaded those too, harmless; backup taken; build on box 79s; gem2i-backend active; health 200). **Verified live:** `/api/health` OK · `/api/public/gem/artists?roster=gem` returns ranked data (visibility rules intact after the `_img`/`ids` edits) · `/api/admin/gem/venues` unauthenticated → 401 (gate intact). Admin-UI round-trip in the browser (create→public→edit→delete per catalog) still pending — needs an admin login, next session or Anthony.

**Remaining Phase-2 exit after this:** admin round-trip live test per catalog (needs deploy), card/list toggle + event country/state autocompletes (minor parity), junk-venue deactivation via the new Venues manager.

## 2026-07-17 (session 3, Anthony's machine) — PHASE 2 CORE SHIPPED: catalogs LIVE on beta

**ETL + assets + catalog API + public catalog UI built, deployed, verified end-to-end.** Remaining for Phase-2 exit: admin manager UIs (API CRUD done), minor filter parity, data-quality sweep.

**ETL (two-stage, idempotent — scripts/):**
- `gem2i_etl_catalogs.py` (Stage 1, ran locally): parses the legacy MySQL dump (`gem2ica_production.sql` in `__bases_de_datos/`; custom INSERT-tuple parser, no MySQL server needed) → normalized JSONL in `reference/local-only/etl_out/` (gitignored). Deterministic uuid5 ids from legacy pks; slug de-dup; genre split; socials pruned; date strings ISO.
- `gem2i_load_catalogs.py` (Stage 2, ran on box with backend venv): upserts by `legacy_id` (follows by composite `id`), ensures indexes (unique slug + legacy_id; events `(type,status,event_date)`), `--dry-run` supported. Re-run safe.
- **Loaded into gem2i_cms:** gem_artists 601 (511 active) · gem_venues 901 (327) · gem_venue_types 32 · gem_festivals 422 (188) · gem_conferences 32 (28) · gem_clients 15 · gem_events 2132 · gem_follows 225 (1 legacy dup row collapsed by deterministic id — correct). Follows keep `member_id:null` until the Phase-3 member merge; loader auto-resolves on re-run after it.
- Mapping doc: `reference/GEM2I_LEGACY_SCHEMA_PHASE2.md` (tables→collections, image folder map, visibility rules verified against real data).

**Assets:** 1.83 GB legacy images pulled **box-to-box** (legacy Plesk box 18.208.85.155 `/var/www/vhosts/gem2i.com/httpdocs/` — the same Gem2i pem opens it; temp key staged on the box for the pull and DELETED after) → `/opt/beta.gem2i.com/backend/uploads/gem2i/legacy/{djs_images,venues_view,venues_logos,images_festivals,images_conferences,images_clients_home,events_images,events_logo}` (chmod D755/F644). Served via the existing `/api/uploads` StaticFiles mount. Subdir map verified in legacy PHP: festivals `images|photo|logos|genericimage`, conferences `images|logos`, djs `.|big|detail`.

**Backend:** NEW `routes/gem_catalogs.py` (registered in server.py):
- Public: `/public/gem/{artists,venues,festivals,conferences,events}[/{slug}]` + `clients`, `genres`, `continents`, `artist-names`. Visibility = status active; events also `private:false` + `show_portal:true`; past events capped 365 days (D7). Roster filter sorts by that roster's rank. Details resolve venue + lineup docs; `image_urls` built server-side from the legacy folder map.
- Member (JWT-only identity): `POST /member/gem/follow` {kind,target_id,flag}, `GET /member/gem/my-follows`.
- Admin CRUD: GET/POST `/admin/gem/{catalog}` + PUT/DELETE `/{id}` for all 7 catalogs; **soft delete** (status='deleted') so ETL provenance survives; slug uniqueness enforced.

**Frontend (theme-gated routes in App.js — only when `active_theme==='gem2i'`; lazy chunks):**
- `components/gem2i/GemCatalogBits.js`: gemImg (BACKEND prefix), CatalogHero, FilterPills, CatalogSearch, Paginator, SkeletonGrid, EmptyState, CardImage (broken-img fallback), TypeBadge (eticket/guest_list/info), FollowButton (logged-out click → `gem2i:open-login` window event → header LoginModal), SocialLinks, ArtistCard (rank badge).
- Pages `pages/gem2i/`: **Gem2iArtists** (roster tabs GEM/DJ Mag/Residents/All + continent pills + genre select + search), **Gem2iArtistDetail** (badges GEM/DJMAG/RESIDENT ranks, bio richtext, socials, follow; exports NotFoundShell), **Gem2iVenues** (continent tabs + search, logo wall), **Gem2iVenueDetail** (view img, address/capacity, upcoming events grid), **Gem2iFestivals** (+ conferences horizontal strip), **Gem2iFestivalDetail** (shared for festivals AND conferences via `kind` prop; lineup grid), **Gem2iEvents** (current/past scope + search + date filter), **Gem2iEventDetail** (flyer, venue link, follow + external Tickets link, DJ line-up). `gemAPI` added to lib/api.js.
- Gem2iHome: festivals/conferences carousels + client logos now light up from live catalog data (CMS-entered items still win if present — `withCatalogItems`).

**Deploy:** `deploy_beta_gem2i.ps1 -y` green (4m41s, 27 files, backup taken, health 200). **Verified live:** GEM roster ranked correctly (Maceo Plex #1/Carl Cox #2/Richie Hawtin #3) · /artists /venues render with real data · /artists/carl-cox full detail (3 rank badges, bio, follow) · images serve 200 · conferences endpoint (ADE first) · zero console errors.

**Notes / open for Phase-2 exit:**
- **Admin manager UIs missing** (exit test needs an admin round-trip per catalog) — API CRUD is ready, build CMS screens next session.
- Card/list toggle + country/state autocompletes on events (minor legacy parity).
- Junk legacy venues sort first on /venues ("anidados2", "lawevas" — active+order 0 in legacy); deactivate via admin once managers exist.
- Legacy events data is almost all past (only 2 "current" rows, dated 2030 — legacy test rows); real current events arrive via admin entry.

## 2026-07-15 (session 2, second dev machine) — PHASE 1 SHIPPED: gem2i theme LIVE on beta

**GEM2I_MIGRATION_PLAN Phase 1 (public shell + homepage + content pages) built, deployed, verified.**

**Backend:**
- NEW `backend/routes/gem_content.py` — `GET /api/public/gem/gem-content` + admin GET/PUT `/api/admin/gem/gem-content`. Content lives in `gem_config {key:'content'}` (never `settings`); full legacy homepage copy (intro/featured/services/methodology/media/clients/contact_info) embedded as EN+ES defaults, seeded at startup (`seed_gem_content()` in server.py startup). Only the `content` key is public — other gem_config keys stay server-side.

**Rebrand (ran on box):** NEW `scripts/gem2i_phase1_seed.py` (idempotent; run as `backend/venv/bin/python scripts/gem2i_phase1_seed.py` from /opt/beta.gem2i.com):
- settings → brand_name GEM2i, EN/ES tagline, `active_theme:'gem2i'`, `theme_colors.website` dark palette **from the live legacy site: page #04080C, accent #3287B7, Poppins**, footer copy, EN+ES languages, contact_settings copy, Facebook social link (purges non-gem2i demo links).
- nav_pages ($setOnInsert only) → legacy nav graph: Home/About/Events/Festivals/Artists/Venues/Travels/Services/Partners + footer Privacy/Terms + Media/Works. **Legacy-parity gating:** About/Travels/Services/Partners/Privacy/Terms login_required; listings public. Events/Festivals/Artists/Venues are placeholder CMS pages until Phase-2 real routes take over those URLs.

**Frontend (theme `gem2i` — registered in THEMES, branch points wired):**
- `components/gem2i/`: **Gem2iHeader** (fixed, transparent-over-hero → solid+blur on scroll; slide-in right side menu = legacy signature; listens for `gem2i:open-contact` window event), **Gem2iContactPanel** (+fixed right-edge vertical Contact tab; submits via contactAPI → /api/contact), **Gem2iFooter** (blurb + HQ/phone/email from gem-content, CMS sitemap, socials, copyright), **Gem2iCookieNotice** (localStorage `gem2i_cookies_accepted`).
- `pages/gem2i/Gem2iHome.js`: hero (CMS slides via getHeroSlides('home'); branded static fallback until slides exist), intro, 3 featured blurbs, services banner (opens contact panel), 8-service numbered grid, 3-step methodology, festivals/conferences/media sections render only when data arrives (Phase 2), clients. All copy via useT() EN/ES.
- Branches: Navbar.js → Gem2iNavbar (reuses shared useNavData), Footer.js → Gem2iFooterWrapper, HomePage.js → theme==='gem2i' ? Gem2iHome : placeholder, HeroSection isModernLike += gem2i. Poppins added to public/index.html.
- Theme-var fixes benefiting all themes: DynamicPage + App.js login-gate/404 screens now use `--color-page-bg`/`--color-body-text` (were hardcoded light). **LoginModal: Google-login button removed** (plan OUT: no third-party login).
- `publicAPI.getGemContent()` added to lib/api.js.

**Deploy script fix:** `deploy_beta_gem2i.ps1` Get-ChangedFiles now expands untracked DIRECTORIES (`git status` collapses them to `dir/`; scp can't upload a dir) — first attempt failed on that and auto-rolled back cleanly; rerun deployed green in 1m58s.

**Verified live:** health 200 · settings show GEM2i/gem2i · computed vars on page exactly #04080C/#3287B7/Poppins · zero console errors · /events public placeholder renders · /about correctly shows Login Required · **contact e2e PASSED** — test doc in `gem2i_cms.contacts` (email phase1-test@gem2i.com, marked safe to delete).

**Notes:**
- This machine's `~/.ssh/id_ed25519` is already authorized on the box → collaborator-key open item RESOLVED (deploy + scp used it).
- SMTP not configured → contact admin-notification email doesn't send yet (capture in CMS works). Operator sets SMTP in CMS when ready.
- Hero slides + real About/Travels/Privacy/Terms page copy await the legacy ETL (legacy dump lives on the other machine at `C:\2026\Acapitalgroup.com\gem2i.com\__bases_de_datos\`).
- Design skills on this machine: only `impeccable` installed (emil-design-eng + design-taste-frontend missing → `npx skills experimental_install` + restart before deep polish).
- Footer sitemap ordering slightly off (pre-existing /terms & /privacy docs kept their original `order`) — cosmetic, fix via CMS Pages.

**NEXT: Phase 2 — catalogs** (ETL artists/venues/festivals/conferences/events + listings/filters/details + admin CRUD). ETL needs the legacy MySQL dump (other machine).

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

**✅ FRONTEND STRIP + STAND-UP DONE — beta.gem2i.com is LIVE.**
- `App.js` rewritten to the CMS-core route graph (dropped all brand routes/lazy-imports: News/Companies/Opportunities/FeaturedProjects/MapType/personality mini-sites + ~20 brand admin managers + non-core My Account pages + MMS via-capture/InvitedByBanner). `HomePage.js` replaced with a minimal Phase-0 placeholder (real gem2i theme = Phase 1). Brand code is now excluded from the built bundle (unimported → tree-shaken).
- `scripts/gem2i_nginx.conf` + `scripts/box_standup.sh` written; code tar'd + uploaded to `/opt/beta.gem2i.com`.
- **Stand-up green:** venv + pip; **backend import smoke test PASSED** (strip validated); frontend `yarn build` clean (198s); systemd `gem2i-backend` active (:8050); nginx vhost; LE cert (exp 2026-10-13). **`https://beta.gem2i.com/api/health` → 200** `{"status":"ok","product":"gem2i"}`; http→https 301; SPA root 200; seed ran (generic "Legacy" brand — rebrand via CMS).
- **git init + first commit** `a54c75a` (494 files) = restore point.
- Admin login: **`carlos.m.artiles@gmail.com`** (Anthony's standard admin) — set 2026-07-15, login-verified 200; password is bcrypt-hash-only in the DB, `.env` holds just `ADMIN_EMAIL`. Old auto-generated `admin@gem2i.com` retired. See test_credentials.

**✅ HOUSEKEEPING DONE (this session, commit b924715, pushed):**
1. **Orphan-file cleanup** — deleted all now-unimported brand frontend pages/components/libs (grep-verified no dangling imports; KEPT `pbPersonality`+`socialCatalog` which Navbar/Footer/admin still import) + brand backend scripts. **Box re-synced + rebuilt green (105s), health 200** → cleanup proven safe.
2. **provision_gem2i_box.ps1** refactored → thin wrapper over `scripts/box_{inventory,clean,standup}.sh` (parse-clean now; the earlier inline-heredoc version was the PS 5.1 bug). NEW `scripts/box_inventory.sh`.
3. **GitHub:** remote `origin` = https://github.com/anthonyguimack/Gem2i.com ; `git push -u origin main` landed (local == origin/main == b924715). `.last-deploy-gem2i` stamp set = HEAD so ongoing `deploy_beta_gem2i.ps1` runs incrementally.
4. **Collaborator workflow** wired: `work-plans-MD/TEAM_COLLABORATION.md` + CLAUDE.md GitHub/team section (START/FINISH git-sync, claim headers, SSH-key fallback `GEM2I_SSH_KEY`/`~/.ssh/id_ed25519` so the collaborator deploys with their own key). Same culture as the AUX brands.

**STILL OPEN (small, for the phases):**
- CMS rebrand (brand_name/tagline/theme → gem2i) + seed a test member.
- `requirements.txt` trim (kept full for boot).
- Collaborator's public key added to the box `authorized_keys` (Anthony, one-time) OR they set `GEM2I_SSH_KEY`.

**READY: GEM2I_MIGRATION_PLAN Phase 1** (Gem2iLayout + homepage + content pages).

**Box:** 34.198.159.54 (clone of beta-carlos). **DB:** gem2i_cms. **Prefix:** gem_*. **Legacy source data** for the eventual ETL already backed up at `C:\2026\Acapitalgroup.com\gem2i.com\__bases_de_datos\` — no new backup needed.

**NEXT:** on GO → run `-Inventory`, review, then clean → fork → stand up.
