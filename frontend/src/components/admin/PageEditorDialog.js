import React, { useState } from 'react';
import { Loader2, Lock, ExternalLink, Layout, FileText, PanelLeft } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import RichTextEditor from '../RichTextEditor';
import PageBuilder from './PageBuilder';
import { LAYOUTS, LEGACY_LAYOUTS } from '../../lib/layoutDefinitions';
import { LayoutPreview, LAYOUT_ICONS } from './LayoutPreview';

const isBuilderLayout = (layout) => layout && LAYOUTS[layout];
const isLegacyLayout = (layout) => LEGACY_LAYOUTS.includes(layout);

export default function PageEditorDialog({ editing, setEditing, open, setOpen, onSave, loading }) {
  const [editorTab, setEditorTab] = useState('settings');

  const edTabCls = (t) => `px-4 py-2 text-sm font-medium transition-colors ${editorTab === t ? 'text-[#0D9488] border-b-2 border-[#0D9488]' : 'text-slate-400 hover:text-slate-600'}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto" data-testid="page-dialog">
        <DialogHeader><DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>{editing?.id ? 'Edit' : 'New'} Page</DialogTitle></DialogHeader>
        {editing && (
          <div>
            {/* Editor Tabs */}
            <div className="flex border-b border-slate-200 mb-4" data-testid="editor-tabs">
              <button onClick={() => setEditorTab('settings')} className={edTabCls('settings')} data-testid="editor-tab-settings">Settings</button>
              <button onClick={() => setEditorTab('content')} className={edTabCls('content')} data-testid="editor-tab-content">Content & Layout</button>
            </div>

            {/* Settings Tab */}
            {editorTab === 'settings' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-slate-500">Title</Label>
                    <Input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} className="mt-1" data-testid="page-title-input" />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">URL</Label>
                    <Input value={editing.url} onChange={e => setEditing({ ...editing, url: e.target.value })} className="mt-1" placeholder="/terms, https://..." data-testid="page-url-input" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-slate-500">Page Type (optional)</Label>
                    <Input value={editing.page_type || ''} onChange={e => setEditing({ ...editing, page_type: e.target.value })} className="mt-1" placeholder="terms, privacy..." />
                    <p className="text-xs text-slate-400 mt-0.5">Links to a system template.</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Display Order</Label>
                    <Input type="number" value={editing.order || 0} onChange={e => setEditing({ ...editing, order: parseInt(e.target.value) || 0 })} className="mt-1 w-24" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-slate-500">Template scope</Label>
                    <select
                      value={editing.category || 'all'}
                      onChange={e => setEditing({ ...editing, category: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm mt-1 focus:outline-none focus:border-[#0D9488]"
                      data-testid="page-category-select"
                    >
                      <option value="all">All Templates (universal)</option>
                      <option value="business">Personal Brand — Business</option>
                      <option value="lifestyle">Personal Brand — Lifestyle</option>
                      <option value="personal">Personal Brand — Personal</option>
                    </select>
                    <p className="text-xs text-slate-400 mt-0.5">
                      "All Templates" shows this page on every theme. Personal Brand options restrict the page to that mini-site only.
                    </p>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Summary</Label>
                  <textarea value={editing.summary || ''} onChange={e => setEditing({ ...editing, summary: e.target.value })} rows={2} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-sm border border-slate-100">
                    <Switch checked={editing.show_in_header} onCheckedChange={v => setEditing({ ...editing, show_in_header: v })} data-testid="page-header-toggle" />
                    <Label className="text-sm">Show in Header</Label>
                  </div>
                  <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-sm border border-slate-100">
                    <Switch checked={editing.show_in_footer} onCheckedChange={v => setEditing({ ...editing, show_in_footer: v })} data-testid="page-footer-toggle" />
                    <Label className="text-sm">Show in Footer</Label>
                  </div>
                  <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-sm border border-slate-100">
                    <Switch checked={editing.open_in_new_tab} onCheckedChange={v => setEditing({ ...editing, open_in_new_tab: v })} data-testid="page-newtab-toggle" />
                    <div>
                      <Label className="text-sm">Open in New Tab</Label>
                      <p className="text-xs text-slate-400">Link opens in a new browser tab</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-sm border border-slate-100">
                    <Switch checked={editing.login_required} onCheckedChange={v => setEditing({ ...editing, login_required: v })} data-testid="page-login-toggle" />
                    <div>
                      <Label className="text-sm">Login Required</Label>
                      <p className="text-xs text-slate-400">Restricts access to logged-in users</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Content & Layout Tab */}
            {editorTab === 'content' && (
              <div className="space-y-6">
                {/* Layout Selector */}
                <div>
                  <Label className="text-xs text-slate-500 mb-3 block">Page Layout</Label>
                  <div className="grid grid-cols-5 gap-2" data-testid="layout-selector-builder">
                    {Object.entries(LAYOUTS).map(([key, def]) => (
                      <button key={key} type="button"
                        onClick={() => setEditing({ ...editing, layout: key })}
                        className={`p-2.5 rounded-sm border-2 text-left transition-all ${editing.layout === key ? 'border-[#0D9488] bg-[#0D9488]/5' : 'border-slate-200 hover:border-slate-300'}`}
                        data-testid={`layout-option-${key}`}>
                        <LayoutPreview layoutKey={key} />
                        <span className="text-[11px] font-medium text-[#1a2332] block mt-1.5 leading-tight">{def.label}</span>
                        <span className="text-[9px] text-slate-400 block leading-tight">{def.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Legacy layout migration notice */}
                {isLegacyLayout(editing.layout) && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-700 font-medium">This page uses a legacy layout.</p>
                    <p className="text-xs text-amber-600 mt-1">Select a Visual Builder layout above to upgrade this page. Your content will be preserved.</p>
                  </div>
                )}

                {/* Content Area */}
                {isBuilderLayout(editing.layout) && (
                  <div>
                    <Label className="text-xs text-slate-500 mb-2 block">Content Blocks</Label>
                    <PageBuilder
                      zones={editing.zones || {}}
                      layout={editing.layout}
                      onChange={zones => setEditing({ ...editing, zones })}
                    />
                  </div>
                )}

                {(!editing.layout || isLegacyLayout(editing.layout)) && (
                  <div>
                    <Label className="text-xs text-slate-500">Page Content</Label>
                    <div className="mt-1"><RichTextEditor value={editing.content || ''} onChange={val => setEditing({ ...editing, content: val })} /></div>
                  </div>
                )}
              </div>
            )}

            {/* Save Button */}
            <button onClick={onSave} disabled={loading} className="w-full bg-[#0D9488] text-white py-2.5 rounded-sm text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-[#0D9488]/80 transition-colors mt-6" data-testid="page-save-btn">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save Page
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
