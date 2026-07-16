import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { memberAPI, publicAPI } from '../../lib/api';
import { normalizeRichText } from '../../lib/richText';
import { toast } from 'sonner';
import { ArrowLeft, Clock, MapPin, Users, Video, Map, ExternalLink, Download, Paperclip, Loader2 } from 'lucide-react';

const v = (name, fb) => `var(--ma-${name}, ${fb})`;
const API = process.env.REACT_APP_BACKEND_URL;
const today = () => new Date().toISOString().split('T')[0];

export default function EventDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [auxPrefix, setAuxPrefix] = useState('AUX');
  const ctx = useOutletContext() || {};
  const sectionTitle = ctx.sectionLabel ? ctx.sectionLabel('global-calendar', `${auxPrefix} Calendar`) : `${auxPrefix} Calendar`;

  useEffect(() => {
    publicAPI.getSettings().then(r => setAuxPrefix(r.data?.aux_prefix || 'AUX')).catch(() => {});
  }, []);

  useEffect(() => {
    memberAPI.getCalendarEvent(eventId).then(r => { setEvent(r.data); setLoading(false); }).catch(() => { setLoading(false); navigate('/my-account/global-calendar'); });
  }, [eventId, navigate]);

  const handleRegister = async () => {
    try {
      const r = await memberAPI.registerEvent(eventId);
      toast.success(r.data.status === 'registered' ? 'Registered!' : 'Added to waiting list');
      memberAPI.getCalendarEvent(eventId).then(r => setEvent(r.data));
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const handleCancel = async () => {
    try {
      await memberAPI.cancelEventRegistration(eventId);
      toast.success('Cancelled');
      memberAPI.getCalendarEvent(eventId).then(r => setEvent(r.data));
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" style={{ color: v('accent', '#c9a84c') }} /></div>;
  if (!event) return null;

  const isPast = event.date < today();
  const available = Math.max(0, (event.max_capacity || 0) - (event.registered_count || 0));
  const isFull = available <= 0;
  const imgSrc = event.image ? (event.image.startsWith('/api') ? `${API}${event.image}` : event.image) : null;

  return (
    <div data-testid="event-detail-page">
      <button onClick={() => navigate('/my-account/global-calendar')} className="flex items-center gap-2 text-xs mb-4 hover:opacity-80" style={{ color: v('accent', '#c9a84c') }} data-testid="back-to-calendar">
        <ArrowLeft className="w-4 h-4" /> Back to {sectionTitle}
      </button>

      {imgSrc && <img src={imgSrc} alt={event.title} className="w-full h-52 object-cover rounded-lg mb-4" />}

      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs px-2.5 py-0.5 rounded font-medium" style={{ backgroundColor: isPast ? '#374151' : '#22c55e', color: isPast ? '#9ca3af' : '#052e16' }}>{event.type}</span>
        {isPast && <span className="text-xs px-2.5 py-0.5 rounded font-medium bg-gray-500/20 text-gray-400">Past Event</span>}
      </div>

      <h1 className="text-2xl font-bold mb-4" style={{ color: v('text-primary', '#fff'), fontFamily: "'DM Serif Display', serif" }}>{event.title}</h1>

      <div className="space-y-2 text-sm mb-6" style={{ color: v('text-secondary', '#9ca3af') }}>
        <div className="flex items-center gap-2"><Clock className="w-4 h-4" />{event.date} &middot; {event.start_time} - {event.end_time} ({event.timezone})</div>
        {event.location && <div className="flex items-center gap-2"><MapPin className="w-4 h-4" />{event.location}</div>}
        <div className="flex items-center gap-2"><Users className="w-4 h-4" />{available} / {event.max_capacity} spots left ({event.registered_count} registered)</div>
      </div>

      {/* Links */}
      <div className="flex flex-wrap gap-3 mb-6">
        {event.map_url && (
          <a href={event.map_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded border hover:opacity-80" style={{ borderColor: v('card-border', 'rgba(255,255,255,0.1)'), color: v('accent', '#c9a84c') }} data-testid="detail-map-link">
            <Map className="w-3.5 h-3.5" /> View Map <ExternalLink className="w-3 h-3" />
          </a>
        )}
        {event.virtual_link && !isPast && (
          <a href={event.virtual_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded border hover:opacity-80" style={{ borderColor: v('card-border', 'rgba(255,255,255,0.1)'), color: v('accent', '#c9a84c') }} data-testid="detail-virtual-link">
            <Video className="w-3.5 h-3.5" /> Virtual Link <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Description */}
      {event.description && (
        <div className="mb-6 p-4 rounded-lg border" style={{ backgroundColor: v('card-bg', '#13161e'), borderColor: v('card-border', 'rgba(255,255,255,0.05)') }}>
          <h3 className="text-sm font-semibold mb-2" style={{ color: v('text-primary', '#fff') }}>Description</h3>
          <div className="text-sm max-w-none [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-bold [&_em]:italic [&_a]:underline [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-1 [&_br]:block [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:opacity-80" style={{ color: v('text-secondary', '#9ca3af'), overflowWrap: 'break-word', wordWrap: 'break-word', hyphens: 'none', minWidth: 0 }} dangerouslySetInnerHTML={{ __html: normalizeRichText(event.description) }} />
        </div>
      )}

      {/* Attachments */}
      {(event.attachments || []).length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-2" style={{ color: v('text-primary', '#fff') }}>Files</h3>
          <div className="space-y-1.5">
            {event.attachments.map((att, idx) => (
              <a key={idx} href={`${API}${att.url}`} target="_blank" rel="noopener noreferrer" download={att.name}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors hover:opacity-80"
                style={{ backgroundColor: v('card-bg', '#13161e'), color: v('text-secondary', '#9ca3af'), border: `1px solid ${v('card-border', 'rgba(255,255,255,0.05)')}` }}>
                <Paperclip className="w-3.5 h-3.5 flex-shrink-0" style={{ color: v('accent', '#c9a84c') }} />
                <span className="truncate flex-1">{att.name}</span>
                {att.size && <span className="text-[10px] flex-shrink-0" style={{ color: v('text-muted', '#6b7280') }}>{(att.size / 1024).toFixed(0)} KB</span>}
                <Download className="w-3.5 h-3.5 flex-shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!isPast && (
        <div className="flex items-center gap-3">
          {event.my_status === 'registered' ? (
            <>
              <span className="text-sm px-4 py-2 rounded font-medium" style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>Registered</span>
              <button onClick={handleCancel} className="text-sm px-4 py-2 rounded border font-medium" style={{ borderColor: v('card-border', 'rgba(255,255,255,0.1)'), color: v('text-secondary', '#9ca3af') }}>Cancel Registration</button>
            </>
          ) : event.my_status === 'waitlist' ? (
            <>
              <span className="text-sm px-4 py-2 rounded font-medium bg-blue-500/15 text-blue-400">Waiting List</span>
              <button onClick={handleCancel} className="text-sm px-4 py-2 rounded border font-medium" style={{ borderColor: v('card-border', 'rgba(255,255,255,0.1)'), color: v('text-secondary', '#9ca3af') }}>Cancel</button>
            </>
          ) : isFull ? (
            <button onClick={handleRegister} className="text-sm px-4 py-2 rounded font-medium bg-blue-500/15 text-blue-400">Join Waiting List</button>
          ) : (
            <button onClick={handleRegister} className="text-sm px-4 py-2 rounded font-medium" style={{ backgroundColor: v('button-bg', '#c9a84c'), color: v('button-text', '#0d0f14') }}>Register</button>
          )}
        </div>
      )}
    </div>
  );
}
