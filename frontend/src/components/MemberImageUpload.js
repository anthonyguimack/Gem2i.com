import React, { useRef, useState } from 'react';
import { memberAPI } from '../lib/api';
import { Upload, Loader2, X, Image } from 'lucide-react';

export default function MemberImageUpload({ value, onChange, className }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await memberAPI.uploadImage(file);
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
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleUpload(e.target.files[0])} />
      <input
        type="text" value={value || ''} onChange={e => onChange(e.target.value)}
        placeholder="Or paste image URL..."
        className="w-full mt-2 px-3 py-1.5 bg-[#0d0f14] border border-white/10 text-white rounded text-xs focus:outline-none focus:border-[#c9a84c]/50"
        data-testid="member-image-url-input"
      />
    </div>
  );
}
