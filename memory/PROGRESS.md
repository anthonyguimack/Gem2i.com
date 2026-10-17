# PROGRESS.md — gem2i deployment history

---

## 2026-10-17 (session 8, part 2) — partners, Contact section, typography T-2, hero carousel, lighting, contrast, legacy content, venues grid, all templates, 02 wide (all DEPLOYED to beta)

**Shipped (beta, health 200 after each deploy; verified in the browser):**
- **Partners:** 11 real legacy sponsors (images_sponsors + gem2ica `sponsors` table names) in `/opt/beta.gem2i.com/backend/uploads/gem2i/partners/`, replacing the 3 placeholders (backup `/opt/_port_backups/partners_before_*.json`); marquee shows them as white silhouettes.
- **Contact Us = homepage section** (`GemContactSection.js`, port of A Capital ModernContact). Every contact button / tab / side-menu / `gem2i:open-contact` / `/contact` route → `/#contact` (window.scrollTo, re-aligns for late-loading sections). Slide-in panel no longer mounted.
- **Typography T-2** (bocetos/tipografia.html): Manrope text (all public gem2i files), Playfair titles with last word in italic accent (`AccentTitle.js`, `.gem-accent`), `.gem-eyebrow` with rule, bigger scale (15-17px body), sentence-case buttons/menu.
- **Header hover H-3** (bocetos/menu-hover.html): blue + rising dot; `.gem-nav-link` / `.gem-nav-pill` (inline colours removed).
- **Hero:** carousel for A, B and C (`useHeroCarousel`, 7s, dots/arrows/keys, pause); fits `100svh - 130px`, controls in content flow; Aurex fill button on "More information"; CMS slide HTML stripped. 02 keeps the featured-event card, 03 the upcoming strip.
- **Lighting** (bocetos/home-luz.html): Page Builder colours now win (inner section bg cleared), light backgrounds flip text to dark automatically (`.gem-tone-light`), blue bands (`.gem-tone-blue`). Preview flag `?look=l1|l2|l3|off` (`lib/gemLook.js`); L-3 bands use the legacy brand gradient `#002444 → #0068b3`. **No look chosen as definitive yet.**
- **Contrast WCAG AA:** audit script (text on colour + text on photos) → 0 issues in off/L-1/L-2/L-3. Text-safe link tints per surface; CMS `theme_colors.website.accent/button_bg = #0068b3` (backup `/opt/_port_backups/theme_colors_before_accent_*.json`). button_hover_bg/link_color/tab/icon still `#4894ca`.
- **Page Builder editor:** unset section shows the theme default (gem2i `#04080C`, not white) + "Default" swatch to clear.
- **nginx cache policy** (live + `scripts/gem2i_nginx.conf`): index.html no-cache, /static immutable, /api no-store, /api/uploads 7d. Backup `/opt/_port_backups/nginx_beta.gem2i.com_*.conf`.
- **Legacy home content** (`scripts/gem2i_load_legacy_home_content.js`): methodology Goal definition/Analysis/Implementation, Marketing banner, Media video vy-k0FopsmY, real offices on the map (NY, Spain, Lima, Buenos Aires, Santo Domingo), real team (6, initials until photos). Backup `legacy_home_content_before_*.json`.
- **Venues = legacy venues.php grid** (`GemVenueGrid`): full-bleed numbered photo tiles, logo circle (grey→colour), hover veil with name/location/View details; venues fetch 150.
- **01 designs on all templates** (`isTpl01 = true`); Page Builder configs/order copied gem2i → gem2i_02/03 (backup `pagebuilder_before_tpl_copy_*.json`). **Template 02 = wide layout** (`.gem-tpl-wide`: full width, fluid margins, more grid columns ≥1536px). Active theme on beta: **gem2i_02**.

**Open / human:** pick the definitive lighting look (then write it into Page Builder colours); Testimonials still fork text; team photos; SoundCloud track not added; points e2e; hover of hero/venue not mouse-tested in the browser.

## 2026-10-17 (session 8, Anthony's machine) — B3/B5 points, real Site Content photos, template-01 home redesign (all DEPLOYED to beta)

**Shipped (beta.gem2i.com, health 200 after every deploy, verified in the browser at 1280px):**
- **B3/B5 reward points** (`routes/gem_points.py`), rules read from the legacy PHP in `C:6\Acapitalgroup.com\Gem2i.com-backup-del-plesk` (`paypal_ipn.php`, `ajax/points-invite-event.php`, `ajax/ajax-event-add-gues-list.php`): paid ticket → buyer `purchase_for_self` (flat per tx); bought via invite link `?ref=GEM-n` → inviter `friend_purchased_via_invite`; share → `invite_to_purchase_share`; guest-list join stores `yourself_points` ON the pass (no history row). Other configured values were never awarded by legacy → not awarded. Safety vs legacy: unique `dedupe_key` (webhook retries can't double-pay), share once/member/event/day, no self-referral. Rows in `gem_points_history` (`source:'gem2i'`). Endpoints `GET /member/gem/points`, `POST /member/gem/events/{id}/share`; "Invite friends & earn points" button in the ticket widget. **Not e2e-tested** (needs Stripe + member login).
- **Site Content photos:** intro + 3 featured cards now real legacy photos (crops of Ushuaia / Mirage / Amnesia / a DJ portrait) in `/opt/beta.gem2i.com/backend/uploads/gem2i/site/`. Backup `/opt/_port_backups/gem_content_before_photos_20261017-124614.json`.
- **Home template 01 (`gem2i`) redesign from approved bocetos** (`work-plans-MD/bocetos/secciones-*.html`); templates 02/03 keep the old renderers (`isTpl01` in Gem2iHome):
  - Methodology M-3 (cycle) · Who it is for A-3 (editorial list, new `image` item field) · How it works P-1 (timeline). **P-2 reserved for 02/03.**
  - Upcoming events E-2 (posters; ≤2 events + "list your event" tile, ≥3 → carousel) · Artists R-2 (featured + 6 grid) · Venues V-1 (view photo + logo; photo-first, imageless skipped) · Festivals F-2 (bento) · Conferences C-1 (logo cards). **F-1 reserved for another template.**
  - Watch W-1 (cover + play, player in a modal) · Plans P-1 · Team T-1 · Testimonials Q-1 (one quote) · Gallery G-2 (two drifting rows + full-screen viewer, ←/→/Esc) · Partners B-1 (logo marquee) · Clients K-1 (logo grid).
  - **Where GEM2i plays = port of A Capital `components/ModernMaps.js`** (AUX-1.0 @1775e05) → `components/gem2i/GemModernMaps.js` (graphite layout default, gem2i blue; `layout:'split'` on aurex_locations_cfg for the light one); tabs from `/public/map-locations` map types.

**Data changes on the box:** audience test items got `image`; `gem_section_configs.aurex_video.poster_url` = site/gem_events.jpg (the test YouTube video has no thumbnail).

**Open / human:** Team, Testimonials ("Legacy Consulting"), Partners (placeholders), Gallery and map locations are still fork/test content → replace in CMS. Events carousel (≥3) untested live (only 2 future events). Points need an e2e purchase.

## 2026-10-16 (session 7, Anthony's machine) — A Capital → GEM2I audit + F0–F6 port + Section Manager + 3 templates, all DEPLOYED to beta

**Audit:** `work-plans-MD/auditoria-acapital-a-gem2i-2026-10-16.md` (A Capital `1775e05`, 267 commits since the Carlos port base `8a0d4dd`). Plan F0–F6, all executed this session.

**Shipped (beta.gem2i.com, health 200, backend log clean):**
- **F0 security:** `/api/public/settings` deny-list + recursive secret strip (A Capital `4ce2d39`; GEM was leaking smtp_host/admin_email/email_to…/operator_email — verified fixed live). `payments.py` webhook: optional signature (gem_config payments.webhook_secret) + Stripe re-fetch, payload only a hint.
- **F1 CMS core:** race-safe role seed; email templates dedupe + unique index + "Use the brand theme" mode; RichTextEditor `btn` links survive saves; Hero slide **Clone** + **Audience** (everyone/guests/members, filtered on home, dynamic pages, system pages); Stripe brand labels + `rk_` keys; maps → keyless OSM (CARTO now needs a key; maps were blank); Purchases list price/coupon/paid.
- **Pre-existing bug fixed:** `GET /api/admin/gem/transactions` was swallowed by `/admin/gem/{catalog}` (404 in CMS) → specific gem routers now registered BEFORE gem_catalogs in server.py.
- **F3:** `routes/gem_calendar.py` — member calendar over gem_events (+ my passes/tickets, following), private iCal feed with rotate, notifications EN/ES (guest-list join, ticket paid, admin cancel, waiting-list spot open, membership active/lapsed).
- **F4 My Account 2.0 "tal cual" A Capital:** Velzon palette + light default (`my_account_2`/`_dark` colour groups, CMS-editable), 2.0 pages copied from A Capital (Profile, Sponsor, Invite Code, Community, Biography) + gem2i Calendar, Calendar Sync, Membership. Shell bilingual, GEM nav only (catalog filtered). **Privacy (b) now enforced in the API** (`/member/my-community` no longer returns email/phone/DOB/gender/ZIP). Ported `/member/community/invite-membership`.
- **F5:** `gem_coupons.py` (tickets / membership / all, per-event, total|per-member limits, redemption on completion, 100% coupon skips Stripe) + `gem_membership.py` (monthly/annual one-time Stripe, level granted while active, lapse restores previous level in `get_current_member`, shared gem webhook dispatches kind=membership). CMS: Coupons, Paid Membership.
- **Section Manager** (`routes/gem_sections.py`, port of aurex_sections; collections `gem_section_configs`/`gem_section_items`): A Capital sections + gem_methodology + gem_*_cfg headers + News Ticker / Locations / Gallery. **Page Builder** scope per gem2i template. Home (`Gem2iHome`) renders in Page-Builder order with per-section bg/font/visibility.
- **3 templates:** `gem2i` = "Gem2i - 01" (Hero A), `gem2i_02` (Hero B + next-event card), `gem2i_03` (Hero C + upcoming strip). Sections shared for now. Preview without switching live: `?template=01|02|03` (`off` clears; sessionStorage). `isGem2iTheme()` in lib/themeColors.
- **Header** distributed like Aurex (logo left · nav centred · account right), verified 1280/1900px.
- **Home designs approved:** Intro I-2, Featured F-1, Services S-2 (`components/gem2i/GemSections.js`); old blocks kept as `legacy_*`. New CMS **Site Content** editor (`/admin/gem-content`) for intro/featured/services copy + photos.
- Sketches kept in `work-plans-MD/bocetos/`.

**Data changes on the box (all with backups or seed tags):**
- Levels: Nivel 0/1 += `global-calendar`, `calendar-sync` (`scripts/gem2i_levels_add_calendar.js`; backup `/opt/_port_backups/member_levels_before_calendar_20261016-210024.json`).
- Section Manager test content tagged `seed:'gem2i_test_2026-10-16'` (`scripts/gem2i_seed_section_manager_test.js`).
- `settings.sections.gem_services_banner.enabled=false` (S-2 has the contact card).

**⚠ Incident:** disk hit 100% (29 deploy backups = 43 GB) → a deploy failed mid-backup. Cleaned to the 3 newest (35% used) and `deploy_beta_gem2i.ps1` now prunes to 3 before each backup and drops half-written archives.

**Open / human:** test with real admin + member logins (CMS screens, My Account 2.0, coupons, membership); Stripe key; replace fork content (hero slide "Legacy Consulting", testimonials); upload real photos in Site Content; MMS (points) comes later as its own product; legacy gem2i.exclusivesession.com admin password = plaintext `admin.pass` on a box we can't reach (owner/host).

## 2026-09-23 (session 6, Carlos's machine) — PORT FROM CARLOS: plan executed 1.A → 1.H, all DEPLOYED

**`work-plans-MD/PORT_FROM_CARLOS_PLAN.md` run end-to-end** from Carlos AUX-1.0 @ `8a0d4dd` (read-only). 70 modules: **19 done · 31 waiting on a human · 14 skipped · 6 identical.** Per-module log in plan §8; human items H1–H17 in "PENDIENTES PARA HUMANO". Method: Carlos tree extracted to a temp dir + file-by-file compare (324 same / 73 diff / 443 Carlos-only); every diff read and split into generic hunks (ported) vs hunks bound to KMS/MMS/governance/brand themes (left out).

**Shipped (5 deploys, all GREEN, verified /api/health, /, /festivals, new pages, 401 gates, backend log clean):**
- Lote 1 (#21/#22): Invite Code + QR and My Community pages re-added (backend already existed); gem2i `--ma-*` colours, EN/ES, loading/error/empty states; **privacy option (b)**: downline modal hides email/phone/DOB/gender/ZIP.
- 1.A core: `is_admin()` (bootstrap `role:"admin"` OR CMS role `role_admin`) in all backend gates + `lib/isAdmin.js`; **atomic `membership_number` counter** (`counters` doc) + `insert_member_with_retry`; **login history now recorded on `/auth/login`** (My Account's real login path — it was only in the unused `/member/login`, so no member logins were being recorded); MembersManager uses `settings.aux_prefix` (showed `AUX-n` sponsors); role-label reconciler; hero CTA actions (`lib/ctaActions`, Login → `gem2i:open-login` event); Waiting List operator/subscriber emails + Operator Notifications settings; Captcha `theme` prop.
- 1.B membership: **`routes/enrollment.py` restored** (the public `/membership-enrollment` page had no backend since the strip) + EnrollmentFieldsManager; profile field visibility (`hidden_fields`); My Account layout paints once data is ready + own Suspense + sliding highlight; `utils/membership_prefix.py` (prefix change realigns IDs); **`Gem2iWaitingListModal`** (gem2i-styled, opens on `#waiting-list` links / `gem2i:open-waitlist`; only demands captcha when enabled); default member/sponsor images.
- ⚠ **R12 incident, fixed same session:** Carlos' enrollment seed (finance questionnaire + "ACGMP Privacy Policy") surfaced publicly. `DEFAULT_FIELDS` rewritten to 19 neutral fields; the 50 rows my deploy had seeded minutes earlier were exported to `/opt/_port_backups/enrollment_fields_carlos_seed_20260923.json` and deleted; neutral set re-seeded.
- 1.D: ImageAdjust (crop/stretch/original) via opt-in `adjust` on 13 CMS upload sites; neutral enrollment step labels.
- 1.C/1.E/1.F/1.G/1.H: no code — all points/mentoring/KMS/News/Mail/sister products/brand themes need human decisions (they contradict D-GEM-2026-02 / D8, need credentials/infra, or clash with gem2i's points ledger R2).

**Read-only box facts gathered:** `settings.site_url` unset (QR 400 until set — H1) · 0 duplicate membership numbers/IDs, no unique index yet (H5) · no member has `level_id` (all see every My Account item) · `myaccount_nav` still lists Carlos-only items (H4).

**Commits:** d314981 (lote 1) · a4aff07 (1.A) · 7f5fad3 (1.B) · cff91d1 (enrollment R12 fix) · 509101c (1.D) + FINISH.

**Same day, owner follow-ups (D-GEM-2026-05):**
- e2e without login done by Claude (QR sponsor page, sponsor/code validation, community data); account creation/login parts left to a human (H3). Found: GEM-3 tree = 1,625 people / 8 levels, **7.2 s** without a `sponsor_id` index (H18); `settings.operator_email` still empty (H19).
- **Enrollment like Carlos:** his 50 fields + legal texts + step labels restored (d9998ea); neutral set backed up in `/opt/_port_backups/`.
- **My Community perf:** `sponsor_id_1` index + endpoint rewritten to one `$graphLookup` (4b3d7cc) — identical trees, GEM-3 1228→230 ms. Carlos Beta has the same N+1 (note in the port plan H18).
- **Phase 6 started:** i18n sweep of the public theme (5aa22a3); impeccable detector 0 findings; no 375px overflow. **B3/B5 points writes blocked** until the owner provides the legacy PHP rules (tracker header lists files + per-event config counts).
- **Rest of the work plan:** points kept as migrated (owner defines rules later); reward-points sub-editor in the Events manager (9760e33); Phase 7 cutover runbook `work-plans-MD/GEM2I_CUTOVER_RUNBOOK.md`; loaders made delta-safe (skip CMS-edited docs via `updated_at`, new members → Nivel 0). Found for cutover: frontend bakes `REACT_APP_BACKEND_URL=https://beta.gem2i.com`, CORS/nginx/cert only know beta; `/terms` shows the fork's "Welcome to Legacy Consulting." (content = owner).
- **Governance like Carlos (#29):** code 6ef4b21 (level gate in `get_current_member`, `utils/{level_access,product_access,member_capabilities,site_pages}`, level editor, `apply_member_defaults`) + data via `scripts/gem2i_gov_migrate_levels.js` (Nivel 0/1, enforce + v2 ON, 1,736 members → Nivel 0; types untouched; backups `/opt/_port_backups/gov_*_before.json`). Verified with deployed code: Nivel 0 → profile/sponsor/QR/guest-list/tickets allowed, **Invite Code + My Community denied** (as in Carlos); admin allowed everywhere.

## 2026-07-17 (session 5 continued, Anthony's machine) — PHASE 4/5 HISTORICAL-DATA ETL LOADED (data-only, no deploy)

**All legacy per-event commerce config + the full transaction/points history are now in Mongo.** New two-stage ETL: `scripts/gem2i_etl_history.py` (local) + `scripts/gem2i_load_history.py` (box, idempotent).

- **gem_events sub-docs (1704 events updated by legacy_id; $set only the ETL'd keys so admin edits to other fields survive):** `tiers` (93 events with real config; price = last non-zero step of the dated `events_prices` man-ladder, woman fallback; cost/stock from `events_cost`; full non-zero ladders preserved under `legacy_prices`) · `guest_list` (109 events: stock, additional_enabled+ranges [1-5], benefits[] per member type with our det member_types ids — 0 dangling refs — free/additional_until + title/desc, open_until from guest_list_close) · `points` (purchase/invite_share/guest_list_self + full legacy sub-docs) · `payment.currency` from events_payment_accounts→currency (PEN/EUR/USD/ARS; legacy PayPal account kept as legacy_account) · `transaction_fee`.
- **gem_transactions archive: 240** legacy rows (139 guest_pass / 101 ticket, 78 canceled via guest_list_status/epass_status, 180 member-resolved; tier from type_ticket label; economics {profit, commissions[6]} verbatim; qr code string, sponsor/invited_by/referral, name+email snapshots; tagged `legacy:true` — the live Stripe path never writes that flag). Idempotent on legacy_id (unique sparse index).
- **gem_points_history: 6457** rows (6088 member-resolved) + the 16-action catalog → `gem_config {key:'points_actions'}`. Indexes (id unique, member_id+created_at).
- `events_members_waiting_list` is empty in the dump — nothing to port.
- **Verified on box:** sample eticket event (legacy 51, EUR, admission 60/cost 22.5/stock 100) · sample guest-list benefits resolve to real member_types · non-legacy tx count 0 (live path untouched) · health 200, admin gate 401.
- Historical passes count into arithmetic-on-read stock for THEIR (past) events only — correct; past events don't sell.

**Now migrated end-to-end:** catalogs (P2) + members (P3) + commerce config & history (P4/5 data). Remaining ETL: none. Remaining product work: B5 share→referral points + purchase points writes (Phase 6), e2e human tests, admin polish.

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
