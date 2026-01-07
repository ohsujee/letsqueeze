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
import ShareModal from "@/lib/components/ShareModal";
import ExitButton from "@/lib/components/ExitButton";
import PlayerManager from "@/components/game/PlayerManager";
import { useUserProfile } from "@/lib/hooks/useUserProfile";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { usePlayerCleanup } from "@/lib/hooks/usePlayerCleanup";
import { useToast } from "@/lib/hooks/useToast";
import { useInterstitialAd } from "@/lib/hooks/useInterstitialAd";
import { HelpCircle, Search, Users, Clock, Shuffle, Check } from "lucide-react";
import HowToPlayModal from "@/components/ui/HowToPlayModal";
import { TROUVE_COLORS } from "@/data/trouveregle-rules";

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
  const roomWasValidRef = useRef(false);

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
    isHost
  });

  // Player cleanup
  usePlayerCleanup({
    roomCode: code,
    roomPrefix: 'rooms_trouveregle',
    playerUid: myUid,
    isHost,
    phase: 'lobby'
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
      if (state?.phase === "choosing") {
        // Redirect based on role
        const myPlayer = players.find(p => p.uid === myUid);
        if (myPlayer?.role === 'investigator') {
          router.push(`/trouveregle/game/${code}/investigate`);
        } else {
          router.push(`/trouveregle/game/${code}/play`);
        }
      }
    });

    return () => {
      metaUnsub();
      stateUnsub();
    };
  }, [code, router, players, myUid]);

  const handleHostJoin = async () => {
    if (!isHost || !userPseudo || !auth.currentUser) return;
    const uid = auth.currentUser.uid;
    await set(ref(db, `rooms_trouveregle/${code}/players/${uid}`), {
      uid,
      name: userPseudo,
      score: 0,
      role: 'player',
      joinedAt: Date.now()
    });
  };

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

      // Initialize state
      updates[`rooms_trouveregle/${code}/state`] = {
        phase: 'choosing',
        investigatorUids: selectedInvestigators,
        currentRule: null,
        ruleOptions: [],
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

  const canStart = isHost && players.length >= 3 && selectedInvestigators.length > 0;
  const investigators = players.filter(p => selectedInvestigators.includes(p.uid));
  const otherPlayers = players.filter(p => !selectedInvestigators.includes(p.uid));

  // Loading state
  if (!meta) {
    return (
      <div className="trouveregle-lobby">
        <div className="lobby-loading">
          <div className="loading-spinner" />
          <p>Chargement...</p>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="trouveregle-lobby">
      {/* How To Play Modal */}
      <HowToPlayModal
        isOpen={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
        gameType="trouveregle"
      />

      {/* Header */}
      <header className="lobby-header">
        <div className="header-left">
          <ExitButton
            variant="header"
            onExit={isHost ? handleHostExit : undefined}
            confirmMessage={isHost ? "Voulez-vous vraiment quitter ? La partie sera fermée pour tous les joueurs." : undefined}
          />
          <div className="header-title-row">
            <span className="game-icon">🔍</span>
            <h1 className="lobby-title">Trouve la Règle</h1>
          </div>
        </div>
        <div className="header-right">
          <motion.button
            className="help-btn"
            onClick={() => setShowHowToPlay(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Comment jouer"
          >
            <HelpCircle size={18} />
          </motion.button>
          {isHost && (
            <PlayerManager
              players={players}
              roomCode={code}
              roomPrefix="rooms_trouveregle"
              hostUid={meta?.hostUid}
              variant="trouveregle"
              phase="lobby"
              hideCount
            />
          )}
          <ShareModal roomCode={code} joinUrl={joinUrl} />
        </div>
      </header>

      {/* Main Content */}
      <main className="lobby-main">
        {isHost ? (
          // HOST VIEW
          <div className="lobby-content">
            {/* Host Join Card */}
            {!hostJoined && (
              <div className="host-join-card">
                <div className="host-join-row">
                  <div className="host-pseudo">
                    <span className="pseudo-label">Tu joues en tant que</span>
                    <span className="pseudo-name">{userPseudo}</span>
                  </div>
                  <motion.button
                    className="host-join-btn"
                    onClick={handleHostJoin}
                    disabled={!userPseudo || profileLoading}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {profileLoading ? '...' : 'Rejoindre'}
                  </motion.button>
                </div>
              </div>
            )}

            {/* Settings Card */}
            <div className="settings-card">
              <div className="settings-header">
                <span className="settings-icon">⚙️</span>
                <span className="settings-title">Paramètres</span>
              </div>

              {/* Mode Selection */}
              <div className="setting-row">
                <span className="setting-label">Mode</span>
                <div className="mode-toggle">
                  <button
                    className={`mode-btn ${mode === 'meme_piece' ? 'active' : ''}`}
                    onClick={() => setMode('meme_piece')}
                  >
                    🏠 Même pièce
                  </button>
                  <button
                    className={`mode-btn ${mode === 'a_distance' ? 'active' : ''}`}
                    onClick={() => setMode('a_distance')}
                  >
                    🌐 À distance
                  </button>
                </div>
              </div>

              {/* Timer */}
              <div className="setting-row">
                <span className="setting-label">
                  <Clock size={16} /> Timer
                </span>
                <div className="timer-select">
                  {[3, 5, 7, 10].map(mins => (
                    <button
                      key={mins}
                      className={`timer-btn ${timerMinutes === mins ? 'active' : ''}`}
                      onClick={() => setTimerMinutes(mins)}
                    >
                      {mins} min
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of Investigators */}
              <div className="setting-row">
                <span className="setting-label">
                  <Search size={16} /> Enquêteurs
                </span>
                <div className="investigator-select">
                  {[1, 2].map(n => (
                    <button
                      key={n}
                      className={`inv-btn ${nbInvestigators === n ? 'active' : ''}`}
                      onClick={() => {
                        setNbInvestigators(n);
                        setSelectedInvestigators(prev => prev.slice(0, n));
                      }}
                    >
                      {n}
                    </button>
                  ))}
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
                  disabled={players.length < 3}
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

              {players.length < 3 && (
                <div className="warning-message">
                  ⚠️ Il faut au moins 3 joueurs pour commencer
                </div>
              )}

              {players.length >= 3 && selectedInvestigators.length === 0 && (
                <div className="warning-message">
                  👆 Sélectionne au moins un enquêteur
                </div>
              )}
            </div>

            {/* Role Preview */}
            {selectedInvestigators.length > 0 && (
              <div className="role-preview">
                <div className="role-group investigators">
                  <span className="role-label">🔍 Enquêteurs</span>
                  <div className="role-names">
                    {investigators.map(p => p.name).join(', ')}
                  </div>
                </div>
                <div className="role-group players">
                  <span className="role-label">🎭 Joueurs</span>
                  <div className="role-names">
                    {otherPlayers.map(p => p.name).join(', ') || 'Aucun'}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          // PLAYER VIEW
          <div className="player-view">
            <div className="waiting-card">
              <div className="waiting-icon">⏳</div>
              <h2 className="waiting-title">En attente de l'hôte</h2>
              <p className="waiting-text">
                L'hôte va bientôt lancer la partie...
              </p>
            </div>

            <div className="players-list-card">
              <div className="players-list-header">
                <Users size={18} />
                <span>Joueurs connectés ({players.length})</span>
              </div>
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

  /* Header */
  .lobby-header {
    position: relative;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: rgba(10, 10, 15, 0.8);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(6, 182, 212, 0.2);
  }

  .header-left, .header-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .header-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .game-icon {
    font-size: 1.3rem;
  }

  .lobby-title {
    font-family: var(--font-title, 'Bungee'), cursive;
    font-size: 1.1rem;
    color: #ffffff;
    text-shadow:
      0 0 10px rgba(6, 182, 212, 0.8),
      0 0 20px rgba(6, 182, 212, 0.5);
  }

  .help-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 10px;
    background: rgba(6, 182, 212, 0.15);
    color: ${CYAN_LIGHT};
    cursor: pointer;
  }

  /* Main Content */
  .lobby-main {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    position: relative;
    z-index: 1;
  }

  .lobby-content, .player-view {
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-width: 500px;
    margin: 0 auto;
    width: 100%;
  }

  /* Host Join Card */
  .host-join-card {
    background: rgba(20, 20, 30, 0.8);
    border: 1px solid rgba(6, 182, 212, 0.25);
    border-radius: 14px;
    padding: 14px 16px;
  }

  .host-join-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .host-pseudo {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .pseudo-label {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
  }

  .pseudo-name {
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 1rem;
    font-weight: 600;
    color: ${CYAN_LIGHT};
  }

  .host-join-btn {
    padding: 10px 20px;
    border: none;
    border-radius: 10px;
    background: linear-gradient(135deg, ${CYAN_LIGHT}, ${CYAN_PRIMARY});
    color: #0a0a0f;
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-weight: 700;
    cursor: pointer;
  }

  .host-join-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Settings Card */
  .settings-card {
    background: rgba(20, 20, 30, 0.8);
    border: 1px solid rgba(6, 182, 212, 0.25);
    border-radius: 14px;
    padding: 16px;
  }

  .settings-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
  }

  .settings-icon {
    font-size: 1.2rem;
  }

  .settings-title {
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 1rem;
    font-weight: 600;
    color: #ffffff;
  }

  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .setting-row:last-child {
    border-bottom: none;
  }

  .setting-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.7);
  }

  .mode-toggle {
    display: flex;
    gap: 8px;
  }

  .mode-btn {
    padding: 8px 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.3);
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .mode-btn.active {
    background: rgba(6, 182, 212, 0.2);
    border-color: ${CYAN_PRIMARY};
    color: ${CYAN_LIGHT};
  }

  .timer-select, .investigator-select {
    display: flex;
    gap: 6px;
  }

  .timer-btn, .inv-btn {
    padding: 6px 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.3);
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .timer-btn.active, .inv-btn.active {
    background: rgba(6, 182, 212, 0.2);
    border-color: ${CYAN_PRIMARY};
    color: ${CYAN_LIGHT};
  }

  /* Players Card */
  .players-card {
    background: rgba(20, 20, 30, 0.8);
    border: 1px solid rgba(6, 182, 212, 0.25);
    border-radius: 14px;
    padding: 16px;
  }

  .players-header {
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
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 12px;
  }

  .players-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
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
  .waiting-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 32px;
    background: rgba(20, 20, 30, 0.8);
    border: 1px solid rgba(6, 182, 212, 0.25);
    border-radius: 14px;
    text-align: center;
  }

  .waiting-icon {
    font-size: 2.5rem;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.1); opacity: 0.8; }
  }

  .waiting-title {
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 1.2rem;
    color: #ffffff;
  }

  .waiting-text {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.6);
  }

  .players-list-card {
    background: rgba(20, 20, 30, 0.8);
    border: 1px solid rgba(6, 182, 212, 0.25);
    border-radius: 14px;
    padding: 16px;
  }

  .players-list-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    color: #ffffff;
    font-weight: 600;
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
