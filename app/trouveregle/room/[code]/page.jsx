"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  auth,
  db,
  ref,
  onValue,
  update,
  remove,
  set,
  signInAnonymously,
  onAuthStateChanged,
} from "@/lib/firebase";
import { motion, AnimatePresence } from 'framer-motion';
import { GameLaunchCountdown } from "@/components/transitions";
import LobbyHeader from "@/components/game/LobbyHeader";
import { useUserProfile } from "@/lib/hooks/useUserProfile";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { useHostDisconnect } from "@/lib/hooks/useHostDisconnect";
import { usePlayerCleanup } from "@/lib/hooks/usePlayerCleanup";
import { usePresence } from "@/lib/hooks/usePresence";
import LobbyDisconnectAlert from "@/components/game/LobbyDisconnectAlert";
import { useToast } from "@/lib/hooks/useToast";
import { useInterstitialAd } from "@/lib/hooks/useInterstitialAd";
import { Search, Users, Clock, Shuffle, Check } from "lucide-react";
import HowToPlayModal from "@/components/ui/HowToPlayModal";
import { TROUVE_COLORS, getRandomRulesForVoting } from "@/data/trouveregle-rules";

// Cyan theme colors
const CYAN_PRIMARY = TROUVE_COLORS.primary;
const CYAN_LIGHT = TROUVE_COLORS.light;
const CYAN_DARK = TROUVE_COLORS.dark;

export default function TrouveRegleLobby() {
  const { code } = useParams();
  const router = useRouter();
  const toast = useToast();

  const [meta, setMeta] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [myUid, setMyUid] = useState(null);
  const [joinUrl, setJoinUrl] = useState("");
  const [hostJoined, setHostJoined] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [selectedInvestigators, setSelectedInvestigators] = useState([]);
  const [showCountdown, setShowCountdown] = useState(false);
  const roomWasValidRef = useRef(false);
  const countdownTriggeredRef = useRef(false);
  const [isPlayerMissing, setIsPlayerMissing] = useState(false);
  const [rejoinError, setRejoinError] = useState(null);

  // Settings
  const [mode, setMode] = useState('meme_piece'); // 'meme_piece' | 'a_distance'
  const [timerMinutes, setTimerMinutes] = useState(5);
  const [nbInvestigators, setNbInvestigators] = useState(1);

  // Centralized players hook
  const { players } = usePlayers({ roomCode: code, roomPrefix: 'rooms_trouveregle' });

  // Get user profile for pseudo
  const { user: currentUser, profile, loading: profileLoading } = useUserProfile();
  const userPseudo = profile?.pseudo || currentUser?.displayName?.split(' ')[0] || 'Joueur';

  // Interstitial ad
  useInterstitialAd({ context: 'TrouveRegle' });

  useEffect(() => {
    if (typeof window !== "undefined" && code) {
      setJoinUrl(`${window.location.origin}/join?code=${code}`);
    }
  }, [code]);

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setMyUid(user.uid);
        setIsHost(meta?.hostUid === user.uid);
        setHostJoined(players.some(p => p.uid === user.uid));
      } else {
        signInAnonymously(auth).catch(() => {});
      }
    });
    return () => unsub();
  }, [meta?.hostUid, players]);

  // Room guard
  useRoomGuard({
    roomCode: code,
    roomPrefix: 'rooms_trouveregle',
    playerUid: myUid,
    isHost,
    skipKickRedirect: true // LobbyDisconnectAlert gère le cas kick en lobby
  });

  // Host disconnect - ferme la room si l'hôte perd sa connexion
  useHostDisconnect({
    roomCode: code,
    roomPrefix: 'rooms_trouveregle',
    isHost
  });

  // Presence hook - real-time connection tracking
  const { isConnected, forceReconnect } = usePresence({
    roomCode: code,
    roomPrefix: 'rooms_trouveregle',
    playerUid: myUid,
    heartbeatInterval: 15000,
    enabled: !isHost && !!myUid
  });

  // Player cleanup with auto-rejoin for hard refresh
  const { leaveRoom, markVoluntaryLeave, attemptRejoin, isRejoining } = usePlayerCleanup({
    roomCode: code,
    roomPrefix: 'rooms_trouveregle',
    playerUid: myUid,
    isHost,
    phase: 'lobby',
    playerName: userPseudo,
    getPlayerData: (uid, name) => ({
      uid,
      name,
      score: 0,
      role: 'player',
      joinedAt: Date.now()
    }),
    onPlayerRemoved: () => {
      if (!isHost) setIsPlayerMissing(true);
    },
    onRejoinSuccess: () => {
      setIsPlayerMissing(false);
      setRejoinError(null);
    },
    onRejoinFailed: (err) => {
      setRejoinError(err?.message || 'Impossible de rejoindre');
    }
  });

  // DB listeners
  useEffect(() => {
    if (!code) return;

    const metaUnsub = onValue(ref(db, `rooms_trouveregle/${code}/meta`), (snap) => {
      const m = snap.val();
      if (m) {
        if (m.closed) return;
        setMeta(m);
        roomWasValidRef.current = true;
        // Restore settings from meta
        if (m.mode) setMode(m.mode);
        if (m.timerMinutes) setTimerMinutes(m.timerMinutes);
      }
    });

    const stateUnsub = onValue(ref(db, `rooms_trouveregle/${code}/state`), (snap) => {
      const state = snap.val();
      if (state?.phase === "choosing" && !countdownTriggeredRef.current) {
        countdownTriggeredRef.current = true;
        setShowCountdown(true);
      }
    });

    return () => {
      metaUnsub();
      stateUnsub();
    };
  }, [code, router, players, myUid]);

  // Auto-join host when page loads
  useEffect(() => {
    if (!isHost || !userPseudo || !auth.currentUser || hostJoined || profileLoading) return;
    const uid = auth.currentUser.uid;
    set(ref(db, `rooms_trouveregle/${code}/players/${uid}`), {
      uid,
      name: userPseudo,
      score: 0,
      role: 'player',
      joinedAt: Date.now()
    });
  }, [isHost, userPseudo, hostJoined, code, profileLoading]);

  // Auto-adjust nbInvestigators when players leave
  useEffect(() => {
    if (players.length > 1) {
      const maxInv = players.length - 1;
      if (nbInvestigators > maxInv) {
        setNbInvestigators(maxInv);
        setSelectedInvestigators(prev => prev.slice(0, maxInv));
      }
    }
  }, [players.length, nbInvestigators]);

  const toggleInvestigator = (uid) => {
    setSelectedInvestigators(prev => {
      if (prev.includes(uid)) {
        return prev.filter(id => id !== uid);
      } else if (prev.length < nbInvestigators) {
        return [...prev, uid];
      } else {
        // Replace the first one
        return [...prev.slice(1), uid];
      }
    });
  };

  const handleRandomInvestigators = () => {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    setSelectedInvestigators(shuffled.slice(0, nbInvestigators).map(p => p.uid));
  };

  const handleStartGame = async () => {
    if (!isHost || selectedInvestigators.length === 0) return;

    try {
      const updates = {};

      // Update player roles
      players.forEach(p => {
        const role = selectedInvestigators.includes(p.uid) ? 'investigator' : 'player';
        updates[`rooms_trouveregle/${code}/players/${p.uid}/role`] = role;
      });

      // Update meta with settings
      updates[`rooms_trouveregle/${code}/meta/mode`] = mode;
      updates[`rooms_trouveregle/${code}/meta/timerMinutes`] = timerMinutes;

      // Generate rule options for voting
      const ruleOptions = getRandomRulesForVoting({
        onlineOnly: mode === 'a_distance',
        excludeIds: []
      });

      // Initialize state
      updates[`rooms_trouveregle/${code}/state`] = {
        phase: 'choosing',
        investigatorUids: selectedInvestigators,
        currentRule: null,
        ruleOptions: ruleOptions.map(r => ({ id: r.id, text: r.text, category: r.category, difficulty: r.difficulty })),
        votes: {},
        rerollsUsed: 0,
        guessAttempts: 0,
        guesses: [],
        roundNumber: 1,
      };

      await update(ref(db), updates);
    } catch (error) {
      console.error('Erreur lors du lancement:', error);
      toast.error('Erreur lors du lancement de la partie');
    }
  };

  const handleHostExit = async () => {
    if (isHost) {
      await update(ref(db, `rooms_trouveregle/${code}/meta`), { closed: true });
    }
    router.push('/home');
  };

  const handlePlayerExit = async () => {
    markVoluntaryLeave?.();
    await leaveRoom?.();
    router.push('/home');
  };

  // Sync settings to Firebase in real-time
  const handleModeChange = (newMode) => {
    setMode(newMode);
    if (isHost && code) {
      update(ref(db, `rooms_trouveregle/${code}/meta`), { mode: newMode });
    }
  };

  const handleTimerChange = (newTimer) => {
    setTimerMinutes(newTimer);
    if (isHost && code) {
      update(ref(db, `rooms_trouveregle/${code}/meta`), { timerMinutes: newTimer });
    }
  };

  const canStart = isHost && players.length >= 2 && selectedInvestigators.length > 0;
  const investigators = players.filter(p => selectedInvestigators.includes(p.uid));
  const otherPlayers = players.filter(p => !selectedInvestigators.includes(p.uid));

  // Loading state
  if (!meta) {
    return (
      <div className="trouveregle-lobby game-page">
        <div className="lobby-loading">
          <div className="loading-spinner" />
          <p>Chargement...</p>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="trouveregle-lobby game-page">
      {/* Launch Countdown */}
      <AnimatePresence>
        {showCountdown && (
          <GameLaunchCountdown
            gameColor="#06b6d4"
            onComplete={() => {
              const myPlayer = players.find(p => p.uid === myUid);
              if (myPlayer?.role === 'investigator') {
                router.push(`/trouveregle/game/${code}/investigate`);
              } else {
                router.push(`/trouveregle/game/${code}/play`);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* How To Play Modal */}
      <HowToPlayModal
        isOpen={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
        gameType="trouveregle"
      />

      {/* Lobby Disconnect Alert */}
      <LobbyDisconnectAlert
        isVisible={isPlayerMissing && !isHost}
        isRejoining={isRejoining}
        onRejoin={attemptRejoin}
        onGoHome={() => router.push('/home')}
        error={rejoinError}
        gameColor="#06b6d4"
      />

      {/* Header */}
      <LobbyHeader
        variant="trouveregle"
        code={code}
        isHost={isHost}
        players={players}
        hostUid={meta?.hostUid}
        onHostExit={handleHostExit}
        onPlayerExit={handlePlayerExit}
        onShowHowToPlay={() => setShowHowToPlay(true)}
        joinUrl={joinUrl}
      />

      {/* Main Content */}
      <main className="lobby-main">
        {isHost ? (
          // HOST VIEW
          <div className="lobby-content">
            {/* Settings Row - Compact */}
            <div className="settings-row-compact">
              <div className="setting-group">
                <span className="setting-label-small">Mode</span>
                <div className="mode-toggle">
                  <button
                    className={`setting-btn ${mode === 'meme_piece' ? 'active' : ''}`}
                    onClick={() => handleModeChange('meme_piece')}
                  >
                    🏠 Même pièce
                  </button>
                  <button
                    className={`setting-btn ${mode === 'a_distance' ? 'active' : ''}`}
                    onClick={() => handleModeChange('a_distance')}
                  >
                    🌐 À distance
                  </button>
                </div>
              </div>
              <div className="setting-group">
                <span className="setting-label-small"><Clock size={14} /> Timer</span>
                <div className="timer-select">
                  {[3, 5, 7, 10].map(mins => (
                    <button
                      key={mins}
                      className={`setting-btn ${timerMinutes === mins ? 'active' : ''}`}
                      onClick={() => handleTimerChange(mins)}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
              <div className="setting-group">
                <span className="setting-label-small"><Search size={14} /> Enquêteurs</span>
                <div className="counter-control">
                  <button
                    type="button"
                    className="counter-btn"
                    onClick={() => {
                      const newVal = Math.max(1, nbInvestigators - 1);
                      setNbInvestigators(newVal);
                      setSelectedInvestigators(prev => prev.slice(0, newVal));
                    }}
                    disabled={nbInvestigators <= 1}
                  >
                    −
                  </button>
                  <span className="counter-value">{nbInvestigators}</span>
                  <button
                    type="button"
                    className="counter-btn"
                    onClick={() => setNbInvestigators(prev => prev + 1)}
                    disabled={players.length <= 1 || nbInvestigators >= players.length - 1}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Players Card */}
            <div className="players-card">
              <div className="players-header">
                <div className="players-header-left">
                  <Users size={18} />
                  <span className="players-title">Joueurs ({players.length})</span>
                </div>
                <motion.button
                  className="random-btn"
                  onClick={handleRandomInvestigators}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={players.length < 2}
                >
                  <Shuffle size={14} />
                  Aléatoire
                </motion.button>
              </div>

              <p className="players-instruction">
                Sélectionne {nbInvestigators} enquêteur{nbInvestigators > 1 ? 's' : ''} :
              </p>

              <div className="players-grid">
                {players.map(player => {
                  const isSelected = selectedInvestigators.includes(player.uid);
                  return (
                    <motion.button
                      key={player.uid}
                      className={`player-chip ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleInvestigator(player.uid)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {isSelected && (
                        <span className="selected-badge">
                          <Search size={12} />
                        </span>
                      )}
                      <span className="player-name">{player.name}</span>
                      {isSelected && <Check size={14} className="check-icon" />}
                    </motion.button>
                  );
                })}
              </div>

              {players.length < 2 && (
                <div className="warning-message">
                  ⚠️ Il faut au moins 2 joueurs pour commencer
                </div>
              )}

              {players.length >= 2 && selectedInvestigators.length === 0 && (
                <div className="warning-message">
                  👆 Sélectionne au moins un enquêteur
                </div>
              )}
            </div>

          </div>
        ) : (
          // PLAYER VIEW
          <div className="player-view">
            {/* Game Settings Info */}
            <div className="player-info-card">
              <div className="info-row">
                <span className="info-icon">{mode === 'meme_piece' ? '🏠' : '📱'}</span>
                <div className="info-text">
                  <span className="info-label">Mode</span>
                  <span className="info-value">{mode === 'meme_piece' ? 'Même pièce' : 'À distance'}</span>
                </div>
              </div>
              <div className="info-divider" />
              <div className="info-row">
                <span className="info-icon">⏱️</span>
                <div className="info-text">
                  <span className="info-label">Durée</span>
                  <span className="info-value">{timerMinutes} min</span>
                </div>
              </div>
            </div>

            {/* Players Header */}
            <div className="players-header-card">
              <span className="players-icon">🎮</span>
              <span className="players-count">{players.length}</span>
              <span className="players-label">joueurs connectés</span>
            </div>

            {/* Players List */}
            <div className="players-list-card">
              <div className="players-list">
                {players.map(p => (
                  <div key={p.uid} className={`player-item ${p.uid === myUid ? 'is-me' : ''}`}>
                    <span className="player-dot" />
                    <span className="player-name">{p.name}</span>
                    {p.uid === myUid && <span className="me-badge">Toi</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer - Start Button (Host only) */}
      {isHost && (
        <footer className="lobby-footer">
          <motion.button
            className={`start-btn ${canStart ? '' : 'disabled'}`}
            onClick={canStart ? handleStartGame : undefined}
            whileHover={canStart ? { scale: 1.02 } : {}}
            whileTap={canStart ? { scale: 0.98 } : {}}
            disabled={!canStart}
          >
            <span className="btn-icon">🔍</span>
            <span className="btn-text">Commencer</span>
          </motion.button>
        </footer>
      )}

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
  .trouveregle-lobby {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--bg-primary, #0a0a0f);
  }

  .trouveregle-lobby::before {
    content: '';
    position: fixed;
    inset: 0;
    z-index: 0;
    background:
      radial-gradient(ellipse at 30% 20%, rgba(6, 182, 212, 0.12) 0%, transparent 50%),
      radial-gradient(ellipse at 70% 80%, rgba(6, 182, 212, 0.06) 0%, transparent 50%),
      var(--bg-primary, #0a0a0f);
    pointer-events: none;
  }

  /* Loading */
  .lobby-loading {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    color: rgba(255, 255, 255, 0.6);
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(6, 182, 212, 0.2);
    border-top-color: ${CYAN_PRIMARY};
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Main Content */
  .lobby-main {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 16px;
    position: relative;
    z-index: 1;
  }

  .lobby-content, .player-view {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-width: 500px;
    margin: 0 auto;
    width: 100%;
    overflow-y: auto;
    padding-bottom: 8px;
  }

  /* Settings Row */
  .settings-row-compact {
    flex-shrink: 0;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 16px;
    padding: 12px;
    background: rgba(20, 20, 30, 0.8);
    border: 1px solid rgba(6, 182, 212, 0.25);
    border-radius: 12px;
  }

  .setting-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }

  .setting-label-small {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.6);
    font-weight: 600;
  }

  .mode-toggle, .timer-select {
    display: flex;
    gap: 6px;
  }

  .counter-control {
    display: flex;
    align-items: center;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    overflow: hidden;
  }

  .counter-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: none;
    background: rgba(6, 182, 212, 0.15);
    color: ${CYAN_LIGHT};
    font-size: 1.2rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
  }

  .counter-btn:hover:not(:disabled) {
    background: rgba(6, 182, 212, 0.35);
  }

  .counter-btn:active:not(:disabled) {
    transform: scale(0.95);
  }

  .counter-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .counter-value {
    min-width: 28px;
    text-align: center;
    font-size: 1rem;
    font-weight: 700;
    color: #ffffff;
  }

  .setting-btn {
    padding: 10px 14px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.4);
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }

  .setting-btn:active {
    transform: scale(0.95);
  }

  .setting-btn.active {
    background: linear-gradient(135deg, rgba(6, 182, 212, 0.4), rgba(6, 182, 212, 0.2));
    border-color: ${CYAN_PRIMARY};
    color: #ffffff;
    box-shadow: 0 0 12px rgba(6, 182, 212, 0.3);
  }

  /* Players Card */
  .players-card {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: rgba(20, 20, 30, 0.8);
    border: 1px solid rgba(6, 182, 212, 0.25);
    border-radius: 14px;
    padding: 16px;
    overflow: hidden;
  }

  .players-header {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .players-header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #ffffff;
  }

  .players-title {
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-weight: 600;
  }

  .random-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border: 1px solid rgba(6, 182, 212, 0.3);
    border-radius: 8px;
    background: rgba(6, 182, 212, 0.1);
    color: ${CYAN_LIGHT};
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
  }

  .random-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .players-instruction {
    flex-shrink: 0;
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 12px;
  }

  .players-grid {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: 8px;
    overflow-y: auto;
    padding: 8px 0 4px 8px;
  }

  .player-chip {
    position: relative;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 14px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.3);
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .player-chip:hover {
    border-color: rgba(6, 182, 212, 0.3);
  }

  .player-chip.selected {
    background: rgba(6, 182, 212, 0.2);
    border-color: ${CYAN_PRIMARY};
    color: ${CYAN_LIGHT};
  }

  .selected-badge {
    position: absolute;
    top: -6px;
    left: -6px;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${CYAN_PRIMARY};
    border-radius: 50%;
    color: #0a0a0f;
  }

  .check-icon {
    color: ${CYAN_LIGHT};
  }

  .warning-message {
    flex-shrink: 0;
    margin-top: 12px;
    padding: 10px;
    background: rgba(251, 191, 36, 0.1);
    border: 1px solid rgba(251, 191, 36, 0.3);
    border-radius: 8px;
    color: #fbbf24;
    font-size: 0.8rem;
    text-align: center;
  }

  /* Role Preview */
  .role-preview {
    flex-shrink: 0;
    display: flex;
    gap: 12px;
  }

  .role-group {
    flex: 1;
    padding: 12px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.3);
  }

  .role-group.investigators {
    border: 1px solid rgba(6, 182, 212, 0.3);
  }

  .role-group.players {
    border: 1px solid rgba(168, 85, 247, 0.3);
  }

  .role-label {
    display: block;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    margin-bottom: 6px;
    color: rgba(255, 255, 255, 0.6);
  }

  .role-names {
    font-size: 0.85rem;
    color: #ffffff;
  }

  /* Player View */
  .player-info-card {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
    padding: 16px 24px;
    background: rgba(20, 20, 30, 0.8);
    border: 1px solid rgba(6, 182, 212, 0.25);
    border-radius: 14px;
  }

  .info-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .info-icon {
    font-size: 1.4rem;
  }

  .info-text {
    display: flex;
    flex-direction: column;
  }

  .info-label {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .info-value {
    font-size: 0.95rem;
    font-weight: 600;
    color: ${CYAN_LIGHT};
  }

  .info-divider {
    width: 1px;
    height: 36px;
    background: rgba(255, 255, 255, 0.15);
  }

  .players-header-card {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    background: rgba(6, 182, 212, 0.1);
    border: 1px solid rgba(6, 182, 212, 0.2);
    border-radius: 10px;
  }

  .players-icon {
    font-size: 1.1rem;
  }

  .players-count {
    font-size: 1.3rem;
    font-weight: 700;
    color: ${CYAN_LIGHT};
  }

  .players-label {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.7);
  }

  .players-list-card {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    background: rgba(20, 20, 30, 0.8);
    border: 1px solid rgba(6, 182, 212, 0.25);
    border-radius: 14px;
    padding: 12px;
  }

  .players-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .player-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
  }

  .player-item.is-me {
    background: rgba(6, 182, 212, 0.1);
    border: 1px solid rgba(6, 182, 212, 0.3);
  }

  .player-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${CYAN_PRIMARY};
  }

  .player-item .player-name {
    flex: 1;
    color: rgba(255, 255, 255, 0.9);
  }

  .me-badge {
    padding: 2px 8px;
    border-radius: 4px;
    background: rgba(6, 182, 212, 0.2);
    color: ${CYAN_LIGHT};
    font-size: 0.7rem;
    font-weight: 600;
  }

  /* Footer */
  .lobby-footer {
    position: relative;
    z-index: 10;
    padding: 16px;
    background: rgba(10, 10, 15, 0.95);
    backdrop-filter: blur(20px);
    border-top: 1px solid rgba(6, 182, 212, 0.2);
  }

  .start-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    max-width: 400px;
    margin: 0 auto;
    padding: 18px 32px;
    border: none;
    border-radius: 14px;
    cursor: pointer;
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 1.1rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #0a0a0f;
    background: linear-gradient(135deg, ${CYAN_LIGHT} 0%, ${CYAN_PRIMARY} 50%, ${CYAN_DARK} 100%);
    box-shadow:
      0 5px 0 #0e7490,
      0 8px 15px rgba(6, 182, 212, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
    transition: all 0.15s ease;
  }

  .start-btn:hover:not(.disabled) {
    transform: translateY(-2px);
    box-shadow:
      0 7px 0 #0e7490,
      0 10px 20px rgba(6, 182, 212, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.25);
  }

  .start-btn:active:not(.disabled) {
    transform: translateY(3px);
    box-shadow:
      0 2px 0 #0e7490,
      0 4px 8px rgba(6, 182, 212, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
  }

  .start-btn.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-icon {
    font-size: 1.3rem;
  }
`;
