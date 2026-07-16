import React, { useState, useRef, useEffect, useCallback } from 'react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Download, Upload, Loader2, Check, AlertTriangle, Database, FileJson, RefreshCw, Shield, Clock, Trash2, RotateCcw, Play, Calendar } from 'lucide-react';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';

const COLLECTIONS = {
  hero_slides: { label: 'Hero Slides', icon: '🖼' },
  about: { label: 'About', icon: '📋' },
  services: { label: 'Services', icon: '💼' },
  blog_posts: { label: 'Blog Posts', icon: '📰' },
  books: { label: 'Reading List', icon: '📚' },
  maps: { label: 'Maps', icon: '🗺' },
  map_locations: { label: 'Map Locations', icon: '📍' },
  gallery: { label: 'Gallery', icon: '🖼' },
  gallery_albums: { label: 'Gallery Albums', icon: '📸' },
  album_photos: { label: 'Album Photos', icon: '📷' },
  portfolio: { label: 'Portfolio', icon: '🎨' },
  testimonials: { label: 'Testimonials', icon: '💬' },
  nav_pages: { label: 'Pages', icon: '📄' },
  pages: { label: 'System Pages', icon: '📃' },
  settings: { label: 'Settings', icon: '⚙' },
  member_types: { label: 'Member Types', icon: '👥' },
};

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function timeAgo(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

export default function BackupManager() {
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importMode, setImportMode] = useState('merge');
  const [selectedExport, setSelectedExport] = useState(new Set(Object.keys(COLLECTIONS)));
  const [importResult, setImportResult] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const fileRef = useRef(null);

  // Scheduled backups state
  const [backupSettings, setBackupSettings] = useState({ enabled: false, frequency: 'daily', max_snapshots: 5 });
  const [snapshots, setSnapshots] = useState([]);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringId, setRestoringId] = useState(null);

  const loadSnapshots = useCallback(() => {
    adminAPI.listBackups().then(r => setSnapshots(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    adminAPI.getBackupSettings().then(r => setBackupSettings(r.data || { enabled: false, frequency: 'daily', max_snapshots: 5 })).catch(() => {});
    loadSnapshots();
  }, [loadSnapshots]);

  // ── Export / Import handlers (same as before) ──
  const toggleExport = (key) => {
    const next = new Set(selectedExport);
    next.has(key) ? next.delete(key) : next.add(key);
    setSelectedExport(next);
  };
  const selectAll = () => setSelectedExport(new Set(Object.keys(COLLECTIONS)));
  const selectNone = () => setSelectedExport(new Set());

  const handleExport = async () => {
    if (selectedExport.size === 0) return toast.error('Select at least one collection');
    setExportLoading(true);
    try {
      const res = await adminAPI.exportContent([...selectedExport].join(','));
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `cms-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click(); URL.revokeObjectURL(url);
      toast.success(`Exported ${selectedExport.size} collections`);
    } catch (e) { toast.error('Export failed: ' + (e.response?.data?.detail || e.message)); }
    finally { setExportLoading(false); }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file); setImportResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        const meta = data._meta || {};
        const collections = Object.keys(data).filter(k => k !== '_meta' && k !== '_mode' && COLLECTIONS[k]);
        const counts = {};
        for (const c of collections) counts[c] = Array.isArray(data[c]) ? data[c].length : (data[c] ? 1 : 0);
        setImportPreview({ meta, collections, counts, raw: data });
      } catch { toast.error('Invalid JSON file'); setImportPreview(null); }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importPreview?.raw) return toast.error('No file loaded');
    setImportLoading(true); setImportResult(null);
    try {
      const res = await adminAPI.importContent({ ...importPreview.raw, _mode: importMode });
      setImportResult(res.data); toast.success('Import completed!');
    } catch (e) { toast.error('Import failed: ' + (e.response?.data?.detail || e.message)); }
    finally { setImportLoading(false); }
  };

  const clearImport = () => { setImportFile(null); setImportPreview(null); setImportResult(null); if (fileRef.current) fileRef.current.value = ''; };

  // ── Scheduled backup handlers ──
  const saveBackupSettings = async (updates) => {
    const newSettings = { ...backupSettings, ...updates };
    setBackupSettings(newSettings);
    setSettingsLoading(true);
    try {
      await adminAPI.updateBackupSettings(newSettings);
      toast.success('Backup schedule saved');
    } catch (e) { toast.error('Failed to save settings'); }
    finally { setSettingsLoading(false); }
  };

  const createBackupNow = async () => {
    setCreatingBackup(true);
    try {
      await adminAPI.createBackupNow('manual');
      toast.success('Backup created!');
      loadSnapshots();
    } catch (e) { toast.error('Failed to create backup'); }
    finally { setCreatingBackup(false); }
  };

  const deleteSnapshot = async (id) => {
    if (!window.confirm('Delete this backup snapshot?')) return;
    try {
      await adminAPI.deleteBackup(id);
      toast.success('Backup deleted');
      loadSnapshots();
    } catch { toast.error('Failed to delete'); }
  };

  const downloadSnapshot = async (id, createdAt) => {
    setSnapshotLoading(true);
    try {
      const res = await adminAPI.getBackup(id);
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `cms-snapshot-${createdAt.slice(0, 10)}.json`;
      a.click(); URL.revokeObjectURL(url);
    } catch (e) { toast.error('Download failed'); }
    finally { setSnapshotLoading(false); }
  };

  const restoreSnapshot = async (id) => {
    if (!window.confirm('Restore this backup? This will REPLACE all current content with the snapshot data.')) return;
    setRestoringId(id);
    try {
      const res = await adminAPI.getBackup(id);
      const payload = { ...res.data, _mode: 'replace' };
      await adminAPI.importContent(payload);
      toast.success('Restore complete! All content replaced.');
      setRestoringId(null);
    } catch (e) { toast.error('Restore failed'); setRestoringId(null); }
  };

  const freqLabel = { daily: 'Every 24 hours', weekly: 'Every 7 days', monthly: 'Every 30 days' };

  return (
    <div data-testid="backup-manager">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2332]" style={{ fontFamily: 'Playfair Display, serif' }}>Backup & Restore</h1>
          <p className="text-sm text-slate-400 mt-1">Export, import, and schedule automatic backups of your CMS content</p>
        </div>
        <Database className="w-8 h-8 text-slate-200" />
      </div>

      {/* ──────── Scheduled Backups Section ──────── */}
      <div className="bg-white border border-slate-200 rounded-sm mb-6 overflow-hidden" data-testid="scheduled-backups-section">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm bg-purple-50 flex items-center justify-center">
              <Clock className="w-4.5 h-4.5 text-purple-500" />
            </div>
            <div>
              <h2 className="font-semibold text-[#1a2332]">Automatic Backups</h2>
              <p className="text-xs text-slate-400">Schedule recurring backups with snapshot history</p>
            </div>
          </div>
          <button onClick={createBackupNow} disabled={creatingBackup}
            className="flex items-center gap-2 px-3 py-2 bg-[#0D9488] text-white rounded-sm text-sm font-medium hover:bg-[#0D9488]/80 transition-colors disabled:opacity-50"
            data-testid="create-backup-now-btn">
            {creatingBackup ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Create Backup Now
          </button>
        </div>

        <div className="px-5 py-4">
          {/* Settings row */}
          <div className="flex flex-wrap items-center gap-6 mb-5 p-4 bg-slate-50 rounded-sm border border-slate-100" data-testid="backup-schedule-settings">
            <div className="flex items-center gap-2.5">
              <Switch checked={backupSettings.enabled}
                onCheckedChange={v => saveBackupSettings({ enabled: v })}
                data-testid="backup-enabled-toggle" />
              <Label className="text-sm font-medium">{backupSettings.enabled ? 'Enabled' : 'Disabled'}</Label>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <Label className="text-xs text-slate-500">Frequency:</Label>
              <select value={backupSettings.frequency}
                onChange={e => saveBackupSettings({ frequency: e.target.value })}
                className="text-sm border border-slate-200 rounded-sm px-2 py-1 bg-white"
                data-testid="backup-frequency-select">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <Label className="text-xs text-slate-500">Keep last:</Label>
              <select value={backupSettings.max_snapshots}
                onChange={e => saveBackupSettings({ max_snapshots: parseInt(e.target.value) })}
                className="text-sm border border-slate-200 rounded-sm px-2 py-1 bg-white"
                data-testid="backup-max-snapshots-select">
                {[3, 5, 10, 15, 20].map(n => <option key={n} value={n}>{n} snapshots</option>)}
              </select>
            </div>

            {backupSettings.enabled && (
              <span className="text-xs text-[#0D9488] bg-[#0D9488]/10 px-2 py-1 rounded-sm font-medium">
                {freqLabel[backupSettings.frequency]}
              </span>
            )}
          </div>

          {/* Snapshots list */}
          {snapshots.length === 0 ? (
            <div className="text-center py-8 text-slate-300 text-sm" data-testid="no-snapshots">
              No backup snapshots yet. Click "Create Backup Now" or enable automatic backups.
            </div>
          ) : (
            <div data-testid="snapshots-list">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Snapshots ({snapshots.length})</span>
                <button onClick={loadSnapshots} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>
              <div className="space-y-2">
                {snapshots.map((s, i) => (
                  <div key={s.id} className={`flex items-center justify-between px-4 py-3 rounded-sm border transition-colors ${i === 0 ? 'border-[#0D9488]/30 bg-[#0D9488]/5' : 'border-slate-100 bg-white hover:bg-slate-50'}`}
                    data-testid={`snapshot-${s.id}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-sm flex items-center justify-center text-xs font-bold ${s.label === 'auto' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                        {s.label === 'auto' ? 'A' : 'M'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[#1a2332]">
                            {s.label === 'auto' ? 'Automatic Backup' : 'Manual Backup'}
                          </span>
                          {i === 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0D9488]/10 text-[#0D9488] font-medium">Latest</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-slate-400">{new Date(s.created_at).toLocaleString()}</span>
                          <span className="text-xs text-slate-300">{timeAgo(s.created_at)}</span>
                          <span className="text-xs text-slate-300">{formatBytes(s.size_bytes)}</span>
                          <span className="text-xs text-slate-300">{s.collections?.length || 0} collections</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => downloadSnapshot(s.id, s.created_at)}
                        className="p-1.5 text-slate-300 hover:text-[#0D9488] transition-colors" title="Download"
                        data-testid={`download-snapshot-${s.id}`}>
                        <Download className="w-4 h-4" />
                      </button>
                      <button onClick={() => restoreSnapshot(s.id)}
                        disabled={restoringId === s.id}
                        className="p-1.5 text-slate-300 hover:text-amber-500 transition-colors" title="Restore"
                        data-testid={`restore-snapshot-${s.id}`}>
                        {restoringId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                      </button>
                      <button onClick={() => deleteSnapshot(s.id)}
                        className="p-1.5 text-slate-300 hover:text-red-500 transition-colors" title="Delete"
                        data-testid={`delete-snapshot-${s.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ──────── Manual Export / Import ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export Panel */}
        <div className="bg-white border border-slate-200 rounded-sm overflow-hidden" data-testid="export-panel">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm bg-[#0D9488]/10 flex items-center justify-center">
              <Download className="w-4.5 h-4.5 text-[#0D9488]" />
            </div>
            <div>
              <h2 className="font-semibold text-[#1a2332]">Export Content</h2>
              <p className="text-xs text-slate-400">Download a JSON backup of your content</p>
            </div>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Select Collections</Label>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-[10px] text-[#0D9488] hover:underline" data-testid="select-all-btn">Select All</button>
                <span className="text-slate-300">|</span>
                <button onClick={selectNone} className="text-[10px] text-slate-400 hover:underline" data-testid="select-none-btn">None</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mb-5" data-testid="export-collection-list">
              {Object.entries(COLLECTIONS).map(([key, col]) => (
                <label key={key}
                  className={`flex items-center gap-2 px-3 py-2 rounded-sm cursor-pointer transition-colors text-sm ${selectedExport.has(key) ? 'bg-[#0D9488]/5 text-[#1a2332]' : 'bg-slate-50 text-slate-400'}`}
                  data-testid={`export-toggle-${key}`}>
                  <input type="checkbox" checked={selectedExport.has(key)} onChange={() => toggleExport(key)}
                    className="rounded border-slate-300 text-[#0D9488] focus:ring-[#0D9488] w-3.5 h-3.5" />
                  <span className="text-xs">{col.icon}</span>
                  <span className="truncate">{col.label}</span>
                </label>
              ))}
            </div>
            <button onClick={handleExport} disabled={exportLoading || selectedExport.size === 0}
              className="w-full bg-[#0D9488] text-white py-2.5 rounded-sm text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-[#0D9488]/80 transition-colors"
              data-testid="export-btn">
              {exportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileJson className="w-4 h-4" />}
              Export {selectedExport.size} Collection{selectedExport.size !== 1 ? 's' : ''} as JSON
            </button>
          </div>
        </div>

        {/* Import Panel */}
        <div className="bg-white border border-slate-200 rounded-sm overflow-hidden" data-testid="import-panel">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm bg-blue-50 flex items-center justify-center">
              <Upload className="w-4.5 h-4.5 text-blue-500" />
            </div>
            <div>
              <h2 className="font-semibold text-[#1a2332]">Restore Content</h2>
              <p className="text-xs text-slate-400">Import content from a JSON backup file</p>
            </div>
          </div>
          <div className="px-5 py-4">
            <div className="mb-4">
              <Label className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2 block">Import Mode</Label>
              <div className="grid grid-cols-2 gap-2" data-testid="import-mode-selector">
                <button onClick={() => setImportMode('merge')}
                  className={`p-3 rounded-sm border-2 text-left transition-all ${importMode === 'merge' ? 'border-[#0D9488] bg-[#0D9488]/5' : 'border-slate-200'}`}
                  data-testid="mode-merge-btn">
                  <div className="flex items-center gap-2 mb-1">
                    <RefreshCw className="w-3.5 h-3.5 text-[#0D9488]" />
                    <span className="text-sm font-medium text-[#1a2332]">Merge</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">Add new items, update existing ones. Safe — no data lost.</p>
                </button>
                <button onClick={() => setImportMode('replace')}
                  className={`p-3 rounded-sm border-2 text-left transition-all ${importMode === 'replace' ? 'border-amber-500 bg-amber-50' : 'border-slate-200'}`}
                  data-testid="mode-replace-btn">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-sm font-medium text-[#1a2332]">Replace</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">Delete existing data first, then import. Use with caution.</p>
                </button>
              </div>
            </div>
            <div className="mb-4">
              <Label className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2 block">Upload Backup File</Label>
              <input ref={fileRef} type="file" accept=".json" onChange={handleFileSelect}
                className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-600 hover:file:bg-slate-200 cursor-pointer border border-slate-200 rounded-sm py-1.5 px-3"
                data-testid="import-file-input" />
            </div>
            {importPreview && (
              <div className="mb-4 bg-slate-50 border border-slate-200 rounded-sm p-3" data-testid="import-preview">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-600">File Preview</span>
                  <button onClick={clearImport} className="text-[10px] text-red-400 hover:text-red-600">Clear</button>
                </div>
                {importPreview.meta?.exported_at && (
                  <p className="text-[10px] text-slate-400 mb-2">Exported: {new Date(importPreview.meta.exported_at).toLocaleString()}</p>
                )}
                <div className="grid grid-cols-2 gap-1">
                  {importPreview.collections.map(col => (
                    <div key={col} className="flex items-center justify-between px-2 py-1 bg-white rounded-sm text-xs">
                      <span className="text-slate-600">{COLLECTIONS[col]?.label || col}</span>
                      <span className="font-mono text-[#0D9488]">{importPreview.counts[col]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={handleImport} disabled={importLoading || !importPreview}
              className="w-full bg-[#1a2332] text-white py-2.5 rounded-sm text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-[#1a2332]/80 transition-colors"
              data-testid="import-btn">
              {importLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              {importMode === 'replace' ? 'Replace & Import' : 'Merge Import'}
            </button>
            {importResult && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-sm p-3" data-testid="import-results">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-700">Import Complete</span>
                </div>
                <div className="space-y-1">
                  {Object.entries(importResult.results || {}).map(([col, r]) => (
                    <div key={col} className={`flex items-center justify-between px-2 py-1 rounded text-xs ${r.status === 'ok' ? 'bg-white text-slate-600' : 'bg-red-50 text-red-600'}`}>
                      <span>{COLLECTIONS[col]?.label || col}</span>
                      {r.status === 'ok' ? <span className="font-mono text-green-600">{r.count} items</span> : <span className="text-red-500">{r.message}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
