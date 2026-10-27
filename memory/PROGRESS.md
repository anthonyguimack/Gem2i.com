# PROGRESS.md — gem2i deployment history

---

## 2026-10-27 (session 15) — Event microsites (legacy "Domain or Subdomain") built locally (NOT DEPLOYED)
- **Legacy box work (100.59.20.123, backups `/home/ubuntu/backup_*`):** test events activated on the microsite domains (dates moved), event 2071 `stock_guest_list=100`.
- **Plan + bocetos:** `work-plans-MD/GEM2I_EVENT_MICROSITES_PLAN.md` (§7 rulings, §8 chosen MG-B, PROMO-A, BUY-B, DETAILS-A, LINEUP-A, ACCOUNT-B, APPLY-A); bocetos `gem2i-microsite-{guest,eticket,account}.html`.
- **Backend:** `routes/gem_microsite.py` — `GET /api/public/gem/microsite?host=` (guest host = promoter.url → next guest-list event; e-ticket host = next event by `domain`; brand = promoter), `POST .../apply` (member PENDING: no role_member, account_status pending, url_reference host, cluster event, sponsor ?GEM=), `POST .../verify` (token → active), `GET /api/member/gem/microsite/account` (purchased/history/guest lists/bank). Catalog `promoters` → `gem_promoters` (+ CMS section), hosts normalized on save, `_public_event_or_404` accepts events with a `domain` even off-portal.
- **Frontend:** `lib/microsite.js` (non-portal host or `?microsite=<host>` preview), `pages/microsite/MicrositeApp.js` (Norules b/g/w light/dark, promoter brand, LoginModal), API/BACKEND_URL same-origin on microsite hosts. CMS: Promoters manager; Events fields show_portal_es, domain, microsite.layout, promoter picker.
- **ETL (written, not run):** `scripts/gem2i_etl_microsites.py transform|load`.
- **Verified:** py_compile, server import lists 4 routes, `yarn build` OK. **Not verified:** browser (no local event with a domain).
- **Blocked (DNS):** `guestgem2i/eticketgem2i.exclusivesession.com` → 100.59.20.123 (legacy, live); `*.gem2i.com` → 18.208.85.155 (not beta). Need a ruling: move the exclusivesession records to 34.198.159.54 or use e.g. `guest.beta.gem2i.com`. Then nginx `/api` proxy + certbot, data on beta events, deploy.
- **Open:** My Account actions (reassign, cancel, guest manage, bank use), slides/invite CMS editors.

---

## 2026-10-26 (session 14) — Gem2i (gem2i_02) inner pages: own design for every page, links, demo content (DEPLOYED)
- **Links (Norules + Gem2i):** home map tabs (Norules) and footer offices (both) → `/map/:slug` (`officeSlug` in the template DetailBits); guest-list widget gets an opt-in `passTo` → "View my pass" → `/tickets/success?pass=<event slug>` (pass mode added to Norules and Gem2i ticket-success pages; shared widget unchanged for templates that do not pass it).
- **Gem2i got the 8 pages it lacked** (copies with the same features): `/conferences`, `/travels/:slug`, `/works`, `/gallery`, `/media`, `/map/:slug`, `/terms`, `/privacy` in `pages/gem2i/g02/Gem2iExtraPages.js` + `components/gem2i/g02/` (own copies of DetailBits/CatalogCards/Btn — never import Norules). Routes in App.js only when `active_theme==='gem2i_02'`. Gem2i entry links added: travels "View trip", festivals "All conferences".
- **Gem2i redesign, page by page from bocetos** (`work-plans-MD/bocetos/gem2i-*.html`, every boceto = full page, with/without CMS hero): Events EV-A, Event detail ED-A, Festivals FE-A, Festival/Conference detail FD-A, Conferences CO-A, Artists AR-B, Artist detail AD-B, Venues VE-A, Venue detail VD-A (upcoming before map), About AB-A, Services SE-C, Works WO-A, Partners PA-A, Travels TR-A, Travel detail TD-A, Gallery GA-B, Media ME-C, Office OF-C, Legal LE-C (Terms/Privacy accordion), Ticket success TS-A, CMS page CP-A (`pages/gem2i/g02/Gem2iCmsPages.js`, routes `/page/:pageId` + `*`), 404 NF-C, `/checkout/success` MS-A (that route is the CMS-service Stripe return; the paid MEMBERSHIP returns to /my-account/membership), and the 3 fork pages Reading List / Service detail / Album (`g02/Gem2iForkPages.js`).
- **Hero-aware pages:** `PageHero` (Gem2i `components/gem2i/GemCatalogCards.js`) now takes `onShown(bool)`; pages grow the title / show the opener block (e.g. Events "Next event" band) only when no slide is assigned in Hero → Page Assignment.
- **Backend:** `gem_catalogs.public_artist_detail` adds a venue summary to each upcoming night.
- **Beta demo data:** Media page = 10 YouTube videos (official channels) + 4 press rows with fictional outlets (`scripts/gem2i_seed_demo_media.js`, seed `gem2i_demo_media_2026-10-26`); an upcoming guest-list event "Carl Cox Invites" 2026-12-12 (`scripts/gem2i_seed_demo_guestlist_event.js`, seed `gem2i_demo_guestlist_2026-10-26`) + a test pass for the admin account (made while testing).
- **Verified:** every deploy health 200; all Gem2i pages load their main block with `?template=02`, no horizontal overflow at 1440 px. **Not verified:** screenshots (pane rendering), Partners/Travels/Travel detail logged in, pass card logged in, real payments.
- **Open:** home map (Gem2i) → office links; real Terms/Privacy texts; services descriptions/photos, works client/year/KPIs; fork demo rows (books, services); enrollment legal texts are A Capital's; how users join the platform (login stays the modal); `active_theme` on beta is Norules.

---

## 2026-10-23 (session 13, part 2) — Norules: detail pages, missing pages, B1 buttons, hero pill+sweep, QA pass (DEPLOYED)
- **Detail pages** (boceto `norules-detail-pages.html`): Event (sticky poster, date/venue block, legacy Tickets/Guest-list widgets, line-up A1 cards, venue + map, more at venue), Artist (B/W hero, ranks, bio+video, upcoming events, similar artists), Venue (photo hero + logo, facts strip, E3 rows, map), Festival/Conference (hero + countdown, line-up poster ⇄ cards, day-tab schedule, flyer, set times). Shared bits: `components/gem2i/norules/NorulesDetailBits.js`. Backend: artist detail returns `upcoming_events`; checkout-status returns an `event` summary.
- **New Norules-only pages** (boceto `norules-missing-pages.html`, `pages/gem2i/norules/NorulesExtraPages.js`, routes in App.js only when `active_theme==='gem2i'`): `/conferences` (card+list, filters; backend filters + `/conferences-meta`, places/dates for conferences), `/travels/:slug` (T2: packages, itinerary, includes, spots, countdown; "Request my spot" → /#contact, no Stripe yet), `/works`, `/gallery`, `/media` (new Section Manager `gem_media`, `gem_press`), `/map/:slug` office, `/terms` `/privacy` (TOC; texts still the fork's "Legacy Consulting" → write real ones).
- **Yellow pages** (boceto `norules-yellow-pages.html`): Services S1 (grid + side panel, works grid), Partners P1 (hairline logo wall), Ticket success (confirmed / guest-list / processing states).
- **CMS fields**: travels slug, departure_date/from, packages ("Name | Price | Includes" per line), itinerary ("Day | Text"), gallery 1-3, points; works category/client/year/description/kpis/featured.
- **Beta demo**: 3 trips (Ultra, EDC, Oasis) + T2 fields on Tomorrowland (`scripts/gem2i_seed_demo_travels.js`, seed `gem2i_demo_travels_2026-10-23`, backup `/opt/_port_backups/travels_before_demo_20261023223437.json`).
- **Look fixes**: `usePageTone()` on every Norules page (light palette readable); inner-page hero = home hero; logos = legacy white disc (`LogoDisc`, samples the logo background); social links as icons (`.nsoc`); video with cover + "Watch on YouTube" (owner-blocked embeds); DB fields shown (event/venue summary, venue genres, festival flyer + set times).
- **Buttons (boceto `norules-buttons-links.html`)**: B1 pill-with-arrow everywhere via `components/gem2i/norules/NBtn.js` (`NBtn`, `NBtnLook`, `NLink`; CSS `.nb*`, `.nl`, `.nb-follow` in index.css). Hero CTAs = pill + sweep in a Norules-only hero copy `NorulesHeroU.js` (GemHeroVariants only gained `export`s; Gem2i hero unchanged). Dark bands marked `gem-tone-dark` so the palette's dark link colour doesn't hit them.
- **QA (memory: verify-in-browser-before-delivering)**: automated contrast scan of 18 pages + logged-in Travels/trip/Partners in Chrome → no low-contrast text left; mobile 375 px without horizontal scroll.
- **Open**: travel booking/Stripe; guest-list pass page not linked; office pages not linked from home/footer; real Terms/Privacy texts; Media content; "asasas" test slide kept on purpose (Anthony).

---

## 2026-10-23 (session 13) — Norules inner pages redesigned from bocetos: About AB1, Festivals F4, Events E1/E3, Artists A1, Venues V1, Travels T0 (DEPLOYED)
- **Bocetos** (`work-plans-MD/bocetos/`, each with real beta fields/search/hover documented at the top): `norules-about-page.html` (AB1/AB2/AB3), `norules-festivals-hover.html` (F1/FH1/FH2/**F4**), `norules-events-page.html` (E1/E2/E3), `norules-artists-page.html` (A1/A2/A3), `norules-venues-page.html` (V1/V2/V3), `norules-travels-page.html` (**T0** rows, T1 list, **T2** trip page), `norules-services-page.html` (S1/S2). Shared look in `norules-kit.css/js` (also inlined into each file so they open in any viewer).
- **About AB1 Manifesto** (`NorulesAbout.js`): 1st story paragraph = giant manifesto lit word by word on scroll (last 3 words italic accent); rest of story + photo in "Our story"; stats count up (years stay fixed); offices list with live local time (zone matched from the office name, `ZONES`); dark CTA band. Page sections order still from CMS.
- **Festivals F4:** 3-col equal 4:5 cards with the legacy hover; Conferences = 4-col grid with the same card (no horizontal scroll) + "Load more conferences" (8 per step).
- **Events:** E1 posters with a date stamp hidden when the veil comes in; guest-list CTA "Join guest list"; **List view = E3** (thumb, big date, type, title, place, button; the veil crosses the whole row, `.evrow`).
- **Artists A1:** polished ranking column (readable names, underlined active tab), 3-col grid. **Venues V1:** Top venues = 4-col grid (no scroll); Logo view = big logo at rest, photo + veil on hover (`.vlogo`).
- **Travels T0** (`NorulesInnerPages.js`): rounded alternating rows (status chip, outlined number, facts, includes chips, CTA + View map). New optional CMS fields on `gem_travels` items: `status` (open/last/soon/sold_out), `nights`, `price_from`, `spots_total`, `spots_taken`, `includes` (one per line).
- **Light-palette fix for all Norules inner pages:** `usePageTone()` in `components/gem2i/norules/GemCatalogCards.js` adds `.gem-tone-light` + palette vars to the page root (like the home) → titles, ranking names, Services cards readable; `--gem-ink`, `--color-seg-on` for active pills; search bar = dark capsule (`gem-tone-dark`, #0E1216); `.gcard` radius 18px; logo circles dark (#14181D) because many legacy logos are white on transparent.
- **Verified:** deploy green 5m08s, health 200; live: Festivals F4 + hover, Conferences grid + Load more, Top venues grid, dark search capsule, readable titles, E1 stamps, list rows. **Not checked live:** Artists A1, Venues Logo view, Travels T0 (members only).
- **Open:** T2 trip page (`/travels/:slug`, packages/itinerary/booking flow) not built; Travels has 1 trip (fill the new fields / add 3-4 demo trips); Services S1/S2 not chosen; real team photos/testimonials still pending.

---

## 2026-10-22 (session 12) — Norules + 03 redesigned section by section, template packages, many bocetos (DEPLOYED)
- **Template = package (D-GEM-2026-15):** each template owns its home AND its inner pages. First split: `/about` → `NorulesAbout.js` (layout A Editorial) when the theme is `gem2i` (Norules), `Gem2iAbout.js` otherwise. Other inner pages (Events, Artists, Venues, Festivals, Travels, Services, Partners, details) are still shared — next split.
- **Hero U (Norules):** event flyer frame keeps the hero height, width = natural ratio of the uploaded image (cap 50%, wider images contained over a blurred copy).
- **Norules home (live template):** Who we are B2 (outlined year + photo strip) · Explore the scene X1 (giant type + cursor photo) **and** X2 (dark spotlight stage) stacked for the client to choose — delete one line in `NorulesHome.js` · FAQ F2 (giant search) · Services S2 (index + live dark panel) · Methodology M2 (DJ deck playhead, autoplays in view) · Who it is for W3 (VIP passes, 3D tilt + holo) · How it works H1 (phone mock screens) · Upcoming events U2 (3D coverflow, autoplay 4 s, keeps going after click) · Conference review CR1 · Pricing P1 (nights-out slider → «For you») · Testimonials TS3 (draggable polaroids) · Latest news N1 (magazine cover) · Team T5 (by region) · end of page Boceto 2 (`NorulesEnd.js`: masonry gallery + viewer, map with floating office tabs + «All», hairline logo wall, client cases, contact = big e-mail copy + 3-step form → /api/contact).
- **Gem2i - 03:** Who we are B3 (fan) · FAQ F1 (chat) · Services S3 (hairline grid with cursor light) · Methodology M1 (scroll story) · Who it is for W2 (photo inside the word) · How it works H2 (self-drawing path) · Upcoming events U3 (date strip) · Team T1 (dark map, a pin per person) · end of page Boceto 3 (`Gem03End.js`: sideways-scroll gallery, full map + glass panel + Tour + «See all», 3D logo ring, client picker, fill-in-the-sentence contact).
- **Gem2i (frozen):** only touched for the shared map — «See all» button resets the map (asked for all 3 templates).
- **Fixes:** Norules photo backgrounds veiled with the night colour like Gem2i (light veil washed photos); light-palette dark-text remap no longer applies inside `.gem-tone-dark` sections (titles were navy on black); rich-text `<p>` no longer printed in the new components (`plainText()`); coverflow horizontal overflow; methodology descriptions as rich text.
- **Team region/map:** derived from the country after the last « · » in the role (COUNTRY table in NorulesEnd/Gem03End).
- **Bocetos (work-plans-MD/bocetos/):** events-e3-narrow, hero-event-image-proportional, about-us-variants, norules-who-we-are, explore-the-scene, faq, services, methodology, who-it-is-for, how-it-works, upcoming-events, five-sections, testimonials-news-more, gallery-to-end, team, footer.
- **Footers (later the same day, DEPLOYED):** Norules = F3 «Cinta y escenario» (`NorulesFooter.js` rewritten: brand-blue, running GEM2i · LET'S PARTY band, newsletter strip, blurb + contact + socials, Discover big, Company + Become a member, offices with HQ chip, equaliser «Now playing» + legal). Gem2i - 03 = F1 «Telón» in its own `Gem03Footer.js` (night footer, big «Be part of the night.» + capsule, 5 columns, huge outlined wordmark, legal; curtain simulated with a rounded page lip + content rising on scroll — a true fixed reveal would need the global layout). `layout/Footer.js` picks the footer per template; Gem2i keeps `Gem2iFooter`. Boceto: footer-f1-f3-real.html.
- **Inner pages split per template (DEPLOYED):** Norules → `pages/gem2i/norules/Norules*.js`, Gem2i - 03 → `pages/gem2i/t03/Gem03*.js` (About, Events, EventDetail, Festivals, FestivalDetail, Artists, ArtistDetail, Venues, VenueDetail, InnerPages = Travels/Services/Partners, TicketSuccess), each with its own `components/gem2i/<tpl>/GemCatalogCards.js`. Gem2i keeps the original `Gem2i*.js`. `App.js` `tplPage(N, T, G, props)` picks by `settings.active_theme`. Copies look the same today; each can now be redesigned alone.
- **Beta demo content (CMS, live, backup `/opt/_port_backups/team_testimonials_before_demo_*.json`):** placeholder randomuser.me portraits on the 5 team members without photo (`demo_photo: true`); the 3 template testimonials rewritten + 3 added, nightlife test copy (`demo: true`). Replace both with real ones before launch.
- **Open:** real team photos + real testimonials to replace the beta demo ones (`demo_photo` / `demo` flags); remove X1 or X2 once the client picks; redesign the split inner pages per template; Methodology/Contact Page Builder bg images are CMS config.

---

## 2026-10-21 (session 11, part 3) — named website palettes, Norules in greys, Awwwards cards (DEPLOYED)
- **Palettes (D-GEM-2026-14):** CMS → Colors → "Website palettes": `theme_colors.website` = Gem2i palette (unchanged), `website_palettes[id]`, `template_palettes[template]`. Presets in code: Grises, Blanco · Negro · Amarillo (both loaded on beta; Norules → Grises). `websitePaletteFor()` drives `injectThemeColors`. Gem2i colours verified identical.
- **Norules follows its palette:** hardcoded blues → accent tokens; light palette → `.gem-tone-light` on the home root (palette text/card/link vars re-applied); bg-image sections veil with the palette page colour. Page Builder `section_configs.gem2i.*.bg_color` cleared (14; backup `/opt/_port_backups/norules_section_colors_before_palette_*.json`).
- **Norules header/footer:** own copies (`NorulesHeader.js`, `NorulesFooter.js`); the header is forced to the Gem2i palette (Anthony: header identical to Gem2i), footer follows the palette.
- **Template preview no longer sticky:** `?template=` only applies while in the URL; a reload shows the live CMS template.
- **Norules Awwwards cards** (boceto `norules-awwwards-cards.html`): Artists (B/N → colour, "View artist"), Venues ("View venue", country chips, logo avatar), Festivals ("View line-up", logo avatar); 🔖 follow on all three. Follow now accepts `festival`. Artist votes were built then removed on request (no `gem_votes` route; one test vote doc remains in `gem_votes`).
- **Legacy site:** see part 2 (Amnesia banner on promotertraininggem2i).
- **Open:** Norules design continues per Anthony; card counts come from Section Manager max_items (10/12 today).

---

## 2026-10-21 (session 11, part 2) — templates split (Norules / Gem2i / 03), hero U, H-1, FAQ section, demo content, legacy banner (DEPLOYED)
- **Templates renamed + isolated (D-GEM-2026-13):** `gem2i` → **Norules**, `gem2i_02` → **Gem2i** (APPROVED, frozen), `gem2i_03` keeps its name. One home + one sections file each: `NorulesHome.js`/`NorulesSections.js` (hero U), `Gem2iHome.js`/`GemSections.js` (hero B), `Gem2i03Home.js`/`Gem2i03Sections.js` (hero C); `pages/HomePage.js` picks by theme. Header/footer/catalogs/My Account still shared.
- **Gem2i restored:** Upcoming events = original E-2 posters (from git 7142d4e); Explore the scene = original GemFeaturedCards. FAQ/news/conference reviews/conferences carousel stay in Gem2i (content sections).
- **Norules:** hero **U-2** (`GemHeroU` in GemHeroVariants: rounded stage, YouTube/MP4 background muted loop + sound toggle, pinned-event flyer + thumbnails, holds on video slides); Upcoming events **H-1** hover (`EventPosterCard`, text drops onto bottom shadow, measured `--drop`); Explore the scene = circles (`GemFeaturedCircles`).
- **Shared fixes:** FAQ is its own section again (`gem_faq`, after Featured); Page Builder saved order now auto-inserts new default keys; Tailwind classes built with `${...}` were never generated (write variants literally); CMS dialog date/time inputs were white-on-white (index.css override); conference excerpts decode entities (`&#39;`); video section W-1 full screen + plays in place (YouTube `vy-k0FopsmY` is blocked for embedding by the rights owner); legacy `open_time` ISO parsed.
- **Catalog `legacy_id` index:** plain unique → partial unique `legacy_id_partial` on 7 gem_* catalogs (2nd CMS-created row used to fail E11000); loader aligned.
- **Demo content on beta (seed-tagged, scripts in `scripts/`):** 5 events cloned to Nov–Dec 2026 (`gem2i_demo_events_2026-10-21`), FAQ 5 Q&A (`gem2i_seed_faq.js`), conference sessions on 4 conferences (`gem2i_seed_conf_sessions.js`), 4 conference reviews (`gem2i_seed_conf_reviews.js`), hero slide `gem2i-hero-ultra-demo` with the official Ultra Miami 2025 aftermovie + the 5 events pinned (`gem2i_seed_hero_ultra_demo.js`; slides are shared → also shows on Gem2i with hero B).
- **Legacy PHP (100.59.20.123, DB `gem2ica_training`, Anthony's OK):** promotertraininggem2i.exclusivesession.com = promoter 24; its slides had expired (2020). Assigned slide **353 Amnesia Ibiza** to promoter 24 (home, 2026-10-21 → 2030-12-31); a short-lived assignment of 375 (Lul "Noche Dorada", not GEM2i content) was removed. Undo: `DELETE FROM promoter_slide_homepage_detail WHERE id_slide_homepage=353 AND id_promoter=24 AND date_start='2026-10-21 00:00:00';`
- **Open:** design Norules (waiting on Anthony); two junk hero slides ("asasas", "Gem2i") to hide; own GEM2i video for the hero; /conferences listing page; conferences `conferences_schedule` vs `schedule` field.

---

## 2026-10-21 (session 11) — Template 01 home: events E-3, FAQ, Latest news (KMS), conferences CC-1 + sessions, Conference reviews RV-1 (DEPLOYED)
- **Feature inventory for sales:** Excel with 59 features (all / sell today / pending), delivered to Anthony from the scratchpad, not in the repo.
- **Upcoming events E-3** (`GemEventPosters` in `components/gem2i/GemSections.js`): square photo card under a brand-blue veil showing the "from" price (lowest tier, event currency), title, big date ("20th APR 2026"), `open_time`, and venue city. On hover (mouse only) the veil lifts and a CTA rises in: Get tickets / Join guest list / View event. On touch the CTA is always shown. The "list your event" tile is kept when there are 2 events or fewer.
- **FAQ** (`GemFaq`, Section Manager `gem_faq`: question + rich answer; Page Builder key `gem_faq`, placed before the map): heading on the left, accordion on the right with the first question open.
- **Latest news** (`GemNewsCards`, Page Builder key `gem_news`, header = Section Manager `aurex_blog_cfg`): 3 KMS posts through `/api/blog/latest`. `settings.blog_api_url` was ALREADY `https://insightsbeta.gem2i.com/api/latest-posts`. Each card: photo, date disc, title strip, summary, Read more. The feed has no category or comment count.
- **Conferences CC-1** (boceto `work-plans-MD/bocetos/conferencias-carousel-horas.html`): carousel of all active conferences (home fetches `limit:100`, 28 live). Card = previous photo card + a "Schedule" block: first 3 sessions of the day, Day 1/2/3 tabs. Without sessions it shows address + description excerpt and "View conference". New conference field **`sessions`** `[{key,visible,date,start,end,title,description}]`, edited in Conferences manager → Sessions (`SessionsEditor` on `SortableSectionList`, house rule). Detail page `/conferences/:slug` gets `GemConferenceSchedule` (day columns) when sessions exist.
- **Conference reviews RV-1** (`GemConferenceReviews`, Section Manager `gem_conf_reviews`: own list of photo/name/role/conference/text + config bg_image/bg_overlay; Page Builder key after `gem_conferences`): one quote at a time on a dark photo band, with arrows and dots.
- Bocetos: `conferencias-schedule.html` (CS-1/CS-2/RV-1), `conferencias-carousel-horas.html` (CC-1 approved, CC-2 not chosen).
- **Verified:** deploy green 4m50s, health 200, `/public/aurex/gem_faq|gem_conf_reviews|aurex_blog_cfg` 200 (empty), `/api/blog/latest` returns KMS posts. **Not browser-checked.** FAQ, sessions and reviews have no content yet, so those blocks stay hidden until filled in the CMS.
- **Found, not fixed:** "All conferences" → `/conferences`, a page that doesn't exist. The Conferences manager "Schedule" field edits `conferences_schedule`, but the ETL stored the legacy text in `schedule`.

---

## 2026-10-20 (session 10) — KMS themes "GEM2i Magazine - Travel" + "Travel Calendar", light/dark mode on all gem2i KMS themes (DEPLOYED)
- **Bocetos** `work-plans-MD/bocetos/kms-travel.html` (inspired by foxiz.io/wandering, GEM2i identity): TR-1 Postal (light), TR-2 Ruta nocturna (dark), TR-3 Atlas (map). Anthony's ruling: TR-1 + TR-2 = ONE template with a light/dark switch; TR-3 = its own template.
- **`gem2i_travel`** ("GEM2i Magazine - Travel"): light hero = TR-1 carousel + "Also on the cover"; dark hero = TR-2 full-bleed + glass cards; from "Choose a destination" down shared (destinations = top categories w/ count + photo, In the news, photo band, region block, Travel with GEM2i offers, More stories). Region block: light = cards with text (TR-1), dark = tall photos (TR-2). Both variants rendered, CSS shows the one for `body[data-mode]`.
- **`gem2i_travel_cal`** ("GEM2i Magazine - Travel Calendar"): Leaflet 1.9.4 (cdnjs) + OSM tiles map of posts with lat/lng (dark = tile filter), month strip `?m=YYYY-MM`, month route, news, destinations, offers.
- **Light/dark mode** on `gem2i`, `gem2i_travel`, `gem2i_travel_cal` (`core.MODE_THEMES`): admin default `kms_settings.general.travel.default_mode` (currently **light** on beta), reader sun/moon button → cookie `kms_mode` (read server-side, no flash). Light skin = `static/gem2i-travel.css` (re-points --kms-* tokens + overrides gem2i.css hardcoded whites; `#footer` needs id specificity).
- **CMS:** Themes → 2 new cards + "Light / dark mode and Travel settings" (default mode, region category, band category); post editor → **Place** box (`kms_posts.place {city,country,lat,lng}`, only written when the box is sent); new **Travel routes** page (`kms_travel_routes {month,title,subtitle,active,stops[{post_id,day,label,visible}]}`, Page Builder ordering pattern, keyboard arrows).
- **Demo:** `scripts/gem2i_kms_travel_demo.py` (tag `gem2i_travel_demo`, `--remove`): places on 10 demo posts + routes 2026-10 / 2026-11. Run on box.
- **Verified:** server-side render of both Travel homes (default + light cookie) 200 with real data; live MG-1 body data-mode follows cookie. **Not browser-tested live:** button click, live map, post/listing pages in light. Active KMS theme on beta still **gem2i**.

## 2026-10-19 (session 9, part 3) — KMS tweaks, legacy user export, Travels/Services/Partners pages (DEPLOYED)
- **KMS:** home side column = 4 posts (newsletter only in the footer band); post page right column = Most read · More in <category> · Tags (`kms/templates/gem2i/post.html`, the A Capital widget sidebar is empty without kms_widgets); logged-in header no longer overflows (gem2i.css v4).
- **Legacy users (read-only):** gem2i.exclusivesession.com lives on **100.59.20.123** (key `ExclusiveSession.com-LightsailDefaultKey`, user ubuntu; DB `gem2ica_production`, table `members` = 1,739 rows: 528 status 1 / 1,203 status 2 / 8 status 0; `admin` = 5). Export without passwords in `reference/local-only/legacy_members.{csv,html}` + `legacy_admins.csv` (gitignored). Anthony was given the Lightsail/mysql steps to read passwords himself; we never extract them (D2). ⚠ The legacy site's MySQL password appeared in a tool output — rotate at cutover.
- **New pages** (`pages/gem2i/Gem2iInnerPages.js`, routes /travels /services /partners; system pages for hero assignment): Travels (alternating rows, View map/View photo, members-only switch), Services (8 icon cards + viewer, dark "Our works" carousel), Partners (aurex_partners logos grid, "Coming soon" when empty, members-only switch). Section Manager entries `gem_travels`, `gem_services_page`, `gem_works`, `gem_partners_page`. Content from the legacy PHP (hardcoded there) via `scripts/gem2i_seed_inner_pages.js` (seed tag, re-runnable; backup `inner_pages_before_*`); assets in `/api/uploads/gem2i/pages/`.
- **Open:** check Travels/Partners logged in; real service descriptions/photos; more trips.

## 2026-10-19 (session 9, part 2) — KMS "GEM2i Magazine" theme (MG-1) on every page + demo content (DEPLOYED)
- **New KMS theme `gem2i`** (`kms/core.py` KMS_THEMES + tokens/fonts; KMS admin → Themes card "GEM2i Magazine"; active via `kms_settings.general.theme`, backup `kms_settings_before_theme_*`). A Capital templates untouched — overrides live in `backend/kms/templates/gem2i/`.
- `gem2i/base.html`: beta chrome — header H-3 (logo + *Insights*, centred nav with rising-dot hover, search, Login / My points / My Account / Admin), footer FT-1 band (KMS newsletter) + FT-4b columns. `gem2i/index.html` = MG-1 home (cover + side headlines, LIVE ticker, category rows, Video row, Most read, tags, membership band). `gem2i/listing.html` = category/tag/search/author/posts with lead card + 3-col grid. `gem2i/login.html` = shared login restyled.
- `kms/static/gem2i.css` (?v=2): re-points kms.css variables (dark, Manrope body / Playfair headings) + skins every shared component (post page reading column 18px, comments, reactions, sidebar, pagination, buttons, gallery, points, cookies). Verified live: body Manrope 16, post title Playfair 51, nav Manrope 14; home/section/tag/search/posts/post/login 200.
- **Demo content** `scripts/gem2i_kms_demo.py` (tag `gem2i_kms_demo`; `--remove` deletes it): 5 categories, 17 posts (3 video), 24 tags, slider/featured/breaking selections.
- Bocetos: `work-plans-MD/bocetos/kms-home.html` (MG-1 approved).
- **Open:** KMS /admin keeps the A Capital admin look; logged-in header + subscribe overlay not checked; real KMS content to replace the demo.

## 2026-10-19 (session 9, Anthony's machine) — catalog pages v2, page heroes, About, geo, calendar CA-2, KMS installed (all DEPLOYED to beta)

**Shipped (beta.gem2i.com, health 200 after every deploy; checked live with curl/JS):**
- **Small fixes:** venue logo circle clips its image (`overflow-hidden`); Partners logos grayscale → colour on hover; Clients section reads Section Manager `gem_clients_cfg` (subtitle, CTA, max) + name/description cards (data: `scripts/gem2i_fill_clients.js`, backup `clients_before_fill_*`).
- **Footer:** FT-1 blue band kept + FT-4b dark part (brand · Discover · Company · Offices · Follow; bottom bar with legal + EN/ES switch). Bocetos `footer-v2.html`, `footer-ft4b.html`.
- **Catalog pages v2** (bocetos `catalogos-paginas.html`, all approved): shared `components/gem2i/GemCatalogCards.js` (one card hover = legacy left→right veil wipe + zoom + info rise + logo grey→colour; SearchBar; ContinentTabs incl. USA; Segmented). Events (Current/Past, Event/List view, type tag, Buy tickets), Festivals (featured bento, lineup names, Upcoming/Past only when any upcoming), Artists (ranking column Gem2i/DJ Mag/RA top 10 + Ranking/All + grid), Venues (Top strip = CMS Featured else first by order; Photo/Logo view), new `/about` page (`pages/gem2i/Gem2iAbout.js`).
- **Backend catalog filters** (`routes/gem_catalogs.py`): city/state/position/country-contains on artists/venues/festivals/events; `venues-top`, `festivals-meta`, `places` (geo-fed country/state + city type-ahead), `catalog-dates` (calendar dots), `hero-events`, `date_from/date_to` on events + festivals.
- **Page heroes:** Hero slide → Page Assignment now lists system pages about/events/festivals/artists/venues (`/public/site-pages`, menu duplicates dropped). Inner pages render the SAME hero as the home (active template A/B/C, full height, `.gem-tpl-wide` on 02). Hero slides get admin-only **Name Slide** (`name`) — list + pickers use it.
- **Events → hero slides:** with "Show on the GEM2i portal" on, the Events manager lists live slides (`hero_slide_ids`); heroes show ONLY events pinned to the current slide (no "next event" fallback). Events manager: Date field readable (light scheme), all "(HTML allowed)" fields → RichTextEditor.
- **About:** CMS → About gets Key figures (stats) + **Page sections** (order/show-hide Methodology · Offices · Team · Contact with their texts) using the new house widget `components/admin/SortableSectionList.js` (D-GEM-2026-09). Sample content + real phone/signature/button (`scripts/gem2i_about_sample.js`, `gem2i_about_fill.js`; backups `about_before_sample_*`, `about_fill_before_*`).
- **Geo:** full world list from the legacy dump (`countries2`/`states`/`cities`) → `countries` 249 · `states` 1,259 · `cities` 57,949 (`scripts/gem2i_etl_geo.py` local → `scripts/out/` (gitignored) → `scripts/gem2i_load_geo.py` on box; existing ids kept; backup `geo_before_legacy_*`). Some legacy city names lost accents in the source ("Alcal").
- **Calendar CA-2** (`components/gem2i/GemDateRange.js`, bocetos `calendario*.html`): shortcuts, from–to range, event dots, keyboard, mobile bottom sheet — on Events + Festivals.
- **KMS installed tal cual from A Capital** (D-GEM-2026-10): `backend/kms/` @1775e05 at `/insights`, served on **https://insightsbeta.gem2i.com** (vhost `scripts/gem2i_insights_nginx.conf`, LE cert), `settings.kms_native_enabled=true`, `kms_native_base`. My Account SSO Quick Link `qlink_kms` "Insights" granted to Nivel 0/1. New pip deps html5lib, tinycss2. KMS data empty.

**Open / human:** test My Account → Insights SSO with a login; KMS design work (waiting on Anthony); name the 2 hero slides; assign slides to inner pages; Events "CA-3" day strip not built (only CA-2 approved); team photos; lighting look; Testimonials content.

## 2026-10-17 (session 8, part 4) — Page Builder per-section background image (DEPLOYED to beta)
- `SectionOrderManager.js`: gem2i themes get a "Background image" upload (`section_configs[theme][key].bg_image`), "Remove image (use colour)" link and a "Colour veil" slider (`bg_overlay`, 0–95, default 70).
- `Gem2iHome.js` wrapper: with an image paints `linear-gradient(veil,veil), url(img)` where veil = `color-mix(section colour | #04080C, overlay%)`; tone (light/dark text) follows the veil colour; no image → the section colour as before (`gem-has-img` class added).
- Demo backgrounds (gem2i, gem2i_02, gem2i_03): Methodology `bg_crowd.jpg` 55 %, Who it is for `bg_ushuaia_v2.jpg` (blur 32) 65 %, Contact `bg_mirage_v2.jpg` (blur 14) 75 % — in `/api/uploads/gem2i/backgrounds/`. Club logos blurred out; renamed `_v2` because uploads are cached 7 days. Backup: `/opt/_port_backups/section_configs_before_bg_demo_*`.
- Not tested: the admin upload field with a real login.

## 2026-10-17 (session 8, part 3) — Venues/Conferences/Team polish, Gallery GA-3, Footer FT-1 (DEPLOYED to beta)

- **Venues** tiles 4:3 (472×354 at 1920), bigger number/logo/text; 02-wide 6-col override removed.
- **Conferences** redesigned: photo cards (flyer, dates chip, logo plate, name, country), 4 cols; 02-wide 8-col override removed.
- **Team** shows the CMS "Short bio"; 6 bios EN/ES + section subtitle loaded (backup `/opt/_port_backups/team_before_bios_*.json`).
- **Gallery GA-3** (`GemGalleryMosaic` + shared `PhotoViewer`/`usePhotoViewer`): full-bleed mixed-size mosaic (10-tile pattern = 3×6, no holes), hover caption, full-screen viewer. Fork Unsplash gallery replaced by 18 real legacy venue photos (seed `gem2i_legacy_gallery_2026-10-17`, backup `gallery_before_real_*.json`).
- **Footer FT-1** (`Gem2iFooter.js`, all pages): brand-gradient band + newsletter (`/public/landing-subscribe` → Landing subscribers), columns brand/contact, site map (legal pages moved to the bottom bar), offices (Maps & Locations global_business), socials + Contact us. Newsletter not test-submitted.
- Bocetos: `work-plans-MD/bocetos/gallery-footer.html`.

**Open:** footer content stays centred on template 02 (band is full-width); lighting look still to choose; Testimonials real content; team photos.

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
