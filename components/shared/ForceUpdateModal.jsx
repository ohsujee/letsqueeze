'use client';

import { Capacitor } from '@capacitor/core';

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
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(145deg, #1a1a2e, #16213e)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          padding: '28px 24px',
          maxWidth: '360px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <img
            src="/images/mascot/giggly-worried.webp"
            alt="Giggly"
            style={{ width: '112px', height: '112px', objectFit: 'contain' }}
          />
        </div>
        <h2
          style={{
            fontFamily: "var(--font-title, 'Bungee')",
            fontSize: '1.5rem', fontWeight: 700, color: '#ffffff',
            marginBottom: '12px',
          }}
        >
          Mise à jour requise
        </h2>
        <p
          style={{
            fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)',
            marginBottom: '28px', lineHeight: 1.6,
          }}
        >
          Une version améliorée est disponible.
          Mets à jour pour profiter de la meilleure expérience !
        </p>
        <button
          onClick={handleUpdate}
          className="btn btn-primary"
          style={{ fontSize: '1rem', width: '100%' }}
        >
          Mettre à jour →
        </button>
      </div>
    </div>
  );
}
