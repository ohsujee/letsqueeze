'use client';

import { Capacitor } from '@capacitor/core';

// ⚠️ Remplace par ton App Store ID numérique
// Visible dans App Store Connect → App Information → Apple ID (ex: 1234567890)
const IOS_APP_STORE_URL = 'https://apps.apple.com/app/id6758512562';
const ANDROID_STORE_URL = 'https://play.google.com/store/apps/details?id=com.gigglz.app';

export function ForceUpdateModal() {
  const handleUpdate = async () => {
    const platform = Capacitor.getPlatform();
    const url = platform === 'ios' ? IOS_APP_STORE_URL : ANDROID_STORE_URL;

    try {
      const { App } = await import('@capacitor/app');
      await App.openUrl({ url });
    } catch {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm px-6">
      <div
        className="rounded-3xl p-8 max-w-sm w-full text-center"
        style={{ backgroundColor: 'var(--card-bg, #1a1a2e)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <img
          src="/images/mascot/giggly-worried.webp"
          alt="Giggly"
          className="w-28 h-28 mx-auto mb-5 object-contain"
        />
        <h2
          className="text-2xl font-bold text-white mb-3"
          style={{ fontFamily: 'var(--font-title, Bungee)' }}
        >
          Mise à jour requise
        </h2>
        <p className="text-sm text-zinc-400 mb-7 leading-relaxed">
          Une nouvelle version de Gigglz est disponible.{' '}
          Mets à jour l&apos;application pour continuer à jouer !
        </p>
        <button
          onClick={handleUpdate}
          className="btn btn-primary w-full"
          style={{ fontSize: '1rem' }}
        >
          Mettre à jour →
        </button>
      </div>
    </div>
  );
}
