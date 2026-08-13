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

// Deploy sonrasi bu adres degisecek: yerelde .env.local'daki, canlida Vercel'deki
// NEXT_PUBLIC_API_URL degiskeninden okunur. Hicbiri yoksa yerel backend'e duser.
const API_TEMEL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050';
const API_ADRESI = `${API_TEMEL}/api/nesneler`;

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

  const [iliskiId1, setIliskiId1] = useState<string>('');
  const [iliskiId2, setIliskiId2] = useState<string>('');
  const [iliskiSonucu, setIliskiSonucu] = useState<any>(null);

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

  const iliskiyiKontrolEt = async () => {
    if (!iliskiId1 || !iliskiId2) {
      window.alert('Lütfen iki nesne seç.');
      return;
    }
    if (iliskiId1 === iliskiId2) {
      window.alert('Farklı iki nesne seçmelisin.');
      return;
    }

    try {
      const yanit = await fetch(`${API_ADRESI}/iliski/${iliskiId1}/${iliskiId2}`);
      const sonuc = await yanit.json();
      setIliskiSonucu(sonuc);
    } catch (hata) {
      console.error('Iliski kontrol edilirken hata:', hata);
    }
  };

  return (
    <>
      {/* Marka rozeti */}
      <div
        className="cbs-panel"
        style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 1000, padding: '8px 12px' }}
      >
        <span className="cbs-marka">
          <span>CBS</span> Projesi — Ankara
        </span>
      </div>

      {/* BONUS: Mekansal iliski kontrol paneli */}
      <div
        className="cbs-panel"
        style={{ position: 'absolute', top: 16, right: 16, zIndex: 1000, width: '250px' }}
      >
        <p className="cbs-baslik">Mekansal İlişki Kontrolü (Bonus)</p>
        <select className="cbs-secim" value={iliskiId1} onChange={(olay) => setIliskiId1(olay.target.value)}>
          <option value="">1. Nesneyi Seç</option>
          {nesneler.map((n) => (
            <option key={n.id} value={n.id}>
              {n.properties.ad} ({n.properties.tur})
            </option>
          ))}
        </select>
        <select className="cbs-secim" value={iliskiId2} onChange={(olay) => setIliskiId2(olay.target.value)}>
          <option value="">2. Nesneyi Seç</option>
          {nesneler.map((n) => (
            <option key={n.id} value={n.id}>
              {n.properties.ad} ({n.properties.tur})
            </option>
          ))}
        </select>
        <button
          onClick={iliskiyiKontrolEt}
          className="cbs-buton cbs-buton-birincil"
          style={{ width: '100%' }}
        >
          İlişkiyi Kontrol Et
        </button>

        {iliskiSonucu && (
          <div style={{ marginTop: '10px', fontSize: '13px' }}>
            <p style={{ margin: '3px 0', fontWeight: 500 }}>
              {iliskiSonucu.kesisiyor ? '✅' : '❌'} Kesişiyor (ST_Intersects)
            </p>
            <p style={{ margin: '3px 0', fontWeight: 500 }}>
              {iliskiSonucu.icinde ? '✅' : '❌'} 1. nesne 2.'nin içinde (ST_Within)
            </p>
            <p style={{ margin: '3px 0', fontWeight: 500 }}>
              {iliskiSonucu.temas_ediyor ? '✅' : '❌'} Temas ediyor (ST_Touches)
            </p>
          </div>
        )}
      </div>

      {/* Cizim kontrol paneli */}
      <div
        className="cbs-panel"
        style={{
          position: 'absolute',
          top: 16,
          left: 60,
          zIndex: 1000,
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        {cizimModu === 'yok' ? (
          <>
            <button onClick={() => cizimModunuBaslat('Cizgi')} className="cbs-buton cbs-buton-birincil">
              Çizgi Çiz
            </button>
            <button onClick={() => cizimModunuBaslat('Poligon')} className="cbs-buton cbs-buton-basari">
              Poligon Çiz
            </button>
          </>
        ) : (
          <>
            <span style={{ fontWeight: 500, fontSize: '13px' }}>
              {cizimModu === 'Cizgi' ? 'Çizgi' : 'Poligon'} çiziliyor ({geciciNoktalar.length} nokta)
            </span>
            <button onClick={cizimiBitir} className="cbs-buton cbs-buton-basari">
              Bitir
            </button>
            <button onClick={cizimiIptalEt} className="cbs-buton cbs-buton-tehlike">
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
          <Polyline positions={geciciNoktalar} pathOptions={{ color: '#4f46e5', dashArray: '6' }} />
        )}
        {cizimModu === 'Poligon' && geciciNoktalar.length > 1 && (
          <Polygon positions={geciciNoktalar} pathOptions={{ color: '#4f46e5', dashArray: '6' }} />
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
                  <div className="cbs-popup">
                    <p>{properties.ad || 'Isimsiz Nokta'}</p>
                    <button onClick={() => nesneyiSil(id)} className="cbs-buton cbs-buton-tehlike">
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
              <Polyline key={id} positions={konumlar} pathOptions={{ color: '#4f46e5', weight: 4 }}>
                <Popup>
                  <div className="cbs-popup">
                    <p>{properties.ad || 'Isimsiz Cizgi'}</p>
                    <button
                      onClick={() => nesneyiYenidenAdlandir(id, 'Cizgi', geometry)}
                      className="cbs-buton cbs-buton-birincil"
                    >
                      Adını Değiştir
                    </button>
                    <button onClick={() => nesneyiSil(id)} className="cbs-buton cbs-buton-tehlike">
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
              <Polygon
                key={id}
                positions={konumlar}
                pathOptions={{ color: '#059669', fillColor: '#059669', fillOpacity: 0.25 }}
              >
                <Popup>
                  <div className="cbs-popup">
                    <p>{properties.ad || 'Isimsiz Poligon'}</p>
                    <button
                      onClick={() => nesneyiYenidenAdlandir(id, 'Poligon', geometry)}
                      className="cbs-buton cbs-buton-birincil"
                    >
                      Adını Değiştir
                    </button>
                    <button onClick={() => nesneyiSil(id)} className="cbs-buton cbs-buton-tehlike">
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
