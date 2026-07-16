"""Neutralized shim (gem2i fork). No PMS product → no pms role claim."""


def pms_role_for(*args, **kwargs):
    return None
