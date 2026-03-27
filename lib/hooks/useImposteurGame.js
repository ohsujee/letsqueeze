"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { db, ref, onValue, update, set, get } from '@/lib/firebase';

const ROOM_PREFIX = 'rooms_imposteur';

/**
 * Core game logic hook for the Imposteur game.
 * Manages: Firebase listeners, phase transitions, vote tallying,
 * elimination, Mr. White guess, win conditions, scoring.
 */
export function useImposteurGame({ roomCode, myUid, isHost }) {
  const [meta, setMeta] = useState(null);
  const [state, setState] = useState(null);
  const [myRole, setMyRole] = useState(null);       // { role, word }
  const [descriptions, setDescriptions] = useState({});
  const [votes, setVotes] = useState({});
  const [revealedRoles, setRevealedRoles] = useState({});
  const [roundScores, setRoundScores] = useState({});

  const stateRef = useRef(state);
  stateRef.current = state;

  // ── Firebase Listeners ──

  useEffect(() => {
    if (!roomCode) return;
    const unsub = onValue(ref(db, `${ROOM_PREFIX}/${roomCode}/meta`), snap => {
      setMeta(snap.val());
    });
    return () => unsub();
  }, [roomCode]);

  useEffect(() => {
    if (!roomCode) return;
    const unsub = onValue(ref(db, `${ROOM_PREFIX}/${roomCode}/state`), snap => {
      setState(snap.val());
    });
    return () => unsub();
  }, [roomCode]);

  // Listen to my role (restricted read)
  useEffect(() => {
    if (!roomCode || !myUid) return;
    const unsub = onValue(ref(db, `${ROOM_PREFIX}/${roomCode}/roles/${myUid}`), snap => {
      setMyRole(snap.val());
    });
    return () => unsub();
  }, [roomCode, myUid]);

  // Listen to descriptions
  useEffect(() => {
    if (!roomCode) return;
    const unsub = onValue(ref(db, `${ROOM_PREFIX}/${roomCode}/descriptions`), snap => {
      setDescriptions(snap.val() || {});
    });
    return () => unsub();
  }, [roomCode]);

  // Listen to votes
  useEffect(() => {
    if (!roomCode) return;
    const unsub = onValue(ref(db, `${ROOM_PREFIX}/${roomCode}/votes`), snap => {
      setVotes(snap.val() || {});
    });
    return () => unsub();
  }, [roomCode]);

  // Listen to revealed roles
  useEffect(() => {
    if (!roomCode) return;
    const unsub = onValue(ref(db, `${ROOM_PREFIX}/${roomCode}/revealedRoles`), snap => {
      setRevealedRoles(snap.val() || {});
    });
    return () => unsub();
  }, [roomCode]);

  // Listen to round scores
  useEffect(() => {
    if (!roomCode) return;
    const unsub = onValue(ref(db, `${ROOM_PREFIX}/${roomCode}/roundScores`), snap => {
      setRoundScores(snap.val() || {});
    });
    return () => unsub();
  }, [roomCode]);

  // ── Mark role as seen ──
  const markRoleSeen = useCallback(async () => {
    if (!roomCode || !myUid) return;
    await update(ref(db, `${ROOM_PREFIX}/${roomCode}/players/${myUid}`), { hasSeenRole: true });
  }, [roomCode, myUid]);

  // ── Advance to describing phase (host) ──
  const startDescribing = useCallback(async () => {
    if (!roomCode || !isHost) return;
    await update(ref(db, `${ROOM_PREFIX}/${roomCode}/state`), {
      phase: 'describing',
      currentTurnIndex: 0,
      currentTurnUid: stateRef.current?.turnOrder?.[0] || null,
    });
  }, [roomCode, isHost]);

  // ── Submit a clue (written mode) ──
  const submitClue = useCallback(async (clue) => {
    if (!roomCode || !myUid || !stateRef.current) return;
    const subRound = stateRef.current.currentSubRound || 1;
    await set(ref(db, `${ROOM_PREFIX}/${roomCode}/descriptions/${subRound}/${myUid}`), clue);
  }, [roomCode, myUid]);

  // ── Advance to next turn (host or current player in oral mode) ──
  const advanceToNextTurn = useCallback(async () => {
    if (!roomCode) return;
    const s = stateRef.current;
    if (!s?.turnOrder) return;

    const nextIndex = (s.currentTurnIndex || 0) + 1;

    // Find next alive player
    let found = false;
    for (let i = nextIndex; i < s.turnOrder.length; i++) {
      // We'd need player data to check alive status, so for now just advance
      // The play page handles skipping eliminated players
      await update(ref(db, `${ROOM_PREFIX}/${roomCode}/state`), {
        currentTurnIndex: i,
        currentTurnUid: s.turnOrder[i],
      });
      found = true;
      break;
    }

    // All players have gone — move to voting
    if (!found) {
      await update(ref(db, `${ROOM_PREFIX}/${roomCode}/state`), {
        phase: 'voting',
        currentTurnIndex: 0,
        currentTurnUid: null,
      });
    }
  }, [roomCode]);

  // ── Advance to next alive turn (skipping eliminated) ──
  const advanceToNextAliveTurn = useCallback(async (alivePlayers) => {
    if (!roomCode) return;
    const s = stateRef.current;
    if (!s?.turnOrder) return;

    const aliveUids = new Set(alivePlayers.map(p => p.uid));
    const nextIndex = (s.currentTurnIndex || 0) + 1;

    for (let i = nextIndex; i < s.turnOrder.length; i++) {
      if (aliveUids.has(s.turnOrder[i])) {
        await update(ref(db, `${ROOM_PREFIX}/${roomCode}/state`), {
          currentTurnIndex: i,
          currentTurnUid: s.turnOrder[i],
        });
        return;
      }
    }

    // All alive players have gone — move to voting
    await update(ref(db, `${ROOM_PREFIX}/${roomCode}/state`), {
      phase: 'voting',
      currentTurnIndex: 0,
      currentTurnUid: null,
    });
  }, [roomCode]);

  // ── Submit vote ──
  const submitVote = useCallback(async (targetUid) => {
    if (!roomCode || !myUid || !stateRef.current) return;
    const subRound = stateRef.current.currentSubRound || 1;
    await set(ref(db, `${ROOM_PREFIX}/${roomCode}/votes/${subRound}/${myUid}`), targetUid);
  }, [roomCode, myUid]);

  // ── Tally votes and eliminate (host) ──
  const tallyVotesAndEliminate = useCallback(async (alivePlayers) => {
    if (!roomCode || !isHost) return;
    const s = stateRef.current;
    const subRound = s?.currentSubRound || 1;

    // Read current votes
    const votesSnap = await get(ref(db, `${ROOM_PREFIX}/${roomCode}/votes/${subRound}`));
    const currentVotes = votesSnap.val() || {};

    // Count votes
    const voteCounts = {};
    Object.values(currentVotes).forEach(targetUid => {
      voteCounts[targetUid] = (voteCounts[targetUid] || 0) + 1;
    });

    // Find max
    const maxVotes = Math.max(...Object.values(voteCounts), 0);
    const tied = Object.entries(voteCounts).filter(([, count]) => count === maxVotes).map(([uid]) => uid);

    // If tie, pick random among tied (simple approach)
    const eliminatedUid = tied.length === 1 ? tied[0] : tied[Math.floor(Math.random() * tied.length)];

    if (!eliminatedUid) return;

    // Get eliminated player's role
    const roleSnap = await get(ref(db, `${ROOM_PREFIX}/${roomCode}/roles/${eliminatedUid}`));
    const eliminatedRole = roleSnap.val();

    const updates = {};

    // Mark eliminated
    updates[`${ROOM_PREFIX}/${roomCode}/players/${eliminatedUid}/alive`] = false;

    // Reveal their role
    if (eliminatedRole) {
      updates[`${ROOM_PREFIX}/${roomCode}/revealedRoles/${eliminatedUid}`] = eliminatedRole;
    }

    // Add to eliminated list
    const eliminated = [...(s?.eliminatedThisRound || []), eliminatedUid];
    updates[`${ROOM_PREFIX}/${roomCode}/state/eliminatedThisRound`] = eliminated;
    updates[`${ROOM_PREFIX}/${roomCode}/state/phase`] = 'elimination';

    // If Mr. White is eliminated, set guessing mode
    if (eliminatedRole?.role === 'mrwhite') {
      updates[`${ROOM_PREFIX}/${roomCode}/state/mrWhiteGuessing`] = true;
    }

    await update(ref(db), updates);
  }, [roomCode, isHost]);

  // ── Mr. White guess ──
  const submitMrWhiteGuess = useCallback(async (guess) => {
    if (!roomCode || !myUid) return;
    const s = stateRef.current;
    const civilianWord = s?.wordPair?.civilian || '';

    // Compare insensitive to case and accents
    const normalize = (str) => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const correct = normalize(guess) === normalize(civilianWord);

    await update(ref(db, `${ROOM_PREFIX}/${roomCode}/state`), {
      mrWhiteGuess: guess,
      mrWhiteGuessCorrect: correct,
      mrWhiteGuessing: false,
    });
  }, [roomCode, myUid]);

  // ── Check win conditions (host) ──
  const checkWinConditions = useCallback(async (allPlayers) => {
    if (!roomCode || !isHost) return null;

    const alive = allPlayers.filter(p => p.alive !== false);
    const aliveUids = alive.map(p => p.uid);

    // Get roles of alive players
    const rolePromises = aliveUids.map(uid =>
      get(ref(db, `${ROOM_PREFIX}/${roomCode}/roles/${uid}`)).then(snap => ({ uid, ...snap.val() }))
    );
    const aliveRoles = await Promise.all(rolePromises);

    const aliveCivilians = aliveRoles.filter(r => r.role === 'civilian');
    const aliveUndercover = aliveRoles.filter(r => r.role === 'undercover');
    const aliveMrWhite = aliveRoles.filter(r => r.role === 'mrwhite');

    const s = stateRef.current;

    // Mr. White guessed correctly
    if (s?.mrWhiteGuessCorrect === true) {
      return { winner: 'undercover', winReason: 'mr_white_guess' };
    }

    // All imposteurs eliminated
    if (aliveUndercover.length === 0 && aliveMrWhite.length === 0) {
      return { winner: 'civilians', winReason: 'all_eliminated' };
    }

    // Undercover outnumbers or equals civilians
    const imposteurCount = aliveUndercover.length + aliveMrWhite.length;
    if (imposteurCount >= aliveCivilians.length) {
      return { winner: 'undercover', winReason: 'outnumbered' };
    }

    return null; // Game continues
  }, [roomCode, isHost]);

  // ── Apply win / continue to next sub-round (host) ──
  const resolveElimination = useCallback(async (allPlayers) => {
    if (!roomCode || !isHost) return;

    const result = await checkWinConditions(allPlayers);
    const s = stateRef.current;

    if (result) {
      // Game over for this round
      await update(ref(db, `${ROOM_PREFIX}/${roomCode}/state`), {
        winner: result.winner,
        winReason: result.winReason,
        phase: 'roundEnd',
      });
    } else {
      // Continue — next sub-round of descriptions
      const nextSubRound = (s?.currentSubRound || 1) + 1;
      const alive = allPlayers.filter(p => p.alive !== false);
      const turnOrder = alive.map(p => p.uid).sort(() => Math.random() - 0.5);

      await update(ref(db, `${ROOM_PREFIX}/${roomCode}/state`), {
        phase: 'describing',
        currentSubRound: nextSubRound,
        turnOrder,
        currentTurnIndex: 0,
        currentTurnUid: turnOrder[0] || null,
        mrWhiteGuessing: false,
        mrWhiteGuess: null,
        mrWhiteGuessCorrect: null,
      });
    }
  }, [roomCode, isHost, checkWinConditions]);

  // ── Calculate and apply scores (host) ──
  const applyScores = useCallback(async (allPlayers) => {
    if (!roomCode || !isHost) return;
    const s = stateRef.current;
    if (!s?.winner) return;

    const updates = {};
    const currentRound = s.currentRound || 1;

    // Get all roles
    const rolePromises = allPlayers.map(uid =>
      typeof uid === 'string'
        ? get(ref(db, `${ROOM_PREFIX}/${roomCode}/roles/${uid}`)).then(snap => ({ uid, ...snap.val() }))
        : get(ref(db, `${ROOM_PREFIX}/${roomCode}/roles/${uid.uid}`)).then(snap => ({ uid: uid.uid, ...snap.val() }))
    );
    const allRoles = await Promise.all(
      allPlayers.map(p =>
        get(ref(db, `${ROOM_PREFIX}/${roomCode}/roles/${p.uid}`)).then(snap => ({ uid: p.uid, alive: p.alive !== false, ...snap.val() }))
      )
    );

    const subRoundsSurvived = (uid) => {
      const eliminated = s.eliminatedThisRound || [];
      const idx = eliminated.indexOf(uid);
      if (idx === -1) return s.currentSubRound || 1;
      return idx; // approximation: eliminated in order
    };

    allRoles.forEach(({ uid, role, alive }) => {
      let points = 0;

      if (s.winner === 'civilians') {
        if (role === 'civilian') {
          points = alive ? 10 : 0;
        } else {
          // Imposteur / Mr. White — survival bonus
          points = subRoundsSurvived(uid) * 2;
        }
      } else {
        // Undercover wins
        if (role === 'undercover') {
          points = s.winReason === 'mr_white_guess' ? 12 : 15;
        } else if (role === 'mrwhite') {
          if (s.mrWhiteGuessCorrect) points = 20;
          else if (alive) points = 15;
          else points = subRoundsSurvived(uid) * 2;
        } else {
          // Civilian alive when undercover wins
          points = alive ? 2 : 0;
        }
      }

      updates[`${ROOM_PREFIX}/${roomCode}/roundScores/${currentRound}/${uid}`] = points;
      // Add to cumulative score
      const currentScore = allPlayers.find(p => p.uid === uid)?.score || 0;
      updates[`${ROOM_PREFIX}/${roomCode}/players/${uid}/score`] = currentScore + points;
    });

    await update(ref(db), updates);
  }, [roomCode, isHost]);

  // ── Start next round (host) ──
  const startNextRound = useCallback(async (allPlayers, usedPairIds) => {
    if (!roomCode || !isHost) return;
    const { getRandomWordPair } = await import('@/data/imposteur-words');
    const s = stateRef.current;
    const settings = meta?.settings;
    const nextRound = (s?.currentRound || 1) + 1;
    const wordPair = getRandomWordPair(usedPairIds || []);

    if (!wordPair) return;

    const playerUids = allPlayers.map(p => p.uid);
    const mrWhiteEnabled = settings?.mrWhiteEnabled && playerUids.length >= 5;

    // Re-distribute roles
    const shuffled = [...playerUids].sort(() => Math.random() - 0.5);
    let nbUndercover = 1;
    let nbMrWhite = 0;
    const count = shuffled.length;

    if (count >= 9) {
      nbUndercover = 2;
      nbMrWhite = mrWhiteEnabled ? (count >= 11 ? 2 : 1) : 0;
    } else if (count >= 7) {
      nbUndercover = count >= 8 ? 2 : 1;
      nbMrWhite = mrWhiteEnabled ? 1 : 0;
    } else if (count >= 5) {
      nbUndercover = 1;
      nbMrWhite = mrWhiteEnabled ? 1 : 0;
    }

    const undercover = shuffled.slice(0, nbUndercover);
    const mrwhite = shuffled.slice(nbUndercover, nbUndercover + nbMrWhite);
    const civilians = shuffled.slice(nbUndercover + nbMrWhite);

    const updates = {};

    // Write new roles
    undercover.forEach(uid => {
      updates[`${ROOM_PREFIX}/${roomCode}/roles/${uid}`] = { role: 'undercover', word: wordPair.undercover };
    });
    mrwhite.forEach(uid => {
      updates[`${ROOM_PREFIX}/${roomCode}/roles/${uid}`] = { role: 'mrwhite', word: null };
    });
    civilians.forEach(uid => {
      updates[`${ROOM_PREFIX}/${roomCode}/roles/${uid}`] = { role: 'civilian', word: wordPair.civilian };
    });

    // Reset players
    allPlayers.forEach(p => {
      updates[`${ROOM_PREFIX}/${roomCode}/players/${p.uid}/alive`] = true;
      updates[`${ROOM_PREFIX}/${roomCode}/players/${p.uid}/hasSeenRole`] = false;
    });

    // New state
    const turnOrder = [...playerUids].sort(() => Math.random() - 0.5);
    updates[`${ROOM_PREFIX}/${roomCode}/state`] = {
      phase: 'roles',
      currentRound: nextRound,
      currentSubRound: 1,
      turnOrder,
      currentTurnIndex: 0,
      currentTurnUid: turnOrder[0],
      wordPair: {
        civilian: wordPair.civilian,
        undercover: wordPair.undercover,
        pairId: wordPair.id,
      },
      usedPairIds: [...(usedPairIds || []), wordPair.id],
      eliminatedThisRound: [],
      winner: null,
      winReason: null,
      mrWhiteGuessing: false,
      mrWhiteGuess: null,
      mrWhiteGuessCorrect: null,
    };

    // Clean round data
    updates[`${ROOM_PREFIX}/${roomCode}/descriptions`] = null;
    updates[`${ROOM_PREFIX}/${roomCode}/votes`] = null;
    updates[`${ROOM_PREFIX}/${roomCode}/revealedRoles`] = null;

    await update(ref(db), updates);
  }, [roomCode, isHost, meta]);

  // ── End game (host) ──
  const endGame = useCallback(async () => {
    if (!roomCode || !isHost) return;
    await update(ref(db, `${ROOM_PREFIX}/${roomCode}/state`), {
      phase: 'ended',
    });
  }, [roomCode, isHost]);

  return {
    meta,
    state,
    myRole,
    descriptions,
    votes,
    revealedRoles,
    roundScores,
    phase: state?.phase || 'lobby',

    // Actions
    markRoleSeen,
    startDescribing,
    submitClue,
    advanceToNextTurn,
    advanceToNextAliveTurn,
    submitVote,
    tallyVotesAndEliminate,
    submitMrWhiteGuess,
    checkWinConditions,
    resolveElimination,
    applyScores,
    startNextRound,
    endGame,
  };
}
