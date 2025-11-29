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

  // Fonction de buzz - Transaction atomique sur tout l'état pour éviter les race conditions
  const handleBuzz = async () => {
    if (buzzerState.disabled || !roomCode || !playerUid || !playerName) return;

    const code = String(roomCode).toUpperCase();
    const isAnticipatedBuzz = !revealed;
    const buzzTime = Date.now();

    try {
      // Optimistic update - affichage immédiat côté client
      setOptimisticState({
        lockUid: playerUid,
        buzzBanner: `🔔 ${playerName} a buzzé !${isAnticipatedBuzz ? ' (ANTICIPÉ)' : ''}`
      });

      playSound('buzz');
      navigator?.vibrate?.([100, 50, 200]);

      // Transaction atomique sur TOUT l'objet state
      // Firebase garantit que le PREMIER qui commit gagne
      // Si conflit, la transaction retry automatiquement avec les nouvelles données
      const stateRef = ref(db, `rooms/${code}/state`);
      const result = await runTransaction(stateRef, (currentState) => {
        if (!currentState) return currentState;

        // Si quelqu'un a déjà buzzé, on ne change rien
        // Le retry de Firebase garantit qu'on voit toujours l'état le plus récent
        if (currentState.lockUid) {
          return currentState; // Garder le buzz existant
        }

        // Personne n'a buzzé - je prends le lock avec TOUTES les infos atomiquement
        return {
          ...currentState,
          lockUid: playerUid,
          buzz: {
            uid: playerUid,
            at: buzzTime,
            anticipated: isAnticipatedBuzz
          },
          buzzBanner: `🔔 ${playerName} a buzzé !${isAnticipatedBuzz ? ' (ANTICIPÉ)' : ''}`
        };
      });

      // Vérifier si j'ai gagné le buzz
      if (result.committed && result.snapshot.val()?.lockUid === playerUid) {
        triggerConfetti('success');
      } else {
        // Un autre joueur a buzzé avant moi (transaction a retry et vu son buzz)
        playSound('error');
      }
    } catch (error) {
      console.error('Erreur buzz:', error);
      playSound('error');
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
