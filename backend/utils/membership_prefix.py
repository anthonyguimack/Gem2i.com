"""
Realign every stored membership code to the brand's CURRENT `settings.aux_prefix`.

Async (motor) sibling of scripts/rename_membership_prefix.py. Called automatically
whenever an admin changes `aux_prefix` in CMS -> Settings (see admin_update_settings),
so a prefix change (e.g. CA -> CAR) instantly rewrites the existing members'
`membership_id` and the `invite_codes` that embed the old prefix -- no manual script.

Idempotent: re-running when already aligned rewrites nothing. Sponsors/mentors are
keyed by membership NUMBER (never the prefixed code), so referral relationships are
unaffected, and old share links `?ref=CA-124` still resolve via the number fallback
in kms/public.py. Sentinel ids like the bootstrap admin's "ADMIN" are left untouched.
"""
import re

# a prefixed numbered code, e.g. "AUX-7" -> ("AUX", "7")
_CODE_RE = re.compile(r"^([A-Za-z]+)-(\d+)$")


async def realign_membership_prefix(db, target_prefix: str) -> dict:
    """Rewrite members.membership_id + invite_codes to `target_prefix`.
    Returns {"members": n, "invite_codes": n, "target": prefix}. No-op on empty prefix."""
    target = (target_prefix or "").strip()
    if not target:
        return {"members": 0, "invite_codes": 0, "target": ""}

    # --- members.membership_id -> <target>-<number> --------------------------
    m_fixed = 0
    async for m in db.members.find({}, {"membership_id": 1, "membership_number": 1}):
        num = m.get("membership_number")
        cur = m.get("membership_id") or ""
        mt = _CODE_RE.match(cur)
        if num is None or not mt:
            continue  # no number, or a sentinel like "ADMIN" -- leave it
        if mt.group(1) == target and mt.group(2) == str(num):
            continue  # already aligned
        await db.members.update_one({"_id": m["_id"]},
                                    {"$set": {"membership_id": f"{target}-{num}"}})
        m_fixed += 1

    # --- invite_codes: code / owner_membership_id / used_by_membership_id -----
    ic_fixed = 0
    async for ic in db.invite_codes.find({}):
        sets = {}
        onum = ic.get("owner_membership_number")
        owner = ic.get("owner_membership_id") or ""
        if onum is not None and _CODE_RE.match(owner):
            new_owner = f"{target}-{onum}"
            if owner != new_owner:
                sets["owner_membership_id"] = new_owner
            # code = "<owner_membership_id>-<suffix>"; keep the suffix, swap the head
            code = ic.get("code") or ""
            if owner and code.startswith(owner + "-"):
                suffix = code[len(owner) + 1:]
                new_code = f"{new_owner}-{suffix}"
                if code != new_code:
                    sets["code"] = new_code
        unum = ic.get("used_by_membership_number")
        if unum is not None and ic.get("used_by_membership_id"):
            new_used = f"{target}-{unum}"
            if ic.get("used_by_membership_id") != new_used:
                sets["used_by_membership_id"] = new_used
        if sets:
            await db.invite_codes.update_one({"_id": ic["_id"]}, {"$set": sets})
            ic_fixed += 1

    return {"members": m_fixed, "invite_codes": ic_fixed, "target": target}
