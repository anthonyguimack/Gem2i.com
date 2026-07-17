# GEM2i — Legacy → Mongo mapping (Phase 2 catalogs)

> Verified against a full restore of `gem2ica_production_20260707.sql.gz` into a local
> MariaDB 10.4 (`gem2i_etl_src`) on 2026-07-17. Column names + enum values below are
> **observed from real rows**, not code-read guesses. No secrets or data live in this file.
>
> Scope of this doc = the Phase-2 catalogs only: **artists, venues, festivals, conferences,
> clients, events (catalog subset), follows, geo**. Purchase/tier/economics/guest-list/QR
> tables (`events_cost`, `events_paypal_transactions`, benefits, points, commissions) are
> Phase 4/5 — **not** mapped here.

---

## 0. Enum / status conventions (observed)

| Field | Values seen | Meaning | Public rule |
|---|---|---|---|
| `*.status` char(1) | `A` / `I` / `D` / `''` | Active / Inactive / Deleted / unset | public listing = **`A` only**; ETL migrates all, sets `status: active\|inactive\|deleted` (unset→`inactive`) |
| `events_type.id_event_type` | 1,2,3,4 | **1=E-Pass, 2=E-Tickets, 3=Guest List, 4=Info** | (plan's "1=private" was wrong — there is no "private" type) |
| `events.private` char(1) | `Y` / `N` | private event (hidden from public listing) | public = `private='N'` |
| `events.gem2i_show_portal` varchar(3) | `Yes` / `No` / `''` | show on the gem2i portal | public = `Yes` |
| `djs.gem2i_client` varchar(3) | `YES`(2) / `NO`(289) / `''`(310) | GEM2i-**managed** client flag (≠ roster) | stored as `gem2i_client:bool`, informational |
| `clients.video_or_gallery_photos` char(1) | `1` / `2` / `''` | **1=video, 2=gallery, else link** | mode selector |

### Artist rosters (authoritative — from `djs_mag_db.php`, `djs_resident_db.php`, `artists.php`)
Each roster is the **top-100 ranked** by its own `listorder_*` column (rank 1 = highest).
Rows outside 1–100 are not in that roster.

| Roster | Predicate | Count (active) |
|---|---|---|
| GEM     | `status='A' AND listorder_gem2i          BETWEEN 1 AND 100` → `rosters.gem_rank`      | 100 |
| DJ Mag  | `status='A' AND listorder_djmag          BETWEEN 1 AND 100` → `rosters.djmag_rank`    | 100 |
| Resident| `status='A' AND listorder_residentadvisor BETWEEN 1 AND 100` → `rosters.resident_rank`| 100 |

Roster **membership** at query time = the corresponding rank is not null; roster **order** = rank asc.

---

## 1. Row counts (source of truth for Phase-2 exit test)

| Legacy table | Rows | Active (`status='A'`) | → Mongo collection |
|---|---|---|---|
| `djs`          | 601  | 511 | `gem_artists` |
| `venues`       | 901  | 327 | `gem_venues` |
| `venues_type`  | 38   | (A/D) | `gem_venue_types` |
| `festivals`    | 422  | 188 | `gem_festivals` |
| `conferences`  | 32   | 28  | `gem_conferences` |
| `clients`      | 15   | (publish) | `gem_clients` |
| `events`       | 2132 | ~90 active | `gem_events` (catalog subset) |
| `music_genre`  | 213  | — | (embedded as genre name arrays) |
| `members_follow_events/djs/venues` | 75/125/80 | — | `gem_follows` |
| `countries2` / `states` / `continents` | 251 / 1262 / 7 | — | geo denormalize + crosswalk |

> Public listings will show far fewer than the totals (D7: current/recent + `status='A'` only).
> The counts admin must see = the totals above.

---

## 2. Field maps

### 2.1 `djs` → `gem_artists`
| Mongo field | Legacy source | Notes |
|---|---|---|
| `legacy_id` | `id_dj` | idempotent upsert key |
| `id` | uuid5(ns,"gem_artists:{id_dj}") | stable across re-runs |
| `name` | `dj` | short/display name (used in listings + autocomplete) |
| `full_name` | `full_name` | |
| `slug` | slugify(`dj` or `full_name`) | dedupe: append `-{id_dj}` on collision |
| `bio` (rich) | `biography` | `normalizeRichText` on render |
| `summary` | `summary` | |
| `country` / `state` / `city` | join `countries2.country` / `states.state` / free-text `city` | + keep `legacy_country_id`,`legacy_state_id` |
| `continent` | `countries2.id_continent` → `continents.continent` | drives continent tabs |
| `genres` [str] | `djs_music_genre` → `music_genre.music` | names, not ids |
| `rosters` | `{gem_rank, djmag_rank, resident_rank}` | each = listorder if 1..100 else null (see §0) |
| `gem2i_client` bool | `gem2i_client='YES'` | managed-client flag |
| `images` | `{small:image, big:image_big, detail:image_detail, logo:logo, logo_off:logo_off, favicon:favicon_img}` | filenames only — see §3 asset map |
| `socials` | `{facebook,twitter,youtube,instagram,soundcloud,mixcloud,itunes,pinterest,website,...}` | drop empty |
| `video` | `video` | |
| `status` | `status` → active/inactive/deleted | |

### 2.2 `venues` → `gem_venues` (+ `venues_type` → `gem_venue_types`)
| Mongo field | Legacy | Notes |
|---|---|---|
| `legacy_id` | `id_venue` | |
| `name` | `venue` | |
| `slug` | slugify(`venue`) + dedupe | |
| `type` | `id_venue_type` → `venues_type.type` | + `gem_venue_types` collection (legacy_id,name,status) |
| `description`/`summary` | `description`/`summary` | rich |
| `address` / `country` / `state` / `city` / `zip` | `address`/geo joins/`city`/`zip_code` | + legacy geo ids |
| `continent` | via `countries2.id_continent` | continent tabs |
| `genres` [str] | `venues_music_genre` → `music_genre.music` | |
| `capacity` | `capacity` | |
| `images` | `{logo, logo_off, view:venue_view, facebook_logo:logo_facebook}` | asset §3 |
| `socials` | `{website,facebook,twitter,youtube}` | |
| `map` | `map` | embed |
| `featured` bool | `featured='A'`/`mejor` | homepage/wall highlight |
| `order` | `listorder_venue` | |
| `status` | `status` | |

### 2.3 `festivals` → `gem_festivals`
| Mongo | Legacy | Notes |
|---|---|---|
| `legacy_id`/`title` | `id_festival`/`title` | |
| `slug` | slugify(`title`) + dedupe | |
| `event_date`/`range_dates`/`open_time`/`end_time` | same | |
| `description`/`artists_schedule` | rich | |
| `address`/`country`/`state`/`city`/`continent` | geo joins | |
| `images` | `{flyer:image, view:festival_view, generic:generic_image, logo, logo_off}` | base `images_festivals/images` + `images_festivals/logos` |
| `socials` | `{facebook,twitter,instagram,youtube,soundcloud,mixcloud,website}` | |
| `lineup` [artist legacy_id] | `festivals_djs` (id_festival→id_dj) | resolve to `gem_artists` refs at load |
| `video`/`map` | same | |
| `status` | `status` | |

### 2.4 `conferences` → `gem_conferences`
Same shape as festivals; source `conferences` (`id_conference`,`title`,`event_date`,`range_dates`,
`description`,`conferences_schedule`,`address`,geo,`video`,`website`,`logo`,`logo_off`,`image`,`status`).
Base `images_conferences/`. No lineup join table (no `conferences_djs`).

### 2.5 `clients` (+ `clients_details`) → `gem_clients`
| Mongo | Legacy | Notes |
|---|---|---|
| `legacy_id`/`title`/`url`/`description` | `id_clients`/`title`/`url`/`description` | |
| `mode` | `video_or_gallery_photos`: `1`→video, `2`→gallery, else→link | |
| `image_on`/`image_off` | same | base `images_clients_home/` |
| `video` | `clients_video` | |
| `gallery` [{title,photo}] | `clients_details` (title_detail, photo_detail) | when mode=gallery |
| `publish` bool | `publish` | confirm value semantics at load (1 vs 2) |
| `order` | (none — use legacy_id) | |

### 2.6 `events` → `gem_events` (**catalog subset only**)
Phase 2 needs the event to **appear in listings + render a detail page minus purchase widgets.**
Map the descriptive columns now; leave tiers/benefits/points/payment sub-docs for Phase 4/5.

| Mongo | Legacy | Notes |
|---|---|---|
| `legacy_id`/`title` | `id_event`/`event` | title col = `event` |
| `slug` | slugify(`event`) + `-{id_event}` (titles repeat across years) | |
| `type` | `id_event_type`: 1→epass, 2→eticket, 3→guest_list, 4→info | |
| `description`/`summary`/`concept`/`artists_schedule` | rich | |
| `image`/`logo` | `image`/`logo` | base `events_images/`, `events_logo/` |
| `venue_id` | `id_venue` → `gem_venues` ref | |
| `lineup` [artist ref] | `events_djs` (id_event→id_dj) | |
| `event_date`/`open_time`/`end_time` | same | listing current/past split |
| `socials` | `{facebook,twitter,youtube,instagram,soundcloud,mixcloud,...}` | |
| `external_ticket_system` | same | passthrough URL (Phase 5 uses it) |
| `private` bool / `show_portal` bool | `private='Y'` / `gem2i_show_portal='Yes'` | public gate |
| `share_enabled` | `event_share` | |
| `status` | `status` | |
| `legacy_promoter_id` | `id_promoter` | gem2i is the flagship promoter; keep for reference |
| _(deferred)_ | `events_cost`,`events_prices`,`events_payment_accounts`,`events_reward_points_*`,`events_guest_list_*` | **Phase 4/5** |

### 2.7 follows → `gem_follows`
`members_follow_{events,djs,venues}` → `{member_legacy_id: id_membership, kind: 'event'|'artist'|'venue',
target_legacy_id, created_at: date_create}`. Member resolution to the new `members._id`/`id` happens
against the Phase-3 member-merge crosswalk; until then store `member_legacy_id` and resolve at load
if the member exists, else keep pending. Unique compound index `(member_id, kind, target_id)`.

### 2.8 geo crosswalk
Legacy `countries2`/`states`/`continents` carry their **own ids** distinct from CMS geo
(`countries`/`states`/`cities` 249/5046/32423). Phase-2 approach: **denormalize names**
(`country`,`state`,`continent` strings) onto every catalog doc so filters work immediately,
**and** keep `legacy_country_id`/`legacy_state_id`. A precise CMS-geo id crosswalk (by name match)
is a refinement for when listings need to hit the shared CMS geo autocomplete endpoints.
Continent tab order = `continents.order_continent` (Antarctica id=3 is excluded in the legacy UI).

---

## 3. Asset (image) migration — separate sub-step

Legacy stores **filenames**, not paths. Files live in these folders (legacy box / local mirror
at `C:\2026\Acapitalgroup.com\gem2i.com\`):

| Entity | Folder(s) | Column(s) |
|---|---|---|
| Artists | `djs_images/big/`, `djs_images/detail/`, `djs_images/` | image_big, image_detail, image, logo |
| Venues  | `venues_view/`, `venues_logos/` (may need pull from legacy box) | venue_view, logo, logo_off |
| Festivals | `images_festivals/images/`, `images_festivals/logos/` | image, logo, logo_off |
| Conferences | `images_conferences/` | image, logo |
| Clients | `images_clients_home/` | image_on, image_off |
| Events | `events_images/`, `events_logo/` | image, logo |

**Plan:** rsync/scp these folders → the box's uploads dir under a `gem2i/legacy/<entity>/` prefix,
then the API serves them via the existing uploads route. The ETL stores **filenames only**; final
URL = `<uploads_base>/gem2i/legacy/<entity>/<file>`. Missing files fall back to the theme's default
art (legacy used `assets/imgs_default/*`). This copy is not blocked by the data ETL and can run in
parallel.

---

## 4. ETL mechanism (two-stage)

1. **Stage 1 — transform (local, this machine, where the dump lives):**
   `scripts/gem2i_etl_catalogs.py` reads MariaDB `gem2i_etl_src` (restored dump) and writes one
   newline-delimited JSON file per collection into `reference/local-only/etl_out/` (gitignored).
   Deterministic `id = uuid5(GEM2I_NS, "<collection>:<legacy_id>")` so re-runs are stable.
2. **Stage 2 — load (on box, where Mongo lives):**
   `scripts/gem2i_load_catalogs.py` reads the JSON, **upserts by `legacy_id`** into `gem2i_cms`,
   and ensures indexes. Idempotent; safe to re-run. Runs with `backend/venv/bin/python`.

Rationale: the MySQL dump is on Windows; box Mongo is localhost-only. Two stages keep the messy
transform where the data is, keep the box write a simple reviewable import, and make the JSON
inspectable before it touches Mongo. Both stages are idempotent.

**Restore command (local):**
`/c/xampp/mysql/bin/mysql.exe -u root gem2i_etl_src < gem2ica_production.sql`
(dump lives in `__bases_de_datos/gem2ica_production_20260707.sql.gz`, gunzip first).
