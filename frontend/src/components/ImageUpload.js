import React, { useRef, useState } from 'react';
import { adminAPI } from '../lib/api';
import { Upload, Loader2, X, Image } from 'lucide-react';

export default function ImageUpload({ value, onChange, className }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await adminAPI.uploadImage(file);
      onChange(res.data.url);
    } catch (e) {
      alert(e.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleUpload(file);
  };

  return (
    <div className={className} data-testid="image-upload">
      {value ? (
        <div className="relative group">
          <img src={value.startsWith('/api') ? `${process.env.REACT_APP_BACKEND_URL}${value}` : value} alt="Preview" className="w-full h-40 object-cover rounded-sm border border-slate-200" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-sm">
            <button onClick={() => fileRef.current?.click()} className="bg-white text-slate-700 px-3 py-1.5 rounded-sm text-xs font-medium">Replace</button>
            <button onClick={() => onChange('')} className="bg-red-500 text-white px-3 py-1.5 rounded-sm text-xs font-medium">Remove</button>
          </div>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-sm p-6 text-center cursor-pointer transition-colors ${dragOver ? 'border-[#0D9488] bg-[#0D9488]/5' : 'border-slate-200 hover:border-slate-300'}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 mx-auto animate-spin text-[#0D9488]" />
          ) : (
            <>
              <Image className="w-6 h-6 mx-auto text-slate-300 mb-2" />
              <p className="text-xs text-slate-400">Click or drag image here</p>
              <p className="text-xs text-slate-300 mt-1">JPEG, PNG, GIF, WebP (max 10MB)</p>
            </>
          )}
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleUpload(e.target.files[0])} />
      {/* URL fallback input */}
      <input
        type="text" value={value || ''} onChange={e => onChange(e.target.value)}
        placeholder="Or paste image URL..."
        className="w-full mt-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-sm text-xs focus:outline-none"
        data-testid="image-url-input"
      />
    </div>
  );
}
