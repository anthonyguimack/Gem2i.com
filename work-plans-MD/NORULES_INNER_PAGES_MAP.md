# Norules — mapa de páginas internas (2026-10-23, sesión 13)

Revisado en beta (plantilla activa `gem2i` = Norules) y en el código (`App.js`, `pages/gem2i/norules/`, home `NorulesHome.js`).
Leyenda de estado: ✅ rediseñada con boceto aprobado · 🟡 copia propia de Norules, aún sin rediseño · 🔴 no existe / usa página genérica del CMS.

## 1. Listados (vista de card y/o lista)

| Página | Vista | Estado | Notas |
|---|---|---|---|
| `/events` | **Card** (E1) + **Lista** (E3) | ✅ | Current/Past, Event/List view, buscador completo |
| `/festivals` | **Card** (F4) | ✅ | + bloque Conferences en rejilla con «Load more» |
| `/artists` | **Card** (A1) + columna ranking (lista) | ✅ | Ranking/All artists |
| `/venues` | **Card** foto + **Card** logo (V1) | ✅ | Top venues en rejilla + Photo/Logo view |
| `/travels` | **Filas** (T0) | ✅ | ficha T2 pendiente |
| `/services` | **Card** (rejilla de 8) + carrusel «Our works» | 🟡 | boceto S1/S2 hecho, sin elegir |
| `/partners` | **Card** (rejilla de logos) | 🟡 | solo miembros; hoy «Coming soon» |
| `/gallery` | **Card** (rejilla de fotos con pestañas) | 🔴 | página genérica del CMS (`GalleryPage`), no es de Norules |
| `/conferences` | — | 🔴 | **404**: el botón «All conferences» de la home lleva aquí |
| `/works` | — | 🔴 | página CMS vacía («Works»); la enlaza Services («View all works») |
| `/media` | — | 🔴 | página CMS vacía («Media»); la enlaza el footer (Company) |

## 2. Fichas de detalle — ✅ rediseñadas y desplegadas 2026-10-23 (boceto norules-detail-pages.html), salvo `/travels/:slug` y las de abajo

| Página | Qué tiene hoy | Listas/cards dentro |
|---|---|---|
| `/events/:slug` | foto, datos, Follow, **Tickets** (e-ticket) o **Guest list**, DJ Line-up | cards de artista (line-up) |
| `/artists/:slug` | foto, datos, géneros, Follow | — (sin «próximos eventos») |
| `/venues/:slug` | foto, logo, capacidad, Follow, **Upcoming Events** | lista de eventos de la sala |
| `/festivals/:slug` | foto, datos, Line-up | cards de artista |
| `/conferences/:slug` | misma plantilla que festival + **Conference schedule** (días/sesiones) | sesiones por día |
| `/travels/:slug` | 🔴 no existe | boceto T2 aprobado |
| `/tickets/success` | confirmación de pago + QR | — |
| `/terms`, `/privacy` | 🔴 página genérica del CMS | — |

## 3. Secciones de la home que llevan a páginas internas

| Sección (home Norules) | Enlaza a |
|---|---|
| Hero U | `/events/:slug`, `/events` |
| Intro (Who we are) | `/membership-enrollment`, `#services` |
| Explore the scene | `/venues`, `/events`, `/artists` |
| Upcoming events | `/events`, `/events/:slug` |
| Artists | `/artists`, `/artists/:slug` |
| Venues | `/venues`, `/venues/:slug` |
| Festivals | `/festivals`, `/festivals/:slug` |
| Conferences | **`/conferences` (404)**, `/conferences/:slug` |
| Pricing | `/membership-enrollment`, `/my-account/membership`, `/contact` |
| Latest news | externo → insightsbeta.gem2i.com (KMS) |
| Gallery | `/gallery` (genérica) |
| Locations | `/map/:slug` (genérica) |
| FAQ, Clients, Services | `/#contact` |
| Header | `/about /events /festivals /artists /venues /travels /services /partners` |
| Footer | + `/media`, `/membership-enrollment`, `/terms`, `/privacy` |

## 4. Orden sugerido de bocetos

1. **Fichas de detalle** (las ve todo el que hace clic en una card): Event → Artist → Venue → Festival/Conference.
2. **`/conferences`** listado nuevo (hoy 404) — card + lista, como Events.
3. **`/travels/:slug`** (T2) + viajes demo.
4. **Services** (elegir S1/S2) + **`/works`** (portafolio, hoy vacío).
5. **Partners**, **Gallery** propia de Norules, **Media**.
6. **Terms / Privacy** (plantilla de texto legal) y **Ticket success**.

## 5. Pendiente a 2026-10-23 (tras desplegar listados + fichas)

| Página | Estado | Qué falta |
|---|---|---|
| `/conferences` | 🔴 404 | listado nuevo (card + lista), lo enlazan la home y la ficha de conferencia |
| `/travels/:slug` | 🔴 no existe | ficha T2 (boceto aprobado) + campos de paquetes/itinerario + reserva |
| `/services` | 🟡 | elegir S1 o S2 (boceto hecho) |
| `/works` | 🔴 vacía | portafolio (Our works) |
| `/partners` | 🟡 | rediseño (rejilla de logos, solo miembros) |
| `/gallery` | 🔴 genérica | galería propia de Norules |
| `/media` | 🔴 vacía | página de vídeos/prensa |
| `/map/:slug` | 🔴 genérica | ficha de oficina (desde «Where GEM2i plays») |
| `/terms`, `/privacy` | 🔴 genéricas | plantilla de texto legal |
| `/tickets/success` | 🟡 | confirmación de pago + QR con el estilo nuevo |
| `/membership-enrollment` | compartida | formulario de alta (4 pasos) — no es de Norules |
