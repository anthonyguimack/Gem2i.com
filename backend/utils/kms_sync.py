"""Neutralized shim (gem2i fork). No legacy KMS in the isolated product, so
every entry point is a no-op. Kept as a module so CMS-core routes that import
these names (auth, membership, admin_tools, leadcapture) import cleanly."""


async def sync_member_to_kms(*args, **kwargs):
    return None


async def push_password_to_kms(*args, **kwargs):
    return None


async def push_status_to_kms(*args, **kwargs):
    return None
