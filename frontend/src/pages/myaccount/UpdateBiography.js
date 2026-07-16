import React, { useState, useEffect } from 'react';
import { useMember } from '../../lib/memberAuth';
import { memberAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Save, X, Loader2 } from 'lucide-react';
import RichTextEditor from '../../components/RichTextEditor';

export default function UpdateBiography() {
  const { member, refresh } = useMember();
  const [summary, setSummary] = useState('');
  const [biography, setBiography] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (member) {
      setSummary(member.summary || '');
      setBiography(member.biography || '');
    }
  }, [member]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await memberAPI.updateBiography({ summary, biography });
      toast.success('Biography updated!');
      refresh();
    } catch { toast.error('Error saving'); }
    finally { setLoading(false); }
  };

  return (
    <div data-testid="update-biography-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'DM Serif Display', serif" }}>Update Biography</h1>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={loading}
            className="px-4 py-2 bg-[#c9a84c] text-[#0d0f14] rounded text-sm font-semibold flex items-center gap-2 disabled:opacity-50 hover:bg-[#d4b85d]"
            data-testid="save-biography-btn">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-[#13161e] border border-white/5 rounded-lg p-5">
          <label className="text-sm font-semibold text-gray-400 block mb-2">Summary</label>
          <div className="[&_.ql-toolbar]:!bg-[#0d0f14] [&_.ql-toolbar]:!border-white/10 [&_.ql-container]:!border-white/10 [&_.ql-container]:!bg-[#0d0f14] [&_.ql-editor]:!text-white [&_.ql-editor]:!min-h-[120px] [&_.ql-snow_.ql-stroke]:!stroke-gray-400 [&_.ql-snow_.ql-fill]:!fill-gray-400 [&_.ql-snow_.ql-picker-label]:!text-gray-400 [&_.ql-snow_.ql-picker-options]:!bg-[#13161e]">
            <RichTextEditor value={summary} onChange={setSummary} placeholder="Write your summary..." />
          </div>
        </div>

        <div className="bg-[#13161e] border border-white/5 rounded-lg p-5">
          <label className="text-sm font-semibold text-gray-400 block mb-2">Biography</label>
          <div className="[&_.ql-toolbar]:!bg-[#0d0f14] [&_.ql-toolbar]:!border-white/10 [&_.ql-container]:!border-white/10 [&_.ql-container]:!bg-[#0d0f14] [&_.ql-editor]:!text-white [&_.ql-editor]:!min-h-[200px] [&_.ql-snow_.ql-stroke]:!stroke-gray-400 [&_.ql-snow_.ql-fill]:!fill-gray-400 [&_.ql-snow_.ql-picker-label]:!text-gray-400 [&_.ql-snow_.ql-picker-options]:!bg-[#13161e]">
            <RichTextEditor value={biography} onChange={setBiography} placeholder="Write your biography..." />
          </div>
        </div>
      </div>
    </div>
  );
}
