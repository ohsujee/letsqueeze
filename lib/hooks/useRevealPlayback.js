"use client";

/**
 * useRevealPlayback — Système de reveal après bonne réponse (blind test)
 *
 * Responsabilités :
 * - Jouer le preview complet après une bonne réponse
 * - Animation de progression (rAF)
 * - Pause / Resume avec sync Firebase
 * - Drag-to-seek sur la barre de progression
 * - Sync audio multi-device (mode 'all')
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { db, ref, update } from "@/lib/firebase";
import { playSnippet, pause, resume, seek } from "@/lib/deezer/player";
import { AUDIO_SYNC_BUFFER_MS } from "@/lib/constants/blindtest";

const REVEAL_START_OFFSET = 5; // seconds
const REVEAL_DURATION = 25; // seconds (30 - 5)
const REVEAL_DURATION_MS = REVEAL_DURATION * 1000;

export function useRevealPlayback({ code, meta, serverOffset, snippetStopRef }) {
  // State
  const [showRevealScreen, setShowRevealScreen] = useState(false);
  const [revealWinner, setRevealWinner] = useState(null);
  const [revealTrack, setRevealTrack] = useState(null);
  const [revealProgress, setRevealProgress] = useState(0);
  const [isRevealPlaying, setIsRevealPlaying] = useState(false);
  const [isRevealDragging, setIsRevealDragging] = useState(false);

  // Refs
  const revealProgressBarRef = useRef(null);
  const revealAnimationRef = useRef(null);
  const revealProgressRef = useRef(0);
  const wasPlayingBeforeDragRef = useRef(false);

  // Start reveal playback
  const startRevealPlayback = async (track) => {
    const previewUrl = track?.previewUrl;
    if (!previewUrl) return;

    try {
      // Stop any current playback
      if (snippetStopRef.current) {
        await snippetStopRef.current.stop();
        snippetStopRef.current = null;
      }

      // Audio sync mode
      const audioMode = meta?.audioMode || 'single';

      if (audioMode === 'all') {
        const startAt = Date.now() + serverOffset + AUDIO_SYNC_BUFFER_MS;
        await update(ref(db, `rooms_blindtest/${code}/state`), {
          revealAudioSync: {
            startAt,
            previewUrl: previewUrl,
            action: 'play'
          }
        });
        const delay = Math.max(0, startAt - (Date.now() + serverOffset));
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      // Play full 30s preview
      const snippet = await playSnippet(previewUrl, null);
      snippetStopRef.current = snippet;
      setIsRevealPlaying(true);
      setRevealProgress(0);
      revealProgressRef.current = 0;

      // rAF progress animation
      let startTime = null;
      const animate = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const newProgress = Math.min(100, (elapsed / REVEAL_DURATION_MS) * 100);

        setRevealProgress(newProgress);
        revealProgressRef.current = newProgress;

        if (newProgress >= 100) {
          setIsRevealPlaying(false);
          update(ref(db, `rooms_blindtest/${code}/state/revealPlayback`), {
            paused: true,
            startProgress: 100
          }).catch(() => {});
          return;
        }

        revealAnimationRef.current = requestAnimationFrame(animate);
      };

      revealAnimationRef.current = requestAnimationFrame(animate);
    } catch (error) {
      console.error('[Reveal] Error starting playback:', error);
    }
  };

  // Toggle pause/resume
  const toggleRevealPlayback = async () => {
    const audioMode = meta?.audioMode || 'single';

    if (isRevealPlaying) {
      // Pause
      if (revealAnimationRef.current) {
        cancelAnimationFrame(revealAnimationRef.current);
        revealAnimationRef.current = null;
      }
      await pause();
      setIsRevealPlaying(false);

      update(ref(db, `rooms_blindtest/${code}/state/revealPlayback`), {
        paused: true,
        startProgress: revealProgressRef.current
      }).catch(() => {});

      if (audioMode === 'all') {
        update(ref(db, `rooms_blindtest/${code}/state/revealAudioSync`), {
          action: 'pause'
        }).catch(() => {});
      }
    } else {
      // Resume
      await resume();
      setIsRevealPlaying(true);

      const startProgress = revealProgressRef.current;

      update(ref(db, `rooms_blindtest/${code}/state/revealPlayback`), {
        paused: false,
        startedAt: Date.now(),
        startProgress
      }).catch(() => {});

      if (audioMode === 'all') {
        update(ref(db, `rooms_blindtest/${code}/state/revealAudioSync`), {
          action: 'resume'
        }).catch(() => {});
      }

      // Resume rAF animation
      let startTime = null;
      const animate = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progressIncrement = (elapsed / REVEAL_DURATION_MS) * 100;
        const newProgress = Math.min(100, startProgress + progressIncrement);

        setRevealProgress(newProgress);
        revealProgressRef.current = newProgress;

        if (newProgress >= 100) {
          setIsRevealPlaying(false);
          update(ref(db, `rooms_blindtest/${code}/state/revealPlayback`), {
            paused: true,
            startProgress: 100
          }).catch(() => {});
          return;
        }

        revealAnimationRef.current = requestAnimationFrame(animate);
      };

      revealAnimationRef.current = requestAnimationFrame(animate);
    }
  };

  // Seek to position
  const seekReveal = (clientX) => {
    if (!revealProgressBarRef.current) return;
    const rect = revealProgressBarRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const newProgress = Math.max(0, Math.min(100, (x / rect.width) * 100));

    setRevealProgress(newProgress);
    revealProgressRef.current = newProgress;

    const targetSec = REVEAL_START_OFFSET + (newProgress / 100) * REVEAL_DURATION;
    seek(targetSec * 1000);

    update(ref(db, `rooms_blindtest/${code}/state/revealPlayback`), {
      startedAt: Date.now(),
      startProgress: newProgress,
      paused: !isRevealPlaying
    }).catch(() => {});
  };

  // Drag handlers
  const handleRevealDragStart = (e) => {
    wasPlayingBeforeDragRef.current = isRevealPlaying;
    setIsRevealDragging(true);

    if (revealAnimationRef.current) {
      cancelAnimationFrame(revealAnimationRef.current);
      revealAnimationRef.current = null;
    }

    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    seekReveal(clientX);
  };

  const handleRevealDragMove = useCallback((e) => {
    if (!isRevealDragging) return;
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    seekReveal(clientX);
  }, [isRevealDragging]);

  const handleRevealDragEnd = useCallback(() => {
    setIsRevealDragging(false);

    if (wasPlayingBeforeDragRef.current) {
      let startTime = null;
      const startProgress = revealProgressRef.current;

      const animate = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progressIncrement = (elapsed / REVEAL_DURATION_MS) * 100;
        const updatedProgress = Math.min(100, startProgress + progressIncrement);

        setRevealProgress(updatedProgress);
        revealProgressRef.current = updatedProgress;

        if (updatedProgress >= 100) {
          setIsRevealPlaying(false);
          return;
        }

        revealAnimationRef.current = requestAnimationFrame(animate);
      };

      revealAnimationRef.current = requestAnimationFrame(animate);
    }
  }, []);

  // Global drag listeners
  useEffect(() => {
    if (isRevealDragging) {
      window.addEventListener('mousemove', handleRevealDragMove);
      window.addEventListener('mouseup', handleRevealDragEnd);
      window.addEventListener('touchmove', handleRevealDragMove);
      window.addEventListener('touchend', handleRevealDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleRevealDragMove);
      window.removeEventListener('mouseup', handleRevealDragEnd);
      window.removeEventListener('touchmove', handleRevealDragMove);
      window.removeEventListener('touchend', handleRevealDragEnd);
    };
  }, [isRevealDragging, handleRevealDragMove, handleRevealDragEnd]);

  // Trigger reveal (called by validate)
  const triggerReveal = (track, winnerInfo) => {
    setRevealWinner(winnerInfo);
    setRevealTrack(track);
    setRevealProgress(0);
    revealProgressRef.current = 0;
    setShowRevealScreen(true);
    startRevealPlayback(track);
  };

  // Reset reveal state (called by closeRevealAndNext in parent)
  const resetReveal = () => {
    if (revealAnimationRef.current) {
      cancelAnimationFrame(revealAnimationRef.current);
      revealAnimationRef.current = null;
    }
    setShowRevealScreen(false);
    setRevealWinner(null);
    setRevealTrack(null);
    setRevealProgress(0);
    revealProgressRef.current = 0;
    setIsRevealPlaying(false);

    update(ref(db, `rooms_blindtest/${code}/state`), {
      revealPlayback: null,
      revealWinner: null,
      revealAudioSync: null
    }).catch(() => {});
  };

  return {
    // State
    showRevealScreen,
    revealWinner,
    revealTrack,
    revealProgress,
    isRevealPlaying,
    revealProgressBarRef,
    // Functions
    triggerReveal,
    resetReveal,
    toggleRevealPlayback,
    handleRevealDragStart,
  };
}
