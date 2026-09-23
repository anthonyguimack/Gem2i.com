# PORT_FROM_CARLOS_PLAN.md — Portar funcionalidades de Carlos (AUX-1.0) → Gem2i

```
CLAIMED BY : Carlos M. Artiles
STATUS     : ✅ PLAN RECORRIDO COMPLETO 1.A → 1.H (2026-09-23). 70 módulos: 19 hechos · 31 esperando
             humano · 14 saltados · 6 idénticos. Todo lo hecho está DESPLEGADO en beta.gem2i.com y
             verificado (4 deploys GREEN + 1 de corrección). Detalle por módulo en §8; decisiones y
             config pendientes en "PENDIENTES PARA HUMANO" (H1–H17).
             Siguiente paso exacto: Anthony/Carlos revisan H1–H17; lo inmediato es config de CMS
             (H1 Site URL + SMTP, H6 Operator Email, H11 paleta Enrollment, H4 paleta My Account)
             y la prueba e2e H3.
LAST SYNC  : 2026-09-23 · Carlos HEAD 8a0d4dd (= origin/main; vs 6d47d6f solo stamps+memory,
             sin código → §2.3 sigue válida) · Gem2i HEAD 0e1357e (= origin/main)
```

### Resultado final (2026-09-23)

| Estado | Módulos (nº §1) | Motivo resumido |
|---|---|---|
| ✅ **Hecho** (19) | 1 Auth · 2 Miembros · 3 Roles · 4 Admin por rol · 6 Hero CTA · 11 Landing/Waiting List · 13 Email templates · 14 Captcha · 15 Settings · 20 Enrollment · 21 Invite Code · 22 My Community · 23 My Sponsor · 24 Perfil (campos ocultables) · 25 My Account layout · 27 Prefijo dinámico · 31 Lead capture · 46 ImageAdjust · 47 Imágenes por defecto | Portado solo lo genérico; 1–3, 13, 15 y 25 parciales (lo atado a KMS/MMS/gobernanza/temas quedó fuera). **Bugs reales de Gem2i arreglados de paso:** logins de miembros no se registraban (1); números de membresía podían duplicarse (2); `/membership-enrollment` sin backend (20); sponsor mostrado como "AUX-n" (2) |
| ⏳ **Esperando humano** (31) | 26 · 29 · 30 · 32–38 · 40–42 · 44 · 45 · 48–52 · 54 · 55 · 57–61 · 62 · 63 · 66 · 69 | Contradicen decisiones registradas (strip D-GEM-2026-02, marca D8), necesitan credenciales/subdominios/infra, chocan con el libro de puntos de Gem2i (R2) o dependen de módulos no migrados (R14). Ver H7–H17 |
| ⏭ **Saltado** (14) | 5 · 7 · 8 · 9 · 10 · 16 · 18 · 19 · 28 · 39 · 43 · 64 · 68 · 70 | No aportan a Gem2i: el diff de Carlos es de sus temas (PB/Aurex/PCP), de My Account 2.0, del KMS, o de cosas que Gem2i no muestra |
| = **Idéntico** (6) | 12 · 17 · 53 · 56 · 65 · 67 | Ya igual en ambos repos |

> **Plan portable.** Todas las rutas están escritas **relativas a la raíz de cada repo**:
> - `<CARLOS>` = raíz del repo **AUX-1.0-aurexnetwork-complete** (proyecto madre)
> - `<GEM>`    = raíz del repo **Gem2i.com** (proyecto destino)
>
> Nada depende de la ruta absoluta de ninguna máquina. Ver §7 para lo que el colaborador debe ajustar.

---

## 0. Contexto que hay que saber antes de nada

- **Gem2i NO es una marca de AUX-1.0**: es un producto aislado (repo, caja `34.198.159.54`, DB `gem2i_cms`, dominio `beta.gem2i.com`, puerto backend **8050**, servicio `gem2i-backend`). Ver `<GEM>/CLAUDE.md` y D-GEM-2026-01/02.
- **Gem2i nació como fork de Carlos**: el 2026-07-15 se copió el núcleo CMS de Carlos en el commit **`9a89d8f`** ("feat(mms): Phase 6…") y se **eliminó** todo lo de marca y los módulos KMS/News/Morning Brief/PMS/LMS/MMS/Companies/Opportunities. Los imports rotos se reemplazaron por **shims no-op** (`backend/utils/kms_sync.py`, `lms_roles.py`, `mms_roles.py`, `pms_roles.py`, `mms_events.py`).
- Desde entonces **ambos proyectos evolucionaron por separado**: Carlos ~2 meses más de trabajo (s65→s130); Gem2i hizo sus Fases 1–5 (catálogos de entretenimiento, guest list/QR, e-ticketing Stripe, merge de 1.737 miembros legacy, historial de puntos/comisiones).
- Por eso "copiar un módulo" casi nunca es solo copiar sus archivos propios: casi siempre toca **archivos compartidos** (`server.py`, `App.js`, `AdminLayout.js`, `api.js`, `cms_sections.py`…) que **Gem2i ya modificó** → esos se **fusionan a mano**, nunca se sobrescriben (§2.3).

---

## 1. Inventario completo de funcionalidades de Carlos (catálogo, sin filtrar)

> Solo catálogo. **Anthony decide** qué migrar: marca `[x]` en la columna **Sel.** y el plan §3 se completa para esos.
> Columna **En Gem2i** = estado actual en el destino (informativo, no es recomendación).

### 1.A Núcleo CMS (el "motor") — Gem2i ya lo tiene en su versión del 15-jul

| Sel. | Módulo | Descripción | Ubicación en Carlos | En Gem2i |
|---|---|---|---|---|
| [x] | Auth / Admin login | Login JWT del CMS, Google OAuth, usuarios admin | `backend/routes/auth.py`, `backend/models/database.py`, `frontend/src/pages/admin/AdminLoginPage.js`, `UsersManager.js`, `lib/auth.js` | Sí (modificado: `verify_password` endurecido, login case-insensitive) |
| [x] | Miembros (CRUD admin) | Gestión de miembros, niveles, tipos, logins, firmas | `backend/routes/membership.py`, `admin_tools.py`; `pages/admin/MembersManager.js`, `MemberLevelsManager.js`, `MemberTypesManager.js`, `MemberLogins.js`, `MemberSignatures.js` | Sí (versión 15-jul) |
| [x] | Roles & permisos CMS | Roles del sistema (`role_admin`, `role_author`…) + permisos por sección | `backend/routes/roles.py`, `backend/models/cms_sections.py`, `pages/admin/RolesManager.js`, `Forbidden.js` | Sí (Gem2i modificó `cms_sections.py`) |
| [x] | Admin por rol (`is_admin`) | Un 2º admin se crea asignando el rol Administrator (sin tocar DB) | `backend/models/database.py::is_admin`, `backend/utils/product_access.py` | **No** (Gem2i solo acepta `role=="admin"`) |
| [ ] | Hero canvas + A/B | Slides del hero con coordenadas 700×300, editor visual, test A/B | `routes/hero_ab.py`; `components/HeroSection.js`, `HeroCanvasEditor.js`; `pages/admin/HeroManager.js`, `HeroSlideForm.js`, `HeroAbAnalytics.js`; `lib/heroCoords.js` | Sí (HeroSection muy modificado por Gem2i) |
| [x] | Hero CTA por Acción | CTA del hero con acción Url/Login/Waitlist | `frontend/src/lib/ctaActions.js`, `HeroSlideForm.js` | **No** |
| [ ] | Page Builder / páginas dinámicas | Páginas con bloques y layouts | `components/admin/PageBuilder.js`, `BlockConfigModal.js`, `components/layouts/*`, `pages/DynamicPage.js`, `pages/admin/PagesManager.js`, `lib/layoutDefinitions.js` | Sí |
| [ ] | Section Order | Orden y visibilidad de secciones del home | `pages/admin/SectionOrderManager.js` | Sí |
| [ ] | Contenidos básicos | About, Services, Testimonials, Portfolio, Gallery, Blog, Books | `routes/admin_content.py`, `routes/public.py`; `pages/admin/{About,Services,Testimonials,Portfolio,Gallery,GalleryAlbums,Blog,Books}Manager.js` | Sí (versión 15-jul) |
| [ ] | Geo + Mapas | Países/estados/ciudades + páginas de mapa | `populate_geo.py`, `pages/admin/GeoManager.js`, `MapsManager.js`, `pages/MapDetailPage.js`, `lib/mapConfig.js` | Sí |
| [x] | Landing page + suscriptores | Landing con hero propio, contactos y waiting list | `routes/landing.py`; `pages/LandingPage.js`; `pages/admin/Landing*Manager.js` | Sí |
| [ ] | Contacto | Formulario de contacto + ajustes | `pages/admin/ContactsManager.js`, `ContactSettingsManager.js` | Sí |
| [x] | Email templates + SMTP | Plantillas transaccionales editables | `routes/email_templates.py`, `models/email_templates.py`, `utils/email_render.py`, `pages/admin/EmailManagement.js` | Sí (Gem2i modificó `models/email_templates.py`) |
| [x] | Captcha | reCAPTCHA en formularios públicos | `routes/captcha.py`, `utils/captcha.py`, `components/CaptchaWidget.js` | Sí |
| [x] | SEO / Settings / Backup / Analytics | Ajustes globales, SEO, respaldo de DB, analytics | `pages/admin/SettingsManager.js`, `SeoManager.js`, `BackupManager.js`, `AnalyticsDashboard.js`, `utils/runtime_config.py` | Sí |
| [ ] | Stripe / Checkout / Compras | Pagos Stripe con llaves en CMS, compras | `routes/payments.py`, `utils/stripe_helpers.py`, `pages/CheckoutSuccess.js`, `pages/admin/PurchasesManager.js` | Sí (lo usa `gem_tickets`) |
| [ ] | i18n EN/ES | `useT()`, textos localizados | `lib/i18n.js`, `components/LanguageSwitcher.js`, `components/admin/LocalizedField.js` | Sí |
| [ ] | Personalidades (mini-sitios) | Business/Lifestyle/Personal por ruta + pestañas por personalidad | `utils/personality.py`, `lib/pbPersonality.js`, `components/admin/PersonalityTabs.js` | Sí (parcial) |

### 1.B Membresía, comunidad y My Account

| Sel. | Módulo | Descripción | Ubicación en Carlos | En Gem2i |
|---|---|---|---|---|
| [ ] | Registro / login de miembro | Registro con invite code, login, olvido/reset de contraseña | `pages/myaccount/Member{Register,Login,ForgotPassword,ResetPassword}.js`, `lib/memberAuth.js`, `components/LoginModal.js` | Sí (**muy re-estilizado por Gem2i**) |
| [x] | Enrollment wizard | Alta en 4 pasos configurable desde CMS | `backend/routes/enrollment.py`, `pages/MembershipEnrollment.js`, `pages/admin/EnrollmentFieldsManager.js` | Página sí; **`enrollment.py` y su manager NO** |
| [x] | Invite Code + QR | Generar códigos únicos, enviar invitación, QR de negocio | `pages/myaccount/InviteCode.js`, `routes/membership.py` | **No** (la página) |
| [x] | My Community | Árbol de downline, contadores, perfil del miembro | `pages/myaccount/MyCommunity.js`, `components/TreeNode.js` | **No** (la página; `TreeNode` sí) |
| [x] | My Sponsor | Datos del patrocinador | `pages/myaccount/MySponsor.js` | Sí |
| [x] | Perfil de membresía + biografía | Perfil, campos ocultables (ojo), biografía | `pages/myaccount/MembershipProfile.js`, `UpdateBiography.js` | Sí (versión 15-jul, sin campos ocultables) |
| [x] | My Account layout + navegación | Shell de My Account, menú configurable, Quick Links con SSO | `pages/myaccount/MyAccountLayout.js`, `pages/admin/MyAccountNavManager.js`, `QuickLinksManager.js`, `lib/myAccountBase.js`, `lib/myAccountThemes.js`, `lib/ssoNav.js` | Parcial (sin SSO/temas) |
| [ ] | My Account 2.0 (Velzon) | Clon de My Account con piel Velzon (admin-only) | `pages/myaccount2/*` (incl. `velzon-theme.css`, `ma2Theme.js`) | **No** |
| [x] | Prefijo de membresía dinámico | `settings.aux_prefix` por instancia (`GEM-n`) | `utils/membership_prefix.py`, `scripts/rename_membership_prefix.py` | Parcial (Gem2i ya usa `GEM`, sin el util) |
| [ ] | Prefijo de referido | Sufijo `/<prefix>-<N>` en links compartidos | `backend/utils/referral.py` | **No** |
| [ ] | Gobernanza NIVEL/TIPO/ROL | Acceso por nivel, capacidades por miembro, páginas por nivel | `utils/level_access.py`, `utils/member_capabilities.py`, `utils/site_pages.py`, `lib/sitePages.js`, `scripts/seed_governance_v2.py` | **No** |
| [ ] | Puerta única de productos | Acceso a productos por nivel vía Quick Links | `utils/product_access.py` | **No** |
| [x] | Lead capture | Modal de suscripción → pre-registro bajo sponsor | `utils/leadcapture.py`, `components/WaitingListModal.js`, `lib/viaCapture.js`, `components/InvitedByBanner.js` | util sí; **componentes no** |

### 1.C Puntos, comercio y mentoría

| Sel. | Módulo | Descripción | Ubicación en Carlos | En Gem2i |
|---|---|---|---|---|
| [ ] | Puntos del miembro | Registro de puntos por acción + recalculo | `routes/points.py`, `utils/points.py`, `pages/admin/MemberPoints.js`, `RewardsManager.js`, `pages/myaccount/PointsRewards.js`, `scripts/points_recompute.py` | `utils/points.py` sí (15-jul); **routes/páginas no**. ⚠ Gem2i tiene su propio `gem_points_history` |
| [ ] | eBank / ganancias | Monedero/historial de ganancias del miembro y mentor | `pages/myaccount/MyEbank.js`, `MentorEarnings.js`, `routes/payouts.py`, `pages/admin/AdminPayoutsManager.js` | **No** |
| [ ] | Bundles + cupones | Paquetes vendibles con checkout y cupones | `routes/bundles.py`, `routes/coupons.py`, `components/BundleEditorDialog.js`, `pages/myaccount/Bundle*.js`, `pages/admin/AdminBundlesManager.js`, `AdminCouponsManager.js` | **No** |
| [ ] | Mentoría (agenda) | Perfil de mentor, slots recurrentes, reservas, calendario, checkout | `routes/mentor_slots.py`, `pages/myaccount/Mentorship{Profile,Calendar,CheckoutSuccess}.js`, `MyBookings.js`, `components/SlotRecurrencePicker.js`, `CalendarGrid.js`, `pages/admin/MentorSlotTemplatesManager.js`, `MentorshipScheduleManager.js`, `BlockedDatesManager.js` | **No** |
| [ ] | Mentoring System (cuestionario) | Cuestionario previo + aprobación manual | `routes/mentoring.py`, `pages/myaccount2/MentoringOnboarding.js`, `lib/useMentoringGate.js`, `pages/admin/MentoringFieldsManager.js`, `MemberMentoringReview.js` | **No** |
| [ ] | Calendario global / eventos + iCal | Eventos globales, registro, sincronización iCal | `routes/calendar_events.py`, `calendar_helpers.py`, `ical.py`; `pages/myaccount/GlobalCalendar.js`, `EventDetail.js`, `CalendarSync.js`; `components/CalendarSyncCard.js`; `pages/admin/GlobalEventsManager.js` | **No** (⚠ Gem2i ya tiene sus propios *events* de entretenimiento) |
| [ ] | Portafolios del miembro | CRUD de portafolios en My Account | `pages/myaccount/Portfolio{List,Detail,Form}.js` | **No** |

### 1.D Contenido y directorios

| Sel. | Módulo | Descripción | Ubicación en Carlos | En Gem2i |
|---|---|---|---|---|
| [ ] | Reading List (libros) | Carrusel en home + detalle de libro, orden drag, login por libro | `pages/ReadingListPage.js`, `BookDetailPage.js`, `pages/admin/BookEditPage.js`, `BooksManager.js` | Parcial (versión 15-jul, sin detalle) |
| [ ] | Companies (directorio) | 572 compañías, CIK/IR, logos, banners, noticias | `routes/companies.py`, `pages/CompaniesPage.js`, `CompanyDetailPage.js`, `pages/admin/CompaniesManager.js`, `CompanyEditPage.js`, `IndustriesManager.js`, `SectorsManager.js`, `scripts/companies_migrate.py`, `logos-companies/` | **No** |
| [ ] | Opportunities | Directorio + editor/revisión de oportunidades | `routes/opportunities.py`, `pages/Opportunit*.js`, `components/OpportunitySubEditors.js`, `pages/admin/Opportunit*Manager.js`, `scripts/opportunities_migrate.py` | **No** |
| [ ] | Model Portfolio (home) | Logos del último iiReport en el home | `routes/public.py::model-portfolio` + variantes en `PersonalBrandSections.js`/`AurexSections.js`/`HomePage.js` | **No** (depende de KMS + Companies) |
| [ ] | Featured Projects / Conferences / Recommended sites | Páginas públicas de listado | `pages/FeaturedProjectsPage.js` (+ rutas en `App.js`) | **No** |
| [ ] | Documentación (admin) | Manuales en `/admin/documentation` (Onboarding, Skills & Commands, Logos) | `routes/docs.py`, `routes/docs_assets/`, `pages/admin/DocumentationManager.js` | **No** |
| [ ] | Reports / Analytics dashboard | Reportes admin (overview) | `routes/reports.py`, `components/reports/ReportsDashboard.js`, `components/charts/ActivityChart.js`, `pages/myaccount2/Reports.js` | **No** |
| [x] | ImageAdjust (cropper) | Recorte/ajuste de imagen reutilizable | `components/ImageAdjust.js` | **No** |
| [x] | Imágenes por defecto | Avatar/sponsor/mentor por defecto | `lib/defaultImages.js`, `frontend/public/defaults/*` | **No** |

### 1.E Herramientas servidas por el backend CMS (server-rendered)

| Sel. | Módulo | Descripción | Ubicación en Carlos | En Gem2i |
|---|---|---|---|---|
| [ ] | KMS / Insights | Blog/biblioteca nativa (posts, categorías, banners horneados, watermark, iiReport, tiers) | `backend/kms/*` (+ `static/`, `templates/`), montado en `/insights`; `utils/kms_sync.py`; `components/InsightsCard.js`, `components/admin/KmsPostLinker.js`, `pages/admin/KmsSubscriptionsManager.js`; scripts `kms_*` | **No** (shim) |
| [ ] | News | Noticias server-rendered + Share to Discord | `routes/news.py` (montado en `/auxnews`), `pages/NewsPage.js`, `NewsDetailPage.js`, `scripts/news_native_cutover.py` | **No** |
| [ ] | Morning Brief | Publicador de briefs HTML | `routes/morning.py` (montado en `/morning`), `scripts/seed_morning_banners.py` | **No** |
| [ ] | Prompt Management (Pro Manager) | Prompts → Claude API → brief/PDF → publicación | `routes/pros.py`, `utils/pro_engine.py`, `scheduler.py`, `pages/admin/ProsManager.js`, `scripts/carve_brand_shells.py` | **No** |
| [ ] | Mail in-CMS (buzones) | Correo SES→S3→Mongo, buzones por usuario, envío con branding | `routes/mail.py`, `utils/mailbox.py`, `utils/mail_ingest.py`, `pages/admin/MailManager.js`, `pages/myaccount/Mail.js` | **No** |
| [ ] | Discord webhooks | Envío a Discord (news/brief) | `utils/discord.py` | util sí |
| [ ] | Auto-post a X | Publicación automática en X | `utils/x_poster.py` | **No** |
| [ ] | Puente CMS→IMS / CMS→MMS | Catálogo de acciones y puntos hacia IMS/MMS | `routes/ims.py`, `utils/ims_actions.py`, `routes/mms_admin.py`, `utils/mms_events.py`, `pages/admin/ImsManager.js`, `MmsManager.js` | **No** (shim `mms_events`) |
| [ ] | Rate limit | Limitador de peticiones | `utils/rate_limit.py` | Sí |

### 1.F Productos hermanos independientes (cada uno con su backend, frontend, servicio y subdominio propios)

| Sel. | Producto | Descripción | Ubicación en Carlos | En Gem2i |
|---|---|---|---|---|
| [ ] | IMS | Information Management System (acciones, Morning Brief, Social Kit, Market Update) | `ims.carlosartiles.com/` (`backend/{core,routers,server.py}`, `frontend/`, `deploy/`) + `deploy_ims*_*.ps1` | **No** |
| [ ] | PMS | Gestión de proyectos (WebSocket) | `pms.carlosartiles.com/` + `deploy_*pms*.ps1` | **No** (shim roles) |
| [ ] | LMS | Cursos / lecciones secuenciales | `lms.carlosartiles.com/` + `deploy_*lms*.ps1` | **No** (shim roles) |
| [ ] | MMS | Marketing: afiliados, links cortos `/l/`, gamificación, recompensas | `mms.carlosartiles.com/` + `deploy_*mms*.ps1` | **No** (shim roles/eventos) |
| [ ] | Journal | Trading Journal (colecciones `jr_`) | `journal.carlosartiles.com/` + `deploy_journal*.ps1` | **No** |

### 1.G Temas visuales y secciones de marca

| Sel. | Módulo | Descripción | Ubicación en Carlos | En Gem2i |
|---|---|---|---|---|
| [ ] | Personal Brand Pro | Tema completo de Carlos (secciones numeradas, eyebrows) | `components/PersonalBrandSections.js`, `pages/HomePage.js` | **No** (Gem2i tiene su tema oscuro propio) |
| [ ] | Aurex sections / Private Community Pro | Secciones configurables por esquema + auto-contraste | `components/AurexSections.js`, `routes/aurex_sections.py`, `pages/admin/AurexSectionsManager.js`, `lib/aurexSchemas.js`, `lib/aurexIconList.js` | **No** |
| [ ] | Paleta por grupos de color | Colores del sitio desde `theme_colors.*` | `lib/themeColors.js`, `index.css` | Sí (versión 15-jul) |
| [ ] | Catálogo de redes sociales | Social links desde Settings | `utils/social_catalog.py`, `lib/socialCatalog.js` | Sí |

### 1.H Tooling y operación (no es funcionalidad de usuario)

| Sel. | Elemento | Descripción | Ubicación en Carlos |
|---|---|---|---|
| [ ] | Slash-commands | `/new_company`, `/get_logo_company` | `.claude/commands/`, `reference/promts/*_spec_prompt.md` |
| [ ] | Skill de migración | `aux-migrate-tech-stack` | `.claude/skills/` |
| [ ] | Scripts de deploy | Deploy inteligente por git-diff con rollback | `deploy_*.ps1` (Gem2i ya tiene `deploy_beta_gem2i.ps1` propio) |
| [ ] | Banco de logos | `logos-companies/{TICKER}/` (~122 MB) | `logos-companies/` |
| [ ] | Checklist de marca | Pasos por-instancia que no viajan con deploy | `work-plans-MD/BRAND_LAUNCH_CHECKLIST.md` |

---

## 2. Comparación de estructura Carlos ↔ Gem2i

### 2.1 Arquitectura — iguales

| Capa | Carlos | Gem2i |
|---|---|---|
| Stack | React 19 + CRA/craco + Tailwind + shadcn · FastAPI + Motor · MongoDB | **Idéntico** (`package.json` idéntico; `requirements.txt` igual salvo `html5lib`, `tinycss2` que usa el KMS) |
| Backend | `backend/{server.py, routes/, utils/, models/, scripts/, scheduler.py, seed.py}` | **Misma forma** |
| Frontend | `frontend/src/{App.js, pages/, pages/admin/, pages/myaccount/, components/, components/admin/, components/layouts/, components/ui/, lib/, hooks/}` | **Misma forma** + `pages/gem2i/` y `components/gem2i/` propios |
| Registro de rutas API | `server.py` → `api_router.include_router(...)` (prefijo `/api`) | Igual |
| Rutas frontend | `App.js` | Igual (reescrito por Gem2i) |
| Menú admin | `pages/admin/AdminLayout.js` + `models/cms_sections.py` (permisos) | Igual (ambos modificados por Gem2i) |
| Cliente API | `lib/api.js` | Igual (modificado por Gem2i) |

### 2.2 Diferencias de fondo (por qué no todo es copiar-pegar)

| Tema | Carlos | Gem2i |
|---|---|---|
| Colecciones nuevas | nombres libres (`kms_*`, `companies_directory`…) | **prefijo `gem_*`** para todo lo nuevo |
| Secretos | a veces en `settings` | **siempre en `gem_config`**, nunca en `settings` |
| Admin | `is_admin()` = `role=="admin"` **o** rol CMS `role_admin` | solo `role=="admin"` |
| Identidad del miembro | JWT | JWT (regla: nunca confiar en un id enviado por el cliente) |
| Prefijo de miembro | `CA` / `AUX` / `ACG` | `GEM` (1.736 miembros legacy `GEM-n`) |
| `member_logins.source` | `main` | `gem2i` |
| Puntos/comisiones | `utils/points.py` + MMS | `gem_points_history` (6.457 filas legacy) + `gem_ecommissions` niveles `[30,20,15,10,5,2]` |
| Eventos | calendario global / mentoría | `gem_events` (1.704 eventos de entretenimiento, tickets, guest list) |
| Productos hermanos | 5 servicios por caja (puertos 8010–8051) | **una sola app** en la caja; el backend ya usa **:8050** |
| Tema público | PB / Aurex / Modern | tema `gem2i` oscuro propio |
| Deploy | 40+ scripts, encadenados | `deploy_beta_gem2i.ps1` único, sin cadenas |

### 2.3 Clasificación de los archivos compartidos (medida: diff real, 2026-09-23)

Base del fork: Carlos `9a89d8f`. Para cada archivo que existe en los dos repos:

**Clase A — idénticos hoy** (se pueden sobrescribir sin riesgo; no aportan nada nuevo):
`components/ui/*`, `components/layouts/*`, `PageBuilder.js`, `PageEditorDialog.js`, `LocalizedField.js`, `useDataTable.js`, `lib/i18n.js`, `lib/richText.js`, `lib/memberAuth.js`, `lib/mapConfig.js`, `lib/layoutDefinitions.js`, `EmailManagement.js`, `BackupManager.js`, `HeroManager.js`, `HeroCanvasEditor.js`, `GeoManager.js`, `SeoManager.js`, `UsersManager.js`, `MyAccountNavManager.js`, `MemberTypesManager.js`, `LandingPage.js`, `GalleryPage.js`, `UpdateBiography.js`, `routes/captcha.py`, `routes/email_templates.py`, `routes/hero_ab.py`, `utils/{captcha,email_render,rate_limit,runtime_config,social_catalog}.py`, `populate_geo.py`.

**Clase B — Gem2i NO los tocó, Carlos sí evolucionó** (se pueden **reemplazar por la versión de Carlos** si el módulo elegido lo necesita; revisar el diff igualmente):
`routes/admin_content.py`, `admin_tools.py`, `auth.py`, `landing.py`, `payments.py`, `public.py`, `roles.py`, `seed.py`, `utils/points.py`, `utils/leadcapture.py`, `requirements.txt`; frontend: `index.css`, `SettingsManager.js`, `MembersManager.js`, `MemberLevelsManager.js`, `MembershipSettingsManager.js`, `RolesManager.js`, `QuickLinksManager.js`, `SectionOrderManager.js`, `HeroSlideForm.js`, `BooksManager.js`, `MembershipProfile.js`, `MyAccountLayout.js`, `MySponsor.js`, `MembershipEnrollment.js`, `ImageUpload.js`, `MemberImageUpload.js`, `Footer.js`, `lib/auth.js`, `PersonalityTabs.js`, `pbPersonality.js`, `AboutManager.js` y los `*Manager.js` de contenido.
> ⚠ "Gem2i no los tocó" ≠ "Gem2i no depende de ellos". `payments.py` lo usa `gem_tickets.py`; `public.py`/`admin_content.py` los usa el home de Gem2i. Tras reemplazar → probar checkout de ticket y home.

**Clase C — Gem2i SÍ los modificó → FUSIÓN MANUAL, nunca sobrescribir:**

| Archivo | Qué cambió Gem2i (hay que conservarlo) |
|---|---|
| `backend/server.py` | registra solo el núcleo + routers `gem_*` (seeds `seed_gem_content`, `ensure_pass_indexes`, `seed_gem_ecommissions`) |
| `backend/models/database.py` | `verify_password` endurecido (hash vacío → False, para miembros legacy sin contraseña) |
| `backend/models/cms_sections.py` | secciones/permisos de los catálogos gem |
| `backend/models/email_templates.py` | plantillas propias de Gem2i |
| `backend/routes/membership.py` | login case-insensitive + `member_logins.source='gem2i'` |
| `backend/scheduler.py` | tareas de Gem2i; sin las de Carlos |
| `backend/utils/{kms_sync,lms_roles,mms_roles,pms_roles,mms_events}.py` | **shims no-op** — sustituir solo si se migra el producto real |
| `frontend/src/App.js` | grafo de rutas reescrito (rutas `gem2i/*`) |
| `frontend/src/pages/HomePage.js` | reescrito para el tema gem2i |
| `frontend/src/components/HeroSection.js` | reestilizado |
| `frontend/src/lib/api.js` | llamadas API de gem |
| `frontend/src/pages/admin/AdminLayout.js` | menú con managers gem |
| `frontend/src/components/layout/Navbar.js`, `LoginModal.js`, `DynamicPage.js`, `ReadingListPage.js`, `lib/themeColors.js` | ajustes de tema |
| `frontend/src/pages/myaccount/Member{Login,Register,ForgotPassword,ResetPassword}.js` | **reescritos casi por completo** (look gem2i) |

**Clase D — solo en Gem2i (NO tocar nunca):** `routes/gem_{catalogs,content,passes,tickets}.py`, `pages/gem2i/*`, `components/gem2i/*`, `pages/admin/GemCatalogManager.js`, `GemTransactionsManager.js`, `scripts/gem2i_*`, `deploy_beta_gem2i.ps1`, `provision_gem2i_box.ps1`.

**Clase E — solo en Carlos:** todo lo marcado "**No**" en §1 → son los archivos que se **copian** (archivos nuevos en Gem2i = sin conflicto por sí mismos).

---

## 3. Mapa de archivos a copiar (se completa cuando Anthony elija)

> **Pendiente de la selección de §1.** Para cada módulo elegido se añade una tabla como la plantilla. Regla de rutas: **la ruta destino es la misma ruta relativa** que en Carlos (misma estructura), salvo las excepciones de la columna *Destino*.

### 3.0 Plantilla por módulo

```
### 3.x <Módulo>
Commit origen fijado: <SHA de Carlos>        ← copiar SIEMPRE desde este commit
| # | Origen (<CARLOS>/…)              | Destino (<GEM>/…)                 | Tipo  | Acción        |
|---|----------------------------------|-----------------------------------|-------|---------------|
| 1 | backend/routes/X.py              | backend/routes/X.py               | E     | copiar        |
| 2 | frontend/src/pages/admin/XMgr.js | frontend/src/pages/admin/XMgr.js  | E     | copiar        |
| 3 | backend/server.py                | backend/server.py                 | C     | fusionar: +2 líneas (import + include_router) |
| 4 | frontend/src/App.js              | frontend/src/App.js               | C     | fusionar: +ruta |
Dependencias transitivas: <utils/…, lib/…>  (salen de `grep -n "^from \|^import" ` / `import … from`)
Colecciones Mongo: <nombre Carlos> → <gem_nombre?>
Ajustes post-copia: ver §4 (ítems n°…)
```

### 3.1 Cómo sacar las dependencias de un módulo (lo hace quien complete §3)

1. Partir de los archivos del módulo (columna *Ubicación* en §1).
2. Backend: `grep -nE "^(from|import) " <archivo>` → cada `routes.*`, `utils.*`, `models.*`, `kms.*` que **no exista** en Gem2i entra en el mapa (clase E); si existe y es clase C → fusión.
3. Frontend: `grep -nE "from '\.\.?/" <archivo>` → mismo criterio con `lib/`, `components/`.
4. Repetir hasta que no aparezcan dependencias nuevas.
5. Buscar colecciones Mongo usadas: `grep -noE "db\.[a-z_]+" <archivos>`.

### 3.2 Comando de copia portable (desde git, no desde la carpeta)

Copiar **desde el commit fijado** evita arrastrar cambios sin commitear de quien sea:

```powershell
# PowerShell — ajustar SOLO estas dos líneas (ver §7)
$CARLOS = "<ruta local del repo AUX-1.0-aurexnetwork-complete>"
$GEM    = "<ruta local del repo Gem2i.com>"
$SHA    = "<SHA fijado en §3.x>"

# Archivos sueltos y/o carpetas enteras (clase E), exactos al commit, misma ruta relativa.
# Sirve igual para texto y binarios (imágenes) y crea las subcarpetas que falten.
$files = @(
  "backend/routes/X.py",
  "frontend/src/pages/admin/XManager.js",
  "backend/routes/docs_assets"            # una carpeta también vale
)
$tar = Join-Path $env:TEMP "port-from-carlos.tar"
git -C $CARLOS archive --format=tar -o $tar $SHA -- $files   # ⚠ NO usar tubería "|": PS 5.1 corrompe binarios
tar -x -f $tar -C $GEM
Remove-Item $tar

# Revisar qué entró antes de seguir:
git -C $GEM status --short
```

> Probado 2026-09-23 en Windows PowerShell 5.1: archivos de texto y `.jpg` salen idénticos byte a byte.
> Git Bash: `git -C "$CARLOS" archive --format=tar "$SHA" -- <rutas> | tar -x -f - -C "$GEM"` (en Bash la tubería sí es segura; si tar se queja de `C:`, añadir `--force-local`).
> ⚠ Solo para archivos **clase E**. Un archivo clase C incluido en `$files` se **sobrescribe** → nunca ponerlos en la lista.

### Hallazgo común del lote 1 (#21 + #22)

Al hacer el strip del 15-jul se borraron **solo las dos páginas y sus rutas**; todo lo demás sobrevivió y ya está en Gem2i:
- Backend (`routes/membership.py`, ya registrado): `POST /member/invite-codes/generate`, `GET /member/invite-codes`, `POST /member/invite-codes/{id}/send`, `POST /member/generate-qr`, `GET /member/my-community`. Comparados con Carlos @8a0d4dd: generate/list/generate-qr **idénticos**; `send` en Carlos añade un parámetro `destination` que **solo usa My Account 2.0** (la página 1.0 no lo envía) → no hace falta fusionar; `my-community` en Carlos añade 1 campo `account_status` (solo sirve con Lead capture #31) → no hace falta.
- `lib/api.js`: `memberAPI.generateCodes/listCodes/sendInvite/generateQR/getCommunity` y `publicAPI.getSettings` **ya existen**.
- `MyAccountLayout.js`: los ítems de menú `invite-code` y `my-community` **ya existen** → hoy apuntan a rutas que no existen en `App.js`.
- `components/TreeNode.js`, `components/ui/{dialog,input,label}`, `lib/memberAuth.js` ya existen.
- Registro: `MemberRegister.js` (reescrito por Gem2i) **ya acepta** `?code=` y `?sponsor=`. Plantilla email `invite_code` ya existe. `MembersManager.js` ya tiene el switch `can_create_qr`.
- `qrcode` ya está en `requirements.txt`.

**Consecuencia:** el lote es solo **2 archivos E + 1 fusión C (`App.js`)** + adaptación visual/i18n. **Cero cambios de backend.**

Estado de la caja (consulta de solo lectura, 2026-09-23): `invite_codes` = 0 docs · miembros con `can_create_qr:true` = 0 · miembros con `sponsor_id` = 1.736 (legacy) · **`settings.site_url` NO definido y `SITE_URL` no está en `.env`**.

Corrección al catálogo: #21 **no** depende de #28 (Prefijo de referido). El QR codifica `…/my-account/register?sponsor=<membership_number>`; `utils/referral.py` solo lo usan `news.py` y `morning.py`.

### 3.3 Invite Code + QR (#21)
Commit origen fijado: **8a0d4dd**
| # | Origen (`<CARLOS>/…`) | Destino (`<GEM>/…`) | Tipo | Acción |
|---|---|---|---|---|
| 1 | `frontend/src/pages/myaccount/InviteCode.js` (279 líneas) | `frontend/src/pages/myaccount/InviteCode.js` | E | copiar (§3.2) + adaptar (i18n + colores, ver abajo) |
| 2 | `frontend/src/App.js` | `frontend/src/App.js` | C | fusionar: +`const InviteCode = lazy(() => import('./pages/myaccount/InviteCode'))` + `<Route path="invite-code" element={<InviteCode />} />` dentro del bloque `/my-account` (Gem2i usa rutas anidadas; **no** traer `MA_ROUTES`/`MA_THEME_PAGES` de Carlos) |
| — | `backend/routes/membership.py` | — | C | **nada** (endpoints ya presentes; `destination` no se usa) |
| — | `frontend/src/lib/api.js`, `MyAccountLayout.js` | — | C | **nada** (ya presentes) |

Dependencias transitivas: `lib/memberAuth` (A), `lib/api` (C, ya tiene las funciones), `components/ui/{dialog,input,label}` (A), `sonner`, `lucide-react` (ya en `package.json`). **Ninguna nueva.**
Colecciones Mongo: `invite_codes` (colección del núcleo, heredada, 0 docs) → **se mantiene el nombre** (es núcleo como `members`; renombrarla obligaría a tocar el flujo de registro = zona R8). Campos en `members`: `qr_code`, `qr_url`, `qr_generated_at`, `can_create_qr`. Anotar en DECISIONS como excepción a `gem_*`.
Checklist §4:
- 1–4 N/A (backend ya registrado, sin seeds, sin paquetes, sin shims).
- **5** sí (ruta en `App.js`). 6–8 N/A. **9** verificar que CMS → My Account Nav (`myaccount_links`) muestra el ítem.
- **10** mantener `invite_codes` (ver arriba). 11 N/A.
- **12** flag por miembro: `can_create_qr` (0 miembros lo tienen) → decidir a quién se le activa en CMS → Members.
- 13 N/A. **14** la página trae la fuente `DM Serif Display` y el dorado de Carlos (`#c9a84c`) → quitar.
- **15** ⚠ **Site URL**: poner `https://beta.gem2i.com` en CMS → Settings → General. Sin eso el QR da 400 y el email de invitación se omite. Además **SMTP no está configurado** → los emails de invitación no salen hasta configurarlo (el código se genera igual).
- **16** 53 colores hex como fallback `var(--ma-*, #hex)` → variables del tema gem2i + **3 design skills**. **17** la página no usa `useT()` → textos EN/ES.
- 18–21 N/A. 22 N/A (sin cambios de backend). **23** build local. **24** health + regresión + e2e: generar códigos → enviar → registrarse con `?code=`; activar `can_create_qr` → generar QR → registrarse con `?sponsor=` → comprobar `sponsor_id`.
Riesgos §5: **R1** (fusión `App.js`), **R12** (fuente/colores de Carlos), **R13** (copiar de 8a0d4dd), R15. R8 indirecto: el registro con código crea miembros nuevos por el `MemberRegister` de Gem2i, que no se toca. R6/R7 **no aplican** (endpoints de miembro; el QR usa `membership_number`, no el prefijo).

### 3.4 My Community (#22)
Commit origen fijado: **8a0d4dd**
| # | Origen (`<CARLOS>/…`) | Destino (`<GEM>/…`) | Tipo | Acción |
|---|---|---|---|---|
| 1 | `frontend/src/pages/myaccount/MyCommunity.js` (201 líneas) | `frontend/src/pages/myaccount/MyCommunity.js` | E | copiar (§3.2) + adaptar (i18n + colores) |
| 2 | `frontend/src/App.js` | `frontend/src/App.js` | C | fusionar: +`const MyCommunity = lazy(...)` + `<Route path="my-community" element={<MyCommunity />} />` (misma edición que 3.3 #2) |
| 3 | `frontend/src/components/TreeNode.js` | — | B | **no reemplazar**: Carlos solo añade el badge "Pre-reg" (`account_status`), que depende de Lead capture #31 |
| — | `backend/routes/membership.py` | — | C | **nada** (el +1 campo `account_status` es de #31) |

Dependencias transitivas: `lib/memberAuth` (A), `lib/api` (C, ya tiene `getCommunity` y `publicAPI.getSettings`), `components/TreeNode` (ya existe), `components/ui/dialog` (A). **Ninguna nueva.** Dependencia blanda con #21: los contadores "invitaciones totales/usadas" leen `invite_codes` (con #21 en el mismo lote, resuelto).
Colecciones Mongo: `members` (lectura por `sponsor_id`, recursivo hasta 10 niveles, 500 por nivel), `invite_codes` (conteo). Sin colecciones nuevas.
Checklist §4:
- 1–4 N/A. **5** sí (ruta). 6–8 N/A. **9** verificar ítem en My Account Nav.
- 10–11 N/A. 12 N/A.
- **13** índice recomendado `members.sponsor_id` (el árbol hace una consulta por nodo; 1.736 miembros con sponsor). Crear con mongosh, no viaja con deploy.
- **14** `#c9a84c` en el TreeNode/página → tema gem2i. 15 N/A.
- **16** 16 hex → variables gem2i + design skills. **17** sin `useT()` → EN/ES.
- 18–22 N/A. **23** build. **24** e2e con un miembro legacy que tenga downline real (los datos ya están: el árbol se llena al instante).
Riesgos §5: **R1** (`App.js`), **R12** (colores), R13, R15.
⚠ **Privacidad (decisión de Anthony):** el endpoint devuelve a cada sponsor **email, teléfono, fecha de nacimiento, género y dirección** de toda su red hasta 10 niveles. En Gem2i esto expone datos **reales** de los 1.736 miembros legacy a su línea ascendente desde el primer día. Opciones: (a) paridad con Carlos tal cual; (b) ocultar email/teléfono/fecha en la página; (c) recortar los campos en el endpoint (fusión en `membership.py`, clase C).
**Decidido 2026-09-23: opción (b).** El modal muestra solo nombre, ID, foto y país/estado/ciudad. Email, teléfono, fecha de nacimiento, género y ZIP ya no se pintan. ⚠ Siguen viajando en la respuesta de `/member/my-community` (visibles en las devtools del navegador); si se quiere cerrar del todo → opción (c) más adelante.

### 3.5 Resultado de la ejecución del lote 1 (2026-09-23)
- Copiados @8a0d4dd: `InviteCode.js`, `MyCommunity.js`. Fusión `App.js`: +2 lazy imports y +2 `<Route>` bajo `/my-account`. Backend sin cambios.
- Adaptación: colores → grupo CMS `--ma-*` (Theme Colors → My Account) sin fallbacks de Carlos; fuente DM Serif Display eliminada; textos EN/ES con `useT()`; fechas con `Intl` según idioma; estados de carga/error con reintento/vacío con explicación; labels/aria en tabla, formulario y botones de icono; formulario de envío con validación inline del email.
- `TreeNode.js` no se tocó (sus clases doradas ya las remapea `index.css` a `--ma-accent` dentro de My Account).
- Verificación: `yarn build` verde (solo los 4 avisos previos) · detector impeccable limpio.
- Caja (solo lectura): los 1.737 miembros sin `level_id` → ven todos los ítems; `myaccount_nav` tiene `invite-code` y `my-community` visibles. El título sale de la etiqueta CMS de My Account Nav (hoy en inglés, "Invite Code"/"My Community") → traducirla en CMS si se quiere ES.
- Pendiente fuera de alcance: el tema `my_account` en `theme_colors` usa aún los valores por defecto (dorado de Carlos) en todo My Account; el menú lista ítems sin página en Gem2i (ebank, portfolios, "AUX Calendar", mentoría, bundles…) → ocultarlos en CMS → My Account Nav.

---

## 4. Pasos de adaptación post-copia (checklist por módulo)

Recorrer **todos** los ítems para cada módulo copiado; marcar N/A los que no apliquen.

**Registro en el backend**
1. `backend/server.py`: añadir `from routes.X import router as X_router` + `api_router.include_router(X_router)` (fusión, clase C). Si el módulo se monta fuera de `/api` (KMS `/insights`, News `/auxnews`, Morning `/morning`) → `app.include_router(..., prefix=...)`.
2. Si el módulo tiene seed/índices al arrancar (buscar `seed_`/`ensure_` en el `startup` de Carlos) → añadir la llamada al `startup` de Gem2i.
3. `backend/requirements.txt`: añadir paquetes nuevos (p.ej. KMS → `html5lib`, `tinycss2`; Pro Manager → `weasyprint==69.0` + libs apt en la caja). **No subir `pymongo`** por encima de `4.5.0` (motor 3.3.2).
4. Shims: si el módulo es un producto real que el shim neutralizaba (LMS/MMS/PMS/KMS) → reemplazar el shim por el util real de Carlos. Si no, **dejar el shim**.

**Registro en el frontend**
5. `App.js`: importar la página y añadir la `<Route>` (fusión). Respetar los wrappers de Gem2i (rutas protegidas de miembro/admin).
6. `pages/admin/AdminLayout.js`: añadir la entrada de menú (fusión).
7. `backend/models/cms_sections.py`: añadir la sección/permiso para que `RolesManager` pueda concederla.
8. `lib/api.js`: añadir las funciones de API que la página importa (copiar solo esas funciones, no el archivo).
9. My Account: si la página va en My Account → añadir su ítem en `MyAccountLayout.js` y/o sembrarlo en `myaccount_links` (se gestiona en CMS → My Account Nav).

**Datos y configuración (por-instancia — NO viaja con el deploy)**
10. Colecciones: decidir nombre. Regla Gem2i = **`gem_*` para lo nuevo**. Si se renombra, cambiar TODAS las referencias `db.<nombre>` del módulo (grep). Si se deja el nombre de Carlos, anotarlo en `memory/DECISIONS.md` como excepción.
11. Secretos (API keys, webhooks, sync keys) → **`gem_config`**, no `settings`. Adaptar la lectura en el código copiado.
12. Flags de activación (`settings.kms_native_enabled`, `mentoring_enabled`, `pro_manager_enabled`, `membership_v2_enabled`…) → crear en `gem2i_cms` con mongosh; el código copiado **no los enciende solo**.
13. Datos semilla (categorías, niveles, catálogos) → sembrar en `gem2i_cms` (nunca copiar datos de Carlos; solo estructura).
14. Referencias a marca en el código: buscar `grep -rniE "carlos|artiles|aurex|acapital|\\baux\\b|/aux-|CA-" <archivos copiados>` y sustituir por lectura de `settings` (`site_name`, `aux_prefix`, `site_url`) o por textos Gem2i.
15. Dominios hardcodeados (`*.carlosartiles.com`, `insights.`, `morningbrief.`…) → `beta.gem2i.com` o el subdominio que se cree.
16. Colores: nunca hex; usar `var(--color-*)` del tema gem2i. **UI nueva → usar los 3 design skills** (`<GEM>/CLAUDE.md`).
17. i18n: todo texto visible con `tt()` y claves EN/ES.

**Infraestructura (solo productos hermanos §1.F o herramientas con subdominio)**
18. Puerto: **8050 ya es del backend gem2i** → elegir otro libre (p.ej. 8060+).
19. En la caja `34.198.159.54`: carpeta `/opt/<producto>.gem2i.com`, venv propio, `.env` con `DB_NAME=gem2i_cms` (+ `COLLECTION_PREFIX` si aplica), servicio systemd, vhost nginx, DNS A → `34.198.159.54`, certificado LE (`sudo certbot --nginx -d <host> --non-interactive --agree-tos --redirect`).
20. Deploy: clonar `deploy_beta_gem2i.ps1` a `deploy_<producto>_gem2i.ps1`, con **guard de IP** (nunca apuntar a las cajas de Carlos/Aurex/Acapital) y **excluir** la carpeta del producto en `deploy_beta_gem2i.ps1`.
21. RAM: la caja es un clon de 1.9 GiB → **build del frontend en LOCAL** + swap atómico (el build on-box hace OOM).

**Verificación**
22. Local: `python -m py_compile` de cada `.py` **+ arrancar el backend** (un `NameError` a nivel de módulo no lo detecta `py_compile` — pasó en Carlos s130).
23. `CI=true npx craco build` en local sin errores.
24. Tras deploy: `https://beta.gem2i.com/api/health` = 200, la página nueva carga, y **regresión de Gem2i**: home, catálogo de eventos, guest list, checkout de ticket, login de un miembro legacy.

---

## 5. Riesgos y conflictos conocidos

| # | Riesgo | Dónde | Cómo evitarlo |
|---|---|---|---|
| R1 | **Sobrescribir un archivo clase C** y borrar trabajo de Gem2i (tema, rutas gem, login legacy) | §2.3 clase C | Nunca copiar encima: fusionar a mano con diff (VS Code "Compare") y revisar el `git diff` antes de commitear |
| R2 | **Doble sistema de puntos** — Carlos `utils/points.py` + MMS vs Gem2i `gem_points_history` + `gem_ecommissions` (niveles legacy 30/20/15/10/5/2) | Puntos, eBank, MMS, Payouts | Decidir **antes** cuál manda. Recomendado: el ledger de Gem2i es la fuente de verdad; el módulo de Carlos se adapta para leer/escribir ahí, o no se migra |
| R3 | **Choque de "eventos"** — calendario global/mentoría de Carlos vs `gem_events` de entretenimiento | Calendario global, iCal | Nombres de colección distintos (`gem_*`), rutas de frontend distintas (`/my-account/global-calendar` vs `/events`); no reutilizar el nombre `events` |
| R4 | **Stripe compartido** — `payments.py` lo usa `gem_tickets` | Bundles, Mentoría, Payouts, reemplazo de `payments.py` | Tras cualquier cambio en `payments.py`/`stripe_helpers.py`, probar un checkout de ticket completo (modo test) + el webhook |
| R5 | **Shims que dejan de ser no-op** — reemplazar `kms_sync.py` por el real intentaría sincronizar con un KMS que no existe | `utils/kms_sync.py`, `*_roles.py`, `mms_events.py` | Solo reemplazar el shim si se migra el producto real y su config existe |
| R6 | **Admin por rol** — el código nuevo de Carlos llama `is_admin()` / `is_platform_admin()` que Gem2i no tiene | Casi todos los routes nuevos de Carlos | Portar `is_admin()` a `models/database.py` de Gem2i (fusión: conservar `verify_password` endurecido) o reemplazar las llamadas |
| R7 | **Prefijos hardcodeados** (`aux`, `CA-`) en links de referido | News, Morning, KMS, IMS | Portar `utils/referral.py` y leer `settings.aux_prefix` (=`GEM`) |
| R8 | **Miembros legacy sin contraseña** (523) | Cualquier cambio en auth/login | No reemplazar `verify_password` ni `member_login` de Gem2i |
| R9 | **Choque de puerto 8050** — en Carlos 8050 = IMS prod; en Gem2i 8050 = backend principal | IMS u otro producto hermano | Asignar puerto nuevo (§4-18) |
| R10 | **Deploy a la caja equivocada** — un script de Carlos copiado conserva IP/ruta de Carlos | Scripts de deploy | Nunca copiar scripts de Carlos tal cual; clonar el de Gem2i. Los scripts de Gem2i rechazan las IPs de marca |
| R11 | **OOM en build on-box** (caja 1.9 GiB) | Frontend y productos hermanos | Build local + swap atómico; verificar el hash del bundle servido |
| R12 | **Datos de Carlos colados** (textos, logos, dominios, posts) | Todo | Paso §4-14/15; nunca `mongodump` de Carlos hacia Gem2i |
| R13 | **Cambios que Carlos siga haciendo** después del commit fijado | Todo | Copiar desde el SHA fijado; si luego se quiere actualizar, repetir con el nuevo SHA y hacer diff entre SHAs |
| R14 | **Dependencias de módulos no migrados** (Model Portfolio → KMS + Companies; Social Kit → IMS + KMS; Morning Brief → KMS ingest) | §1.D/1.E | Migrar las dependencias en el mismo lote o descartar el módulo |
| R15 | **Fin de línea (CRLF/LF)** — diffs "gigantes" falsos entre máquinas | Comparaciones | Usar `git diff` (normaliza) o `diff --strip-trailing-cr`; no juzgar por la comparación binaria de archivos |

---

## 6. Ejecución paso a paso (para el colaborador)

1. En **ambos** repos: `START` (= `git pull origin main`). Confirmar que `<GEM>` está limpio (`git status`).
2. Leer `<GEM>/CLAUDE.md` + `memory/` (reglas de aislamiento de Gem2i).
3. Abrir este plan en `<GEM>/work-plans-MD/PORT_FROM_CARLOS_PLAN.md`, poner tu nombre en **CLAIMED BY**.
4. Por cada módulo de §3 (en el orden que indique Anthony, dependencias primero):
   1. Crear rama local opcional o trabajar en `main` según costumbre del equipo.
   2. Copiar los archivos clase E con §3.2 **desde el SHA fijado**.
   3. Hacer las fusiones clase C a mano.
   4. Recorrer el checklist §4 completo.
   5. Verificar en local (§4-22/23).
   6. `git add` + commit (`feat(gem2i): port <módulo> from Carlos @<SHA>`).
5. `DEPLOY` en Gem2i (`deploy_beta_gem2i.ps1 -y`) cuando el lote esté completo → health 200 + regresión (§4-24).
6. Tareas de datos/config por-instancia (§4-10…13) con mongosh en `gem2i_cms`.
7. `FINISH` en Gem2i: actualizar STATUS de este plan con el siguiente paso exacto.

---

## 7. Qué debe ajustar el colaborador en su máquina

**Solo las dos raíces:** `$CARLOS` y `$GEM` (en §3.2). Todas las rutas del plan son relativas a ellas; la estructura interna de ambos repos es idéntica en cualquier máquina porque viene de git.

Además, verificar (no son rutas del plan, pero pueden romper la ejecución):

| Ajuste | Por qué |
|---|---|
| **Ambos repos actualizados** con `git pull` y el **SHA de Carlos** de §3.x existente en su clon (`git -C $CARLOS cat-file -t <SHA>` → `commit`) | Garantiza que copia exactamente lo mismo que se analizó aquí |
| **Llave SSH de la caja Gem2i**: `$env:GEM2I_SSH_KEY` apuntando a su copia de la `.pem`, o su `~/.ssh/id_ed25519` autorizada en la caja | El deploy resuelve `Gem2i-…pem` → `$env:GEM2I_SSH_KEY` → `~/.ssh/id_ed25519` |
| **Shell**: los comandos de §3.2 son PowerShell (probados en 5.1); en Git Bash usar la variante indicada. En PowerShell **nunca** encadenar `git archive | tar` con tubería | PS 5.1 corrompe binarios en tuberías |
| **Git**: `core.autocrlf` igual que en Anthony (recomendado `true` en Windows) y `core.quotePath false` | Evita diffs falsos y el fallo de SCP con carpetas nuevas del deploy |
| **Archivos nuevos → `git add`** antes del deploy | El deploy inteligente trabaja por git-diff; lo no trackeado no sube |
| Nunca copiar `node_modules/`, `venv/`, `__pycache__/`, `backend/uploads/`, `.env`, `frontend/build/` | Son locales/por-instancia (el `git archive`/`git show` ya los excluye) |
| Node/Python locales compatibles (mismos que usa para `deploy_beta_gem2i.ps1`) | Build local del frontend |
| Si el build local falla con **EPERM** (carpeta dentro de Dropbox) → borrar `frontend/build` y reintentar | Gotcha conocido en Carlos s118 |

Nada más depende de la máquina: no hay rutas absolutas en el mapa, y los destinos en la caja (`/opt/…`) son iguales para los dos.

---

## 8. Registro de ejecución por sector (2026-09-23, Carlos M. Artiles + Claude)

Orden de trabajo pedido: 1.A → 1.H, sin parar; deploy + verificación al cerrar cada sector.
Criterio aplicado a los módulos que Gem2i **ya tiene** (Clase B en §2.3): se porta el cambio de Carlos solo si aporta algo que funcione en Gem2i sin arrastrar módulos no migrados (gobernanza, KMS, Companies, MMS…). Si no aporta o es idéntico → "saltado (idéntico / no aporta)".
Criterio para módulos que contradicen una **decisión registrada** (`memory/DECISIONS.md`: D-GEM-2026-01/02 aislamiento + strip, D8 marca gem2i intacta) → **no se asume**: va a PENDIENTES PARA HUMANO.

Método: árbol de Carlos @8a0d4dd extraído a una carpeta temporal y comparado archivo a archivo (fin de línea normalizado): **324 idénticos · 73 distintos · 443 solo en Carlos**. Cada diff se leyó entero y se partió en trozos "genéricos" (se portan) vs "atados a módulos no migrados" (se descartan).

### Sector 1.A — Núcleo CMS ✅ (código listo; deploy al cierre)
| # | Módulo | Resultado | Qué se portó / por qué no |
|---|---|---|---|
| 1 | Auth / Admin login | **Hecho (parcial)** | `is_admin()` en los 3 gates de `/auth/login`; **bug real arreglado**: My Account entra por `/auth/login` y el historial de logins (`last_login` + `member_logins`, source `gem2i`) solo se escribía en `/member/login` (sin uso) → Gem2i no registraba logins. Saltado: evento MMS, flags de gobernanza en `/auth/me` |
| 2 | Miembros (CRUD admin) | **Hecho (parcial)** | **Contador atómico de `membership_number`** + `insert_member_with_retry` (carrera que podía duplicar números/IDs) en registro, alta admin, OAuth y leadcapture · `record_login_event` también al registrarse · MembersManager: prefijo dinámico (`settings.aux_prefix`) — antes mostraba "AUX-n" como sponsor en vez de "GEM-n" · Estado legible en la ficha. Saltado: `apply_member_defaults` (asignaría nivel/tipo por defecto → cambiaría lo que ven los miembros nuevos; es gobernanza #29), invitación desde Comunidad (#31), niveles/productos/páginas (#29/#30), mentoría, MMS, reader tier (KMS) |
| 3 | Roles & permisos | **Hecho (parcial)** | Sembrador reconcilia nombre/descr. de roles del sistema · RolesManager muestra marcadas las casillas cuando `full_access`. Saltado: "products" por rol (#30) |
| 4 | Admin por rol (`is_admin`) | **Hecho** | Backend: `is_admin()` en `database.py` (5 gates; `verify_password` endurecido intacto), `auth.py`, `membership.py`. Frontend: `lib/isAdmin.js` + App/AdminLayout/AdminLoginPage/MyAccountLayout/Forbidden/Navbar. Un 2º admin = asignar el rol Administrator en CMS |
| 5 | Hero canvas + A/B | Saltado (no aporta) | Diff = hero del tema "Private Community Pro" (D8) + prop `adjust` (va con #46) |
| 6 | Hero CTA por Acción | **Hecho (adaptado)** | `lib/ctaActions.js` + selector "Action" en HeroSlideForm + HeroSection. Adaptación Gem2i: "Login Required" dispara el evento `gem2i:open-login` (Gem2i no tiene interceptor `#login`) o va a `/my-account` si ya hay sesión. "Waiting List" oculto en el selector hasta que exista #31 |
| 7 | Page Builder | Saltado (no aporta) | Solo prop `adjust` (→ #46) |
| 8 | Section Order | Saltado (D8) | Solo temas familia Aurex |
| 9 | Contenidos básicos | Saltado aquí | Books (orden/oculto/detalle) → se evalúa en #39 (1.D); resto = pestañas de personalidad PB, KMS, X OAuth, Model Portfolio |
| 10 | Geo + Mapas | Saltado (no aporta) | Personalidades PB + `adjust` |
| 11 | Landing + suscriptores | **Hecho** | Emails de Waiting List (operador + suscriptor) vía Email Management (2 plantillas nuevas) + bloque "Operator Notifications" (operator_email/cc) en Settings → Email |
| 12 | Contacto | Idéntico | — |
| 13 | Email templates | **Hecho (parcial)** | Las 2 plantillas de Waiting List. Plantillas de mentoría → con 1.C |
| 14 | Captcha | **Hecho** | Prop `theme` en CaptchaWidget (compatible: por defecto sigue `dark`) |
| 15 | SEO/Settings/Backup/Analytics | **Hecho (parcial)** | Operator Notifications (ver #11). Saltado: X, KMS reader pricing, My Account 2.0, mentoring flag; `adjust`/avatar por defecto → #46/#47 |
| 16 | Stripe / Checkout | Saltado (R4, no aporta) | El único cambio es la suscripción de lectores KMS en el webhook |
| 17 | i18n | Idéntico | — |
| 18 | Personalidades | Saltado (D8) | Mini-sitios del tema Personal Brand |

Verificación local 1.A: `py_compile` OK en los 7 .py tocados · `yarn build` verde (solo los 4 avisos previos). ⚠ No hay venv local con FastAPI → la prueba de import real la hace el deploy en la caja (con auto-rollback).
**Deploy 1.A (+ lote 21/22): GREEN 4m10s** — verificado: `/api/health` 200 · `/` 200 · `/festivals` 200 (render real en navegador, sin errores de consola salvo los 401 esperados sin sesión) · `/my-account/invite-code` y `/my-account/my-community` 200 (sin sesión redirigen al login, correcto) · gates de API 401 · log del backend sin errores tras el reinicio.

### Sector 1.B — Membresía, comunidad y My Account ✅ (código listo; deploy al cierre)
| # | Módulo | Resultado | Detalle |
|---|---|---|---|
| 19 | Registro / login de miembro | Saltado (no aporta) | Todo el diff de Carlos es la variante "My Account 2.0" (Velzon) de cada página (→ #26) |
| 20 | Enrollment wizard | **Hecho** | **Bug real arreglado**: `/membership-enrollment` existía en Gem2i pero su backend se borró en el strip → la página fallaba. Portado `routes/enrollment.py` (+ seed de campos al arrancar), `EnrollmentFieldsManager` + `SortableFieldRow` + `lib/fieldIcons`, ruta admin, menú "Membership Enrollment → Content", sección CMS `enrollment_fields`, y pre-relleno del código desde `?code=`. `enrollmentAPI` ya existía idéntico. Colecciones `enrollment_fields/_content/_applications` (núcleo, sin `gem_`, ver D-GEM-2026-04) |
| 21 | Invite Code + QR | **Hecho** (lote 1) | ver §3.5 |
| 22 | My Community | **Hecho** (lote 1) | ver §3.5 |
| 23 | My Sponsor | **Hecho** | Respeta los campos ocultos (#24) + imagen por defecto de sponsor |
| 24 | Perfil + biografía | **Hecho** | Visibilidad de campos por plataforma: interruptores en CMS → Membership Settings (`hidden_fields`, guardado en backend) aplicados en Membership Profile (vista y edición) y My Sponsor. Saltado: aro animado del avatar y rayas animadas de la barra (rediseño/movimiento decorativo), `adjust` (#46) |
| 25 | My Account layout | **Hecho (parcial)** | Sin parpadeo al refrescar: el layout espera a tener settings/niveles/menú/campos ocultos antes de pintar · `Suspense` propio (antes una página lazy desmontaba todo el layout oscuro) · resalte deslizante del menú (transform/opacity, respeta reduced-motion y táctil) · avatar por defecto. Saltado: Reports, enlace a My Account 2.0, mentoría, reglas de nivel/tipo (gobernanza #29) |
| 26 | My Account 2.0 (Velzon) | **PENDIENTE (H7)** | Decisión de diseño, no técnica |
| 27 | Prefijo de membresía dinámico | **Hecho** | `utils/membership_prefix.py` + al cambiar `aux_prefix` en Settings se realinean solos todos los `membership_id` e invite codes |
| 28 | Prefijo de referido | Saltado (no aporta) | `utils/referral.py` solo lo usan News/Morning (no están en Gem2i). El QR de #21 usa el número, no esto |
| 29 | Gobernanza NIVEL/TIPO/ROL | **PENDIENTE (H8)** | Decisión de modelo de negocio |
| 30 | Puerta única de productos | **PENDIENTE (H9)** | R14: depende de los productos 57–61 |
| 31 | Lead capture | **Hecho (adaptado)** | `Gem2iWaitingListModal` (nuevo, estilo gem2i, EN/ES, accesible con Dialog) montado en el header: se abre con cualquier enlace `#waiting-list` o el evento `gem2i:open-waitlist`; alimenta Landing → Subscribers + los emails de #11. Arreglado un fallo del original: exigía captcha aunque estuviera apagado en el CMS (bloqueaba el envío). Acción "Waiting List" del hero CTA ya habilitada. Saltado: `viaCapture`/`InvitedByBanner` (seguimiento `?via` del MMS, no existe en Gem2i) |
| 47 | Imágenes por defecto (de 1.D) | **Hecho (adelantado)** | Dependencia de #23/#24/#25: `lib/defaultImages.js` + `user.png`/`sponsor.png` (neutros). `mentor.png` no se trajo (lleva "$", mundo de mentoría financiera de Carlos) |

Verificación local 1.B: `py_compile` OK · `yarn build` verde (solo los 4 avisos previos) · detector impeccable limpio en los 5 archivos de UI.
**Deploy 1.B: GREEN 3m46s**, y en la verificación apareció un **fallo R12 (datos de Carlos colados)**: el seed de enrollment traía el cuestionario financiero de Carlos (activos, deuda, credit score, inversiones…) y 3 textos legales de ACG ("ACGMP Privacy Policy") → visibles en `/membership-enrollment` público. **Corregido**: `DEFAULT_FIELDS` reescrito a 19 campos neutros (identidad + contacto + firma + confirmación + 1 aceptación genérica de Términos/Privacidad; el submit solo consume esos campos) y **revertido el efecto en BD de mi propio deploy**: los 50 campos creados a las 16:02:27 por ese deploy (la colección no existía antes; 0 solicitudes dependientes) se exportaron a `/opt/_port_backups/enrollment_fields_carlos_seed_20260923.json` y se borraron; el redeploy siembra el set neutro.
**Redeploy de corrección: GREEN 1m48s** — `/api/public/enrollment-fields` = 19 campos neutros; `/membership-enrollment` renderiza en navegador (antes fallaba); modal Waiting List renderiza con estilo gem2i. Etiquetas de pasos del enrollment cambiadas a neutras (salen en el deploy del siguiente sector).

### Sector 1.C — Puntos, comercio y mentoría ⏸ (nada portable sin decisión humana)
| # | Módulo | Resultado | Motivo |
|---|---|---|---|
| 32 | Puntos del miembro | **PENDIENTE (H12)** | R2: Gem2i ya tiene su propio libro de puntos (`gem_points_history`, 6.457 filas legacy + `points_actions`) y la Fase 6 de su plan (B5 share→referral + puntos por compra). Portar el motor de Carlos crearía un 2º libro |
| 33 | eBank / ganancias | **PENDIENTE (H12)** | R2 + R4; depende de #32 y #35; sus campos son de inversión (metas, capital, riesgo) |
| 34 | Bundles + cupones | **PENDIENTE (H12)** | Son paquetes de **sesiones de mentoría** (depende de #35, R14) + R4 (Stripe) |
| 35 | Mentoría (agenda) | **PENDIENTE (H12)** | Producto de mentoría financiera; no existe en el plan de Gem2i. R3 + R4 |
| 36 | Mentoring System | **PENDIENTE (H12)** | Depende de #35, #26 y del LMS (1.F) — R14 |
| 37 | Calendario global + iCal | **PENDIENTE (H12)** | R3: Gem2i ya tiene `gem_events` (1.704 eventos, guest list, tickets). Un 2º sistema de eventos confundiría |
| 38 | Portafolios del miembro | **PENDIENTE (H12)** | Son carteras de **inversión** (holdings, efectivo, empresas/sectores/industrias) → depende de Companies #40 (R14) |

Sin cambios de código en 1.C.

### Sector 1.D — Contenido y directorios ✅ (código listo; deploy al cierre)
| # | Módulo | Resultado | Detalle |
|---|---|---|---|
| 39 | Reading List (libros) | Saltado (no aporta) | El tema gem2i no muestra la Reading List en ningún sitio; los 3 libros en BD son semilla demo del fork. El detalle de libro de Carlos además depende del KMS (posts relacionados) |
| 40 | Companies | **PENDIENTE (H13)** | Directorio de inversión (572 empresas, CIK/IR); se quitó a propósito en el strip (D-GEM-2026-02) |
| 41 | Opportunities | **PENDIENTE (H13)** | Igual que #40 y depende de él |
| 42 | Model Portfolio | **PENDIENTE (H13)** | Depende de KMS + Companies (R14) |
| 43 | Featured Projects / Conferences / Recommended | Saltado (no aporta) | Lista el contenido "Portfolio" de Carlos; Gem2i ya tiene sus propios catálogos (incl. conferencias) |
| 44 | Documentación (admin) | **PENDIENTE (H14)** | Los manuales son de Carlos (R12: onboarding, skills, logos…); portarlos tal cual filtraría su documentación |
| 45 | Reports / Analytics | **PENDIENTE (H14)** | Solo se monta dentro de My Account 2.0 (#26) y calcula ingresos desde `payment_transactions`; en Gem2i los ingresos viven en `gem_transactions` → mostraría 0. Sería trabajo nuevo, no un port |
| 46 | ImageAdjust (recorte) | **Hecho** | `ImageAdjust` + `ImageUpload`/`MemberImageUpload` con la opción `adjust` (apagada por defecto). Activada en 13 puntos **del CMS**: logos (modo "original" para conservar transparencia), fondo de login y del hero (16:9), avatares (1:1), foto del hero, bloques del Page Builder, portada de mapas. **No** activada en el avatar del miembro (el modal usa el teal del CMS y chocaría con My Account oscuro) |
| 47 | Imágenes por defecto | **Hecho** (en 1.B) | — |

**Deploy 1.D: GREEN 3m35s** — `/api/health`, `/`, `/festivals`, `/membership-enrollment`, `/admin/settings` = 200; el bundle servido (`main.b718fd3d.js`) ya lleva las etiquetas nuevas del enrollment y no las viejas.

### Sector 1.E — Herramientas server-rendered ⏸ (nada portable sin decisión humana)
| # | Módulo | Resultado | Motivo |
|---|---|---|---|
| 48 | KMS / Insights | **PENDIENTE (H15)** | Quitado a propósito en el strip (D-GEM-2026-02). Blog/biblioteca financiera de Carlos (iiReport, rankings, banners horneados); requiere subdominio, `html5lib`/`tinycss2` y reemplazar el shim `kms_sync` (R5) |
| 49 | News | **PENDIENTE (H15)** | Strip D-GEM-2026-02; montado en `/auxnews`, prefijos `aux` (R7) |
| 50 | Morning Brief | **PENDIENTE (H15)** | Strip; depende del KMS (R14) |
| 51 | Prompt Management | **PENDIENTE (H15)** | Strip; necesita **API key de Claude** (credencial) + `weasyprint` y libs apt en la caja; depende de #48/#50 (R14) |
| 52 | Mail in-CMS | **PENDIENTE (H15)** | Strip; necesita infraestructura **SES → S3** y DNS de correo (credenciales + DNS) |
| 53 | Discord webhooks | Idéntico | `utils/discord.py` ya es igual en Gem2i |
| 54 | Auto-post a X | **PENDIENTE (H15)** | Necesita credenciales OAuth de X y algo que publicar (#49/#50) |
| 55 | Puente CMS→IMS/MMS | **PENDIENTE (H15)** | Depende de los productos IMS/MMS (1.F, R14); reemplazaría el shim `mms_events` (R5) |
| 56 | Rate limit | Idéntico | — |

Sin cambios de código en 1.E.

### Sector 1.F — Productos hermanos ⏸ (todo requiere humano)
| # | Producto | Resultado | Qué haría falta |
|---|---|---|---|
| 57 | IMS | **PENDIENTE (H16)** | Subdominio + DNS, puerto nuevo (8050 ya es de gem2i, R9), servicio systemd, vhost, certificado, script de deploy propio con guard de IP (R10), build local por la RAM de 1,9 GiB (R11). Además depende de KMS/Morning (R14) |
| 58 | PMS | **PENDIENTE (H16)** | Mismo paquete de infraestructura (R9–R11) + reemplazar el shim `pms_roles` (R5) |
| 59 | LMS | **PENDIENTE (H16)** | Idem + shim `lms_roles` |
| 60 | MMS | **PENDIENTE (H16)** | Idem + shims `mms_roles`/`mms_events` + **R2** (choca con el libro de puntos de Gem2i) |
| 61 | Journal | **PENDIENTE (H16)** | Idem (colecciones `jr_`); producto de trading, sin relación con entretenimiento |

Sin cambios de código en 1.F.

### Sector 1.G — Temas y secciones de marca
| # | Módulo | Resultado | Motivo |
|---|---|---|---|
| 62 | Personal Brand Pro | **PENDIENTE (H17)** | Choca con D8 (Gem2i conserva su identidad) y con D-GEM-2026-02 (temas de marca retirados) |
| 63 | Aurex sections / Private Community Pro | **PENDIENTE (H17)** | Igual que #62 |
| 64 | Paleta por grupos de color | Saltado (no aporta) | Lo que Carlos añadió a `themeColors.js`/`index.css` son las paletas de My Account 2.0 (#26) y de la familia Aurex; la paleta de Gem2i ya funciona (grupos `website`/`my_account`/`enrollment`…) |
| 65 | Catálogo de redes sociales | Idéntico | — |

Sin cambios de código en 1.G.

### Sector 1.H — Tooling y operación
| # | Elemento | Resultado | Motivo |
|---|---|---|---|
| 66 | Slash-commands `/new_company`, `/get_logo_company` | **PENDIENTE (H13)** | Solo sirven para Companies (#40) |
| 67 | Skill `aux-migrate-tech-stack` | Idéntico (ya copiada en la sesión 1) | — |
| 68 | Scripts de deploy | Saltado (R10) | Gem2i ya tiene `deploy_beta_gem2i.ps1` con guard de IP; copiar los de Carlos apuntaría a sus cajas |
| 69 | Banco de logos (~122 MB) | **PENDIENTE (H13)** | Solo sirve para Companies (#40) |
| 70 | Checklist de marca | Saltado (no aporta) | Pasos para lanzar marcas AUX (carlos/aurex/acapital) en su infraestructura; Gem2i tiene su propio `DEPLOYMENT.md` |

Sin cambios de código en 1.G ni 1.H.

---

## PENDIENTES PARA HUMANO

> Cada ítem: qué hace falta, quién, y la recomendación. Se añaden a medida que avanza la ejecución.

| # | Módulo(s) | Qué necesita | Recomendación |
|---|---|---|---|
| H1 | #21 Invite Code | Poner **Site URL** `https://beta.gem2i.com` en CMS → Settings → General (sin eso el QR da 400 y el email de invitación se omite) + configurar **SMTP** | Hacerlo ya; es config de CMS, 1 minuto |
| H2 | #21 Invite Code | Decidir a qué miembros se activa `can_create_qr` (CMS → Members) | Empezar por el admin y 1–2 promotores para probar |
| H3 | #21/#22 | e2e. **Hecho por Claude 2026-09-23 (todo lo que no exige crear cuenta ni iniciar sesión):** Site URL + SMTP configurados ✔ · `validate-sponsor/3` → 200 "GEM-3 (Salvador Salinas Perez)", nº inexistente → 404 ✔ · código inválido → 404/400 ✔ · página del QR `/my-account/register?sponsor=3` muestra "Sponsored by: GEM-3 (…)" + formulario ✔ · código inválido en `/register?code=` → "Invalid or used code" ✔ · árbol de GEM-3 = 1.625 personas / 8 niveles, datos correctos pero lento (→ H18). **Falta (requiere humano: crear cuenta / iniciar sesión, que Claude no puede hacer):** registrarse con un código y con el QR, generar códigos y QR logueado, abrir My Community logueado | Crear un miembro de prueba, activarle `can_create_qr`, y en 10 min: generar 1 código → registrarse con él en otra ventana → ver al nuevo en My Community; generar QR → abrir la URL |
| H5 | #2 Miembros | Crear índices únicos `members.membership_number` y `members.membership_id` (cambio en BD). El contador atómico ya evita la carrera; los índices son la red final que activa el reintento | **Comprobado 2026-09-23 (solo lectura): 0 duplicados** de número y de ID; los 1.737 números son `int`; hoy solo existen los índices `_id_`, `legacy_id_1`, `email_1`. Es seguro crearlos: `db.members.createIndex({membership_number:1},{unique:true,name:"uniq_membership_number"})` y lo mismo con `membership_id` / `uniq_membership_id` |
| H6 | #11 Landing | Poner **Operator Email** en CMS → Settings → Email para recibir los avisos de Waiting List (junto con SMTP, ver H1) | Hacerlo cuando se configure SMTP |
| H7 | #26 My Account 2.0 (Velzon) | Decidir si Gem2i quiere un segundo diseño de My Account. Es un clon completo (≈30 páginas + tema Velzon claro/oscuro), en Carlos aún "en construcción" y solo para admins; depende además de #36 (mentoría) y #45 (reports) | **No portarlo ahora.** Mejor invertir en que el My Account actual use la paleta gem2i (ver H4). Reevaluar si Carlos lo da por terminado |
| H8 | #29 Gobernanza NIVEL/TIPO/ROL | Decidir el modelo de acceso de Gem2i: hoy los 1.737 miembros **no tienen nivel** (ven todo) y existen "Level 1–4" heredados del fork. La gobernanza de Carlos cambia qué ve cada miembro (niveles aplicados en servidor, capacidades por tipo, páginas por nivel, nivel/tipo por defecto al registrarse) | Primero definir los niveles de negocio de Gem2i (¿qué ve un miembro normal vs promotor vs VIP?) con Anthony; después portar. Sin esa definición portarlo solo añade código inerte o cambia accesos sin querer |
| H9 | #30 Puerta única de productos | Depende de los productos hermanos 57–61 (IMS/PMS/LMS/MMS/Journal), que no existen en Gem2i (R14) | Saltar mientras no se decida portar algún producto hermano |
| ~~H10~~ | #20 Enrollment | ✅ **RESUELTO 2026-09-23 (Carlos M. Artiles): "déjalo como Carlos, migra esa data"** → restaurados los 50 campos originales de Carlos (cuestionario + 3 textos legales, incl. "ACGMP Privacy Policy") desde `/opt/_port_backups/enrollment_fields_carlos_seed_20260923.json`; `DEFAULT_FIELDS` y etiquetas de pasos como en Carlos. El set neutro quedó respaldado en `/opt/_port_backups/enrollment_fields_neutral_20260923.json` | — |
| H11 | #20 Enrollment (look) | `/membership-enrollment` ya funciona pero se ve con la paleta "Enrollment" por defecto (naranja/clara), que nunca se configuró para gem2i | Ajustar en CMS → Settings → Theme Colors → Enrollment (fondo oscuro #04080C, acento #3287B7) — es config, sin código. Las etiquetas de los pasos ya se cambiaron a neutras en código |
| H12 | Sector 1.C completo (#32–#38) | Decisión de producto: ¿Gem2i necesita mentoría, sesiones de pago, eBank, carteras de inversión, un calendario aparte? Todos son del mundo financiero/mentoría de Carlos, y los puntos chocan con el libro propio de Gem2i (R2) | **No portar 1.C.** Para puntos: construir la Fase 6 de Gem2i sobre `gem_points_history` (B5 share→referral + puntos por compra de ticket). Revisar #37 solo si se quiere un calendario de miembros distinto de los eventos |
| H13 | #40 Companies · #41 Opportunities · #42 Model Portfolio · #66 slash-commands · #69 banco de logos | Revertir la decisión del strip (D-GEM-2026-02): son el directorio de inversión de Carlos, sin relación con un portal de entretenimiento | **No portar.** Si algún día Gem2i quiere un directorio (p. ej. de agencias/promotoras), construirlo sobre los catálogos `gem_*` existentes |
| H14 | #44 Documentación · #45 Reports | Docs: decidir si Gem2i quiere manuales en el CMS (el motor sirve, el contenido de Carlos no). Reports: decidir si se quiere un panel de métricas | Docs: escribir manuales propios de Gem2i cuando el producto esté estable. Reports: construir un informe propio sobre `gem_transactions` + `member_logins` (logins ya se registran desde 1.A) |
| H15 | Sector 1.E (#48–#52, #54, #55) | Revertir el strip (D-GEM-2026-02) y aportar credenciales/infra: API key de Claude (#51), SES+S3+DNS de correo (#52), OAuth de X (#54), subdominio para KMS (#48) | **No portar.** Son las herramientas editoriales/financieras de Carlos; ninguna está en el plan de Gem2i. Si Gem2i quiere un blog o noticias de eventos, diseñarlo sobre sus catálogos |
| H16 | Sector 1.F (#57–#61) | Por producto: subdominio + DNS (A → 34.198.159.54), puerto libre (≥8060), systemd, vhost nginx, certificado LE, script de deploy propio, acceso a la caja | **No portar.** Ninguno está en el plan de Gem2i; si se quiere uno (p. ej. LMS para cursos de DJ), abrir un plan específico con Anthony |
| H17 | Sector 1.G (#62, #63) | Revertir D8 / D-GEM-2026-02 (temas de marca de Carlos/Aurex) | **No portar.** Gem2i mantiene su tema oscuro propio |
| H18 | #22 My Community (rendimiento) | **Hallado en el e2e:** el árbol del mayor sponsor legacy (GEM-3: 1.625 personas en 8 niveles) tarda **7,2 s** en construirse (1 consulta por nodo, sin índice en `members.sponsor_id`) | Crear índice (no único, reversible): `db.members.createIndex({sponsor_id:1},{name:"sponsor_id_1"})` — cambio en BD, por eso queda aquí |
| H19 | #11 Operator Email | En BD `settings.operator_email` sigue **vacío** (consulta 2026-09-23 tras "hecho"). Sin él no llega el aviso al operador de cada alta en Waiting List (el email al suscriptor sí sale) | Revisar CMS → Settings → Email → Operator Notifications y pulsar **Save** |
| H4 | My Account (general) | El tema `my_account` de Theme Colors sigue en los valores por defecto (dorado de Carlos) y el menú lista ítems sin página en Gem2i (ebank, portfolios, "AUX Calendar", mentoría, bundles…) | Ajustar colores en CMS → Theme Colors → My Account y ocultar esos ítems en CMS → My Account Nav |
