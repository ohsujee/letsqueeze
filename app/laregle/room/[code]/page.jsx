"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  auth, db, ref, onValue, update, set,
  signInAnonymously, onAuthStateChanged,
} from "@/lib/firebase";
import { motion, AnimatePresence } from 'framer-motion';
import LobbyStartButton from '@/components/game/LobbyStartButton';
import { GameLaunchCountdown } from "@/components/transitions";
import LobbyHeader from "@/components/game/LobbyHeader";
import PlayerBanner from "@/components/game/PlayerBanner";
import { useUserProfile } from "@/lib/hooks/useUserProfile";
import { isPro } from "@/lib/subscription";
import { useHearts } from "@/lib/hooks/useHearts";
import { useHeartsLobbyGuard } from "@/lib/hooks/useHeartsLobbyGuard";
import HeartsModal from "@/components/ui/HeartsModal";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { useHostDisconnect } from "@/lib/hooks/useHostDisconnect";
import { usePlayerCleanup } from "@/lib/hooks/usePlayerCleanup";
import { usePresence } from "@/lib/hooks/usePresence";
import LobbyDisconnectAlert from "@/components/game/LobbyDisconnectAlert";
import { useToast } from "@/lib/hooks/useToast";
import { useWakeLock } from "@/lib/hooks/useWakeLock";
import { useATTPromptInLobby } from "@/lib/hooks/useATTPromptInLobby";
import { Users, Clock, Shuffle, House, Globe, MagnifyingGlass, ArrowRight, HandPointing } from '@phosphor-icons/react';
import GuestAccountPromptModal from "@/components/ui/GuestAccountPromptModal";
import { TROUVE_COLORS, getRandomRulesForVoting } from "@/data/laregle-rules";

const ACCENT = '#00e5ff';
const ACCENT_DARK = '#00b8d9';

export default function LaLoiLobby() {
  const { code } = useParams();
  const router = useRouter();
  const toast = useToast();

  const [meta, setMeta] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [myUid, setMyUid] = useState(null);
  const [joinUrl, setJoinUrl] = useState("");
  const [hostJoined, setHostJoined] = useState(false);
  const [selectedInvestigators, setSelectedInvestigators] = useState([]);
  const [showCountdown, setShowCountdown] = useState(false);
  const roomWasValidRef = useRef(false);
  const isHostRef = useRef(false);
  const countdownTriggeredRef = useRef(false);
  const [isPlayerMissing, setIsPlayerMissing] = useState(false);
  const [rejoinError, setRejoinError] = useState(null);
  const shareModalRef = useRef(null);

  const [mode, setMode] = useState('meme_piece');
  const [timerMinutes, setTimerMinutes] = useState(5);
  const [nbInvestigators, setNbInvestigators] = useState(1);

  const { players } = usePlayers({ roomCode: code, roomPrefix: 'rooms_laregle' });

  const { user: currentUser, profile, subscription, loading: profileLoading } = useUserProfile();
  const userPseudo = profile?.pseudo || currentUser?.displayName?.split(' ')[0] || 'Joueur';
  const userIsPro = currentUser && subscription ? isPro({ ...currentUser, subscription }) : false;
  const { consumeHeart, canPlay, heartsRemaining, canRecharge, rechargeHearts, isRecharging } = useHearts({ isPro: userIsPro });
  const { showHeartsModal, heartsModalProps } = useHeartsLobbyGuard({ isPro: userIsPro, canPlay, canRecharge, rechargeHearts, isRecharging });

  useWakeLock({ enabled: true });
  useATTPromptInLobby(isHost);

  useEffect(() => {
    if (typeof window !== "undefined" && code) setJoinUrl(`${window.location.origin}/join?code=${code}`);
  }, [code]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setMyUid(user.uid);
        const host = meta?.hostUid === user.uid;
        setIsHost(host);
        isHostRef.current = host;
        setHostJoined(players.some(p => p.uid === user.uid));
      } else {
        signInAnonymously(auth).catch(() => {});
      }
    });
    return () => unsub();
  }, [meta?.hostUid, players]);

  useRoomGuard({ roomCode: code, roomPrefix: 'rooms_laregle', playerUid: myUid, isHost, skipKickRedirect: true });
  useHostDisconnect({ roomCode: code, roomPrefix: 'rooms_laregle', hostUid: meta?.hostUid });
  usePresence({ roomCode: code, roomPrefix: 'rooms_laregle', playerUid: myUid, heartbeatInterval: 15000, enabled: !!myUid });

  const { leaveRoom, markVoluntaryLeave, attemptRejoin, isRejoining } = usePlayerCleanup({
    roomCode: code, roomPrefix: 'rooms_laregle', playerUid: myUid, isHost,
    phase: 'lobby', playerName: userPseudo,
    getPlayerData: (uid, name) => ({ uid, name, score: 0, role: 'player', joinedAt: Date.now() }),
    onPlayerRemoved: () => { if (!isHost) setIsPlayerMissing(true); },
    onRejoinSuccess: () => { setIsPlayerMissing(false); setRejoinError(null); },
    onRejoinFailed: (err) => { setRejoinError(err?.message || 'Impossible de rejoindre'); },
  });

  useEffect(() => {
    if (!code) return;
    const metaUnsub = onValue(ref(db, `rooms_laregle/${code}/meta`), (snap) => {
      const m = snap.val();
      if (m && !m.closed) {
        setMeta(m);
        roomWasValidRef.current = true;
        // Joueurs uniquement : ne pas �craser l'�tat local de l'h�te (�vite double re-render)
        if (!isHostRef.current) {
          if (m.mode) setMode(m.mode);
          if (m.timerMinutes) setTimerMinutes(m.timerMinutes);
        }
      }
    });
    const stateUnsub = onValue(ref(db, `rooms_laregle/${code}/state`), (snap) => {
      const state = snap.val();
      if (state?.phase === "choosing" && !countdownTriggeredRef.current) {
        countdownTriggeredRef.current = true;
        setShowCountdown(true);
      }
    });
    return () => { metaUnsub(); stateUnsub(); };
  }, [code, router, players, myUid]);

  useEffect(() => {
    if (!isHost || !userPseudo || !auth.currentUser || hostJoined || profileLoading) return;
    const uid = auth.currentUser.uid;
    set(ref(db, `rooms_laregle/${code}/players/${uid}`), { uid, name: userPseudo, score: 0, role: 'player', joinedAt: Date.now() });
  }, [isHost, userPseudo, hostJoined, code, profileLoading]);

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
      if (prev.includes(uid)) return prev.filter(id => id !== uid);
      if (prev.length < nbInvestigators) return [...prev, uid];
      return [...prev.slice(1), uid];
    });
  };

  const handleRandomInvestigators = () => {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    setSelectedInvestigators(shuffled.slice(0, nbInvestigators).map(p => p.uid));
  };

  const handleStartGame = async () => {
    if (!isHost || selectedInvestigators.length === 0) return;
    consumeHeart();
    try {
      const updates = {};
      players.forEach(p => {
        updates[`rooms_laregle/${code}/players/${p.uid}/role`] = selectedInvestigators.includes(p.uid) ? 'investigator' : 'player';
      });
      updates[`rooms_laregle/${code}/meta/mode`] = mode;
      updates[`rooms_laregle/${code}/meta/timerMinutes`] = timerMinutes;
      const ruleOptions = getRandomRulesForVoting({ onlineOnly: mode === 'a_distance', excludeIds: [] });
      updates[`rooms_laregle/${code}/state`] = {
        phase: 'choosing', investigatorUids: selectedInvestigators, currentRule: null,
        ruleOptions: ruleOptions.map(r => ({ id: r.id, text: r.text, category: r.category, difficulty: r.difficulty })),
        votes: {}, rerollsUsed: 0, guessAttempts: 0, guesses: [], roundNumber: 1,
      };
      await update(ref(db), updates);
    } catch (error) {
      console.error('Erreur lors du lancement:', error);
      toast.error('Erreur lors du lancement de la partie');
    }
  };

  const handleHostExit = async () => {
    if (isHost) await update(ref(db, `rooms_laregle/${code}/meta`), { closed: true });
    router.push('/home');
  };

  const handlePlayerExit = async () => {
    markVoluntaryLeave?.();
    await leaveRoom?.();
    router.push('/home');
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    if (isHost && code) update(ref(db, `rooms_laregle/${code}/meta`), { mode: newMode });
  };

  const handleTimerChange = (newTimer) => {
    setTimerMinutes(newTimer);
    if (isHost && code) update(ref(db, `rooms_laregle/${code}/meta`), { timerMinutes: newTimer });
  };

  const canStart = isHost && players.length >= 2 && selectedInvestigators.length > 0;

  if (!meta) {
    return (
      <div className="laregle-lobby game-page">
        <div className="lobby-loading">
          <div className="loading-ring" />
          <p>Chargement...</p>
        </div>
        <style jsx>{pageStyles}</style>
      </div>
    );
  }

  return (
    <div className="laregle-lobby game-page">
      <AnimatePresence>
        {showCountdown && (
          <GameLaunchCountdown
            gameColor={ACCENT}
            onComplete={() => {
              const myPlayer = players.find(p => p.uid === myUid);
              router.push(myPlayer?.role === 'investigator'
                ? `/laregle/game/${code}/investigate`
                : `/laregle/game/${code}/play`
              );
            }}
          />
        )}
      </AnimatePresence>

      <GuestAccountPromptModal currentUser={currentUser} isHost={isHost} />
      <HeartsModal isOpen={showHeartsModal} heartsRemaining={heartsRemaining} {...heartsModalProps} />
      <LobbyDisconnectAlert
        isVisible={isPlayerMissing && !isHost} isRejoining={isRejoining}
        onRejoin={attemptRejoin} onGoHome={() => router.push('/home')}
        error={rejoinError} gameColor={ACCENT}
      />

      <LobbyHeader
        ref={shareModalRef} variant="laregle" code={code} isHost={isHost}
        players={players} hostUid={meta?.hostUid}
        onHostExit={handleHostExit} onPlayerExit={handlePlayerExit} joinUrl={joinUrl}
      />

      <main className="lobby-main">
        <div className="lobby-content">

          {/* Settings */}
          <motion.div
            className="settings-panel"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="setting-row">
              <span className="setting-label">Mode</span>
              <div className="setting-options">
                {isHost ? (
                  <>
                    <button className={`opt-btn${mode === 'meme_piece' ? ' active' : ''}`} onClick={() => handleModeChange('meme_piece')}>
                      <House size={14} weight="bold" />Même pièce
                    </button>
                    <button className={`opt-btn${mode === 'a_distance' ? ' active' : ''}`} onClick={() => handleModeChange('a_distance')}>
                      <Globe size={14} weight="bold" />À distance
                    </button>
                  </>
                ) : (
                  <span className="setting-value">
                    {mode === 'meme_piece' ? <><House size={13} weight="bold" />Même pièce</> : <><Globe size={13} weight="bold" />À distance</>}
                  </span>
                )}
              </div>
            </div>

            <div className="setting-divider" />

            <div className="setting-row">
              <span className="setting-label"><Clock size={13} weight="bold" />Timer</span>
              <div className="setting-options">
                {isHost ? (
                  [3, 5, 7, 10].map(mins => (
                    <button key={mins} className={`opt-btn opt-btn-sm${timerMinutes === mins ? ' active' : ''}`} onClick={() => handleTimerChange(mins)}>
                      {mins}m
                    </button>
                  ))
                ) : (
                  <span className="setting-value">{timerMinutes} min</span>
                )}
              </div>
            </div>

            {isHost && (
              <>
                <div className="setting-divider" />
                <div className="setting-row">
                  <span className="setting-label"><MagnifyingGlass size={13} weight="bold" />Enquêteurs</span>
                  <div className="setting-options">
                    <div className="stepper">
                      <button className="stepper-btn" onClick={() => { const v = Math.max(1, nbInvestigators - 1); setNbInvestigators(v); setSelectedInvestigators(prev => prev.slice(0, v)); }} disabled={nbInvestigators <= 1}>−</button>
                      <span className="stepper-value">{nbInvestigators}</span>
                      <button className="stepper-btn" onClick={() => setNbInvestigators(prev => prev + 1)} disabled={players.length <= 1 || nbInvestigators >= players.length - 1}>+</button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.div>

          {/* Players */}
          <div className="lrl-players-wrapper">
            <div className="players-header">
              <div className="players-title-row">
                <Users size={15} weight="bold" />
                <span className="players-title">Joueurs</span>
                <span className="players-count">{players.length}</span>
              </div>
              {isHost && (
                <button className="random-btn" onClick={handleRandomInvestigators} disabled={players.length < 2}>
                  <Shuffle size={13} weight="bold" />Aléatoire
                </button>
              )}
            </div>

            {isHost && (
              <div className="hint-callout">
                <HandPointing size={18} weight="fill" />
                <span>Appuie sur un joueur pour le désigner enquêteur</span>
              </div>
            )}
          </div>

          <div className="lrl-players">
            <div className="players-list">
              {[...players].sort((a, b) => a.uid === myUid ? -1 : b.uid === myUid ? 1 : 0).map((player, index) => (
                <motion.div
                  key={player.uid}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.25 }}
                  whileHover={isHost ? { y: -2, scale: 1.01 } : {}}
                  whileTap={isHost ? { scale: 0.98 } : {}}
                  style={{ cursor: isHost ? 'pointer' : 'default', overflow: 'visible' }}
                >
                  <PlayerBanner
                    player={player}
                    isMe={player.uid === myUid}
                    isSelected={selectedInvestigators.includes(player.uid)}
                    selectedLabel="Enquêteur"
                    onSelect={isHost ? toggleInvestigator : null}
                    accentColor={ACCENT}
                    accentDark={ACCENT_DARK}
                  />
                </motion.div>
              ))}
            </div>
          </div>

        </div>
      </main>

      {isHost && (
        <footer className="lobby-footer">
          <LobbyStartButton
            gameColor={ACCENT}
            icon={canStart ? <ArrowRight size={20} weight="bold" /> : players.length < 2 ? <Users size={20} weight="bold" /> : <MagnifyingGlass size={18} weight="bold" />}
            label={canStart ? 'Commencer' : players.length < 2 ? '2 joueurs minimum' : 'Choisis un enquêteur'}
            disabled={!canStart}
            onClick={handleStartGame}
          />
        </footer>
      )}

      <style jsx>{pageStyles}</style>
    </div>
  );
}

const pageStyles = `
  .laregle-lobby {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: #0d0d14;
    position: relative;
  }

  .laregle-lobby::before {
    content: '';
    position: fixed;
    inset: 0;
    z-index: 0;
    background:
      radial-gradient(ellipse at 15% 85%, rgba(0, 229, 255, 0.12) 0%, transparent 50%),
      radial-gradient(ellipse at 85% 15%, rgba(0, 184, 217, 0.08) 0%, transparent 50%),
      #0d0d14;
    pointer-events: none;
  }

  .laregle-lobby > * {
    position: relative;
    z-index: 1;
  }

  .lobby-loading {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    color: #5a5a72;
    font-size: 0.85rem;
  }

  .loading-ring {
    width: 30px;
    height: 30px;
    border: 2px solid #1e1e30;
    border-top-color: #00e5ff;
    border-radius: 50%;
    animation: spin 0.9s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }


  .lobby-main {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 14px 16px;
  }

  .lobby-content {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 480px;
    margin: 0 auto;
    width: 100%;
  }

  /* ── Settings panel ── */
  .settings-panel {
    flex-shrink: 0;
    position: relative;
    background: rgba(20, 20, 30, 0.85);
    border: 1.5px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    overflow: hidden;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow: 0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06);
    padding: 4px 0;
  }

  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 16px;
    min-height: 48px;
  }

  .setting-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
    font-weight: 700;
    color: #ffffff;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    flex-shrink: 0;
  }

  .setting-value {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 0.9rem;
    font-weight: 700;
    color: #ffffff;
  }

  .setting-divider {
    height: 1px;
    background: rgba(255,255,255,0.05);
    margin: 0 16px;
  }

  .setting-options {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .opt-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border: 1.5px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    background: rgba(255,255,255,0.05);
    color: rgba(255,255,255,0.5);
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    touch-action: manipulation;
    outline: none;
    -webkit-tap-highlight-color: transparent;
    transition: all 0.18s ease;
    white-space: nowrap;
  }

  .opt-btn:hover:not(.active) {
    background: rgba(255,255,255,0.1);
    border-color: rgba(255,255,255,0.25);
    transform: translateY(-1px);
  }

  .opt-btn:active { transform: scale(0.94); }

  .opt-btn.active {
    background: linear-gradient(135deg, rgba(0,229,255,0.3), rgba(0,229,255,0.15));
    border-color: #00e5ff;
    color: #00e5ff;
    box-shadow: 0 0 14px rgba(0,229,255,0.3), inset 0 1px 0 rgba(255,255,255,0.15);
    text-shadow: 0 0 8px rgba(0,229,255,0.4);
  }

  .opt-btn-sm {
    padding: 7px 11px;
    min-width: 40px;
    justify-content: center;
  }

  /* Stepper */
  .stepper {
    display: flex;
    align-items: center;
    background: rgba(255,255,255,0.03);
    border: 1.5px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    overflow: hidden;
    gap: 0;
    outline: none;
  }

  .stepper-btn {
    width: 36px;
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    outline: none;
    -webkit-tap-highlight-color: transparent;
    background: transparent;
    color: rgba(255,255,255,0.5);
    font-size: 1.2rem;
    font-weight: 700;
    cursor: pointer;
    touch-action: manipulation;
    transition: background 0.15s ease, color 0.15s ease, transform 0.1s ease;
  }

  .stepper-btn:hover:not(:disabled) {
    background: rgba(0,229,255,0.1);
    color: #00e5ff;
  }

  .stepper-btn:active:not(:disabled) { transform: scale(0.88); }

  .stepper-btn:disabled { opacity: 0.3; cursor: not-allowed; }

  .stepper-value {
    min-width: 34px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,229,255,0.08);
    border: none !important;
    font-size: 1rem;
    font-weight: 800;
    color: #00e5ff;
    text-shadow: 0 0 8px rgba(0,229,255,0.4);
  }

  /* ── Players section ── */
  .lrl-players-wrapper {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 0 4px;
  }

  .lrl-players {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: visible;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: auto;
    padding: 2px 2px 4px;
  }

  .players-header {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .players-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #ffffff;
  }

  .players-title {
    font-size: 0.75rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #ffffff;
  }

  /* Badge count : bloc solide coloré */
  .players-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    height: 22px;
    padding: 0 7px;
    border-radius: 6px;
    background: #00e5ff;
    color: #0a0a0f;
    font-size: 0.75rem;
    font-weight: 800;
  }

  .hint-callout {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: linear-gradient(135deg, #00e5ff, #00b8d9);
    border-radius: 12px;
    color: #0a0a0f;
    font-size: 0.82rem;
    font-weight: 700;
    border: 1.5px solid rgba(0,229,255,0.6);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.25), inset 0 0 16px rgba(0,229,255,0.15);
  }

  .random-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 12px;
    border: none;
    border-radius: 10px;
    background: #2e2e2e;
    color: #ffffff;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    touch-action: manipulation;
    transition: background 0.15s ease, color 0.15s ease, transform 0.1s ease;
  }

  .random-btn:hover:not(:disabled) {
    background: #00e5ff;
    color: #0a0a0f;
  }

  .random-btn:active:not(:disabled) { transform: scale(0.94); }
  .random-btn:disabled { opacity: 0.25; cursor: not-allowed; }

  .players-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    overflow: visible;
  }

  /* ── Footer ── */
  .lobby-footer {
    position: relative;
    z-index: 10;
    padding: 14px 16px;
    background: #0d0d14;
    border-top: 2px solid #333333;
  }

  /* Bouton start : flat gaming avec ombre 0-blur */
  .start-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    max-width: 480px;
    margin: 0 auto;
    padding: 16px 20px;
    border: none;
    border-radius: 14px;
    cursor: pointer;
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 1rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    white-space: nowrap;
    color: #0a0a0f;
    background: #00e5ff;
    touch-action: manipulation;
    transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.15s ease;
  }

  .start-btn:hover:not(.disabled) { background: #33eeff; }

  .start-btn:active:not(.disabled) {
    transform: scale(0.97);
  }

  .start-btn.disabled {
    background: #252538;
    color: #c4c4d8;
    cursor: not-allowed;
  }

`;





