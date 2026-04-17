"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  auth, db, ref, onValue, update, set,
  signInAnonymously, onAuthStateChanged,
} from "@/lib/firebase";
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { GameLaunchCountdown } from "@/components/transitions";
import LobbyHeader from "@/components/game/LobbyHeader";
import PlayerBanner from "@/components/game/PlayerBanner";
import TeamCard from '@/components/game/TeamCard';
import PaywallModal from "@/components/ui/PaywallModal";
import { useUserProfile } from "@/lib/hooks/useUserProfile";
import { usePlayerCleanup } from "@/lib/hooks/usePlayerCleanup";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { usePresence } from "@/lib/hooks/usePresence";
import { useHostDisconnect } from "@/lib/hooks/useHostDisconnect";
import LobbyDisconnectAlert from "@/components/game/LobbyDisconnectAlert";
import { isPro } from "@/lib/subscription";
import { useHearts } from "@/lib/hooks/useHearts";
import { useHeartsLobbyGuard } from "@/lib/hooks/useHeartsLobbyGuard";
import HeartsModal from "@/components/ui/HeartsModal";
import { useToast } from "@/lib/hooks/useToast";
import { usePlaylistHistory } from "@/lib/hooks/usePlaylistHistory";
import LobbyStartButton from "@/components/game/LobbyStartButton";
import { storage } from "@/lib/utils/storage";
import { useTeamMode } from "@/lib/hooks/useTeamMode";
import { useAppShellBg } from "@/lib/hooks/useAppShellBg";
import {
  searchPlaylists, getFeaturedPlaylists,
  getRandomTracksFromPlaylist, formatTracksForGame
} from "@/lib/deezer/api";
import TeamTabs from "@/lib/components/TeamTabs";
import GuestAccountPromptModal from "@/components/ui/GuestAccountPromptModal";
import { calculatePartyModeQuestions } from "@/lib/config/rooms";
import {
  CaretRight, MusicNote, MagnifyingGlass, X, SpeakerHigh,
  Lightning, UsersThree, Info, CaretDown, ArrowRight, Users, Check,
} from '@phosphor-icons/react';
import { getFlatCSSVars, GAME_COLORS } from '@/lib/config/colors';
import '@/components/game/lobby-base.css';
import '@/components/game/player-team-view.css';
import './blindtest-lobby.css';
import '@/components/ui/playlist-modal.css';

const ACCENT = GAME_COLORS.deeztest.primary;
const ACCENT_DARK = GAME_COLORS.deeztest.dark;

export function BlindTestLobbyContent({ code, myUid: devUid, isHost: devIsHost }) {
  useAppShellBg('#0e0e1a');
  const nextRouter = useRouter();
  const noopRouter = useMemo(() => ({ push: () => {}, replace: () => {}, back: () => {} }), []);
  const router = devUid ? noopRouter : nextRouter;
  const toast = useToast();

  const [meta, setMeta] = useState(null);
  const [teams, setTeams] = useState({});
  const [isHost, setIsHost] = useState(devIsHost || false);
  const [joinUrl, setJoinUrl] = useState("");
  const [showPaywall, setShowPaywall] = useState(false);
  const [showPlaylistSelector, setShowPlaylistSelector] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const countdownTriggeredRef = useRef(false);
  const roomWasValidRef = useRef(false);
  const [myUid, setMyUid] = useState(devUid || null);
  const [isPlayerMissing, setIsPlayerMissing] = useState(false);
  const [rejoinError, setRejoinError] = useState(null);
  const shareModalRef = useRef(null);
  const listRef = useRef(null);
  const [canScrollDown, setCanScrollDown] = useState(false);

  // Deezer state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [featuredPlaylists, setFeaturedPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(false);
  const searchTimeoutRef = useRef(null);
  const [isStarting, setIsStarting] = useState(false);

  const { user: currentUser, profile, subscription, loading: profileLoading } = useUserProfile();
  const userIsPro = currentUser && subscription ? isPro({ ...currentUser, subscription }) : false;
  const { consumeHeart, canPlay, heartsRemaining, canRecharge, rechargeHearts, isRecharging } = useHearts({ isPro: userIsPro });
  const { showHeartsModal, heartsModalProps } = useHeartsLobbyGuard({ isPro: userIsPro, canPlay, canRecharge, rechargeHearts, isRecharging });

  const { players } = usePlayers({ roomCode: code, roomPrefix: 'rooms_blindtest' });
  const { getPlayedTracks, markTracksAsPlayed } = usePlaylistHistory();

  const {
    mode, isTeamMode,
    teams: teamModeTeams, teamCount,
    handleModeToggle, handleTeamCountChange,
    handleAssignToTeam, handleRemoveFromTeam,
    handleAutoBalance, handleResetTeams
  } = useTeamMode({
    roomCode: code, roomPrefix: 'rooms_blindtest',
    meta, players, isHost
  });

  // Scroll tracking for player list
  const checkScroll = () => {
    const el = listRef.current;
    if (!el) return;
    setCanScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 8);
  };
  useEffect(() => { checkScroll(); }, [players.length]);

  useEffect(() => {
    if (typeof window !== "undefined" && code) {
      setJoinUrl(`${window.location.origin}/join?code=${code}`);
    }
  }, [code]);

  useEffect(() => {
    const loadFeatured = async () => {
      setIsLoadingFeatured(true);
      try {
        const playlists = await getFeaturedPlaylists(20);
        setFeaturedPlaylists(playlists);
      } catch (error) {
        console.error("Error loading featured playlists:", error);
      } finally {
        setIsLoadingFeatured(false);
      }
    };
    loadFeatured();
  }, []);

  useEffect(() => {
    if (devUid) return;
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setMyUid(user.uid);
        setIsHost(meta?.hostUid === user.uid);
      } else {
        signInAnonymously(auth).catch(() => {});
      }
    });
    return () => unsub();
  }, [meta?.hostUid, devUid]);

  const userPseudo = profile?.pseudo || currentUser?.displayName?.split(' ')[0] || 'Joueur';

  usePresence({
    roomCode: code, roomPrefix: 'rooms_blindtest',
    playerUid: myUid, heartbeatInterval: 15000,
    enabled: !!myUid && !devUid
  });

  const { leaveRoom, attemptRejoin, isRejoining } = usePlayerCleanup({
    roomCode: code, roomPrefix: 'rooms_blindtest',
    playerUid: myUid, phase: 'lobby',
    playerName: userPseudo, isHost,
    getPlayerData: (uid, name) => ({
      uid, name, score: 0, teamId: "",
      blockedUntil: 0, joinedAt: Date.now()
    }),
    onPlayerRemoved: () => { if (!isHost) setIsPlayerMissing(true); },
    onRejoinSuccess: () => { setIsPlayerMissing(false); setRejoinError(null); },
    onRejoinFailed: (err) => { setRejoinError(err?.message || 'Impossible de rejoindre'); }
  });

  const { markVoluntaryLeave } = useRoomGuard({
    roomCode: code, roomPrefix: 'rooms_blindtest',
    playerUid: myUid, isHost,
    skipKickRedirect: true, enabled: !devUid
  });

  useHostDisconnect({
    roomCode: code, roomPrefix: 'rooms_blindtest',
    hostUid: devUid ? null : meta?.hostUid
  });

  // Firebase listeners
  useEffect(() => {
    if (!code) return;
    const metaUnsub = onValue(ref(db, `rooms_blindtest/${code}/meta`), (snap) => {
      const m = snap.val();
      if (m) {
        if (m.closed) return;
        setMeta(m);
        setTeams(m?.teams || {});
        setSelectedPlaylist(m?.playlist || null);
        roomWasValidRef.current = true;
      } else if (roomWasValidRef.current) {
        toast.warning("L'hôte a quitté la partie");
        router.push('/home');
      }
    });
    const stateUnsub = onValue(ref(db, `rooms_blindtest/${code}/state`), (snap) => {
      const state = snap.val();
      if (state?.phase === "playing" && !countdownTriggeredRef.current) {
        countdownTriggeredRef.current = true;
        setShowCountdown(true);
      }
    });
    return () => { metaUnsub(); stateUnsub(); };
  }, [code, router, isHost]);

  // ── Deezer handlers ──

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!query.trim()) { setSearchResults([]); return; }
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchPlaylists(query, 20);
        setSearchResults(results);
      } catch (error) {
        console.error("Search error:", error);
        toast.error("Erreur de recherche");
      } finally {
        setIsSearching(false);
      }
    }, 500);
  };

  const handleSelectPlaylist = async (playlist) => {
    if (!isHost) return;
    try {
      setIsSearching(true);
      const playedIds = getPlayedTracks(playlist.id);
      const tracks = await getRandomTracksFromPlaylist(playlist.id, 20, playedIds);
      if (tracks.length < 5) {
        toast.error("Playlist trop petite (minimum 5 titres)");
        setIsSearching(false);
        return;
      }
      const formattedTracks = formatTracksForGame(tracks);
      const newPlaylist = {
        id: playlist.id, name: playlist.name,
        image: playlist.image, totalTracks: formattedTracks.length,
        tracks: formattedTracks.map(t => ({
          id: t.id, title: t.title, artist: t.artist,
          previewUrl: t.previewUrl, albumArt: t.albumArt,
        })),
      };
      await update(ref(db, `rooms_blindtest/${code}/meta`), { playlist: newPlaylist });
      setSelectedPlaylist(newPlaylist);
      setSearchQuery("");
      setSearchResults([]);
      setShowPlaylistSelector(false);
    } catch (error) {
      console.error("Error selecting playlist:", error);
      toast.error(error.message || "Erreur lors de la sélection");
    } finally {
      setIsSearching(false);
    }
  };

  // ── Start game ──

  const handleStartGame = async () => {
    if (!isHost || !selectedPlaylist || isStarting) return;
    consumeHeart();
    setIsStarting(true);
    try {
      const isPartyMode = meta?.gameMasterMode === 'party';

      if (isPartyMode && myUid) {
        const hostAsPlayer = players.find(p => p.uid === myUid);
        if (!hostAsPlayer) {
          await set(ref(db, `rooms_blindtest/${code}/players/${myUid}`), {
            uid: myUid, name: meta?.hostName || userPseudo,
            score: 0, teamId: "", blockedUntil: 0,
            joinedAt: Date.now(), status: 'active'
          });
        }
      }

      let trackCount = selectedPlaylist.totalTracks || 20;
      let activePlayers = [];

      if (isPartyMode) {
        activePlayers = [...players.filter(p => p.status !== 'left')];
        if (myUid && !activePlayers.find(p => p.uid === myUid)) {
          activePlayers.push({ uid: myUid, name: meta?.hostName || userPseudo, teamId: "" });
        }
        trackCount = calculatePartyModeQuestions(activePlayers.length);
      }

      console.log("[DeezTest] Refreshing tracks before game start...");
      const playedIds = getPlayedTracks(selectedPlaylist.id);
      const freshTracks = await getRandomTracksFromPlaylist(selectedPlaylist.id, trackCount, playedIds);
      const formattedTracks = formatTracksForGame(freshTracks);

      const refreshedPlaylist = {
        ...selectedPlaylist,
        tracks: formattedTracks.map(t => ({
          id: t.id, title: t.title, artist: t.artist,
          previewUrl: t.previewUrl, albumArt: t.albumArt,
        })),
      };

      console.log("[DeezTest] Tracks refreshed, starting game...");

      let askerRotationFields = {};
      if (isPartyMode) {
        if (meta?.mode === 'équipes') {
          const teamIds = Object.keys(meta?.teams || {}).filter(teamId => {
            return activePlayers.filter(p => p.teamId === teamId).length > 0;
          });
          for (let i = teamIds.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [teamIds[i], teamIds[j]] = [teamIds[j], teamIds[i]];
          }
          const firstTeamPlayers = activePlayers.filter(p => p.teamId === teamIds[0]);
          const firstAsker = firstTeamPlayers[Math.floor(Math.random() * firstTeamPlayers.length)];
          askerRotationFields = {
            askerRotation: teamIds, askerIndex: 0,
            currentAskerUid: firstAsker?.uid || null, currentAskerTeamId: teamIds[0] || null
          };
        } else {
          const shuffledPlayers = [...activePlayers];
          for (let i = shuffledPlayers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledPlayers[i], shuffledPlayers[j]] = [shuffledPlayers[j], shuffledPlayers[i]];
          }
          const rotation = shuffledPlayers.map(p => p.uid);
          askerRotationFields = {
            askerRotation: rotation, askerIndex: 0,
            currentAskerUid: rotation[0] || null, currentAskerTeamId: null
          };
        }
      }

      await update(ref(db, `rooms_blindtest/${code}`), {
        'meta/playlist': refreshedPlaylist,
        state: {
          phase: "playing", currentIndex: 0,
          revealed: false, snippetLevel: 0, highestSnippetLevel: -1,
          lockUid: null, buzzBanner: "", elapsedAcc: 0,
          lastRevealAt: 0, pausedAt: null, lockedAt: null,
          ...askerRotationFields
        }
      });
    } catch (error) {
      console.error('Erreur lors du lancement:', error);
      toast.error(error.message || 'Erreur lors du lancement de la partie');
      setIsStarting(false);
    }
  };

  // ── Exit handlers ──

  const handleHostExit = async () => {
    if (isHost) await update(ref(db, `rooms_blindtest/${code}/meta`), { closed: true });
    router.push('/home');
  };

  const handlePlayerExit = async () => {
    markVoluntaryLeave();
    await leaveRoom();
    router.push('/home');
  };

  const handleUpdateTeamName = async (teamId, newName) => {
    if (!code || !newName?.trim()) return;
    await update(ref(db, `rooms_blindtest/${code}/meta/teams/${teamId}`), { name: newName.trim() });
  };

  // ── Derived state ──

  const canStart = isHost && selectedPlaylist && players.length > 0;
  const startIcon = canStart ? <ArrowRight size={20} weight="bold" /> : <MusicNote size={20} weight="bold" />;
  const startLabel = canStart ? 'Commencer' : 'Choisis une playlist';

  // ── Loading ──

  if (!meta) {
    return (
      <div className="blindtest-lobby-loading">
        <div className="blindtest-lobby-spinner" />
        <p className="blindtest-lobby-loading-text">Chargement...</p>
      </div>
    );
  }

  // ── Render ──

  return (
    <div className="blindtest-lobby game-page" style={getFlatCSSVars('deeztest')}>

      {/* Modals */}
      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)}
        contentType="playlist" contentName="Playlists illimitées" />
      <GuestAccountPromptModal currentUser={currentUser} isHost={isHost} />
      <HeartsModal isOpen={showHeartsModal} heartsRemaining={heartsRemaining} {...heartsModalProps} />
      <LobbyDisconnectAlert
        isVisible={isPlayerMissing && !isHost} isRejoining={isRejoining}
        onRejoin={attemptRejoin} onGoHome={() => router.push('/home')}
        error={rejoinError} gameColor={ACCENT}
      />

      {/* Countdown */}
      <AnimatePresence>
        {showCountdown && (
          <GameLaunchCountdown
            gameColor={ACCENT}
            onComplete={() => {
              if (meta?.gameMasterMode === 'party') router.push(`/blindtest/game/${code}/play`);
              else if (isHost) router.push(`/blindtest/game/${code}/host`);
              else router.push(`/blindtest/game/${code}/play`);
            }}
          />
        )}
      </AnimatePresence>

      {/* Playlist Selector Modal */}
      <AnimatePresence>
        {showPlaylistSelector && (
          <motion.div
            className="playlist-modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowPlaylistSelector(false)}
          >
            <motion.div
              className="playlist-modal"
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="playlist-modal-header">
                <h2>Choisir une playlist</h2>
                <button className="modal-close-btn" onClick={() => setShowPlaylistSelector(false)}>
                  <X size={20} weight="bold" />
                </button>
              </div>

              <div className="playlist-search-wrapper">
                <MagnifyingGlass size={18} className="search-icon" />
                <input
                  type="text" placeholder="Rechercher une playlist..."
                  value={searchQuery} onChange={(e) => handleSearch(e.target.value)}
                  className="playlist-search-input" autoFocus
                />
                {isSearching && <div className="search-spinner" />}
              </div>

              <div className="playlist-modal-content">
                {searchResults.length > 0 ? (
                  <>
                    <span className="playlist-section-label">Résultats</span>
                    <div className="playlist-grid">
                      {searchResults.map(playlist => (
                        <div key={playlist.id} className="playlist-option"
                          onClick={() => handleSelectPlaylist(playlist)}>
                          {playlist.image ? (
                            <img src={playlist.image} alt={playlist.name} className="playlist-option-img" />
                          ) : (
                            <div className="playlist-option-placeholder">
                              <MusicNote size={24} />
                            </div>
                          )}
                          <div className="playlist-option-info">
                            <span className="playlist-option-name">{playlist.name}</span>
                            <span className="playlist-option-meta">{playlist.totalTracks} titres • {playlist.creator}</span>
                          </div>
                          <CaretRight size={18} className="playlist-option-arrow" />
                        </div>
                      ))}
                    </div>
                  </>
                ) : !searchQuery && featuredPlaylists.length > 0 ? (
                  <>
                    <span className="playlist-section-label">Populaires</span>
                    <div className="playlist-grid">
                      {featuredPlaylists.map(playlist => (
                        <div key={playlist.id} className="playlist-option"
                          onClick={() => handleSelectPlaylist(playlist)}>
                          {playlist.image ? (
                            <img src={playlist.image} alt={playlist.name} className="playlist-option-img" />
                          ) : (
                            <div className="playlist-option-placeholder">
                              <MusicNote size={24} />
                            </div>
                          )}
                          <div className="playlist-option-info">
                            <span className="playlist-option-name">{playlist.name}</span>
                            <span className="playlist-option-meta">{playlist.totalTracks} titres</span>
                          </div>
                          <CaretRight size={18} className="playlist-option-arrow" />
                        </div>
                      ))}
                    </div>
                  </>
                ) : !searchQuery && isLoadingFeatured ? (
                  <div className="playlist-empty">
                    <div className="search-spinner" />
                    <p>Chargement...</p>
                  </div>
                ) : searchQuery && !isSearching ? (
                  <div className="playlist-empty">
                    <MusicNote size={32} />
                    <p>Aucun résultat</p>
                  </div>
                ) : !searchQuery ? (
                  <div className="playlist-empty">
                    <MagnifyingGlass size={32} />
                    <p>Recherche une playlist</p>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <LobbyHeader
          ref={shareModalRef} variant="deeztest" code={code} isHost={isHost}
          players={players} hostUid={meta?.hostUid}
          onHostExit={handleHostExit} onPlayerExit={handlePlayerExit}
          joinUrl={joinUrl} gameMode={meta?.gameMasterMode}
        />
      </div>

      {/* Main */}
      <main className="blindtest-lobby-main">

        {/* Host settings panel */}
        <AnimatePresence>
          {isHost && (
            <LayoutGroup>
              <motion.div
                key="settings"
                className="blindtest-settings-panel"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {/* Playlist selector row */}
                <motion.div
                  className="blindtest-selector-row"
                  onClick={() => setShowPlaylistSelector(true)}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="blindtest-selector-logo">
                    {/* Deezer Equalizer Logo */}
                    <svg viewBox="0 0 44 28" width="44" height="28" fill="none">
                      <rect x="0" y="23" width="9" height="5" rx="1" fill="#FF0092"/>
                      <rect x="11" y="23" width="9" height="5" rx="1" fill="#FF0092"/>
                      <rect x="11" y="16" width="9" height="5" rx="1" fill="#A238FF"/>
                      <rect x="11" y="9" width="9" height="5" rx="1" fill="#C574FF"/>
                      <rect x="22" y="23" width="9" height="5" rx="1" fill="#FF0092"/>
                      <rect x="22" y="16" width="9" height="5" rx="1" fill="#A238FF"/>
                      <rect x="33" y="23" width="9" height="5" rx="1" fill="#FF0092"/>
                      <rect x="33" y="16" width="9" height="5" rx="1" fill="#A238FF"/>
                      <rect x="33" y="9" width="9" height="5" rx="1" fill="#C574FF"/>
                      <rect x="33" y="2" width="9" height="5" rx="1" fill="#C574FF"/>
                    </svg>
                  </div>
                  <div className="blindtest-selector-info">
                    <div className="blindtest-selector-name">
                      {selectedPlaylist ? selectedPlaylist.name : 'Choisis une playlist'}
                    </div>
                    {selectedPlaylist && (
                      <div className="blindtest-selector-detail">{selectedPlaylist.totalTracks} titres</div>
                    )}
                  </div>
                  <div className="blindtest-selector-action">
                    <span className="blindtest-selector-action-label">
                      {selectedPlaylist ? 'Changer' : 'Choisir'}
                    </span>
                    <CaretRight size={14} weight="bold" color={ACCENT} />
                  </div>
                </motion.div>

                {/* Deezer badges */}
                <div className="blindtest-badges-row">
                  <div className="blindtest-deezer-badge">
                    <Check size={12} weight="bold" />
                    <span>Powered by Deezer</span>
                  </div>
                  {meta?.audioMode === 'all' && (
                    <div className="blindtest-audio-badge">
                      <SpeakerHigh size={12} weight="bold" />
                      <span>Audio Synchronisé</span>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="blindtest-settings-divider" />

                {/* Mode segmented control */}
                <div className="blindtest-mode-control">
                  {[
                    { val: 'individuel', label: 'Solo', icon: <Lightning size={14} weight="bold" /> },
                    { val: 'équipes', label: 'Équipes', icon: <UsersThree size={14} weight="bold" /> },
                  ].map(({ val, label, icon }) => {
                    const active = mode === val || (!isTeamMode && val === 'individuel') || (isTeamMode && val === 'équipes');
                    return (
                      <motion.button
                        key={val}
                        className={`blindtest-mode-btn${active ? ' active' : ''}`}
                        onClick={handleModeToggle}
                        whileTap={{ scale: 0.97 }}
                      >
                        {active && (
                          <motion.div
                            layoutId="bt-mode-pill"
                            className="blindtest-mode-pill"
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          />
                        )}
                        {icon}
                        {label}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Team count selector */}
                <AnimatePresence>
                  {isTeamMode && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 14 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="lobby-team-count-row">
                        <span className="lobby-team-count-label">Nombre d'équipes</span>
                        <div className="lobby-team-count-btns">
                          {[2, 3, 4].map(count => {
                            const active = (teamCount || 2) === count;
                            return (
                              <button
                                key={count}
                                className={`lobby-team-count-btn${active ? ' active' : ''}`}
                                onClick={() => handleTeamCountChange(count)}
                              >
                                {count}
                                {active && (
                                  <motion.div
                                    layoutId="bt-team-count-bar"
                                    className="lobby-team-count-bar"
                                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </LayoutGroup>
          )}
        </AnimatePresence>

        {/* Player settings (non-host) */}
        {!isHost && (
          <motion.div className="lobby-player-settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="lobby-player-settings-info">
              <span className="lobby-player-settings-emoji">🎵</span>
              <div style={{ minWidth: 0 }}>
                <div className="lobby-player-settings-name">
                  {selectedPlaylist?.name || 'Playlist en attente'}
                </div>
                {selectedPlaylist && (
                  <span className="blindtest-player-settings-detail">{selectedPlaylist.totalTracks} titres</span>
                )}
              </div>
            </div>
            <div className="blindtest-player-settings-mode">
              {isTeamMode
                ? <><UsersThree size={14} weight="bold" /> Équipes</>
                : <><Lightning size={14} weight="bold" /> Solo</>
              }
            </div>
          </motion.div>
        )}

        {/* Team management (host, team mode) */}
        {isHost && isTeamMode && teamModeTeams && Object.keys(teamModeTeams).length > 0 && (
          <div className="blindtest-team-management">
            <TeamTabs
              teams={teamModeTeams} players={players} teamCount={teamCount}
              onAssignToTeam={handleAssignToTeam} onRemoveFromTeam={handleRemoveFromTeam}
              onAutoBalance={handleAutoBalance} onResetTeams={handleResetTeams}
              onUpdateTeamName={handleUpdateTeamName}
            />
          </div>
        )}

        {/* Player team view (non-host) — TeamCard pattern */}
        {!isHost && isTeamMode && (() => {
          const myTeamId = players.find(p => p.uid === myUid)?.teamId;
          const teamEntries = Object.entries(teamModeTeams).slice(0, teamCount);
          const myTeamEntry = teamEntries.find(([id]) => id === myTeamId);
          const otherTeams = teamEntries.filter(([id]) => id !== myTeamId);

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {!myTeamId && (
                <div className="blindtest-no-team-banner">
                  <span className="blindtest-no-team-emoji">&#x23F3;</span>
                  <span className="blindtest-no-team-text">L'hôte va t'assigner à une équipe...</span>
                </div>
              )}

              {myTeamEntry && (
                <>
                  <span className="player-team-section-label">Ton équipe</span>
                  <TeamCard
                    team={{ id: myTeamEntry[0], ...myTeamEntry[1] }}
                    teamPlayers={players.filter(p => p.teamId === myTeamEntry[0])}
                    isMyTeam={true} myUid={myUid}
                    canEdit={true} canManage={false}
                    onUpdateName={(name) => handleUpdateTeamName(myTeamEntry[0], name)}
                  />
                </>
              )}

              {otherTeams.length > 0 && (
                <>
                  <div className="player-team-divider" />
                  <span className="player-team-section-label">Autres équipes</span>
                  <div className="teams-grid">
                    <AnimatePresence mode="popLayout">
                      {otherTeams.map(([id, team], i) => (
                        <motion.div key={id} layout
                          initial={{ opacity: 0, scale: 0.9, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: -10 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 28, delay: i * 0.05 }}
                        >
                          <TeamCard
                            team={{ id, ...team }}
                            teamPlayers={players.filter(p => p.teamId === id)}
                            isMyTeam={false} myUid={myUid}
                            canEdit={false} canManage={false}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* Players section (solo mode) */}
        {!isTeamMode && (
          <div className="blindtest-players-section">
            <div className="blindtest-players-header">
              <div className="blindtest-players-header-left">
                <span className="blindtest-players-label">Joueurs</span>
                <div className="blindtest-players-count">{players.length}</div>
              </div>
            </div>

            {/* Host hint */}
            <AnimatePresence initial={false}>
              {isHost && !canStart && (
                <motion.div key="hint"
                  initial={{ opacity: 0, maxHeight: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, maxHeight: '80px', marginBottom: '12px' }}
                  exit={{ opacity: 0, maxHeight: 0, marginBottom: 0 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  style={{ overflow: 'hidden', flexShrink: 0 }}
                >
                  <div className="blindtest-hint-callout">
                    <div className="blindtest-hint-icon">
                      <Info size={13} color={ACCENT} weight="bold" />
                    </div>
                    <span className="blindtest-hint-text">
                      {!selectedPlaylist ? 'Sélectionne une playlist pour pouvoir lancer la partie' : 'En attente de joueurs...'}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Player hint */}
            {!isHost && (
              <motion.div className="blindtest-player-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <span className="blindtest-player-hint-emoji">&#x23F3;</span>
                <span className="blindtest-player-hint-text">En attente que l'hôte démarre la partie…</span>
              </motion.div>
            )}

            {/* Players list */}
            <div className="blindtest-players-list-wrapper">
              <div ref={listRef} onScroll={checkScroll} className="blindtest-players-list">
                {[...players].sort((a, b) => a.uid === myUid ? -1 : b.uid === myUid ? 1 : 0).map((player, index) => (
                  <motion.div key={player.uid}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.2 }}
                    style={{ overflow: 'visible' }}
                  >
                    <PlayerBanner player={player} isMe={player.uid === myUid} accentColor={ACCENT} accentDark={ACCENT_DARK} />
                  </motion.div>
                ))}
              </div>

              <AnimatePresence>
                {canScrollDown && (
                  <motion.div className="blindtest-scroll-fade"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <motion.div
                      animate={{ y: [0, 3, 0] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                      style={{ color: `${ACCENT}66` }}
                    >
                      <CaretDown size={14} weight="bold" />
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <div className="blindtest-lobby-footer">
        {isHost && (
          <LobbyStartButton
            gameColor={ACCENT} icon={startIcon} label={startLabel}
            loadingLabel="Préparation..." disabled={!canStart}
            loading={isStarting} onClick={handleStartGame}
          />
        )}
        {!isHost && (
          <button className="blindtest-footer-player-card" onClick={() => shareModalRef.current?.open()}>
            <div className="blindtest-footer-player-text">Partage le code pour inviter des amis</div>
          </button>
        )}
      </div>
    </div>
  );
}

export default function DeezTestLobby() {
  const { code } = useParams();
  return <BlindTestLobbyContent code={code} />;
}
