# GEM2I_EVENT_MICROSITES_PLAN.md — event microsites ("Domain or Subdomain") on beta.gem2i.com

> **CLAIMED BY:** (unclaimed)
> **STATUS:** PLAN — analysis done 2026-10-26 (session 14); rulings §7, chosen designs §8. Next: implement M0 → M5. No code yet. Bocetos: `work-plans-MD/bocetos/gem2i-microsite-guest.html`, `gem2i-microsite-eticket.html`.
> **LAST SYNC:** 2026-10-26

---

## 1. What the legacy "Domain or Subdomain" field does

**Where:** Systems backend → Events → Edit (`backend2/events_edit-event.php`), field `domain` (free text, e.g. `eticketcaso1gem2i.exclusivesession.com`), stored in `events.domain`.

**What it means:** "this event ALSO has its own website, at this host". The event still shows on the portals according to two separate switches:
- `gem2i_show_portal` (Yes/No) → listed on gem2i.com,
- `exclusivesession_show_portal` (Yes/No) → listed on exclusivesession.com.

So `domain` and the portal switches are independent: an event can be on the portal only, on its microsite only (both portal switches = No, the case of every test event), or on both.

**How the legacy serves it (one PHP copy per host):** each microsite is a full copy of a PHP code base in `/var/www/<host>` on 100.59.20.123 (its own vhost + certificate). On each request the copy reads `$_SERVER['SERVER_NAME']` and:
1. finds the **promoter** whose `promoters.url = host` (status A) → logo / logo_off, name, description, socials, contact e-mail, language: the microsite's branding;
2. finds the **event(s)**:
   - guest-list sites: `events where status='A' and id_promoter=<promoter> and id_event_type=3 and end_time>now()` (next one by open_time; members see private ones allowed for their member type);
   - e-ticket sites: `events where status='A' and domain=<host> and id_event_type in (2,3) and private='N' and open_time>now()`.
3. Two code bases exist: **guest-list microsite** (one page: promoter manifesto + event + join / add to guest list / invite friends) and **e-ticket microsite** (promo page with content slides, buy tickets, event details, upcoming events, line-up, location, VIP, and a full "My Account" with tickets bank, transaction history, ticket details, reassign / use ticket, guest lists, e-pass, community, points, e-bonus, e-commissions, reports).
4. Login on the microsite = same `members` table (session per host); "Apply for Membership" / Facebook login; referral links `?GEM=<membership>&id_event=…&referral=…`.

**Supporting modules in the same backend:**
- `events_content_slide` (per event: title, text_button, url, description, image, status, publish) → the e-ticket **promo carousel** ("Ellum arrives to Newyork!").
- `events_invite` + `events_invite_slides` (per event: url, mid/web banner; slides with background type image/video, two title lines) → the **invite page** for "Invite Friends".
- `events_cost` → stock per tier incl. `stock_guest_list` (0 = "Our guest list has been reserved to capacity."), `events_prices` → dated price ladder per tier and sex, `events_guest_list_benefit*`, `events_private_member_type`, `events_reward_points_*`.

## 2. What beta.gem2i.com has today

- `gem_events` (ETL from `gem2ica_production`): title, type (eticket / guest_list / info / epass), dates, venue, lineup, tiers (6 legacy tiers), guest_list (stock, benefits, ranges), points, payment, external_ticket_system, `show_portal`, `private`, socials, images.
- **Missing:** `domain`, the two separate portal switches (only `show_portal`), promoters (`legacy_promoter_id` kept, no collection), content slides, invite pages/slides, `events_private_member_type`.
- Public site: one host (beta.gem2i.com); event pages `/events/:slug` (ED-A design, guest list + e-ticket widgets, pass page, Stripe checkout). Member area = My Account 2.0 (A Capital design).

## 3. Target behaviour on the new stack

1. In the CMS Events manager an operator fills **Domain or Subdomain** (e.g. `pure.gem2i.com` or `carlcoxny.com`).
2. That host serves an **event microsite** from the SAME React app + API (no per-site copy): the app sees `window.location.host !== main host`, asks `GET /api/public/gem/microsite?host=<host>` and renders the microsite shell (guest-list or e-ticket layout by event type) instead of the portal.
3. The event keeps showing on beta.gem2i.com only if **Show on the GEM2i portal** is on (as today). A second switch "Show on Exclusive Session portal" is kept as data for parity (no portal yet).
4. A member logs in once: the microsite uses the same JWT (`/api/auth`), with a token hand-off when coming from beta.gem2i.com (cookie domains differ).
5. Guest list / e-ticket / pass / QR / Stripe use the existing endpoints (`gem_passes.py`, `gem_tickets.py`); success/pass pages live on the microsite host.

## 4. Work plan

### Phase M0 — data (backend, ETL)
- [ ] `gem_events.domain` (lower-case host, unique among active events; validated: no scheme/path) + `show_portal_es` (Exclusive Session switch).
- [ ] `gem_promoters` (from legacy `promoters`: name, url, logo, logo_off, description, socials, contact e-mail, language) + `gem_events.promoter_id`. Microsite branding = promoter, overridable per event (logo, accent colour, background).
- [ ] `gem_events.microsite`: `{ slides: [{title, text, button_text, url, image, visible}], invite: {banner, slides:[...]}, layout: 'auto'|'guest'|'eticket', theme: {accent, logo, bg} }` (ETL from `events_content_slide`, `events_invite*`).
- [ ] ETL delta for `domain`, `promoter`, slides, invite (scripts `gem2i_etl_microsites.py` / loader, idempotent, `--overwrite-edited` like the others).
- [ ] `events_private_member_type` → `gem_events.member_types_allowed` (private events visible to those member types).

### Phase M1 — API
- [ ] `GET /api/public/gem/microsite?host=` → `{event (next active for that host), promoter, upcoming (same promoter/host), slides, invite, theme}`; 404 when the host is unknown. Guest-list hosts resolve the next active guest-list event; e-ticket hosts the next event by `domain`.
- [ ] Reuse: event detail, my-event-status, guest-list join/cancel, waiting list, ticket checkout/status (success_url = microsite host), pass QR.
- [ ] CORS: allow every active `domain` (dynamic origin check against `gem_events.domain`), keep the rest closed.

### Phase M2 — hosting (box 34.198.159.54)
- [ ] nginx: catch-all `server` for microsite hosts → same build + `/api` proxy. Two options:
  - **A (recommended to start):** subdomains of one domain we own (`*.events.gem2i.com` or `*.gem2i.com`) + one **wildcard certificate** (DNS-01 challenge) → no per-event server work.
  - **B (custom domains like the legacy):** per-domain vhost + `certbot` per host, triggered from the CMS (queue) once DNS points to the box.
- [ ] Health: microsite host returns 200; unknown host → redirect to beta.gem2i.com.

### Phase M3 — frontend
- [ ] App boot: if host ≠ main host → `MicrositeApp` (own router, own header/footer, no portal menus).
- [ ] **Guest-list microsite** (one page): promoter header, manifesto/description, event block (photo, description, date, doors, age, address), venue contact; logged out: Login (the existing modal) + Apply for membership; logged in: Add to guest list / You are on the list / full → waiting list, Invite friends (role-gated: community manager / team leader / entertainment consultant), pass QR + "View my pass".
- [ ] **E-ticket microsite** (pages): Promo (slides), Buy tickets (tiers + quantity + Stripe), Event details (description, dates, age, address, dress code), Upcoming events (same promoter), Line-up, Location (map), VIP (if any), My tickets (bank, history, ticket detail with QR, reassign — the rest of the legacy My Account stays on beta.gem2i.com/my-account).
- [ ] Countdown, share (Facebook / copy link / referral link), cookie notice, EN/ES.
- [ ] Design: one Gem2i microsite design with the promoter's logo + accent; bocetos in `work-plans-MD/bocetos/gem2i-microsite-*.html`.

### Phase M4 — CMS
- [ ] Events manager: Domain or Subdomain (with "Open microsite ↗"), Exclusive Session portal switch, Promoter picker, Microsite tab (slides list with the house ordering widget `SortableSectionList`, invite banner/slides, theme).
- [ ] Promoters manager (`/admin/gem-promoters`): name, logo on/off, description, socials, contact e-mail, url.
- [ ] Register new CMS sections in `cms_sections.py` (`gem_promoters`, microsite fields under `gem_events`).

### Phase M5 — verify
- [ ] One guest-list and one e-ticket microsite on test hosts with the training events (2071 Zephyr / Perfect Mix; 2052 Event Ticket Training / On Ground), logged out and logged in: join, pass, cancel, waiting list, invite, buy (Stripe test), success, my tickets.
- [ ] Event hidden from the portal (show_portal off) still works on its microsite; event on both works on both.

## 5. Decisions needed (Anthony)
1. **Hosts:** subdomains of gem2i.com with a wildcard cert (fast) vs. any custom domain per event (legacy parity, needs DNS + cert per domain) — or both (A first, B later).
2. **My Account on the microsite:** only "My tickets" there (proposal) or the whole legacy account (community, points, e-bonus, e-commissions, reports).
3. **Branding source:** promoter (legacy) vs. per event override (proposal: promoter by default, override per event).
4. **Exclusive Session portal switch:** keep as data only, or drop.
5. Login stays the current modal (D-GEM-2026-19); "Apply for membership" goes to the existing enrollment until the onboarding topic is decided.

## 6. Risks
- Cross-domain login (JWT in localStorage per host) → needs a short-lived hand-off token.
- Stripe success/cancel URLs and the webhook must accept microsite hosts.
- Cert automation for custom domains (rate limits, DNS not yet pointed).
- Legacy secrets (MySQL password in PHP) — rotate at cutover.

## 7. Rulings (Anthony, 2026-10-26) — supersede §5
1. **Hosts:** the microsites run on `guestgem2i.exclusivesession.com` (guest-list layout) and `eticketgem2i.exclusivesession.com` (e-ticket layout) — legacy-style hosts, one vhost + cert each on the gem2i box (DNS to be pointed by Anthony). More hosts later the same way (the `domain` field decides).
2. **My Account on the e-ticket microsite = the legacy submenu, nothing more:** Purchased Tickets (`ticket-details.php`: event, ticket type, qty, total price/amount, Print, Reassign, Cancel), Transaction History (event, ticket type, price, qty, total amount), Guest List (event name, event date + pass), Tickets Bank (event, ticket type, price, total, Use, Reassign). The rest of the account stays on beta.gem2i.com/my-account.
3. **Branding = same logic as the legacy, unchanged:** guest-list host → the promoter whose `url` = host; e-ticket host → the event's own promoter (`events.id_promoter`) logo + the event's own logo (`events.logo`) in the header. Promoter name, description, socials and contact come from the promoter. This is a tech-stack + design update, not a behaviour change.
4. **Platforms (context):** gem2i is the central/global platform; there are domains for events, artists and venues; exclusivesession.com shows only the events with "Exclusive Session Show Portal = Yes". So keep BOTH switches as real flags: `show_portal` (gem2i) and `show_portal_es` (Exclusive Session).
5. **Apply for membership on a microsite = legacy flow:** `process.php` inserts the member with `estado='2'` (PENDING), `id_sponsor` from `?GEM=`, `url_reference` = host, `cluster_name='event'` → `verify.php` → formal-name confirmation (`apply_membership.php`) → `apply_membership_ok.php` sets `estado='1'`, records `members_logged_users` and gives the sponsor the action-4 points. New stack: `POST /api/public/gem/microsite/apply` creates the member with `status:'pending'` (+ sponsor, `registration_source:'microsite'`, `url_reference`, cluster `event`), e-mail verification, formal-name confirm → active + sponsor points (reuse `insert_member_with_retry`, `gem_points` dedupe). Login stays the modal.
6. **Design:** microsites follow the **Norules** design logic (cards, pill buttons B1, big type) in **black / grey / white**, so they adapt to each promoter's brand — not the GEM2i blue. Bocetos redone accordingly (`gem2i-microsite-guest.html`, `gem2i-microsite-eticket.html`).

## 8. Chosen designs (Anthony, 2026-10-26)
- **Guest-list microsite:** **MG-B** — promoter manifesto + image on top, then the event (photo, description, facts) with the action card (log in / add to guest list / on the list + QR / full → waiting list); header = promoter logo, Invite friends (role-gated) + member name when logged in.
- **E-ticket microsite:** **PROMO-A** (content slides full-width + title/facts band), **BUY-B** (legacy side menu + tiers with "this price for N days", total, ticket reminder; logged out = "Log in to buy"), **DETAILS-A** (facts band, description, upcoming events of the promoter, map), **LINEUP-A** (artist photo grid + location with map), **ACCOUNT-B** (legacy side menu with My Account open: Purchased Tickets / Transaction History / Guest List / Tickets Bank, ticket detail with QR, reassign, cancellation), **APPLY-A** (apply form as a window over the event photo → member PENDING).
- Design system for both: Norules logic in black / grey / white (light default, dark variant), brand from the promoter (+ event logo on e-ticket).
