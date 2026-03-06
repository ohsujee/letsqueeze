'use client';

import { useState } from 'react';
import SuspiciousResultModal from '@/components/ui/SuspiciousResultModal';
import InboxNotifModal from '@/components/ui/InboxNotifModal';
import ScoreUpdateModal from '@/components/ui/ScoreUpdateModal';

const MODALS = [
  { id: 'suspicious', label: 'SuspiciousResultModal', desc: 'Apparaît après un 1er essai réussi (bouton pub actif)' },
  { id: 'suspicious-loading', label: 'SuspiciousResultModal — pub en cours', desc: 'État pendant le chargement de la pub' },
  { id: 'inbox-sem', label: 'InboxNotifModal — Sémantique', desc: 'Notification admin après suppression leaderboard' },
  { id: 'inbox-wordle', label: 'InboxNotifModal — Mot Mystère', desc: 'Notification admin après suppression leaderboard' },
  { id: 'score-update', label: 'ScoreUpdateModal', desc: 'Annonce one-time du nouveau système de points Sémantique' },
];

export default function ModalsPreviewPage() {
  const [open, setOpen] = useState(null);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0d1117',
      padding: '40px 24px',
      fontFamily: 'var(--font-body, Inter, sans-serif)',
    }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <h1 style={{
          fontFamily: 'var(--font-title, Bungee, sans-serif)',
          color: '#fff',
          fontSize: '1.4rem',
          marginBottom: 8,
        }}>
          UI Preview — Modales
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: 40 }}>
          Page de dev uniquement. Clique sur un composant pour le prévisualiser.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {MODALS.map((m) => (
            <button
              key={m.id}
              onClick={() => setOpen(m.id)}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 14,
                padding: '16px 20px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
            >
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>
                {m.label}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                {m.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* SuspiciousResultModal — normal */}
      <SuspiciousResultModal
        isOpen={open === 'suspicious'}
        onAccept={() => setOpen(null)}
        onPlayAlternative={() => { alert('→ Lance la pub rewarded'); setOpen(null); }}
        isWatchingAd={false}
      />

      {/* SuspiciousResultModal — pub en cours */}
      <SuspiciousResultModal
        isOpen={open === 'suspicious-loading'}
        onAccept={() => setOpen(null)}
        onPlayAlternative={() => {}}
        isWatchingAd={true}
      />

      {/* InboxNotifModal — Sémantique */}
      <InboxNotifModal
        notification={open === 'inbox-sem' ? { game: 'semantique', date: '2026-03-05' } : null}
        onClose={() => setOpen(null)}
      />

      {/* InboxNotifModal — Mot Mystère */}
      <InboxNotifModal
        notification={open === 'inbox-wordle' ? { game: 'wordle', date: '2026-03-04' } : null}
        onClose={() => setOpen(null)}
      />

      {/* ScoreUpdateModal */}
      <ScoreUpdateModal
        isOpen={open === 'score-update'}
        onClose={() => setOpen(null)}
      />
    </div>
  );
}
