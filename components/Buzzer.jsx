'use client';

import { useEffect, useMemo, useState, useRef, useCallback, useOptimistic } from 'react';
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

  // État optimiste : affiche immédiatement le buzz avant confirmation Firebase
  const [optimisticState, setOptimisticState] = useOptimistic(
    state,
    (currentState, optimisticUpdate) => ({
      ...currentState,
      ...optimisticUpdate
    })
  );

  // Audio refs
  const buzzSoundRef = useRef(null);
  const successSoundRef = useRef(null);
  const errorSoundRef = useRef(null);

  // Initialize audio
  useEffect(() => {
    if (typeof window !== 'undefined') {
      buzzSoundRef.current = new Audio('/sounds/buzz.mp3');
      successSoundRef.current = new Audio('/sounds/correct.wav');
      errorSoundRef.current = new Audio('/sounds/wrong.wav');

      // Preload
      buzzSoundRef.current.preload = 'auto';
      successSoundRef.current.preload = 'auto';
      errorSoundRef.current.preload = 'auto';
    }
  }, []);

  const playSound = useCallback((type) => {
    try {
      const sound = type === 'buzz' ? buzzSoundRef.current
                  : type === 'success' ? successSoundRef.current
                  : errorSoundRef.current;

      if (sound) {
        sound.currentTime = 0;
        sound.volume = 0.5;
        sound.play().catch(() => {
          // Silently fail if autoplay blocked
        });
      }
    } catch (e) {
      console.log('Audio playback failed');
    }
  }, []);

  // 1) Écouter l'état de la room
  useEffect(() => {
    if (!roomCode) return;
    const code = String(roomCode).toUpperCase();
    const unsub = onValue(ref(db, `rooms/${code}/state`), (snap) => {
      setState(snap.val() || {});
    });
    return () => unsub();
  }, [roomCode]);

  // 2) Calculer l'état du buzzer (utilise optimisticState pour réactivité instantanée)
  const buzzerState = useMemo(() => {
    const s = optimisticState || {};

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
        label: '',
        sublabel: '',
        disabled: true
      };
    }

    if (isLocked) {
      return {
        type: 'blocked',
        label: '',
        sublabel: '',
        disabled: true,
        showX: true
      };
    }

    // Buzz normal (question révélée)
    if (revealed) {
      return {
        type: 'active',
        label: 'BUZZ',
        sublabel: '',
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
  }, [optimisticState, blockedUntil, serverNow, playerUid, revealed]);

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

      // 🚀 OPTIMISTIC UPDATE : Affichage instantané du buzz (< 10ms)
      setOptimisticState({
        lockUid: playerUid,
        buzzBanner: `🔔 ${playerName} a buzzé !${isAnticipatedBuzz ? ' (ANTICIPÉ)' : ''}`
      });

      // Audio feedback immédiat (avant même Firebase)
      playSound('buzz');

      // Vibration feedback immédiate
      try {
        navigator?.vibrate?.([100, 50, 200]);
      } catch (e) {
        console.log('Vibration non supportée');
      }

      // Transaction sur lockUid pour garantir l'atomicité (validation serveur)
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

        console.log(`✅ Buzz ${isAnticipatedBuzz ? 'anticipé' : 'normal'} confirmé par Firebase pour ${playerName}`);

        // Confetti de célébration
        triggerConfetti('success');

        // L'état optimiste sera automatiquement synchronisé avec Firebase
        // via le listener onValue (ligne 60)
      } else {
        // ❌ Transaction échouée : quelqu'un d'autre a buzzé avant
        console.log('⚠️ Quelqu\'un d\'autre a déjà le lock - rollback optimiste');

        // L'état optimiste sera automatiquement corrigé par le prochain
        // événement onValue qui va propager le vrai lockUid de Firebase
        playSound('error');
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
        {/* Buzzer SVG cartoon */}
        <motion.button
          onClick={handleBuzz}
          disabled={buzzerState.disabled}
          className={`floating-buzzer-btn`}
          aria-label={`${buzzerState.label} ${buzzerState.sublabel}`}
          animate={{
            scale: 1,
            opacity: 1,
          }}
          whileHover={!buzzerState.disabled ? {
            scale: 1.08,
            y: -8,
            transition: { type: "spring", stiffness: 400, damping: 10 }
          } : {}}
          whileTap={!buzzerState.disabled ? {
            scale: 0.92,
            y: 8,
            transition: { duration: 0.1 }
          } : {}}
          initial={{ scale: 0.8, opacity: 0 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20
          }}
        >
          {/* SVG Buzzer Neumorphic Moderne - GRAND avec espace pour le glow */}
          <svg className="buzzer-svg" viewBox="-40 -40 320 360" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              {/* Gradients neumorphiques selon l'état */}
              <radialGradient id="activeGradient" cx="35%" cy="35%">
                <stop offset="0%" stopColor="#FCA5A5" />
                <stop offset="50%" stopColor="#EF4444" />
                <stop offset="100%" stopColor="#B91C1C" />
              </radialGradient>

              <radialGradient id="anticipatedGradient" cx="35%" cy="35%">
                <stop offset="0%" stopColor="#FDBA74" />
                <stop offset="50%" stopColor="#F97316" />
                <stop offset="100%" stopColor="#C2410C" />
              </radialGradient>

              <radialGradient id="successGradient" cx="35%" cy="35%">
                <stop offset="0%" stopColor="#6EE7B7" />
                <stop offset="50%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#047857" />
              </radialGradient>

              <radialGradient id="blockedGradient" cx="35%" cy="35%">
                <stop offset="0%" stopColor="#CBD5E1" />
                <stop offset="50%" stopColor="#94A3B8" />
                <stop offset="100%" stopColor="#64748B" />
              </radialGradient>

              <radialGradient id="penaltyGradient" cx="35%" cy="35%">
                <stop offset="0%" stopColor="#FDBA74" />
                <stop offset="50%" stopColor="#F97316" />
                <stop offset="100%" stopColor="#C2410C" />
              </radialGradient>

              <radialGradient id="inactiveGradient" cx="35%" cy="35%">
                <stop offset="0%" stopColor="#94A3B8" />
                <stop offset="50%" stopColor="#64748B" />
                <stop offset="100%" stopColor="#475569" />
              </radialGradient>

              {/* Ombre interne réaliste */}
              <radialGradient id="innerShadow" cx="50%" cy="50%">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="70%" stopColor="transparent" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
              </radialGradient>

              {/* Reflet réaliste subtil */}
              <radialGradient id="highlight" cx="30%" cy="30%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
                <stop offset="50%" stopColor="rgba(255,255,255,0.15)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
            </defs>

            {/* Ombre portée au sol - soft et réaliste */}
            <ellipse cx="120" cy="265" rx="90" ry="20" fill="url(#innerShadow)" opacity="0.4"/>

            {/* Cercle extérieur - Border subtle */}
            <circle cx="120" cy="120" r="105"
                    fill="none"
                    stroke="rgba(0,0,0,0.1)"
                    strokeWidth="2"/>

            {/* Bouton principal - Gradient neumorphic */}
            <circle cx="120" cy="120" r="100"
                    className={`buzzer-circle-neomorph buzzer-${buzzerState.type}`}
                    strokeWidth="0"/>

            {/* Ombre interne pour effet enfoncé */}
            <circle cx="120" cy="120" r="100"
                    fill="url(#innerShadow)"
                    opacity="0.15"
                    pointerEvents="none"/>

            {/* Reflet subtil en haut */}
            <ellipse cx="120" cy="85" rx="75" ry="40"
                     fill="url(#highlight)"
                     pointerEvents="none"/>

            {/* Croix blanche pour état blocked */}
            {buzzerState.showX && (
              <g transform="translate(120, 120)">
                {/* Barre diagonale \ */}
                <line x1="-35" y1="-35" x2="35" y2="35"
                      stroke="white"
                      strokeWidth="12"
                      strokeLinecap="round"
                      opacity="0.95"/>
                {/* Barre diagonale / */}
                <line x1="35" y1="-35" x2="-35" y2="35"
                      stroke="white"
                      strokeWidth="12"
                      strokeLinecap="round"
                      opacity="0.95"/>
              </g>
            )}

            {/* Ring pulse animé pour état actif - RÉDUIT */}
            {buzzerState.type === 'active' && (
              <motion.circle
                cx="120" cy="120" r="100"
                fill="none"
                stroke="#EF4444"
                strokeWidth="3"
                opacity="0.5"
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{
                  scale: [1, 1.06],
                  opacity: [0.5, 0],
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: "easeOut"
                }}
              />
            )}
            {buzzerState.type === 'anticipated' && (
              <motion.circle
                cx="120" cy="120" r="100"
                fill="none"
                stroke="#F97316"
                strokeWidth="3"
                opacity="0.5"
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{
                  scale: [1, 1.06],
                  opacity: [0.5, 0],
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: "easeOut"
                }}
              />
            )}
          </svg>

          {/* Texte par-dessus le SVG */}
          <div className="buzzer-content">
            <motion.div className="buzzer-main-label">
              {buzzerState.label}
            </motion.div>
            <div className="buzzer-sub-label">
              {buzzerState.sublabel}
            </div>
            {buzzerState.isAnticipated && (
              <div className="buzzer-warning-msg">
                ⚠️ RISQUE: -100pts
              </div>
            )}
          </div>
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

        /* Bouton buzzer cartoon SVG - GRAND pour être l'élément principal */
        .floating-buzzer-btn {
          pointer-events: auto;
          position: relative;
          width: 340px;
          height: 380px;
          border: none;
          background: transparent;
          padding: 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          /* Extra espace pour le glow - IMPORTANT pour éviter la coupe */
          padding: 40px;
          margin: -40px;
        }

        /* SVG du buzzer */
        .buzzer-svg {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          /* Pas de filter ici pour éviter la coupe */
        }

        /* Contenu texte par-dessus - position absolute pour suivre le parent */
        .buzzer-content {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          width: 100%;
        }

        .buzzer-main-label {
          font-size: 3.5rem;
          font-weight: 900;
          line-height: 1;
          margin-bottom: 0.4rem;
          color: white;
          text-shadow:
            0 3px 6px rgba(0, 0, 0, 0.4),
            0 0 30px rgba(255, 255, 255, 0.4),
            0 0 15px rgba(255, 255, 255, 0.6);
          font-family: var(--font-display);
        }

        .buzzer-sub-label {
          font-size: 0.95rem;
          font-weight: 800;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: white;
          opacity: 0.98;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
          font-family: var(--font-display);
        }

        .buzzer-warning-msg {
          font-size: 0.65rem;
          font-weight: 700;
          color: #ffffff;
          background: rgba(0, 0, 0, 0.5);
          padding: 4px 10px;
          border-radius: 12px;
          margin-top: 6px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        }
        
        /* Cercle neumorphique avec gradients réalistes */
        .buzzer-circle-neomorph {
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .buzzer-inactive {
          fill: url(#inactiveGradient);
          filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.25));
        }

        .buzzer-active {
          fill: url(#activeGradient);
          filter:
            drop-shadow(0 0 15px rgba(239, 68, 68, 0.7))
            drop-shadow(0 0 25px rgba(239, 68, 68, 0.3))
            drop-shadow(0 10px 20px rgba(0, 0, 0, 0.3));
        }

        .buzzer-anticipated {
          fill: url(#anticipatedGradient);
          filter:
            drop-shadow(0 0 15px rgba(249, 115, 22, 0.7))
            drop-shadow(0 0 25px rgba(249, 115, 22, 0.3))
            drop-shadow(0 10px 20px rgba(0, 0, 0, 0.3));
        }

        .buzzer-success {
          fill: url(#successGradient);
          filter:
            drop-shadow(0 0 20px rgba(16, 185, 129, 0.8))
            drop-shadow(0 0 35px rgba(16, 185, 129, 0.4))
            drop-shadow(0 10px 20px rgba(0, 0, 0, 0.3));
          animation: success-celebrate 0.6s ease-out;
        }

        .buzzer-blocked {
          fill: url(#blockedGradient);
          filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.25));
        }

        .buzzer-penalty {
          fill: url(#penaltyGradient);
          filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.25));
          animation: penalty-flash 1.5s infinite ease-in-out;
        }

        /* Interactions gérées par Framer Motion - pas de transform CSS */
        .floating-buzzer-btn:disabled {
          cursor: not-allowed;
        }
        
        /* Animations - Subtiles et professionnelles */
        @keyframes success-celebrate {
          0% {
            transform: scale(1);
          }
          30% {
            transform: scale(1.12);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes penalty-flash {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.65;
          }
        }
        
        /* Responsive - Toujours GRAND même sur mobile */
        @media (max-width: 640px) {
          .floating-buzzer-wrapper {
            bottom: 10px;
          }

          .floating-buzzer-btn {
            width: 300px;
            height: 340px;
            padding: 35px;
            margin: -35px;
          }

          .buzzer-content {
            margin-top: -30px;
          }

          .buzzer-main-label {
            font-size: 2.8rem;
          }

          .buzzer-sub-label {
            font-size: 0.8rem;
            letter-spacing: 1.5px;
          }

          .buzzer-warning-msg {
            font-size: 0.65rem;
          }
        }

        /* Très petits écrans */
        @media (max-width: 380px) {
          .floating-buzzer-btn {
            width: 260px;
            height: 300px;
            padding: 30px;
            margin: -30px;
          }

          .buzzer-main-label {
            font-size: 2.4rem;
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
