'use client';

import { useEffect, useMemo, useState, useOptimistic } from 'react';
import { ref, onValue, runTransaction } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useBuzzerAudio } from '@/lib/hooks/useBuzzerAudio';
import styles from './Buzzer.module.css';

/**
 * Buzzer - Composant principal du buzzer de quiz
 * Style 3D unifié avec changement de couleur selon l'état
 */
export default function Buzzer({
  roomCode,
  roomPrefix = 'rooms', // 'rooms' for quiz, 'rooms_blindtest' for blind test, 'rooms_alibi' for alibi
  playerUid,
  playerName,
  blockedUntil = 0,
  serverNow = Date.now()
}) {
  const [state, setState] = useState({});
  const { playSound } = useBuzzerAudio();

  // État optimiste pour réactivité instantanée
  const [optimisticState, setOptimisticState] = useOptimistic(
    state,
    (currentState, optimisticUpdate) => ({ ...currentState, ...optimisticUpdate })
  );

  // Écouter l'état de la room
  useEffect(() => {
    if (!roomCode) return;
    const code = String(roomCode).toUpperCase();
    const unsub = onValue(ref(db, `${roomPrefix}/${code}/state`), (snap) => {
      setState(snap.val() || {});
    });
    return () => unsub();
  }, [roomCode, roomPrefix]);

  // Calculer l'état du buzzer
  const buzzerState = useMemo(() => {
    const s = optimisticState || {};
    const isBlocked = blockedUntil > serverNow;
    const blockedSeconds = Math.ceil((blockedUntil - serverNow) / 1000);
    const isLocked = s.lockUid != null && s.lockUid !== '';
    const isMyBuzz = s.lockUid === playerUid;

    if (isBlocked) return { type: 'penalty', label: `${blockedSeconds}s`, sublabel: 'PÉNALITÉ', disabled: true };
    if (isMyBuzz) return { type: 'success', label: '', sublabel: '', disabled: true };
    if (isLocked) return { type: 'blocked', label: '', sublabel: '', disabled: true };
    return { type: 'active', label: 'BUZZ', sublabel: '', disabled: false };
  }, [optimisticState, blockedUntil, serverNow, playerUid]);

  // Fonction de buzz
  const handleBuzz = async () => {
    if (buzzerState.disabled || !roomCode || !playerUid || !playerName) return;

    const code = String(roomCode).toUpperCase();
    const buzzTime = Date.now();

    try {
      // Optimistic update
      setOptimisticState({
        lockUid: playerUid,
        buzzBanner: `🔔 ${playerName} a buzzé !`
      });

      playSound('buzz');
      navigator?.vibrate?.([100, 50, 200]);

      // Transaction atomique
      const stateRef = ref(db, `${roomPrefix}/${code}/state`);
      const result = await runTransaction(stateRef, (currentState) => {
        if (!currentState) return undefined;
        if (currentState.lockUid) return; // Already locked

        return {
          ...currentState,
          lockUid: playerUid,
          buzz: { uid: playerUid, at: buzzTime },
          buzzBanner: `🔔 ${playerName} a buzzé !`
        };
      });

      if (!result.committed || result.snapshot.val()?.lockUid !== playerUid) {
        playSound('error');
      }
    } catch (error) {
      console.error('Erreur buzz:', error);
      playSound('error');
    }
  };

  // Classe CSS selon l'état
  const buttonClass = `${styles.button} ${styles[buzzerState.type]}`;

  return (
    <>
      <div className={styles.spacer} />

      <div className={styles.wrapper}>
        <button
          onClick={handleBuzz}
          disabled={buzzerState.disabled}
          className={buttonClass}
          aria-label={`${buzzerState.label} ${buzzerState.sublabel}`}
        >
          {/* Croix pour état blocked */}
          {buzzerState.type === 'blocked' && (
            <div className={styles.crossOverlay} />
          )}

          {/* Contenu texte */}
          <div className={styles.content}>
            <div className={styles.mainLabel}>{buzzerState.label}</div>
            {buzzerState.sublabel && (
              <div className={styles.subLabel}>{buzzerState.sublabel}</div>
            )}
          </div>
        </button>
      </div>
    </>
  );
}
