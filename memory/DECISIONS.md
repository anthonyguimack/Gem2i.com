# DECISIONS.md — gem2i

## D-GEM-2026-01 — Isolation (2026-07-15, Anthony)
gem2i is a **completely isolated product**: own repo, own AWS box (34.198.159.54), own MongoDB (`gem2i_cms`), own domain (beta.gem2i.com). It shares nothing at runtime with Carlos/Aurex/Acapital and is never deployed alongside them. This RULES the old plan's D1 ("4th AUX brand in the unified codebase") in favor of full isolation. We keep the methodology, tech stack, workflow, and culture only.

## D-GEM-2026-02 — Code origin: fork + strip (2026-07-15, Anthony)
The codebase is **forked from the AUX-1.0 CMS core and stripped** of all brand themes and unrelated modules, rather than scaffolded fresh. Rationale: the GEM2i plan reuses members/hero/geo/CMS-admin/i18n/contact that the engine already provides — forking is the fastest path to parity and matches cloning the runtime-proven server.

## D-GEM-2026-03 — Box = wiped clone (2026-07-15, Anthony)
The box is a snapshot-clone of beta-carlos, chosen to inherit the installed Python/Node/nginx/Mongo/certbot runtimes. Everything brand-specific (app dirs, vhosts, LE certs, custom services, Mongo data) is wiped by `provision_gem2i_box.ps1 -Clean`; runtimes are preserved. Destructive steps are IP-guarded and gated behind `-IUnderstand`, and run only on Anthony's explicit GO.

## D-GEM-2026-04 — Port from Carlos, lote 1: Invite Code + My Community (2026-09-23, Carlos M. Artiles)
Ported per `work-plans-MD/PORT_FROM_CARLOS_PLAN.md` @ Carlos `8a0d4dd`. **Collection-name exception:** `invite_codes` (and, from sector 1.B, `enrollment_fields` / `enrollment_content` / `enrollment_applications` and the `counters` doc used by the atomic membership-number allocator) keep their core (non-`gem_`) names — it is an inherited CMS-core collection like `members`, and renaming it would touch the registration flow (legacy-login risk R8). **Privacy option (b):** My Community shows only name/ID/photo/country/state/city of downline members; email/phone/DOB/gender/ZIP are not rendered (still present in the API payload — option (c), trimming the endpoint, remains available).

## D-GEM-2026-05 — Membership levels & enrollment "like Carlos" (2026-09-23, Carlos M. Artiles)
Owner rulings after the port: (1) **enrollment** keeps Carlos' questionnaire and legal texts (his 50-field seed restored); (2) **levels** are Carlos' — Nivel 0 / Nivel 1 with his section permissions, **enforced server-side** (`membership_v2_enabled` + `level_enforcement_mode:"enforce"`), every non-admin member on Nivel 0. Level *labels* may be renamed in the CMS; the *access-by-level* behaviour may not be changed. Gem2i-specific exceptions forced by its data: gem2i's 5 legacy **member types stay** (they drive guest-list benefits — no "Simple" reset), and levels grant no quick links (gem2i has none). Consequence to remember: Invite Code / My Community are closed for Nivel 0 until a level lists them (CMS → Member Levels).

## D-GEM-2026-06 — Port A Capital, keep gem2i identity (2026-10-16, Anthony)
Bring A Capital's backend/CMS advances into gem2i via the audit plan F0–F6; KMS/LMS/PMS/IMS/News out; **MMS comes later product by product** (so Points & Rewards waits). gem_* collections stay (Section Manager stored in `gem_section_*`).

## D-GEM-2026-07 — My Account 2.0 "tal cual" A Capital (2026-10-16, Anthony)
Same Velzon palette, light default, A Capital's 2.0 pages. gem2i extras kept (Calendar, Calendar Sync, Membership); privacy option (b) enforced server-side instead of in the page.

## D-GEM-2026-08 — Three gem2i templates (2026-10-16, Anthony)
`gem2i` (Gem2i - 01, Hero A), `gem2i_02` (Hero B), `gem2i_03` (Hero C). Same header/footer/catalogs/My Account; own hero and own Page Builder order; section designs shared until a template gets a variant. Compare with `?template=`. Approved shared designs: Intro I-2, Featured F-1, Services S-2; header laid out like Aurex.

## D-GEM-2026-09 — Paid membership + coupons (2026-10-16, Anthony)
Paid membership = registered member buys monthly/annual (one-time Stripe, no auto-renew) → configured level while active; on lapse back to previous level (access never cut). Coupons for tickets and membership; a use counts only on completed payment.

---

## Carried from GEM2I_MIGRATION_PLAN §9 (D-2026-58, 2026-07-07) — still in force
- **D2 Member merge:** silent bcrypt of legacy plaintext at ETL; existing passwords keep working; no emails, no forced reset; recovery via self-service forgot-password. Plaintext never stored/logged.
- **D3 Payments:** Stripe via CMS-managed keys; provider-verified webhooks (closes the legacy disabled-IPN hole). PayPal retired.
- **D4 Scope:** full Tier A + B before cutover (full-parity doctrine).
- **D6 Language:** EN/ES from day one (`useT()`/`LocalizedField`).
- **D7 Legacy visibility:** migrate ALL history; public surfaces current/recent only.
- **D8 Branding:** keep gem2i identity as-is (pure tech migration, no rebrand).
- **D5 Hosting:** dedicated box — now concrete (34.198.159.54).

## D-GEM-2026-06 — Points B3/B5 = legacy rules + safety (2026-10-17, Anthony)
Ported only the 4 point rules the legacy PHP actually awards (purchase_for_self, friend_purchased_via_invite, invite_to_purchase_share, guest-list yourself_points on the pass). Added: idempotent `dedupe_key`, share points max once per member/event/day (legacy paid every click), no self-referral.

## D-GEM-2026-07 — Home designs per template (2026-10-17, Anthony)
Each gem2i template gets its own section designs, approved from HTML bocetos in `work-plans-MD/bocetos/`. Template 01 = M-3, A-3, P-1, E-2, R-2, V-1, F-2, C-1, W-1, P-1(plans), T-1, Q-1, G-2, B-1, K-1 + A Capital's map. Reserved for 02/03: How-it-works P-2, Festivals F-1. Unchosen templates keep the previous renderers.

## D-GEM-2026-08 — Session-8 design rulings (2026-10-17, Anthony)
Typography T-2 (Playfair + italic accent + Manrope); header hover H-3; Contact Us is a homepage section and every contact link goes to `/#contact`; brand blue `#0068b3` is the site accent (fills), text uses accessible tints; all three gem2i templates share the approved section designs and differ by hero (A static/carousel, B + featured event, C + upcoming strip); template 02 = full-width layout. Lighting look still to be chosen via `?look=`.

## Standing security note
The legacy PHP source carries live secrets (SES SMTP, MySQL, Facebook, reCAPTCHA). Rotate them at cutover time; NEVER copy any into repo/plan/memory.

## D-GEM-2026-09 — One ordering widget everywhere (2026-10-19, Anthony) — HOUSE RULE
Every CMS control that orders blocks/sections/items uses the Page Builder (`/admin/section-order`) pattern: drag handle + label/key + eye + switch to show/hide. Implemented once as `frontend/src/components/admin/SortableSectionList.js` (dnd-kit, mouse + keyboard) — reuse it; never up/down arrows or a new widget. Ordering blocks sit in the CMS form in the same position as on the page (e.g. About → "Page sections" is LAST, because those blocks come last on /about).

## D-GEM-2026-10 — KMS installed "tal cual" from A Capital (2026-10-19, Anthony)
Overrides "KMS out" in D-GEM-2026-06: gem2i needs the KMS to run its magazine. `backend/kms/` copied verbatim from AUX-1.0 @1775e05 and mounted at `/insights`; served on its own origin **https://insightsbeta.gem2i.com** (nginx `/` → `:8050/insights/`, `scripts/gem2i_insights_nginx.conf`, LE cert). `settings.kms_native_enabled=true`, `kms_native_base`. Entered from My Account via the SSO Quick Link `qlink_kms` (product `kms`, granted to Nivel 0/1). Shims for A Capital-only deps: `routes/paid_membership.py` (membership_lapsed → gem2i paid_membership), `utils/mms_events.product_points` (no MMS → unavailable), `payments._add_months`; copied `utils/referral|mms_coupons|subscription_emails`. Data starts empty (no A Capital content). Design changes come later, on Anthony's instructions.

## D-GEM-2026-11 — Insights = one product with beta (2026-10-19, Anthony)
The KMS public site must look exactly like beta.gem2i.com — same fonts (Manrope text, Playfair headings), sizes, header/footer and graphic line — on the home AND every inner page (posts, sections, tags, search, pages, login). Implemented as the KMS theme `gem2i` (templates/gem2i/ overrides + static/gem2i.css); A Capital's shared templates stay untouched. Home = sketch MG-1.

## D-GEM-2026-12 — Travel magazine templates + light/dark (2026-10-20, Anthony)
Bocetos `kms-travel.html` approved: TR-1 (light) and TR-2 (dark) are ONE KMS template "GEM2i Magazine - Travel" — only the hero differs, plus the region block (light cards / dark tall photos); TR-3 is a separate template "GEM2i Magazine - Travel Calendar". Readers can switch light/dark from the frontend; the admin picks the default. Same switch enabled on the first template "GEM2i Magazine" (MG-1).

## D-GEM-2026-13 — One face per template; Gem2i approved & frozen (2026-10-21, Anthony)
Supersedes the "sections shared, templates differ by hero" part of D-GEM-2026-08. **Every template has its own design for every section; only the CONTENT is shared** (Section Manager, slides, catalogs, FAQ, reviews). Renamed: `gem2i_02` "Gem2i - 02" → **Gem2i** (APPROVED: change only on Anthony's explicit request), `gem2i` "Gem2i - 01" → **Norules** (the template we design now). `gem2i_03` keeps "Gem2i - 03".
Implementation: one home + one sections file per template — Norules = `pages/gem2i/NorulesHome.js` + `components/gem2i/NorulesSections.js` (hero U); Gem2i = `Gem2iHome.js` + `GemSections.js` (hero B); Gem2i - 03 = `Gem2i03Home.js` + `Gem2i03Sections.js` (hero C). `pages/HomePage.js` picks by theme. Never import one template's sections from another. Header, footer, catalog pages and My Account are still shared: copy them per template the first time one template needs its own version (never edit the shared one for a single template).
Why: on 2026-10-21 the Norules work edited shared components and changed the approved Gem2i too (`isTpl01 = true` made all templates render the same sections).

## D-GEM-2026-14 — Named website palettes, one per template (2026-10-21, Anthony)
Templates = shape, palettes = colours. `theme_colors.website` stays the **Gem2i** palette (unchanged); extra palettes live in `theme_colors.website_palettes[id] = {name, colors}` (same WEBSITE_COLORS keys) and `theme_colors.template_palettes[templateId] = paletteId` picks one per template (missing/'website' = Gem2i). CMS → Settings → Colors → "Website palettes": assign, edit, create from preset/copy, delete. Presets in code: **Grises** and **Blanco · Negro · Amarillo** (`WEBSITE_PALETTE_PRESETS`). `injectThemeColors` uses `websitePaletteFor(theme_colors, active_theme)` (honours `?template=`). A light palette flips Norules to dark text via `.gem-tone-light` on its home root, its own header (once solid) and footer. Why: demo other brands' identities (e.g. Exclusive Sessions) on the Norules template without a new domain/install; real brands still get their own install (like Aurex / A Capital / Carlos).

## D-GEM-2026-15 — A template is a package: home AND inner pages (2026-10-22, Anthony)
Each gem2i template (Norules `gem2i`, Gem2i `gem2i_02` frozen, Gem2i - 03 `gem2i_03`) has its own design for the home **and** for every inner page; only the content is shared. Routes pick the page by `settings.active_theme` (first: `/about` → NorulesAbout). New section designs go into the template's own files (`NorulesSections.js` / `NorulesEnd.js`, `Gem2i03Sections.js` / `Gem03End.js`), never into shared components. Photos under a dark veil keep night text colours even inside a light palette.


## D-GEM-2026-16 — Norules inner pages keep the client's hovers (2026-10-23, Anthony)
Redesigns of Norules catalog pages must keep the legacy card hover (veil wipes left→right, zoom, logo grey→colour, info rises) and the full legacy search (country → state → city, name, dates, genre/position where they exist), continent tabs and pagination. Chosen: About AB1, Festivals F4 (no horizontal bars; Conferences as a grid), Events E1 + List view E3, Artists A1, Venues V1 (Top venues without horizontal scroll), Travels T0 now and T2 trip page later. Inner pages follow the template palette tone like the home (`usePageTone`).

## D-GEM-2026-17 — Norules buttons B1 + hero pill/sweep (2026-10-23, Anthony)
All Norules buttons/links follow B1 (pill with arrow disc; links with a drawn underline) through `components/gem2i/norules/NBtn.js`; hero CTAs are pill + left→right white sweep. Shared components used by the frozen Gem2i template are never restyled in place: Norules gets its own copy (e.g. `NorulesHeroU.js`) or a class-only override (`.nb-follow` on the shared FollowButton).
