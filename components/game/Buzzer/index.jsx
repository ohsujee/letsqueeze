'use client';

import { useEffect, useMemo, useState, useOptimistic } from 'react';
import { ref, onValue, update, runTransaction, serverTimestamp } from 'firebase/database';
import { db } from '@/lib/firebase';
import { motion } from 'framer-motion';
import { triggerConfetti } from '@/components/shared/Confetti';
import { useBuzzerAudio } from '@/lib/hooks/useBuzzerAudio';
import BuzzerSVG from './BuzzerSVG';
import styles from './Buzzer.module.css';

/**
 * Buzzer - Composant principal du buzzer de quiz
 * Refactoré : 674 → ~150 lignes
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
    const unsub = onValue(ref(db, `rooms/${code}/state`), (snap) => {
      setState(snap.val() || {});
    });
    return () => unsub();
  }, [roomCode]);

  // Calculer l'état du buzzer
  const buzzerState = useMemo(() => {
    const s = optimisticState || {};
    const isBlocked = blockedUntil > serverNow;
    const blockedSeconds = Math.ceil((blockedUntil - serverNow) / 1000);
    const isLocked = s.lockUid != null && s.lockUid !== '';
    const isMyBuzz = s.lockUid === playerUid;

    if (isBlocked) return { type: 'penalty', label: `${blockedSeconds}s`, sublabel: 'PÉNALITÉ', disabled: true };
    if (isMyBuzz) return { type: 'success', label: '', sublabel: '', disabled: true };
    if (isLocked) return { type: 'blocked', label: '', sublabel: '', disabled: true, showX: true };
    if (revealed) return { type: 'active', label: 'BUZZ', sublabel: '', disabled: false, isAnticipated: false };
    return { type: 'anticipated', label: '⚡', sublabel: 'ANTICIPÉ', disabled: false, isAnticipated: true };
  }, [optimisticState, blockedUntil, serverNow, playerUid, revealed]);

  // Fonction de buzz
  const handleBuzz = async () => {
    if (buzzerState.disabled || !roomCode || !playerUid || !playerName) return;

    const code = String(roomCode).toUpperCase();
    const isAnticipatedBuzz = !revealed;

    try {
      // Optimistic update
      setOptimisticState({
        lockUid: playerUid,
        buzzBanner: `🔔 ${playerName} a buzzé !${isAnticipatedBuzz ? ' (ANTICIPÉ)' : ''}`
      });

      playSound('buzz');
      navigator?.vibrate?.([100, 50, 200]);

      // Transaction atomique
      const lockRef = ref(db, `rooms/${code}/state/lockUid`);
      const result = await runTransaction(lockRef, (currentLock) => {
        return currentLock ? currentLock : playerUid;
      });

      if (result.committed && result.snapshot.val() === playerUid) {
        const updates = {};
        updates[`rooms/${code}/state/buzz`] = { uid: playerUid, at: serverTimestamp(), anticipated: isAnticipatedBuzz };
        updates[`rooms/${code}/state/buzzBanner`] = `🔔 ${playerName} a buzzé !${isAnticipatedBuzz ? ' (ANTICIPÉ)' : ''}`;
        await update(ref(db), updates);
        triggerConfetti('success');
      } else {
        playSound('error');
      }
    } catch (error) {
      console.error('Erreur buzz:', error);
    }
  };

  return (
    <>
      <div className={styles.spacer} />

      <div className={styles.wrapper}>
        <motion.button
          onClick={handleBuzz}
          disabled={buzzerState.disabled}
          className={styles.button}
          aria-label={`${buzzerState.label} ${buzzerState.sublabel}`}
          animate={{ opacity: 1 }}
          whileHover={!buzzerState.disabled ? { y: -8, transition: { type: "spring", stiffness: 400, damping: 10 } } : {}}
          whileTap={!buzzerState.disabled ? { y: 8, transition: { duration: 0.1 } } : {}}
          initial={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <BuzzerSVG type={buzzerState.type} showX={buzzerState.showX} />

          <div className={styles.content}>
            <motion.div className={styles.mainLabel}>{buzzerState.label}</motion.div>
            <div className={styles.subLabel}>{buzzerState.sublabel}</div>
            {buzzerState.isAnticipated && (
              <div className={styles.warningMsg}>⚠️ RISQUE: -100pts</div>
            )}
          </div>
        </motion.button>
      </div>
    </>
  );
}
