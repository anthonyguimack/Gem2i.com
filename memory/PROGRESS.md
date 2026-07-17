# PROGRESS.md — gem2i deployment history

---

## 2026-07-17 (session 5, Anthony's machine) — PHASE 3 SHIPPED: member merge (D2) + gating + B7 formal-name gate LIVE

**The full legacy membership is migrated and the auth surface is legacy-parity.** Phase 3 per plan §7 done end-to-end.

**Member-merge ETL (D2 silent bcrypt — plaintext never persisted anywhere):**
- NEW `scripts/gem2i_etl_members.py` (Stage 1, local vs the restored `gem2i_etl_src` MariaDB): members + members_membership + member_type → `gem_member_types.jsonl` + `gem_members.jsonl`. **bcrypt happens in Stage 1 in memory** — 1214/1737 passwords hashed; 523 no-password rows (FB-only logins, FB login dropped) get `password_hash:null` → forgot-password recovery. 1 legacy row skipped (no email). estado '1'→active (the only value the legacy login accepted), '0'/'2'→deactivated. `formal_name_id_confirmation:'ok'` → `formal_name_confirmed:true` (21 members).
- NEW `scripts/gem2i_load_members.py` (Stage 2, on box, idempotent): member_types $setOnInsert (5 types, det ids) · NEW members inserted with sequential membership_number + `GEM-n` membership_id · already-migrated → profile refresh only (password_hash/status/roles NEVER re-written, so forgot-password resets survive re-runs) · pre-existing-by-email (the admin, legacy_id 2) → tagged + supplemented, auth+profile untouched · sponsor chains resolved legacy→member_id (1736) · **gem_config ecommissions levels set to the real legacy [30,20,15,10,5,2]** (was [0×6]) · indexes (legacy_id unique sparse, email).
- **Loaded:** members 1737 total (1736 inserted + admin merge) · 527 active legacy · member_types 5 · re-ran `gem2i_load_catalogs.py` → **gem_follows.member_id resolved 221/225** (4 reference never-migrated rows — stay hidden, partial index).
- Fixed live: `settings.aux_prefix` AUX→**GEM**; all 1736 migrated membership_ids rewritten `GEM-n`.

**Backend:**
- `models/database.py` `verify_password` hardened: empty/None/invalid hash → False (migrated no-password members fail auth cleanly, not 500).
- `member_login`: case-insensitive email fallback (legacy MySQL matched any casing; migrated emails stored lowercase) · `member_logins.source` now **'gem2i'** (was 'main').
- **B7 formal-name gate** in `gem_passes.py`: `require_formal_name()` → 403 `formal_name_confirmation_required` enforced on guest-list join AND `gem_tickets` checkout · NEW `GET/POST /member/gem/formal-name` (member confirms/corrects legal name; sets confirmed flag) · `my-event-status` now returns `formal_name {name, confirmed}`.

**Frontend:** NEW `components/gem2i/GemFormalNameDialog.js` (legacy #confirmation_formal_name modal rebuilt; EN/ES, prefills current name) wired **error-driven** into GemGuestListWidget + GemTicketWidget: on the 403 the dialog opens, and on confirm the original action retries automatically. `gemAPI.formalName()/confirmFormalName()`.

**Verify:** py_compile clean · `yarn build` GREEN (only the pre-existing exhaustive-deps warnings) · **Deploy GREEN (4m28s, health 200).** Verified live: null-hash active member login → 401 (not 500) · deactivated member → 401 · formal-name unauth → 401 · ecommissions [30,20,15,10,5,2] on box.

**Phase-3 remaining (needs humans):** a real migrated member logging in with their original password (nobody should type legacy plaintext but a volunteer/owner can) · forgot-password e2e needs SMTP configured in CMS. Login-modal/gating map were already legacy-parity from Phase 1.

## 2026-07-17 (session 4 continued #2, Carlos's machine) — PHASE 5 CORE BUILT + DEPLOYED: e-ticketing + Stripe + economics

**Ticket purchase path (plan B1/B2/B3) built end-to-end.** Stripe per D3 (CMS-managed key via `get_stripe_api_key`); the legacy disabled-IPN hole is closed **by construction**.

**Backend — NEW `routes/gem_tickets.py`** (registered in server.py; `seed_gem_ecommissions()` at startup):
- Public: `GET /public/gem/events/{id}/tier-availability` (configured tiers = price>0 AND stock>0; remaining per tier) · `POST /public/gem/payment-webhook`.
- Member: `POST /member/gem/checkout` {event_id,tier,quantity≤10,origin_url} → Stripe Checkout session (success `/tickets/success?session_id=…`, cancel back to the event) + pending tx w/ insert-then-verify oversell rollback · `GET checkout-status/{session_id}` (success-page poll; completes when Stripe says paid — works even before the operator wires the webhook in Stripe) · `GET my-tickets/{event_id}`.
- **Webhook trust model (D3/§8 exit test "forged webhook rejected"):** ① optional Stripe signature check when `gem_config {key:'payments'}.webhook_secret` set; ② payload treated as a HINT only — completion state comes from retrieving the session FROM Stripe server-to-server (fake session id → 404/retrieve fail; unpaid → ignored); ③ Stripe amount_total must equal tx.total or 400.
- **Per-tier stock arithmetic-on-read**: completed always counts; pending counts only for 60 min (PENDING_HOLD_MINUTES) so abandoned checkouts auto-release.
- **Economics (B3):** on completion tx gets {cost, profit, commissions[6]} from tier cost + `gem_config {key:'ecommissions'} levels` (seeded [0×6]; real legacy percentages arrive w/ ETL/operator). Sponsor-chain payout resolution = report-time, post member-merge.
- Completion idempotent (`_complete_ticket` guarded update — one QR/email even if webhook+poll race). QR + email reuse the Phase-4 plumbing; NEW `gem_ticket` email template (auto-seeds).
- The 6 tiers = legacy set: admission/eprice/vip/gold/ultra/platinium (`tiers.{key} = {label,price,cost,stock}` on the event; `payment.currency` per event, default usd).

**Frontend:**
- NEW `components/gem2i/GemTicketWidget.js` on event detail (type=eticket, non-past): public tier list w/ price+remaining, qty select (≤6, capped by availability), Buy → Stripe redirect (logged-out → login modal), shows my purchased tickets w/ QR, sold-out states, EN/ES.
- NEW `pages/gem2i/Gem2iTicketSuccess.js` at `/tickets/success` (theme-gated route): polls verified checkout-status (10×2s) → QR ticket / still-processing / failed states.
- **Events manager tiers sub-editor** (`tiers` field, shown when type=eticket): 6 rows × label/price/cost/stock + payment currency select (USD/EUR/GBP). Transactions manager rows now show qty × tier = total for tickets.
- `gemAPI`: tierAvailability/checkout/checkoutStatus/myTickets.

**Verify:** `py_compile` clean; `yarn build` GREEN (57s, only the 4 pre-existing warnings).

**Deploy:** GREEN (3m6s, 16 files, health 200, gem2i-backend active). **Verified live post-restart:** tier-availability serves (empty tiers for a non-eticket event — correct) · forged webhook POST → 503 payments-not-configured, nothing completed (once the Stripe key is set the path is retrieve-verify → forged ids fail) · checkout unauth → 401 · `gem_config ecommissions` seeded [0×6] · `gem_ticket` template seeded (enabled).

**Phase-5 remaining:** share→referral points (B5) + purchase reward-points writes (points config editor = Phase 6); e2e sandbox purchase test (needs Stripe test key in CMS Settings + test member + admin login — humans); operator wiring: Stripe webhook endpoint → `https://beta.gem2i.com/api/public/gem/payment-webhook` (+ optional `webhook_secret` into gem_config `payments`).

## 2026-07-17 (session 4 continued, Carlos's machine) — PHASE 4 CORE BUILT + DEPLOYED: guest list + waiting list + QR passes

**Full guest-list engine (plan A8) built end-to-end — backend + member widget + admin.** No dependency on the Phase-3 member merge (identity = JWT; benefits keyed by CMS `member_types.id`).

**Backend — NEW `routes/gem_passes.py`** (registered in server.py; indexes ensured at startup via `ensure_pass_indexes()`):
- Member: `GET my-event-status/{event_id}` (one call feeds the widget: pass/waiting/eligible/benefit/availability/following) · `POST guest-list` {event_id, additional_guests} · `DELETE guest-list/{event_id}` (cancel, stock frees arithmetically) · `POST/DELETE waiting-list` (join only when actually full; unique index).
- **Stock = arithmetic-on-read** (aggregate 1+guest_additional over non-canceled `gem_transactions` kind guest_pass). **Issue = insert-then-verify**: insert pass → re-count → if oversold in the race window delete own row → 409 `guest_list_full`.
- Eligibility: if `event.guest_list.benefits[]` non-empty, member's `member_type_id` must be listed (legacy per-type gating); empty benefits = everyone. Additional guests validated against `additional_enabled` + `ranges`. Time-window fields (open/free/additional_until) carried + displayed, not door-enforced (check-in = future phase).
- **QR e-pass**: python `qrcode` (already in requirements w/ Pillow) → PNG at `uploads/gem2i/passes/{code}.png` (served by /api/uploads; no FTP). Payload `GEM2I-PASS:{code}`.
- **Pass email**: NEW template `gem_guest_pass` in `models/email_templates.py` (auto-seeds at startup; QR inline via URL) sent via `render_and_send` as a BackgroundTask — best-effort, silent while SMTP unconfigured.
- Admin: `GET /admin/gem/transactions` (search member/email/qr-code, filter status/kind/event, event titles resolved per page) · `PUT .../{id}` manual completed/canceled/pending · `GET /admin/gem/waiting-list/{event_id}` (member names resolved). NEW section **gem_transactions** in cms_sections.py.

**Frontend:**
- NEW `components/gem2i/GemGuestListWidget.js` on the event detail page (renders only for type=guest_list, non-past): logged-out → login prompt (gem2i:open-login) · eligible → availability + free-until + additional-guest select + join · pass → QR image + code + cancel · full → waiting-list join/leave · not eligible message. EN/ES throughout.
- `gemAPI` + `gemAdminAPI` extended (myEventStatus/join/cancel/waiting; transactions/updateTransaction/waitingList).
- NEW `pages/admin/GemTransactionsManager.js` at `/admin/gem-transactions` (sidebar "Transactions & Passes", Ticket icon): search/filters, cancel/reinstate, QR preview dialog, per-event waiting-list dialog.
- **Events manager guest-list sub-editor** (GemCatalogManager `guestList` field, shown when type=guest_list): stock, additional_enabled + allowed counts, benefits rows per member type (selects fed from adminAPI.getMemberTypes; open/free/additional-until datetime-locals, title/desc).

**Verify:** `py_compile` clean (gem_passes, server, email_templates, cms_sections); `yarn build` GREEN (64s, only the 4 pre-existing exhaustive-deps warnings; Dropbox build-dir EPERM hit again — same fix, delete `frontend/build` first).

**Deploy:** GREEN (3m3s, 13 files, health 200, gem2i-backend active). **Verified live post-restart:** member `my-event-status` and admin `transactions` both 401 unauthenticated (gates intact) · `gem_guest_pass` email template seeded (enabled:true) · indexes created: gem_waiting_list unique `(event_id,member_id)`, gem_transactions `(event_id,kind,status)` + `(member_id)`.

**E2E test plan (after deploy — needs humans for login):** admin creates a guest-list test event (stock 2-3, a benefit row or none) → test member joins (QR appears; email if SMTP set) → second join fills it → waiting list → cancel frees spot → admin sees rows in Transactions & Passes. **Test member still unseeded** (needs a password — Anthony/user sets it, house rule: no credentials via Claude).

**Phase 4 remaining:** the e2e above; waiting-list → auto-promotion notification is Tier C (deferred by plan).

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

**Continuation (same session, after the deploy above):**
- **Events page parity DONE (local, awaiting deploy):** card/list view toggle (persisted `gem2i_events_view` in localStorage; list rows = thumb/title/date/venue/country/TypeBadge) + country filter `<select>` fed by NEW `GET /api/public/gem/venue-countries` (distinct active-venue countries; events resolve country via venue — legacy behavior). `gemAPI.venueCountries()` added. `yarn build` green (no new warnings), `py_compile` OK.
- **Junk venues DEACTIVATED live** (data-side via SSH mongosh, no deploy needed): `anidados2` + `lawevas` → status inactive (both had country:null/order:0 — legacy test rows). Verified gone from public /venues.
- SSH note (this machine): the `.pem` path in CLAUDE.md doesn't exist here; ssh falls back to this machine's authorized `~/.ssh/id_ed25519` — works for ssh/scp/deploy.

- **Second deploy GREEN** (2m53s, 7 files, health 200). Verified live: `/api/public/gem/venue-countries` returns the sorted country list · country-filtered events queries work (totals: past=0 for ALL countries — every legacy past event is outside the 365-day D7 window, expected; current=2 = the 2030-dated legacy test rows) · junk venues return 0 public hits.

**Remaining Phase-2 exit after this:** admin round-trip live test per catalog (needs an admin login in the browser — Anthony/operator).

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
