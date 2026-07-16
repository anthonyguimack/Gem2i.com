import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { publicAPI } from '../lib/api';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeft, Tag } from 'lucide-react';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export default function MapDetailPage() {
  const { slug } = useParams();
  const [mapData, setMapData] = useState(null);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    Promise.all([publicAPI.getMapDetail(slug), publicAPI.getMapLocations()])
      .then(([m, l]) => { setMapData(m.data); setLocations(l.data); })
      .catch(console.error);
  }, [slug]);

  if (!mapData) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-[#0D9488] border-t-transparent rounded-full"></div></div>;

  return (
    <div data-testid="map-detail-page">
      <div className="relative h-[300px] overflow-hidden">
        <img src={mapData.cover_image} alt={mapData.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#1a2332]/60" />
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }} data-testid="map-detail-title">{mapData.title}</h1>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
        <div className="rich-text-content mb-8" dangerouslySetInnerHTML={{ __html: mapData.description }} data-testid="map-detail-content" />
        {mapData.tags?.length > 0 && (
          <div className="flex gap-2 mb-8">
            {mapData.tags.map(tag => (
              <span key={tag} className="flex items-center gap-1 text-xs bg-[#0D9488]/10 text-[#0D9488] px-3 py-1 rounded-sm font-medium">
                <Tag className="w-3 h-3" /> {tag}
              </span>
            ))}
          </div>
        )}
        <div className="h-[500px] rounded-sm overflow-hidden border border-slate-200" data-testid="map-detail-container">
          <MapContainer center={[30, 0]} zoom={2} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='&copy; OpenStreetMap' />
            {locations.map(loc => (
              <Marker key={loc.id} position={[loc.lat, loc.lng]}>
                <Popup><strong>{loc.name}</strong><br />{loc.description}</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
        <div className="mt-8">
          <Link to="/" className="inline-flex items-center gap-2 text-[#0D9488] font-medium text-sm hover:underline" data-testid="map-back-link">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
