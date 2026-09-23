"""Capacidades transversales de un miembro: Mentor · Autor · Mastermind.

Gobernanza de membresía (Anthony, 2026-07-21 — MEMBERSHIP_GOVERNANCE_REORG_PLAN):

    Los TIPOS de miembro dan capacidades transversales, asignadas por el
    administrador a una persona concreta. No son niveles (que desbloquean
    productos) ni roles (que reparten secciones del back-office del CMS).

        Simple      — tipo por defecto, sin capacidades
        Mentor      — enseña: ve sus secciones de mentor y gestiona el
                      calendario de clases (slots 1-a-1 o en grupo)
        Autor       — publica noticias/posts en el KMS
        Mastermind  — acceso privilegiado a secciones de la personalidad
                      "Personal" del sitio

ANTES de esto, "autor" era el rol `role_author` y "mastermind" era una bandera
del NIVEL (`member_levels.is_mastermind`). Ambas formas siguen soportadas para
las marcas que aún no migran:

    flag `settings.membership_v2_enabled` ENCENDIDO  → manda el TIPO
    flag APAGADO (aurex / acapital)                  → manda el rol / el nivel

Así una sola función sirve a las tres marcas y aurex/acapital no cambian de
comportamiento hasta que se les encienda el flag deliberadamente.
"""
import time

from utils.product_access import is_platform_admin, membership_v2_enabled

# Banderas de capacidad que vive en el documento de tipo de miembro.
CAPABILITY_FLAGS = ("is_mentor", "is_author", "is_mastermind")

# Los tipos son 2-4 documentos que casi nunca cambian: caché corta como la del KMS.
_CACHE: dict = {"at": 0.0, "types": None}
_TTL = 30.0


async def _types(db) -> list:
    now = time.time()
    if _CACHE["types"] is None or (now - _CACHE["at"]) > _TTL:
        projection = {"_id": 0, "id": 1, "name": 1}
        projection.update({f: 1 for f in CAPABILITY_FLAGS})
        _CACHE["types"] = await db.member_types.find({}, projection).to_list(100)
        _CACHE["at"] = now
    return _CACHE["types"]


def invalidate_cache() -> None:
    """Llamar tras editar tipos desde el CMS para no esperar al TTL."""
    _CACHE["types"] = None


async def type_ids_with(db, flag: str) -> set:
    """Ids de los tipos que tienen la capacidad pedida (para consultas Mongo)."""
    return {t["id"] for t in await _types(db) if t.get(flag)}


async def _member_has_flag(db, member: dict | None, flag: str) -> bool:
    if not member:
        return False
    type_id = member.get("member_type_id")
    if not type_id:
        return False
    return type_id in await type_ids_with(db, flag)


async def is_mentor(db, member: dict | None) -> bool:
    """Mentor SIEMPRE se resolvió por tipo — no hay rama heredada."""
    return await _member_has_flag(db, member, "is_mentor")


async def is_author(db, member: dict | None) -> bool:
    """Autor = ROL CMS `role_author` en TODAS las marcas (Carlos 2026-08-06: el TIPO
    Autor se retira; la autoría del KMS/News/Brief la reparte el ROL, que además
    habilita a gestionar acciones en la plataforma). La rama del TIPO Autor bajo v2
    se conserva como legado inerte. Los administradores siempre publican."""
    if not member:
        return False
    if is_platform_admin(member):
        return True
    if "role_author" in (member.get("cms_roles") or []):
        return True
    if await membership_v2_enabled(db):
        return await _member_has_flag(db, member, "is_author")
    return False


async def is_mastermind(db, member: dict | None) -> bool:
    """Mastermind: por TIPO con el flag encendido; por el NIVEL
    (`member_levels.is_mastermind`) mientras la marca no migre."""
    if not member:
        return False
    if await membership_v2_enabled(db):
        return await _member_has_flag(db, member, "is_mastermind")
    level_id = member.get("level_id")
    if not level_id:
        return False
    level = await db.member_levels.find_one({"id": level_id}, {"_id": 0, "is_mastermind": 1})
    return bool((level or {}).get("is_mastermind"))


async def author_query(db) -> dict:
    """Filtro Mongo para "todos los que pueden publicar" (autores + admins).
    Autor = rol `role_author` (Carlos 2026-08-06); el TIPO Autor bajo v2 se conserva
    como legado (queda inerte al retirarse el tipo)."""
    if await membership_v2_enabled(db):
        return {"$or": [{"cms_roles": "role_author"},
                        {"member_type_id": {"$in": list(await type_ids_with(db, "is_author"))}},
                        {"role": "admin"}]}
    return {"$or": [{"cms_roles": "role_author"}, {"role": "admin"}]}
