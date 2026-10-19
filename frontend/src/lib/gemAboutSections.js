/**
 * gem2i /about — the blocks below the story + figures, in CMS order.
 * Stored on the About doc as `page_sections: [{key, visible}]`
 * (CMS → About → "Page sections"). Missing/new keys are appended visible.
 */
export const ABOUT_SECTIONS = [
  { key: 'methodology', label: 'Methodology', hint: 'Content: Section Manager → GEM Methodology' },
  { key: 'offices', label: 'Offices', hint: 'Content: Maps & Locations → Global business' },
  { key: 'team', label: 'Team', hint: 'Content: Section Manager → Team' },
  { key: 'contact', label: 'Contact band', hint: 'Blue band with the Contact us button' },
];

export function aboutSectionOrder(saved) {
  const list = Array.isArray(saved) ? saved.filter(s => ABOUT_SECTIONS.some(d => d.key === s.key)) : [];
  ABOUT_SECTIONS.forEach(d => { if (!list.some(s => s.key === d.key)) list.push({ key: d.key, visible: true }); });
  return list;
}
