import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { memberAPI } from '../../lib/api';
import { useMember } from '../../lib/memberAuth';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Save, Loader2, Clock, Activity } from 'lucide-react';

const EBANK_FIELDS = [
  { key: 'investment_amount', label: 'Investment Amount', type: 'number' },
  { key: 'additional_capital', label: 'Additional Capital for future investments', type: 'number' },
  { key: 'investment_goal', label: 'Investment Goal', type: 'text' },
  { key: 'monthly_savings', label: 'Current monthly amount estimated for savings & investments', type: 'number' },
  { key: 'deposit_date', label: 'Deposit Date', type: 'date' },
  { key: 'target_date', label: 'Target Date for Investment Goal', type: 'date' },
  { key: 'credit_limit', label: 'Credit Limit', type: 'number' },
  { key: 'credit_debt', label: 'Credit Debt', type: 'number' },
  { key: 'risk_level', label: 'From 1-5 (5 being the most), how risky do I consider myself to be?', type: 'range' },
  { key: 'finance_involvement', label: 'From 1-5, how involved am I in my personal finances?', type: 'range' },
  { key: 'investment_safety', label: 'From 1-5, how safe do I believe are my current investments?', type: 'range' },
  { key: 'financial_independence_age', label: 'At what age am I expecting to be financially independent?', type: 'number' },
  { key: 'rate_of_return', label: 'What is a reasonable rate of return for my investments?', type: 'text' },
  { key: 'investment_duration', label: 'If I invest with the firm, how long do I plan to have money invested?', type: 'text' },
  { key: 'own_business', label: 'If the opportunity arises, would I start/work on my own business?', type: 'text' },
  { key: 'projects', label: 'Projects', type: 'textarea' },
];

const FIELD_LABELS = {};
EBANK_FIELDS.forEach(f => { FIELD_LABELS[f.key] = f.label; });

export default function MyEbank() {
  const { member } = useMember();
  const [form, setForm] = useState({});
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('form');
  const ctx = useOutletContext() || {};
  const title = ctx.sectionLabel ? ctx.sectionLabel('ebank', 'My Ebank') : 'My Ebank';

  useEffect(() => {
    if (!member) return;
    setLoading(true);
    memberAPI.getEbank().then(r => { setForm(r.data || {}); setLoading(false); }).catch(() => setLoading(false));
    memberAPI.getEbankActivities().then(r => setActivities(r.data || [])).catch(() => {});
  }, [member]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await memberAPI.updateEbank(form);
      setForm(r.data || form);
      toast.success('Saved!');
      memberAPI.getEbankActivities().then(r => setActivities(r.data || [])).catch(() => {});
    } catch (e) { toast.error('Error saving'); }
    finally { setSaving(false); }
  };

  const setField = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
  const tabCls = (t) => `flex-1 px-4 py-2 text-sm font-medium rounded transition-colors ${activeTab === t ? '' : 'hover:text-white'}`;
  const tabStyle = (t) => activeTab === t ? { backgroundColor: 'var(--ma-button-bg, #c9a84c)', color: 'var(--ma-button-text, #0d0f14)' } : { color: '#8a8d93' };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--ma-accent, #c9a84c)' }} /></div>;

  return (
    <div className="space-y-6" data-testid="my-ebank-page">
      <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }} data-testid="my-ebank-title">{title}</h1>

      <div className="flex gap-2 bg-[#1a1d24] rounded p-1">
        <button onClick={() => setActiveTab('form')} className={tabCls('form')} style={tabStyle('form')} data-testid="ebank-form-tab">
          <Save className="w-3.5 h-3.5 inline mr-1.5" />My Finances
        </button>
        <button onClick={() => setActiveTab('activities')} className={tabCls('activities')} style={tabStyle('activities')} data-testid="ebank-activities-tab">
          <Activity className="w-3.5 h-3.5 inline mr-1.5" />Activities
        </button>
      </div>

      {activeTab === 'form' && (
        <div className="space-y-4">
          {EBANK_FIELDS.map(field => (
            <div key={field.key} className="bg-[#1a1d24] rounded-lg p-4 border border-[#2a2d35]">
              <Label className="text-xs text-[#8a8d93] block mb-1.5">{field.label}</Label>
              {field.type === 'textarea' ? (
                <textarea value={form[field.key] || ''} onChange={e => setField(field.key, e.target.value)} rows={3}
                  className="w-full bg-[#0d0f14] border border-[#2a2d35] rounded px-3 py-2 text-white text-sm outline-none" style={{ '--tw-ring-color': 'var(--ma-accent, #c9a84c)' }} data-testid={`ebank-${field.key}`} />
              ) : field.type === 'range' ? (
                <div className="flex items-center gap-3">
                  <input type="range" min="1" max="5" value={form[field.key] || 3} onChange={e => setField(field.key, e.target.value)}
                    className="flex-1" style={{ accentColor: 'var(--ma-accent, #c9a84c)' }} data-testid={`ebank-${field.key}`} />
                  <span className="font-bold text-lg w-6 text-center" style={{ color: 'var(--ma-accent, #c9a84c)' }}>{form[field.key] || 3}</span>
                </div>
              ) : (
                <Input type={field.type} value={form[field.key] || ''} onChange={e => setField(field.key, e.target.value)}
                  className="bg-[#0d0f14] border-[#2a2d35] text-white" data-testid={`ebank-${field.key}`}
                  style={field.type === 'date' ? { colorScheme: 'dark' } : undefined} />
              )}
            </div>
          ))}

          <button onClick={handleSave} disabled={saving} className="w-full py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors" style={{ backgroundColor: 'var(--ma-button-bg, #c9a84c)', color: 'var(--ma-button-text, #0d0f14)' }} data-testid="ebank-save-btn">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
          </button>
        </div>
      )}

      {activeTab === 'activities' && (
        <div className="space-y-2" data-testid="ebank-activities">
          {activities.length === 0 ? (
            <div className="text-center py-12 text-[#8a8d93] text-sm">No activities yet. Start by filling out your financial information.</div>
          ) : activities.map(act => (
            <div key={act.id} className="bg-[#1a1d24] rounded-lg p-3 border border-[#2a2d35] flex items-start gap-3">
              <div className="mt-0.5">
                <Clock className="w-4 h-4" style={{ color: 'var(--ma-accent, #c9a84c)' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-white">
                  <span className={`font-medium ${act.action === 'added' ? 'text-green-400' : ''}`} style={act.action !== 'added' ? { color: 'var(--ma-accent, #c9a84c)' } : {}}>{act.action === 'added' ? 'Added' : 'Updated'}</span>
                  {' '}<span style={{ color: 'var(--ma-accent, #c9a84c)' }}>{FIELD_LABELS[act.field] || act.field}</span>
                </p>
                {act.action === 'updated' && act.old_value && (
                  <p className="text-xs text-[#8a8d93] mt-0.5">"{act.old_value}" → "{act.new_value}"</p>
                )}
                {act.action === 'added' && act.new_value && (
                  <p className="text-xs text-[#8a8d93] mt-0.5">Set to: "{act.new_value}"</p>
                )}
                <p className="text-xs text-[#555] mt-1">{new Date(act.timestamp).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
