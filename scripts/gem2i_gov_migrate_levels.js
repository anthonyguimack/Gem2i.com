// ============================================================================
// Gem2i — membership levels migrated from Carlos (AUX-1.0 @8a0d4dd,
// backend/scripts/gov_migrate_brand.js), per owner decision 2026-09-23:
// "migrate Carlos' levels; labels may be renamed, but access by level must
// work like Carlos".
//
// Run on the gem2i box:   mongosh gem2i_cms scripts/gem2i_gov_migrate_levels.js
// Idempotent. Back up first (member_levels, settings, members level/type).
//
// Differences from Carlos' script, all forced by gem2i data:
//   • quick_link_permissions are empty: gem2i has no My Account quick links
//     (Carlos grants his Home / KMS / LMS links; none exist here).
//   • member TYPES are NOT touched: gem2i's 5 legacy types drive the guest-list
//     benefits of its events, so members keep their type (no "Simple" reset,
//     no type deletions).
//   • custom CMS roles are NOT touched (not part of the level model).
// Same as Carlos: Nivel 0 / Nivel 1 with his section permissions, enforcement
// ON (`enforce`, membership_v2_enabled), every non-admin member → Nivel 0.
// ============================================================================
print('=== BEFORE ===');
print('levels=' + db.member_levels.countDocuments() + ' members=' + db.members.countDocuments() +
      ' with level=' + db.members.countDocuments({ level_id: { $nin: [null, ''] } }));

// 1) LEVELS → Nivel 0 and Nivel 1 (Carlos' definitions)
db.member_levels.deleteMany({});
db.member_levels.insertMany([
  { id: 'level_0', name: 'Nivel 0', order: 1,
    permissions: ['membership-profile', 'mentorship-profile', 'my-sponsor'],
    products: [], quick_link_permissions: [], site_pages: [],
    created_at: new Date().toISOString() },
  { id: 'level_1', name: 'Nivel 1', order: 2,
    permissions: ['membership-profile', 'mentorship-profile', 'my-sponsor'],
    products: ['kms', 'lms'], quick_link_permissions: [], site_pages: [],
    created_at: new Date().toISOString() },
]);

// 2) SETTINGS → governance v2 ON, levels enforced on the server
db.settings.updateMany({}, { $set: { level_enforcement_mode: 'enforce', membership_v2_enabled: true } });

// 3) MEMBERS → Nivel 0, except admins (admin = role 'admin' OR cms role 'role_admin')
const nonAdmin = { role: { $ne: 'admin' }, cms_roles: { $ne: 'role_admin' } };
const res = db.members.updateMany(nonAdmin, { $set: { level_id: 'level_0' } });
print('members moved to Nivel 0 = ' + res.modifiedCount);

print('=== AFTER ===');
print('levels=' + db.member_levels.countDocuments());
print('members on Nivel 0 = ' + db.members.countDocuments({ level_id: 'level_0' }));
print('admins untouched = ' + db.members.countDocuments({ $or: [{ role: 'admin' }, { cms_roles: 'role_admin' }] }));
print('members keeping a legacy type = ' + db.members.countDocuments({ member_type_id: { $nin: [null, ''] } }));
const s = db.settings.findOne({}, { _id: 0, level_enforcement_mode: 1, membership_v2_enabled: 1 });
print('settings = ' + JSON.stringify(s));
db.member_levels.find({}).sort({ order: 1 }).forEach(l => print('  L ' + l.id + ' "' + l.name + '" perms=' + JSON.stringify(l.permissions) + ' products=' + JSON.stringify(l.products)));
