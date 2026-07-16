"""Neutralized shim (gem2i fork). No MMS product → no mms role claim."""


def mms_role_for(*args, **kwargs):
    return None
