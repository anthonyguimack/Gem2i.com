# DECISIONS.md — gem2i

## D-GEM-2026-01 — Isolation (2026-07-15, Anthony)
gem2i is a **completely isolated product**: own repo, own AWS box (34.198.159.54), own MongoDB (`gem2i_cms`), own domain (beta.gem2i.com). It shares nothing at runtime with Carlos/Aurex/Acapital and is never deployed alongside them. This RULES the old plan's D1 ("4th AUX brand in the unified codebase") in favor of full isolation. We keep the methodology, tech stack, workflow, and culture only.

## D-GEM-2026-02 — Code origin: fork + strip (2026-07-15, Anthony)
The codebase is **forked from the AUX-1.0 CMS core and stripped** of all brand themes and unrelated modules, rather than scaffolded fresh. Rationale: the GEM2i plan reuses members/hero/geo/CMS-admin/i18n/contact that the engine already provides — forking is the fastest path to parity and matches cloning the runtime-proven server.

## D-GEM-2026-03 — Box = wiped clone (2026-07-15, Anthony)
The box is a snapshot-clone of beta-carlos, chosen to inherit the installed Python/Node/nginx/Mongo/certbot runtimes. Everything brand-specific (app dirs, vhosts, LE certs, custom services, Mongo data) is wiped by `provision_gem2i_box.ps1 -Clean`; runtimes are preserved. Destructive steps are IP-guarded and gated behind `-IUnderstand`, and run only on Anthony's explicit GO.

---

## Carried from GEM2I_MIGRATION_PLAN §9 (D-2026-58, 2026-07-07) — still in force
- **D2 Member merge:** silent bcrypt of legacy plaintext at ETL; existing passwords keep working; no emails, no forced reset; recovery via self-service forgot-password. Plaintext never stored/logged.
- **D3 Payments:** Stripe via CMS-managed keys; provider-verified webhooks (closes the legacy disabled-IPN hole). PayPal retired.
- **D4 Scope:** full Tier A + B before cutover (full-parity doctrine).
- **D6 Language:** EN/ES from day one (`useT()`/`LocalizedField`).
- **D7 Legacy visibility:** migrate ALL history; public surfaces current/recent only.
- **D8 Branding:** keep gem2i identity as-is (pure tech migration, no rebrand).
- **D5 Hosting:** dedicated box — now concrete (34.198.159.54).

## Standing security note
The legacy PHP source carries live secrets (SES SMTP, MySQL, Facebook, reCAPTCHA). Rotate them at cutover time; NEVER copy any into repo/plan/memory.
