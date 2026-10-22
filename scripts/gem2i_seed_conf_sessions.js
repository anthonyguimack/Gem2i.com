// Test sessions (hours) for 4 conferences so the home CC-1 carousel and the
// detail-page schedule can be reviewed. Only touches conferences whose
// `sessions` were set by this seed or are empty. Run on the box:
//   mongosh gem2i_cms --quiet scripts/gem2i_seed_conf_sessions.js
// Remove: db.gem_conferences.updateMany({sessions_seed:'gem2i_conf_sessions_2026-10-21'},{$unset:{sessions:'',sessions_seed:''}})
const SEED = 'gem2i_conf_sessions_2026-10-21';
let k = 0;
const s = (date, start, end, title, description) => ({ key: `seed${++k}`, visible: true, date, start, end, title, description });

const PLAN = {
  'Amsterdam Dance Event': [
    s('2026-10-15', '10:00', '11:00', 'Opening keynote: the state of dance music', 'Figures of the year: streaming, festivals and clubs.'),
    s('2026-10-15', '12:00', '13:00', 'Booking agents panel', 'How a world tour is put together.'),
    s('2026-10-15', '15:00', '16:30', 'Label showcase', 'New signings presented live.'),
    s('2026-10-16', '10:00', '11:00', 'Venues of the future', 'Sound, light and experience: what clubs ask for.'),
    s('2026-10-16', '13:00', '14:00', 'Marketing your festival', 'Guest lists, e-tickets and fan communities.'),
    s('2026-10-17', '11:00', '12:30', 'Production masterclass', 'From the studio to the dancefloor.'),
  ],
  'Brighton Music Conference': [
    s('2026-04-12', '09:30', '10:30', 'Arrival & registration', 'Badges and QR e-passes at the lobby.'),
    s('2026-04-12', '11:00', '12:00', 'DJ tech: the new standard', 'Hardware and software trends.'),
    s('2026-04-13', '10:00', '11:00', 'Artist management today', 'Contracts, tours and brand deals.'),
    s('2026-04-13', '14:00', '15:00', 'Round table', 'Promoters, venues and artists: open questions.'),
  ],
  'EDMbiz': [
    s('2026-06-17', '10:00', '11:00', 'Keynote: the business of EDM', 'Where the money moves this year.'),
    s('2026-06-17', '12:00', '13:00', 'Festival economics', 'Costs, sponsors and ticket pricing.'),
    s('2026-06-18', '11:00', '12:00', 'Data & the dancefloor', 'What audience numbers really say.'),
  ],
  'Electronic Music Conference': [
    s('2026-12-02', '10:00', '11:00', 'Welcome & Australian scene report', 'The year in clubs and festivals.'),
    s('2026-12-02', '13:00', '14:00', 'Breaking artists abroad', 'From Sydney to the global circuit.'),
    s('2026-12-03', '10:30', '11:30', 'Radio, streaming & playlists', 'How tracks reach the public today.'),
  ],
};

Object.entries(PLAN).forEach(([title, sessions]) => {
  const r = db.gem_conferences.updateMany(
    { title, status: 'active', $or: [{ sessions_seed: SEED }, { sessions: { $exists: false } }, { sessions: { $size: 0 } }] },
    { $set: { sessions, sessions_seed: SEED } });
  print(title, '→ matched', r.matchedCount, 'updated', r.modifiedCount);
});
