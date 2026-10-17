# Auditoría A Capital → GEM2I

> Fecha: 2026-10-16 · Solo lectura (no se modificó código) · Fuente: `AUX-1.0-aurexnetwork-complete` @ `1775e05` · Destino: `Gem2i.com` @ `34df724` · Línea base del último port: Carlos @ `8a0d4dd` (2026-09-23).

---

## 1. Resumen ejecutivo y porcentaje estimado de avance

- **A Capital desde el último port:** 267 commits nuevos (8a0d4dd..HEAD). Backend 25.5k líneas (routes/utils/models) vs 9.1k en GEM2I; frontend 293 vs 185 archivos JS/CSS.
- **Avance de GEM2I vs su plan (`GEM2I_MIGRATION_PLAN.md`):** **~85 % estimado.** Fases 0–5 en vivo en beta; Fase 6 casi completa (falta e2e con cuentas, reglas de puntos B3/B5); Fase 7 con runbook listo, pendiente de GO humano.
- **Dependencias:** frontend idéntico (React 19, CRA 5.0.1, Tailwind 3.4). Backend: solo faltan `html5lib==1.1` y `tinycss2==1.5.1` en GEM2I. **Sin conflictos de versión.**
- **Urgente:** `/api/public/settings` de GEM2I expone datos internos (verificado en vivo). A Capital ya lo corrigió (`4ce2d39`).
- **Lo más valioso a traer:** fix de seguridad, actualizaciones del núcleo CMS (enrollment, membership, email, roles, rich text), calendario global + iCal + notificaciones, utilidades de admin, My Account 2.0 (con piel GEM2I).

## 2. Inventario de lo construido en A Capital (por módulo)

| Módulo | Backend | Frontend / CMS |
|---|---|---|
| Núcleo CMS | admin_content, admin_tools, roles, email_templates, landing, public | SettingsManager, RolesManager, HeroSlideForm (Clonar), RichTextEditor, ImageAdjust, DataTable, SortableList, SectionLayoutPicker |
| Membresía | auth, membership, enrollment, paid_membership, utils/membership_prefix, product_access, level_access | My Account 2.0 (34 archivos `pages/myaccount2`), MembershipPageManager, MembershipSubscriptionsManager |
| Calendario | calendar_events, calendar_helpers, ical | GlobalEventsManager, GlobalCalendar, EventDetail, CalendarSync, VelzonCalendar, Ma2DatePicker, BlockedDatesManager |
| Notificaciones | `/member/notifications*` (en calendar_events) | campana My Account |
| Pagos | payments (webhook firmado + re-fetch, etiqueta de marca), coupons, bundles, payouts, utils/stripe_helpers | AdminCouponsManager, AdminBundlesManager, PlatformSubscriptions* |
| Puntos | points (ledger MMS), utils/points | MemberPoints, PointsRewards |
| Correo | mail, utils/mailbox, mail_ingest, email_render (identidad por marca) | MailManager, Mail (My Account) |
| Catálogos de negocio | companies, opportunities, pros, reports, wealth_scorecard | CompaniesManager, OpportunitiesManager, EarningsCalendarPage, Opportunity* |
| Mentoría / LMS | mentoring, mentor_slots | MentorSlotTemplates, MentoringFields, Mentorship* |
| Contenido editorial | news, morning, docs, iireport, kms/, aurex_sections | NewsPage, DocumentationManager, AurexSectionsManager, IIReportTradingDeskPage |
| Productos hermanos | ims, mms_admin | ImsManager, MmsManager |
| Temas | — | «Moderno» (Modern*), Aurex, PersonalBrand |
| Transversal | rate_limit, captcha, referral, x_poster | responsive (táctil 44 px, sidebar off-canvas) |

## 3. Tabla comparativa

| Funcionalidad | A Capital | GEM2I | Clasificación | Esfuerzo |
|---|---|---|---|---|
| Filtro de secretos en `/public/settings` | lista deny + strip recursivo | lista corta; expone smtp_host, admin_email, email_to/from, operator_email | 🔄 | S |
| Webhook Stripe en `payments.py` | firma + re-fetch + etiqueta marca | helper antiguo (`handle_webhook`) | 🔄 (por confirmar uso real) | S |
| Webhook de entradas (`gem_tickets`) | — | verificado | ✅ | — |
| Enrollment (inscripción) | 571 líneas, ~1.1k líneas de diff | versión del port | 🔄 | M |
| Membership | 1941 líneas | 1619, ~580 líneas de diff | 🔄 | M |
| Admin content / admin tools | actualizados | ~400 / 26 líneas de diff | 🔄 | S/M |
| Plantillas y render de email (identidad por marca) | sí | versión anterior | 🔄 ⚠️ | M |
| Roles (seed sin duplicados) | sí | no | 🔄 | S |
| product_access / membership_prefix | actualizados | anteriores | 🔄 | S |
| level_access / member_capabilities / captcha / rate_limit | iguales | iguales | ✅ | — |
| RichTextEditor | actualizado | ~99 líneas de diff | 🔄 | S |
| ImageAdjust | actualizado | ~660 líneas de diff | 🔄 | S/M |
| HeroSlideForm (Clonar slide) | sí | no | 🔄 | S |
| SettingsManager / RolesManager / EmailManagement | actualizados | anteriores | 🔄 | M |
| Login/registro/reset de miembro | actualizados | anteriores | 🔄 ⚠️ | M |
| DataTable, SortableList, SectionLayoutPicker, SocialLinksCard, scrollBelowHeader | sí | no | ➕ | S |
| Ma2DatePicker / VelzonCalendar | sí | campo `date` simple | ➕ ⚠️ | S/M |
| Calendario global + iCal + CalendarSync | sí | no (eventos sí, vista calendario no) | ➕ ⚠️ | M |
| Notificaciones de miembro | sí | no | ➕ | S/M |
| Cupones | sí | no | ➕ ⚠️ (requiere decisión) | M |
| Membresía de pago / suscripciones | sí | no | ➕ (requiere decisión) | M |
| My Account 2.0 | única versión | GEM2I en 1.0 | ➕ ⚠️ | L |
| Puntos (vista PointsRewards) | ledger MMS | ledger propio GEM2I | ⚠️ (solo UI) | M |
| Responsive (táctil 44 px, drawer) | sí | parcial (sin overflow a 375 px) | 🔄 | S/M |
| Conferencias / festivales | Calendar/Conferences | `gem_conferences`, `gem_festivals` | ✅ | — |
| Reading List / Books | actualizados | existen, ~240/190 líneas de diff | 🔄 | S |
| Gallery / Maps / Portfolio / About managers | actualizados | anteriores (contienen piezas de tema) | 🔄 ⚠️ | M |
| HomePage / HeroSection / BlockRenderer / Footer | temas de marca | tema gem2i | ⚠️ no copiar | — |
| Patrón cuenta regresiva / calendario con logos (Opportunities, Earnings) | sí | no | ➕ ⚠️ (patrón, no contenido) | S/M |
| KMS, News, Morning Brief, iiReport, IMS, LMS, PMS, MMS | sí | no | ❌ | — |
| Mentoring, mentor slots, bundles, payouts | sí | no | ❌ | — |
| Companies, Opportunities, Pros, Wealth Scorecard, Docs | sí | no | ❌ (contenido financiero) | — |
| Mail (buzón IMAP/S3) | sí | no | ❌ por ahora (infra + credenciales) | L |
| Temas Moderno / Aurex / PersonalBrand | sí | no | ❌ | — |
| Ledger de puntos MMS | sí | ledger propio | ❌ (choca con R2) | — |
| «IMPULSOS» | no encontrado como módulo | — | Por confirmar | — |

## 4. Componentes reutilizables con adaptación necesaria

| Componente | Qué cambia |
|---|---|
| Calendario global (GlobalCalendar, ical, CalendarSync) | **Contexto:** leer `gem_events` (y festivales/conferencias) en vez de `calendar_events`; **estilos:** paleta `--ma-*`/tema oscuro; **textos:** EN/ES con `useT()`. |
| Ma2DatePicker / VelzonCalendar | **Estilos:** reemplazar `ma2Theme`/`velzon-theme.css` por variables gem2i. |
| Notificaciones | **Contenido:** eventos de pase/entrada/lista de espera; **estilos:** header de My Account GEM2I. |
| Cupones | **Contexto:** aplicar a `gem_tickets` (checkout por tier) en vez de LMS/membresía; respetar economía {cost, profit, commissions[6]}. |
| My Account 2.0 | **Estilos:** piel gem2i; **contenido:** menú `myaccount_nav` sin items de Carlos; conservar InviteCode, MyCommunity (privacidad b), pases/entradas, nombre legal. |
| PointsRewards | **Contexto:** leer `gem_points_history` / catálogo `points_actions`, no el ledger MMS. |
| Email (identidad por marca) | **Estilos:** modo «Use the brand theme» con colores gem2i; plantillas `gem_pass`/`gem_ticket` intactas. |
| Patrón cuenta regresiva (Opportunities) | **Contexto:** apertura/cierre de lista de invitados o venta de un evento. |
| Managers Gallery/Maps/About/Portfolio | Traer solo la lógica del CMS; descartar selectores de estilo «Moderno». |

## 5. Identidad de GEM2I que debe preservarse

- Tema público `gem2i` (oscuro, entretenimiento) y `components/gem2i/*` (Header, Footer, ContactPanel, CookieNotice, WaitingListModal, widgets de lista y entradas, diálogo de nombre legal).
- Variables CSS (`--color-*`, `--ma-*`), nunca hex en componentes.
- Prefijo de colecciones `gem_*`; secretos en `gem_config`; prefijo de membresía `GEM`.
- Rutas y modelos propios: `gem_catalogs`, `gem_content`, `gem_passes`, `gem_tickets`, `GemCatalogManager`, `GemTransactionsManager`.
- Ledger de puntos propio (migrado del legado) y comisiones [30,20,15,10,5,2].
- Puerta de nombre legal (B7), stock aritmético, QR e-passes.
- i18n EN/ES estricto; identidad de miembro solo desde JWT.
- Aislamiento total: nada en runtime compartido con Carlos/Aurex/ACapital.

## 6. Plan de migración por fases

| Fase | Contenido | Depende de | Riesgo |
|---|---|---|---|
| **F0 — Seguridad** | Filtro deny + strip recursivo en `/public/settings`; revisar/actualizar webhook de `payments.py` | — | Bajo; verificar que el frontend no lea campos que se ocultan |
| **F1 — Núcleo CMS** | RichTextEditor, ImageAdjust, HeroSlideForm (Clonar), DataTable/SortableList/SectionLayoutPicker, roles (seed seguro), email_render + plantillas, SettingsManager, admin_content | F0 | Medio: archivos con hunks de marca → port por hunks como en `PORT_FROM_CARLOS_PLAN.md` |
| **F2 — Membresía** | enrollment, membership, product_access, membership_prefix, login/registro/reset | F1 | Medio: datos reales (1,736 miembros), probar en beta |
| **F3 — Calendario + notificaciones** | Vista calendario sobre `gem_events`, iCal, CalendarSync, notificaciones | F1 | Medio: adaptación de modelo |
| **F4 — My Account 2.0** | Migrar a 2.0 con piel gem2i; PointsRewards sobre ledger GEM | F2, F3 | Alto: superficie grande de UI; usar las 3 skills de diseño |
| **F5 — Comercio opcional** | Cupones en entradas; membresía de pago | Decisión del owner, Stripe live | Medio |
| **F6 — Responsive / pulido** | Táctil 44 px, drawer, Reading List/Books, Gallery/Maps | F4 | Bajo |

Método recomendado: igual que el port de Carlos — diff archivo por archivo, separar hunks genéricos (portar) de hunks de marca/KMS/MMS (dejar), build verde y deploy a beta por lote.

## 7. Riesgos, conflictos de versiones y decisiones pendientes

- **Versiones:** sin conflictos; añadir `html5lib`, `tinycss2` solo si se trae código que los use (Por confirmar cuál).
- **Divergencia grande en archivos de tema** (HomePage, HeroSection, BlockRenderer, Footer): alto riesgo de pisar la identidad si se copian enteros.
- **Puntos:** el ledger MMS de A Capital es incompatible con el ledger de GEM2I; no migrar el motor.
- **Datos en vivo:** cambios de membership/enrollment afectan a 1,736 miembros migrados → probar en beta antes de cualquier corte.
- **Corte de dominio pendiente** (Fase 7): conviene hacer F0 antes del corte.
- **Decisiones pendientes:**
  1. ¿Qué son «IMPULSOS»? (no existe como módulo; existe el subdominio `impulsainvestmentsacapitalgroup`) — Por confirmar.
  2. ¿Cupones en entradas de GEM2I?
  3. ¿Membresía de pago en GEM2I?
  4. ¿My Account 2.0 antes o después del corte?
  5. ¿Buzón Mail interno? (requiere infraestructura y credenciales).

## 8. Siguientes pasos recomendados

1. Ejecutar **F0** (seguridad) y desplegar a beta.
2. Responder las decisiones pendientes de §7.
3. Abrir un plan de port detallado por módulo (estilo `PORT_FROM_CARLOS_PLAN.md`) para F1–F3, con base en `1775e05`.
4. Planificar F4 (My Account 2.0) con las skills de diseño (emil-design-eng, impeccable, design-taste-frontend).
5. Mantener el corte de dominio (Fase 7) según `GEM2I_CUTOVER_RUNBOOK.md`, idealmente después de F0.
