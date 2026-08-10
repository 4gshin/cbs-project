'use client';

import dynamic from 'next/dynamic';

// Harita bileşenini sadece tarayıcıda yükle (SSR kapalı)
const HaritaGorunumu = dynamic(() => import('../bilesenler/HaritaGorunumu'), {
  ssr: false,
});

export default function AnaSayfa() {
  return <HaritaGorunumu />;
}