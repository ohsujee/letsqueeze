'use client';

import { useState, useEffect } from 'react';

const ANNOUNCEMENT_KEY = 'lq_announcement_20260404_seen';
const TARGET_DATE = '2026-04-04';

function getParisDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
}

export function AnnouncementModal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (getParisDate() !== TARGET_DATE) return;
    if (localStorage.getItem(ANNOUNCEMENT_KEY)) return;
    setShow(true);
  }, []);

  if (!show) return null;

  const handleClose = () => {
    localStorage.setItem(ANNOUNCEMENT_KEY, '1');
    setShow(false);
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
            fontSize: '1.3rem', fontWeight: 700, color: '#ffffff',
            marginBottom: '12px',
          }}
        >
          Oups, notre faute !
        </h2>
        <p
          style={{
            fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)',
            marginBottom: '28px', lineHeight: 1.6,
          }}
        >
          Le mot du jour en Sémantique était au pluriel, ce qui bloquait les réponses.
          C'est corrigé ! Si vous étiez tout proche, retentez votre chance 🍀
        </p>
        <button
          onClick={handleClose}
          className="btn btn-primary"
          style={{ fontSize: '1rem', width: '100%' }}
        >
          Compris !
        </button>
      </div>
    </div>
  );
}
