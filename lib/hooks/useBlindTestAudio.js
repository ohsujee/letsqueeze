"use client";

/**
 * useBlindTestAudio — Gestion du lecteur Deezer pour le blind test
 *
 * Responsabilités :
 * - Init/cleanup du player Deezer
 * - Play snippet à un niveau donné (avec progression)
 * - Stop / Pause
 * - Refresh des URLs expirées
 * - Preload du prochain track
 * - Unlock progressif des niveaux
 * - Tracking du plus haut niveau joué (pour scoring)
 */

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { db, ref, update, serverTimestamp, set } from "@/lib/firebase";
import { initializePlayer, playSnippet, pause, resume, seek, isPlayerReady, disconnect, preloadPreview, getPlayerState } from "@/lib/deezer/player";
import { getAllPlaylistTracks, formatTracksForGame } from "@/lib/deezer/api";
import { SNIPPET_LEVELS, AUDIO_SYNC_BUFFER_MS } from "@/lib/constants/blindtest";

export function useBlindTestAudio({ code, canControl, currentTrack, meta, state, playlist, serverOffset }) {
  // Player state
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSnippet, setCurrentSnippet] = useState(null);
  const [unlockedLevel, setUnlockedLevel] = useState(0);
  const [highestLevelPlayed, setHighestLevelPlayed] = useState(null);
  const [playerError, setPlayerError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [playProgress, setPlayProgress] = useState(0);

  // Refs
  const snippetStopRef = useRef(null);
  const unlockTimeoutRef = useRef(null);
  const hasTriedRefresh = useRef(false);
  const progressIntervalRef = useRef(null);

  // Points based on highest level played
  const pointsEnJeu = useMemo(() => {
    if (highestLevelPlayed === null) return SNIPPET_LEVELS[0].start;
    const levelConfig = SNIPPET_LEVELS[highestLevelPlayed];
    return levelConfig?.start || 0;
  }, [highestLevelPlayed]);

  // Pause music
  const pauseMusic = useCallback(async () => {
    if (snippetStopRef.current) {
      await snippetStopRef.current.stop();
      snippetStopRef.current = null;
    }
    await pause();
    setIsPlaying(false);
  }, []);

  // Refresh track URLs from Deezer
  const refreshTrackUrls = useCallback(async () => {
    if (!playlist?.id || isRefreshing) return false;

    setIsRefreshing(true);
    setPlayerError("Rafraîchissement des URLs...");

    try {
      const freshTracks = await getAllPlaylistTracks(playlist.id);
      const formattedTracks = formatTracksForGame(freshTracks);

      const refreshedTracks = playlist.tracks.map(oldTrack => {
        const fresh = formattedTracks.find(t => t.id === oldTrack.id);
        if (fresh) return { ...oldTrack, previewUrl: fresh.previewUrl };
        return oldTrack;
      });

      await set(ref(db, `rooms_blindtest/${code}/meta/playlist/tracks`), refreshedTracks);

      setPlayerError(null);
      setIsRefreshing(false);
      return true;
    } catch (error) {
      console.error("[DeezTest Host] Failed to refresh URLs:", error);
      setPlayerError("Impossible de rafraîchir les URLs");
      setIsRefreshing(false);
      return false;
    }
  }, [playlist?.id, playlist?.tracks, code, isRefreshing]);

  // Initialize Deezer Player
  useEffect(() => {
    const init = async () => {
      try {
        await initializePlayer({
          onReady: () => {
            setPlayerReady(true);
            setPlayerError(null);
          },
          onStateChange: (playerState) => {
            setIsPlaying(!playerState?.paused);
          },
          onError: (error) => {
            console.error("[DeezTest Host] Player error:", error);
            setPlayerError(error.message || "Erreur audio");
          },
          onEnded: () => {
            setIsPlaying(false);
          }
        });
      } catch (error) {
        console.error("[DeezTest Host] Failed to init player:", error);
        setPlayerError(error.message || "Échec d'initialisation");
      }
    };
    init();
    return () => disconnect();
  }, []);

  // Preload track
  useEffect(() => {
    if (!canControl || !playerReady || !currentTrack?.previewUrl) return;
    const timer = setTimeout(async () => {
      try {
        await preloadPreview(currentTrack.previewUrl);
      } catch (e) {
        // Ignore preload errors
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [canControl, playerReady, currentTrack?.previewUrl]);

  // Play snippet at specific level
  const playLevel = async (level) => {
    if (!canControl || !currentTrack || !playerReady) return;

    setIsAudioLoading(true);

    if (snippetStopRef.current) {
      await snippetStopRef.current.stop();
    }

    const config = SNIPPET_LEVELS[level];
    const previewUrl = currentTrack.previewUrl;

    if (!previewUrl) {
      setPlayerError("Cette piste n'a pas d'extrait disponible");
      setIsAudioLoading(false);
      return;
    }

    // Audio sync mode
    const audioMode = meta?.audioMode || 'single';

    if (audioMode === 'all') {
      const startAt = Date.now() + serverOffset + AUDIO_SYNC_BUFFER_MS;
      await update(ref(db, `rooms_blindtest/${code}/state`), {
        snippetLevel: level,
        highestSnippetLevel: Math.max(state?.highestSnippetLevel ?? -1, level),
        audioSync: {
          startAt,
          previewUrl: previewUrl,
          duration: config.duration || 25000,
          level: level
        },
        lastRevealAt: serverTimestamp()
      });
      const delay = Math.max(0, startAt - (Date.now() + serverOffset));
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    try {
      const snippet = await playSnippet(previewUrl, config.duration);
      snippetStopRef.current = snippet;
      setIsPlaying(true);
      setCurrentSnippet(level);
      setPlayerError(null);
      setIsAudioLoading(false);
      hasTriedRefresh.current = false;

      // Progress animation
      setPlayProgress(0);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      const duration = config.duration || 25000;
      const startTime = Date.now();
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / duration) * 100, 100);
        setPlayProgress(progress);
        if (progress >= 100) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
      }, 50);

      setHighestLevelPlayed(prev => Math.max(prev ?? -1, level));

      if (unlockTimeoutRef.current) {
        clearTimeout(unlockTimeoutRef.current);
        unlockTimeoutRef.current = null;
      }

      const isLastLevel = level === SNIPPET_LEVELS.length - 1;
      if (!isLastLevel && config.duration && level >= unlockedLevel) {
        const unlockDelay = Math.floor(config.duration * 0.9);
        unlockTimeoutRef.current = setTimeout(() => {
          setUnlockedLevel(prev => Math.max(prev, level + 1));
        }, unlockDelay);
      }

      // Mode 'single': update Firebase
      if (audioMode === 'single') {
        const currentHighest = state?.highestSnippetLevel ?? -1;
        const newHighest = Math.max(currentHighest, level);
        await update(ref(db, `rooms_blindtest/${code}/state`), {
          snippetLevel: level,
          highestSnippetLevel: newHighest,
          lastRevealAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("[DeezTest Host] Error playing snippet:", error);
      setIsAudioLoading(false);

      if (!hasTriedRefresh.current) {
        hasTriedRefresh.current = true;
        const refreshed = await refreshTrackUrls();
        if (refreshed) {
          setPlayerError("URLs expirées - Rafraîchies! Réessayez.");
        }
      } else {
        setPlayerError(error.message || "Erreur de lecture");
      }
    }
  };

  // Full stop
  const stopMusic = async () => {
    if (unlockTimeoutRef.current) {
      clearTimeout(unlockTimeoutRef.current);
      unlockTimeoutRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (snippetStopRef.current) {
      await snippetStopRef.current.stop();
      snippetStopRef.current = null;
    }
    await pause();
    setIsPlaying(false);
    setCurrentSnippet(null);
    setPlayProgress(0);
  };

  // Reset state for next track (called by parent after nextTrack/changeSong)
  const resetForNextTrack = () => {
    setCurrentSnippet(null);
    setUnlockedLevel(0);
    setHighestLevelPlayed(null);
    setPlayerError(null);
  };

  return {
    // State
    playerReady,
    isPlaying,
    currentSnippet,
    unlockedLevel,
    highestLevelPlayed,
    playerError,
    isRefreshing,
    isAudioLoading,
    playProgress,
    pointsEnJeu,
    // Refs (needed by reveal system)
    snippetStopRef,
    // Functions
    playLevel,
    stopMusic,
    pauseMusic,
    refreshTrackUrls,
    resetForNextTrack,
  };
}
