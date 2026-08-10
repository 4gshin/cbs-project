'use client'; // Bu satır önemli: Leaflet tarayıcıda çalışır, sunucuda değil

import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function HaritaGorunumu() {
  // Başlangıç konumu: Bakü
  const merkezKonum = [40.4093, 49.8671];

  return (
    <MapContainer center={merkezKonum} zoom={12} style={{ height: '100vh', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıda bulunanlar'
      />
    </MapContainer>
  );
}