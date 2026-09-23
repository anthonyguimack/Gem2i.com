"""Aplicación de los NIVELES de membresía en el SERVIDOR (Fase 4).

EL PROBLEMA QUE RESUELVE
    Hasta 2026-07-21 los niveles solo filtraban el menú **en el navegador**
    (`MyAccountLayout`): las APIs de Mi Cuenta comprobaban autenticación y
    `role_member`, pero NUNCA el nivel. Un miembro podía llamar cualquier
    endpoint de una sección que su nivel supuestamente ocultaba. Además el
    filtro del navegador falla en ABIERTO (`permissions[]` vacío = todo).

CÓMO SE DESPLIEGA (secuencia obligatoria del tracker — nunca saltar pasos)
    `settings.level_enforcement_mode`:
      "off"     (defecto) — no opina. Comportamiento idéntico al histórico.
      "shadow"  — NO deniega nada; registra en `level_enforcement_log` lo que
                  SE HABRÍA denegado. Sirve para descubrir qué secciones usa
                  la gente de verdad antes de cerrar nada.
      "enforce" — deniega con 403.
    Solo actúa si además `settings.membership_v2_enabled` está encendido
    (true solo en carlos), así aurex/acapital no se ven afectadas.

CRITERIO DE MAPEO
    Solo se controlan las rutas que pertenecen CLARAMENTE a una sección del
    menú. Lo transversal (perfil propio, /me, notificaciones, cambio de
    contraseña, catálogos, subidas, mail) queda SIEMPRE permitido: cerrarlo
    rompería la aplicación sin ganar nada. Las rutas no mapeadas se permiten;
    el modo shadow las contabiliza aparte para poder ampliar el registro con
    evidencia en vez de con suposiciones.
"""
from datetime import datetime, timezone

# nav id (= clave que el admin marca en el nivel)  →  prefijos de API que le pertenecen
MYACCOUNT_SECTIONS = [
    ("membership-profile",  ["/api/member/profile", "/api/member/biography",
                             "/api/member/profile-activities", "/api/member/generate-qr"]),
    ("my-sponsor",          ["/api/member/my-sponsor", "/api/member/my-mentor"]),
    ("ebank",               ["/api/member/ebank", "/api/member/credits"]),
    ("invite-code",         ["/api/member/invite-codes"]),
    ("my-community",        ["/api/member/my-community", "/api/member/members-list"]),
    ("portfolios",          ["/api/member/portfolios"]),
    ("global-calendar",     ["/api/member/calendar/events"]),
    ("mentorship-calendar", ["/api/member/mentorship/slots", "/api/member/mentor-slot-templates"]),
    ("earnings",            ["/api/member/mentor/earnings", "/api/member/mentor/payouts",
                             "/api/member/mentor/bundles"]),
    ("bundles",             ["/api/member/bundles"]),
    # Reservar/cancelar/pagar una cita con el MENTOR se gobierna con el permiso
    # "Mentorship Profile" (Anthony s108): si el nivel tiene esa sección marcada, el
    # miembro asignado a un mentor puede bookear desde su Mentorship Profile. (El
    # miembro solo ve/reserva el calendario de SU mentor —`mentor-calendar` es exento
    # y se scopea por `mentor_id`— así que "asignado a un mentor" queda implícito.)
    ("mentorship-profile",  ["/api/member/mentorship/book", "/api/member/mentorship/cancel",
                             "/api/member/mentorship/checkout"]),
    # La LISTA "My Bookings" (su propia sección del menú) sigue por su cuenta.
    ("my-bookings",         ["/api/member/my-bookings"]),
    ("calendar-sync",       ["/api/member/ical"]),
    ("points",              ["/api/member/points"]),
    # ⚠ `/api/member/mentor-calendar` NO figura aquí a propósito (2026-07-29): la
    # sección separada `/my-account/mentor-calendar` se retiró — el calendario del
    # mentor vive dentro de Mentorship Profile, que es quien consume ese endpoint.
    # Sin sección asociada queda exento por la regla general (R10 sigue en pie: el
    # acceso lo da tener `mentor_id`, nunca el nivel).
]

# Secciones que NO dependen del nivel. Vacío: `points` se gobierna POR NIVEL desde
# CMS → Niveles como el resto (Anthony 2026-08-17 confirmó tras probar con un nivel 0:
# la sección solo debe verse si el nivel del miembro incluye el permiso `points`).
# La vista sigue siendo por-usuario (el endpoint se scopea por member_mid); lo que el
# nivel controla es el ACCESO a la sección, no de quién son los datos.
LEVEL_EXEMPT: set = set()

# Secciones gobernadas por el TIPO Mentor, NO por el nivel (Carlos 2026-08-06): el
# mentor gestiona su calendario de sesiones y ve sus ganancias "sea cual sea su nivel".
# ⚠ Se permiten SOLO si el miembro es Tipo Mentor (no basta con exentar: los endpoints
# `/member/mentorship/slots` NO comprueban is_mentor por sí mismos — se scopean por
# `mentor_id`, y el POST dejaría a cualquiera crearse un slot). Aquí ponemos esa puerta.
MENTOR_SECTIONS: set = {"mentorship-calendar", "earnings"}

# Índice por prefijo, el más largo gana (mismo criterio que el registro del CMS).
_INDEX = sorted(
    ((p, key) for key, prefixes in MYACCOUNT_SECTIONS for p in prefixes),
    key=lambda x: -len(x[0]),
)


def section_for_path(path: str) -> str | None:
    for prefix, key in _INDEX:
        if path.startswith(prefix):
            return key
    return None


async def _mode(db) -> str:
    s = await db.settings.find_one({}, {"_id": 0, "level_enforcement_mode": 1,
                                        "membership_v2_enabled": 1}) or {}
    if not s.get("membership_v2_enabled"):
        return "off"
    mode = (s.get("level_enforcement_mode") or "off").lower()
    return mode if mode in ("off", "shadow", "enforce") else "off"


async def _level_sections(db, member: dict) -> set | None:
    """Secciones que el nivel del miembro permite. `None` = no opinar
    (sin nivel asignado, o nivel con lista vacía = el histórico "todo")."""
    level_id = member.get("level_id")
    if not level_id:
        return None
    level = await db.member_levels.find_one({"id": level_id}, {"_id": 0, "permissions": 1})
    perms = (level or {}).get("permissions")
    if not perms:
        return None
    return set(perms)


async def _log_shadow(db, member: dict, path: str, section: str) -> None:
    """Una fila por (miembro, sección, día): evidencia sin inundar la colección."""
    day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    try:
        await db.level_enforcement_log.update_one(
            {"member_id": member.get("member_id"), "section": section, "day": day},
            {"$setOnInsert": {"member_id": member.get("member_id"),
                              "membership_number": member.get("membership_number"),
                              "email": member.get("email"),
                              "level_id": member.get("level_id"),
                              "section": section, "day": day,
                              "first_path": path,
                              "first_seen": datetime.now(timezone.utc).isoformat()},
             "$inc": {"hits": 1},
             "$set": {"last_seen": datetime.now(timezone.utc).isoformat()}},
            upsert=True)
    except Exception:
        pass  # el registro NUNCA puede romper una petición


async def check(db, member: dict, path: str) -> bool:
    """True = seguir. False = denegar (solo posible en modo 'enforce').

    Los administradores nunca se ven afectados; tampoco las rutas sin sección,
    ni las secciones exentas, ni los miembros cuyo nivel no expresa una lista.
    """
    from utils.product_access import is_platform_admin
    if is_platform_admin(member):
        return True
    mode = await _mode(db)
    if mode == "off":
        return True
    section = section_for_path(path)
    if section is None or section in LEVEL_EXEMPT:
        return True
    # Secciones de mentor: la llave es el TIPO Mentor, no el nivel. Un mentor pasa
    # sea cual sea su nivel; un no-mentor NO (los endpoints no se guardan solos).
    if section in MENTOR_SECTIONS:
        from utils.member_capabilities import is_mentor
        if await is_mentor(db, member):
            return True
        if mode == "shadow":
            await _log_shadow(db, member, path, section)
            return True
        return False
    allowed = await _level_sections(db, member)
    if allowed is None or section in allowed:
        return True
    if mode == "shadow":
        await _log_shadow(db, member, path, section)
        return True          # shadow NO deniega
    return False
