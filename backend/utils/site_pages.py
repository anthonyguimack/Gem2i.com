"""Acceso a PÁGINAS del sitio (Companies, Opportunities…) resuelto por NIVEL.

Hermano de `utils/product_access.py`, misma filosofía (D-2026-75): el NIVEL de
membresía es el único lugar donde el administrador declara qué desbloquea. Aquí
lo que se desbloquea son PÁGINAS públicas del sitio, no productos-herramienta.

SEMÁNTICA (Anthony, 2026-08-05) — "se restringe cuando alguien la lista":
    Una página se considera RESTRINGIDA en el momento en que ALGÚN nivel la
    incluye en su `site_pages[]`. Antes de eso sigue pública para cualquier
    miembro logueado (comportamiento histórico). Una vez restringida, solo la
    ven los niveles que la listan; los administradores, siempre.

    Consecuencias buscadas:
    • El despliegue NO cambia nada hasta que el admin reparte páginas por nivel
      (sin `site_pages` en ningún nivel ⇒ `gated_pages` vacío ⇒ todo público).
    • Cada página se "enciende" sola según su configuración; no hay interruptor
      global que recordar ni estado intermedio de "todo en blanco".

FLAG POR MARCA `settings.membership_v2_enabled` — apagado (aurex/acapital) ⇒
este módulo no opina y las páginas siguen abiertas a todo miembro, como hoy.
"""
from utils.product_access import is_platform_admin, membership_v2_enabled

# Catálogo de páginas gateables. La clave es estable y es lo que se guarda en
# `member_levels.site_pages[]`. Ampliar aquí para gatear más páginas.
# gem2i: Carlos' gated pages (Companies / Opportunities) do not exist here, so the
# catalog starts empty and the level editor hides the block until a page is added.
SITE_PAGE_CATALOG: list = []

SITE_PAGE_KEYS = [p["key"] for p in SITE_PAGE_CATALOG]


async def gated_pages(db) -> set:
    """Páginas que ALGÚN nivel restringe (= aparecen en algún `site_pages[]`).
    Una página fuera de este conjunto sigue pública para todo miembro."""
    out = set()
    async for lvl in db.member_levels.find({}, {"_id": 0, "site_pages": 1}):
        for k in (lvl.get("site_pages") or []):
            if k in SITE_PAGE_KEYS:
                out.add(k)
    return out


async def site_pages_for_member(db, member: dict | None) -> set:
    """Páginas RESTRINGIDAS que este miembro tiene desbloqueadas por su nivel.
    (Las no restringidas son públicas y no se enumeran aquí.)"""
    if member is None:
        return set()
    if is_platform_admin(member):
        return set(SITE_PAGE_KEYS)
    level_id = member.get("level_id")
    if not level_id:
        return set()
    level = await db.member_levels.find_one({"id": level_id}, {"_id": 0, "site_pages": 1})
    return {k for k in (level or {}).get("site_pages") or [] if k in SITE_PAGE_KEYS}


async def member_can_view_page(db, member: dict | None, page_key: str) -> bool:
    """¿Puede este miembro ver esta página?

    • flag de marca apagado          ⇒ sí (comportamiento histórico intacto)
    • admin                          ⇒ sí
    • página que nadie restringe      ⇒ sí (pública)
    • restringida                    ⇒ solo si su nivel la lista
    """
    if not await membership_v2_enabled(db):
        return True
    if is_platform_admin(member):
        return True
    if page_key not in await gated_pages(db):
        return True
    return page_key in await site_pages_for_member(db, member)


async def member_page_access(db, member: dict | None) -> dict:
    """Resumen para el frontend (guard de rutas + ocultar enlaces de nav):
        { enabled: bool, gated: [...], allowed: [...] }
    `allowed` = TODA página que el miembro puede ver (las públicas + las
    restringidas que su nivel abre), para que el cliente compruebe con un
    simple `allowed.includes(key)`."""
    if not await membership_v2_enabled(db):
        return {"enabled": False, "gated": [], "allowed": list(SITE_PAGE_KEYS)}
    g = await gated_pages(db)
    if is_platform_admin(member):
        allowed = set(SITE_PAGE_KEYS)
    else:
        allowed = (set(SITE_PAGE_KEYS) - g) | await site_pages_for_member(db, member)
    return {"enabled": True, "gated": sorted(g), "allowed": sorted(allowed)}
