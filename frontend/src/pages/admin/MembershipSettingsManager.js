import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Save, Loader2, Settings, User, Wallet } from 'lucide-react';

const PROFILE_FIELDS = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'gender', label: 'Gender' },
  { key: 'date_of_birth', label: 'Date of Birth' },
  { key: 'address', label: 'Address' },
  { key: 'country', label: 'Country' },
  { key: 'state', label: 'State' },
  { key: 'city', label: 'City' },
  { key: 'zip_code', label: 'ZIP Code' },
  { key: 'passport_id', label: 'Passport ID#' },
  { key: 'google_account', label: 'Google Account' },
  { key: 'avatar', label: 'Avatar' },
  { key: 'summary', label: 'Summary (Bio)' },
  { key: 'biography', label: 'Biography' },
];

const EBANK_FIELDS = [
  { key: 'ebank.investment_amount', label: 'Investment Amount' },
  { key: 'ebank.additional_capital', label: 'Additional Capital' },
  { key: 'ebank.investment_goal', label: 'Investment Goal' },
  { key: 'ebank.monthly_savings', label: 'Monthly Savings' },
  { key: 'ebank.deposit_date', label: 'Deposit Date' },
  { key: 'ebank.target_date', label: 'Target Date' },
  { key: 'ebank.credit_limit', label: 'Credit Limit' },
  { key: 'ebank.credit_debt', label: 'Credit Debt' },
  { key: 'ebank.risk_level', label: 'Risk Level' },
  { key: 'ebank.finance_involvement', label: 'Finance Involvement' },
  { key: 'ebank.investment_safety', label: 'Investment Safety' },
  { key: 'ebank.financial_independence_age', label: 'Financial Independence Age' },
  { key: 'ebank.rate_of_return', label: 'Rate of Return' },
  { key: 'ebank.investment_duration', label: 'Investment Duration' },
  { key: 'ebank.own_business', label: 'Own Business' },
  { key: 'ebank.projects', label: 'Projects' },
];

export default function MembershipSettingsManager() {
  const [mandatoryFields, setMandatoryFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminAPI.getMembershipSettings()
      .then(r => setMandatoryFields(r.data?.mandatory_fields || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = (key) => {
    setMandatoryFields(prev =>
      prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]
    );
  };

  const selectAll = (fields) => {
    const keys = fields.map(f => f.key);
    const allSelected = keys.every(k => mandatoryFields.includes(k));
    if (allSelected) {
      setMandatoryFields(prev => prev.filter(f => !keys.includes(f)));
    } else {
      setMandatoryFields(prev => [...new Set([...prev, ...keys])]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminAPI.updateMembershipSettings({ mandatory_fields: mandatoryFields });
      toast.success('Membership settings saved!');
    } catch { toast.error('Error saving settings'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  const renderGroup = (title, icon, fields) => {
    const allSelected = fields.every(f => mandatoryFields.includes(f.key));
    return (
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
            <span className="text-xs text-slate-400 ml-1">({fields.filter(f => mandatoryFields.includes(f.key)).length}/{fields.length})</span>
          </div>
          <button onClick={() => selectAll(fields)} className="text-xs text-[#0D9488] hover:underline" data-testid={`select-all-${title.toLowerCase().replace(/\s/g, '-')}`}>
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {fields.map(f => (
            <label key={f.key} className="flex items-center gap-2.5 p-2.5 rounded-md hover:bg-slate-50 cursor-pointer transition-colors" data-testid={`field-${f.key}`}>
              <input
                type="checkbox"
                checked={mandatoryFields.includes(f.key)}
                onChange={() => toggle(f.key)}
                className="w-4 h-4 rounded border-slate-300 text-[#0D9488] focus:ring-[#0D9488]"
              />
              <span className="text-sm text-slate-600">{f.label}</span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div data-testid="membership-settings-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#0D9488]" /> Membership Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">Select which fields are mandatory for member profile completion.</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0D9488] text-white rounded-lg text-sm font-medium hover:bg-[#0D9488]/90 disabled:opacity-50 transition-colors"
          data-testid="save-membership-settings-btn">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Settings
        </button>
      </div>

      <div className="space-y-5">
        {renderGroup('Profile Fields', <User className="w-4 h-4 text-[#0D9488]" />, PROFILE_FIELDS)}
        {renderGroup('Ebank Fields', <Wallet className="w-4 h-4 text-[#0D9488]" />, EBANK_FIELDS)}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>How it works:</strong> Only mandatory fields count toward a member's profile completion percentage.
          Members will see which mandatory fields they still need to fill in their "Steps to complete profile" panel.
        </p>
      </div>
    </div>
  );
}
