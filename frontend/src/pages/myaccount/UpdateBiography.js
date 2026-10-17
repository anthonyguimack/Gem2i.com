import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMember } from '../../lib/memberAuth';
import { memberAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Save, Loader2, FileText } from 'lucide-react';
import RichTextEditor from '../../components/RichTextEditor';

export default function UpdateBiography() {
  const { member, refresh } = useMember();
  const [summary, setSummary] = useState('');
  const [biography, setBiography] = useState('');
  const [baseline, setBaseline] = useState('');
  const [loading, setLoading] = useState(false);
  const ctx = useOutletContext() || {};
  const title = ctx.sectionLabel ? ctx.sectionLabel('update-biography', 'Update Biography') : 'Update Biography';

  useEffect(() => {
    if (member) {
      const s = member.summary || '';
      const b = member.biography || '';
      setSummary(s); setBiography(b);
      setBaseline(JSON.stringify([s, b]));
    }
  }, [member]);

  const dirty = useMemo(() => JSON.stringify([summary, biography]) !== baseline, [summary, biography, baseline]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await memberAPI.updateBiography({ summary, biography });
      setBaseline(JSON.stringify([summary, biography]));
      toast.success('Biography updated');
      refresh();
    } catch { toast.error('Error saving'); }
    finally { setLoading(false); }
  };

  return (
    <div data-testid="update-biography-page">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-[15px] font-semibold" style={{ color: 'var(--ma2-heading, #495057)' }}>{title}</h1>
        <div className="flex items-center gap-3">
          {dirty && <span className="ma2-badge ma2-badge-warning">Unsaved changes</span>}
          <button onClick={handleSave} disabled={loading} className="ma2-btn ma2-btn-primary" data-testid="save-biography-btn">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="ma2-card">
          <div className="ma2-card-head flex items-center gap-2">
            <FileText className="w-4 h-4" style={{ color: 'var(--ma2-muted, #878a99)' }} />
            <h2 className="ma2-card-title">Summary</h2>
          </div>
          <div className="ma2-card-body">
            <p className="text-[12px] mb-2" style={{ color: 'var(--ma2-faint, #adb5bd)' }}>
              One or two lines. This is the short line other members see on your profile card.
            </p>
            <div className="ma2-compose-editor">
              <RichTextEditor value={summary} onChange={setSummary} placeholder="Write your summary…" />
            </div>
          </div>
        </div>

        <div className="ma2-card">
          <div className="ma2-card-head">
            <h2 className="ma2-card-title">Biography</h2>
          </div>
          <div className="ma2-card-body">
            <p className="text-[12px] mb-2" style={{ color: 'var(--ma2-faint, #adb5bd)' }}>
              The full text shown on your member profile.
            </p>
            <div className="ma2-compose-editor">
              <RichTextEditor value={biography} onChange={setBiography} placeholder="Write your biography…" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
