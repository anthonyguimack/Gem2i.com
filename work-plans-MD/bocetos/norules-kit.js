// Kit común de bocetos Norules: buscador real por página, pestañas, paginación y switch de variantes.
const API = 'https://beta.gem2i.com/api/uploads/gem2i/legacy/';
const CONTINENTS = ['All', 'USA', 'Europe', 'North America', 'South America', 'Africa', 'Oceania', 'Asia'];
const PIN = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>';
const CAL = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';

// fields: [label, kind, placeholder]  kind = text | country | state | date
function searchBar(fields) {
  const cols = fields.map(f => (f[1] === 'date' ? '1.1fr' : '1fr')).join(' ') + ' auto';
  const f = fields.map(([l, k, p]) => {
    if (k === 'country') return `<div class="f"><label>${l}</label><select><option>All countries</option><option>United States</option><option>Spain</option><option>Brazil</option></select></div>`;
    if (k === 'state') return `<div class="f"><label>${l}</label><select disabled><option>All states</option></select></div>`;
    if (k === 'date') return `<div class="f"><label>${l}</label><button class="dt" type="button">${CAL} Any date</button></div>`;
    return `<div class="f"><label>${l}</label><input placeholder="${p || ''}" ${k === 'city' ? 'disabled' : ''}></div>`;
  }).join('');
  return `<form class="search" style="grid-template-columns:${cols}" onsubmit="return false">${f}<div class="go"><button class="s">Search</button><button class="r" type="reset">Reset</button></div></form>`;
}
const tabs = (list = CONTINENTS) => `<div class="tabs">${list.map((t, i) => `<button class="chip ${i ? '' : 'on'}">${t}</button>`).join('')}</div>`;
const pager = () => `<div class="pager"><button>← Previous</button><button class="on">1</button><button>2</button><button>3</button><span>…</span><button>12</button><button>Next →</button></div>`;
const seg = (a, b) => `<div class="seg"><button class="on">${a}</button><button>${b}</button></div>`;

document.addEventListener('click', e => {
  const b = e.target.closest('.switch button');
  if (b) {
    document.querySelectorAll('.v').forEach(x => x.classList.toggle('on', x.id === b.dataset.v));
    document.querySelectorAll('.switch button').forEach(x => x.classList.toggle('on', x === b));
    window.dispatchEvent(new Event('variant'));
    return;
  }
  const c = e.target.closest('.chip, .seg button');
  if (c) [...c.parentElement.children].forEach(x => x.classList.toggle('on', x === c));
  const sel = e.target.closest('select');
  if (sel) return;
});
document.addEventListener('change', e => {
  if (e.target.matches('.search select:not([disabled])')) {
    const st = e.target.closest('.search').querySelectorAll('select')[1];
    const city = e.target.closest('.search').querySelector('input[disabled]');
    if (st) { st.disabled = false; st.innerHTML = '<option>All states</option><option>Florida</option><option>New York</option>'; }
    if (city) city.disabled = false;
  }
});
