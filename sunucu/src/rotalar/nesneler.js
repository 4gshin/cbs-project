// Nesneler (Nokta, Cizgi, Poligon) icin CRUD islemlerini yoneten rota dosyasi
const express = require('express');
const rota = express.Router();
const havuz = require('../veritabani');

// TUM nesneleri getir (GeoJSON FeatureCollection formatinda)
rota.get('/', async (istek, yanit) => {
  try {
    const sonuc = await havuz.query(
      `SELECT id, ad, tur, ST_AsGeoJSON(geometri)::json AS geometri, ozellikler, olusturma_tarihi
       FROM nesneler
       ORDER BY id`
    );

    const ozellikKoleksiyonu = {
      type: 'FeatureCollection',
      features: sonuc.rows.map((satir) => ({
        type: 'Feature',
        id: satir.id,
        geometry: satir.geometri,
        properties: {
          ad: satir.ad,
          tur: satir.tur,
          olusturma_tarihi: satir.olusturma_tarihi,
          ...satir.ozellikler,
        },
      })),
    };

    yanit.json(ozellikKoleksiyonu);
  } catch (hata) {
    console.error(hata);
    yanit.status(500).json({ hata: 'Nesneler getirilirken bir sorun olustu' });
  }
});

// TEK bir nesneyi getir
rota.get('/:id', async (istek, yanit) => {
  try {
    const { id } = istek.params;
    const sonuc = await havuz.query(
      `SELECT id, ad, tur, ST_AsGeoJSON(geometri)::json AS geometri, ozellikler, olusturma_tarihi
       FROM nesneler WHERE id = $1`,
      [id]
    );

    if (sonuc.rows.length === 0) {
      return yanit.status(404).json({ hata: 'Nesne bulunamadi' });
    }

    yanit.json(sonuc.rows[0]);
  } catch (hata) {
    console.error(hata);
    yanit.status(500).json({ hata: 'Nesne getirilirken bir sorun olustu' });
  }
});

// YENI nesne olustur
rota.post('/', async (istek, yanit) => {
  try {
    const { ad, tur, geometri, ozellikler } = istek.body;

    if (!tur || !geometri) {
      return yanit.status(400).json({ hata: 'tur ve geometri alanlari zorunludur' });
    }

    const sonuc = await havuz.query(
      `INSERT INTO nesneler (ad, tur, geometri, ozellikler)
       VALUES ($1, $2, ST_GeomFromGeoJSON($3), $4)
       RETURNING id, ad, tur, ST_AsGeoJSON(geometri)::json AS geometri, ozellikler, olusturma_tarihi`,
      [ad, tur, JSON.stringify(geometri), ozellikler || {}]
    );

    yanit.status(201).json(sonuc.rows[0]);
  } catch (hata) {
    console.error(hata);
    yanit.status(500).json({ hata: 'Nesne olusturulurken bir sorun olustu' });
  }
});

// VAROLAN nesneyi guncelle
rota.put('/:id', async (istek, yanit) => {
  try {
    const { id } = istek.params;
    const { ad, tur, geometri, ozellikler } = istek.body;

    const sonuc = await havuz.query(
      `UPDATE nesneler
       SET ad = $1, tur = $2, geometri = ST_GeomFromGeoJSON($3), ozellikler = $4
       WHERE id = $5
       RETURNING id, ad, tur, ST_AsGeoJSON(geometri)::json AS geometri, ozellikler, olusturma_tarihi`,
      [ad, tur, JSON.stringify(geometri), ozellikler || {}, id]
    );

    if (sonuc.rows.length === 0) {
      return yanit.status(404).json({ hata: 'Nesne bulunamadi' });
    }

    yanit.json(sonuc.rows[0]);
  } catch (hata) {
    console.error(hata);
    yanit.status(500).json({ hata: 'Nesne guncellenirken bir sorun olustu' });
  }
});

// Nesneyi SIL
rota.delete('/:id', async (istek, yanit) => {
  try {
    const { id } = istek.params;
    const sonuc = await havuz.query('DELETE FROM nesneler WHERE id = $1 RETURNING id', [id]);

    if (sonuc.rows.length === 0) {
      return yanit.status(404).json({ hata: 'Nesne bulunamadi' });
    }

    yanit.json({ mesaj: 'Nesne silindi', id: sonuc.rows[0].id });
  } catch (hata) {
    console.error(hata);
    yanit.status(500).json({ hata: 'Nesne silinirken bir sorun olustu' });
  }
});
// Iki nesne arasindaki mekansal iliskiyi kontrol et (BONUS: ST_Intersects, ST_Within, ST_Touches)
rota.get('/iliski/:id1/:id2', async (istek, yanit) => {
  try {
    const { id1, id2 } = istek.params;
    const sonuc = await havuz.query(
      `SELECT
         ST_Intersects(a.geometri, b.geometri) AS kesisiyor,
         ST_Within(a.geometri, b.geometri) AS icinde,
         ST_Touches(a.geometri, b.geometri) AS temas_ediyor
       FROM nesneler a, nesneler b
       WHERE a.id = $1 AND b.id = $2`,
      [id1, id2]
    );

    if (sonuc.rows.length === 0) {
      return yanit.status(404).json({ hata: 'Nesnelerden biri bulunamadi' });
    }

    yanit.json(sonuc.rows[0]);
  } catch (hata) {
    console.error(hata);
    yanit.status(500).json({ hata: 'Iliski kontrol edilirken bir sorun olustu' });
  }
});

module.exports = rota;