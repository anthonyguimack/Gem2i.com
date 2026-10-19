"""Brand-aware referral URL scheme — single source of truth.

The share/referral URL suffix is ``/<prefix>-<membership_number>`` where ``<prefix>``
is the brand's own ``settings.aux_prefix`` LOWERCASED (Carlos ``ca``, Aurex ``aux``,
Acapital ``acg`` — and any future brand). It used to be hardcoded to ``aux`` for every
brand, so a Carlos share read ``/aux-105`` instead of ``/ca-105``.

Routing/parsing accepts ANY letter prefix, so links already shared as ``/aux-<N>``
(and every brand's own prefix) keep resolving — the routes only care about the
membership NUMBER. The KMS ``?ref=<prefix>-<N>`` referral (built from ``aux_prefix``
elsewhere, matched against the member's full ``membership_id`` in kms/public.py) is
UNCHANGED by this module.
"""
import re

# A trailing referral segment: 'aux-105', 'ca-105', 'acg-105' → capture the number.
_SEG_RE = re.compile(r"^[A-Za-z]{2,6}-(\d+)$")

# JS regex literal (as text) that strips a trailing `/<prefix>-<digits>` so the
# post-subscribe redirect re-appends the NEW subscriber's own ref instead of doubling it.
JS_STRIP_REF = r"/\/[A-Za-z]{2,6}-\d+\/?$/"


def ref_prefix(aux_prefix) -> str:
    """The URL segment prefix for this brand, lowercased. Falls back to ``aux``."""
    return (str(aux_prefix or "").strip() or "aux").lower()


def ref_seg(aux_prefix, code) -> str:
    """The ``/<prefix>-<code>`` referral suffix, or ``''`` when there is no code."""
    return f"/{ref_prefix(aux_prefix)}-{code}" if code else ""


def ref_code(segment: str) -> str:
    """Membership number from a ``<prefix>-<code>`` path segment ('aux-105' → '105',
    'ca-105' → '105'), or ``''`` when the segment is not a referral."""
    m = _SEG_RE.match(str(segment or "").strip())
    return m.group(1) if m else ""
