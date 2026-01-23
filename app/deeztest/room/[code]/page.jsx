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
import { ChevronRight, Music, Search, Check, X } from "lucide-react";
import { storage } from "@/lib/utils/storage";
import { useInterstitialAd } from "@/lib/hooks/useInterstitialAd";
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

// Nombre max de playlists pour non-Pro
const MAX_PLAYLISTS_FREE = 3;

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

  // Deezer state (no auth needed!)
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [featuredPlaylists, setFeaturedPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(false);
  const [playlistsUsed, setPlaylistsUsed] = useState(0);
  const searchTimeoutRef = useRef(null);

  // Get user profile for subscription check
  const { user: currentUser, profile, subscription, loading: profileLoading } = useUserProfile();
  const userIsPro = currentUser && subscription ? isPro({ ...currentUser, subscription }) : false;

  // Centralized players hook
  const { players } = usePlayers({ roomCode: code, roomPrefix: 'rooms_deeztest' });

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
    roomPrefix: 'rooms_deeztest',
    meta,
    players,
    isHost
  });

  // Check if can use more playlists
  const canUseMorePlaylists = userIsPro || playlistsUsed < MAX_PLAYLISTS_FREE;

  // Interstitial ad (unified hook)
  useInterstitialAd({ context: 'DeezTest' });

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
    roomPrefix: 'rooms_deeztest',
    playerUid: myUid,
    heartbeatInterval: 15000,
    enabled: !isHost && !!myUid
  });

  // Player cleanup with auto-rejoin for hard refresh
  const { leaveRoom, attemptRejoin, isRejoining } = usePlayerCleanup({
    roomCode: code,
    roomPrefix: 'rooms_deeztest',
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
    roomPrefix: 'rooms_deeztest',
    playerUid: myUid,
    isHost,
    skipKickRedirect: true // LobbyDisconnectAlert gère le cas kick en lobby
  });

  // Host disconnect - ferme la room si l'hôte perd sa connexion
  useHostDisconnect({
    roomCode: code,
    roomPrefix: 'rooms_deeztest',
    isHost
  });

  // Firebase listeners
  useEffect(() => {
    if (!code) return;

    const metaUnsub = onValue(ref(db, `rooms_deeztest/${code}/meta`), (snap) => {
      const m = snap.val();
      if (m) {
        if (m.closed) {
          return;
        }
        setMeta(m);
        setTeams(m?.teams || {});
        setSelectedPlaylist(m?.playlist || null);
        setPlaylistsUsed(m?.playlistsUsed || 0);
        roomWasValidRef.current = true;
      } else if (roomWasValidRef.current) {
        toast.warning("L'hôte a quitté la partie");
        router.push('/home');
      }
    });

    const stateUnsub = onValue(ref(db, `rooms_deeztest/${code}/state`), (snap) => {
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

    if (!userIsPro && playlistsUsed >= MAX_PLAYLISTS_FREE && !selectedPlaylist) {
      setShowPaywall(true);
      return;
    }

    try {
      setIsSearching(true);
      const tracks = await getRandomTracksFromPlaylist(playlist.id, 20);

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

      const newPlaylistsUsed = selectedPlaylist?.id !== playlist.id
        ? playlistsUsed + 1
        : playlistsUsed;

      await update(ref(db, `rooms_deeztest/${code}/meta`), {
        playlist: newPlaylist,
        playlistsUsed: newPlaylistsUsed,
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
      // Refresh tracks to get fresh preview URLs (they expire!)
      console.log("[DeezTest] Refreshing tracks before game start...");
      const freshTracks = await getRandomTracksFromPlaylist(
        selectedPlaylist.id,
        selectedPlaylist.totalTracks || 20
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

      // Update playlist and start game atomically
      await update(ref(db, `rooms_deeztest/${code}`), {
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
      await update(ref(db, `rooms_deeztest/${code}/meta`), { closed: true });
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
              if (isHost) {
                router.push(`/deeztest/game/${code}/host`);
              } else {
                router.push(`/deeztest/game/${code}/play`);
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
        gameType="blindtest"
      />

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

              {/* Limit indicator for non-Pro */}
              {!userIsPro && (
                <div className="playlist-limit-notice">
                  <span>{MAX_PLAYLISTS_FREE - playlistsUsed} playlist(s) restante(s)</span>
                </div>
              )}

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
        variant="deeztest"
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
                        <h3 className="quiz-card-title">Choisir une playlist</h3>
                        <p className="quiz-card-meta">Appuyer pour choisir</p>
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
                </div>
              </motion.div>

              {/* Mode Selector - Centralized Component */}
              <TeamModeSelector
                mode={mode}
                teamCount={teamCount}
                onModeToggle={handleModeToggle}
                onTeamCountChange={handleTeamCountChange}
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
                      <p className="empty-hint">Partagez le code pour inviter</p>
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
              <motion.button
                className={`lobby-start-btn deeztest ${isStarting ? 'loading' : ''}`}
                onClick={handleStartGame}
                disabled={!canStart || isStarting}
                whileHover={canStart && !isStarting ? { scale: 1.02 } : {}}
                whileTap={canStart && !isStarting ? { scale: 0.98 } : {}}
              >
                {isStarting ? (
                  <>
                    <div className="btn-spinner" />
                    <span className="btn-text">Préparation...</span>
                  </>
                ) : (
                  <>
                    <svg className="btn-deezer-icon" viewBox="0 0 44 28" width="32" height="20" fill="none">
                      <rect x="0" y="23" width="9" height="5" rx="1" fill="currentColor"/>
                      <rect x="11" y="23" width="9" height="5" rx="1" fill="currentColor"/>
                      <rect x="11" y="16" width="9" height="5" rx="1" fill="currentColor"/>
                      <rect x="11" y="9" width="9" height="5" rx="1" fill="currentColor"/>
                      <rect x="22" y="23" width="9" height="5" rx="1" fill="currentColor"/>
                      <rect x="22" y="16" width="9" height="5" rx="1" fill="currentColor"/>
                      <rect x="33" y="23" width="9" height="5" rx="1" fill="currentColor"/>
                      <rect x="33" y="16" width="9" height="5" rx="1" fill="currentColor"/>
                      <rect x="33" y="9" width="9" height="5" rx="1" fill="currentColor"/>
                      <rect x="33" y="2" width="9" height="5" rx="1" fill="currentColor"/>
                    </svg>
                    <span className="btn-text">Démarrer le Blind Test</span>
                  </>
                )}
              </motion.button>
              {!canStart && !isStarting && (
                <p className="start-hint deeztest">
                  {!selectedPlaylist ? "Sélectionne une playlist" :
                   players.length === 0 ? "En attente de joueurs" : ""}
                </p>
              )}
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
            <div className="waiting-compact deeztest">
              <div className="waiting-pulse deeztest" />
              <span className="waiting-label">En attente du lancement...</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
