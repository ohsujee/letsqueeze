'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { db, ref, update, onValue } from '@/lib/firebase';

/**
 * LINK PHASE DURATIONS (ms) — vary by mode
 */
const DURATIONS = {
  oral: {
    clue: 5000,       // 5s (not used in oral, clue is spoken)
    waiting: 10000,   // 10s for players to link / defender to intercept
    countdown: 3000,  // 3-2-1 countdown
  },
  ecrit: {
    clue: 15000,      // 15s to type clue
    waiting: 10000,   // 10s for players to link / defender to intercept
    countdown: 15000, // 15s to type word
  },
};

/**
 * useActiveLink - Manages the link state machine
 *
 * States: idle → clue → waiting → choosing → countdown → reveal → result → idle
 *
 * @param {Object} params
 * @param {string} params.roomCode
 * @param {string} params.roomPrefix
 * @param {string} params.myUid
 * @param {Object} params.state - Firebase state object
 * @param {string} params.mode - 'oral' | 'ecrit'
 * @param {Array} params.players
 */
export function useActiveLink({ roomCode, roomPrefix, myUid, state, mode = 'oral', players = [] }) {
  const [countdown, setCountdown] = useState(null); // 3, 2, 1 or null
  const [waitingTimeLeft, setWaitingTimeLeft] = useState(0);
  const [clueTimeLeft, setClueTimeLeft] = useState(0);
  const [announcingTimeLeft, setAnnouncingTimeLeft] = useState(0);
  const countdownIntervalRef = useRef(null);
  const autoAdvanceRef = useRef(null);

  // Mode-dependent durations
  const d = DURATIONS[mode] || DURATIONS.oral;
  const CLUE_DURATION = d.clue;
  const WAITING_DURATION = d.waiting;
  const COUNTDOWN_DURATION = d.countdown;
  const ANNOUNCING_DURATION = 3000; // 3s announcement before waiting (oral only)

  const activeLink = state?.activeLink || null;
  const phase = activeLink?.phase || null;
  const isInitiator = activeLink?.initiatorUid === myUid;
  const isChosen = activeLink?.chosenUid === myUid;
  const isInLink = isInitiator || isChosen;
  const candidatesRaw = activeLink?.candidates;
  const candidates = useMemo(
    () => candidatesRaw ? Object.keys(candidatesRaw) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(candidatesRaw)]
  );

  const basePath = `${roomPrefix}/${roomCode}/state`;

  // ── Announcing timer (oral mode, 3s) ──
  useEffect(() => {
    if (phase !== 'announcing' || !activeLink?.clueTimestamp) return;

    const tick = () => {
      const elapsed = Date.now() - activeLink.clueTimestamp;
      const remaining = Math.max(0, ANNOUNCING_DURATION - elapsed);
      setAnnouncingTimeLeft(remaining);

      // Auto-advance to waiting when done (only initiator writes)
      if (remaining <= 0 && isInitiator) {
        update(ref(db, `${basePath}/activeLink`), {
          phase: 'waiting',
          clueTimestamp: Date.now(), // Reset timer for waiting phase
        });
      }
    };
    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [phase, activeLink?.clueTimestamp, isInitiator, basePath]);

  // ── Clue timer ──
  useEffect(() => {
    if (phase !== 'clue' || !activeLink?.clueTimestamp) return;

    const tick = () => {
      const elapsed = Date.now() - activeLink.clueTimestamp;
      const remaining = Math.max(0, CLUE_DURATION - elapsed);
      setClueTimeLeft(remaining);

      // Auto-cancel if clue not submitted in time (only initiator writes)
      if (remaining <= 0 && isInitiator) {
        update(ref(db, basePath), { activeLink: null });
      }
    };
    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [phase, activeLink?.clueTimestamp, isInitiator, basePath]);

  // ── Waiting timer (10s) — pauses during interception ──
  useEffect(() => {
    if (phase !== 'waiting' || !activeLink?.clueTimestamp) return;

    // Pause timer while defender intercept is in progress (typing or pending confirmation)
    const interceptStatus = activeLink?.defenderIntercept?.confirmed;
    if (interceptStatus === 'pending' || interceptStatus === 'typing') return;

    const pausedMs = activeLink?.interceptPausedMs || 0;

    const tick = () => {
      const elapsed = Date.now() - activeLink.clueTimestamp - pausedMs;
      const remaining = Math.max(0, WAITING_DURATION - elapsed);
      setWaitingTimeLeft(remaining);

      // Auto-resolve when timer expires (only initiator writes)
      if (remaining <= 0 && isInitiator) {
        if (candidates.length === 1) {
          // Auto-pick the only candidate
          update(ref(db, `${basePath}/activeLink`), {
            chosenUid: candidates[0],
            phase: 'countdown',
            countdownStart: Date.now(),
          });
        } else if (candidates.length > 1) {
          // Move to choosing phase (initiator picks)
          update(ref(db, `${basePath}/activeLink`), { phase: 'choosing' });
        } else {
          // No candidates → cancel link
          update(ref(db, basePath), { activeLink: null });
        }
      }
    };
    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [phase, activeLink?.clueTimestamp, activeLink?.defenderIntercept, activeLink?.interceptPausedMs, isInitiator, candidates, basePath]);

  // ── Countdown timer (3-2-1) ──
  useEffect(() => {
    if (phase !== 'countdown') {
      setCountdown(null);
      return;
    }

    const start = activeLink?.countdownStart || Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, COUNTDOWN_DURATION - elapsed);
      const count = Math.ceil(remaining / 1000);
      setCountdown(count > 0 ? count : 0);

      // Countdown finished → advance to reveal (only initiator writes)
      if (remaining <= 0 && isInitiator) {
        clearInterval(countdownIntervalRef.current);

        if (mode === 'ecrit') {
          // Written mode: advance to reveal (words should already be submitted)
          update(ref(db, `${basePath}/activeLink`), { phase: 'reveal' });
        } else {
          // Oral mode: advance to reveal (players say words out loud)
          update(ref(db, `${basePath}/activeLink`), { phase: 'reveal' });
        }
      }
    };
    tick();
    countdownIntervalRef.current = setInterval(tick, 100);
    return () => clearInterval(countdownIntervalRef.current);
  }, [phase, activeLink?.countdownStart, isInitiator, mode, basePath]);

  // ── Written mode: auto-compute result when both words are in ──
  // Triggers during countdown (both submitted early) OR reveal phase
  useEffect(() => {
    if (mode !== 'ecrit') return;
    if (phase !== 'reveal' && phase !== 'countdown') return;
    if (!activeLink?.initiatorWord || !activeLink?.responderWord) return;
    if (activeLink.result) return; // Already computed

    // Only initiator writes the result
    if (!isInitiator) return;

    const word1 = normalizeWord(activeLink.initiatorWord);
    const word2 = normalizeWord(activeLink.responderWord);
    const isMatch = word1 === word2;

    update(ref(db, `${basePath}/activeLink`), {
      phase: 'result',
      result: isMatch ? 'match' : 'no_match',
    });
  }, [phase, mode, activeLink?.initiatorWord, activeLink?.responderWord, activeLink?.result, isInitiator, basePath]);

  // ── Auto-dismiss no-match after 3s ──
  useEffect(() => {
    if (phase !== 'result') return;
    if (activeLink?.result !== 'no_match' && activeLink?.result !== 'intercepted') return;

    // Only initiator auto-clears
    if (!isInitiator) return;

    const addToHistory = async () => {
      const historyEntry = {
        initiator: players.find(p => p.uid === activeLink.initiatorUid)?.name || '?',
        responder: players.find(p => p.uid === activeLink.chosenUid)?.name || '?',
        clue: activeLink.clue || '',
        word1: activeLink.initiatorWord || '(oral)',
        word2: activeLink.responderWord || '(oral)',
        result: activeLink.result,
        timestamp: Date.now(),
      };

      const history = state?.linkHistory || [];
      await update(ref(db, basePath), {
        activeLink: null,
        linkHistory: [...history, historyEntry],
      });
    };

    autoAdvanceRef.current = setTimeout(addToHistory, 3000);
    return () => clearTimeout(autoAdvanceRef.current);
  }, [phase, activeLink?.result, isInitiator, basePath, state?.linkHistory, activeLink, players]);

  // ── Actions ──

  /**
   * Launch a new link (attacker presses "J'ai un indice!")
   * Oral mode: skip clue input, go straight to waiting (clue said out loud)
   * Written mode: go to clue phase (type the clue)
   */
  const launchClue = useCallback(async () => {
    if (activeLink) return; // Already a link in progress
    const isOral = mode === 'oral';
    await update(ref(db, basePath), {
      activeLink: {
        initiatorUid: myUid,
        clue: isOral ? '(oral)' : null,
        clueTimestamp: Date.now(),
        phase: isOral ? 'announcing' : 'clue',
        candidates: {},
        chosenUid: null,
        countdownStart: null,
        initiatorWord: null,
        responderWord: null,
        defenderIntercept: null,
        result: null,
      }
    });
  }, [activeLink, myUid, basePath, mode]);

  /**
   * Submit the clue text (initiator)
   */
  const submitClue = useCallback(async (clueText) => {
    if (!clueText?.trim() || !isInitiator) return;
    await update(ref(db, `${basePath}/activeLink`), {
      clue: clueText.trim(),
      phase: 'waiting',
      clueTimestamp: Date.now(), // Reset timer for waiting phase
    });
  }, [isInitiator, basePath]);

  /**
   * Request to link with the initiator (other attacker)
   */
  const requestLink = useCallback(async () => {
    if (!myUid || isInitiator) return;
    await update(ref(db, `${basePath}/activeLink/candidates`), {
      [myUid]: Date.now(),
    });
  }, [myUid, isInitiator, basePath]);

  /**
   * Choose a candidate to link with (initiator)
   */
  const chooseCandidate = useCallback(async (uid) => {
    if (!isInitiator) return;
    await update(ref(db, `${basePath}/activeLink`), {
      chosenUid: uid,
      phase: 'countdown',
      countdownStart: Date.now(),
    });
  }, [isInitiator, basePath]);

  /**
   * Submit word during link (written mode)
   */
  const submitLinkWord = useCallback(async (word) => {
    if (!word?.trim() || !activeLink) return;
    const field = isInitiator ? 'initiatorWord' : 'responderWord';
    await update(ref(db, `${basePath}/activeLink`), {
      [field]: word.trim().toUpperCase(),
    });
  }, [activeLink, isInitiator, basePath]);

  // Track which defenders already failed on this link
  const failedInterceptors = useMemo(
    () => activeLink?.failedInterceptors ? Object.keys(activeLink.failedInterceptors) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(activeLink?.failedInterceptors)]
  );

  /**
   * Start intercept (écrit mode) — pauses timer immediately, defender types word next
   */
  const startIntercept = useCallback(async () => {
    if (!activeLink) return;
    if (activeLink.failedInterceptors?.[myUid]) return;
    await update(ref(db, `${basePath}/activeLink`), {
      defenderIntercept: {
        defenderUid: myUid,
        guessedWord: '',
        confirmed: 'typing',
      },
      interceptStartedAt: Date.now(),
    });
  }, [activeLink, myUid, basePath]);

  /**
   * Defender intercepts the link (oral: one-step, écrit: submits typed word)
   * Each defender can only attempt once per link
   */
  const intercept = useCallback(async (guessedWord) => {
    if (!activeLink) return;
    // Already failed on this link → can't retry
    if (activeLink.failedInterceptors?.[myUid]) return;
    await update(ref(db, `${basePath}/activeLink`), {
      defenderIntercept: {
        defenderUid: myUid,
        guessedWord: guessedWord ? guessedWord.trim().toUpperCase() : '(oral)',
        confirmed: 'pending',
      },
      interceptStartedAt: activeLink.interceptStartedAt || Date.now(),
    });
  }, [activeLink, myUid, basePath]);

  /**
   * Initiator confirms/denies defender's interception
   */
  const confirmIntercept = useCallback(async (isCorrect) => {
    if (!isInitiator || !activeLink?.defenderIntercept) return;

    if (isCorrect) {
      // Intercepted → link cancelled
      const historyEntry = {
        initiator: players.find(p => p.uid === activeLink.initiatorUid)?.name || '?',
        responder: '—',
        clue: activeLink.clue || '',
        word1: activeLink.defenderIntercept.guessedWord,
        word2: '',
        result: 'intercepted',
        timestamp: Date.now(),
      };
      const history = state?.linkHistory || [];
      await update(ref(db, basePath), {
        activeLink: null,
        linkHistory: [...history, historyEntry],
      });
    } else {
      // Wrong guess → add to failedInterceptors, clear intercept, resume timer
      const failedUid = activeLink.defenderIntercept.defenderUid;
      const pausedMs = (activeLink.interceptPausedMs || 0) + (Date.now() - (activeLink.interceptStartedAt || Date.now()));
      await update(ref(db, `${basePath}/activeLink`), {
        defenderIntercept: null,
        interceptStartedAt: null,
        interceptPausedMs: pausedMs,
        [`failedInterceptors/${failedUid}`]: true,
      });
    }
  }, [isInitiator, activeLink, basePath, state?.linkHistory, players]);

  /**
   * Defender validates oral result (match or no match)
   */
  const validateOralResult = useCallback(async (isMatch) => {
    if (mode !== 'oral' || !activeLink) return;

    const historyEntry = {
      initiator: players.find(p => p.uid === activeLink.initiatorUid)?.name || '?',
      responder: players.find(p => p.uid === activeLink.chosenUid)?.name || '?',
      clue: activeLink.clue || '',
      word1: '(oral)',
      word2: '(oral)',
      result: isMatch ? 'match' : 'no_match',
      timestamp: Date.now(),
    };

    const history = state?.linkHistory || [];

    if (isMatch) {
      // Match → keep activeLink with result, defender decides reveal
      await update(ref(db, `${basePath}/activeLink`), {
        phase: 'result',
        result: 'match',
      });
    } else {
      // No match → dismiss after showing result
      await update(ref(db, basePath), {
        'activeLink/phase': 'result',
        'activeLink/result': 'no_match',
      });
    }
  }, [mode, activeLink, basePath, state?.linkHistory, players]);

  /**
   * Cancel a link (initiator or host)
   */
  const cancelLink = useCallback(async () => {
    await update(ref(db, basePath), { activeLink: null });
  }, [basePath]);

  return {
    activeLink,
    phase,
    isInitiator,
    isChosen,
    isInLink,
    candidates,
    failedInterceptors,

    // Timers
    countdown,
    waitingTimeLeft,
    clueTimeLeft,
    announcingTimeLeft,
    waitingProgress: WAITING_DURATION > 0 ? waitingTimeLeft / WAITING_DURATION : 0,

    // Constants
    WAITING_DURATION,
    CLUE_DURATION,
    ANNOUNCING_DURATION,

    // Actions
    launchClue,
    submitClue,
    startIntercept,
    requestLink,
    chooseCandidate,
    submitLinkWord,
    intercept,
    confirmIntercept,
    validateOralResult,
    cancelLink,
  };
}

/**
 * Normalize a word for comparison (written mode)
 * - Lowercase, trim, remove accents
 */
function normalizeWord(word) {
  if (!word) return '';
  return word
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
