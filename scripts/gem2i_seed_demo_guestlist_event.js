// Beta demo: one UPCOMING guest-list event (beta had none — all 90 legacy guest-list events are past),
// cloned from "Carl Cox Invites" (legacy 2129) to 2026-12-12, so the guest-list widget + pass page can be tested.
// Re-runnable. Run on the box:  mongosh gem2i_cms --quiet scripts/gem2i_seed_demo_guestlist_event.js
// Remove: db.gem_transactions.deleteMany({event_id: db.gem_events.findOne({seed:'gem2i_demo_guestlist_2026-10-26'})?.id});
//         db.gem_events.deleteMany({seed:'gem2i_demo_guestlist_2026-10-26'})
const SEED = 'gem2i_demo_guestlist_2026-10-26';
const DATE = '2026-12-12';
const src = db.gem_events.findOne({ slug: 'carl-cox-invites-2129' });
if (!src) throw new Error('source event not found');
const doc = { ...src };
delete doc._id;
Object.assign(doc, {
  id: require('crypto').randomUUID(),
  legacy_id: `demo-gl-${DATE}`,
  slug: `carl-cox-invites-2129-${DATE}`,
  event_date: DATE,
  open_time: `${DATE}T23:00:00`,
  status: 'active', private: false, show_portal: true,
  guest_list: { ...(src.guest_list || {}), stock: 50, free_until: '01:00' },
  seed: SEED, created_at: new Date().toISOString(),
});
delete doc.updated_at;
db.gem_events.deleteMany({ seed: SEED });
db.gem_events.insertOne(doc);
print('demo guest-list event:', doc.slug);
