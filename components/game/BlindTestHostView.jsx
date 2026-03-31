"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  auth, db, ref, onValue, update, runTransaction, serverTimestamp, set, increment
} from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { GameEndTransition } from "@/components/transitions";
import ExitButton from "@/lib/components/ExitButton";
import Leaderboard from "@/components/game/Leaderboard";
import PlayerManager from "@/components/game/PlayerManager";
import GameStatusBanners from "@/components/game/GameStatusBanners";
import HostDisconnectAlert from "@/components/game/HostDisconnectAlert";
import BuzzValidationModal from "@/components/game/BuzzValidationModal";
import { SkipForward, X, Check, Music, Play, Pause, Bell, RefreshCw, Shuffle } from "lucide-react";
import BlindTestRevealScreen from "@/components/game/BlindTestRevealScreen";
import { SNIPPET_LEVELS, LOCKOUT_MS, WRONG_PENALTY, getPointsForLevel, AUDIO_SYNC_BUFFER_MS } from "@/lib/constants/blindtest";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { useHostDisconnect } from "@/lib/hooks/useHostDisconnect";
import { useInactivityDetection } from "@/lib/hooks/useInactivityDetection";
import { useServerTime } from "@/lib/hooks/useServerTime";
import { useSound } from "@/lib/hooks/useSound";
import { getRandomUnplayedTrack } from "@/lib/deezer/api";
import { usePlaylistHistory } from "@/lib/hooks/usePlaylistHistory";
import { useBlindTestAudio } from "@/lib/hooks/useBlindTestAudio";
import { useBlindTestBuzz } from "@/lib/hooks/useBlindTestBuzz";
import { useRevealPlayback } from "@/lib/hooks/useRevealPlayback";
import './BlindTestHostView.css';

const DEEZER_PURPLE = '#A238FF';
const DEEZER_PINK = '#FF0092';
const DEEZER_LIGHT = '#C574FF';

/**
 * BlindTestHostView - Vue partagée pour host et asker (Party Mode)
 *
 * @param {string} code - Code de la room
 * @param {boolean} isActualHost - true si c'est le vrai host (page /host), false si c'est un asker en Party Mode
 * @param {function} onAdvanceAsker - Callback pour avancer à l'asker suivant (Party Mode uniquement)
 */
export default function BlindTestHostView({ code, isActualHost = true, onAdvanceAsker }) {
  const router = useRouter();

  const [meta, setMeta] = useState(null);
  const [state, setState] = useState(null);
  const [playlist, setPlaylist] = useState(null);
  const [showEndTransition, setShowEndTransition] = useState(false);
  const endTransitionTriggeredRef = useRef(false);
  const isValidatingRef = useRef(false);

  // Centralized players hook
  const { players } = usePlayers({ roomCode: code, roomPrefix: 'rooms_blindtest' });

  // Server time sync (300ms tick for score updates)
  const { serverNow, offset: serverOffset } = useServerTime(300);

  // Change song animation state
  const [isChangingSong, setIsChangingSong] = useState(false);

  // Reveal system (after correct answer)
  const reveal = useRevealPlayback({ code, meta, serverOffset, snippetStopRef });

  // Playlist history (to avoid replaying same tracks)
  const { markTracksAsPlayed, getPlayedTracks } = usePlaylistHistory();

  const myUid = auth.currentUser?.uid;
  // Pour les permissions Firebase, on est "host" si on est le vrai host OU si on est l'asker actuel
  const canControl = isActualHost || (meta?.gameMasterMode === 'party' && state?.currentAskerUid === myUid);

  // Derived values needed before audio hook
  const total = playlist?.tracks?.length || 0;
  const qIndex = state?.currentIndex || 0;
  const currentTrack = playlist?.tracks?.[qIndex];

  // Audio system (player, snippets, progress, levels)
  const {
    playerReady, isPlaying, currentSnippet, unlockedLevel,
    highestLevelPlayed, playerError, isRefreshing, isAudioLoading,
    playProgress, pointsEnJeu, snippetStopRef,
    playLevel, stopMusic, pauseMusic, refreshTrackUrls, resetForNextTrack,
  } = useBlindTestAudio({ code, canControl, currentTrack, meta, state, playlist, serverOffset });

  // (Audio init, pauseMusic, refreshTrackUrls, preload → useBlindTestAudio)

  // DB listeners
  useEffect(() => {
    const u1 = onValue(ref(db, `rooms_blindtest/${code}/meta`), s => setMeta(s.val()));
    const u2 = onValue(ref(db, `rooms_blindtest/${code}/state`), s => setState(s.val()));
    const u3 = onValue(ref(db, `rooms_blindtest/${code}/meta/playlist`), s => setPlaylist(s.val()));
    return () => { u1(); u2(); u3(); };
  }, [code]);

  // Redirect when phase changes
  useEffect(() => {
    if (state?.phase === "ended" && !endTransitionTriggeredRef.current) {
      endTransitionTriggeredRef.current = true;
      setShowEndTransition(true);
    }
    if (state?.phase === "lobby") router.replace(`/blindtest/room/${code}`);
  }, [state?.phase, router, code]);

  // Room guard - détecte fermeture room
  // Note: isHost doit être basé sur isActualHost (pour le comportement de fermeture)
  const { isHostTemporarilyDisconnected, hostDisconnectedAt } = useRoomGuard({
    roomCode: code,
    roomPrefix: 'rooms_blindtest',
    playerUid: myUid,
    isHost: isActualHost
  });

  // Host disconnect - gère la grace period si l'hôte perd sa connexion
  // UNIVERSAL: Passer hostUid (meta.hostUid) - le hook détermine automatiquement si on est l'hôte
  const {
    isHostMarkedDisconnected: isHostDisconnected,
    isFirebaseConnected,
    forceReconnect
  } = useHostDisconnect({
    roomCode: code,
    roomPrefix: 'rooms_blindtest',
    hostUid: meta?.hostUid
  });

  // Inactivity detection
  useInactivityDetection({
    roomCode: code,
    roomPrefix: 'rooms_blindtest',
    playerUid: myUid,
    inactivityTimeout: 30000
  });

  const progressLabel = total ? `${Math.min(qIndex + 1, total)} / ${total}` : "";
  const snippetLevel = state?.snippetLevel || 0;
  const currentLevelConfig = SNIPPET_LEVELS[snippetLevel];

  // Sounds
  const playBuzz = useSound("/sounds/quiz-buzzer.wav");
  const playCorrect = useSound("/sounds/quiz-good-answer.wav");
  const playWrong = useSound("/sounds/quiz-bad-answer.wav");
  const prevLock = useRef(null);

  // Buzz system
  const { resetBuzzers, isResolving } = useBlindTestBuzz({
    code, canControl, pauseMusic, playBuzz, playLevel, currentSnippet, currentTrack
  });

  // Exit and end game
  async function exitAndEndGame() {
    if (code) {
      await stopMusic();
      await update(ref(db, `rooms_blindtest/${code}/state`), { phase: "ended" });
      if (isActualHost) {
        await update(ref(db, `rooms_blindtest/${code}/meta`), { closed: true });
      }
    }
    router.push('/home');
  }

  // (resetBuzzers → useBlindTestBuzz)

  // Validate correct answer
  async function validate() {
    if (isValidatingRef.current || !canControl || !currentTrack || !state?.lockUid) return;
    isValidatingRef.current = true;

    try {
    playCorrect();

    // Marquer la track comme jouée dans l'historique
    if (playlist?.id && currentTrack?.id) {
      markTracksAsPlayed(playlist.id, [currentTrack.id]);
    }

    const uid = state.lockUid;
    const pts = pointsEnJeu;
    const winner = players.find(p => p.uid === uid);
    const levelLabel = currentSnippet !== null ? SNIPPET_LEVELS[currentSnippet]?.label : '?';

    const winnerInfo = {
      name: winner?.name || 'Joueur',
      points: pts,
      level: levelLabel
    };

    // Tout dans un seul update atomique : scores + reveal state
    const updates = {};
    updates[`rooms_blindtest/${code}/players/${uid}/score`] = increment(pts);
    updates[`rooms_blindtest/${code}/players/${uid}/correctAnswers`] = increment(1);

    if (meta?.mode === "équipes") {
      const player = players.find(p => p.uid === uid);
      const teamId = player?.teamId;
      if (teamId) {
        updates[`rooms_blindtest/${code}/meta/teams/${teamId}/score`] = increment(pts);
      }
    }

    updates[`rooms_blindtest/${code}/state/revealed`] = true;
    updates[`rooms_blindtest/${code}/state/buzzBanner`] = "";
    updates[`rooms_blindtest/${code}/state/buzz`] = null;
    updates[`rooms_blindtest/${code}/state/pausedAt`] = null;
    updates[`rooms_blindtest/${code}/state/lockedAt`] = null;
    // lockUid kept so players see winner name
    updates[`rooms_blindtest/${code}/state/revealWinner`] = winnerInfo;
    updates[`rooms_blindtest/${code}/state/revealPlayback`] = {
      startedAt: Date.now(),
      startProgress: 0,
      paused: false
    };

    await update(ref(db), updates);

    // Show reveal screen + start playback
    reveal.triggerReveal(currentTrack, winnerInfo);

    } finally {
      isValidatingRef.current = false;
    }
  }


  // Close reveal and advance to next track (orchestrates reveal + audio + tracks)
  const closeRevealAndNext = async () => {
    reveal.resetReveal();
    await stopMusic();
    await nextTrack();
  };

  // Wrong answer
  async function wrong() {
    if (isValidatingRef.current || !canControl || !state?.lockUid) return;
    isValidatingRef.current = true;

    try {
    playWrong();

    const uid = state.lockUid;
    // Timestamp frais (Date.now() + offset) plutôt que serverNow périmé (React state, 300ms stale)
    const until = Date.now() + serverOffset + LOCKOUT_MS;
    const levelToReplay = currentSnippet;

    await runTransaction(ref(db, `rooms_blindtest/${code}/players/${uid}/score`), (cur) => Math.max(0, (cur || 0) - WRONG_PENALTY));
    await runTransaction(ref(db, `rooms_blindtest/${code}/players/${uid}/wrongAnswers`), (cur) => (cur || 0) + 1);

    if (meta?.mode === "équipes") {
      const player = players.find(p => p.uid === uid);
      const teamId = player?.teamId;
      if (teamId) {
        await runTransaction(ref(db, `rooms_blindtest/${code}/meta/teams/${teamId}/score`), (cur) => Math.max(0, (cur || 0) - WRONG_PENALTY));
      }
    }

    const updates = {};

    if (meta?.mode === "équipes") {
      const player = players.find(p => p.uid === uid);
      const teamId = player?.teamId;
      if (teamId) {
        players.filter(p => p.teamId === teamId).forEach(p => {
          updates[`rooms_blindtest/${code}/players/${p.uid}/blockedUntil`] = until;
        });
      } else {
        updates[`rooms_blindtest/${code}/players/${uid}/blockedUntil`] = until;
      }
    } else {
      updates[`rooms_blindtest/${code}/players/${uid}/blockedUntil`] = until;
    }
    updates[`rooms_blindtest/${code}/state/lockUid`] = null;
    updates[`rooms_blindtest/${code}/state/buzzBanner`] = "";
    updates[`rooms_blindtest/${code}/state/buzz`] = null;
    updates[`rooms_blindtest/${code}/state/pausedAt`] = null;
    updates[`rooms_blindtest/${code}/state/lockedAt`] = null;

    isResolving.current = false;

    await update(ref(db), updates);
    await import('firebase/database').then(m =>
      m.remove(m.ref(db, `rooms_blindtest/${code}/state/pendingBuzzes`))
    ).catch(() => {});

    if (levelToReplay !== null && currentTrack) {
      await playLevel(levelToReplay);
    }

    } finally {
      isValidatingRef.current = false;
    }
  }

  // Skip to next track
  async function nextTrack() {
    await stopMusic();

    const next = qIndex + 1;
    if (next >= total) {
      await update(ref(db, `rooms_blindtest/${code}/state`), {
        phase: "ended",
        lockUid: null,
        buzzBanner: "",
        buzz: null,
        revealed: false,
        pausedAt: null,
        lockedAt: null,
        revealPlayback: null,
        revealWinner: null,
        audioSync: null,
        revealAudioSync: null,
      });
      return;
    }

    const updates = {};
    players.forEach(p => {
      updates[`rooms_blindtest/${code}/players/${p.uid}/blockedUntil`] = 0;
    });
    updates[`rooms_blindtest/${code}/state/currentIndex`] = next;
    updates[`rooms_blindtest/${code}/state/revealed`] = false;
    updates[`rooms_blindtest/${code}/state/snippetLevel`] = 0;
    updates[`rooms_blindtest/${code}/state/highestSnippetLevel`] = -1;
    updates[`rooms_blindtest/${code}/state/lockUid`] = null;
    updates[`rooms_blindtest/${code}/state/pausedAt`] = null;
    updates[`rooms_blindtest/${code}/state/lockedAt`] = null;
    updates[`rooms_blindtest/${code}/state/buzzBanner`] = "";
    updates[`rooms_blindtest/${code}/state/buzz`] = null;
    updates[`rooms_blindtest/${code}/state/revealPlayback`] = null;
    updates[`rooms_blindtest/${code}/state/revealWinner`] = null;
    updates[`rooms_blindtest/${code}/state/audioSync`] = null;
    updates[`rooms_blindtest/${code}/state/revealAudioSync`] = null;

    isResolving.current = false;

    await update(ref(db), updates);
    await import('firebase/database').then(m =>
      m.remove(m.ref(db, `rooms_blindtest/${code}/state/pendingBuzzes`))
    ).catch(() => {});
    resetForNextTrack();

    // Party Mode: advance to next asker
    if (onAdvanceAsker) {
      await onAdvanceAsker();
    }
  }

  async function skip() {
    if (!canControl || total === 0) return;
    // Marquer la track comme jouée même si skippée
    if (playlist?.id && currentTrack?.id) {
      markTracksAsPlayed(playlist.id, [currentTrack.id]);
    }
    await nextTrack();
  }

  // Change to a different random track from the playlist (fetches from API)
  async function changeSong() {
    if (!canControl || total === 0 || isChangingSong || !playlist?.id) return;

    setIsChangingSong(true);
    await stopMusic();

    // Marquer l'ancienne track comme jouée pour qu'elle ne revienne jamais
    if (currentTrack?.id) {
      markTracksAsPlayed(playlist.id, [currentTrack.id]);
    }

    try {
      // Get IDs to exclude: currently loaded tracks + already played tracks
      const loadedTrackIds = playlist.tracks.map(t => t.id);
      const playedTrackIds = getPlayedTracks(playlist.id);
      const excludeIds = [...new Set([...loadedTrackIds, ...playedTrackIds])];

      // Fetch a new unplayed track from the API
      const newTrack = await getRandomUnplayedTrack(playlist.id, excludeIds);

      if (!newTrack) {
        // No new track available, fall back to using a remaining track
        const remainingIndices = [];
        for (let i = qIndex + 1; i < total; i++) {
          remainingIndices.push(i);
        }

        if (remainingIndices.length === 0) {
          setIsChangingSong(false);
          return;
        }

        // Pick a random remaining track to replace the current one
        const randomIdx = remainingIndices[Math.floor(Math.random() * remainingIndices.length)];
        const newTracks = [...playlist.tracks];

        // Replace current track with the selected remaining track
        newTracks[qIndex] = newTracks[randomIdx];
        // Remove the track at randomIdx (now a duplicate) - this reduces total by 1
        newTracks.splice(randomIdx, 1);

        await set(ref(db, `rooms_blindtest/${code}/meta/playlist/tracks`), newTracks);
      } else {
        // Replace current track with the new one from API
        const newTracks = [...playlist.tracks];
        newTracks[qIndex] = {
          id: newTrack.id,
          title: newTrack.title,
          artist: newTrack.artist,
          previewUrl: newTrack.previewUrl,
          albumArt: newTrack.albumArt,
        };

        await set(ref(db, `rooms_blindtest/${code}/meta/playlist/tracks`), newTracks);
      }

      // Reset l'état local pour la nouvelle track
      resetForNextTrack();

      // Reset les buzzers au cas où
      await update(ref(db, `rooms_blindtest/${code}/state`), {
        lockUid: null,
        buzzBanner: "",
        buzz: null,
        pausedAt: null,
        lockedAt: null,
        snippetLevel: 0,
        highestSnippetLevel: -1,
        revealed: false,
        revealPlayback: null,
        revealWinner: null,
        audioSync: null
      });
    } catch (error) {
      console.error('[DeezTest] Error changing song:', error);
    }

    // Réactiver le bouton après un court délai
    setTimeout(() => setIsChangingSong(false), 100);
  }

  async function end() {
    if (canControl) {
      await stopMusic();
      await update(ref(db, `rooms_blindtest/${code}/state`), { phase: "ended" });
    }
  }

  const lockedName = state?.lockUid ? (players.find(p => p.uid === state.lockUid)?.name || state.lockUid) : "—";

  return (
    <div className="deeztest-host-page game-page">
      {/* Game End Transition */}
      <AnimatePresence>
        {showEndTransition && (
          <GameEndTransition
            variant="deeztest"
            onComplete={() => router.replace(`/blindtest/game/${code}/end`)}
          />
        )}
      </AnimatePresence>

      {/* Connection Status Banners */}
      <GameStatusBanners
        isHost={isActualHost}
        isHostTemporarilyDisconnected={isHostTemporarilyDisconnected}
        hostDisconnectedAt={hostDisconnectedAt}
      />

      {/* Host Disconnect Alert - shown when host is marked as disconnected */}
      {isActualHost && (
        <HostDisconnectAlert
          isDisconnected={isHostDisconnected}
          isFirebaseConnected={isFirebaseConnected}
          onReconnect={forceReconnect}
        />
      )}

      {/* Header */}
      <header className="game-header deeztest">
        <div className="game-header-content">
          <div className="game-header-left">
            <div className="game-header-progress deeztest">{progressLabel}</div>
            <div className="game-header-title">{playlist?.name || 'Blind Test'}</div>
          </div>
          <div className="game-header-right">
            {isActualHost && (
              <PlayerManager
                players={players}
                roomCode={code}
                roomPrefix="rooms_blindtest"
                hostUid={meta?.hostUid}
                variant="deeztest"
                phase="playing"
              />
            )}
            <ExitButton
              variant="header"
              confirmMessage={isActualHost
                ? "Voulez-vous vraiment quitter ? La partie sera abandonnée pour tous les joueurs."
                : "Voulez-vous vraiment quitter ?"
              }
              onExit={exitAndEndGame}
            />
          </div>
        </div>
      </header>

      {/* Buzz Modal */}
      <BuzzValidationModal
        isOpen={!!state?.lockUid}
        playerName={lockedName}
        gameColor={DEEZER_PURPLE}
        answerValue={currentTrack && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            {currentTrack.albumArt && (
              <img
                src={currentTrack.albumArt}
                alt="Album"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 8,
                  objectFit: 'cover',
                  flexShrink: 0
                }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontWeight: 600,
                fontSize: '1rem',
                color: 'white',
                marginBottom: 4
              }}>{currentTrack.title}</div>
              <div style={{
                fontSize: '0.85rem',
                color: 'rgba(255,255,255,0.6)'
              }}>{currentTrack.artist}</div>
            </div>
          </div>
        )}
        points={pointsEnJeu}
        onCorrect={validate}
        onWrong={wrong}
        onCancel={resetBuzzers}
      />

      {/* Reveal Screen - Shown after correct answer */}
      <BlindTestRevealScreen
        show={reveal.showRevealScreen}
        track={reveal.revealTrack}
        winner={reveal.revealWinner}
        isPlaying={reveal.isRevealPlaying}
        progress={reveal.revealProgress}
        isController={true}
        onTogglePlayback={reveal.toggleRevealPlayback}
        onNext={closeRevealAndNext}
        onDragStart={reveal.handleRevealDragStart}
        progressBarRef={reveal.revealProgressBarRef}
      />

      {/* Main Content */}
      <main className="game-content deeztest">
        {/* Track Card */}
        <AnimatePresence mode="wait">
          {currentTrack && (
            <motion.div
              className="track-card"
              key={`track-${currentTrack.id}`}
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.97 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* Track Header with Album Art */}
              <div className="track-header">
                <div className="track-cover-wrapper">
                  {currentTrack.albumArt ? (
                    <img src={currentTrack.albumArt} alt="Album" className="track-cover" />
                  ) : (
                    <div className="track-cover-placeholder">
                      <Music size={32} />
                    </div>
                  )}
                  {isAudioLoading && (
                    <div className="track-loading-overlay">
                      <div className="track-loading-spinner"></div>
                    </div>
                  )}
                  {isPlaying && !isAudioLoading && (
                  <div className="track-playing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                )}
              </div>
              <div className="track-meta">
                <span className="track-title-host">{currentTrack.title}</span>
                <span className="track-artist-host">{currentTrack.artist}</span>
                <div className="track-points-badge">
                  <span className="points-value">{pointsEnJeu}</span>
                  <span className="points-label">pts</span>
                </div>
              </div>
            </div>

            {/* Player Status */}
            {!playerReady && (
              <div className="player-status warning">
                <div className="status-spinner"></div>
                <span>{playerError || 'Initialisation du lecteur audio...'}</span>
              </div>
            )}
            {playerReady && playerError && (
              <div className="player-status error">
                <span>{playerError}</span>
                {!isRefreshing && (
                  <button
                    className="refresh-btn"
                    onClick={refreshTrackUrls}
                    title="Rafraîchir les URLs"
                  >
                    <RefreshCw size={16} />
                  </button>
                )}
                {isRefreshing && <div className="status-spinner small"></div>}
              </div>
            )}
          </motion.div>
          )}
        </AnimatePresence>
        {!currentTrack && (
          <div className="track-card track-empty">
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div>Chargement...</div>
          </div>
        )}

        {/* Snippet Level Timeline - Outside track-card for full width */}
        {currentTrack && (
          <div className="snippet-timeline">
            <div className="timeline-bar">
              {SNIPPET_LEVELS.map((level, idx) => {
                const isLocked = idx > unlockedLevel;
                const isCurrent = currentSnippet === idx;

                return (
                  <motion.button
                    key={idx}
                    className={`timeline-segment ${isCurrent ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
                    onClick={() => playLevel(idx)}
                    disabled={!playerReady || isLocked}
                    whileHover={!isLocked ? { y: -2 } : {}}
                    whileTap={!isLocked ? { scale: 0.98 } : {}}
                  >
                    <div
                      className="segment-fill"
                      style={{
                        width: isCurrent ? `${playProgress}%` : (currentSnippet !== null && idx < currentSnippet ? '100%' : '0%')
                      }}
                    />
                    <span className="segment-duration">{level.label}</span>
                    <Play size={14} fill="currentColor" className="segment-play-icon" />
                  </motion.button>
                );
              })}
            </div>
            <div className="timeline-points">
              {SNIPPET_LEVELS.map((level, idx) => {
                const isCurrent = currentSnippet === idx;
                return (
                  <div key={idx} className={`points-label ${isCurrent ? 'active' : ''}`}>
                    <span className="points-value">+{level.start}</span>
                    <span className="points-text">points</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <Leaderboard players={players} mode={meta?.mode} teams={meta?.teams} />
      </main>

      {/* Footer Actions */}
      <footer className="game-footer deeztest">
        <div className="host-actions">
          <button
            className="action-btn action-change deeztest"
            onClick={changeSong}
            disabled={isChangingSong}
            title="Changer de chanson"
          >
            <Shuffle size={20} />
            <span>Changer</span>
          </button>
          <button className="action-btn action-skip deeztest" onClick={skip}>
            <SkipForward size={20} />
            <span>Passer</span>
          </button>
          <button className="action-btn action-end deeztest" onClick={end}>
            <X size={20} />
            <span>Fin</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
