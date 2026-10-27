/* Event microsites — one React build, served on each event's own domain.
 * Bocetos: work-plans-MD/bocetos/gem2i-microsite-{guest,eticket,account}.html
 * Chosen: guest MG-B · e-ticket PROMO-A, BUY-B, DETAILS-A, LINEUP-A, ACCOUNT-B, APPLY-A.
 * Design = Norules logic in black / grey / white (light default, dark toggle) — the
 * microsite wears the PROMOTER's brand (logo, name, socials), never the gem2i palette. */
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Calendar, Clock, MapPin, Moon, Sun, Minus, Plus, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { gemAPI, authAPI } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { BACKEND_URL } from '../../lib/config';
import LoginModal from '../../components/LoginModal';

const src = (u) => (!u ? '' : /^https?:/.test(u) ? u : `${BACKEND_URL}${u}`);
const txt = (v) => (v && typeof v === 'object' ? v.en || Object.values(v)[0] || '' : v || '');
const fmtDate = (d) => {
  if (!d) return '';
  const dt = new Date(`${d}T12:00:00`);
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};
const fmtTime = (t) => {
  if (!t) return '';
  const m = String(t).match(/(\d{2}):(\d{2})/);
  if (!m) return t;
  const h = +m[1];
  return `${((h + 11) % 12) + 1}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`;
};
const money = (n, cur) => (n == null || n === '' ? '—' : `${(cur || 'usd').toUpperCase() === 'EUR' ? '€' : '$'}${Number(n).toFixed(2)}`);

const THEMES = {
  light: { '--ms-bg': '#ffffff', '--ms-soft': '#f4f4f4', '--ms-line': '#e3e3e3', '--ms-ink': '#0b0b0b', '--ms-mute': '#6b6b6b', '--ms-inv': '#ffffff' },
  dark: { '--ms-bg': '#0b0b0b', '--ms-soft': '#161616', '--ms-line': '#2a2a2a', '--ms-ink': '#f5f5f5', '--ms-mute': '#9a9a9a', '--ms-inv': '#0b0b0b' },
};

function Pill({ children, onClick, disabled, ghost, type = 'button', testid }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} data-testid={testid}
      className={`group inline-flex items-center gap-3 rounded-full pl-5 pr-1.5 py-1.5 text-sm font-semibold transition-transform active:scale-[0.98] disabled:opacity-40 ${ghost ? 'border border-[var(--ms-ink)] text-[var(--ms-ink)]' : 'bg-[var(--ms-ink)] text-[var(--ms-inv)]'}`}>
      {children}
      <span className={`grid place-items-center w-8 h-8 rounded-full transition-transform group-hover:translate-x-0.5 ${ghost ? 'bg-[var(--ms-ink)] text-[var(--ms-inv)]' : 'bg-[var(--ms-inv)] text-[var(--ms-ink)]'}`}>
        <ArrowRight className="w-4 h-4" />
      </span>
    </button>
  );
}

const Eyebrow = ({ children }) => <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--ms-mute)]">{children}</p>;

function Section({ id, eyebrow, title, children }) {
  return (
    <section id={id} className="border-t border-[var(--ms-line)] py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="mt-2 text-3xl md:text-5xl font-extrabold tracking-[-0.04em] leading-[1.05]">{title}</h2>
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}

/* ---------------- header / footer (promoter brand) ---------------- */
function Header({ brand, kind, mode, setMode, onLogin, user, logout, data }) {
  const logo = src(mode === 'dark' ? brand?.image_urls?.logo_off || brand?.image_urls?.logo : brand?.image_urls?.logo);
  // Only link sections that are on the page (no upcoming dates → no "Dates"; signed in → no "Membership").
  const hasDates = (data?.upcoming || []).length > 0;
  const hasLineup = (data?.event?.lineup_artists || []).length > 0;
  const links = (kind === 'eticket'
    ? [['#tickets', 'Tickets', true], ['#details', 'Details', true], ['#lineup', 'Line-up', hasLineup], ['#dates', 'Dates', hasDates], ['#account', 'My account', true]]
    : [['#guest-list', 'Guest list', true], ['#dates', 'Dates', hasDates], ['#apply', 'Membership', !user]]
  ).filter((l) => l[2]);
  return (
    <header className="sticky top-0 z-40 bg-[var(--ms-bg)]/90 backdrop-blur border-b border-[var(--ms-line)]">
      <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center gap-6">
        <a href="#top" className="flex items-center gap-3 min-w-0">
          {logo ? <img src={logo} alt={brand?.name || ''} className="h-8 w-auto max-w-[160px] object-contain" />
            : <span className="font-extrabold tracking-[-0.03em] truncate">{brand?.name || 'Event'}</span>}
        </a>
        <nav className="hidden md:flex items-center gap-6 ml-auto text-sm text-[var(--ms-mute)]">
          {links.map(([h, l]) => <a key={h} href={h} className="hover:text-[var(--ms-ink)]">{l}</a>)}
        </nav>
        <div className="ml-auto md:ml-0 flex items-center gap-2">
          <button onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme"
            className="w-9 h-9 grid place-items-center rounded-full border border-[var(--ms-line)]">
            {mode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          {user ? (
            <button onClick={logout} className="h-9 px-4 rounded-full border border-[var(--ms-line)] text-sm">Log out</button>
          ) : (
            <button onClick={onLogin} className="h-9 px-4 rounded-full bg-[var(--ms-ink)] text-[var(--ms-inv)] text-sm font-semibold" data-testid="ms-login">Log in</button>
          )}
        </div>
      </div>
    </header>
  );
}

const SOCIALS = ['facebook', 'instagram', 'twitter', 'youtube', 'soundcloud', 'mixcloud', 'pinterest'];
function Footer({ brand }) {
  const socials = SOCIALS.filter((k) => brand?.socials?.[k] || brand?.[k]);
  return (
    <footer className="border-t border-[var(--ms-line)] py-10">
      <div className="max-w-6xl mx-auto px-4 md:px-8 flex flex-col md:flex-row gap-4 md:items-center justify-between text-sm text-[var(--ms-mute)]">
        <p>© {new Date().getFullYear()} {brand?.name || ''}{brand?.email_contact_us ? <> · <a className="underline" href={`mailto:${brand.email_contact_us}`}>{brand.email_contact_us}</a></> : null}</p>
        <div className="flex flex-wrap gap-4">
          {socials.map((k) => <a key={k} href={brand?.socials?.[k] || brand?.[k]} target="_blank" rel="noreferrer" className="capitalize hover:text-[var(--ms-ink)]">{k}</a>)}
        </div>
        <p>Powered by GEM2i</p>
      </div>
    </footer>
  );
}

/* ---------------- shared event bits ---------------- */
function EventFacts({ ev }) {
  const v = ev.venue;
  return (
    <ul className="space-y-3 text-sm">
      <li className="flex gap-3"><Calendar className="w-4 h-4 mt-0.5 shrink-0" />{fmtDate(ev.event_date)}</li>
      {(ev.open_time || ev.end_time) && <li className="flex gap-3"><Clock className="w-4 h-4 mt-0.5 shrink-0" />{[ev.open_time, ev.end_time].filter(Boolean).map(fmtTime).join(' – ')}</li>}
      {v && <li className="flex gap-3"><MapPin className="w-4 h-4 mt-0.5 shrink-0" /><span>{v.name}{v.address ? <span className="text-[var(--ms-mute)]"> · {v.address}</span> : null}</span></li>}
    </ul>
  );
}

function Dates({ items, id = 'dates' }) {
  if (!items?.length) return null;
  return (
    <Section id={id} eyebrow="Upcoming" title="More dates">
      <div className="divide-y divide-[var(--ms-line)] border-y border-[var(--ms-line)]">
        {items.map((e) => (
          <div key={e.id} className="grid grid-cols-[110px_1fr] md:grid-cols-[160px_1fr_auto] gap-4 py-5 items-center">
            <p className="text-sm font-semibold">{fmtDate(e.event_date)}</p>
            <p className="font-bold tracking-[-0.02em] truncate">{txt(e.title)}</p>
            <p className="hidden md:block text-sm text-[var(--ms-mute)]">{fmtTime(e.open_time)}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------------- apply for membership (APPLY-A) → PENDING ---------------- */
function Apply({ host }) {
  const [f, setF] = useState({ first_name: '', last_name: '', email: '', password: '', gender: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const sponsor = useMemo(() => new URLSearchParams(window.location.search).get('GEM') || '', []);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await gemAPI.micrositeApply({ ...f, host, sponsor });
      setDone(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not send your application');
    } finally { setBusy(false); }
  };
  const inp = 'w-full h-12 px-4 rounded-full bg-[var(--ms-soft)] border border-[var(--ms-line)] text-sm outline-none focus:border-[var(--ms-ink)]';
  return (
    <Section id="apply" eyebrow="Membership" title="Apply for membership">
      {done ? (
        <div className="flex items-start gap-4 max-w-xl" data-testid="ms-apply-done">
          <span className="grid place-items-center w-10 h-10 rounded-full bg-[var(--ms-ink)] text-[var(--ms-inv)] shrink-0"><Check className="w-5 h-5" /></span>
          <p className="text-[var(--ms-mute)] leading-relaxed">Thanks — your application is <b className="text-[var(--ms-ink)]">pending</b>. Check your e-mail and open the confirmation link to activate your membership.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="grid md:grid-cols-[1fr_1.2fr] gap-10">
          <p className="text-[var(--ms-mute)] leading-relaxed max-w-[42ch]">Members get access to the guest list, e-tickets and reward points. Your account is activated once you confirm your e-mail.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <input className={inp} placeholder="First name" required value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} />
            <input className={inp} placeholder="Last name" required value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} />
            <input className={`${inp} sm:col-span-2`} type="email" placeholder="E-mail" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            <input className={inp} type="password" placeholder="Password (8+ characters)" minLength={8} required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
            <select className={inp} value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })}>
              <option value="">Gender</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
            </select>
            <div className="sm:col-span-2 pt-2"><Pill type="submit" disabled={busy} testid="ms-apply-submit">{busy ? 'Sending…' : 'Apply now'}</Pill></div>
          </div>
        </form>
      )}
    </Section>
  );
}

/* ---------------- GUEST-LIST microsite (MG-B) ---------------- */
function GuestSite({ data, user, onLogin }) {
  const ev = data.event;
  const [status, setStatus] = useState(null);
  const [extra, setExtra] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (user) gemAPI.myEventStatus(ev.id).then((r) => setStatus(r.data)).catch(() => setStatus(null));
  }, [user, ev.id]);
  const gl = status?.guest_list;
  const join = async () => {
    if (!user) return onLogin();
    setBusy(true);
    try {
      await gemAPI.joinGuestList(ev.id, extra);
      toast.success('You are on the guest list — your QR e-pass is in your e-mail');
      setStatus((await gemAPI.myEventStatus(ev.id)).data);
    } catch (err) { toast.error(err.response?.data?.detail || 'Could not join the guest list'); } finally { setBusy(false); }
  };
  const maxExtra = gl?.additional_enabled ? Math.max(0, Math.max(...(gl.ranges?.length ? gl.ranges : [0]))) : 0;
  return (
    <>
      <section id="top" className="max-w-6xl mx-auto px-4 md:px-8 py-12 md:py-20 grid md:grid-cols-[1fr_1.1fr] gap-10 md:gap-16 items-center">
        <div className="aspect-[4/5] rounded-[28px] overflow-hidden bg-[var(--ms-soft)]">
          {ev.image_urls?.flyer && <img src={src(ev.image_urls.flyer)} alt="" className="w-full h-full object-cover grayscale-[15%]" />}
        </div>
        <div id="guest-list">
          <Eyebrow>Guest list · {data.promoter?.name}</Eyebrow>
          <h1 className="mt-3 text-4xl md:text-6xl font-extrabold tracking-[-0.045em] leading-[1.02]">{txt(ev.title)}</h1>
          <div className="mt-8"><EventFacts ev={ev} /></div>
          {ev.summary && <p className="mt-6 text-[var(--ms-mute)] leading-relaxed max-w-[52ch]">{txt(ev.summary)}</p>}
          <div className="mt-10 border-t border-[var(--ms-line)] pt-8">
            {status?.pass ? (
              <p className="flex items-center gap-3 font-semibold" data-testid="ms-guest-on"><Check className="w-5 h-5" /> You are on the list. Your QR e-pass was sent by e-mail.</p>
            ) : (
              <div className="flex flex-wrap items-center gap-5">
                {maxExtra > 0 && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-[var(--ms-mute)]">Guests</span>
                    <button onClick={() => setExtra(Math.max(0, extra - 1))} className="w-8 h-8 grid place-items-center rounded-full border border-[var(--ms-line)]"><Minus className="w-3.5 h-3.5" /></button>
                    <span className="w-5 text-center font-semibold">{extra}</span>
                    <button onClick={() => setExtra(Math.min(maxExtra, extra + 1))} className="w-8 h-8 grid place-items-center rounded-full border border-[var(--ms-line)]"><Plus className="w-3.5 h-3.5" /></button>
                  </div>
                )}
                <Pill onClick={join} disabled={busy || (gl && gl.available <= 0)} testid="ms-guest-join">
                  {!user ? 'Log in to join the list' : gl && gl.available <= 0 ? 'Guest list full' : 'Join the guest list'}
                </Pill>
                {gl && <span className="text-sm text-[var(--ms-mute)]">{gl.available} spots left</span>}
              </div>
            )}
          </div>
        </div>
      </section>
      <Dates items={data.upcoming} />
      {!user && <Apply host={data.host} />}
    </>
  );
}

/* ---------------- E-TICKET microsite ---------------- */
function Promo({ data }) {
  const ev = data.event;
  const slide = data.slides?.[0];
  const bg = src(slide?.image || ev.image_urls?.flyer);
  return (
    <section id="top" className="relative min-h-[78dvh] flex items-end overflow-hidden bg-[#0b0b0b] text-white">
      {bg && <img src={bg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60 grayscale-[25%]" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      <div className="relative max-w-6xl w-full mx-auto px-4 md:px-8 pb-14 md:pb-20">
        {ev.image_urls?.logo && <img src={src(ev.image_urls.logo)} alt="" className="h-14 w-auto mb-6 object-contain" />}
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">{data.promoter?.name} presents</p>
        <h1 className="mt-3 text-5xl md:text-7xl font-extrabold tracking-[-0.05em] leading-[0.98] max-w-[16ch]">{txt(slide?.title) || txt(ev.title)}</h1>
        <p className="mt-6 text-white/80">{fmtDate(ev.event_date)}{ev.venue ? ` · ${ev.venue.name}` : ''}</p>
        <a href="#tickets" className="mt-8 inline-flex items-center gap-3 rounded-full bg-white text-black pl-5 pr-1.5 py-1.5 text-sm font-semibold">
          {txt(slide?.text_button) || 'Get tickets'} <span className="grid place-items-center w-8 h-8 rounded-full bg-black text-white"><ArrowRight className="w-4 h-4" /></span>
        </a>
      </div>
    </section>
  );
}

function Tickets({ ev, user, onLogin }) {
  const [avail, setAvail] = useState(null);
  const [qty, setQty] = useState({});
  const [busy, setBusy] = useState('');
  useEffect(() => { gemAPI.tierAvailability(ev.id).then((r) => setAvail(r.data)).catch(() => setAvail({ tiers: {} })); }, [ev.id]);
  const buy = async (k) => {
    if (!user) return onLogin();
    setBusy(k);
    try {
      const r = await gemAPI.checkout(ev.id, k, qty[k] || 1);
      window.location.href = r.data.url;
    } catch (err) { toast.error(err.response?.data?.detail || 'Checkout failed'); setBusy(''); }
  };
  const tiers = Object.entries(avail?.tiers || {});
  return (
    <Section id="tickets" eyebrow="E-tickets" title="Choose your ticket">
      {!avail ? <Loader2 className="w-5 h-5 animate-spin" /> : !tiers.length ? (
        <p className="text-[var(--ms-mute)]">{ev.external_ticket_system ? <a className="underline" href={ev.external_ticket_system}>Tickets are sold here</a> : 'Tickets are not on sale yet.'}</p>
      ) : (
        <div className="divide-y divide-[var(--ms-line)] border-y border-[var(--ms-line)]" data-testid="ms-tiers">
          {tiers.map(([k, t]) => {
            const left = t.available ?? t.stock;
            return (
              <div key={k} className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_140px_150px_auto] gap-4 py-6 items-center">
                <div>
                  <p className="text-xl font-bold tracking-[-0.02em]">{t.label}</p>
                  <p className="text-sm text-[var(--ms-mute)]">{left > 0 ? `${left} left` : 'Sold out'}</p>
                </div>
                <p className="text-xl font-extrabold text-right md:text-left">{money(t.price, avail.currency)}</p>
                <div className="flex items-center gap-3 text-sm">
                  <button onClick={() => setQty({ ...qty, [k]: Math.max(1, (qty[k] || 1) - 1) })} className="w-8 h-8 grid place-items-center rounded-full border border-[var(--ms-line)]"><Minus className="w-3.5 h-3.5" /></button>
                  <span className="w-5 text-center font-semibold">{qty[k] || 1}</span>
                  <button onClick={() => setQty({ ...qty, [k]: Math.min(10, left || 1, (qty[k] || 1) + 1) })} className="w-8 h-8 grid place-items-center rounded-full border border-[var(--ms-line)]"><Plus className="w-3.5 h-3.5" /></button>
                </div>
                <div className="col-span-2 md:col-span-1"><Pill onClick={() => buy(k)} disabled={left <= 0 || busy === k} testid={`ms-buy-${k}`}>{busy === k ? 'Redirecting…' : 'Buy'}</Pill></div>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

function Details({ ev }) {
  return (
    <Section id="details" eyebrow="The night" title="Event details">
      <div className="grid md:grid-cols-[320px_1fr] gap-10 md:gap-16">
        <div className="space-y-8">
          <EventFacts ev={ev} />
          {ev.image_urls?.flyer && <img src={src(ev.image_urls.flyer)} alt="" className="w-full rounded-[24px]" />}
        </div>
        <div className="prose-sm max-w-[65ch] text-[var(--ms-mute)] leading-relaxed [&_p]:mb-4">
          {ev.description ? <div dangerouslySetInnerHTML={{ __html: txt(ev.description) }} /> : <p>{txt(ev.summary)}</p>}
          {ev.concept && <div className="mt-6" dangerouslySetInnerHTML={{ __html: txt(ev.concept) }} />}
        </div>
      </div>
    </Section>
  );
}

function Lineup({ artists }) {
  if (!artists?.length) return null;
  return (
    <Section id="lineup" eyebrow="Line-up" title="Who's playing">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
        {artists.map((a) => (
          <div key={a.id}>
            <div className="aspect-square rounded-[24px] overflow-hidden bg-[var(--ms-soft)]">
              {(a.image_urls?.detail || a.image_urls?.small) && <img src={src(a.image_urls.detail || a.image_urls.small)} alt="" className="w-full h-full object-cover grayscale" />}
            </div>
            <p className="mt-3 font-bold tracking-[-0.02em]">{a.name}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------------- My Account (ACCOUNT-B): legacy submenu, 4 pages ---------------- */
const ACCOUNT_TABS = [
  ['purchased', 'Purchased tickets', ['Ticket type', 'Event name', 'Total price', 'Qty', 'Transaction fee', 'Total amount', 'Print']],
  ['history', 'Transaction history', ['Ticket type', 'Event name', 'Price', 'Qty', 'Transaction fee', 'Total amount', 'Points']],
  ['guest_lists', 'Guest list', ['Event name', 'Event date', 'Guests', 'Status', 'Create date']],
  ['bank', 'Tickets bank', ['Ticket type', 'Event name', 'Price purchased', 'Transaction fee', 'Total amount']],
];

function Account({ user, onLogin }) {
  const [tab, setTab] = useState('purchased');
  const [data, setData] = useState(null);
  useEffect(() => { if (user) gemAPI.micrositeAccount().then((r) => setData(r.data)).catch(() => setData({})); }, [user]);
  const cur = ACCOUNT_TABS.find((t) => t[0] === tab);
  const rows = data?.[tab] || [];
  const cell = (r) => {
    if (tab === 'guest_lists') return [r.event_title, fmtDate(r.event_date), 1 + (r.guests || 0), r.status, (r.created_at || '').slice(0, 10)];
    if (tab === 'bank') return [r.tier, r.event_title, money(r.price, r.currency), money(r.fee, r.currency), money(r.total, r.currency)];
    const base = [r.tier, r.event_title, money(r.price, r.currency), r.quantity, money(r.fee, r.currency), money(r.total, r.currency)];
    return tab === 'history' ? [...base, r.points] : [...base, r.qr?.url ? <a href={src(r.qr.url)} target="_blank" rel="noreferrer" className="underline">Print</a> : '—'];
  };
  return (
    <Section id="account" eyebrow="Members" title="My account">
      {!user ? <Pill onClick={onLogin}>Log in to see your tickets</Pill> : (
        <>
          <div className="flex flex-wrap gap-2 mb-8" role="tablist">
            {ACCOUNT_TABS.map(([k, l]) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                className={`h-10 px-5 rounded-full text-sm font-semibold border ${tab === k ? 'bg-[var(--ms-ink)] text-[var(--ms-inv)] border-[var(--ms-ink)]' : 'border-[var(--ms-line)] text-[var(--ms-mute)]'}`}>{l}</button>
            ))}
          </div>
          {!data ? <Loader2 className="w-5 h-5 animate-spin" /> : !rows.length ? (
            <p className="text-[var(--ms-mute)] py-10 border-y border-[var(--ms-line)]">Nothing here yet.</p>
          ) : (
            <div className="overflow-x-auto border-y border-[var(--ms-line)]">
              <table className="w-full text-sm min-w-[640px]">
                <thead><tr className="text-left text-[11px] uppercase tracking-[0.16em] text-[var(--ms-mute)]">{cur[2].map((h) => <th key={h} className="py-4 pr-4 font-semibold">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-[var(--ms-line)]">
                  {rows.map((r) => <tr key={r.id}>{cell(r).map((c, i) => <td key={i} className="py-4 pr-4">{c}</td>)}</tr>)}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Section>
  );
}

function ETicketSite({ data, user, onLogin }) {
  return (
    <>
      <Promo data={data} />
      <Tickets ev={data.event} user={user} onLogin={onLogin} />
      <Details ev={data.event} />
      <Lineup artists={data.event.lineup_artists} />
      <Dates items={data.upcoming} />
      <Account user={user} onLogin={onLogin} />
      {!user && <Apply host={data.host} />}
    </>
  );
}

/* ---------------- root ---------------- */
export default function MicrositeApp({ host }) {
  const { user: authUser, logout } = useAuth();
  // The parent-domain cookie signs the visitor in here, but member APIs take a Bearer
  // token (kept per origin) → trade the cookie for one once, before member calls run.
  const [tokenReady, setTokenReady] = useState(() => { try { return !!localStorage.getItem('auth_token'); } catch { return false; } });
  useEffect(() => {
    if (!authUser || tokenReady) return;
    authAPI.token()
      .then((r) => { try { localStorage.setItem('auth_token', r.data.token); } catch { /* private mode */ } })
      .catch(() => {})
      .finally(() => setTokenReady(true));
  }, [authUser, tokenReady]);
  const user = authUser && tokenReady ? authUser : null;
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [login, setLogin] = useState(false);
  const [mode, setMode] = useState(() => { try { return localStorage.getItem('ms_mode') || 'light'; } catch { return 'light'; } });
  useEffect(() => { try { localStorage.setItem('ms_mode', mode); } catch { /* private mode */ } }, [mode]);

  useEffect(() => {
    gemAPI.microsite(host).then((r) => {
      setData(r.data);
      document.title = `${txt(r.data.event?.title)} · ${r.data.promoter?.name || ''}`.replace(/ · $/, '');
    }).catch(() => setError(true));
  }, [host]);

  // E-mailed confirmation link (?verify=<token>) → pending member becomes active.
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('verify');
    if (!token) return;
    gemAPI.micrositeVerify(token)
      .then(() => { toast.success('Membership confirmed — you can log in now'); setLogin(true); })
      .catch((e) => toast.error(e.response?.data?.detail || 'Invalid link'));
  }, []);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('session_id')) toast.success('Payment received — your tickets are in My account and your e-mail');
  }, []);

  return (
    <div style={THEMES[mode]} className="min-h-[100dvh] bg-[var(--ms-bg)] text-[var(--ms-ink)] antialiased" data-testid="microsite">
      {error ? (
        <div className="min-h-[100dvh] grid place-items-center px-4 text-center">
          <div><Eyebrow>{host}</Eyebrow><h1 className="mt-3 text-4xl font-extrabold tracking-[-0.04em]">No upcoming event</h1>
            <p className="mt-3 text-[var(--ms-mute)]">There is no active event on this site right now. Check back soon.</p></div>
        </div>
      ) : !data ? (
        <div className="min-h-[100dvh] grid place-items-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <>
          <Header brand={data.promoter} kind={data.kind} mode={mode} setMode={setMode} onLogin={() => setLogin(true)} user={authUser} logout={logout} data={data} />
          <main>
            {data.kind === 'guest'
              ? <GuestSite data={data} user={user} onLogin={() => setLogin(true)} />
              : <ETicketSite data={data} user={user} onLogin={() => setLogin(true)} />}
          </main>
          <Footer brand={data.promoter} />
        </>
      )}
      <LoginModal open={login} onClose={() => setLogin(false)} />
    </div>
  );
}
