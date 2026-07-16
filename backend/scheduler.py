import asyncio
import logging
from datetime import datetime, timezone, timedelta
from models.database import db

logger = logging.getLogger(__name__)

EXPORTABLE_COLLECTIONS = {
    "hero_slides", "about", "services", "blog_posts", "books", "maps",
    "map_locations", "gallery", "gallery_albums", "album_photos",
    "portfolio", "testimonials", "nav_pages", "pages", "settings", "member_types",
}
SINGLETON_COLLECTIONS = {"about", "settings"}

_scheduler_task = None
_mail_poll_task = None
_pro_scheduler_task = None


async def create_backup_snapshot(label="auto"):
    """Create a backup snapshot and store it in the backups collection."""
    export_data = {}
    for col in EXPORTABLE_COLLECTIONS:
        if col in SINGLETON_COLLECTIONS:
            doc = await db[col].find_one({}, {"_id": 0})
            export_data[col] = doc
        else:
            docs = await db[col].find({}, {"_id": 0}).to_list(10000)
            export_data[col] = docs

    import json
    data_str = json.dumps(export_data, default=str)
    size_bytes = len(data_str.encode("utf-8"))

    import uuid
    snapshot = {
        "id": str(uuid.uuid4()),
        "label": label,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "size_bytes": size_bytes,
        "collections": list(EXPORTABLE_COLLECTIONS),
        "data": export_data,
    }
    await db.backups.insert_one(snapshot)
    logger.info(f"Backup snapshot created: {snapshot['id']} ({size_bytes} bytes, label={label})")
    return snapshot["id"]


async def cleanup_old_backups(max_snapshots):
    """Keep only the N most recent snapshots, delete the rest."""
    if max_snapshots < 1:
        return
    count = await db.backups.count_documents({})
    if count > max_snapshots:
        to_delete = count - max_snapshots
        oldest = await db.backups.find({}, {"_id": 0, "id": 1}).sort("created_at", 1).limit(to_delete).to_list(to_delete)
        ids = [s["id"] for s in oldest]
        if ids:
            await db.backups.delete_many({"id": {"$in": ids}})
            logger.info(f"Cleaned up {len(ids)} old backup(s)")


async def _scheduler_loop():
    """Background loop that checks backup schedule and runs backups."""
    while True:
        try:
            settings = await db.settings.find_one({}, {"_id": 0})
            bs = (settings or {}).get("backup_settings", {})
            enabled = bs.get("enabled", False)
            frequency = bs.get("frequency", "daily")
            max_snapshots = bs.get("max_snapshots", 5)

            if enabled:
                last = await db.backups.find_one({"label": "auto"}, {"_id": 0, "created_at": 1}, sort=[("created_at", -1)])
                should_run = False

                if not last:
                    should_run = True
                else:
                    last_dt = datetime.fromisoformat(last["created_at"].replace("Z", "+00:00"))
                    now = datetime.now(timezone.utc)
                    intervals = {"daily": timedelta(days=1), "weekly": timedelta(weeks=1), "monthly": timedelta(days=30)}
                    if now - last_dt >= intervals.get(frequency, timedelta(days=1)):
                        should_run = True

                if should_run:
                    await create_backup_snapshot(label="auto")
                    await cleanup_old_backups(max_snapshots)

        except Exception as e:
            logger.error(f"Backup scheduler error: {e}")

        await asyncio.sleep(300)  # Check every 5 minutes


def start_scheduler():
    """Start the background scheduler task (CMS backup snapshots only —
    the mail-ingest and pro-manager loops were stripped with those modules)."""
    global _scheduler_task
    _scheduler_task = asyncio.create_task(_scheduler_loop())
    logger.info("Backup scheduler started")


def stop_scheduler():
    """Stop the background scheduler task."""
    global _scheduler_task
    if _scheduler_task:
        _scheduler_task.cancel()
        _scheduler_task = None
    logger.info("Background scheduler task stopped")
