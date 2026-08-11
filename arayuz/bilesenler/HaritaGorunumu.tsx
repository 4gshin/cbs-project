'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Polygon, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const noktaIkonu = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const API_ADRESI = 'http://localhost:5050/api/nesneler';

function TiklamaDinleyici({
  onHaritayaTikla,
}: {
  onHaritayaTikla: (enlem: number, boylam: number) => void;
}) {
  useMapEvents({
    click(olay) {
      onHaritayaTikla(olay.latlng.lat, olay.latlng.lng);
    },
  });
  return null;
}

export default function HaritaGorunumu() {
  const merkezKonum: [number, number] = [39.9334, 32.8597];
  const [nesneler, setNesneler] = useState<any[]>([]);

  useEffect(() => {
    fetch(API_ADRESI)
      .then((yanit) => yanit.json())
      .then((veri) => setNesneler(veri.features || []))
      .catch((hata) => console.error('Nesneler cekilirken hata:', hata));
  }, []);

  // Haritaya tiklandiginda yeni Nokta olustur (Create)
  const haritayaTiklandi = async (enlem: number, boylam: number) => {
    const ad = window.prompt('Bu nokta için bir isim gir:');
    if (!ad) return;

    const yeniNesne = {
      ad,
      tur: 'Nokta',
      geometri: { type: 'Point', coordinates: [boylam, enlem] },
    };

    try {
      const yanit = await fetch(API_ADRESI, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(yeniNesne),
      });
      const olusturulanNesne = await yanit.json();

      setNesneler((oncekiler) => [
        ...oncekiler,
        {
          type: 'Feature',
          id: olusturulanNesne.id,
          geometry: olusturulanNesne.geometri,
          properties: { ad: olusturulanNesne.ad, tur: olusturulanNesne.tur },
        },
      ]);
    } catch (hata) {
      console.error('Nesne olusturulurken hata:', hata);
    }
  };

  // Nesneyi sil (Delete)
  const nesneyiSil = async (id: number) => {
    const eminMisin = window.confirm('Bu nesneyi silmek istediğine emin misin?');
    if (!eminMisin) return;

    try {
      await fetch(`${API_ADRESI}/${id}`, { method: 'DELETE' });
      setNesneler((oncekiler) => oncekiler.filter((n) => n.id !== id));
    } catch (hata) {
      console.error('Nesne silinirken hata:', hata);
    }
  };

  // Nokta surukleyip birakildiginda yeni konumu backend'e kaydet (Update)
  const noktaTasindi = async (id: number, ad: string, yeniEnlem: number, yeniBoylam: number) => {
    const guncelNesne = {
      ad,
      tur: 'Nokta',
      geometri: { type: 'Point', coordinates: [yeniBoylam, yeniEnlem] },
    };

    try {
      const yanit = await fetch(`${API_ADRESI}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guncelNesne),
      });
      const guncellenenNesne = await yanit.json();

      setNesneler((oncekiler) =>
        oncekiler.map((n) => (n.id === id ? { ...n, geometry: guncellenenNesne.geometri } : n))
      );
    } catch (hata) {
      console.error('Nesne guncellenirken hata:', hata);
    }
  };

  return (
    <MapContainer center={merkezKonum} zoom={13} style={{ height: '100vh', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkida bulunanlar'
      />

      <TiklamaDinleyici onHaritayaTikla={haritayaTiklandi} />

      {nesneler.map((ozellik) => {
        const { id, geometry, properties } = ozellik;

        if (geometry.type === 'Point') {
          const [boylam, enlem] = geometry.coordinates;
          return (
            <Marker
              key={id}
              position={[enlem, boylam]}
              icon={noktaIkonu}
              draggable={true}
              eventHandlers={{
                dragend: (olay) => {
                  const yeniKonum = olay.target.getLatLng();
                  noktaTasindi(id, properties.ad, yeniKonum.lat, yeniKonum.lng);
                },
              }}
            >
              <Popup>
                <div>
                  <p>{properties.ad || 'Isimsiz Nokta'}</p>
                  <button onClick={() => nesneyiSil(id)}>Sil</button>
                </div>
              </Popup>
            </Marker>
          );
        }

        if (geometry.type === 'LineString') {
          const konumlar = geometry.coordinates.map(([boylam, enlem]: number[]) => [enlem, boylam]);
          return (
            <Polyline key={id} positions={konumlar}>
              <Popup>{properties.ad || 'Isimsiz Cizgi'}</Popup>
            </Polyline>
          );
        }

        if (geometry.type === 'Polygon') {
          const konumlar = geometry.coordinates[0].map(([boylam, enlem]: number[]) => [enlem, boylam]);
          return (
            <Polygon key={id} positions={konumlar}>
              <Popup>{properties.ad || 'Isimsiz Poligon'}</Popup>
            </Polygon>
          );
        }

        return null;
      })}
    </MapContainer>
  );
}