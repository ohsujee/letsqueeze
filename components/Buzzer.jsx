'use client';

import { useEffect, useMemo, useState } from 'react';
import { ref, onValue, update, runTransaction, serverTimestamp } from 'firebase/database';
import { db } from '@/lib/firebase';
import { motion } from 'framer-motion';
import { triggerConfetti } from '@/components/Confetti';

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
    
    // Buzz normal (question révélée)
    if (revealed) {
      return {
        type: 'active',
        label: 'BUZZ',
        sublabel: '!',
        disabled: false,
        isAnticipated: false
      };
    }
    
    // Buzz anticipé (question pas encore révélée)
    return {
      type: 'anticipated',
      label: '⚡',
      sublabel: 'ANTICIPÉ',
      disabled: false,
      isAnticipated: true
    };
  }, [state, blockedUntil, serverNow, playerUid, revealed]);

  // 3) Fonction de buzz avec multi-path atomic update
  const handleBuzz = async () => {
    console.log('🔍 DEBUG handleBuzz:', {
      disabled: buzzerState.disabled,
      roomCode,
      playerUid,
      playerName,
      revealed,
      buzzerType: buzzerState.type
    });

    if (buzzerState.disabled || !roomCode || !playerUid || !playerName) {
      console.log('❌ Buzz bloqué:', { disabled: buzzerState.disabled, roomCode, playerUid, playerName });
      return;
    }

    const code = String(roomCode).toUpperCase();
    const isAnticipatedBuzz = !revealed;

    try {
      console.log('🔄 Tentative de buzz...');

      // Transaction sur lockUid pour garantir l'atomicité
      const lockRef = ref(db, `rooms/${code}/state/lockUid`);

      const result = await runTransaction(lockRef, (currentLock) => {
        console.log('🔍 Transaction lockUid:', { currentLock, playerUid, isAnticipated: isAnticipatedBuzz });

        // Si personne n'a le lock, on le prend
        if (!currentLock) {
          return playerUid;
        }

        // Sinon on garde le lock existant (abort)
        return currentLock;
      });

      console.log('📊 Résultat transaction:', {
        committed: result.committed,
        lockUid: result.snapshot.val()
      });

      // Si on a réussi à prendre le lock
      if (result.committed && result.snapshot.val() === playerUid) {
        console.log(`✅ Lock obtenu, envoi des métadonnées buzz...`);

        // Mettre à jour buzz et buzzBanner en parallèle (multi-path atomic update)
        const updates = {};
        updates[`rooms/${code}/state/buzz`] = {
          uid: playerUid,
          at: serverTimestamp(),
          anticipated: isAnticipatedBuzz
        };
        updates[`rooms/${code}/state/buzzBanner`] = `🔔 ${playerName} a buzzé !${isAnticipatedBuzz ? ' (ANTICIPÉ)' : ''}`;

        await update(ref(db), updates);

        console.log(`🎯 Buzz ${isAnticipatedBuzz ? 'anticipé' : 'normal'} réussi par ${playerName}`);

        // Confetti de célébration
        triggerConfetti('success');

        // Vibration feedback
        try {
          navigator?.vibrate?.([100, 50, 200]);
        } catch (e) {
          console.log('Vibration non supportée');
        }
      } else {
        console.log('⚠️ Quelqu\'un d\'autre a déjà le lock');
      }
    } catch (error) {
      console.error('💥 Erreur lors du buzz:', error);
    }
  };

  return (
    <>
      {/* Spacer pour éviter que le contenu soit masqué */}
      <div style={{ height: '100px' }} />

      {/* Container fixe pour le positionnement */}
      <div className="floating-buzzer-wrapper">
        {/* Buzzer avec animations Framer Motion */}
        <motion.button
          onClick={handleBuzz}
          disabled={buzzerState.disabled}
          className={`floating-buzzer-btn floating-buzzer-${buzzerState.type}`}
          aria-label={`${buzzerState.label} ${buzzerState.sublabel}`}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={!buzzerState.disabled ? { scale: 1.05 } : {}}
          whileTap={!buzzerState.disabled ? { scale: 0.95 } : {}}
          initial={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <motion.div
            className="buzzer-main-label"
            animate={buzzerState.type === 'active' || buzzerState.type === 'anticipated' ? {
              scale: [1, 1.05, 1],
            } : {}}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            {buzzerState.label}
          </motion.div>
          <div className="buzzer-sub-label">
            {buzzerState.sublabel}
          </div>
          {buzzerState.isAnticipated && (
            <motion.div
              className="buzzer-warning-msg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              RISQUE: -100pts
            </motion.div>
          )}
        </motion.button>
      </div>

      <style jsx global>{`
        /* Container fixe pour le positionnement */
        .floating-buzzer-wrapper {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          pointer-events: none;
        }

        /* Bouton animé par Framer Motion */
        .floating-buzzer-btn {
          pointer-events: auto;
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

          box-shadow:
            0 12px 40px rgba(0, 0, 0, 0.6),
            0 0 0 4px rgba(255, 255, 255, 0.1);

          border: 5px solid transparent;
        }

        .buzzer-main-label {
          font-size: 2.5rem;
          font-weight: 900;
          line-height: 1;
          margin-bottom: 0.25rem;
        }

        .buzzer-sub-label {
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          opacity: 0.95;
        }

        .buzzer-warning-msg {
          font-size: 0.6rem;
          font-weight: 700;
          color: #ffffff;
          background: rgba(255, 0, 0, 0.8);
          padding: 2px 6px;
          border-radius: 8px;
          margin-top: 4px;
        }
        
        /* États du buzzer */
        .floating-buzzer-inactive {
          background: linear-gradient(135deg, #64748B, #475569);
          color: #94A3B8;
          cursor: not-allowed;
          border-color: #475569;
        }

        .floating-buzzer-active {
          background: linear-gradient(135deg, #EF4444, #DC2626);
          color: white;
          border-color: #B91C1C;
          animation: buzz-pulse 2s infinite ease-in-out;
          box-shadow:
            0 12px 40px rgba(0, 0, 0, 0.6),
            0 0 50px rgba(239, 68, 68, 0.4);
        }

        .floating-buzzer-anticipated {
          background: linear-gradient(135deg, #F97316, #EA580C);
          color: white;
          border-color: #C2410C;
          animation: anticipated-pulse 1.5s infinite ease-in-out;
          box-shadow:
            0 12px 40px rgba(0, 0, 0, 0.6),
            0 0 50px rgba(249, 115, 22, 0.4);
        }

        .floating-buzzer-success {
          background: linear-gradient(135deg, #10B981, #059669);
          color: white;
          border-color: #047857;
          box-shadow:
            0 12px 40px rgba(0, 0, 0, 0.6),
            0 0 50px rgba(16, 185, 129, 0.4);
        }

        .floating-buzzer-blocked {
          background: linear-gradient(135deg, #F59E0B, #D97706);
          color: #92400E;
          border-color: #B45309;
          cursor: not-allowed;
        }

        .floating-buzzer-penalty {
          background: linear-gradient(135deg, #F97316, #EA580C);
          color: white;
          border-color: #C2410C;
          cursor: not-allowed;
          animation: penalty-flash 1.5s infinite ease-in-out;
        }

        /* Interactions gérées par Framer Motion - pas de transform CSS */
        .floating-buzzer-btn:disabled {
          cursor: not-allowed;
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

        @keyframes anticipated-pulse {
          0%, 100% {
            box-shadow: 
              0 12px 40px rgba(0, 0, 0, 0.6),
              0 0 50px rgba(249, 115, 22, 0.4);
          }
          50% {
            box-shadow: 
              0 16px 50px rgba(0, 0, 0, 0.7),
              0 0 70px rgba(249, 115, 22, 0.6);
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
          .floating-buzzer-wrapper {
            bottom: 15px;
          }

          .floating-buzzer-btn {
            width: 140px;
            height: 140px;
          }

          .buzzer-main-label {
            font-size: 2rem;
          }

          .buzzer-sub-label {
            font-size: 0.7rem;
            letter-spacing: 1px;
          }

          .buzzer-warning-msg {
            font-size: 0.5rem;
          }
        }

        /* Safe area pour les téléphones avec encoche */
        @supports (padding: max(0px)) {
          .floating-buzzer-wrapper {
            bottom: max(20px, env(safe-area-inset-bottom) + 10px);
          }
        }

        /* Accessibilité */
        .floating-buzzer-btn:focus-visible {
          outline: 4px solid #06B6D4;
          outline-offset: 6px;
        }

        /* Mouvement réduit */
        @media (prefers-reduced-motion: reduce) {
          .floating-buzzer-btn {
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
}
