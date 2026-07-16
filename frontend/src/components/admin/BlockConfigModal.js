import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { BLOCK_TYPES } from '../../lib/layoutDefinitions';
import RichTextEditor from '../RichTextEditor';
import ImageUpload from '../ImageUpload';

export default function BlockConfigModal({ block, open, onClose, onSave }) {
  const [config, setConfig] = useState({ ...block.config });
  const typeDef = BLOCK_TYPES[block.type];

  const renderForm = () => {
    switch (block.type) {
      case 'rich_text':
        return (
          <div>
            <Label className="text-xs text-slate-500">Content</Label>
            <div className="mt-1"><RichTextEditor value={config.content || ''} onChange={v => setConfig({ ...config, content: v })} /></div>
          </div>
        );

      case 'image':
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-slate-500">Image</Label>
              <ImageUpload value={config.src || ''} onChange={v => setConfig({ ...config, src: v })} />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Alt Text</Label>
              <Input value={config.alt || ''} onChange={e => setConfig({ ...config, alt: e.target.value })} className="mt-1" data-testid="block-alt-input" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Caption</Label>
              <Input value={config.caption || ''} onChange={e => setConfig({ ...config, caption: e.target.value })} className="mt-1" data-testid="block-caption-input" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Link URL (optional)</Label>
              <Input value={config.link || ''} onChange={e => setConfig({ ...config, link: e.target.value })} className="mt-1" placeholder="https://..." data-testid="block-link-input" />
            </div>
          </div>
        );

      case 'video':
        return (
          <div>
            <Label className="text-xs text-slate-500">Video URL (YouTube or Vimeo)</Label>
            <Input value={config.url || ''} onChange={e => setConfig({ ...config, url: e.target.value })} className="mt-1" placeholder="https://youtube.com/watch?v=..." data-testid="block-video-url" />
          </div>
        );

      case 'profile_card':
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-slate-500">Name</Label>
              <Input value={config.name || ''} onChange={e => setConfig({ ...config, name: e.target.value })} className="mt-1" data-testid="block-name-input" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Title / Role</Label>
              <Input value={config.title || ''} onChange={e => setConfig({ ...config, title: e.target.value })} className="mt-1" data-testid="block-title-input" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Photo</Label>
              <ImageUpload value={config.image || ''} onChange={v => setConfig({ ...config, image: v })} />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Bio</Label>
              <textarea value={config.bio || ''} onChange={e => setConfig({ ...config, bio: e.target.value })} rows={3} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm mt-1" data-testid="block-bio-input" />
            </div>
          </div>
        );

      case 'button':
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-slate-500">Button Text</Label>
              <Input value={config.text || ''} onChange={e => setConfig({ ...config, text: e.target.value })} className="mt-1" data-testid="block-button-text" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">URL</Label>
              <Input value={config.url || ''} onChange={e => setConfig({ ...config, url: e.target.value })} className="mt-1" placeholder="https://..." data-testid="block-button-url" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Style</Label>
              <div className="flex gap-2 mt-1">
                {['primary', 'outline'].map(s => (
                  <button key={s} onClick={() => setConfig({ ...config, style: s })}
                    className={`px-4 py-2 rounded text-sm font-medium transition-all ${config.style === s ? 'bg-[#0D9488] text-white' : 'bg-slate-100 text-slate-600'}`}
                    data-testid={`block-style-${s}`}>
                    {s === 'primary' ? 'Solid' : 'Outline'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={config.open_in_new_tab || false} onCheckedChange={v => setConfig({ ...config, open_in_new_tab: v })} data-testid="block-newtab-switch" />
              <Label className="text-sm">Open in new tab</Label>
            </div>
          </div>
        );

      case 'separator':
        return (
          <div>
            <Label className="text-xs text-slate-500">Separator Style</Label>
            <div className="flex gap-2 mt-2">
              {[{ v: 'line', l: 'Line' }, { v: 'dots', l: 'Dots' }, { v: 'space', l: 'Space' }].map(s => (
                <button key={s.v} onClick={() => setConfig({ ...config, style: s.v })}
                  className={`px-4 py-2 rounded text-sm font-medium transition-all ${config.style === s.v ? 'bg-[#0D9488] text-white' : 'bg-slate-100 text-slate-600'}`}
                  data-testid={`block-sep-${s.v}`}>
                  {s.l}
                </button>
              ))}
            </div>
          </div>
        );

      case 'custom_html':
        return (
          <div>
            <Label className="text-xs text-slate-500">HTML Code</Label>
            <textarea value={config.html || ''} onChange={e => setConfig({ ...config, html: e.target.value })} rows={8}
              className="w-full px-3 py-2 bg-slate-900 text-green-400 font-mono text-sm rounded mt-1 border border-slate-700" placeholder="<div>...</div>" data-testid="block-html-input" />
          </div>
        );

      default: return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto" data-testid="block-config-dialog">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>
            Configure {typeDef?.label || block.type}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {renderForm()}
          <button onClick={() => onSave(config)} className="w-full bg-[#0D9488] text-white py-2.5 rounded-sm text-sm font-medium hover:bg-[#0D9488]/80 transition-colors" data-testid="block-config-save">
            Apply
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
