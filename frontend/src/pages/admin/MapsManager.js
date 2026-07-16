import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Plus, Edit2, Trash2, Loader2, MapPin } from 'lucide-react';
import ImageUpload from '../../components/ImageUpload';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useDataTable, DataTableToolbar, DataTablePagination, SortableTh } from '../../components/admin/useDataTable';
import { useSettings } from '../../App';
import PersonalityTabs, { PB_PERSONALITY_TABS } from '../../components/admin/PersonalityTabs';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function ClickableMap({ lat, lng, onSelect }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return lat && lng ? <Marker position={[lat, lng]} /> : null;
}

const MAP_TYPES = [
  { value: 'global_business', label: 'Global Business Presence' },
  { value: 'conferences', label: 'Conferences' },
  { value: 'recommended_sites', label: 'Recommended Sites' },
];

export default function MapsManager() {
  const settings = useSettings();
  const isPB = settings.active_theme === 'personalbrand';
  const [activeTab, setActiveTab] = useState(null); // null = Global — scopes Locations
  const [savedTabs, setSavedTabs] = useState(new Set(['__global__']));
  const [maps, setMaps] = useState([]);
  const [locations, setLocations] = useState([]);
  const [editMap, setEditMap] = useState(null);
  const [editLoc, setEditLoc] = useState(null);
  const [openMap, setOpenMap] = useState(false);
  const [openLoc, setOpenLoc] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadMaps = () => adminAPI.getMaps().then(r => setMaps(r.data)).catch(console.error);
  // Locations (the homepage map pins) are personality-scoped; Map Pages are global.
  const loadLocs = (personality = activeTab) => adminAPI.getMapLocations(personality).then(r => setLocations(r.data)).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadMaps(); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadLocs(activeTab); }, [activeTab]);

  useEffect(() => {
    if (!isPB) return;
    PB_PERSONALITY_TABS.forEach(t => {
      if (t.key === null) return;
      adminAPI.getMapLocations(t.key).then(r => { if ((r.data || []).length) setSavedTabs(prev => new Set([...prev, t.key])); }).catch(() => {});
    });
  }, [isPB]);

  const saveMap = async () => {
    setLoading(true);
    try {
      if (editMap.id) await adminAPI.updateMap(editMap.id, editMap);
      else await adminAPI.createMap(editMap);
      toast.success('Saved!'); setOpenMap(false); loadMaps();
    } catch { toast.error('Error'); } finally { setLoading(false); }
  };

  const saveLoc = async () => {
    setLoading(true);
    try {
      if (editLoc.id) await adminAPI.updateMapLocation(editLoc.id, editLoc);
      else await adminAPI.createMapLocation(editLoc, activeTab);
      if (activeTab) setSavedTabs(prev => new Set([...prev, activeTab]));
      toast.success('Saved!'); setOpenLoc(false); loadLocs();
    } catch { toast.error('Error'); } finally { setLoading(false); }
  };

  const dtLocs = useDataTable(locations, {
    searchAccessor: l => `${l.name || ''} ${l.description || ''} ${l.map_type || ''} ${l.link || ''}`,
    defaultSort: { key: 'name', dir: 'asc' },
    storageKey: 'map-locations',
  });
  const dtMaps = useDataTable(maps, {
    searchFields: ['title', 'description'],
    defaultSort: { key: 'title', dir: 'asc' },
    storageKey: 'maps',
  });

  return (
    <div data-testid="maps-manager">
      <h1 className="text-2xl font-bold text-[#1a2332] mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>Maps Manager</h1>
      <Tabs defaultValue="locations">
        <TabsList className="mb-4"><TabsTrigger value="locations" data-testid="locations-tab">Locations</TabsTrigger><TabsTrigger value="maps" data-testid="maps-tab">Map Pages</TabsTrigger></TabsList>
        <TabsContent value="locations">
          <PersonalityTabs show={isPB} activeTab={activeTab} onChange={setActiveTab} savedTabs={savedTabs} label="Map locations scope" noun="map pins" />
          <div className="flex justify-end mb-4">
            <button onClick={() => { setEditLoc({ name: '', lat: 0, lng: 0, description: '', map_type: 'global_business', link: '', open_in_new_tab: false }); setOpenLoc(true); }} className="bg-[#0D9488] text-white px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2" data-testid="add-location-btn"><Plus className="w-4 h-4" /> New Location</button>
          </div>
          <DataTableToolbar dt={dtLocs} testId="map-locations" placeholder="Search by name, description, type…" />
          <div className="bg-white rounded-sm border border-slate-100">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-slate-50">
                <SortableTh dt={dtLocs} field="name">Name</SortableTh>
                <SortableTh dt={dtLocs} field="lat">Lat</SortableTh>
                <SortableTh dt={dtLocs} field="lng">Lng</SortableTh>
                <SortableTh dt={dtLocs} field="map_type">Map Type</SortableTh>
                <th className="text-left p-3 font-medium text-slate-600">Link</th>
                <th className="text-right p-3 font-medium text-slate-600">Actions</th>
              </tr></thead>
              <tbody>{dtLocs.visibleItems.map(l => {
                const typeLabel = MAP_TYPES.find(t => t.value === l.map_type)?.label || l.map_type || l.category || '—';
                return (
                  <tr key={l.id} className="border-b border-slate-50" data-testid={`location-row-${l.id}`}>
                    <td className="p-3 font-medium flex items-center gap-2"><MapPin className="w-3 h-3 text-[#0D9488]" />{l.name}</td>
                    <td className="p-3 text-slate-500">{l.lat}</td>
                    <td className="p-3 text-slate-500">{l.lng}</td>
                    <td className="p-3"><span className="text-xs px-2 py-0.5 rounded-sm bg-slate-100 text-slate-600">{typeLabel}</span></td>
                    <td className="p-3 text-blue-500 text-xs truncate max-w-[150px]">{l.link || '—'}</td>
                    <td className="p-3 text-right">
                      <button onClick={() => { setEditLoc({...l, map_type: l.map_type || l.category || 'global_business'}); setOpenLoc(true); }} className="p-1.5 text-slate-400 hover:text-[#0D9488]" data-testid={`edit-location-${l.id}`}><Edit2 className="w-4 h-4" /></button>
                      <button onClick={async () => { if (window.confirm('Delete?')) { await adminAPI.deleteMapLocation(l.id); toast.success('Deleted'); loadLocs(); }}} className="p-1.5 text-slate-400 hover:text-red-500" data-testid={`delete-location-${l.id}`}><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                );
              })}</tbody>
            </table>
            {dtLocs.totalAll === 0 && <div className="p-8 text-center text-slate-400 text-sm">No locations yet</div>}
            {dtLocs.totalAll > 0 && dtLocs.totalFiltered === 0 && <div className="p-8 text-center text-slate-400 text-sm">No locations match your search</div>}
            <DataTablePagination dt={dtLocs} testId="map-locations" />
          </div>
        </TabsContent>
        <TabsContent value="maps">
          <div className="flex justify-end mb-4">
            <button onClick={() => { setEditMap({ title: '', description: '', cover_image: '', tags: [], published: true }); setOpenMap(true); }} className="bg-[#0D9488] text-white px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2" data-testid="add-map-btn"><Plus className="w-4 h-4" /> New Map</button>
          </div>
          <DataTableToolbar dt={dtMaps} testId="maps" placeholder="Search by title…" />
          <div className="bg-white rounded-sm border border-slate-100">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-slate-50">
                <SortableTh dt={dtMaps} field="title">Title</SortableTh>
                <SortableTh dt={dtMaps} field="published">Status</SortableTh>
                <th className="text-right p-3 font-medium text-slate-600">Actions</th>
              </tr></thead>
              <tbody>{dtMaps.visibleItems.map(m => (
                <tr key={m.id} className="border-b border-slate-50">
                  <td className="p-3 font-medium">{m.title}</td>
                  <td className="p-3">{m.published ? <span className="text-xs text-[#0D9488]">Published</span> : <span className="text-xs text-slate-400">Draft</span>}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => { setEditMap({...m}); setOpenMap(true); }} className="p-1.5 text-slate-400 hover:text-[#0D9488]"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={async () => { if (window.confirm('Delete?')) { await adminAPI.deleteMap(m.id); toast.success('Deleted'); loadMaps(); }}} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
            {dtMaps.totalAll === 0 && <div className="p-8 text-center text-slate-400 text-sm">No maps yet</div>}
            {dtMaps.totalAll > 0 && dtMaps.totalFiltered === 0 && <div className="p-8 text-center text-slate-400 text-sm">No maps match your search</div>}
            <DataTablePagination dt={dtMaps} testId="maps" />
          </div>
        </TabsContent>
      </Tabs>

      {/* Map Page Dialog */}
      <Dialog open={openMap} onOpenChange={setOpenMap}>
        <DialogContent className="sm:max-w-[500px]"><DialogHeader><DialogTitle>{editMap?.id ? 'Edit' : 'New'} Map Page</DialogTitle></DialogHeader>
          {editMap && <div className="space-y-4">
            <div><Label>Title</Label><Input value={editMap.title} onChange={e => setEditMap({...editMap, title: e.target.value})} className="mt-1" data-testid="map-title-input" /></div>
            <div><Label>Description</Label><textarea value={editMap.description} onChange={e => setEditMap({...editMap, description: e.target.value})} rows={3} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm mt-1" /></div>
            <div><Label>Cover Image</Label><ImageUpload value={editMap.cover_image} onChange={v => setEditMap({...editMap, cover_image: v})} className="mt-1" /></div>
            <button onClick={saveMap} disabled={loading} className="w-full bg-[#0D9488] text-white py-2 rounded-sm text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2" data-testid="save-map-btn">{loading && <Loader2 className="w-4 h-4 animate-spin" />} Save</button>
          </div>}
        </DialogContent>
      </Dialog>

      {/* Location Dialog */}
      <Dialog open={openLoc} onOpenChange={setOpenLoc}>
        <DialogContent className="sm:max-w-[500px]"><DialogHeader><DialogTitle>{editLoc?.id ? 'Edit' : 'New'} Location</DialogTitle></DialogHeader>
          {editLoc && <div className="space-y-4">
            <div><Label>Name</Label><Input value={editLoc.name} onChange={e => setEditLoc({...editLoc, name: e.target.value})} className="mt-1" data-testid="location-name-input" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Latitude</Label><Input type="number" step="any" value={editLoc.lat} onChange={e => setEditLoc({...editLoc, lat: parseFloat(e.target.value) || 0})} className="mt-1" data-testid="location-lat-input" /></div>
              <div><Label>Longitude</Label><Input type="number" step="any" value={editLoc.lng} onChange={e => setEditLoc({...editLoc, lng: parseFloat(e.target.value) || 0})} className="mt-1" data-testid="location-lng-input" /></div>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Click the map to set coordinates</Label>
              <div className="rounded-sm overflow-hidden border border-slate-200 mt-1" style={{ height: '200px' }} data-testid="location-map-picker">
                <MapContainer center={[editLoc.lat || 20, editLoc.lng || 0]} zoom={editLoc.lat ? 8 : 2} style={{ height: '100%', width: '100%' }} key={`${editLoc.id || 'new'}`}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                  <ClickableMap lat={editLoc.lat} lng={editLoc.lng} onSelect={(lat, lng) => setEditLoc(prev => ({...prev, lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6))}))} />
                </MapContainer>
              </div>
            </div>
            <div><Label>Description</Label><textarea value={editLoc.description} onChange={e => setEditLoc({...editLoc, description: e.target.value})} rows={2} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm mt-1" data-testid="location-desc-input" /></div>
            <div><Label>Map Type</Label>
              <select value={editLoc.map_type || ''} onChange={e => setEditLoc({...editLoc, map_type: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm mt-1" data-testid="location-maptype-select">
                {MAP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div><Label>Link (optional URL)</Label><Input value={editLoc.link || ''} onChange={e => setEditLoc({...editLoc, link: e.target.value})} className="mt-1" placeholder="https://..." data-testid="location-link-input" /></div>
            {editLoc.link && (
              <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-sm border border-slate-100">
                <Switch checked={editLoc.open_in_new_tab || false} onCheckedChange={v => setEditLoc({...editLoc, open_in_new_tab: v})} data-testid="location-newtab-toggle" />
                <Label className="text-sm">Open link in new tab</Label>
              </div>
            )}
            <button onClick={saveLoc} disabled={loading} className="w-full bg-[#0D9488] text-white py-2 rounded-sm text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2" data-testid="save-location-btn">{loading && <Loader2 className="w-4 h-4 animate-spin" />} Save</button>
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
