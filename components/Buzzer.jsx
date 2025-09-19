'use client';

import { useEffect, useMemo, useState } from 'react';
import { ref, onValue, update, runTransaction, serverTimestamp } from 'firebase/database';
import { db } from '@/lib/firebase';

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
    
    const isBlocked = blockedUntil > serverNow;
    const blockedSeconds = Math.ceil((blockedUntil - serverNow) / 1000);
    const isLocked = s.lockUid != null && s.lockUid !== '';
    const isMyBuzz = s.lockUid === playerUid;
    
    if (isBlocked) {
      return {
        type: 'penalty',
        label: `${blockedSeconds}s`,
        sublabel: 'PÉNALITÉ',
        disabled: true
      };
    }
    
    if (isMyBuzz) {
      return {
        type: 'success',
        label: '✓',
        sublabel: 'BUZZÉ !',
        disabled: true
      };
    }
    
    if (isLocked) {
      return {
        type: 'blocked',
        label: '⏸',
        sublabel: 'BLOQUÉ',
        disabled: true
      };
    }
    
    if (revealed || true) {
      return {
        type: 'active',
        label: revealed ? 'BUZZ' : '⚡',
        sublabel: revealed ? '!' : 'ANTICIPÉ',
        disabled: false,
        isAnticipated: !revealed
      };
    }
    
    return {
      type: 'inactive',
      label: '🔒',
      sublabel: 'ATTENTE',
      disabled: true
    };
  }, [state, blockedUntil, serverNow, playerUid, revealed]);

  // 3) Fonction de buzz
  const handleBuzz = async () => {
    if (buzzerState.disabled || !roomCode || !playerUid) return;
    
    const code = String(roomCode).toUpperCase();

    try {
      const lockRef = ref(db, `rooms/${code}/state/lockUid`);
      const result = await runTransaction(lockRef, (currentValue) => {
        if (currentValue === null || currentValue === undefined) {
          return playerUid;
        }
        return currentValue;
      });

      if (result.committed && result.snapshot.val() === playerUid) {
        const updates = {};
        const isAnticipatedBuzz = !revealed;
        
        updates[`rooms/${code}/state/buzzBanner`] = `🔔 ${playerName || 'Un joueur'} a buzzé !${isAnticipatedBuzz ? ' (ANTICIPÉ)' : ''}`;
        updates[`rooms/${code}/state/buzz`] = {
          uid: playerUid,
          at: serverTimestamp(),
          anticipated: isAnticipatedBuzz
        };
        
        await update(ref(db), updates);
        
        try {
          navigator?.vibrate?.([100, 50, 200]);
        } catch {}
      }
    } catch (error) {
      console.error('Erreur lors du buzz:', error);
    }
  };

  return (
    <>
      {/* Spacer pour éviter que le contenu soit masqué */}
      <div style={{ height: '100px' }} />

      {/* Buzzer flottant en bas */}
      <button
        onClick={handleBuzz}
        disabled={buzzerState.disabled}
        className={`buzzer-floating buzzer-${buzzerState.type}`}
        aria-label={`${buzzerState.label} ${buzzerState.sublabel}`}
      >
        <div className="buzzer-main">
          {buzzerState.label}
        </div>
        <div className="buzzer-sub">
          {buzzerState.sublabel}
        </div>
      </button>
      
      <style jsx>{`
        .buzzer-floating {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          
          width: 160px;
          height: 160px;
          border: none;
          border-radius: 50%;
          
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          
          font-family: inherit;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          
          box-shadow: 
            0 12px 40px rgba(0, 0, 0, 0.6),
            0 0 0 4px rgba(255, 255, 255, 0.1);
          
          border: 5px solid transparent;
        }
        
        .buzzer-main {
          font-size: 2.5rem;
          font-weight: 900;
          line-height: 1;
          margin-bottom: 0.25rem;
        }
        
        .buzzer-sub {
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          opacity: 0.95;
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
        }
        
        .buzzer-success {
          background: linear-gradient(135deg, #10B981, #059669);
          color: white;
          border-color: #047857;
          box-shadow: 
            0 12px 40px rgba(0, 0, 0, 0.6),
            0 0 50px rgba(16, 185, 129, 0.4);
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
        
        /* Interactions */
        .buzzer-active:hover {
          transform: translateX(-50%) scale(1.05);
          box-shadow: 
            0 16px 50px rgba(0, 0, 0, 0.7),
            0 0 60px rgba(239, 68, 68, 0.6);
        }
        
        .buzzer-active:active {
          transform: translateX(-50%) scale(0.95);
          box-shadow: 
            0 8px 30px rgba(0, 0, 0, 0.5),
            0 0 40px rgba(239, 68, 68, 0.4);
        }
        
        .buzzer-floating:disabled {
          transform: translateX(-50%) !important;
        }
        
        /* Animations */
        @keyframes buzz-pulse {
          0%, 100% {
            box-shadow: 
              0 12px 40px rgba(0, 0, 0, 0.6),
              0 0 50px rgba(239, 68, 68, 0.4);
          }
          50% {
            box-shadow: 
              0 16px 50px rgba(0, 0, 0, 0.7),
              0 0 70px rgba(239, 68, 68, 0.6);
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
          .buzzer-floating {
            width: 140px;
            height: 140px;
            bottom: 15px;
          }
          
          .buzzer-main {
            font-size: 2rem;
          }
          
          .buzzer-sub {
            font-size: 0.7rem;
            letter-spacing: 1px;
          }
        }
        
        /* Safe area pour les téléphones avec encoche */
        @supports (padding: max(0px)) {
          .buzzer-floating {
            bottom: max(20px, env(safe-area-inset-bottom) + 10px);
          }
        }
        
        /* Accessibilité */
        .buzzer-floating:focus-visible {
          outline: 4px solid #06B6D4;
          outline-offset: 6px;
        }
        
        /* Mouvement réduit */
        @media (prefers-reduced-motion: reduce) {
          .buzzer-floating {
            animation: none !important;
            transition: transform 0.2s ease !important;
          }
        }
      `}</style>
    </>
  );
}
