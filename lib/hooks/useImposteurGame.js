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
  const [discussionVotes, setDiscussionVotes] = useState({});
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

  // Listen to discussion votes
  useEffect(() => {
    if (!roomCode) return;
    const unsub = onValue(ref(db, `${ROOM_PREFIX}/${roomCode}/state/discussionVotes`), snap => {
      setDiscussionVotes(snap.val() || {});
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

    // All players have gone — move to discussion
    if (!found) {
      await update(ref(db, `${ROOM_PREFIX}/${roomCode}/state`), {
        phase: 'discussion',
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

    // All alive players have gone — move to discussion
    await update(ref(db, `${ROOM_PREFIX}/${roomCode}/state`), {
      phase: 'discussion',
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

  // ── Submit discussion choice (vote or continue) ──
  const submitDiscussionChoice = useCallback(async (choice) => {
    if (!roomCode || !myUid) return;
    await set(ref(db, `${ROOM_PREFIX}/${roomCode}/state/discussionVotes/${myUid}`), choice);
  }, [roomCode, myUid]);

  // ── Auto-resolve discussion votes when majority reached (host) ──
  useEffect(() => {
    if (!roomCode || !isHost) return;
    const s = stateRef.current;
    if (s?.phase !== 'discussion') return;
    if (!discussionVotes || Object.keys(discussionVotes).length === 0) return;

    // We need alive players from the state's turnOrder, filtering eliminated
    const turnOrder = s?.turnOrder || [];
    const eliminatedSet = new Set(s?.eliminatedThisRound || []);
    const aliveUids = turnOrder.filter(uid => !eliminatedSet.has(uid));
    const majority = Math.floor(aliveUids.length / 2) + 1;

    // Count choices
    let voteCount = 0;
    let continueCount = 0;
    Object.entries(discussionVotes).forEach(([uid, choice]) => {
      // Only count alive players' votes
      if (!aliveUids.includes(uid)) return;
      if (choice === 'vote') voteCount++;
      if (choice === 'continue') continueCount++;
    });

    // Check if everyone alive has voted
    const totalAliveVoted = voteCount + continueCount;
    const allVoted = totalAliveVoted >= aliveUids.length;

    if (voteCount >= majority) {
      // Majority wants to vote — transition to voting
      const updates = {};
      updates[`${ROOM_PREFIX}/${roomCode}/state/discussionVotes`] = null;
      updates[`${ROOM_PREFIX}/${roomCode}/state/tieMessage`] = null;
      updates[`${ROOM_PREFIX}/${roomCode}/state/phase`] = 'voting';
      update(ref(db), updates);
    } else if (continueCount >= majority) {
      // Majority wants to continue — new sub-round of describing
      const nextSubRound = (s?.currentSubRound || 1) + 1;
      const firstAliveUid = turnOrder.find(uid => !eliminatedSet.has(uid)) || null;

      const updates = {};
      updates[`${ROOM_PREFIX}/${roomCode}/state/discussionVotes`] = null;
      updates[`${ROOM_PREFIX}/${roomCode}/state/tieMessage`] = null;
      updates[`${ROOM_PREFIX}/${roomCode}/state/currentSubRound`] = nextSubRound;
      updates[`${ROOM_PREFIX}/${roomCode}/state/currentTurnIndex`] = 0;
      updates[`${ROOM_PREFIX}/${roomCode}/state/currentTurnUid`] = firstAliveUid;
      updates[`${ROOM_PREFIX}/${roomCode}/state/phase`] = 'describing';
      updates[`${ROOM_PREFIX}/${roomCode}/descriptions/${nextSubRound}`] = null;
      update(ref(db), updates);
    } else if (allVoted && voteCount === continueCount) {
      // Tie! Everyone voted but no majority — default to new round of clues
      const nextSubRound = (s?.currentSubRound || 1) + 1;
      const firstAliveUid = turnOrder.find(uid => !eliminatedSet.has(uid)) || null;

      const updates = {};
      updates[`${ROOM_PREFIX}/${roomCode}/state/discussionVotes`] = null;
      updates[`${ROOM_PREFIX}/${roomCode}/state/tieMessage`] = 'Égalité ! On repart sur un tour d\'indices pour y voir plus clair 🔍';
      updates[`${ROOM_PREFIX}/${roomCode}/state/currentSubRound`] = nextSubRound;
      updates[`${ROOM_PREFIX}/${roomCode}/state/currentTurnIndex`] = 0;
      updates[`${ROOM_PREFIX}/${roomCode}/state/currentTurnUid`] = firstAliveUid;
      updates[`${ROOM_PREFIX}/${roomCode}/state/phase`] = 'describing';
      updates[`${ROOM_PREFIX}/${roomCode}/descriptions/${nextSubRound}`] = null;
      update(ref(db), updates);
    }
  }, [roomCode, isHost, discussionVotes, state?.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Finalize votes: tally and eliminate (callable by anyone, writes as host) ──
  const finalizeVotes = useCallback(async (alivePlayers) => {
    if (!roomCode) return;
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
    if (maxVotes === 0) return; // No votes cast

    const tied = Object.entries(voteCounts).filter(([, count]) => count === maxVotes).map(([uid]) => uid);

    // Tie in elimination vote → no one eliminated, new round of clues
    if (tied.length > 1) {
      const turnOrder = s?.turnOrder || [];
      const eliminatedSet = new Set(s?.eliminatedThisRound || []);
      const nextSubRound = (s?.currentSubRound || 1) + 1;
      const firstAliveUid = turnOrder.find(uid => !eliminatedSet.has(uid)) || null;

      const updates = {};
      updates[`${ROOM_PREFIX}/${roomCode}/state/tieMessage`] = 'Les votes sont partagés ! Personne n\'est éliminé. Nouveau tour d\'indices 🤔';
      updates[`${ROOM_PREFIX}/${roomCode}/state/currentSubRound`] = nextSubRound;
      updates[`${ROOM_PREFIX}/${roomCode}/state/currentTurnIndex`] = 0;
      updates[`${ROOM_PREFIX}/${roomCode}/state/currentTurnUid`] = firstAliveUid;
      updates[`${ROOM_PREFIX}/${roomCode}/state/phase`] = 'describing';
      updates[`${ROOM_PREFIX}/${roomCode}/descriptions/${nextSubRound}`] = null;
      await update(ref(db), updates);
      return;
    }

    const eliminatedUid = tied[0];

    // Get eliminated player's role
    const roleSnap = await get(ref(db, `${ROOM_PREFIX}/${roomCode}/roles/${eliminatedUid}`));
    const eliminatedRole = roleSnap.val();

    const updates = {};

    // Mark eliminated
    updates[`${ROOM_PREFIX}/${roomCode}/players/${eliminatedUid}/alive`] = false;
    updates[`${ROOM_PREFIX}/${roomCode}/state/tieMessage`] = null;

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
  }, [roomCode]);

  // ── Tally votes and eliminate (host) — wraps finalizeVotes with host check ──
  const tallyVotesAndEliminate = useCallback(async (alivePlayers) => {
    if (!isHost) return;
    return finalizeVotes(alivePlayers);
  }, [isHost, finalizeVotes]);

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
      // Game over for this round — reveal ALL roles
      const updates = {};
      updates[`${ROOM_PREFIX}/${roomCode}/state/winner`] = result.winner;
      updates[`${ROOM_PREFIX}/${roomCode}/state/winReason`] = result.winReason;
      updates[`${ROOM_PREFIX}/${roomCode}/state/phase`] = 'roundEnd';

      // Reveal remaining roles (ones not already revealed by elimination)
      for (const p of allPlayers) {
        const roleSnap = await get(ref(db, `${ROOM_PREFIX}/${roomCode}/roles/${p.uid}`));
        const role = roleSnap.val();
        if (role) {
          updates[`${ROOM_PREFIX}/${roomCode}/revealedRoles/${p.uid}`] = role;
        }
      }

      await update(ref(db), updates);
    } else {
      // Continue — next sub-round of descriptions
      // Keep the same turnOrder (stable within a manche), just reset index
      const nextSubRound = (s?.currentSubRound || 1) + 1;
      const existingTurnOrder = s?.turnOrder || [];
      const aliveSet = new Set(allPlayers.filter(p => p.alive !== false).map(p => p.uid));
      // Find first alive player in the existing order
      const firstAliveUid = existingTurnOrder.find(uid => aliveSet.has(uid)) || null;

      await update(ref(db, `${ROOM_PREFIX}/${roomCode}/state`), {
        phase: 'describing',
        currentSubRound: nextSubRound,
        currentTurnIndex: 0,
        currentTurnUid: firstAliveUid,
        mrWhiteGuessing: false,
        mrWhiteGuess: null,
        mrWhiteGuessCorrect: null,
      });
    }
  }, [roomCode, isHost, checkWinConditions]);

  // ── Record round winner (host) ──
  const recordRoundWinner = useCallback(async () => {
    if (!roomCode || !isHost) return;
    const s = stateRef.current;
    if (!s?.winner) return;

    const currentRound = s.currentRound || 1;
    const currentWinners = s.roundWinners || [];
    await update(ref(db, `${ROOM_PREFIX}/${roomCode}/state`), {
      roundWinners: [...currentWinners, s.winner],
    });
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
    discussionVotes,
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
    submitDiscussionChoice,
    finalizeVotes,
    tallyVotesAndEliminate,
    submitMrWhiteGuess,
    checkWinConditions,
    resolveElimination,
    recordRoundWinner,
    startNextRound,
    endGame,
  };
}
