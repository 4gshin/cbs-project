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

// Ortak dugme stili - sistem karanlik/aydinlik moduna bagli olmadan hep okunakli olsun
const dugmeStili = (renk: string) => ({
  background: renk,
  color: 'white',
  border: 'none',
  padding: '6px 12px',
  borderRadius: '4px',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '13px',
});

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

  const [cizimModu, setCizimModu] = useState<'yok' | 'Cizgi' | 'Poligon'>('yok');
  const [geciciNoktalar, setGeciciNoktalar] = useState<[number, number][]>([]);

  useEffect(() => {
    fetch(API_ADRESI)
      .then((yanit) => yanit.json())
      .then((veri) => setNesneler(veri.features || []))
      .catch((hata) => console.error('Nesneler cekilirken hata:', hata));
  }, []);

  const cizimModunuBaslat = (tur: 'Cizgi' | 'Poligon') => {
    setCizimModu(tur);
    setGeciciNoktalar([]);
  };

  const cizimiIptalEt = () => {
    setCizimModu('yok');
    setGeciciNoktalar([]);
  };

  const cizimiBitir = async () => {
    const gerekliMinimum = cizimModu === 'Cizgi' ? 2 : 3;
    if (geciciNoktalar.length < gerekliMinimum) {
      window.alert(`En az ${gerekliMinimum} nokta secmelisin.`);
      return;
    }

    const ad = window.prompt(`Bu ${cizimModu === 'Cizgi' ? 'çizgi' : 'poligon'} için bir isim gir:`);
    if (!ad) {
      cizimiIptalEt();
      return;
    }

    let koordinatlar: number[][] = geciciNoktalar.map(([enlem, boylam]) => [boylam, enlem]);

    let geometri;
    if (cizimModu === 'Cizgi') {
      geometri = { type: 'LineString', coordinates: koordinatlar };
    } else {
      koordinatlar = [...koordinatlar, koordinatlar[0]];
      geometri = { type: 'Polygon', coordinates: [koordinatlar] };
    }

    const suanCizilenTur = cizimModu;
    const yeniNesne = { ad, tur: suanCizilenTur, geometri };

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

    cizimiIptalEt();
  };

  const haritayaTiklandi = (enlem: number, boylam: number) => {
    if (cizimModu !== 'yok') {
      setGeciciNoktalar((oncekiler) => [...oncekiler, [enlem, boylam]]);
      return;
    }
    noktaOlustur(enlem, boylam);
  };

  const noktaOlustur = async (enlem: number, boylam: number) => {
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

  const nesneyiYenidenAdlandir = async (id: number, tur: string, geometri: any) => {
    const yeniAd = window.prompt('Yeni ismi gir:');
    if (!yeniAd) return;

    try {
      const yanit = await fetch(`${API_ADRESI}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ad: yeniAd, tur, geometri }),
      });
      const guncellenenNesne = await yanit.json();

      setNesneler((oncekiler) =>
        oncekiler.map((n) =>
          n.id === id ? { ...n, properties: { ...n.properties, ad: guncellenenNesne.ad } } : n
        )
      );
    } catch (hata) {
      console.error('Nesne guncellenirken hata:', hata);
    }
  };

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 50,
          zIndex: 1000,
          background: 'white',
          padding: '8px',
          borderRadius: '6px',
          boxShadow: '0 1px 5px rgba(0,0,0,0.4)',
          display: 'flex',
          gap: '6px',
          alignItems: 'center',
        }}
      >
        {cizimModu === 'yok' ? (
          <>
            <button onClick={() => cizimModunuBaslat('Cizgi')} style={dugmeStili('#2563eb')}>
              Çizgi Çiz
            </button>
            <button onClick={() => cizimModunuBaslat('Poligon')} style={dugmeStili('#16a34a')}>
              Poligon Çiz
            </button>
          </>
        ) : (
          <>
            <span style={{ color: '#111827', fontWeight: 500, fontSize: '13px' }}>
              {cizimModu === 'Cizgi' ? 'Çizgi' : 'Poligon'} çiziliyor ({geciciNoktalar.length} nokta)
            </span>
            <button onClick={cizimiBitir} style={dugmeStili('#16a34a')}>
              Bitir
            </button>
            <button onClick={cizimiIptalEt} style={dugmeStili('#dc2626')}>
              İptal
            </button>
          </>
        )}
      </div>

      <MapContainer center={merkezKonum} zoom={13} style={{ height: '100vh', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkida bulunanlar'
        />

        <TiklamaDinleyici onHaritayaTikla={haritayaTiklandi} />

        {cizimModu === 'Cizgi' && geciciNoktalar.length > 1 && (
          <Polyline positions={geciciNoktalar} pathOptions={{ color: 'red', dashArray: '6' }} />
        )}
        {cizimModu === 'Poligon' && geciciNoktalar.length > 1 && (
          <Polygon positions={geciciNoktalar} pathOptions={{ color: 'red', dashArray: '6' }} />
        )}

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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <p style={{ margin: 0, color: '#111827' }}>{properties.ad || 'Isimsiz Nokta'}</p>
                    <button onClick={() => nesneyiSil(id)} style={dugmeStili('#dc2626')}>
                      Sil
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          }

          if (geometry.type === 'LineString') {
            const konumlar = geometry.coordinates.map(([boylam, enlem]: number[]) => [enlem, boylam]);
            return (
              <Polyline key={id} positions={konumlar}>
                <Popup>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <p style={{ margin: 0, color: '#111827' }}>{properties.ad || 'Isimsiz Cizgi'}</p>
                    <button
                      onClick={() => nesneyiYenidenAdlandir(id, 'Cizgi', geometry)}
                      style={dugmeStili('#2563eb')}
                    >
                      Adını Değiştir
                    </button>
                    <button onClick={() => nesneyiSil(id)} style={dugmeStili('#dc2626')}>
                      Sil
                    </button>
                  </div>
                </Popup>
              </Polyline>
            );
          }

          if (geometry.type === 'Polygon') {
            const konumlar = geometry.coordinates[0].map(([boylam, enlem]: number[]) => [enlem, boylam]);
            return (
              <Polygon key={id} positions={konumlar}>
                <Popup>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <p style={{ margin: 0, color: '#111827' }}>{properties.ad || 'Isimsiz Poligon'}</p>
                    <button
                      onClick={() => nesneyiYenidenAdlandir(id, 'Poligon', geometry)}
                      style={dugmeStili('#2563eb')}
                    >
                      Adını Değiştir
                    </button>
                    <button onClick={() => nesneyiSil(id)} style={dugmeStili('#dc2626')}>
                      Sil
                    </button>
                  </div>
                </Popup>
              </Polygon>
            );
          }

          return null;
        })}
      </MapContainer>
    </>
  );
}
