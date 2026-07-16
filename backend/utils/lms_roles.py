"""Neutralized shim (gem2i fork). No LMS product → no lms role claim."""


def lms_role_for(*args, **kwargs):
    return None
