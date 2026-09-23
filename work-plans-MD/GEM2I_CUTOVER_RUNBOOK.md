# GEM2I_CUTOVER_RUNBOOK.md — Fase 7: paso de gem2i.com al stack nuevo

```
ESTADO     : PREPARADO (2026-09-23, sesión 6). No ejecutado. Requiere GO del dueño.
CAJA NUEVA : 34.198.159.54 · /opt/beta.gem2i.com · gem2i-backend (:8050) · MongoDB gem2i_cms
CAJA VIEJA : 18.208.85.155 (Plesk, PHP + MySQL gem2ica_production) — se CONGELA, no se borra
```

> Pasos marcados **[HUMANO]** necesitan a una persona (DNS, credenciales, decisiones, acceso a la caja vieja).
> Todo lo demás lo puede ejecutar Claude con GO explícito. Nunca tocar las cajas de Carlos/Aurex/Acapital.

---

## 0. Condiciones previas (todas antes de fijar fecha)

| # | Condición | Quién | Estado 2026-09-23 |
|---|---|---|---|
| P1 | Walk-through de Anthony/operador en beta terminado (cada observación = un commit pequeño) | [HUMANO] | Pendiente |
| P2 | e2e con cuenta real: login de un miembro legacy con su contraseña ORIGINAL, alta con código/QR, guest list real, compra sandbox de ticket | [HUMANO] | Pendiente (Claude no crea cuentas ni inicia sesión) |
| P3 | SMTP operativo (llegan: pase de guest list, ticket, reset, Waiting List) | [HUMANO] verificar buzón | SMTP + operator email configurados |
| P4 | Stripe en **modo live**: clave live en CMS → Settings → Stripe; webhook de Stripe apuntando a `https://gem2i.com/api/public/gem/payment-webhook` (+ `webhook_secret` en `gem_config {key:'payments'}`) | [HUMANO] (credenciales) | Pendiente |
| P5 | Textos de contenido (About/Travels/Services/Partners/Media/Works/Privacy/**Terms** — hoy dice "Welcome to Legacy Consulting") | [HUMANO] contenido | Pendiente |
| P6 | Paletas CMS (Theme Colors → My Account / Enrollment) y menú de My Account sin ítems muertos | [HUMANO] config | En curso |
| P7 | Reglas de puntos (B3/B5) — **no bloquea**: los valores por evento ya están migrados tal cual | [HUMANO] | Aplazado por el dueño |
| P8 | TTL del registro DNS de gem2i.com bajado a 300 s **24 h antes** | [HUMANO] DNS | — |
| P9 | Acceso a la caja vieja para el volcado final (mysqldump) y para congelarla | [HUMANO] (desde esta máquina el puerto 22 no responde) | — |

---

## 1. Ventana de corte (orden exacto)

### 1.1 Congelar el sitio viejo — [HUMANO]
Poner gem2i.com (PHP) en mantenimiento o, como mínimo, cerrar registro, compras y guest list. A partir de aquí nada nuevo se escribe en MySQL.

### 1.2 Volcado final de la BD vieja — [HUMANO]
En la caja vieja: `mysqldump --no-tablespaces --single-transaction gem2ica_production | gzip > gem2ica_production_CUTOVER.sql.gz` y copiarlo a la máquina que corre la ETL (misma receta que `__bases_de_datos`, ver `reference/GEM2I_LEGACY_SCHEMA_PHASE2.md`).

### 1.3 Respaldo completo de la BD nueva
```bash
ssh ubuntu@34.198.159.54 "mongodump --db gem2i_cms --gzip --archive=/opt/_port_backups/gem2i_cms_PRE_CUTOVER.gz && ls -la /opt/_port_backups/"
```

### 1.4 ETL etapa 1 (local, contra el volcado restaurado en MariaDB `gem2i_etl_src`)
```bash
python scripts/gem2i_etl_catalogs.py   # → reference/local-only/etl_out/*.jsonl
python scripts/gem2i_etl_members.py    # bcrypt en memoria (D2): la contraseña en claro nunca se guarda
python scripts/gem2i_etl_history.py
```

### 1.5 Imágenes nuevas del sitio viejo — [HUMANO] acceso
Copiar caja-a-caja las imágenes subidas después del 2026-07-17 (`/var/www/vhosts/gem2i.com/httpdocs/<carpetas legacy>` → `/opt/beta.gem2i.com/backend/uploads/gem2i/legacy/`), mismo método que la sesión 3 (clave temporal, borrarla al terminar).

### 1.6 ETL etapa 2 (en la caja) — ORDEN y comportamiento del delta
```bash
scp reference/local-only/etl_out/*.jsonl scripts/gem2i_load_*.py ubuntu@34.198.159.54:/opt/beta.gem2i.com/scripts/   # (etl_out/ dentro de scripts/)
cd /opt/beta.gem2i.com
backend/venv/bin/python scripts/gem2i_load_catalogs.py --in scripts/etl_out --dry-run
backend/venv/bin/python scripts/gem2i_load_catalogs.py --in scripts/etl_out
backend/venv/bin/python scripts/gem2i_load_members.py  --in scripts/etl_out --dry-run
backend/venv/bin/python scripts/gem2i_load_members.py  --in scripts/etl_out
backend/venv/bin/python scripts/gem2i_load_catalogs.py --in scripts/etl_out   # 2ª pasada: resuelve follows de miembros nuevos
backend/venv/bin/python scripts/gem2i_load_history.py  --in scripts/etl_out --dry-run
backend/venv/bin/python scripts/gem2i_load_history.py  --in scripts/etl_out
```
**Qué hace el delta (loaders endurecidos 2026-09-23):**
- Catálogos / sub-docs de eventos: **no pisan lo editado en el CMS** (todo doc con `updated_at`, que la ETL nunca escribe). Hoy: 2 venues desactivados a mano. `--overwrite-edited` fuerza la sobrescritura.
- Miembros: los NUEVOS entran con contraseña bcrypt (D2) y **en el nivel más bajo (Nivel 0)**; los ya migrados refrescan perfil **salvo** que lo hayan editado en el sitio nuevo. ⚠ **Contraseña y estado de los ya migrados NUNCA se reescriben**: quien cambió su contraseña o fue desactivado en el sitio viejo después del 2026-07-17 conserva lo que había en la migración → contraseña: "¿Olvidaste tu contraseña?"; bajas: revisarlas a mano en CMS → Members.
- Historial de transacciones y puntos: upsert por id legacy (idempotente).

### 1.7 Comprobaciones de datos
```js
// mongosh gem2i_cms
db.members.countDocuments({registration_source:"gem2i_legacy"})        // ≥ 1736 + nuevos
db.members.countDocuments({level_id:{$in:[null,""]}, role:{$ne:"admin"}, cms_roles:{$ne:"role_admin"}})  // debe ser 0
db.members.aggregate([{$group:{_id:"$membership_number",n:{$sum:1}}},{$match:{n:{$gt:1}}}]).toArray()   // debe ser []
```
Si la 2ª da > 0: `db.members.updateMany({level_id:{$in:[null,""]}, role:{$ne:"admin"}, cms_roles:{$ne:"role_admin"}}, {$set:{level_id:"level_0"}})`.

### 1.8 Dominio en la caja nueva
1. **nginx**: añadir `gem2i.com www.gem2i.com` al `server_name` del vhost `beta.gem2i.com` (mismo root/proxy) → `sudo nginx -t && sudo systemctl reload nginx`.
2. **DNS — [HUMANO]**: registros A de `gem2i.com` y `www` → `34.198.159.54`.
3. **Certificado** (cuando el DNS ya resuelva): `sudo certbot --nginx -d gem2i.com -d www.gem2i.com --non-interactive --agree-tos --redirect`.
4. **Backend** `.env`: `CORS_ORIGINS` = añadir `https://gem2i.com,https://www.gem2i.com` → `sudo systemctl restart gem2i-backend`.
5. **Frontend** `.env` en la caja: `REACT_APP_BACKEND_URL=https://gem2i.com` (hoy `https://beta.gem2i.com`, se hornea en el build) → rebuild (`deploy_beta_gem2i.ps1` o `yarn build` en la caja).
6. **CMS**: Settings → General → Site URL = `https://gem2i.com` (QR e invitaciones usan este valor). ⚠ QR ya generados apuntan a beta: se regeneran solos al abrir Invite Code.
7. **Stripe**: webhook a `https://gem2i.com/api/public/gem/payment-webhook` (P4).
8. **Correo**: remitente del dominio con SPF/DKIM válidos (revisar que no caigan en spam).

### 1.9 Verificación (test de salida de la Fase 7)
- `https://gem2i.com/api/health` 200 · home, `/events`, `/festivals`, `/artists`, `/venues` 200 y sin errores de consola.
- **[HUMANO]** login de un miembro legacy real con su contraseña de siempre; un flujo real de guest list (pase + QR + email).
- `https://beta.gem2i.com` sigue respondiendo (misma app) hasta decidir redirigirlo.

---

## 2. Rollback (documentado — exigido por la Fase 7)

| Situación | Acción | Tiempo |
|---|---|---|
| Fallo grave tras el cambio de DNS | **[HUMANO]** A de `gem2i.com` → IP de la caja vieja (18.208.85.155) y quitar el mantenimiento del PHP. La caja vieja está intacta (solo congelada) | TTL (300 s) |
| Datos del delta mal cargados | `mongorestore --gzip --archive=/opt/_port_backups/gem2i_cms_PRE_CUTOVER.gz --drop --nsInclude='gem2i_cms.*'` y repetir 1.6 | ~minutos |
| Solo el código | `deploy_beta_gem2i.ps1` hace auto-rollback si falla el health check; o redeploy del commit anterior | ~5 min |

⚠ Cualquier escritura hecha en el sitio nuevo entre el corte y un rollback por DNS (altas, compras) **no existe en el viejo**: exportarlas antes de volver (`gem_transactions` con `legacy` ausente y `members` con `created_at` posterior al corte).

---

## 3. Después del corte
1. **Rotar los secretos** que exponía el PHP viejo (SES SMTP, MySQL, Facebook, reCAPTCHA) — riesgo §8 del plan, sigue abierto.
2. Decidir el destino de `beta.gem2i.com` (mantener como staging, o 301 → gem2i.com).
3. Decisión de apagado de la caja vieja (no antes de 30 días sin incidencias; conservar el volcado final).
4. Renovación de certificados: certbot ya tiene el timer; verificar `sudo certbot renew --dry-run`.
