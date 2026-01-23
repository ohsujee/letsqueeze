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
import { ChevronRight, Music, Search, LogIn, Check, X } from "lucide-react";
import { storage } from "@/lib/utils/storage";
import { useInterstitialAd } from "@/lib/hooks/useInterstitialAd";
import { useTeamMode } from "@/lib/hooks/useTeamMode";
import { isSpotifyConnected, startSpotifyAuth, clearTokens } from "@/lib/spotify/auth";
import { getCurrentUser, isPremiumUser, searchPlaylists, getUserPlaylists, getRandomTracksFromPlaylist } from "@/lib/spotify/api";
import { GameLaunchCountdown } from "@/components/transitions";
import TeamModeSelector from "@/components/game/TeamModeSelector";
import TeamPlayerView from "@/components/game/TeamPlayerView";
import TeamTabs from "@/lib/components/TeamTabs";

// Nombre max de playlists pour non-Pro
const MAX_PLAYLISTS_FREE = 3;

export default function BlindTestLobby() {
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
  const roomWasValidRef = useRef(false);
  const [myUid, setMyUid] = useState(null);
  const [showCountdown, setShowCountdown] = useState(false);
  const countdownTriggeredRef = useRef(false);
  const [isPlayerMissing, setIsPlayerMissing] = useState(false);
  const [rejoinError, setRejoinError] = useState(null);

  // Spotify state
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyUser, setSpotifyUser] = useState(null);
  const [spotifyPremium, setSpotifyPremium] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [playlistsUsed, setPlaylistsUsed] = useState(0);
  const searchTimeoutRef = useRef(null);

  // Get user profile for subscription check
  const { user: currentUser, profile, subscription, loading: profileLoading } = useUserProfile();
  const userIsPro = currentUser && subscription ? isPro({ ...currentUser, subscription }) : false;

  // Centralized players hook
  const { players } = usePlayers({ roomCode: code, roomPrefix: 'rooms_blindtest' });

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

  // Check if can use more playlists
  const canUseMorePlaylists = userIsPro || playlistsUsed < MAX_PLAYLISTS_FREE;

  // Interstitial ad (unified hook)
  useInterstitialAd({ context: 'BlindTest' });

  // Set join URL
  useEffect(() => {
    if (typeof window !== "undefined" && code) {
      setJoinUrl(`${window.location.origin}/join?code=${code}`);
    }
  }, [code]);

  // Check Spotify connection on mount
  useEffect(() => {
    const checkSpotify = async () => {
      if (await isSpotifyConnected()) {
        setSpotifyConnected(true);
        try {
          const user = await getCurrentUser();
          setSpotifyUser(user);
          const premium = await isPremiumUser();
          setSpotifyPremium(premium);

          if (!premium) {
            toast.warning("Spotify Premium requis pour jouer de la musique");
          }

          // Load user's playlists
          const playlists = await getUserPlaylists(20);
          setUserPlaylists(playlists);
        } catch (error) {
          console.error("Spotify user error:", error);
          clearTokens();
          setSpotifyConnected(false);
        }
      }
    };
    checkSpotify();
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
    enabled: !isHost && !!myUid
  });

  // Player cleanup hook with auto-rejoin for hard refresh
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

  // Room guard - détecte kick et fermeture room
  const { markVoluntaryLeave } = useRoomGuard({
    roomCode: code,
    roomPrefix: 'rooms_blindtest',
    playerUid: myUid,
    isHost,
    skipKickRedirect: true // LobbyDisconnectAlert gère le cas kick en lobby
  });

  // Host disconnect - ferme la room si l'hôte perd sa connexion
  useHostDisconnect({
    roomCode: code,
    roomPrefix: 'rooms_blindtest',
    isHost
  });

  // DB listeners
  useEffect(() => {
    if (!code) return;

    const metaUnsub = onValue(ref(db, `rooms_blindtest/${code}/meta`), (snap) => {
      const m = snap.val();
      if (m) {
        if (m.closed) {
          return; // useRoomGuard handles this
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

    const stateUnsub = onValue(ref(db, `rooms_blindtest/${code}/state`), (snap) => {
      const state = snap.val();
      if (state?.phase === "playing" && !countdownTriggeredRef.current) {
        // Afficher le countdown avant de redirect
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
        const results = await searchPlaylists(query, 10);
        setSearchResults(results);
      } catch (error) {
        console.error("Search error:", error);
        toast.error("Erreur de recherche Spotify");
      } finally {
        setIsSearching(false);
      }
    }, 500);
  };

  // Connect to Spotify
  const handleConnectSpotify = async () => {
    sessionStorage.setItem('blindtest_pending_room', code);
    await startSpotifyAuth();
  };

  // Disconnect from Spotify
  const handleDisconnectSpotify = () => {
    clearTokens();
    setSpotifyConnected(false);
    setSpotifyUser(null);
    setSpotifyPremium(false);
    setUserPlaylists([]);
    setSearchResults([]);
    setSelectedPlaylist(null);
    toast.info("Déconnecté de Spotify");
  };

  // Select a playlist
  const handleSelectPlaylist = async (playlist) => {
    if (!isHost) return;

    if (!userIsPro && playlistsUsed >= MAX_PLAYLISTS_FREE && !selectedPlaylist) {
      setShowPaywall(true);
      return;
    }

    try {
      const tracks = await getRandomTracksFromPlaylist(playlist.id, 20);

      if (tracks.length < 5) {
        toast.error("Playlist trop petite (minimum 5 titres)");
        return;
      }

      const newPlaylist = {
        id: playlist.id,
        name: playlist.name,
        image: playlist.image,
        totalTracks: tracks.length,
        tracks: tracks.map(t => ({
          spotifyUri: t.uri,
          title: t.name,
          artist: t.artist,
          album: t.album,
          albumArt: t.albumArt,
          durationMs: t.duration,
          previewUrl: t.previewUrl,
        }))
      };

      const newPlaylistsUsed = selectedPlaylist?.id !== playlist.id
        ? playlistsUsed + 1
        : playlistsUsed;

      await update(ref(db, `rooms_blindtest/${code}/meta`), {
        playlist: newPlaylist,
        playlistsUsed: newPlaylistsUsed
      });

      setSelectedPlaylist(newPlaylist);
      setSearchQuery("");
      setSearchResults([]);
      setShowPlaylistSelector(false);
      // Playlist sélectionnée - pas besoin de toast, l'UI se met à jour
    } catch (error) {
      console.error("Error selecting playlist:", error);
      toast.error("Erreur lors de la sélection");
    }
  };

  // Start game
  const handleStartGame = async () => {
    if (!isHost || !selectedPlaylist) return;

    if (!spotifyPremium) {
      toast.error("Spotify Premium requis pour jouer");
      return;
    }

    try {
      await update(ref(db, `rooms_blindtest/${code}`), {
        state: {
          phase: "playing",
          currentIndex: 0,
          revealed: false,
          snippetLevel: 0,
          lockUid: null,
          buzzBanner: "",
          elapsedAcc: 0,
          lastRevealAt: 0,
          pausedAt: null,
          lockedAt: null,
        }
      });

      // Partie lancée - pas besoin de toast, redirection automatique
    } catch (error) {
      console.error('Erreur lors du lancement:', error);
      toast.error('Erreur lors du lancement de la partie');
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
    markVoluntaryLeave(); // Évite le toast "expulsé par l'hôte"
    await leaveRoom();
    router.push('/home');
  };

  // Handle playlist card click
  const handlePlaylistCardClick = () => {
    if (!spotifyConnected) {
      handleConnectSpotify();
    } else if (!spotifyPremium) {
      toast.warning("Spotify Premium requis");
    } else {
      setShowPlaylistSelector(true);
    }
  };

  const canStart = isHost && selectedPlaylist && spotifyPremium && players.length > 0;

  // Loading state
  if (!meta) {
    return (
      <div className="lobby-container blindtest game-page">
        <div className="lobby-loading">
          <div className="loading-spinner blindtest" />
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby-container blindtest game-page">
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
        gameColor="#10b981"
      />

      {/* Countdown de lancement */}
      <AnimatePresence>
        {showCountdown && (
          <GameLaunchCountdown
            gameColor="#10b981"
            onComplete={() => {
              if (isHost) {
                router.push(`/blindtest/game/${code}/host`);
              } else {
                router.push(`/blindtest/game/${code}/play`);
              }
            }}
          />
        )}
      </AnimatePresence>

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
              className="playlist-modal blindtest"
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
              <div className="playlist-search-wrapper">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  placeholder="Rechercher une playlist..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="playlist-search-input"
                  autoFocus
                />
                {isSearching && <div className="search-spinner" />}
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
                    <span className="playlist-section-label">Résultats</span>
                    <div className="playlist-grid">
                      {searchResults.map(playlist => (
                        <motion.div
                          key={playlist.id}
                          className="playlist-option"
                          onClick={() => handleSelectPlaylist(playlist)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {playlist.image ? (
                            <img src={playlist.image} alt={playlist.name} className="playlist-option-img" />
                          ) : (
                            <div className="playlist-option-placeholder">
                              <Music size={24} />
                            </div>
                          )}
                          <div className="playlist-option-info">
                            <span className="playlist-option-name">{playlist.name}</span>
                            <span className="playlist-option-meta">{playlist.totalTracks} titres • {playlist.owner}</span>
                          </div>
                          <ChevronRight size={18} className="playlist-option-arrow" />
                        </motion.div>
                      ))}
                    </div>
                  </>
                ) : !searchQuery && userPlaylists.length > 0 ? (
                  <>
                    <span className="playlist-section-label">Tes playlists</span>
                    <div className="playlist-grid">
                      {userPlaylists.map(playlist => (
                        <motion.div
                          key={playlist.id}
                          className="playlist-option"
                          onClick={() => handleSelectPlaylist(playlist)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {playlist.image ? (
                            <img src={playlist.image} alt={playlist.name} className="playlist-option-img" />
                          ) : (
                            <div className="playlist-option-placeholder">
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
        variant="blindtest"
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
              {/* Playlist Selector Card - Same style as Quiz Selector */}
              <motion.div
                className={`lobby-card quiz-selector blindtest ${!spotifyConnected ? 'not-connected' : ''}`}
                onClick={handlePlaylistCardClick}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="quiz-card-content">
                  <div className="quiz-card-left">
                    <span className="quiz-card-emoji">🎵</span>
                  </div>
                  <div className="quiz-card-center">
                    <span className="quiz-card-label">Playlist</span>
                    {!spotifyConnected ? (
                      <>
                        <h3 className="quiz-card-title">Connecter Spotify</h3>
                        <p className="quiz-card-meta">Premium requis pour jouer</p>
                      </>
                    ) : !spotifyPremium ? (
                      <>
                        <h3 className="quiz-card-title">Spotify Free</h3>
                        <p className="quiz-card-meta warning">Premium requis pour jouer</p>
                      </>
                    ) : selectedPlaylist ? (
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
                    {spotifyConnected && spotifyPremium ? (
                      <>
                        <span className="quiz-change-hint">{selectedPlaylist ? 'Changer' : 'Choisir'}</span>
                        <ChevronRight size={20} className="quiz-card-arrow" />
                      </>
                    ) : (
                      <LogIn size={20} className="quiz-card-arrow" />
                    )}
                  </div>
                </div>

                {/* Spotify status bar */}
                {spotifyConnected && (
                  <div className="spotify-status-bar">
                    <div className="spotify-user-info">
                      <Check size={14} />
                      <span>{spotifyUser?.display_name || 'Connecté'}</span>
                      {spotifyPremium && <span className="premium-tag">Premium</span>}
                    </div>
                    <button
                      className="spotify-disconnect"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDisconnectSpotify();
                      }}
                    >
                      Déconnecter
                    </button>
                  </div>
                )}
              </motion.div>

              {/* Mode Selector - Centralized Component */}
              <TeamModeSelector
                mode={mode}
                teamCount={teamCount}
                onModeToggle={handleModeToggle}
                onTeamCountChange={handleTeamCountChange}
                disabled={false}
                gameColor="#10b981"
              />

              {/* Team Tabs - Only in team mode */}
              {isTeamMode && teamModeTeams && Object.keys(teamModeTeams).length > 0 && (
                <div className="lobby-card teams-card blindtest">
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
                <div className="lobby-card lobby-players lobby-card-flex blindtest">
                  <div className="card-header">
                    <span className="card-icon">🎮</span>
                    <span className="card-label">Joueurs</span>
                    <span className="player-count-badge blindtest">{players.length}</span>
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
                          className="player-chip blindtest"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <div className="chip-avatar blindtest">
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
                className="lobby-start-btn blindtest"
                onClick={handleStartGame}
                disabled={!canStart}
                whileHover={canStart ? { scale: 1.02 } : {}}
                whileTap={canStart ? { scale: 0.98 } : {}}
              >
                <span className="btn-icon">🎵</span>
                <span className="btn-text">Démarrer le Blind Test</span>
              </motion.button>
              {!canStart && (
                <p className="start-hint blindtest">
                  {!spotifyConnected ? "Connecte Spotify pour continuer" :
                   !spotifyPremium ? "Spotify Premium requis" :
                   !selectedPlaylist ? "Sélectionne une playlist" :
                   players.length === 0 ? "En attente de joueurs" : ""}
                </p>
              )}
            </div>
          </>
        ) : (
          // PLAYER VIEW
          <div className="lobby-player-view blindtest">
            {/* Selected Playlist Info */}
            {selectedPlaylist && (
              <div className="player-info-card blindtest">
                {selectedPlaylist.image ? (
                  <img src={selectedPlaylist.image} alt={selectedPlaylist.name} className="player-info-image" />
                ) : (
                  <div className="player-info-placeholder blindtest">
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
                <div className="players-header-card blindtest">
                  <span className="players-icon">🎮</span>
                  <span className="players-count">{players.length}</span>
                  <span className="players-label">joueurs connectés</span>
                </div>

                {/* Players List */}
                <div className="players-list-player blindtest">
                  {players.map((player, index) => (
                    <motion.div
                      key={player.uid}
                      className={`player-chip-full blindtest ${player.uid === auth.currentUser?.uid ? 'is-me' : ''}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <div className="chip-avatar-glow blindtest">
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
            <div className="waiting-compact blindtest">
              <div className="waiting-pulse blindtest" />
              <span className="waiting-label">En attente du lancement...</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
