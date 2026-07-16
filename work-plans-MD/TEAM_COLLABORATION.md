# TEAM_COLLABORATION.md — gem2i

> **CLAIMED BY:** (shared doc — no single claimant)
> **STATUS:** active protocol
> **LAST SYNC:** 2026-07-15

gem2i is an **isolated product** but runs the **same two-developer workflow** as the AUX brands. `origin/main` on **https://github.com/anthonyguimack/Gem2i.com** is the single source of truth. Anyone (Anthony or the collaborator) can pull the latest, run commands, and deploy to the box.

## Daily rhythm
- **Session START (everyone):** type **START** → `git pull origin main` + a plain-language "what's new" report + READ (CLAUDE.md + memory/ + the trackers).
- **Session FINISH (everyone):** type **FINISH** → SAVE (update memory/) + update the touched tracker's claim header + `git add`/commit + `git push origin main` + confirm the push. **FINISH never deploys.**
- **SYNC / HISTORY / STATUS / SAVE / READ / CLEAR** — as defined in CLAUDE.md.
- **DEPLOY** is always a separate, deliberate act: `deploy_beta_gem2i.ps1 -y`.

## Claim headers
Every tracker in `work-plans-MD/` carries `CLAIMED BY / STATUS / LAST SYNC`. Only the claimant edits code under that tracker; release it by writing the exact next action in STATUS and clearing CLAIMED BY. This prevents two people editing the same area.

## What each developer needs
1. **The repo:** `git clone https://github.com/anthonyguimack/Gem2i.com`.
2. **The design skills** (not committed — regenerate per machine): `npx skills experimental_install` + `npx impeccable install` (uses the lock files); restart Claude Code so they load.
3. **SSH access to the box** (`34.198.159.54`, user `ubuntu`) for deploys. The deploy/provision scripts resolve the key in this order:
   - Anthony's `Gem2i-LightsailDefaultKey-us-east-1.pem` at the hardcoded path, else
   - `$env:GEM2I_SSH_KEY` (set this to your own key path), else
   - `~/.ssh/id_ed25519` (if your key is authorized on the box).
   The collaborator either sets `GEM2I_SSH_KEY` to a copy of the `.pem`, or has their own public key added to the box's `~ubuntu/.ssh/authorized_keys` (Anthony adds it once — same as the brand boxes).

## Deploy protocol
- **First-time / full re-sync of the box:** `provision_gem2i_box.ps1 -Standup -IUnderstand` (uploads the whole tree, rebuilds).
- **Ongoing:** `deploy_beta_gem2i.ps1 -y` (git-diff since `.last-deploy-gem2i`; uploads changed files, conditional pip/yarn/build, restart, health check, auto-rollback). The stamp file `.last-deploy-gem2i` is **per-machine** (gitignored) — each developer's first deploy from a clean clone re-syncs from their last-known point; when in doubt, run `-Standup` to force a full re-sync.

## Never commit
`reference/local-only/`, `__bases_de_datos/`, `.env`, `*.pem`, or any credential. All are gitignored.

## Isolation reminder
This box hosts **only** gem2i. Never deploy carlos/aurex/acapital here; never point the provision/deploy scripts at the brand boxes (they hard-refuse those IPs).
