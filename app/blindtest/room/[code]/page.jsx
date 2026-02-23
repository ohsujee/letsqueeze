"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  auth,
  db,
  ref,
  onValue,
  update,
  set,
  signInAnonymously,
  onAuthStateChanged,
} from "@/lib/firebase";
import { motion, AnimatePresence } from 'framer-motion';
import { GameLaunchCountdown } from "@/components/transitions";
import LobbyHeader from "@/components/game/LobbyHeader";
import PaywallModal from "@/components/ui/PaywallModal";
import HowToPlayModal from "@/components/ui/HowToPlayModal";
import { useUserProfile } from "@/lib/hooks/useUserProfile";
import { usePlayerCleanup } from "@/lib/hooks/usePlayerCleanup";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { usePresence } from "@/lib/hooks/usePresence";
import { useHostDisconnect } from "@/lib/hooks/useHostDisconnect";
import LobbyDisconnectAlert from "@/components/game/LobbyDisconnectAlert";
import { isPro } from "@/lib/subscription";
import { useToast } from "@/lib/hooks/useToast";
import { usePlaylistHistory } from "@/lib/hooks/usePlaylistHistory";
import { ChevronRight, Music, Search, Check, X, Volume2 } from "lucide-react";
import LobbyStartButton from "@/components/game/LobbyStartButton";
import LobbyWaitingIndicator from "@/components/game/LobbyWaitingIndicator";
import { storage } from "@/lib/utils/storage";
import { useWakeLock } from "@/lib/hooks/useWakeLock";
import { useTeamMode } from "@/lib/hooks/useTeamMode";
import {
  searchPlaylists,
  getFeaturedPlaylists,
  getRandomTracksFromPlaylist,
  formatTracksForGame
} from "@/lib/deezer/api";
import TeamModeSelector from "@/components/game/TeamModeSelector";
import TeamPlayerView from "@/components/game/TeamPlayerView";
import TeamTabs from "@/lib/components/TeamTabs";
import GuestAccountPromptModal from "@/components/ui/GuestAccountPromptModal";
import { calculatePartyModeQuestions } from "@/lib/config/rooms";

export default function DeezTestLobby() {
  const { code } = useParams();
  const router = useRouter();
  const toast = useToast();

  const [meta, setMeta] = useState(null);
  const [teams, setTeams] = useState({});
  const [isHost, setIsHost] = useState(false);
  const [joinUrl, setJoinUrl] = useState("");
  const [showPaywall, setShowPaywall] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showPlaylistSelector, setShowPlaylistSelector] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const countdownTriggeredRef = useRef(false);
  const roomWasValidRef = useRef(false);
  const [myUid, setMyUid] = useState(null);
  const [isPlayerMissing, setIsPlayerMissing] = useState(false);
  const [rejoinError, setRejoinError] = useState(null);
  const shareModalRef = useRef(null);

  // Deezer state (no auth needed!)
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [featuredPlaylists, setFeaturedPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Get user profile for subscription check
  const { user: currentUser, profile, subscription, loading: profileLoading } = useUserProfile();
  const userIsPro = currentUser && subscription ? isPro({ ...currentUser, subscription }) : false;

  // Centralized players hook
  const { players } = usePlayers({ roomCode: code, roomPrefix: 'rooms_blindtest' });

  // Playlist history for avoiding repeated tracks
  const { getPlayedTracks, markTracksAsPlayed } = usePlaylistHistory();

  // Centralized team mode hook
  const {
    mode,
    isTeamMode,
    teams: teamModeTeams,
    teamCount,
    handleModeToggle,
    handleTeamCountChange,
    handleAssignToTeam,
    handleRemoveFromTeam,
    handleAutoBalance,
    handleResetTeams
  } = useTeamMode({
    roomCode: code,
    roomPrefix: 'rooms_blindtest',
    meta,
    players,
    isHost
  });


  // Keep screen awake during game
  useWakeLock({ enabled: true });

  // Set join URL
  useEffect(() => {
    if (typeof window !== "undefined" && code) {
      setJoinUrl(`${window.location.origin}/join?code=${code}`);
    }
  }, [code]);

  // Load featured playlists on mount
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

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setMyUid(user.uid);
        setIsHost(meta?.hostUid === user.uid);
      } else {
        signInAnonymously(auth).catch(() => {});
      }
    });
    return () => unsub();
  }, [meta?.hostUid]);

  const userPseudo = profile?.pseudo || currentUser?.displayName?.split(' ')[0] || 'Joueur';

  // Presence hook - real-time connection tracking
  const { isConnected, forceReconnect } = usePresence({
    roomCode: code,
    roomPrefix: 'rooms_blindtest',
    playerUid: myUid,
    heartbeatInterval: 15000,
    enabled: !!myUid
  });

  // Player cleanup with auto-rejoin for hard refresh
  const { leaveRoom, attemptRejoin, isRejoining } = usePlayerCleanup({
    roomCode: code,
    roomPrefix: 'rooms_blindtest',
    playerUid: myUid,
    phase: 'lobby',
    playerName: userPseudo,
    isHost,
    getPlayerData: (uid, name) => ({
      uid,
      name,
      score: 0,
      teamId: "",
      blockedUntil: 0,
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

  // Room guard
  const { markVoluntaryLeave } = useRoomGuard({
    roomCode: code,
    roomPrefix: 'rooms_blindtest',
    playerUid: myUid,
    isHost,
    skipKickRedirect: true // LobbyDisconnectAlert gère le cas kick en lobby
  });

  // Host disconnect - gère la grace period si l'hôte perd sa connexion
  // UNIVERSAL: Utiliser hostUid - le hook détermine si on est l'hôte
  useHostDisconnect({
    roomCode: code,
    roomPrefix: 'rooms_blindtest',
    hostUid: meta?.hostUid
  });

  // Firebase listeners
  useEffect(() => {
    if (!code) return;

    const metaUnsub = onValue(ref(db, `rooms_blindtest/${code}/meta`), (snap) => {
      const m = snap.val();
      if (m) {
        if (m.closed) {
          return;
        }
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

    return () => {
      metaUnsub();
      stateUnsub();
    };
  }, [code, router, isHost]);

  // Search playlists with debounce
  const handleSearch = async (query) => {
    setSearchQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

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

  // Handle playlist selection
  const handleSelectPlaylist = async (playlist) => {
    if (!isHost) return;

    try {
      setIsSearching(true);

      // Get already-played track IDs to avoid repetition
      const playedIds = getPlayedTracks(playlist.id);
      const tracks = await getRandomTracksFromPlaylist(playlist.id, 20, playedIds);

      if (tracks.length < 5) {
        toast.error("Playlist trop petite (minimum 5 titres)");
        setIsSearching(false);
        return;
      }

      const formattedTracks = formatTracksForGame(tracks);

      const newPlaylist = {
        id: playlist.id,
        name: playlist.name,
        image: playlist.image,
        totalTracks: formattedTracks.length,
        tracks: formattedTracks.map(t => ({
          id: t.id,
          title: t.title,
          artist: t.artist,
          previewUrl: t.previewUrl,
          albumArt: t.albumArt,
        })),
      };

      await update(ref(db, `rooms_blindtest/${code}/meta`), {
        playlist: newPlaylist,
      });

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

  // Start game - refresh track URLs before starting (they expire after ~24h)
  const [isStarting, setIsStarting] = useState(false);

  const handleStartGame = async () => {
    if (!isHost || !selectedPlaylist || isStarting) return;

    setIsStarting(true);
    try {
      const isPartyMode = meta?.gameMasterMode === 'party';

      // Party Mode: Add host as player if not already
      if (isPartyMode && myUid) {
        const hostAsPlayer = players.find(p => p.uid === myUid);
        if (!hostAsPlayer) {
          await set(ref(db, `rooms_blindtest/${code}/players/${myUid}`), {
            uid: myUid,
            name: meta?.hostName || userPseudo,
            score: 0,
            teamId: "",
            blockedUntil: 0,
            joinedAt: Date.now(),
            status: 'active'
          });
        }
      }

      // Calculer le nombre de tracks
      // Party Mode: ajuster pour l'équité (chaque joueur pose le même nombre)
      let trackCount = selectedPlaylist.totalTracks || 20;
      let activePlayers = [];

      if (isPartyMode) {
        // Get active players (including host who was just added)
        activePlayers = [...players.filter(p => p.status !== 'disconnected' && p.status !== 'left')];

        // Add host if not in players list yet (just added above)
        if (myUid && !activePlayers.find(p => p.uid === myUid)) {
          activePlayers.push({
            uid: myUid,
            name: meta?.hostName || userPseudo,
            teamId: ""
          });
        }

        // Calculer le nombre optimal de tracks pour l'équité
        trackCount = calculatePartyModeQuestions(activePlayers.length);
      }

      // Refresh tracks to get fresh preview URLs (they expire!)
      // Also exclude already-played tracks for variety
      console.log("[DeezTest] Refreshing tracks before game start...");
      const playedIds = getPlayedTracks(selectedPlaylist.id);
      const freshTracks = await getRandomTracksFromPlaylist(
        selectedPlaylist.id,
        trackCount,
        playedIds
      );

      const formattedTracks = formatTracksForGame(freshTracks);

      // Update playlist with fresh URLs
      const refreshedPlaylist = {
        ...selectedPlaylist,
        tracks: formattedTracks.map(t => ({
          id: t.id,
          title: t.title,
          artist: t.artist,
          previewUrl: t.previewUrl,
          albumArt: t.albumArt,
        })),
      };

      console.log("[DeezTest] Tracks refreshed, starting game...");

      // Party Mode: Calculate asker rotation
      let askerRotationFields = {};
      if (isPartyMode) {

        if (meta?.mode === 'équipes') {
          // Team mode: rotation by team
          const teamIds = Object.keys(meta?.teams || {}).filter(teamId => {
            const teamPlayers = activePlayers.filter(p => p.teamId === teamId);
            return teamPlayers.length > 0;
          });

          // Shuffle teams
          for (let i = teamIds.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [teamIds[i], teamIds[j]] = [teamIds[j], teamIds[i]];
          }

          // Pick first asker from first team
          const firstTeamPlayers = activePlayers.filter(p => p.teamId === teamIds[0]);
          const firstAsker = firstTeamPlayers[Math.floor(Math.random() * firstTeamPlayers.length)];

          askerRotationFields = {
            askerRotation: teamIds,
            askerIndex: 0,
            currentAskerUid: firstAsker?.uid || null,
            currentAskerTeamId: teamIds[0] || null
          };
        } else {
          // Individual mode: rotation by player
          const shuffledPlayers = [...activePlayers];
          for (let i = shuffledPlayers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledPlayers[i], shuffledPlayers[j]] = [shuffledPlayers[j], shuffledPlayers[i]];
          }
          const rotation = shuffledPlayers.map(p => p.uid);

          askerRotationFields = {
            askerRotation: rotation,
            askerIndex: 0,
            currentAskerUid: rotation[0] || null,
            currentAskerTeamId: null
          };
        }
      }

      // Update playlist and start game atomically
      await update(ref(db, `rooms_blindtest/${code}`), {
        'meta/playlist': refreshedPlaylist,
        state: {
          phase: "playing",
          currentIndex: 0,
          revealed: false,
          snippetLevel: 0,
          highestSnippetLevel: -1,
          lockUid: null,
          buzzBanner: "",
          elapsedAcc: 0,
          lastRevealAt: 0,
          pausedAt: null,
          lockedAt: null,
          ...askerRotationFields
        }
      });
    } catch (error) {
      console.error('Erreur lors du lancement:', error);
      toast.error(error.message || 'Erreur lors du lancement de la partie');
      setIsStarting(false);
    }
  };

  // Host exit handler
  const handleHostExit = async () => {
    if (isHost) {
      await update(ref(db, `rooms_blindtest/${code}/meta`), { closed: true });
    }
    router.push('/home');
  };

  // Player exit handler (non-host)
  const handlePlayerExit = async () => {
    markVoluntaryLeave();
    await leaveRoom();
    router.push('/home');
  };

  const canStart = isHost && selectedPlaylist && players.length > 0;

  // Loading state
  if (!meta) {
    return (
      <div className="lobby-container deeztest game-page">
        <div className="lobby-loading">
          <div className="loading-spinner deeztest" />
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby-container deeztest game-page">
      {/* Game Launch Countdown */}
      <AnimatePresence>
        {showCountdown && (
          <GameLaunchCountdown
            gameColor="#A238FF"
            onComplete={() => {
              // Party Mode: everyone goes to play (no separate host view)
              if (meta?.gameMasterMode === 'party') {
                router.push(`/blindtest/game/${code}/play`);
              } else if (isHost) {
                router.push(`/blindtest/game/${code}/host`);
              } else {
                router.push(`/blindtest/game/${code}/play`);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Modals */}
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        contentType="playlist"
        contentName="Playlists illimitées"
      />
      <HowToPlayModal
        isOpen={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
        gameType="deeztest"
      />
      <GuestAccountPromptModal currentUser={currentUser} isHost={isHost} />

      {/* Lobby Disconnect Alert */}
      <LobbyDisconnectAlert
        isVisible={isPlayerMissing && !isHost}
        isRejoining={isRejoining}
        onRejoin={attemptRejoin}
        onGoHome={() => router.push('/home')}
        error={rejoinError}
        gameColor="#A238FF"
      />

      {/* Playlist Selector Modal */}
      <AnimatePresence>
        {showPlaylistSelector && (
          <motion.div
            className="playlist-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPlaylistSelector(false)}
          >
            <motion.div
              className="playlist-modal deeztest"
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="playlist-modal-header">
                <h2>Choisir une playlist</h2>
                <button className="modal-close-btn" onClick={() => setShowPlaylistSelector(false)}>
                  <X size={20} />
                </button>
              </div>

              {/* Search Input */}
              <div className="playlist-search-wrapper deeztest">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  placeholder="Rechercher une playlist..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="playlist-search-input"
                  autoFocus
                />
                {isSearching && <div className="search-spinner deeztest" />}
              </div>

              {/* Playlists List */}
              <div className="playlist-modal-content">
                {searchResults.length > 0 ? (
                  <>
                    <span className="playlist-section-label deeztest">Résultats</span>
                    <div className="playlist-grid">
                      {searchResults.map(playlist => (
                        <motion.div
                          key={playlist.id}
                          className="playlist-option deeztest"
                          onClick={() => handleSelectPlaylist(playlist)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {playlist.image ? (
                            <img src={playlist.image} alt={playlist.name} className="playlist-option-img" />
                          ) : (
                            <div className="playlist-option-placeholder deeztest">
                              <Music size={24} />
                            </div>
                          )}
                          <div className="playlist-option-info">
                            <span className="playlist-option-name">{playlist.name}</span>
                            <span className="playlist-option-meta">{playlist.totalTracks} titres • {playlist.creator}</span>
                          </div>
                          <ChevronRight size={18} className="playlist-option-arrow" />
                        </motion.div>
                      ))}
                    </div>
                  </>
                ) : !searchQuery && featuredPlaylists.length > 0 ? (
                  <>
                    <span className="playlist-section-label deeztest">Populaires</span>
                    <div className="playlist-grid">
                      {featuredPlaylists.map(playlist => (
                        <motion.div
                          key={playlist.id}
                          className="playlist-option deeztest"
                          onClick={() => handleSelectPlaylist(playlist)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {playlist.image ? (
                            <img src={playlist.image} alt={playlist.name} className="playlist-option-img" />
                          ) : (
                            <div className="playlist-option-placeholder deeztest">
                              <Music size={24} />
                            </div>
                          )}
                          <div className="playlist-option-info">
                            <span className="playlist-option-name">{playlist.name}</span>
                            <span className="playlist-option-meta">{playlist.totalTracks} titres</span>
                          </div>
                          <ChevronRight size={18} className="playlist-option-arrow" />
                        </motion.div>
                      ))}
                    </div>
                  </>
                ) : !searchQuery && isLoadingFeatured ? (
                  <div className="playlist-empty">
                    <div className="search-spinner deeztest" />
                    <p>Chargement...</p>
                  </div>
                ) : searchQuery && !isSearching ? (
                  <div className="playlist-empty">
                    <Music size={32} />
                    <p>Aucun résultat</p>
                  </div>
                ) : !searchQuery ? (
                  <div className="playlist-empty">
                    <Search size={32} />
                    <p>Recherche une playlist</p>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <LobbyHeader
        ref={shareModalRef}
        variant="deeztest"
        code={code}
        isHost={isHost}
        players={players}
        hostUid={meta?.hostUid}
        onHostExit={handleHostExit}
        onPlayerExit={handlePlayerExit}
        onShowHowToPlay={() => setShowHowToPlay(true)}
        joinUrl={joinUrl}
        gameMode={meta?.gameMasterMode}
      />

      {/* Main Content */}
      <main className="lobby-main">
        {isHost ? (
          // HOST VIEW
          <>
            <div className="lobby-content">
              {/* Playlist Selector Card */}
              <motion.div
                className="lobby-card quiz-selector deeztest"
                onClick={() => setShowPlaylistSelector(true)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="quiz-card-content">
                  <div className="quiz-card-left">
                    {/* Deezer Equalizer Logo - 4 bars: 1, 3, 2, 4 blocks (wide rectangles) */}
                    <svg className="deezer-logo-icon" viewBox="0 0 44 28" width="44" height="28" fill="none">
                      {/* Bar 1 - 1 block */}
                      <rect x="0" y="23" width="9" height="5" rx="1" fill="#FF0092"/>
                      {/* Bar 2 - 3 blocks */}
                      <rect x="11" y="23" width="9" height="5" rx="1" fill="#FF0092"/>
                      <rect x="11" y="16" width="9" height="5" rx="1" fill="#A238FF"/>
                      <rect x="11" y="9" width="9" height="5" rx="1" fill="#C574FF"/>
                      {/* Bar 3 - 2 blocks */}
                      <rect x="22" y="23" width="9" height="5" rx="1" fill="#FF0092"/>
                      <rect x="22" y="16" width="9" height="5" rx="1" fill="#A238FF"/>
                      {/* Bar 4 - 4 blocks */}
                      <rect x="33" y="23" width="9" height="5" rx="1" fill="#FF0092"/>
                      <rect x="33" y="16" width="9" height="5" rx="1" fill="#A238FF"/>
                      <rect x="33" y="9" width="9" height="5" rx="1" fill="#C574FF"/>
                      <rect x="33" y="2" width="9" height="5" rx="1" fill="#C574FF"/>
                    </svg>
                  </div>
                  <div className="quiz-card-center">
                    <span className="quiz-card-label">Playlist Deezer</span>
                    {selectedPlaylist ? (
                      <>
                        <h3 className="quiz-card-title">{selectedPlaylist.name}</h3>
                        <p className="quiz-card-meta">{selectedPlaylist.totalTracks} titres</p>
                      </>
                    ) : (
                      <>
                        <h3 className="quiz-card-title">Choisis une playlist</h3>
                        <p className="quiz-card-meta"></p>
                      </>
                    )}
                  </div>
                  <div className="quiz-card-right">
                    <span className="quiz-change-hint">{selectedPlaylist ? 'Changer' : 'Choisir'}</span>
                    <ChevronRight size={20} className="quiz-card-arrow" />
                  </div>
                </div>

                {/* Deezer badge */}
                <div className="deezer-status-bar">
                  <div className="deezer-badge">
                    <Check size={14} />
                    <span>Powered by Deezer</span>
                  </div>

                  {/* Audio Mode badge - Show if 'all' mode */}
                  {meta?.audioMode === 'all' && (
                    <div className="audio-mode-badge">
                      <Volume2 size={14} />
                      <span>Audio Synchronisé</span>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Mode Selector - Compact Toggle */}
              <TeamModeSelector
                mode={mode}
                onModeToggle={handleModeToggle}
                disabled={false}
                gameColor="#A238FF"
              />

              {/* Team Tabs - Only in team mode */}
              {isTeamMode && teamModeTeams && Object.keys(teamModeTeams).length > 0 && (
                <div className="lobby-card teams-card deeztest">
                  <TeamTabs
                    teams={teamModeTeams}
                    players={players}
                    onAssignToTeam={handleAssignToTeam}
                    onRemoveFromTeam={handleRemoveFromTeam}
                    onAutoBalance={handleAutoBalance}
                    onResetTeams={handleResetTeams}
                    teamCount={teamCount}
                    onTeamCountChange={handleTeamCountChange}
                    gameColor="#A238FF"
                  />
                </div>
              )}

              {/* Players Card - Show only in solo mode */}
              {!isTeamMode && (
                <div className="lobby-card lobby-players lobby-card-flex deeztest">
                  <div className="card-header">
                    <span className="card-icon">🎮</span>
                    <span className="card-label">Joueurs</span>
                    <span className="player-count-badge deeztest">{players.length}</span>
                  </div>
                  {players.length === 0 ? (
                    <div className="empty-state">
                      <span className="empty-icon">👋</span>
                      <p className="empty-text">En attente de joueurs...</p>
                      <button
                        className="btn btn-primary btn-sm empty-share-btn"
                        onClick={(e) => {
                          e.currentTarget.blur(); // Remove focus to prevent stuck gray state
                          shareModalRef.current?.open();
                        }}
                      >
                        Partager le code
                      </button>
                    </div>
                  ) : (
                    <div className="players-chips">
                      {players.map((player, index) => (
                        <motion.div
                          key={player.uid}
                          className="player-chip deeztest"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <div className="chip-avatar deeztest">
                            {player.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <span className="chip-name">{player.name}</span>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Fixed Start Button */}
            <div className="lobby-footer">
              <LobbyStartButton
                gameColor="#A238FF"
                icon="🎵"
                label="Démarrer le Blind Test"
                loadingLabel="Préparation..."
                disabled={!canStart}
                loading={isStarting}
                onClick={handleStartGame}
              />
            </div>
          </>
        ) : (
          // PLAYER VIEW
          <div className="lobby-player-view deeztest">
            {/* Selected Playlist Info */}
            {selectedPlaylist && (
              <div className="player-info-card deeztest">
                {selectedPlaylist.image ? (
                  <img src={selectedPlaylist.image} alt={selectedPlaylist.name} className="player-info-image" />
                ) : (
                  <div className="player-info-placeholder deeztest">
                    <Music size={28} />
                  </div>
                )}
                <div className="player-info-text">
                  <span className="player-info-label">Playlist</span>
                  <h3 className="player-info-title">{selectedPlaylist.name}</h3>
                  <p className="player-info-meta">{selectedPlaylist.totalTracks} titres</p>
                </div>
              </div>
            )}

            {/* Team Mode Player View */}
            {isTeamMode ? (
              <TeamPlayerView
                teams={teamModeTeams}
                players={players}
                teamCount={teamCount}
                currentPlayerUid={myUid}
              />
            ) : (
              <>
                {/* Players Header */}
                <div className="players-header-card deeztest">
                  <span className="players-icon">🎮</span>
                  <span className="players-count">{players.length}</span>
                  <span className="players-label">joueurs connectés</span>
                </div>

                {/* Players List */}
                <div className="players-list-player deeztest">
                  {players.map((player, index) => (
                    <motion.div
                      key={player.uid}
                      className={`player-chip-full deeztest ${player.uid === auth.currentUser?.uid ? 'is-me' : ''}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <div className="chip-avatar-glow deeztest">
                        {player.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <span className="chip-name-full">
                        {player.name}
                        {player.uid === auth.currentUser?.uid && ' (toi)'}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </>
            )}

            {/* Waiting Animation */}
            <LobbyWaitingIndicator gameColor="#A238FF" />
          </div>
        )}
      </main>
    </div>
  );
}
