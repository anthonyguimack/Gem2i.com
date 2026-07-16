"""gem2i site content (GEM2I_MIGRATION_PLAN §4 gem_config / §5).

  GET  /api/public/gem/gem-content   — Public: homepage + static-section copy
  GET  /api/admin/gem/gem-content    — Admin: same doc for the CMS editor
  PUT  /api/admin/gem/gem-content    — Admin: save

Content lives in the `gem_config` collection as {key: "content", data: {...}}
(house rule D-2026-48: gem_* product config NEVER goes in `settings`). Only
the `content` key is ever exposed publicly — other gem_config keys (payments,
ecommissions) hold secrets and stay server-side.

Defaults below carry the legacy gem2i.com homepage copy (EN verbatim from the
live site, ES translated) so a fresh box renders the real brand with zero
manual entry; every field is CMS-overridable via the PUT endpoint.
"""
from fastapi import APIRouter, Depends, Request
from models.database import db, require_admin

router = APIRouter()

DEFAULT_GEM_CONTENT = {
    "intro": {
        "heading": {"en": "Global Entertainment Management & Marketing Integration",
                    "es": "Gestión Global de Entretenimiento e Integración de Marketing"},
        "text": {
            "en": "GEM2i is the leading full service marketing, media and business integration company focusing exclusively on the entertainment and service industry. Its origins dates back to an entertainment and promotions partnership which was first established in 1993. As of 2002, it was reorganized and focused to serve different segments & demographics. With the introduction of our proprietary business development methodology, the company is now on track to become one of the largest and most geographically diversified enterprise within the entertainment business community. We have developed a network of entertainment professionals, promoting companies, festivals, venues and artists that extend our services to more than 17 markets in North America, South America, Europe and Asia. Our team of professionals design, develop and execute unique strategies and business models which aim to fit the needs of our clients and their customers.",
            "es": "GEM2i es la empresa líder de servicios integrales de marketing, medios e integración de negocios enfocada exclusivamente en la industria del entretenimiento y los servicios. Sus orígenes se remontan a una sociedad de entretenimiento y promociones establecida en 1993. A partir de 2002 fue reorganizada y enfocada para servir a distintos segmentos y demografías. Con la introducción de nuestra metodología propia de desarrollo de negocios, la empresa está en camino de convertirse en una de las mayores y más diversificadas geográficamente dentro de la comunidad del entretenimiento. Hemos desarrollado una red de profesionales del entretenimiento, promotoras, festivales, venues y artistas que extiende nuestros servicios a más de 17 mercados en Norteamérica, Sudamérica, Europa y Asia. Nuestro equipo de profesionales diseña, desarrolla y ejecuta estrategias y modelos de negocio únicos que buscan ajustarse a las necesidades de nuestros clientes y sus consumidores.",
        },
    },
    "featured": [
        {
            "kicker": {"en": "Featured", "es": "Destacados"},
            "title": {"en": "VENUES", "es": "VENUES"},
            "text": {
                "en": "Our venue selection highlights some of the best and trendiest entertainment spaces from around the globe. We strive to keep our growing community informed about our recommended list of top venues and their unique client offerings.",
                "es": "Nuestra selección de venues destaca algunos de los mejores y más innovadores espacios de entretenimiento del mundo. Nos esforzamos por mantener a nuestra creciente comunidad informada sobre nuestra lista recomendada de venues destacados y sus ofertas exclusivas.",
            },
            "url": "/venues",
        },
        {
            "kicker": {"en": "Featured", "es": "Destacados"},
            "title": {"en": "EVENTS", "es": "EVENTOS"},
            "text": {
                "en": "We have a comprehensive list of the world's best festivals and events focusing on those that offer a unique customer experience. Our team explores the globe to curate a list of the right events for our community.",
                "es": "Contamos con una lista completa de los mejores festivales y eventos del mundo, enfocándonos en los que ofrecen una experiencia única. Nuestro equipo recorre el mundo para curar los eventos adecuados para nuestra comunidad.",
            },
            "url": "/events",
        },
        {
            "kicker": {"en": "Featured", "es": "Destacados"},
            "title": {"en": "ARTISTS", "es": "ARTISTAS"},
            "text": {
                "en": "Within our feature artists' section, we strive to highlight the current talent landscape in the electronic music world. In this section, you will find current ranked worldwide artists, as well as, recently discovered talents. Our goal is to have a well inform membership community.",
                "es": "En nuestra sección de artistas destacados buscamos resaltar el panorama actual del talento en el mundo de la música electrónica. Aquí encontrarás artistas clasificados a nivel mundial, así como talentos recientemente descubiertos. Nuestro objetivo es una comunidad de miembros bien informada.",
            },
            "url": "/artists",
        },
    ],
    "services_banner": {
        "text": {"en": "If you need Strategic Planning service, Contact us",
                 "es": "Si necesitas servicios de Planificación Estratégica, contáctanos"},
        "rotating": [
            {"en": "Strategic Planning", "es": "Planificación Estratégica"},
            {"en": "Brand Development", "es": "Desarrollo de Marca"},
            {"en": "Event Management", "es": "Gestión de Eventos"},
            {"en": "Artist Management", "es": "Gestión de Artistas"},
        ],
    },
    "services": {
        "kicker": {"en": "OUR", "es": "NUESTROS"},
        "title": {"en": "Services", "es": "Servicios"},
        "items": [
            {"en": "Project Management and Strategic Development", "es": "Gestión de Proyectos y Desarrollo Estratégico"},
            {"en": "Social Media & Influence Marketing", "es": "Redes Sociales y Marketing de Influencia"},
            {"en": "Brand Development & Management", "es": "Desarrollo y Gestión de Marca"},
            {"en": "Venue Marketing Management & Consulting", "es": "Gestión de Marketing y Consultoría de Venues"},
            {"en": "Artist Management & Public Relations", "es": "Gestión de Artistas y Relaciones Públicas"},
            {"en": "Concept & Productions Development", "es": "Desarrollo de Conceptos y Producciones"},
            {"en": "Event Management, Marketing & Consulting", "es": "Gestión de Eventos, Marketing y Consultoría"},
            {"en": "Sponsorship and Endorsment", "es": "Patrocinios y Endosos"},
        ],
    },
    "methodology": {
        "kicker": {"en": "OUR", "es": "NUESTRA"},
        "title": {"en": "Methodology", "es": "Metodología"},
        "steps": [
            {
                "title": {"en": "Goal definition", "es": "Definición de objetivos"},
                "text": {"en": "A well defined strategic objective and clarity statement for the benefit of all stake holders.",
                         "es": "Un objetivo estratégico bien definido y una declaración de claridad en beneficio de todas las partes interesadas."},
            },
            {
                "title": {"en": "Analysis", "es": "Análisis"},
                "text": {"en": "The business feasibility analysis and the process development are the keys to a sustainable and profitable enterprise.",
                         "es": "El análisis de viabilidad del negocio y el desarrollo de procesos son las claves de una empresa sostenible y rentable."},
            },
            {
                "title": {"en": "Implementation", "es": "Implementación"},
                "text": {"en": "A well drafted prototype of the business with all its working components and the efficient utilization of all resources.",
                         "es": "Un prototipo bien elaborado del negocio con todos sus componentes operativos y la utilización eficiente de todos los recursos."},
            },
        ],
    },
    "media": {
        "kicker": {"en": "MEDIA", "es": "MEDIA"},
        "title": {"en": "Section", "es": "Sección"},
        "see_all": {"en": "See all videos", "es": "Ver todos los videos"},
        # [{title:{en,es}, youtube_id}] — entered via CMS (legacy page was hardcoded)
        "videos": [],
    },
    "clients": {
        "kicker": {"en": "OUR", "es": "NUESTROS"},
        "title": {"en": "Clients", "es": "Clientes"},
        "text": {
            "en": "We have worked on campaigns with some of the top global brands side by side with our regional partners. Here is a short list of some of clients/brands that we have worked with:",
            "es": "Hemos trabajado en campañas con algunas de las principales marcas globales junto a nuestros socios regionales. Esta es una breve lista de algunos de los clientes y marcas con los que hemos trabajado:",
        },
        # [{name, image, url}] — populated by the Phase-2 gem_clients ETL/CRUD
        "logos": [],
    },
    "contact_info": {
        "headquarters": {"en": "Gem2i. New York, USA", "es": "Gem2i. Nueva York, EE. UU."},
        "phone": "862-201-3636",
        "email": "main@gem2i.com",
    },
    # Festivals / conferences carousels render from these until the Phase-2
    # gem_festivals / gem_conferences catalogs replace them.
    "festivals": {"kicker": {"en": "GLOBAL", "es": "FESTIVALES"}, "title": {"en": "Festivals", "es": "Globales"}, "items": []},
    "conferences": {"kicker": {"en": "MUSIC", "es": "CONFERENCIAS"}, "title": {"en": "Conferences", "es": "de Música"}, "items": []},
}


def _merged(data: dict) -> dict:
    """Stored data wins key-by-key over the code defaults, so new default
    sections appear automatically without erasing CMS edits."""
    out = dict(DEFAULT_GEM_CONTENT)
    out.update(data or {})
    return out


async def get_gem_content() -> dict:
    doc = await db.gem_config.find_one({"key": "content"}, {"_id": 0})
    return _merged((doc or {}).get("data"))


async def seed_gem_content():
    """Startup: create the content doc once so the CMS editor always has a
    row to edit. Never overwrites an existing doc."""
    existing = await db.gem_config.find_one({"key": "content"})
    if not existing:
        await db.gem_config.insert_one({"key": "content", "data": DEFAULT_GEM_CONTENT})


@router.get("/public/gem/gem-content")
async def public_gem_content():
    return await get_gem_content()


@router.get("/admin/gem/gem-content")
async def admin_get_gem_content(user: dict = Depends(require_admin)):
    return await get_gem_content()


@router.put("/admin/gem/gem-content")
async def admin_update_gem_content(request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    data = body.get("data") if isinstance(body.get("data"), dict) else body
    await db.gem_config.update_one({"key": "content"}, {"$set": {"data": data}}, upsert=True)
    return {"message": "gem2i content saved"}
