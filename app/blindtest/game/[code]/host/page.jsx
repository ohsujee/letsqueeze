"use client";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  auth, db, ref, onValue, update, runTransaction, serverTimestamp
} from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import ExitButton from "@/lib/components/ExitButton";
import Leaderboard from "@/components/game/Leaderboard";
import { initializePlayer, playSnippet, pause, resume, isPlayerReady, disconnect } from "@/lib/spotify/player";
import { Play, Pause, SkipForward, X, Check, RotateCcw, Music } from "lucide-react";

// Scoring config for blind test
const SNIPPET_LEVELS = [
  { duration: 1000, label: "1s", start: 200, floor: 150 },
  { duration: 3000, label: "3s", start: 150, floor: 100 },
  { duration: 10000, label: "10s", start: 100, floor: 75 },
  { duration: null, label: "Full", start: 50, floor: 25 }
];

const LOCKOUT_MS = 8000;
const WRONG_PENALTY = 25;

function useSound(url) {
  const aRef = useRef(null);
  useEffect(() => {
    aRef.current = typeof Audio !== "undefined" ? new Audio(url) : null;
    if (aRef.current) {
      aRef.current.preload = "auto";
      aRef.current.volume = 0.5;
    }
  }, [url]);
  return useCallback(() => {
    if (aRef.current) {
      aRef.current.currentTime = 0;
      aRef.current.play().catch(() => {});
    }
  }, []);
}

export default function BlindTestHostGame() {
  const { code } = useParams();
  const router = useRouter();

  const [meta, setMeta] = useState(null);
  const [state, setState] = useState(null);
  const [players, setPlayers] = useState([]);
  const [playlist, setPlaylist] = useState(null);

  // Spotify player state
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSnippet, setCurrentSnippet] = useState(null);
  const snippetStopRef = useRef(null);

  // Server time sync
  const [localNow, setLocalNow] = useState(Date.now());
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const off = onValue(ref(db, ".info/serverTimeOffset"), s => setOffset(Number(s.val()) || 0));
    const id = setInterval(() => setLocalNow(Date.now()), 200);
    return () => { clearInterval(id); off(); };
  }, []);
  const serverNow = localNow + offset;

  // Initialize Spotify Player
  useEffect(() => {
    const init = async () => {
      try {
        await initializePlayer({
          onReady: () => setPlayerReady(true),
          onStateChange: (playerState) => {
            setIsPlaying(!playerState?.paused);
          },
          onError: (error) => {
            console.error("Spotify player error:", error);
          }
        });
      } catch (error) {
        console.error("Failed to init player:", error);
      }
    };
    init();

    return () => {
      disconnect();
    };
  }, []);

  // DB listeners
  useEffect(() => {
    const u1 = onValue(ref(db, `rooms_blindtest/${code}/meta`), s => setMeta(s.val()));
    const u2 = onValue(ref(db, `rooms_blindtest/${code}/state`), s => setState(s.val()));
    const u3 = onValue(ref(db, `rooms_blindtest/${code}/players`), s => {
      const v = s.val() || {}; setPlayers(Object.values(v));
    });
    const u4 = onValue(ref(db, `rooms_blindtest/${code}/meta/playlist`), s => setPlaylist(s.val()));
    return () => { u1(); u2(); u3(); u4(); };
  }, [code]);

  // Redirect when phase changes
  useEffect(() => {
    if (state?.phase === "ended") router.replace(`/blindtest/game/${code}/end`);
    if (state?.phase === "lobby") router.replace(`/blindtest/room/${code}`);
  }, [state?.phase, router, code]);

  const isHost = meta?.hostUid === auth.currentUser?.uid;
  const total = playlist?.tracks?.length || 0;
  const qIndex = state?.currentIndex || 0;
  const currentTrack = playlist?.tracks?.[qIndex];
  const progressLabel = total ? `${Math.min(qIndex + 1, total)} / ${total}` : "";
  const snippetLevel = state?.snippetLevel || 0;
  const currentLevelConfig = SNIPPET_LEVELS[snippetLevel];

  // Calculate points
  const { pointsEnJeu } = useMemo(() => {
    if (!currentLevelConfig) return { pointsEnJeu: 0 };
    // For blind test, points are fixed based on the snippet level
    return { pointsEnJeu: currentLevelConfig.start };
  }, [currentLevelConfig]);

  // Sounds
  const playBuzz = useSound("/sounds/buzz.mp3");
  const prevLock = useRef(null);

  // Host reacts to new lock
  useEffect(() => {
    if (!isHost) return;
    const cur = state?.lockUid || null;
    if (cur && cur !== prevLock.current) {
      const name = players.find(p => p.uid === cur)?.name || "Un joueur";

      // Pause music and update state
      pauseMusic();

      update(ref(db, `rooms_blindtest/${code}/state`), {
        pausedAt: serverTimestamp(),
        lockedAt: serverTimestamp(),
        buzzBanner: `🔔 ${name} a buzzé !`
      }).catch(() => {});

      playBuzz();
    }
    prevLock.current = cur;
  }, [isHost, state?.lockUid, code, players, playBuzz]);

  // Play snippet at specific level
  const playLevel = async (level) => {
    if (!isHost || !currentTrack || !playerReady) return;

    // Stop previous snippet if playing
    if (snippetStopRef.current) {
      await snippetStopRef.current.stop();
    }

    const config = SNIPPET_LEVELS[level];
    const trackUri = currentTrack.spotifyUri;

    try {
      const snippet = await playSnippet(trackUri, config.duration);
      snippetStopRef.current = snippet;
      setIsPlaying(true);
      setCurrentSnippet(level);

      // Update state
      await update(ref(db, `rooms_blindtest/${code}/state`), {
        snippetLevel: level,
        revealed: true,
        lastRevealAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error playing snippet:", error);
    }
  };

  const pauseMusic = async () => {
    if (snippetStopRef.current) {
      await snippetStopRef.current.stop();
    }
    await pause();
    setIsPlaying(false);
  };

  const resumeMusic = async () => {
    await resume();
    setIsPlaying(true);
  };

  // Exit and end game
  async function exitAndEndGame() {
    if (code) {
      await pauseMusic();
      await update(ref(db, `rooms_blindtest/${code}/state`), { phase: "ended" });
    }
    router.push('/home');
  }

  // Reset buzzers
  async function resetBuzzers() {
    if (!isHost) return;
    await update(ref(db, `rooms_blindtest/${code}/state`), {
      lockUid: null,
      buzzBanner: "",
      buzz: null,
      pausedAt: null,
      lockedAt: null
    });
    // Resume music if was playing
    if (currentSnippet !== null) {
      await resumeMusic();
    }
  }

  // Validate correct answer
  async function validate() {
    if (!isHost || !currentTrack || !state?.lockUid) return;

    const uid = state.lockUid;
    const pts = pointsEnJeu;

    await runTransaction(ref(db, `rooms_blindtest/${code}/players/${uid}/score`), (cur) => (cur || 0) + pts);

    if (meta?.mode === "équipes") {
      const player = players.find(p => p.uid === uid);
      const teamId = player?.teamId;
      if (teamId) {
        await runTransaction(ref(db, `rooms_blindtest/${code}/meta/teams/${teamId}/score`), (cur) => (cur || 0) + pts);
      }
    }

    await nextTrack();
  }

  // Wrong answer
  async function wrong() {
    if (!isHost || !state?.lockUid) return;

    const uid = state.lockUid;
    const until = serverNow + LOCKOUT_MS;

    // Subtract penalty
    await runTransaction(ref(db, `rooms_blindtest/${code}/players/${uid}/score`), (cur) => Math.max(0, (cur || 0) - WRONG_PENALTY));

    if (meta?.mode === "équipes") {
      const player = players.find(p => p.uid === uid);
      const teamId = player?.teamId;
      if (teamId) {
        await runTransaction(ref(db, `rooms_blindtest/${code}/meta/teams/${teamId}/score`), (cur) => Math.max(0, (cur || 0) - WRONG_PENALTY));
      }
    }

    const updates = {};
    updates[`rooms_blindtest/${code}/players/${uid}/blockedUntil`] = until;
    updates[`rooms_blindtest/${code}/state/lockUid`] = null;
    updates[`rooms_blindtest/${code}/state/buzzBanner`] = "";
    updates[`rooms_blindtest/${code}/state/buzz`] = null;
    updates[`rooms_blindtest/${code}/state/pausedAt`] = null;
    updates[`rooms_blindtest/${code}/state/lockedAt`] = null;

    await update(ref(db), updates);

    // Resume music
    await resumeMusic();
  }

  // Skip to next track
  async function nextTrack() {
    await pauseMusic();

    const next = qIndex + 1;
    if (next >= total) {
      await update(ref(db, `rooms_blindtest/${code}/state`), { phase: "ended" });
      router.replace(`/blindtest/game/${code}/end`);
      return;
    }

    // Reset all players penalties
    const updates = {};
    players.forEach(p => {
      updates[`rooms_blindtest/${code}/players/${p.uid}/blockedUntil`] = 0;
    });
    updates[`rooms_blindtest/${code}/state/currentIndex`] = next;
    updates[`rooms_blindtest/${code}/state/revealed`] = false;
    updates[`rooms_blindtest/${code}/state/snippetLevel`] = 0;
    updates[`rooms_blindtest/${code}/state/lockUid`] = null;
    updates[`rooms_blindtest/${code}/state/pausedAt`] = null;
    updates[`rooms_blindtest/${code}/state/lockedAt`] = null;
    updates[`rooms_blindtest/${code}/state/buzzBanner`] = "";
    updates[`rooms_blindtest/${code}/state/buzz`] = null;

    await update(ref(db), updates);
    setCurrentSnippet(null);
  }

  async function skip() {
    if (!isHost || total === 0) return;
    await nextTrack();
  }

  async function end() {
    if (isHost) {
      await pauseMusic();
      await update(ref(db, `rooms_blindtest/${code}/state`), { phase: "ended" });
      router.replace(`/blindtest/game/${code}/end`);
    }
  }

  const lockedName = state?.lockUid ? (players.find(p => p.uid === state.lockUid)?.name || state.lockUid) : "—";

  return (
    <div className="blindtest-host-page">
      {/* Header */}
      <header className="game-header blindtest">
        <div className="game-header-content">
          <div className="game-header-left">
            <div className="game-header-progress blindtest">{progressLabel}</div>
            <div className="game-header-title">{playlist?.name || 'Blind Test'}</div>
          </div>
          <div className="game-header-right">
            <ExitButton
              variant="header"
              confirmMessage="Voulez-vous vraiment quitter ? La partie sera abandonnée pour tous les joueurs."
              onExit={exitAndEndGame}
            />
          </div>
        </div>
      </header>

      {/* Buzz Modal */}
      <AnimatePresence>
        {state?.lockUid && (
          <>
            <motion.div
              className="buzz-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <div className="buzz-modal-container">
              <motion.div
                className="buzz-card blindtest"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
              >
                <div className="buzz-header">
                  <span className="buzz-icon">🔔</span>
                  <div className="buzz-info">
                    <span className="buzz-name">{lockedName}</span>
                    <span className="buzz-label">a buzzé</span>
                  </div>
                  <span className="buzz-points blindtest">{pointsEnJeu} pts</span>
                </div>

                {currentTrack && (
                  <div className="buzz-answer blindtest">
                    <div className="track-reveal">
                      {currentTrack.albumArt && (
                        <img src={currentTrack.albumArt} alt="Album" className="track-album-art" />
                      )}
                      <div className="track-info">
                        <span className="track-title">{currentTrack.title}</span>
                        <span className="track-artist">{currentTrack.artist}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="buzz-actions">
                  <button className="buzz-btn buzz-btn-wrong" onClick={wrong}>
                    <X size={22} />
                    Faux
                  </button>
                  <button className="buzz-btn buzz-btn-correct" onClick={validate}>
                    <Check size={22} />
                    Correct
                  </button>
                </div>

                <button className="buzz-cancel" onClick={resetBuzzers}>
                  Annuler
                </button>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="game-content blindtest">
        {/* Track Card */}
        {currentTrack ? (
          <motion.div
            className="track-card"
            key={qIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Album Art */}
            <div className="track-display">
              {currentTrack.albumArt ? (
                <img src={currentTrack.albumArt} alt="Album" className="track-cover" />
              ) : (
                <div className="track-cover-placeholder">
                  <Music size={48} />
                </div>
              )}

              {/* Track Info (revealed after correct) */}
              <div className="track-meta">
                <span className="track-title-host">{currentTrack.title}</span>
                <span className="track-artist-host">{currentTrack.artist}</span>
              </div>
            </div>

            {/* Snippet Controls */}
            <div className="snippet-controls">
              {SNIPPET_LEVELS.map((level, idx) => (
                <motion.button
                  key={idx}
                  className={`snippet-btn ${snippetLevel === idx ? 'active' : ''} ${currentSnippet === idx ? 'playing' : ''}`}
                  onClick={() => playLevel(idx)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={!playerReady}
                >
                  <span className="snippet-duration">{level.label}</span>
                  <span className="snippet-points">{level.start}pts</span>
                </motion.button>
              ))}
            </div>

            {/* Play/Pause */}
            <div className="playback-controls">
              <motion.button
                className="playback-btn"
                onClick={isPlaying ? pauseMusic : resumeMusic}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                disabled={!playerReady || currentSnippet === null}
              >
                {isPlaying ? <Pause size={28} /> : <Play size={28} />}
              </motion.button>
            </div>

            {!playerReady && (
              <div className="player-warning">
                Initialisation du lecteur Spotify...
              </div>
            )}
          </motion.div>
        ) : (
          <div className="track-card track-empty">
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div>Plus de titres</div>
          </div>
        )}

        {/* Leaderboard */}
        <Leaderboard players={players} />
      </main>

      {/* Footer Actions */}
      <footer className="game-footer blindtest">
        <div className="host-actions">
          <button className="action-btn action-reset blindtest" onClick={resetBuzzers}>
            <RotateCcw size={20} />
            <span>Reset</span>
          </button>
          <button className="action-btn action-skip blindtest" onClick={skip}>
            <SkipForward size={20} />
            <span>Passer</span>
          </button>
          <button className="action-btn action-end blindtest" onClick={end}>
            <X size={20} />
            <span>Fin</span>
          </button>
        </div>
      </footer>

      <style jsx>{`
        .blindtest-host-page {
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary, #0a0a0f);
          overflow: hidden;
          position: relative;
        }

        .blindtest-host-page::before {
          content: '';
          position: fixed;
          inset: 0;
          z-index: 0;
          background:
            radial-gradient(ellipse at 20% 80%, rgba(6, 182, 212, 0.12) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(6, 182, 212, 0.08) 0%, transparent 50%),
            var(--bg-primary, #0a0a0f);
          pointer-events: none;
        }

        /* Header */
        .game-header.blindtest {
          flex-shrink: 0;
          position: relative;
          z-index: 10;
          background: rgba(10, 10, 15, 0.95);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(6, 182, 212, 0.2);
          padding: 12px 16px;
          padding-top: calc(12px + env(safe-area-inset-top));
        }

        .game-header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 600px;
          margin: 0 auto;
          gap: 16px;
        }

        .game-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 0;
        }

        .game-header-progress.blindtest {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.1rem;
          color: #34d399;
          text-shadow: 0 0 15px rgba(6, 182, 212, 0.6);
          flex-shrink: 0;
        }

        .game-header-title {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .game-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        /* Content */
        .game-content.blindtest {
          flex: 1;
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px;
          gap: 16px;
          overflow: hidden;
          min-height: 0;
        }

        /* Track Card */
        .track-card {
          width: 100%;
          max-width: 500px;
          background: rgba(20, 20, 30, 0.8);
          border: 1px solid rgba(6, 182, 212, 0.2);
          border-radius: 20px;
          padding: 20px;
          backdrop-filter: blur(20px);
        }

        .track-empty {
          text-align: center;
          color: var(--text-muted);
        }

        .track-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
        }

        .track-cover {
          width: 150px;
          height: 150px;
          border-radius: 12px;
          object-fit: cover;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }

        .track-cover-placeholder {
          width: 150px;
          height: 150px;
          border-radius: 12px;
          background: rgba(6, 182, 212, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #34d399;
        }

        .track-meta {
          text-align: center;
        }

        .track-title-host {
          display: block;
          font-weight: 700;
          font-size: 1.1rem;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .track-artist-host {
          display: block;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        /* Snippet Controls */
        .snippet-controls {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 16px;
        }

        .snippet-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 12px 8px;
          background: rgba(6, 182, 212, 0.1);
          border: 1px solid rgba(6, 182, 212, 0.3);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .snippet-btn:hover:not(:disabled) {
          background: rgba(6, 182, 212, 0.2);
          border-color: rgba(6, 182, 212, 0.5);
          transform: translateY(-2px);
        }

        .snippet-btn.active {
          background: rgba(6, 182, 212, 0.3);
          border-color: #34d399;
          box-shadow: 0 0 15px rgba(6, 182, 212, 0.3);
        }

        .snippet-btn.playing {
          animation: pulse-glow 1.5s infinite;
        }

        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 15px rgba(6, 182, 212, 0.3); }
          50% { box-shadow: 0 0 25px rgba(6, 182, 212, 0.6); }
        }

        .snippet-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .snippet-duration {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-weight: 700;
          font-size: 1rem;
          color: #34d399;
        }

        .snippet-points {
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        /* Playback Controls */
        .playback-controls {
          display: flex;
          justify-content: center;
        }

        .playback-btn {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981, #059669);
          border: none;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(6, 182, 212, 0.4);
          transition: all 0.2s ease;
        }

        .playback-btn:hover:not(:disabled) {
          transform: scale(1.1);
          box-shadow: 0 6px 30px rgba(6, 182, 212, 0.6);
        }

        .playback-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .player-warning {
          text-align: center;
          color: #fbbf24;
          font-size: 0.85rem;
          margin-top: 12px;
        }

        /* Footer */
        .game-footer.blindtest {
          flex-shrink: 0;
          position: relative;
          z-index: 10;
          padding: 12px 16px;
          padding-bottom: calc(16px + env(safe-area-inset-bottom));
          background: rgba(10, 10, 15, 0.95);
          backdrop-filter: blur(20px);
          border-top: 1px solid rgba(6, 182, 212, 0.2);
          max-width: 600px;
          margin: 0 auto;
          width: 100%;
        }

        .host-actions {
          display: flex;
          gap: 10px;
          justify-content: center;
        }

        .action-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 14px;
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .action-btn span {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.65rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .action-btn:hover {
          transform: translateY(-2px);
        }

        .action-reset.blindtest {
          background: linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(6, 182, 212, 0.08));
          border-color: rgba(6, 182, 212, 0.3);
          color: #34d399;
        }

        .action-skip.blindtest {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.08));
          border-color: rgba(245, 158, 11, 0.3);
          color: #fbbf24;
        }

        .action-end.blindtest {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.08));
          border-color: rgba(239, 68, 68, 0.3);
          color: #f87171;
        }

        /* Buzz Modal */
        .buzz-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.92);
          z-index: 9998;
        }

        .buzz-modal-container {
          position: fixed;
          inset: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          padding: 20px;
        }

        .buzz-card.blindtest {
          width: 100%;
          max-width: 400px;
          background: #12101c;
          border: 1px solid rgba(6, 182, 212, 0.4);
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 60px rgba(6, 182, 212, 0.2);
        }

        .buzz-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .buzz-icon {
          font-size: 2rem;
        }

        .buzz-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .buzz-name {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.4rem;
          color: #ffffff;
        }

        .buzz-label {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.5);
        }

        .buzz-points.blindtest {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.3rem;
          color: #34d399;
          background: rgba(6, 182, 212, 0.15);
          border: 1px solid rgba(6, 182, 212, 0.3);
          border-radius: 12px;
          padding: 8px 14px;
        }

        .buzz-answer.blindtest {
          background: rgba(6, 182, 212, 0.1);
          border: 1px solid rgba(6, 182, 212, 0.3);
          border-radius: 12px;
          padding: 14px 16px;
          margin-bottom: 20px;
        }

        .track-reveal {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .track-album-art {
          width: 60px;
          height: 60px;
          border-radius: 8px;
          object-fit: cover;
        }

        .track-info {
          flex: 1;
        }

        .track-title {
          display: block;
          font-weight: 700;
          font-size: 1rem;
          color: var(--text-primary);
        }

        .track-artist {
          display: block;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .buzz-actions {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
        }

        .buzz-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px 16px;
          border-radius: 14px;
          border: 1px solid;
          cursor: pointer;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.9rem;
          font-weight: 700;
          transition: all 0.2s ease;
        }

        .buzz-btn-wrong {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.1));
          border-color: rgba(239, 68, 68, 0.4);
          color: #f87171;
        }

        .buzz-btn-wrong:hover {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.35), rgba(239, 68, 68, 0.2));
          transform: translateY(-2px);
        }

        .buzz-btn-correct {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.1));
          border-color: rgba(34, 197, 94, 0.4);
          color: #4ade80;
        }

        .buzz-btn-correct:hover {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.35), rgba(34, 197, 94, 0.2));
          transform: translateY(-2px);
        }

        .buzz-cancel {
          width: 100%;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.4);
          background: transparent;
          border: none;
          padding: 10px;
          cursor: pointer;
        }

        .buzz-cancel:hover {
          color: rgba(255, 255, 255, 0.7);
        }

        .loading-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 16px;
        }

        .loading-dots span {
          width: 10px;
          height: 10px;
          background: #34d399;
          border-radius: 50%;
          animation: dot-bounce 1.4s ease-in-out infinite;
        }

        .loading-dots span:nth-child(1) { animation-delay: 0s; }
        .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
        .loading-dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes dot-bounce {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
          40% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
