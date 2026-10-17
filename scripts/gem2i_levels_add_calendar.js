// ============================================================================
// Gem2i — My Account 2.0: open the new Calendar + Calendar Sync sections.
//
// Level enforcement is ON (gem2i_gov_migrate_levels.js), so a section is only
// visible/usable when the member's level lists it. The 2.0 adds two sections
// (`global-calendar`, `calendar-sync`); without this script no Nivel 0/1
// member would see them. Same effect as ticking both boxes in
// CMS → Members Level for each level.
//
// Run on the gem2i box (after deploying the 2.0 code), owner GO required:
//   mongosh gem2i_cms scripts/gem2i_levels_add_calendar.js
// Idempotent ($addToSet). Back up member_levels first.
// ============================================================================
print('=== BEFORE ===');
db.member_levels.find({}).sort({ order: 1 }).forEach(l => print('  ' + l.id + ' perms=' + JSON.stringify(l.permissions)));

const r = db.member_levels.updateMany(
  { id: { $in: ['level_0', 'level_1'] } },
  { $addToSet: { permissions: { $each: ['global-calendar', 'calendar-sync'] } },
    $set: { updated_at: new Date().toISOString() } });
print('updated levels: ' + r.modifiedCount);

print('=== AFTER ===');
db.member_levels.find({}).sort({ order: 1 }).forEach(l => print('  ' + l.id + ' perms=' + JSON.stringify(l.permissions)));
