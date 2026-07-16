# ARCHITECTURE.md — gem2i

## Origin
Forked from **AUX-1.0 CMS core** (`C:\2026\Acapitalgroup.com_Emergent_Claude\AUX-1.0-aurexnetwork-complete`) and stripped to the engine. **Kept:** members/auth (JWT), hero-canvas slides, geo (countries/states/cities), CMS admin shell, i18n (`useT()` EN/ES), contact pipeline, Stripe (CMS-managed keys), settings/runtime_config plumbing. **Removed:** every brand theme (personalbrand/aurex/default) and every unrelated module — KMS, News, Morning Brief, PMS, LMS, MMS, journal, SSO-to-legacy.

## Stack
React 19 + Tailwind + Shadcn/UI + @dnd-kit + framer-motion (frontend, CRA+craco) · FastAPI + Motor + Pydantic (backend, uvicorn :8050) · MongoDB `gem2i_cms`.

## Data model (MongoDB, prefix `gem_*`)
Reuse: `members`, `contacts`, `settings`, `hero_slides`, geo. New (see GEM2I_MIGRATION_PLAN §4): `gem_events`, `gem_transactions`, `gem_waiting_list`, `gem_follows`, `gem_artists`, `gem_venues` (+`gem_venue_types`), `gem_festivals`, `gem_conferences`, `gem_clients`, `gem_points_history`, `gem_config` (secrets/knobs — NEVER in `settings`).

## API (FastAPI — `backend/routes/gem_*.py`)
Public catalogs `/api/public/gem/*`, member actions `/api/member/gem/*` (JWT identity only), payments webhook (Stripe-verified), admin CRUD `/api/admin/gem/*`, `GET /api/health`. Full list: plan §5.

## Frontend (theme `gem2i`, dark entertainment)
`components/gem2i/` layout + widgets; `pages/gem2i/` catalogs & details; `pages/admin/Gem*Manager`. Public theme driven by the `website` color group (`--color-*`). Full list: plan §6.

## Ports across the estate (context — gem2i is on its OWN box)
carlos 8003 · journal 8010 · pms 8020 · lms 8030 · mms 8040 · **gem2i 8050**.

## Phases
Per `work-plans-MD/GEM2I_MIGRATION_PLAN.md` §7: P0 skeleton → P1 shell+home → P2 catalogs → P3 membership → P4 guest list/QR → P5 e-ticketing/payments → P6 admin+polish → P7 walk-through+cutover. ~12–15 sessions.
