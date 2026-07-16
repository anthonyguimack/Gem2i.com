"""Personal Brand mini-site personality scoping helpers.

Shared by the admin + public content routes so the three PB mini-sites
(business / lifestyle / personal) can hold independent content per section,
while non-PB themes and existing un-tagged ("global") docs keep working
unchanged.

Storage convention (mirrors `routes/aurex_sections.py`):
    pb_personality absent                         → global doc (shared fallback)
    pb_personality in {business,lifestyle,personal} → mini-site-scoped doc

Two read behaviours:
  * ADMIN list  → EXACT scope (no fallback) so each CMS tab shows precisely
                  what is tagged to it.
  * PUBLIC list → scope WITH fallback to global when a personality has no
                  content of its own, so an un-customised mini-site still
                  renders the shared catalogue.
"""
from typing import Optional

PB_PERSONALITIES = {"business", "lifestyle", "personal"}


def pb_validate(personality: Optional[str]) -> Optional[str]:
    """Return the personality if it is a recognised PB mini-site, else None."""
    return personality if personality in PB_PERSONALITIES else None


def scope_query(base: dict, personality: Optional[str]) -> dict:
    """Add pb_personality scoping to a Mongo filter.

    personality None/invalid → match global docs only (field absent).
    personality valid         → match that personality's docs only.
    """
    q = dict(base)
    p = pb_validate(personality)
    q["pb_personality"] = p if p else {"$exists": False}
    return q


def stamp(body: dict, personality: Optional[str]) -> dict:
    """Tag a doc with pb_personality on create when a valid personality is given.
    Global (None/invalid) leaves the field absent so it stays the shared doc.
    """
    p = pb_validate(personality)
    if p:
        body["pb_personality"] = p
    return body


async def scoped_find(collection, base: dict, personality: Optional[str],
                      sort_field: Optional[str] = None, sort_dir: int = 1,
                      limit: int = 1000):
    """PUBLIC read: list docs for a personality, falling back to global when the
    personality has none of its own. `base` is the non-personality part of the
    filter (e.g. visibility / published). Projection strips `_id`.
    """
    async def _run(p):
        cur = collection.find(scope_query(base, p), {"_id": 0})
        if sort_field:
            cur = cur.sort(sort_field, sort_dir)
        return await cur.to_list(limit)

    p = pb_validate(personality)
    if p:
        items = await _run(p)
        if items:
            return items
        # fall through to the global catalogue
    return await _run(None)


def has_content(doc: Optional[dict], fields) -> bool:
    """True when `doc` exists and has at least one non-empty value among `fields`.

    Used to treat an EMPTY scoped doc as if it were missing, so the global
    fallback fires (fixes the "empty Business About hides the global one" bug).
    Handles localized values stored as `{en: .., es: ..}` dicts.
    """
    if not doc:
        return False
    for f in fields:
        v = doc.get(f)
        if isinstance(v, dict):
            if any(bool(x) for x in v.values()):
                return True
        elif v:
            return True
    return False
