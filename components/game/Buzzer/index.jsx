'use client';

import { useEffect, useMemo, useState } from 'react';
import { ref, onValue, update, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useBuzzerAudio } from '@/lib/hooks/useBuzzerAudio';
import styles from './Buzzer.module.css';

/**
 * Buzzer - Composant principal du buzzer de quiz
 * Style 3D unifié avec changement de couleur selon l'état
 *
 * Système de compensation de latence :
 * - Les joueurs envoient leur buzz dans pendingBuzzes avec timestamp ajusté
 * - L'host résout après une fenêtre de 150ms et choisit le vrai premier
 * - États: active → pending (jaune) → success (vert) ou blocked (gris)
 */
export default function Buzzer({
  roomCode,
  roomPrefix = 'rooms', // 'rooms' for quiz, 'rooms_blindtest' for deez test, 'rooms_alibi' for alibi
  playerUid,
  playerName,
  blockedUntil = 0,
  serverNow = Date.now(),
  serverOffset = 0, // Offset entre client et serveur Firebase
  disabled = false // Party Mode: désactivé si je suis le asker ou dans l'équipe qui pose
}) {
  const [state, setState] = useState({});
  const [pendingBuzzes, setPendingBuzzes] = useState({});
  const [myPendingBuzz, setMyPendingBuzz] = useState(false); // Track si j'ai un buzz en attente
  const { playSound } = useBuzzerAudio();

  // Écouter l'état de la room
  useEffect(() => {
    if (!roomCode) return;
    const code = String(roomCode).toUpperCase();
    const unsub = onValue(ref(db, `${roomPrefix}/${code}/state`), (snap) => {
      setState(snap.val() || {});
    });
    return () => unsub();
  }, [roomCode, roomPrefix]);

  // Écouter les buzzes en attente
  useEffect(() => {
    if (!roomCode) return;
    const code = String(roomCode).toUpperCase();
    const unsub = onValue(ref(db, `${roomPrefix}/${code}/state/pendingBuzzes`), (snap) => {
      setPendingBuzzes(snap.val() || {});
    });
    return () => unsub();
  }, [roomCode, roomPrefix]);

  // Quand lockUid est défini, vérifier si c'est moi ou non
  useEffect(() => {
    if (state?.lockUid) {
      // Résolution terminée, reset mon état pending
      setMyPendingBuzz(false);
      if (state.lockUid !== playerUid && myPendingBuzz) {
        // J'avais buzzé mais quelqu'un d'autre a gagné
        playSound('error');
      }
    }
  }, [state?.lockUid, playerUid, myPendingBuzz, playSound]);

  // Calculer l'état du buzzer
  const buzzerState = useMemo(() => {
    const s = state || {};
    const isBlocked = blockedUntil > serverNow;
    const blockedSeconds = Math.ceil((blockedUntil - serverNow) / 1000);
    const isLocked = s.lockUid != null && s.lockUid !== '';
    const isMyBuzz = s.lockUid === playerUid;
    const hasPendingBuzz = pendingBuzzes && pendingBuzzes[playerUid];
    const anyPendingBuzz = pendingBuzzes && Object.keys(pendingBuzzes).length > 0;

    // Party Mode: désactivé si je suis le asker ou dans l'équipe qui pose
    if (disabled) return { type: 'blocked', label: '', sublabel: '', disabled: true };

    // Priorité des états
    if (isBlocked) return { type: 'penalty', label: `${blockedSeconds}s`, sublabel: 'PÉNALITÉ', disabled: true };
    if (isMyBuzz) return { type: 'success', label: 'A TOI !', sublabel: '', disabled: true };
    if (isLocked) return { type: 'blocked', label: '', sublabel: '', disabled: true };

    // Nouvel état: pending (j'ai buzzé, en attente de résolution)
    if (hasPendingBuzz || myPendingBuzz) return { type: 'pending', label: 'BUZZÉ!', sublabel: '', disabled: true };

    // Un autre joueur a un buzz pending mais pas moi
    if (anyPendingBuzz) return { type: 'blocked', label: '', sublabel: '', disabled: true };

    return { type: 'active', label: 'BUZZ', sublabel: '', disabled: false };
  }, [state, pendingBuzzes, blockedUntil, serverNow, playerUid, myPendingBuzz, disabled]);

  // Fonction de buzz - écrit dans pendingBuzzes au lieu de lockUid directement
  const handleBuzz = async () => {
    if (buzzerState.disabled || !roomCode || !playerUid || !playerName) return;

    const code = String(roomCode).toUpperCase();
    const localTime = Date.now();
    // Timestamp ajusté = temps local + offset serveur (pour compenser la latence)
    const adjustedTime = localTime + serverOffset;

    try {
      // Optimistic update local - passer en pending immédiatement
      setMyPendingBuzz(true);

      // Vibration haptique
      navigator?.vibrate?.([100, 50, 200]);

      // Vérifier d'abord si lockUid est déjà défini (quelqu'un a déjà gagné)
      const stateSnap = await get(ref(db, `${roomPrefix}/${code}/state/lockUid`));
      if (stateSnap.val()) {
        // Déjà résolu, trop tard
        setMyPendingBuzz(false);
        playSound('error');
        return;
      }

      // Écrire mon buzz dans pendingBuzzes (pas de transaction, juste un write)
      // L'host va résoudre en comparant les adjustedTime
      await update(ref(db, `${roomPrefix}/${code}/state/pendingBuzzes`), {
        [playerUid]: {
          uid: playerUid,
          name: playerName,
          localTime,
          adjustedTime,
          receivedAt: Date.now() // Pour debug
        }
      });

    } catch (error) {
      console.error('Erreur buzz:', error);
      setMyPendingBuzz(false);
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
