import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { publicAPI } from '../lib/api';
import { useSettings } from '../App';
import { getTileUrl, getTileAttribution } from '../lib/mapConfig';
import { MapPin, ExternalLink } from 'lucide-react';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function LocationList({ locations }) {
  if (!locations.length) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8" data-testid="location-list">
      {locations.map(loc => (
        <div key={loc.id} className="bg-white rounded-lg border border-slate-100 p-4 hover:shadow-sm transition-shadow" data-testid={`location-item-${loc.id}`}>
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-accent, #0D9488)' }} />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--color-heading, #1a2332)' }}>{loc.name}</h3>
              {loc.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{loc.description}</p>}
              {loc.link && (
                <a href={loc.link} target={loc.open_in_new_tab ? '_blank' : '_self'} rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium mt-2 hover:opacity-70" style={{ color: 'var(--color-accent, #0D9488)' }} data-testid={`location-link-${loc.id}`}>
                  Visit <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MapTypePage({ mapType, title, subtitle }) {
  const [locations, setLocations] = useState([]);
  const settings = useSettings();
  const lang = settings.maps_language || 'local';

  useEffect(() => {
    publicAPI.getMapLocations(mapType).then(r => setLocations(r.data || [])).catch(console.error);
  }, [mapType]);

  const center = locations.length > 0 ? [locations[0].lat, locations[0].lng] : [20, 0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-16 pt-24 md:pt-28" data-testid={`map-page-${mapType}`}>
      <div className="text-center mb-10">
        {subtitle && <p className="text-xs uppercase tracking-[0.3em] font-semibold mb-2" style={{ color: 'var(--color-accent, #0D9488)' }}>{subtitle}</p>}
        <h1 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--color-heading, #1a2332)' }}>{title}</h1>
      </div>
      {locations.length > 0 ? (
        <div className="rounded-lg overflow-hidden" style={{ height: '450px' }}>
          <MapContainer center={center} zoom={locations.length > 1 ? 3 : 6} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
            <TileLayer url={getTileUrl(lang)} attribution={getTileAttribution(lang)} />
            <MarkerClusterGroup chunkedLoading>
              {locations.map(loc => (
                <Marker key={loc.id} position={[loc.lat, loc.lng]}>
                  <Popup>
                    <strong>{loc.name}</strong>
                    {loc.description && <><br /><span style={{ fontSize: '12px', color: '#666' }}>{loc.description}</span></>}
                    {loc.link && <><br /><a href={loc.link} target={loc.open_in_new_tab ? '_blank' : '_self'} rel="noreferrer" style={{ fontSize: '12px', color: '#0D9488' }}>Visit &rarr;</a></>}
                  </Popup>
                </Marker>
              ))}
            </MarkerClusterGroup>
          </MapContainer>
        </div>
      ) : (
        <div className="text-center py-12 text-slate-400">No locations found.</div>
      )}
      <LocationList locations={locations} />
    </div>
  );
}

export default function ConferencesPage() {
  return <MapTypePage mapType="conferences" title="Conferences" subtitle="Events & Conferences" />;
}

export function RecommendedSitesPage() {
  return <MapTypePage mapType="recommended_sites" title="Recommended Sites" subtitle="Places We Recommend" />;
}
