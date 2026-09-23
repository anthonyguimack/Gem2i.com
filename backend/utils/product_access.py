"""Acceso a productos resuelto por NIVEL de membresía.

Regla de negocio (Anthony, 2026-07-21 — MEMBERSHIP_GOVERNANCE_REORG_PLAN):

    El acceso a los productos del ecosistema se resuelve subiendo el NIVEL del
    miembro, NUNCA con un rol paralelo por producto. Los roles quedan solo para
    el back-office del CMS. El enlace aparece en Mi Cuenta y el SSO existente
    autentica al miembro contra el producto.

UNIFICACIÓN (Anthony, 2026-08-07) — UNA SOLA PUERTA
    Antes había DOS controles redundantes por nivel: `products[]` (bloque
    "Products unlocked by this level") Y `quick_link_permissions[]` (bloque
    "Permissions (My Account — Quick Links)"). Se elimina el primero: el
    administrador ya crea cada enlace del producto (con su URL + SSO) en "My
    Account Quick Links", así que basta con MARCAR ese enlace en el nivel. Los
    productos desbloqueados se DERIVAN ahora de los enlaces concedidos
    (`quick_link_permissions` ∩ `myaccount_links.product_key`). `products[]`
    queda obsoleto (ya no se lee ni se muestra en el editor de niveles).

Los 6 roles marcadores (`role_pms_operator`, `role_pms_contributor`,
`role_lms_manager`, `role_lms_instructor`, `role_mms_manager`,
`role_journal_user`) se retiraron en la Fase 1; este módulo los reemplaza.

FLAG POR MARCA — `settings.membership_v2_enabled`
    El repositorio sirve a las tres marcas (carlos / aurex / acapital). Con el
    flag apagado (por defecto) este módulo NO altera ningún comportamiento, de
    modo que aurex y acapital siguen exactamente como estaban. Solo se enciende
    en `carlosartiles_cms`.

MMS es la excepción deliberada (D8, Anthony 2026-07-21): cualquier miembro con
credenciales entra al portal de afiliados, así que su puerta NO se gobierna por
nivel. El ENLACE en Mi Cuenta sí, como el de los demás.
"""

# Catálogo de productos. La clave es estable y es lo que se guarda en
# `member_levels.products[]` y en `myaccount_links.product_key`.
PRODUCT_CATALOG = [
    {"key": "pms",     "label": "AUX Projects (PMS)"},
    {"key": "lms",     "label": "LMS (Learning Management System)"},
    {"key": "mms",     "label": "MMS (Marketing Management System)"},
    {"key": "journal", "label": "Journal (Trading Journal)"},
    {"key": "kms",     "label": "KMS / Insights"},
    {"key": "news",    "label": "News"},
    {"key": "brief",   "label": "Morning Brief"},
]

PRODUCT_KEYS = [p["key"] for p in PRODUCT_CATALOG]

# Puente desde los flags viejos de enlace rápido, para que los documentos
# existentes funcionen sin migración de datos.
_LEGACY_LINK_FLAGS = {
    "pms_role_required": "pms",
    "lms_role_required": "lms",
    "mms_role_required": "mms",
}


def is_platform_admin(member: dict | None) -> bool:
    """Único predicado de administrador. Acepta ambas formas históricas
    (`role == "admin"` y `role_admin` en cms_roles), que hoy discrepan para
    algún documento real."""
    if not member:
        return False
    return member.get("role") == "admin" or "role_admin" in (member.get("cms_roles") or [])


def link_product_key(link: dict) -> str | None:
    """Producto al que pertenece un enlace rápido: campo explícito
    `product_key`, o derivado del flag legado `*_role_required`."""
    key = (link or {}).get("product_key")
    if key in PRODUCT_KEYS:
        return key
    for flag, derived in _LEGACY_LINK_FLAGS.items():
        if (link or {}).get(flag):
            return derived
    return None


async def membership_v2_enabled(db) -> bool:
    settings = await db.settings.find_one({}, {"_id": 0, "membership_v2_enabled": 1})
    return bool((settings or {}).get("membership_v2_enabled"))


async def products_for_member(db, member: dict | None) -> set:
    """Productos que el miembro tiene desbloqueados.

    Se derivan de los ENLACES RÁPIDOS que el nivel concede
    (`member_levels.quick_link_permissions[]`): conceder el enlace de un
    producto = conceder el producto. Un solo control para el administrador.

    • admin              → todos
    • con nivel          → los productos de los enlaces que su nivel concede
    • sin nivel/miembro  → ninguno
    """
    if member is None:
        return set()
    if is_platform_admin(member):
        return set(PRODUCT_KEYS)
    level_id = member.get("level_id")
    if not level_id:
        return set()
    level = await db.member_levels.find_one(
        {"id": level_id}, {"_id": 0, "quick_link_permissions": 1})
    granted = set((level or {}).get("quick_link_permissions") or [])
    if not granted:
        return set()
    links = await db.myaccount_links.find(
        {"id": {"$in": list(granted)}},
        {"_id": 0, "product_key": 1, "pms_role_required": 1,
         "lms_role_required": 1, "mms_role_required": 1},
    ).to_list(50)
    return {k for l in links if (k := link_product_key(l)) in PRODUCT_KEYS}


async def member_can_use(db, member: dict | None, product_key: str) -> bool:
    """¿Puede este miembro entrar a este producto? Respeta el flag por marca:
    apagado ⇒ no opinamos (el llamador conserva su lógica previa)."""
    if not await membership_v2_enabled(db):
        return True
    return product_key in await products_for_member(db, member)
