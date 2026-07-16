import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Plus, Edit2, Trash2, Loader2, Image, FolderOpen } from 'lucide-react';
import ImageUpload from '../../components/ImageUpload';
import RichTextEditor from '../../components/RichTextEditor';

const API = process.env.REACT_APP_BACKEND_URL;
const resolveSrc = (v) => v ? (v.startsWith('/api') ? `${API}${v}` : v) : null;

export default function GalleryAlbumsManager() {
  const [albums, setAlbums] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photosAlbum, setPhotosAlbum] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [editPhoto, setEditPhoto] = useState(null);
  const [photoOpen, setPhotoOpen] = useState(false);

  const loadAlbums = () => adminAPI.getGalleryAlbums().then(r => setAlbums(r.data)).catch(console.error);
  useEffect(() => { loadAlbums(); }, []);

  const handleSaveAlbum = async () => {
    setLoading(true);
    try {
      if (editing.id) await adminAPI.updateGalleryAlbum(editing.id, editing);
      else await adminAPI.createGalleryAlbum(editing);
      toast.success('Album saved'); setOpen(false); loadAlbums();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
    finally { setLoading(false); }
  };

  const handleDeleteAlbum = async (id) => {
    if (!window.confirm('Delete this album and all its photos?')) return;
    try { await adminAPI.deleteGalleryAlbum(id); toast.success('Deleted'); loadAlbums(); if (photosAlbum?.id === id) setPhotosAlbum(null); }
    catch (e) { toast.error('Cannot delete'); }
  };

  const loadPhotos = (album) => {
    setPhotosAlbum(album);
    adminAPI.getAlbumPhotos(album.id).then(r => setPhotos(r.data)).catch(console.error);
  };

  const handleSavePhoto = async () => {
    setLoading(true);
    try {
      if (editPhoto.id) await adminAPI.updateAlbumPhoto(editPhoto.id, editPhoto);
      else await adminAPI.createAlbumPhoto({ ...editPhoto, album_id: photosAlbum.id });
      toast.success('Photo saved'); setPhotoOpen(false); loadPhotos(photosAlbum);
    } catch (e) { toast.error('Error'); }
    finally { setLoading(false); }
  };

  const handleDeletePhoto = async (id) => {
    if (!window.confirm('Delete this photo?')) return;
    try { await adminAPI.deleteAlbumPhoto(id); toast.success('Deleted'); loadPhotos(photosAlbum); }
    catch (e) { toast.error('Cannot delete'); }
  };

  return (
    <div data-testid="gallery-albums-manager">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1a2332]" style={{ fontFamily: 'Playfair Display, serif' }}>
          {photosAlbum ? `Photos: ${photosAlbum.title}` : 'Gallery Albums'}
        </h1>
        <div className="flex gap-2">
          {photosAlbum && (
            <button onClick={() => setPhotosAlbum(null)} className="px-4 py-2 text-sm rounded-sm border border-slate-200 text-slate-600 hover:bg-slate-50" data-testid="back-to-albums-btn">
              Back to Albums
            </button>
          )}
          <button onClick={() => {
            if (photosAlbum) { setEditPhoto({ image: '', caption: '', order: photos.length }); setPhotoOpen(true); }
            else { setEditing({ title: '', cover_image: '', description: '', order: albums.length }); setOpen(true); }
          }} className="bg-[#0D9488] text-white px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2" data-testid="add-album-btn">
            <Plus className="w-4 h-4" /> {photosAlbum ? 'Add Photo' : 'Add Album'}
          </button>
        </div>
      </div>

      {!photosAlbum ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {albums.map(album => (
            <div key={album.id} className="bg-white rounded-sm border border-slate-100 overflow-hidden" data-testid={`album-item-${album.id}`}>
              <div className="aspect-video bg-slate-100 flex items-center justify-center overflow-hidden cursor-pointer" onClick={() => loadPhotos(album)}>
                {album.cover_image ? (
                  <img src={resolveSrc(album.cover_image)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <FolderOpen className="w-10 h-10 text-slate-300" />
                )}
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className="font-medium text-sm text-[#1a2332] cursor-pointer hover:underline" onClick={() => loadPhotos(album)}>{album.title}</span>
                <div className="flex gap-1">
                  <button onClick={() => { setEditing({...album}); setOpen(true); }} className="p-1 text-slate-400 hover:text-[#0D9488]"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDeleteAlbum(album.id)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map(photo => (
            <div key={photo.id} className="bg-white rounded-sm border border-slate-100 overflow-hidden group relative" data-testid={`photo-item-${photo.id}`}>
              <div className="aspect-square bg-slate-100 flex items-center justify-center overflow-hidden">
                {photo.image ? (
                  <img src={resolveSrc(photo.image)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Image className="w-8 h-8 text-slate-300" />
                )}
              </div>
              <div className="p-2 flex items-center justify-between">
                <span className="text-xs text-slate-500 truncate">{photo.caption || 'No caption'}</span>
                <div className="flex gap-1">
                  <button onClick={() => { setEditPhoto({...photo}); setPhotoOpen(true); }} className="p-1 text-slate-400 hover:text-[#0D9488]"><Edit2 className="w-3 h-3" /></button>
                  <button onClick={() => handleDeletePhoto(photo.id)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Album Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[450px]" data-testid="album-dialog">
          <DialogHeader><DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>{editing?.id ? 'Edit' : 'New'} Album</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div><Label>Title</Label><Input value={editing.title} onChange={e => setEditing({...editing, title: e.target.value})} className="mt-1" data-testid="album-title-input" /></div>
              <div><Label>Description</Label><RichTextEditor value={editing.description || ''} onChange={v => setEditing({...editing, description: v})} /></div>
              <div><Label>Cover Image</Label><ImageUpload value={editing.cover_image || ''} onChange={v => setEditing({...editing, cover_image: v})} /></div>
              <div><Label>Order</Label><Input type="number" value={editing.order || 0} onChange={e => setEditing({...editing, order: parseInt(e.target.value) || 0})} className="mt-1" /></div>
              <button onClick={handleSaveAlbum} disabled={loading} className="w-full bg-[#0D9488] text-white py-2 rounded-sm text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50" data-testid="album-save-btn">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Photo Dialog */}
      <Dialog open={photoOpen} onOpenChange={setPhotoOpen}>
        <DialogContent className="sm:max-w-[450px]" data-testid="photo-dialog">
          <DialogHeader><DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>{editPhoto?.id ? 'Edit' : 'Add'} Photo</DialogTitle></DialogHeader>
          {editPhoto && (
            <div className="space-y-4">
              <div><Label>Image</Label><ImageUpload value={editPhoto.image || ''} onChange={v => setEditPhoto({...editPhoto, image: v})} /></div>
              <div><Label>Caption</Label><RichTextEditor value={editPhoto.caption || ''} onChange={v => setEditPhoto({...editPhoto, caption: v})} /></div>
              <div><Label>Order</Label><Input type="number" value={editPhoto.order || 0} onChange={e => setEditPhoto({...editPhoto, order: parseInt(e.target.value) || 0})} className="mt-1" /></div>
              <button onClick={handleSavePhoto} disabled={loading} className="w-full bg-[#0D9488] text-white py-2 rounded-sm text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50" data-testid="photo-save-btn">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
