'use client';

import { useEffect, useMemo, useState } from 'react';
import { ref, onValue, update, runTransaction, serverTimestamp } from 'firebase/database';
import { db } from '@/lib/firebase';

/**
 * Props:
 * - roomCode: string
 * - playerUid: string
 * - playerName: string
 * - blockedUntil: number (timestamp)
 * - serverNow: number (timestamp)
 * - revealed: boolean (si la question est révélée)
 */
export default function Buzzer({ 
  roomCode, 
  playerUid, 
  playerName, 
  blockedUntil = 0, 
  serverNow = Date.now(),
  revealed = false 
}) {
  const [state, setState] = useState({});

  // 1) Écouter l'état de la room
  useEffect(() => {
    if (!roomCode) return;
    const code = String(roomCode).toUpperCase();
    const unsub = onValue(ref(db, `rooms/${code}/state`), (snap) => {
      setState(snap.val() || {});
    });
    return () => unsub();
  }, [roomCode]);

  // 2) Calculer l'état du buzzer
  const buzzerState = useMemo(() => {
    const s = state || {};
    
    // Vérifier si en pénalité
    const isBlocked = blockedUntil > serverNow;
    const blockedSeconds = Math.ceil((blockedUntil - serverNow) / 1000);
    
    // Vérifier si quelqu'un a déjà buzzé
    const isLocked = s.lockUid != null && s.lockUid !== '';
    const isMyBuzz = s.lockUid === playerUid;
    
    // États possibles du buzzer
    if (isBlocked) {
      return {
        type: 'penalty',
        label: `Pénalité ${blockedSeconds}s`,
        disabled: true,
        className: 'buzzer-penalty'
      };
    }
    
    if (isMyBuzz) {
      return {
        type: 'success',
        label: '✓ Vous avez buzzé !',
        disabled: true,
        className: 'buzzer-success'
      };
    }
    
    if (isLocked) {
      return {
        type: 'blocked',
        label: 'Quelqu\'un a buzzé',
        disabled: true,
        className: 'buzzer-blocked'
      };
    }
    
    // Buzzer peut être utilisé (révélé OU buzz anticipé autorisé)
    if (revealed || true) { // On autorise toujours le buzz anticipé
      return {
        type: 'active',
        label: revealed ? 'BUZZ !' : '⚡ BUZZ ANTICIPÉ',
        disabled: false,
        className: 'buzzer-active',
        isAnticipated: !revealed
      };
    }
    
    // Inactif (ne devrait jamais arriver avec buzz anticipé)
    return {
      type: 'inactive',
      label: 'En attente...',
      disabled: true,
      className: 'buzzer-inactive'
    };
  }, [state, blockedUntil, serverNow, playerUid, revealed]);

  // 3) Fonction de buzz
  const handleBuzz = async () => {
    if (buzzerState.disabled || !roomCode || !playerUid) return;
    
    const code = String(roomCode).toUpperCase();

    try {
      // Transaction atomique pour prendre le lock
      const lockRef = ref(db, `rooms/${code}/state/lockUid`);
      const result = await runTransaction(lockRef, (currentValue) => {
        // Si pas de lock actuel, on prend le lock
        if (currentValue === null || currentValue === undefined) {
          return playerUid;
        }
        // Sinon on garde l'existant
        return currentValue;
      });

      // Si on a réussi à prendre le lock
      if (result.committed && result.snapshot.val() === playerUid) {
        const updates = {};
        
        // Marquer si c'est un buzz anticipé (avant révélation)
        const isAnticipatedBuzz = !revealed;
        
        updates[`rooms/${code}/state/buzzBanner`] = `🔔 ${playerName || 'Un joueur'} a buzzé !${isAnticipatedBuzz ? ' (ANTICIPÉ)' : ''}`;
        updates[`rooms/${code}/state/buzz`] = {
          uid: playerUid,
          at: serverTimestamp(),
          anticipated: isAnticipatedBuzz
        };
        
        await update(ref(db), updates);
        
        // Feedback haptique
        try {
          navigator?.vibrate?.([50, 30, 100]);
        } catch {}
      }
    } catch (error) {
      console.error('Erreur lors du buzz:', error);
    }
  };

  return (
    <>
      {/* Spacer pour éviter que le contenu soit masqué */}
      <div className="h-20" />

      {/* Container du buzzer */}
      <div className="buzzer-container">
        <button
          onClick={handleBuzz}
          disabled={buzzerState.disabled}
          className={`buzzer ${buzzerState.className}`}
          aria-label={buzzerState.label}
        >
          {/* Icône selon l'état */}
          <span className="buzzer-icon">
            {buzzerState.type === 'active' && (buzzerState.isAnticipated ? '⚡' : '🔥')}
            {buzzerState.type === 'success' && '✓'}
            {buzzerState.type === 'blocked' && '⏸'}
            {buzzerState.type === 'penalty' && '⏳'}
            {buzzerState.type === 'inactive' && '🔒'}
          </span>
          
          {/* Label */}
          <span className="buzzer-text">
            {buzzerState.label}
          </span>
        </button>
      </div>
      
      {/* Styles CSS-in-JS pour plus de contrôle */}
      <style jsx>{`
        .buzzer-container {
          position: sticky;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 40;
          padding: 1rem;
          padding-bottom: calc(1rem + env(safe-area-inset-bottom));
          background: rgba(15, 23, 42, 0.98);
          backdrop-filter: blur(12px);
          border-top: 3px solid #06B6D4;
          display: flex;
          justify-content: center;
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
        }
        
        .buzzer {
          width: 90%;
          max-width: 400px;
          height: 60px;
          border: none;
          border-radius: 20px;
          font-weight: 800;
          font-size: 1.1rem;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
          border: 3px solid transparent;
        }
        
        .buzzer-icon {
          font-size: 1.5rem;
          display: flex;
          align-items: center;
        }
        
        .buzzer-text {
          font-weight: 800;
          letter-spacing: 1px;
        }
        
        /* États du buzzer */
        .buzzer-inactive {
          background: linear-gradient(135deg, #64748B, #475569);
          color: #94A3B8;
          cursor: not-allowed;
          border-color: #475569;
        }
        
        .buzzer-active {
          background: linear-gradient(135deg, #EF4444, #DC2626);
          color: white;
          border-color: #B91C1C;
          animation: buzz-pulse 2s infinite ease-in-out;
          box-shadow: 
            0 8px 25px rgba(0, 0, 0, 0.4),
            0 0 30px rgba(239, 68, 68, 0.4);
        }
        
        .buzzer-success {
          background: linear-gradient(135deg, #10B981, #059669);
          color: white;
          border-color: #047857;
          box-shadow: 
            0 8px 25px rgba(0, 0, 0, 0.4),
            0 0 30px rgba(16, 185, 129, 0.5);
        }
        
        .buzzer-blocked {
          background: linear-gradient(135deg, #F59E0B, #D97706);
          color: #92400E;
          border-color: #B45309;
          cursor: not-allowed;
        }
        
        .buzzer-penalty {
          background: linear-gradient(135deg, #F97316, #EA580C);
          color: white;
          border-color: #C2410C;
          cursor: not-allowed;
          animation: penalty-flash 1.5s infinite ease-in-out;
        }
        
        /* Effets hover et active */
        .buzzer-active:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 
            0 12px 30px rgba(0, 0, 0, 0.5),
            0 0 40px rgba(239, 68, 68, 0.6);
        }
        
        .buzzer-active:active {
          transform: translateY(1px) scale(0.98);
          box-shadow: 
            0 4px 15px rgba(0, 0, 0, 0.4),
            0 0 20px rgba(239, 68, 68, 0.4);
        }
        
        .buzzer:disabled {
          transform: none !important;
        }
        
        /* Animations */
        @keyframes buzz-pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 
              0 8px 25px rgba(0, 0, 0, 0.4),
              0 0 30px rgba(239, 68, 68, 0.4);
          }
          50% {
            transform: scale(1.02);
            box-shadow: 
              0 12px 30px rgba(0, 0, 0, 0.5),
              0 0 40px rgba(239, 68, 68, 0.6);
          }
        }
        
        @keyframes penalty-flash {
          0%, 100% { 
            opacity: 1; 
            filter: brightness(1);
          }
          50% { 
            opacity: 0.8; 
            filter: brightness(0.8);
          }
        }
        
        /* Responsive */
        @media (max-width: 640px) {
          .buzzer {
            height: 55px;
            font-size: 1rem;
            letter-spacing: 1px;
          }
          
          .buzzer-icon {
            font-size: 1.25rem;
          }
          
          .buzzer-container {
            padding: 0.75rem;
            padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));
          }
        }
        
        /* Accessibilité */
        .buzzer:focus-visible {
          outline: 3px solid #06B6D4;
          outline-offset: 3px;
        }
        
        /* Préférence de mouvement réduit */
        @media (prefers-reduced-motion: reduce) {
          .buzzer {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </>
  );
}
