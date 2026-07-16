# GEM2I_MIGRATION_PLAN.md — gem2i.com main website → AUX stack (React 19 + FastAPI + MongoDB)

> **CLAIMED BY:** (unclaimed)
> **STATUS:** PLAN FINAL — all §9 decisions recorded 2026-07-07 (D-2026-58). No code written (Anthony's standing directive for this project). **Phase-0 data step DONE:** all 17 DBs on the gem2i box backed up → `C:\2026\Acapitalgroup.com\gem2i.com\__bases_de_datos\` + real schema verified (§4b). Ready to claim → Phase 0 build when Anthony schedules it.
> **LAST SYNC:** 2026-07-07

---

## 1. Context & ground rules

**Source:** `C:\2026\Acapitalgroup.com\gem2i.com\` — the live PHP codebase of **https://gem2i.com/** ("GEM2i — Global Entertainment Management & Marketing Integration": an entertainment-industry membership portal with event/festival/artist/venue catalogs, guest lists, and PayPal e-ticketing). Site verified live and matching the source on 2026-07-07.

**Ownership ruling: OWNED.** This is Anthony's/the team's own software (footer contacts = carlos.artiles@gem2i.com; contact form delivers to Carlos + Anthony's personal inboxes). Full source analysis and direct porting of logic, schemas, and business rules is allowed; assets (logos, images) may be reused.

**Source stack (what we're leaving):** PHP 5-era (`mysql_*` extension, `get_magic_quotes_gpc`), MySQL DB **`gem2ica_production`**, Bootstrap 3 + "Canvas/Semicolon"-style theme, jQuery + Revolution Slider + Owl Carousel + MixItUp, phpqrcode + FTP for QR passes, PHPMailer over Amazon SES SMTP, PayPal classic `_xclick` + IPN, Facebook SDK v2.10, reCAPTCHA v2, plain PHP sessions.

**Target stack (house):** React 19 + TailwindCSS + Shadcn/UI (+@dnd-kit where needed), FastAPI + Motor + Pydantic, MongoDB with product prefix **`gem_*`**, JWT auth **unified with `members`** (D-2026-53 — no second user store), secrets in **`gem_config`** collection, never `settings` (D-2026-48). Design skills (emil / impeccable / taste) mandatory for all UI.

**SCOPE = the main website ONLY** (Anthony's directive 2026-07-07). Explicitly OUT: the three My Account areas (`my_account/`, `my_account2/`, `my_account3/`, root `account_*.php`, `login_validation/`), the "Systems" backend (`backend/`, `backend2/`), all sub-products (Artists forms, Venues tooling, Promoters/kodepromoter, e-ticket/invite/event/magazine dev+training subdomains, business cards), and all foreign domains hosted in the same tree (bksociety.com, djchrisbachmann.com, karnavalfest.com, nightonthehudson.com, ongroundproduction.com, acapitalgroup.com). **Caveat:** the public site is dead without a way to enter events/venues/artists — a minimum admin CRUD for the main-site entities IS in scope (§3 Tier A; the old "Systems" backend is not being kept).

**Placement recommendation (§9 D1):** gem2i becomes a **4th brand instance of AUX-1.0** — its own box/DB (`gem2i_cms`), a new public **theme `gem2i`** (dark entertainment look), plus a new **Events/Ticketing module** (backend routes + admin sections), the way News/Morning Brief/KMS are modules. Rationale: gem2i.com IS a brand website with members, sponsors, QR codes, hero slides, contact forms, SMTP — all of which the CMS already does; only the event-catalog/ticketing domain is genuinely new. A standalone Journal-style product would re-implement auth/members/settings for no gain.

---

## 2. How the current site works (spec extracted from source)

- **Domain-aware header:** every page resolves the request domain against a `promoters` table → promoter-scoped slider content. gem2i.com is the flagship promoter; other promoter domains are the white-label sub-product (OUT of scope — the rebuilt site serves gem2i.com only, slides become CMS hero slides).
- **Public/gated split:** Home, Events, Festivals, Artists, Venues listings are public; About, Travels, Services, Partners, Privacy, Terms and all detail interactions require login (modal). Login = `members` table (email + **plaintext password**, `estado='1'`), PHP session cookie across `.gem2i.com`, `last_session` stamp.
- **Homepage:** Revolution Slider (photo/video slides with per-element X/Y caption coordinates — maps 1:1 onto our hero canvas positioned mode), company intro, 3 featured blurbs, rotating-text services banner, services grid, **Global Festivals** carousel (DB), 3-step methodology, **Music Conferences** carousel (DB), media block, **Clients** carousel (DB: logo → link, video lightbox, or photo gallery), side contact panel (reCAPTCHA → `contact_us` + email to admins), cookies modal, side menu panel.
- **Events:** current/past listings with search (date picker, country/state autocomplete, name), card/list view toggle. Event types: 1=private (hidden), 2=**E-TICKET**, 3=**GUEST LIST**, 4=**INFO**. `gem2i_show_portal='Yes'` gates portal visibility.
- **Event detail (`event-info.php`, 145 KB):** description + social links, Facebook page plugin, follow/unfollow, FB share → referral points, DJ line-up (links to artist pages), venue block, and per type:
  - **Guest list:** per-member-type benefits (`free_until` times, additional-guest ranges), stock with "virtual stock" recompute (consumed = live count of non-canceled passes), join/leave **waiting list** when full, pass = row in `events_paypal_transactions` (type `GUEST LIST`) + **QR e-pass** (phpqrcode, FTP upload) + email, self-service cancel.
  - **E-ticket:** up to **6 tiers** (G. Admission / ePrice / VIP / Gold / Ultra / Platinium), each with price + internal cost + stock; quantity purchase → `event_payment.php` → PayPal `_xclick` (per-event receiver account + currency) or an **external ticket system URL**; at purchase time the code computes **profit and a 6-level e-commissions split** (`system_ecommissions` percentages) and stores them on the transaction (feeds the excluded My Account eBonus/eCommissions reports); reward **points** for buyer and for FB-share referrals (`system_points_actions_members_history`).
  - **PayPal IPN (`paypal_ipn.php`):** logs raw IPN to `m_data`, updates transaction to Completed, generates QR ticket images, emails confirmations. ⚠ **The IPN validate-with-PayPal step is commented out** — payments are trusted unverified (fixed by construction in the rebuild).
  - **Formal-name confirmation modal** intercepting members whose ID confirmation is pending → invite/verify/apply flows (those flows live in the excluded My Account; the rebuilt site only needs the gate).
- **Festivals / Conferences:** curated catalogs with date, view photo, dual-state hover logos, detail pages.
- **Artists:** 3 listings from `djs` — GEM roster, **DJ Mag ranked**, **Residents** — filtered by continent tabs / country / music genre with client-side pagination; artist detail with follow. Genre/country/DJ-name autocompletes.
- **Venues:** continent-tabbed listing + country/state search, logo wall (`venues-logo.php`), venue detail with its upcoming events + follow.
- **Static-ish pages:** About, Services, Privacy, Terms (content pages); Travels (hardcoded Tomorrowland demo), Media (hardcoded YouTube grid), Works (hardcoded gallery), Partners ("Coming soon") → all become CMS-managed content in the rebuild.
- **Geo:** `countries2` / `states` / `continents` autocompletes (the CMS already ships countries/states/cities 249/5046/32423 — reuse; add a continent mapping).

---

## 3. Feature catalog (tiers)

### Tier A — core (site is unusable without)
| # | Feature | Source |
|---|---|---|
| A1 | Public theme `gem2i`: header/side-panel/contact-panel/footer, login modal, cookie notice | header.php, footer.php, login-modal.php |
| A2 | Homepage: hero slides (CMS hero canvas), intro, featured blurbs, services, methodology, festivals + conferences carousels, clients carousel, media block | index.php + includes |
| A3 | Members login + page gating (public listings / gated details+pages) | session.php, events_user_login_ok.php |
| A4 | Events listing (current/past, search filters, card/list view) + event detail (description, socials, line-up, venue, follow) | events.php, events_past.php, event-info.php |
| A5 | Festivals + Conferences catalogs + details | festivals.php, festival-info.php, conference-info.php, includes |
| A6 | Artists catalogs (GEM / DJ Mag / Residents; continent/country/genre filters) + artist detail | artists*.php, artist-info.php |
| A7 | Venues catalog (continent tabs, search, logo wall) + venue detail w/ upcoming events | venues.php, venues-logo.php, venue-info.php |
| A8 | Guest list: member-type benefits, stock + waiting list, QR e-pass + email, cancel | ajax-event-add/delete-gues-list.php, events_members_waiting_list.php |
| A9 | Contact form (anti-bot → `contacts` + admin email via CMS SMTP) | contacts_ok.php |
| A10 | Admin CRUD for all gem_* entities (events w/ tiers+benefits+points, venues, artists, festivals, conferences, clients) — replaces the old "Systems" backend for main-site needs | (new; old backend excluded) |
| A11 | Data ETL: MySQL `gem2ica_production` → Mongo `gem_*` (catalogs, transactions history, follows) + member merge | (new script) |

### Tier B — required before cutover (full-parity doctrine, confirm §9 D4)
| # | Feature | Source |
|---|---|---|
| B1 | E-ticket purchase: 6 tiers, per-tier stock, quantity, per-event payment account + currency, external-ticket-system passthrough | event-info.php, event_payment.php |
| B2 | Payment provider webhook → transaction Completed → QR ticket + email (provider per §9 D3) | paypal_ipn.php |
| B3 | Purchase-time economics: profit + 6-level e-commissions split + reward points writes (feeds future My Account reports) | event_payment.php, points-invite-event.php |
| B4 | Follow system for events/artists/venues | ajax/follow-*.php |
| B5 | Share → referral points (share URL w/ member attribution; FB-specific plugin replaced by generic share) | event-info.php, fblogin.php |
| B6 | CMS-managed content for Travels / Media / Works / Partners / About / Services / Privacy / Terms | static pages |
| B7 | Formal-name-confirmation gate on ticket/guest-list actions (redirect to the existing platform flow) | event-info.php modal |

### Tier C — deferred backlog
| # | Feature |
|---|---|
| C1 | White-label promoter domains (promoter-scoped slides/branding on member domains) — belongs to the Promoters sub-product migration |
| C2 | Facebook page-feed plugin embed (FB SDK v2.10 is dead; revisit with current Meta embeds if wanted) |
| C3 | Waiting-list → auto-promotion notifications when stock reopens |
| C4 | Member-facing purchase history surface (belongs to the My Account migrations) |

### OUT — dropped or excluded by directive
- The three My Account areas, "Systems" backend, all sub-products and foreign domains (see §1).
- Facebook Login (`fblogin.php`) — platform precedent: Google OAuth was removed CMS-wide; no third-party login.
- Legacy duplicates in the tree (`*_OLD*`, `2017/`, `index-backup.php`, `assets_OLD/`…) — archaeology, not features.

---

## 4. Database structure (MongoDB, prefix `gem_*`, DB = the gem2i brand DB)

Reuse: **`members`** (unified store — D-2026-53; see D2 for merge), **`contacts`**, CMS `settings`/`hero_slides`/`pages`/geo collections. New:

| Collection | Document shape (key fields) |
|---|---|
| `gem_events` | `{id, title, slug, type: 'eticket'\|'guest_list'\|'info'\|'private', description(rich), image, event_date, end_time, open_time, venue_id, socials{fb,tw,yt,ig,sc,mc}, lineup:[artist_id], share_enabled, show_portal, status, tiers:{admission:{label,price,cost,stock}, eprice:{…}, vip, gold, ultra, platinium}, guest_list:{stock, additional_enabled, ranges:[int], benefits:[{member_type_id, open_until, free_until, additional_until, additional_title, additional_desc}]}, points:{purchase, guest_list_self, invite_share}, payment:{account, currency, external_url}}` — tiers/benefits/points embedded (one read renders the page, D-2026-54 pattern) |
| `gem_transactions` | `{id, event_id, member_id, kind:'ticket'\|'guest_pass', tier, quantity, amount, shipping, total, currency, status:'pending'\|'completed'\|'canceled', payment:{provider, txn_id, raw_ref}, qr:{code, image_path}, points, sponsor_id, invited_by, referral:{sponsor_id, flag}, economics:{cost, profit, commissions:[6]}, guest_additional, created_at, completed_at}` — **consumed stock = arithmetic-on-read** (count over this collection), replacing the PHP "virtual stock" recompute |
| `gem_waiting_list` | `{event_id, member_id, created_at}` |
| `gem_follows` | `{member_id, kind:'event'\|'artist'\|'venue', target_id, created_at}` (unique compound index) |
| `gem_artists` | `{id, name, slug, photo, country, continent, genres:[...], rosters:{gem:bool, djmag_rank:int\|null, resident:bool}, bio(rich), socials{}, images[]}` |
| `gem_venues` | `{id, name, slug, type_id, logos:{on,off}, images[], country, state, city, address, socials{}, order, status}` + `gem_venue_types` |
| `gem_festivals` | `{id, title, slug, event_date, photo, logos:{on,off}, description(rich), socials{}, status}` |
| `gem_conferences` | same shape as festivals |
| `gem_clients` | `{id, image_on, mode:'link'\|'video'\|'gallery', url, video, details:[{title, photo}], publish, order}` |
| `gem_points_history` | `{member_id, action_id, description, points, url_reference, transaction_id, created_at}` (port of `system_points_actions_members_history` — shared vocabulary with the future My Account migration) |
| `gem_config` | secrets & knobs: `{key:'payments'}` (provider keys / per-event default account), `{key:'ecommissions'}` (the 6 level percentages), `{key:'content'}` (homepage blurbs, methodology, media videos, works gallery, travels entries) — NEVER in `settings` (D-2026-48) |

**Startup indexes:** `gem_events (type,status,event_date)`, `(slug unique)`; `gem_transactions (event_id,kind,status)`, `(member_id)`, `(payment.txn_id unique sparse)`; `gem_follows (member_id,kind,target_id unique)`; slugs unique on all catalogs.

**Member merge (D2):** ETL reads `members.password` (plaintext), writes `password_hash = bcrypt` into the new `members` doc, and drops the plaintext + all FB-login columns; `account_status:'active'`, sponsor chain (`id_sponsor`) and member type preserved. Existing passwords keep working; recovery is the standard forgot-password flow. No emails sent, no users notified.

**ETL (`scripts/gem2i_migrate.py`, on-box, idempotent):** MySQL → Mongo mapping from the tables the main site touches: `events, events_cost, events_prices, events_payment_accounts, events_guest_list_detail/benefit/benefit_additional, events_reward_points_eticket/guest_list, events_djs, events_music_genre, events_partners, events_sponsors, events_private_member_type, events_paypal_transactions, events_members_waiting_list, guest_list_range, djs, djs_music_genre, music_genre, venues, venues_type, festivals, festivals_djs, conferences, clients, clients_details, members_follow_events/djs/venues, system_ecommissions, system_points_actions(+_members_history), promoters_slide_homepage(+detail → hero_slides), contact_us, countries2/states/continents (→ CMS geo mapping)`.

### 4b. Schema verification (real DB dumped + inspected 2026-07-07 — supersedes code-read assumptions)

Backups of **all 17 databases** on the box (18.208.85.155) live in `C:\2026\Acapitalgroup.com\gem2i.com\__bases_de_datos\` (`*_20260707.sql.gz`, mysqldump `--no-tablespaces --single-trans

---

## 4b. Real schema (verified from the live DB backup, 2026-07-07)

**Backups taken:** all 17 databases on the gem2i box (`18.208.85.155`, Ubuntu 16.04, MySQL 5.7.33) dumped `--no-tablespaces --single-transaction --routines --triggers --events`, gzipped → `C:\2026\Acapitalgroup.com\gem2i.com\__bases_de_datos\` (all 17 gzip-verified; temp files + `.my.cnf` removed from the box). The box hosts **3 gem2i DBs** (`gem2ica_production` = LIVE main site, `gem2ica_development`, `gem2ica_training`) plus unrelated tenants (acapital*, admin_insights*, academy, magazine, and 4 near-empty `db_*_production`). **Main-site source of truth = `gem2ica_production` (155 tables, 18 MB).**

**Key row counts (live):** `events` 2021 (mostly past), `events_cost` 1666, `events_paypal_transactions` 179 (real ticket/guest history), `events_djs` 1761, `members` 1678, `members_membership` 90, `djs` 445, `venues` 765, `festivals` 290, `conferences` 32, `clients` 14, `music_genre` 211, `system_points_actions_members_history` 6328, `promoters_slide_homepage` 379, `contact_us` 159, `members_follow_events/djs/venues` 59/103/59, `guest_list_range` 5, `system_ecommissions` **6 levels** (confirms the 6-level split), `events_type` 4, `promoters` 23. `epass*`, `members_membership.membership_levels`, `commissions`, `mixers`, most `front_*` = 0 rows (dormant → clean-room can skip, like Varient's empty side tables).

**Schema reconciliations vs §3/§4 (column names now verified — adjust the build):**
- **`events`** is wide (~90 cols). Real ticket/guest structure lives in **child tables**, not embedded on the event row: `events_cost` (per-tier `cost_*` + `stock_*` + `stock_*_consumed` + `transaction_fee_percentage/fixed` — the 6 tiers = admission/guest_list/eprice/vip/gold/ultra/platinium... note DB has **admission,eprice,vip,gold,ultra,platinium** as paid tiers + guest_list stock), `events_prices` (dated man/woman price ladders — a pricing-calendar feature the current public pages don't fully surface; capture but confirm scope), `events_payment_accounts` (`id_currency`, `payment_gateway_provider`, `account`), `events_reward_points_eticket` / `events_reward_points_guest_list` (distinct point schemes), `events_guest_list_detail` / `events_guest_list_benefit` / `events_guest_list_benefit_additional` (all keyed `id_event`+`id_member_type`). My §4 `gem_events` embeds these — that's fine for the rebuild (one-read render), the ETL just fans the child tables into the sub-docs.
- **`events.id_event_type`** → `events_type` (4 rows). Values seen in code: 1=private, 2=eticket, 3=guest_list, 4=info. Confirm the exact `events_type.type` labels from the 4 rows at ETL.
- **`members`** has BOTH `password` (plaintext) AND `password_facebook`, plus `email_google`/`email_facebook`/`facebook_id` — confirms D2 (bcrypt + forced reset; drop FB login). Sponsor chain = `id_sponsor`; `estado` = active flag; `formal_name_id` + `formal_name_id_confirmation` drive the confirmation-gate (B7). Membership meta split into **`members_membership`** (90 rows: `id_member_type`, `corporate`, role flags) — the corporate flag is what shows the "Systems" link (excluded).
- **`member_type`** (5 rows) is the axis for guest-list benefits — small, ETL as-is.
- **`events_paypal_transactions`** is the real ledger for BOTH tickets and guest passes (100+ cols incl. `ecommissions_level_0..5`, `qr_code`, `guest_list_status`, `epass_status`, `assistance*` check-in fields, `id_sponsor`, `guest_list_invited_by`, reassign/ticket-bank machinery). §4 `gem_transactions` covers the live-path subset; the ETL should preserve the historical rows verbatim in an archive shape even where the rebuild doesn't reissue those flows.
- **`djs`** (445, very wide: 3 roster listorders `listorder_djmag`/`listorder_gem2i`/`listorder_residentadvisor` → confirms the 3 rosters; the resident roster is "residentadvisor" internally; many slide/social/gallery cols) → `gem_artists`. Genres via `djs_music_genre` ↔ `music_genre`.
- **`venues`** (765) + `venues_type` (31); `festivals` (290) + `festivals_djs`; `conferences` (32) — all map cleanly to §4.
- **`clients`** `video_or_gallery_photos` mode flag (1=video,2=gallery,else link) + `clients_details` → `gem_clients` as specced.
- **Geo:** the DB carries its OWN `countries2` (250), `states` (1256), `continents` (7), plus a partial `countries`(235)/`cities`(59k) set and `*_backup` tables. ETL maps `countries2`/`states`/`continents` → CMS geo with an id-crosswalk (do NOT trust the `_backup`/`_migracion` tables).
- **Slides:** `promoters_slide_homepage` (379, full X/Y caption coords per element) + `promoter_slide_homepage_detail` (page1..page5 placement flags + date windows per promoter) → gem2i-promoter rows become `hero_slides` positioned mode; the page flags map to which section (home/artists/events…) a slide shows on.
- **Points/commissions vocabulary:** `system_points_actions` (16 action types), `system_points_actions_members_history` (6328), `system_ecommissions` (6), `system_referral_actions*`, `system_ebonus_actions` — port the action catalog + history (feeds the future My Account reports; shared identities per D-2026-53).

**ETL target list is now concrete** (§4 script) — column names above are authoritative. Recommend regenerating one clean readable schema-only dump into `reference/` (schema, NO data/secrets) at claim time for the builder.

---

## 5. API endpoints (FastAPI — `backend/routes/gem_*.py` on the gem2i brand backend)

| Area | Endpoints |
|---|---|
| Public catalogs | `GET /api/public/gem/events` (`?scope=current\|past&date&country&state&q`), `GET .../events/{slug}`, `GET .../festivals[+/{slug}]`, `GET .../conferences[+/{slug}]`, `GET .../artists` (`?roster=gem\|djmag\|resident&continent&country&genre&page`), `GET .../artists/{slug}`, `GET .../venues` (`?continent&country&state`), `GET .../venues/{slug}` (incl. upcoming events), `GET .../clients`, `GET .../gem-content` (homepage/static-page content) |
| Autocomplete | reuse CMS geo endpoints; `GET /api/public/gem/genres`, `GET .../artist-names` |
| Member actions (member JWT) | `POST /api/member/gem/follow` `{kind,target_id,flag}`, `POST .../guest-list` (benefit+stock checks → pass + QR + email), `DELETE .../guest-list/{event_id}` (cancel), `POST .../waiting-list` + `DELETE`, `POST .../checkout` (tier/qty/stock validation → provider session or external URL), `GET .../my-event-status/{event_id}` (follow/pass/waiting flags for the detail page) |
| Payments | webhook per §9 D3: `POST /api/public/gem/payment-webhook` (provider-verified — fixes the disabled-IPN hole) → complete transaction, QR ticket, email, points + commissions writes |
| Contact | reuse CMS `POST /api/contact` (rate-limit + captcha via `public_form_guard`) |
| Admin (require_admin, grantable CMS sections) | full CRUD: `/api/admin/gem/events` (incl. tiers/benefits/points/payment sub-editors), `/artists`, `/venues`, `/festivals`, `/conferences`, `/clients`, `/gem-content`; `GET /api/admin/gem/transactions` (list/search, manual complete/cancel); `GET /api/admin/gem/waiting-list/{event_id}` |
| Health | `GET /api/health` (deploy script) |

No WebSockets, no new scheduler loops (QR + email happen in-request or as BackgroundTasks). All member routes read identity from JWT — never from a client-posted `id_membership` (the PHP AJAX trusts POSTed membership ids; fixed by construction).

---

## 6. Frontend components (React 19, theme `gem2i`)

```
pages/
  HomePage.js                → theme==='gem2i' branch: Gem2iHome (hero canvas slides reused)
  gem2i/ EventsPage, EventDetail, FestivalsPage, FestivalDetail, ConferenceDetail,
         ArtistsPage (3 roster tabs + filters), ArtistDetail,
         VenuesPage (continent tabs + logo wall), VenueDetail,
         TravelsPage, MediaPage, WorksPage, PartnersPage   (CMS-content driven)
  admin/ GemEventsManager (tiers/benefits/points/payment editors),
         GemArtistsManager, GemVenuesManager, GemFestivalsManager,
         GemConferencesManager, GemClientsManager, GemContentManager,
         GemTransactionsManager
components/gem2i/
  Gem2iLayout (header, side menu panel, contact side panel, footer, cookie notice)
  EventCard / TypeBadge (E-TICKET / GUEST LIST / INFO)
  GuestListWidget (benefits, stock, waiting list states)
  TicketPurchaseWidget (tier picker, qty, stock, checkout)
  FollowButton, LineupStrip, CatalogFilters (continent/country/genre), QrPassView
```

- Styling: the existing `website` color group (`--color-*`) drives the theme; gem2i seeds a dark entertainment palette. No new var group needed unless the theme demands it.
- `useT()` / `LocalizedField` EN/ES from day one (§9 D6).
- Rich text: existing CMS conventions (`normalizeRichText` + `dangerouslySetInnerHTML`).
- Login modal = existing member auth (`memberAuth.js`), reused.
- Design skills mandatory; the old site's look (dark, side panels, big imagery) is the visual spec, not the CSS (we own it, but Bootstrap-3 markup is not worth porting).

---

## 7. Development phases

Yardstick: KMS full parity ≈ 17–22 sessions; this is smaller (no rich-text CMS engine, no multi-theme). **Estimate ~12–15 sessions.**

### Phase 0 — Decisions, schema, skeleton (1 session)
Anthony answers §9 · dump `gem2ica_production` schema + row counts (source of truth for §4) · stand up the gem2i brand instance per D5 (DB `gem2i_cms`, dev vhost, deploy script clone with standard exclusions) · theme `gem2i` registered · rotate the exposed credentials (§8 first row) — independent of the migration but found during it.
**Exit test:** dev URL serves the CMS shell with theme gem2i active; `GET /api/health` 200; schema dump committed to reference notes (never credentials).

### Phase 1 — Public shell + homepage + content pages (2 sessions)
Gem2iLayout (header/panels/footer/cookies/login modal) · homepage sections (hero slides ETL'd into `hero_slides` positioned mode; blurbs/services/methodology from `gem_config content`; clients carousel; festivals+conferences carousels stubbed on Phase-2 data) · About/Services/Privacy/Terms/Travels/Media/Works/Partners as CMS-managed pages · contact panel → CMS contact pipeline.
**Exit test:** homepage side-by-side parity vs live gem2i.com (desktop+mobile); contact e2e lands in CMS + admin email.

### Phase 2 — Catalogs (2–3 sessions)
ETL: artists/venues/festivals/conferences/events (+geo mapping) · listings with all filters (continent tabs, autocompletes, pagination, card/list toggle, current/past) · detail pages (minus purchase widgets) · follow buttons · admin CRUD for the four catalogs + clients.
**Exit test:** counts match MySQL; spot-check 10 entities side-by-side vs live; filter/search parity; admin round-trip (create→public→edit→delete) on each catalog.

### Phase 3 — Membership integration (1 session)
Member merge per D2 (**silent bcrypt of existing plaintext → hash at ETL, no emails**) · login modal against `/api/member/login` (migrated passwords work unchanged) · self-service forgot-password wired to the CMS reset flow · gating map (public listings vs gated pages/details) · formal-name-confirmation gate (B7) · `member_logins` source=`gem2i`.
**Exit test:** a migrated member logs in with their ORIGINAL password (no reset needed); forgot-password issues a working reset; deactivated member 403; gated pages redirect to login modal exactly like live.

### Phase 4 — Guest list + waiting list + QR passes (2 sessions)
Benefits engine (member-type free-until/additional ranges) · stock arithmetic-on-read · pass issue/cancel · QR generation (python `qrcode` → brand uploads, no FTP) · pass email via CMS SMTP · waiting list join/leave · admin transactions view.
**Exit test:** e2e on dev with a test event: pass issued w/ QR + email, stock decrements, full→waiting list, cancel restores stock; ETL'd historical passes visible in admin.

### Phase 5 — E-ticketing + payments + economics (2–3 sessions)
Tier purchase widget · checkout per D3 · webhook (verified) → Completed → QR ticket + email · external-ticket-system passthrough · points writes (purchase, share-referral) + 6-level commissions computation onto the transaction · share URLs with member attribution.
**Exit test:** sandbox purchase e2e (pending→webhook→completed→QR+email); stock enforcement; commissions/points rows match a hand-computed case; a replayed/forged webhook is rejected.

### Phase 6 — Admin completeness + polish pass (1–2 sessions)
Event editor sub-forms (tiers/benefits/points/payment) hardened · transactions manager (search, manual ops) · impeccable/design audit of the public theme · i18n sweep.
**Exit test:** an operator can stand up a brand-new e-ticket event end-to-end from the CMS alone; design skills audit clean.

### Phase 7 — Walk-through gate + cutover (1 session + waiting)
Anthony/operator walk-through on dev (each observation = one small fix-commit, KMS cadence) · delta ETL (fresh dump right before flip) · DNS/vhost cutover gem2i.com → new box · old PHP kept frozen as rollback · legacy server decommission decision.
**Exit test:** live domain serves the new stack; login + one real guest-list flow verified in production; rollback path documented.

---

## 8. Risks & gotchas

| Risk | Mitigation |
|---|---|
| **Exposed live credentials in the PHP source** (SES SMTP keypair in `mail.php`, MySQL password in `includes/conexion.php`, Facebook app secret in `fblogin.php`, reCAPTCHA secret in `contacts_ok.php`) | **Rotate all four at Phase 0** regardless of migration timing; never copy them into repo/plan/memory (house rule) |
| **Plaintext member passwords** in `members` | D2: ETL bcrypt-hashes the plaintext into the new store (never stores/logs the plaintext); passwords keep working, NO forced reset, NO email blast; recovery via self-service forgot-password |
| PayPal **IPN validation commented out** in production | rebuild uses provider-verified webhooks only (D3); exit test includes forged-webhook rejection |
| SQL injection throughout (string-interpolated queries, incl. search) | gone by construction (Motor + Pydantic); don't port any query text verbatim |
| AJAX endpoints trust client-posted `id_membership` | all member actions read identity from JWT only |
| Facebook SDK v2.10 / share-for-points depends on dead API | B5 replaces with generic share + attribution URL; FB plugin → Tier C |
| Guest-list "virtual stock" double-write race in PHP | consumed = arithmetic-on-read; issue inside a conditional insert (atomic pattern, D-2026-48 spirit) |
| `countries2`/`states`/`continents` ids differ from CMS geo | ETL builds an id-mapping table; autocompletes hit CMS geo |
| Stale/legacy data (most events past; travels/media/works hardcoded) | ETL everything but review with Anthony what stays visible; hardcoded pages become CMS content, entered once |
| Old tree full of near-duplicates (`_OLD`, `2017/`, backups) | spec was read from the live-referenced files only; ignore the rest |
| Server build OOM on 1.9 GiB boxes | build locally + atomic swap (established convention) |
| PS 5.1 deploy quirks / stamp conventions | clone an existing brand deploy script; keep UTF-8 BOM; standard exclusion list incl. `^reference/`, `^work-plans-MD/` |
| Where gem2i.com is hosted today is unverified (likely a legacy box) | Phase 0 confirms hosting + DNS control before promising a cutover date |

---

## 9. DECISIONS — ANSWERED (Anthony, 2026-07-07 → D-2026-58)

1. **D1 — Placement:** ⏳ **DEFERRED to build time** — "determined when we develop and implement the schedule." Standing recommendation carried into that decision: **4th AUX brand instance** (own DB `gem2i_cms`, theme `gem2i` + `gem_*` module in the unified codebase; members/QR/SMTP/hero/pages already exist). No blocker — Phase 0 can begin; the skeleton is identical for a few sessions either way, and placement is confirmed before the first brand-specific wiring.
2. **D2 — Member merge:** ✅ **Silent bcrypt at migration, NO emails / NO user notification.** The ETL reads each `members.password` (stored plaintext) and writes a **bcrypt hash** (`hash_password()`, `models/database.py`) into the new `members` doc — so **every existing password keeps working on first login, with zero disruption and no announcement**. Sponsor chains (`id_sponsor`) + member types preserved; `account_status:'active'`. Recovery = a standard **self-service "forgot password"** page (existing CMS reset flow: `/api/auth/forgot-password` → tokened reset email on demand). No forced reset, no bulk email. Plaintext is never carried into the new store or logged.
3. **D3 — Payments:** ✅ **Stripe via the CMS's existing managed keys.** One payment stack platform-wide; provider-verified webhooks (also closes the disabled-IPN hole). PayPal flow retired.
4. **D4 — Scope gate:** ✅ **Full Tier A + B before cutover** (house full-parity doctrine). Catalogs, guest lists, full e-ticketing, Stripe payments, points + 6-level commissions all working before the domain flips.
5. **D5 — Hosting:** ⏳ **No preference stated → proceed with the recommended default: new dedicated box** for the gem2i brand (one-instance-per-brand doctrine), confirmed alongside D1 at build time. Dev can start on a temporary vhost; nothing blocks Phase 0.
6. **D6 — Language:** ✅ **EN/ES from day one** — all content wrapped in `useT()`/`LocalizedField` (the source DB even carries a `languages` table with 2 rows).
7. **D7 — Legacy visibility:** ✅ **Hide old past events from the public site.** ETL migrates ALL history (admin sees every event + transaction); the public site surfaces current/recent only (parity with the live `end_time>now()` filtering, applied brand-wide so the 2017-era backlog stays out of the public UI).
8. **D8 — Branding:** ✅ **Keep gem2i.com as-is** — pure technology migration, same name/domain/identity. No rebrand.

**Net effect on the build:** only D1 + D5 remain as build-time confirmations (placement + physical box), and both have a clear default that doesn't block any early phase. Everything that shapes code — auth/password handling, payments, scope, i18n, data visibility, branding — is locked. **The plan is complete and buildable.**

---

*Plan generated 2026-07-07 (session 36) from full source analysis of the OWNED PHP codebase + live-site verification + real-schema check against the DB backup (§4b). All §9 decisions recorded same day (D-2026-58). No code written per Anthony's directive; FINISH will commit this tracker.*
