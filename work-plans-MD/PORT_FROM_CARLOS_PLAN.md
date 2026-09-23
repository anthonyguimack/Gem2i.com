# PORT_FROM_CARLOS_PLAN.md — Portar funcionalidades de Carlos (AUX-1.0) → Gem2i

```
CLAIMED BY : (libre) — lo ejecutará el colaborador en su máquina
STATUS     : BORRADOR PARA REVISIÓN de Anthony. §1 y §2 completos. §3 ESPERA la selección
             de módulos de Anthony (marcar [x] en §1). §4–§6 = procedimiento listo para usar.
LAST SYNC  : 2026-09-23 · Carlos HEAD 6d47d6f · Gem2i HEAD 26b7d0e (= origin/main)
```

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
| [ ] | Auth / Admin login | Login JWT del CMS, Google OAuth, usuarios admin | `backend/routes/auth.py`, `backend/models/database.py`, `frontend/src/pages/admin/AdminLoginPage.js`, `UsersManager.js`, `lib/auth.js` | Sí (modificado: `verify_password` endurecido, login case-insensitive) |
| [ ] | Miembros (CRUD admin) | Gestión de miembros, niveles, tipos, logins, firmas | `backend/routes/membership.py`, `admin_tools.py`; `pages/admin/MembersManager.js`, `MemberLevelsManager.js`, `MemberTypesManager.js`, `MemberLogins.js`, `MemberSignatures.js` | Sí (versión 15-jul) |
| [ ] | Roles & permisos CMS | Roles del sistema (`role_admin`, `role_author`…) + permisos por sección | `backend/routes/roles.py`, `backend/models/cms_sections.py`, `pages/admin/RolesManager.js`, `Forbidden.js` | Sí (Gem2i modificó `cms_sections.py`) |
| [ ] | Admin por rol (`is_admin`) | Un 2º admin se crea asignando el rol Administrator (sin tocar DB) | `backend/models/database.py::is_admin`, `backend/utils/product_access.py` | **No** (Gem2i solo acepta `role=="admin"`) |
| [ ] | Hero canvas + A/B | Slides del hero con coordenadas 700×300, editor visual, test A/B | `routes/hero_ab.py`; `components/HeroSection.js`, `HeroCanvasEditor.js`; `pages/admin/HeroManager.js`, `HeroSlideForm.js`, `HeroAbAnalytics.js`; `lib/heroCoords.js` | Sí (HeroSection muy modificado por Gem2i) |
| [ ] | Hero CTA por Acción | CTA del hero con acción Url/Login/Waitlist | `frontend/src/lib/ctaActions.js`, `HeroSlideForm.js` | **No** |
| [ ] | Page Builder / páginas dinámicas | Páginas con bloques y layouts | `components/admin/PageBuilder.js`, `BlockConfigModal.js`, `components/layouts/*`, `pages/DynamicPage.js`, `pages/admin/PagesManager.js`, `lib/layoutDefinitions.js` | Sí |
| [ ] | Section Order | Orden y visibilidad de secciones del home | `pages/admin/SectionOrderManager.js` | Sí |
| [ ] | Contenidos básicos | About, Services, Testimonials, Portfolio, Gallery, Blog, Books | `routes/admin_content.py`, `routes/public.py`; `pages/admin/{About,Services,Testimonials,Portfolio,Gallery,GalleryAlbums,Blog,Books}Manager.js` | Sí (versión 15-jul) |
| [ ] | Geo + Mapas | Países/estados/ciudades + páginas de mapa | `populate_geo.py`, `pages/admin/GeoManager.js`, `MapsManager.js`, `pages/MapDetailPage.js`, `lib/mapConfig.js` | Sí |
| [ ] | Landing page + suscriptores | Landing con hero propio, contactos y waiting list | `routes/landing.py`; `pages/LandingPage.js`; `pages/admin/Landing*Manager.js` | Sí |
| [ ] | Contacto | Formulario de contacto + ajustes | `pages/admin/ContactsManager.js`, `ContactSettingsManager.js` | Sí |
| [ ] | Email templates + SMTP | Plantillas transaccionales editables | `routes/email_templates.py`, `models/email_templates.py`, `utils/email_render.py`, `pages/admin/EmailManagement.js` | Sí (Gem2i modificó `models/email_templates.py`) |
| [ ] | Captcha | reCAPTCHA en formularios públicos | `routes/captcha.py`, `utils/captcha.py`, `components/CaptchaWidget.js` | Sí |
| [ ] | SEO / Settings / Backup / Analytics | Ajustes globales, SEO, respaldo de DB, analytics | `pages/admin/SettingsManager.js`, `SeoManager.js`, `BackupManager.js`, `AnalyticsDashboard.js`, `utils/runtime_config.py` | Sí |
| [ ] | Stripe / Checkout / Compras | Pagos Stripe con llaves en CMS, compras | `routes/payments.py`, `utils/stripe_helpers.py`, `pages/CheckoutSuccess.js`, `pages/admin/PurchasesManager.js` | Sí (lo usa `gem_tickets`) |
| [ ] | i18n EN/ES | `useT()`, textos localizados | `lib/i18n.js`, `components/LanguageSwitcher.js`, `components/admin/LocalizedField.js` | Sí |
| [ ] | Personalidades (mini-sitios) | Business/Lifestyle/Personal por ruta + pestañas por personalidad | `utils/personality.py`, `lib/pbPersonality.js`, `components/admin/PersonalityTabs.js` | Sí (parcial) |

### 1.B Membresía, comunidad y My Account

| Sel. | Módulo | Descripción | Ubicación en Carlos | En Gem2i |
|---|---|---|---|---|
| [ ] | Registro / login de miembro | Registro con invite code, login, olvido/reset de contraseña | `pages/myaccount/Member{Register,Login,ForgotPassword,ResetPassword}.js`, `lib/memberAuth.js`, `components/LoginModal.js` | Sí (**muy re-estilizado por Gem2i**) |
| [ ] | Enrollment wizard | Alta en 4 pasos configurable desde CMS | `backend/routes/enrollment.py`, `pages/MembershipEnrollment.js`, `pages/admin/EnrollmentFieldsManager.js` | Página sí; **`enrollment.py` y su manager NO** |
| [ ] | Invite Code + QR | Generar códigos únicos, enviar invitación, QR de negocio | `pages/myaccount/InviteCode.js`, `routes/membership.py` | **No** (la página) |
| [ ] | My Community | Árbol de downline, contadores, perfil del miembro | `pages/myaccount/MyCommunity.js`, `components/TreeNode.js` | **No** (la página; `TreeNode` sí) |
| [ ] | My Sponsor | Datos del patrocinador | `pages/myaccount/MySponsor.js` | Sí |
| [ ] | Perfil de membresía + biografía | Perfil, campos ocultables (ojo), biografía | `pages/myaccount/MembershipProfile.js`, `UpdateBiography.js` | Sí (versión 15-jul, sin campos ocultables) |
| [ ] | My Account layout + navegación | Shell de My Account, menú configurable, Quick Links con SSO | `pages/myaccount/MyAccountLayout.js`, `pages/admin/MyAccountNavManager.js`, `QuickLinksManager.js`, `lib/myAccountBase.js`, `lib/myAccountThemes.js`, `lib/ssoNav.js` | Parcial (sin SSO/temas) |
| [ ] | My Account 2.0 (Velzon) | Clon de My Account con piel Velzon (admin-only) | `pages/myaccount2/*` (incl. `velzon-theme.css`, `ma2Theme.js`) | **No** |
| [ ] | Prefijo de membresía dinámico | `settings.aux_prefix` por instancia (`GEM-n`) | `utils/membership_prefix.py`, `scripts/rename_membership_prefix.py` | Parcial (Gem2i ya usa `GEM`, sin el util) |
| [ ] | Prefijo de referido | Sufijo `/<prefix>-<N>` en links compartidos | `backend/utils/referral.py` | **No** |
| [ ] | Gobernanza NIVEL/TIPO/ROL | Acceso por nivel, capacidades por miembro, páginas por nivel | `utils/level_access.py`, `utils/member_capabilities.py`, `utils/site_pages.py`, `lib/sitePages.js`, `scripts/seed_governance_v2.py` | **No** |
| [ ] | Puerta única de productos | Acceso a productos por nivel vía Quick Links | `utils/product_access.py` | **No** |
| [ ] | Lead capture | Modal de suscripción → pre-registro bajo sponsor | `utils/leadcapture.py`, `components/WaitingListModal.js`, `lib/viaCapture.js`, `components/InvitedByBanner.js` | util sí; **componentes no** |

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
| [ ] | ImageAdjust (cropper) | Recorte/ajuste de imagen reutilizable | `components/ImageAdjust.js` | **No** |
| [ ] | Imágenes por defecto | Avatar/sponsor/mentor por defecto | `lib/defaultImages.js`, `frontend/public/defaults/*` | **No** |

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
