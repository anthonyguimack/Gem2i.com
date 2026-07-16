import React, { useEffect, useState } from 'react';
import { memberAPI } from '../lib/api';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Calendar, Copy, Check, RefreshCw, ExternalLink, Loader2, AlertTriangle } from 'lucide-react';

const v = (name, fb) => `var(--ma-${name}, ${fb})`;

function buildSubscribeUrls(origin, path) {
  const webcal = (origin || '').replace(/^https?:\/\//, 'webcal://') + path;
  const https = (origin || '') + path;
  const googleAdd = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(https)}`;
  return { webcal, https, googleAdd };
}

/**
 * Reusable Calendar Sync UI. When `asModal` is true, wraps content in a dialog
 * triggered by the provided `trigger` node. Otherwise renders the full card inline.
 */
export default function CalendarSyncCard({ asModal = false, trigger = null, compact = false }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rotating, setRotating] = useState(false);
  const [copied, setCopied] = useState('');
  const [confirmRotate, setConfirmRotate] = useState(false);

  useEffect(() => {
    memberAPI.getIcalInfo()
      .then(r => setInfo(r.data))
      .catch(() => toast.error('Failed to load subscription URL'))
      .finally(() => setLoading(false));
  }, []);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const urls = info ? buildSubscribeUrls(origin, info.path) : null;

  const copy = async (label, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(''), 1800);
    } catch {
      toast.error('Copy failed — select and copy manually');
    }
  };

  const rotate = async () => {
    setRotating(true);
    try {
      const r = await memberAPI.regenerateIcal();
      setInfo(r.data);
      setConfirmRotate(false);
      toast.success('New URL generated — old one is now inactive.');
    } catch { toast.error('Failed to regenerate'); }
    finally { setRotating(false); }
  };

  const body = (
    <div className="space-y-4" data-testid="calendar-sync-card">
      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" style={{ color: v('text-muted', '#6b7280') }} /></div>
      ) : info && urls ? (
        <>
          {!compact && (
            <p className="text-xs" style={{ color: v('text-secondary', '#9ca3af') }}>
              Subscribe once and every booked mentorship session + registered event flows straight into your calendar app. Updates automatically.
            </p>
          )}

          <div>
            <label className="text-[11px] uppercase tracking-wider" style={{ color: v('text-muted', '#6b7280') }}>Your personal subscription URL</label>
            <div className="mt-1 flex items-center gap-2 p-2 rounded text-xs font-mono break-all" style={{ backgroundColor: v('input-bg', '#0d0f14'), border: `1px solid ${v('input-border', 'rgba(255,255,255,0.1)')}`, color: v('text-primary', '#fff') }}>
              <span className="flex-1" data-testid="ical-url">{urls.https}</span>
              <button onClick={() => copy('https', urls.https)} className="p-1 rounded hover:opacity-80" style={{ color: v('accent', '#c9a84c') }} data-testid="copy-ical-url" title="Copy URL">
                {copied === 'https' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] mt-1" style={{ color: v('text-muted', '#6b7280') }}>
              Keep this URL private — anyone with it can see your schedule.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-2">
            <a href={urls.googleAdd} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 py-2 px-3 rounded text-xs font-medium transition-opacity hover:opacity-90" style={{ backgroundColor: v('accent', '#c9a84c'), color: v('button-text', '#0d0f14') }} data-testid="add-to-google">
              <ExternalLink className="w-3.5 h-3.5" /> Add to Google Calendar
            </a>
            <a href={urls.webcal} className="flex items-center justify-center gap-2 py-2 px-3 rounded text-xs font-medium transition-opacity hover:opacity-90" style={{ backgroundColor: v('accent', '#c9a84c'), color: v('button-text', '#0d0f14') }} data-testid="add-to-apple">
              <ExternalLink className="w-3.5 h-3.5" /> Add to Apple Calendar
            </a>
            <button onClick={() => copy('webcal', urls.webcal)} className="flex items-center justify-center gap-2 py-2 px-3 rounded text-xs font-medium transition-opacity hover:opacity-90" style={{ backgroundColor: v('card-bg', '#13161e'), color: v('text-primary', '#fff'), border: `1px solid ${v('input-border', 'rgba(255,255,255,0.1)')}` }} data-testid="copy-webcal">
              {copied === 'webcal' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} Copy webcal://
            </button>
          </div>

          {!compact && (
            <details className="text-xs" style={{ color: v('text-secondary', '#9ca3af') }}>
              <summary className="cursor-pointer hover:opacity-80 py-1" data-testid="sync-instructions-toggle">Manual setup instructions</summary>
              <div className="mt-2 space-y-3 pl-2 border-l" style={{ borderColor: v('input-border', 'rgba(255,255,255,0.1)') }}>
                <div>
                  <p className="font-semibold" style={{ color: v('text-primary', '#fff') }}>Google Calendar (web)</p>
                  <ol className="list-decimal list-inside space-y-0.5 mt-1">
                    <li>Open calendar.google.com → left sidebar → &quot;Other calendars&quot; → &quot;+&quot; → &quot;From URL&quot;.</li>
                    <li>Paste the URL above and click &quot;Add calendar&quot;.</li>
                  </ol>
                </div>
                <div>
                  <p className="font-semibold" style={{ color: v('text-primary', '#fff') }}>Apple Calendar (macOS/iOS)</p>
                  <ol className="list-decimal list-inside space-y-0.5 mt-1">
                    <li>macOS: Calendar → File → New Calendar Subscription → paste URL.</li>
                    <li>iOS: Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar.</li>
                  </ol>
                </div>
                <div>
                  <p className="font-semibold" style={{ color: v('text-primary', '#fff') }}>Outlook</p>
                  <ol className="list-decimal list-inside space-y-0.5 mt-1">
                    <li>Calendar → Add calendar → Subscribe from web → paste URL.</li>
                  </ol>
                </div>
              </div>
            </details>
          )}

          <div className="pt-2" style={{ borderTop: `1px solid ${v('input-border', 'rgba(255,255,255,0.1)')}` }}>
            {confirmRotate ? (
              <div className="flex items-start gap-2 p-3 rounded" style={{ backgroundColor: v('input-bg', '#0d0f14'), border: `1px solid ${v('input-border', 'rgba(255,255,255,0.1)')}` }}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
                <div className="flex-1 text-xs" style={{ color: v('text-secondary', '#9ca3af') }}>
                  <p>Generating a new URL will <strong style={{ color: v('text-primary', '#fff') }}>immediately stop</strong> the current subscription in all calendar apps. You will have to re-subscribe with the new URL everywhere. Continue?</p>
                  <div className="flex gap-2 mt-2">
                    <button onClick={rotate} disabled={rotating} className="px-3 py-1 rounded text-xs font-medium disabled:opacity-50" style={{ backgroundColor: '#dc2626', color: '#fff' }} data-testid="confirm-regenerate">
                      {rotating ? <Loader2 className="w-3 h-3 animate-spin inline" /> : 'Regenerate now'}
                    </button>
                    <button onClick={() => setConfirmRotate(false)} className="px-3 py-1 rounded text-xs" style={{ color: v('text-secondary', '#9ca3af') }}>Cancel</button>
                  </div>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirmRotate(true)} className="text-xs flex items-center gap-1.5 hover:underline" style={{ color: v('text-muted', '#6b7280') }} data-testid="regenerate-btn">
                <RefreshCw className="w-3 h-3" /> Regenerate URL (if compromised)
              </button>
            )}
          </div>
        </>
      ) : (
        <p className="text-sm" style={{ color: v('text-muted', '#6b7280') }}>Could not load. Try refreshing.</p>
      )}
    </div>
  );

  if (!asModal) return body;

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto" style={{ backgroundColor: v('card-bg', '#13161e'), border: `1px solid ${v('input-border', 'rgba(255,255,255,0.1)')}`, color: v('text-primary', '#fff') }} data-testid="calendar-sync-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ color: v('text-primary', '#fff') }}>
            <Calendar className="w-4 h-4" style={{ color: v('accent', '#c9a84c') }} /> Calendar Sync
          </DialogTitle>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
}
