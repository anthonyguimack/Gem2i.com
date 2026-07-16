# CLAUDE.md — GEM2i (isolated product, beta.gem2i.com)

This file is read automatically by Claude Code on every session startup.

---

## STARTUP INSTRUCTION — DO THIS FIRST

**Read ALL files in the memory/ folder before doing anything:**
1. `memory/PROGRESS.md` — what is deployed, current state, today's changes
2. `memory/DEPLOYMENT.md` — how to deploy, the server, cleanup/provision, known issues
3. `memory/ARCHITECTURE.md` — folder structure, MongoDB collections, API paths, key components
4. `memory/DECISIONS.md` — architectural decisions and why they were made
5. `memory/test_credentials.md` — test accounts matrix

Then read `work-plans-MD/GEM2I_MIGRATION_PLAN.md` (the product spec) and `work-plans-MD/GEM2I_BUILD_TRACKER.md` (the live build tracker). Only after all of these should you begin any work.

---

## PROJECT IDENTITY — READ THIS CAREFULLY

**GEM2i** — "Global Entertainment Management & Marketing Integration": an entertainment-industry membership portal (event/festival/artist/venue/conference catalogs, guest lists with QR e-passes, e-ticketing). Rebuild of the OWNED legacy PHP site at gem2i.com onto the AUX tech stack.

**This is a COMPLETELY ISOLATED product.** It is NOT a brand of AUX-1.0. It has its own repo, its own AWS box, its own MongoDB, its own domain. It shares NOTHING at runtime with Carlos Artiles, Aurex Network, or ACapital Group.

- The **codebase was forked from the AUX-1.0 CMS core** (React 19 + FastAPI + Motor + MongoDB) and stripped of every brand theme and unrelated module (KMS, News, Morning Brief, PMS, LMS, MMS). We keep only the proven engine: members/auth, hero-canvas slides, geo, CMS admin, i18n, contact — everything the GEM2i plan depends on. We keep the **work methodology, tech stack, workflow, and culture**; we keep NONE of the other brands' content or servers.
- **NEVER deploy Carlos / Aurex / Acapital here. NEVER touch their boxes** (34.238.109.173 / 18.232.233.16 / 52.55.141.150). This box (34.198.159.54) hosts ONLY gem2i.

| Field | Value |
|---|---|
| Domain (dev/beta) | **beta.gem2i.com** |
| Server (AWS Lightsail) | **34.198.159.54** (SSH 22 / HTTP 80 / HTTPS 443) — a snapshot-clone of the beta-carlos box, wiped clean and re-provisioned for gem2i only |
| SSH key | `C:\2026\Acapitalgroup.com_Emergent_Claude\Instancias-Keys-SSH\Gem2i-LightsailDefaultKey-us-east-1.pem` (user `ubuntu`) |
| Backend port (internal) | **8050** |
| systemd service | **gem2i-backend** |
| Deploy dir | **/opt/beta.gem2i.com** |
| MongoDB | **gem2i_cms** |
| Mongo collection prefix | **gem_*** (secrets in `gem_config`, NEVER `settings` — house rule) |
| Public theme | **gem2i** (dark entertainment look) |
| Legacy source (PHP, read-only) | `gem2ica_production` MySQL, backed up in `C:\2026\Acapitalgroup.com\gem2i.com\__bases_de_datos\` (for the content ETL only) |

---

## WORKING RULES — FULL AUTONOMY

- Execute commands, edits, and deployments **without asking for permission** — EXCEPT destructive server actions (the one-time clean/provision), which require an explicit GO.
- When told to "deploy" or "publish," run `deploy_beta_gem2i.ps1 -y` from the project root.
- Read a file before editing it. After every deploy, confirm HTTP 200 on the health check.
- Never commit `reference/local-only/`, `__bases_de_datos/`, or any credential/key file.

---

## DESIGN SKILLS — MANDATORY FOR ALL UI WORK

Same doctrine as the parent project. Three design skills must be present and **used** for any UI/frontend/visual work (`.claude/skills/`):
1. **Emil Kowalski** — `emil-design-eng` (+ `review-animations`) — UI polish, motion craft.
2. **Impeccable** — `impeccable` (`/impeccable`) — polish/audit/critique + PostToolUse detector hook.
3. **Taste** — `design-taste-frontend` — anti-slop frontend framework.

Do NOT hand-roll UI/CSS in isolation — consult these skills first. Skills load at session START; a freshly installed skill needs a Claude Code restart. Reinstall via `npx skills experimental_install` / `npx impeccable install`.

---

## TECH STACK

React 19 + TailwindCSS + Shadcn/UI + @dnd-kit · FastAPI + Motor + Pydantic · MongoDB · JWT auth · Stripe (CMS-managed keys) · CRA + craco · i18n `useT()` EN/ES. (Full detail in `memory/ARCHITECTURE.md`.)

## ESTABLISHED CONVENTIONS (inherited)

- **i18n:** `const tt = useT()`; wrap display values; strict mode (no cross-locale fallback). Rich text via `normalizeRichText` + `dangerouslySetInnerHTML`.
- **CSS variables:** never hardcode hex in components; use `var(--color-*)` (public theme = the `website` color group). 
- **Secrets:** app secrets live in `gem_config` (Mongo), never in `settings`, never in the repo.
- **Member actions read identity from JWT only** — never from a client-posted membership id.

---

## KEYWORD SHORTCUTS (same culture as the parent project)

| Keyword | Action |
|---|---|
| **START** | ① `git pull origin main` (once the repo exists), ② report what's new, ③ do READ. |
| **FINISH** | ① do SAVE, ② update the tracker claim header, ③ `git add`+commit, ④ `git push origin main`, ⑤ confirm. **Never deploys.** |
| **SYNC** | Read-only `git fetch` + compare local vs origin; report. Changes nothing. |
| **HISTORY** | Recent commits in plain language. |
| **READ** | Read `CLAUDE.md` + every file in `memory/` + the two trackers. |
| **SAVE** | Update `memory/` to record this session (features, decisions, deploy state, issues). No push. |
| **STATUS** | Latest deployed changes, git HEAD, server health, pending work. |
| **DEPLOY** | Publish to beta.gem2i.com → `deploy_beta_gem2i.ps1 -y`. A deliberate, separate act; FINISH never deploys. |
| **CLEAR** | Ensure memory/trackers saved (run SAVE if not), warn on un-pushed commits, then say it's safe to `/clear`. |

---

## GITHUB & TEAM

- Repo: **https://github.com/anthonyguimack/Gem2i.com** (remote `origin`) — its own GitHub repo, independent of AUX-1.0. Branch **`main`** = single source of truth (fast-forward pushes).
- Never embed a token in a URL or commit; credentials only in Git Credential Manager / a password manager.
- **Two-developer workflow** (same culture as the AUX brands): Anthony + a collaborator both clone this repo, run commands, and deploy. `origin/main` is the sync channel. Full protocol + what each dev needs (repo, skills reinstall, SSH key) → `work-plans-MD/TEAM_COLLABORATION.md`. START and FINISH bundle the git sync so neither ever works on a stale version.
- **Collaborator deploy access:** the deploy/provision scripts resolve the SSH key as `Gem2i-...pem` → `$env:GEM2I_SSH_KEY` → `~/.ssh/id_ed25519`, so the collaborator uses their own authorized key or points `GEM2I_SSH_KEY` at a copy of the `.pem`.

---

## THE .ps1 SCRIPTS

- `provision_gem2i_box.ps1` — **one-time** box lifecycle. `-Inventory` (safe, read-only report), `-Clean` (wipe the cloned brand apps/certs/services, keep runtimes), `-Standup` (create the fresh gem2i instance). Destructive modes are IP-guarded and require an explicit confirmation switch.
- `deploy_beta_gem2i.ps1` — **ongoing** smart deploy (git-diff since last stamp; upload → build → restart → health check → auto-rollback on failure). Standalone, no chains.
