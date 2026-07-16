import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { opportunitiesAPI } from '../lib/api';
import { normalizeRichText } from '../lib/richText';
import { OpportunityBannerFallback } from './OpportunitiesDirectoryPage';
import {
  Loader2, ChevronLeft, ChevronDown, Clock, MapPin, Tag, User, Calendar,
  FileText, ExternalLink, PlayCircle, Facebook, Twitter, Linkedin, Instagram, Globe,
} from 'lucide-react';

const PB_FONT = "'Plus Jakarta Sans', 'Inter', sans-serif";

const fmtMoney = (v) => (v == null ? '—' :
  Number(v).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }));
const fmtDate = (v) => (v ? v.slice(0, 10) : '—');

const SOCIAL_ICONS = { facebook: Facebook, twitter: Twitter, linkedin: Linkedin, instagram: Instagram, google: Globe };

const DATE_LABELS = [
  ['launch', 'Launch'], ['funding_end', 'Funding End'], ['project', 'Project'],
  ['reporting', 'Reporting'], ['distribution', 'Distribution'],
];

function Fact({ label, children }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-slate-100 last:border-0 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="text-right font-medium" style={{ color: 'var(--color-heading, #1a2332)' }}>{children}</span>
    </div>
  );
}

function Rich({ html }) {
  if (!html) return null;
  return <div className="prose prose-sm max-w-none text-slate-600 [&_img]:max-w-full"
    dangerouslySetInnerHTML={{ __html: normalizeRichText(html) }} />;
}

export default function OpportunityDetailPage() {
  const { slug } = useParams();
  const [o, setO] = useState(null);
  const [missing, setMissing] = useState(false);
  const [mainImg, setMainImg] = useState(0);
  const [openFaq, setOpenFaq] = useState({});

  useEffect(() => {
    setO(null); setMissing(false);
    opportunitiesAPI.detail(slug).then(r => setO(r.data)).catch(() => setMissing(true));
  }, [slug]);

  if (missing) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background, #faf8f5)' }}>
        <div className="text-center" style={{ fontFamily: PB_FONT }}>
          <p className="text-slate-500 mb-4">Opportunity not found.</p>
          <Link to="/opportunities" className="text-sm font-medium" style={{ color: 'var(--color-accent, #0D9488)' }}>← Back to opportunities</Link>
        </div>
      </div>
    );
  }
  if (!o) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background, #faf8f5)' }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-accent, #0D9488)' }} />
    </div>;
  }

  const images = (o.images || []).filter(Boolean);
  const hero = images[mainImg] || images[0] || o.type_default_image;
  const location = [o.geo?.city, o.geo?.state, o.geo?.country].filter(Boolean).join(', ');
  const socials = Object.entries(o.socials || {}).filter(([, v]) => v);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background, #faf8f5)', fontFamily: PB_FONT }}>
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 pt-24 md:pt-28">
        <Link to="/opportunities" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[var(--color-accent,#0D9488)] mb-6">
          <ChevronLeft className="w-4 h-4" /> Investment Opportunities
        </Link>

        <div className="grid lg:grid-cols-[1fr_320px] gap-8">
          <div className="min-w-0">
            <div className="rounded-sm overflow-hidden border border-slate-100 bg-white mb-3">
              <div className="aspect-[16/9] bg-slate-100 relative">
                {hero ? <img src={hero} alt={o.name} className="w-full h-full object-cover" />
                  : <OpportunityBannerFallback name={o.name} />}
                <span className={`absolute top-4 left-4 text-[11px] font-semibold px-2.5 py-1 rounded-full backdrop-blur ${o.funding_open ? 'bg-emerald-500/90 text-white' : 'bg-slate-800/80 text-white/80'}`}>
                  {o.funding_open ? 'Open for funding' : 'Funding closed'}
                </span>
              </div>
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 mb-6">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setMainImg(i)}
                    className={`w-20 aspect-[4/3] rounded-sm overflow-hidden border-2 transition-colors ${i === mainImg ? 'border-[var(--color-accent,#0D9488)]' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <h1 className="text-3xl md:text-4xl font-bold mt-4 mb-2" style={{ color: 'var(--color-heading, #1a2332)', fontFamily: 'Playfair Display, serif' }}>
              {o.name}
            </h1>
            <div className="flex flex-wrap gap-4 text-xs text-slate-500 mb-6">
              {o.type_name && <span className="inline-flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> {o.type_name}</span>}
              {o.author && <span className="inline-flex items-center gap-1"><User className="w-3.5 h-3.5" /> {o.author}</span>}
              {location && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {location}</span>}
              {o.funding_ends_at && <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Funding ends {fmtDate(o.funding_ends_at)}</span>}
            </div>

            {o.summary && <div className="bg-white border border-slate-100 rounded-sm p-6 mb-6"><Rich html={o.summary} /></div>}
            {o.description && (
              <div className="bg-white border border-slate-100 rounded-sm p-6 mb-6">
                <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--color-heading, #1a2332)', fontFamily: 'Playfair Display, serif' }}>About this opportunity</h2>
                <Rich html={o.description} />
              </div>
            )}

            {(o.updates || []).length > 0 && (
              <div className="bg-white border border-slate-100 rounded-sm p-6 mb-6">
                <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--color-heading, #1a2332)', fontFamily: 'Playfair Display, serif' }}>Updates</h2>
                <div className="space-y-5">
                  {o.updates.map(u => (
                    <div key={u.id} className="border-l-2 pl-4" style={{ borderColor: 'var(--color-accent, #0D9488)' }}>
                      <div className="text-sm font-semibold" style={{ color: 'var(--color-heading, #1a2332)' }}>{u.title}</div>
                      <div className="text-[11px] text-slate-400 mb-1">{fmtDate(u.created_at)}</div>
                      <Rich html={u.description} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(o.faq || []).some(t => t.questions.length) && (
              <div className="bg-white border border-slate-100 rounded-sm p-6 mb-6">
                <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--color-heading, #1a2332)', fontFamily: 'Playfair Display, serif' }}>FAQ</h2>
                <div className="space-y-4">
                  {o.faq.filter(t => t.questions.length).map(t => (
                    <div key={t.topic_id}>
                      <div className="text-xs uppercase tracking-wide font-semibold text-slate-400 mb-2">{t.topic}</div>
                      <div className="space-y-1.5">
                        {t.questions.map(q => (
                          <div key={q.id} className="border border-slate-200 rounded-sm">
                            <button className="w-full flex items-center justify-between px-4 py-2.5 text-left text-sm font-medium text-slate-700"
                              onClick={() => setOpenFaq(f => ({ ...f, [q.id]: !f[q.id] }))}>
                              {q.title}
                              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openFaq[q.id] ? 'rotate-180' : ''}`} />
                            </button>
                            {openFaq[q.id] && <div className="px-4 pb-3"><Rich html={q.description} /></div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(o.team || []).length > 0 && (
              <div className="bg-white border border-slate-100 rounded-sm p-6 mb-6">
                <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--color-heading, #1a2332)', fontFamily: 'Playfair Display, serif' }}>Our Team</h2>
                <div className="flex flex-wrap gap-4">
                  {o.team.map(m => (
                    <div key={m.member_id} className="flex items-center gap-3 border border-slate-100 rounded-sm px-4 py-3">
                      {m.avatar
                        ? <img src={m.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                        : <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold text-white" style={{ backgroundColor: 'var(--color-primary, #1a2332)' }}>
                            {`${(m.first_name || '')[0] || ''}${(m.last_name || '')[0] || ''}`.toUpperCase() || '?'}
                          </div>}
                      <div>
                        <div className="text-sm font-medium" style={{ color: 'var(--color-heading, #1a2332)' }}>{m.first_name} {m.last_name}</div>
                        {m.role && <div className="text-xs text-slate-400">{m.role}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <div className="bg-white border border-slate-100 rounded-sm p-6">
              <h3 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--color-heading, #1a2332)' }}>Funding</h3>
              <Fact label="Goal">{fmtMoney(o.total_amount)}</Fact>
              <Fact label="Minimum investment">{fmtMoney(o.minimum_investment_amount)}</Fact>
              <Fact label="Visibility">{o.show_mode === 'timer' ? `Timer · ${o.timer_hours}h` : 'Until funding end'}</Fact>
              <Fact label="Published">{fmtDate(o.published_at)}</Fact>
            </div>
            <div className="bg-white border border-slate-100 rounded-sm p-6">
              <h3 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--color-heading, #1a2332)' }}>Key Dates</h3>
              {DATE_LABELS.map(([k, l]) => <Fact key={k} label={l}>{fmtDate(o.dates?.[k])}</Fact>)}
            </div>
            {((o.files || []).length > 0 || o.pfs_url || o.video_url) && (
              <div className="bg-white border border-slate-100 rounded-sm p-6">
                <h3 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--color-heading, #1a2332)' }}>Documents & Media</h3>
                <div className="space-y-2">
                  {o.video_url && (
                    <a href={o.video_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-slate-600 hover:text-[var(--color-accent,#0D9488)]">
                      <PlayCircle className="w-4 h-4 shrink-0" /> Watch the video <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {(o.files || []).map(f => f.url && (
                    <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-slate-600 hover:text-[var(--color-accent,#0D9488)]">
                      <FileText className="w-4 h-4 shrink-0" /> {f.title || f.url.split('/').pop()} <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                  {o.pfs_url && (
                    <a href={o.pfs_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-slate-600 hover:text-[var(--color-accent,#0D9488)]">
                      <FileText className="w-4 h-4 shrink-0" /> Financial statement <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            )}
            {socials.length > 0 && (
              <div className="bg-white border border-slate-100 rounded-sm p-6">
                <h3 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--color-heading, #1a2332)' }}>Follow</h3>
                <div className="flex gap-3">
                  {socials.map(([k, url]) => {
                    const Icon = SOCIAL_ICONS[k] || Globe;
                    return <a key={k} href={url} target="_blank" rel="noreferrer"
                      className="p-2 rounded-full border border-slate-200 text-slate-500 hover:text-[var(--color-accent,#0D9488)] hover:border-[var(--color-accent,#0D9488)]">
                      <Icon className="w-4 h-4" /></a>;
                  })}
                </div>
              </div>
            )}
            {(o.backers || []).length + (o.services || []).length + (o.benefits || []).length > 0 && (
              <div className="bg-white border border-slate-100 rounded-sm p-6">
                <h3 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--color-heading, #1a2332)' }}>Offerings</h3>
                <div className="space-y-4">
                  {[['Backer Pledges', o.backers], ['Services', o.services], ['Investment Benefits', o.benefits]].map(([lbl, rows]) => (rows || []).length > 0 && (
                    <div key={lbl}>
                      <div className="text-[11px] uppercase tracking-wide font-semibold text-slate-400 mb-1.5">{lbl}</div>
                      {rows.map(r => (
                        <div key={r.id} className="flex justify-between gap-3 py-1.5 text-sm border-b border-slate-50 last:border-0">
                          <span className="text-slate-600">{r.title}</span>
                          <span className="font-medium shrink-0" style={{ color: 'var(--color-heading, #1a2332)' }}>{fmtMoney(r.price)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
