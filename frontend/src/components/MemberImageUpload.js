import React, { useRef, useState } from 'react';
import { memberAPI } from '../lib/api';
import { Upload, Loader2, X, Image } from 'lucide-react';
import ImageAdjust from './ImageAdjust';

// SVGs aren't canvas-friendly — they always upload raw (modal skipped).
const isSvg = (file) => file && (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name || ''));

// `adjust`            — opt-in: open the Crop / Auto Stretch / Use Original modal before upload.
// `adjustRatio`       — target aspect ratio for Auto Stretch + preview (default 3:2).
// `adjustDefaultMode` — which tab opens first ('crop' | 'stretch' | 'original').
export default function MemberImageUpload({ value, onChange, className, adjust = false, adjustRatio = 3 / 2, adjustDefaultMode = 'crop' }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [adjustFile, setAdjustFile] = useState(null);

  const doUpload = async (fileOrBlob) => {
    if (!fileOrBlob) return;
    setUploading(true);
    try {
      const res = await memberAPI.uploadImage(fileOrBlob);
      onChange(res.data.url);
    } catch (e) {
      alert(e.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Route through the adjust modal when enabled (and not an SVG), else upload as-is.
  const handleUpload = (file) => {
    if (!file) return;
    if (adjust && !isSvg(file)) { setAdjustFile(file); return; }
    doUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleUpload(file);
  };

  return (
    <div className={className} data-testid="member-image-upload">
      {value ? (
        <div className="relative group">
          <img src={value.startsWith('/api') ? `${process.env.REACT_APP_BACKEND_URL}${value}` : value} alt="Preview" className="w-full h-40 object-cover rounded border border-white/10" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded">
            <button onClick={() => fileRef.current?.click()} className="bg-white text-slate-700 px-3 py-1.5 rounded text-xs font-medium">Replace</button>
            <button onClick={() => onChange('')} className="bg-red-500 text-white px-3 py-1.5 rounded text-xs font-medium">Remove</button>
          </div>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded p-6 text-center cursor-pointer transition-colors ${dragOver ? 'border-[#c9a84c] bg-[#c9a84c]/5' : 'border-white/10 hover:border-white/20'}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 mx-auto animate-spin text-[#c9a84c]" />
          ) : (
            <>
              <Image className="w-6 h-6 mx-auto text-gray-500 mb-2" />
              <p className="text-xs text-gray-400">Click or drag image here</p>
              <p className="text-xs text-gray-500 mt-1">JPEG, PNG, GIF, WebP (max 10MB)</p>
            </>
          )}
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { handleUpload(e.target.files[0]); e.target.value = ''; }} />
      {adjustFile && (
        <ImageAdjust
          file={adjustFile}
          targetRatio={adjustRatio}
          defaultMode={adjustDefaultMode}
          onCancel={() => setAdjustFile(null)}
          onConfirm={(blobOrFile, filename) => {
            setAdjustFile(null);
            const payload = (blobOrFile instanceof File)
              ? blobOrFile
              : new File([blobOrFile], filename, { type: blobOrFile.type });
            doUpload(payload);
          }}
        />
      )}
      <input
        type="text" value={value || ''} onChange={e => onChange(e.target.value)}
        placeholder="Or paste image URL..."
        className="w-full mt-2 px-3 py-1.5 bg-[#0d0f14] border border-white/10 text-white rounded text-xs focus:outline-none focus:border-[#c9a84c]/50"
        data-testid="member-image-url-input"
      />
    </div>
  );
}
