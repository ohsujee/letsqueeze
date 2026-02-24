'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getDatabase, ref, onValue, update, get, set } from 'firebase/database';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getApp } from 'firebase/app';
import { ChevronRight } from 'lucide-react';
import LobbyStartButton from '@/components/game/LobbyStartButton';
import LobbyWaitingIndicator from '@/components/game/LobbyWaitingIndicator';
import { motion, AnimatePresence } from 'framer-motion';
import LobbyHeader from '@/components/game/LobbyHeader';
import MimeThemeSelectorModal from '@/components/game-mime/MimeThemeSelectorModal';
import { GameLaunchCountdown } from '@/components/transitions';
import { usePlayers } from '@/lib/hooks/usePlayers';
import { usePlayerCleanup } from '@/lib/hooks/usePlayerCleanup';
import { useRoomGuard } from '@/lib/hooks/useRoomGuard';
import { usePresence } from '@/lib/hooks/usePresence';
import { useWakeLock } from '@/lib/hooks/useWakeLock';
import { useUserProfile } from '@/lib/hooks/useUserProfile';
import { calculateMimeWords, MIME_CONFIG } from '@/lib/config/rooms';

// Thèmes disponibles (chargés depuis /public/data/mime/*.json)
const MIME_THEMES = [
  { id: 'actions', name: 'Actions', emoji: '🏃', file: 'actions.json' },
  { id: 'animaux', name: 'Animaux', emoji: '🐕', file: 'animaux.json' },
  { id: 'metiers', name: 'Métiers', emoji: '👨‍🍳', file: 'metiers.json' },
  { id: 'sports', name: 'Sports', emoji: '⚽', file: 'sports.json' },
  { id: 'films', name: 'Films & Séries', emoji: '🎬', file: 'films.json' },
  { id: 'objets', name: 'Objets', emoji: '📦', file: 'objets.json' },
  { id: 'celebrites', name: 'Célébrités', emoji: '⭐', file: 'celebrites.json' },
  { id: 'lieux', name: 'Lieux', emoji: '🏠', file: 'lieux.json' },
];

export default function MimeLobbyPage() {
  const params = useParams();
  const router = useRouter();
  const code = params?.code;
  const db = getDatabase(getApp());

  const [meta, setMeta] = useState(null);
  const [state, setState] = useState(null);
  const [myUid, setMyUid] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [themes, setThemes] = useState(MIME_THEMES);
  const [themeSelection, setThemeSelection] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [hostJoined, setHostJoined] = useState(false);
  const countdownTriggeredRef = useRef(false);
  const roomWasValidRef = useRef(false);
  const shareModalRef = useRef(null);

  // User profile pour le pseudo
  const { profile, loading: profileLoading } = useUserProfile();
  const userPseudo = profile?.pseudo || 'Hôte';

  // Wake lock
  useWakeLock({ enabled: true });

  // Charger les thèmes depuis les fichiers JSON locaux
  useEffect(() => {
    const loadThemes = async () => {
      try {
        const loadedThemes = await Promise.all(
          MIME_THEMES.map(async (theme) => {
            try {
              const response = await fetch(`/data/mime/${theme.file}`);
              const data = await response.json();
              return {
                ...theme,
                wordCount: data.items?.length || 0
              };
            } catch (err) {
              console.warn(`Failed to load ${theme.file}:`, err);
              return { ...theme, wordCount: 0 };
            }
          })
        );
        setThemes(loadedThemes);
      } catch (error) {
        console.warn('Error loading themes:', error);
      }
    };
    loadThemes();
  }, []);

  // Auth
  useEffect(() => {
    const auth = getAuth(getApp());
    const unsub = onAuthStateChanged(auth, (user) => {
      setMyUid(user?.uid || null);
    });
    return () => unsub();
  }, []);

  // Firebase listeners
  useEffect(() => {
    if (!code) return;

    const metaRef = ref(db, `rooms_mime/${code}/meta`);
    const stateRef = ref(db, `rooms_mime/${code}/state`);

    const unsubMeta = onValue(metaRef, (snap) => {
      const data = snap.val();
      if (data) {
        if (data.closed) {
          router.push('/home');
          return;
        }
        setMeta(data);
        // Charger la sélection de thèmes
        if (data.themeSelection) {
          setThemeSelection(data.themeSelection);
        }
        roomWasValidRef.current = true;
      } else if (roomWasValidRef.current) {
        router.push('/home');
      }
    });

    const unsubState = onValue(stateRef, (snap) => {
      const data = snap.val();
      setState(data);
      if (data?.phase === 'playing' && !countdownTriggeredRef.current) {
        countdownTriggeredRef.current = true;
        setShowCountdown(true);
      }
    });

    return () => {
      unsubMeta();
      unsubState();
    };
  }, [db, code, router]);

  // Déterminer si host
  useEffect(() => {
    if (myUid && meta?.hostUid) {
      setIsHost(myUid === meta.hostUid);
    }
  }, [myUid, meta?.hostUid]);

  // Hooks
  const { players, activePlayers } = usePlayers({
    roomCode: code,
    roomPrefix: 'rooms_mime',
    sort: 'joinedAt'
  });

  // Vérifier si host est déjà dans la liste des joueurs
  useEffect(() => {
    if (myUid && players.length > 0) {
      setHostJoined(players.some(p => p.uid === myUid));
    }
  }, [myUid, players]);

  // Auto-join host comme joueur (Mime = tout le monde joue)
  useEffect(() => {
    if (isHost && !hostJoined && userPseudo && !profileLoading && myUid && code) {
      set(ref(db, `rooms_mime/${code}/players/${myUid}`), {
        uid: myUid,
        name: userPseudo,
        score: 0,
        blockedUntil: 0,
        joinedAt: Date.now(),
        status: 'active',
        activityStatus: 'active',
        location: 'lobby'
      });
    }
  }, [isHost, hostJoined, userPseudo, profileLoading, myUid, code, db]);

  // Marquer le joueur comme étant dans le lobby (pour ceux qui reviennent de l'écran de fin)
  useEffect(() => {
    if (myUid && code && players.some(p => p.uid === myUid)) {
      update(ref(db, `rooms_mime/${code}/players/${myUid}`), {
        location: 'lobby'
      });
    }
  }, [myUid, code, players, db]);

  const { leaveRoom } = usePlayerCleanup({
    roomCode: code,
    roomPrefix: 'rooms_mime',
    playerUid: myUid,
    phase: 'lobby'
  });

  const { markVoluntaryLeave, closeRoom } = useRoomGuard({
    roomCode: code,
    roomPrefix: 'rooms_mime',
    playerUid: myUid,
    isHost
  });

  usePresence({
    roomCode: code,
    roomPrefix: 'rooms_mime',
    playerUid: myUid,
    enabled: !!myUid
  });

  // Callbacks
  const handleHostExit = useCallback(async () => {
    markVoluntaryLeave();
    await closeRoom();
    router.push('/home');
  }, [markVoluntaryLeave, closeRoom, router]);

  const handlePlayerExit = useCallback(async () => {
    markVoluntaryLeave();
    await leaveRoom();
    router.push('/home');
  }, [markVoluntaryLeave, leaveRoom, router]);

  // Sauvegarder la sélection de thèmes
  const handleThemeChange = useCallback(async (selection) => {
    setThemeSelection(selection);
    if (code) {
      await update(ref(db, `rooms_mime/${code}/meta`), {
        themeSelection: selection
      });
    }
  }, [db, code]);

  // Lancer la partie
  const handleStartGame = useCallback(async () => {
    if (!isHost || isStarting) return;
    if (activePlayers.length < MIME_CONFIG.MIN_PLAYERS) {
      alert(`Il faut au moins ${MIME_CONFIG.MIN_PLAYERS} joueurs pour commencer.`);
      return;
    }
    if (!themeSelection?.themeIds?.length) {
      alert('Sélectionne au moins un thème.');
      return;
    }

    setIsStarting(true);

    try {
      // Charger les mots des thèmes sélectionnés depuis les fichiers JSON locaux
      const allWords = [];
      for (const themeId of themeSelection.themeIds) {
        const theme = MIME_THEMES.find(t => t.id === themeId);
        if (!theme) {
          console.warn('[Mime] Theme not found:', themeId);
          continue;
        }

        try {
          const response = await fetch(`/data/mime/${theme.file}`);
          const data = await response.json();

          if (data.items && data.items.length > 0) {
            console.log(`[Mime] Loaded ${data.items.length} words from ${theme.file}`);
            data.items.forEach(word => {
              allWords.push({
                word: typeof word === 'string' ? word : word.word || word,
                category: themeId
              });
            });
          }
        } catch (err) {
          console.error(`[Mime] Failed to load ${theme.file}:`, err);
        }
      }

      console.log('[Mime] Total words collected:', allWords.length);

      // Mélanger les mots
      const shuffledWords = [...allWords].sort(() => Math.random() - 0.5);

      // Calculer le nombre de mots nécessaires
      const { totalWords, wordsPerPlayer } = calculateMimeWords(activePlayers.length);

      // Prendre les mots nécessaires
      const gameWords = shuffledWords.slice(0, Math.min(totalWords, shuffledWords.length));

      // Créer la rotation des mimeurs
      const shuffledPlayers = [...activePlayers].sort(() => Math.random() - 0.5);
      const mimeRotation = shuffledPlayers.map(p => p.uid);

      // Écrire les mots et mettre à jour le state
      await update(ref(db, `rooms_mime/${code}`), {
        words: gameWords,
        'state/phase': 'playing',
        'state/wordPool': gameWords,
        'state/currentIndex': 0,
        'state/totalWords': gameWords.length,
        'state/wordsPerPlayer': wordsPerPlayer,
        'state/mimeRotation': mimeRotation,
        'state/mimeIndex': 0,
        'state/currentMimeUid': mimeRotation[0],
        'state/revealed': false,
        'state/revealedAt': null,
        'state/pausedAt': null,
        'state/elapsedAcc': 0,
        'state/lockUid': null,
        'state/buzzBanner': ''
      });
    } catch (error) {
      console.error('Error starting game:', error);
      setIsStarting(false);
    }
  }, [isHost, isStarting, activePlayers, themeSelection, themes, db, code]);

  // URL de partage
  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/join?code=${code}&game=mime`
    : '';

  // Conditions pour démarrer
  const hasSelection = themeSelection?.themeIds?.length > 0;
  const canStart = isHost && hasSelection && activePlayers.length >= MIME_CONFIG.MIN_PLAYERS;

  // Infos de sélection
  const selectedThemeNames = themeSelection?.themes?.map(t => t.name).join(', ') || '';
  const totalWords = themeSelection?.themes?.reduce((sum, t) => sum + (t.wordCount || 0), 0) || 0;

  // Loading state
  if (!meta || !state || !myUid) {
    return (
      <div className="lobby-container mime game-page">
        <div className="lobby-loading">
          <div className="loading-spinner" />
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby-container mime game-page">
      {/* Modals */}
      <MimeThemeSelectorModal
        isOpen={showThemeSelector}
        onClose={() => setShowThemeSelector(false)}
        themes={themes}
        currentSelection={themeSelection?.themeIds || []}
        onSelectThemes={handleThemeChange}
        userIsPro={true} // TODO: intégrer useSubscription
      />

      {/* Countdown de lancement */}
      <AnimatePresence>
        {showCountdown && (
          <GameLaunchCountdown
            gameColor="#00ff66"
            onComplete={() => {
              router.push(`/mime/game/${code}/play`);
            }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <LobbyHeader
        ref={shareModalRef}
        variant="mime"
        code={code}
        isHost={isHost}
        players={players}
        hostUid={meta?.hostUid}
        onHostExit={handleHostExit}
        onPlayerExit={handlePlayerExit}
        joinUrl={joinUrl}
      />

      {/* Main Content */}
      <main className="lobby-main">
        {isHost ? (
          // HOST VIEW
          <>
            <div className="lobby-content">
              {/* Theme Selector Card */}
              <motion.div
                className="lobby-card quiz-selector mime"
                onClick={() => setShowThemeSelector(true)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="quiz-card-content">
                  <div className="quiz-card-left">
                    <span className="quiz-card-emoji">🎭</span>
                  </div>
                  <div className="quiz-card-center">
                    <span className="quiz-card-label">Thèmes</span>
                    <h3 className="quiz-card-title">
                      {hasSelection
                        ? `${themeSelection.themeIds.length} thème${themeSelection.themeIds.length > 1 ? 's' : ''}`
                        : 'Choisis les thèmes'}
                    </h3>
                    <p className="quiz-card-meta">
                      {hasSelection
                        ? `${selectedThemeNames} • ${totalWords} mots`
                        : ''}
                    </p>
                  </div>
                  <div className="quiz-card-right">
                    <span className="quiz-change-hint">{hasSelection ? 'Changer' : 'Choisir'}</span>
                    <ChevronRight size={20} className="quiz-card-arrow" />
                  </div>
                </div>
              </motion.div>

              {/* Players Card */}
              <div className="lobby-card lobby-players mime lobby-card-flex">
                <div className="card-header">
                  <span className="card-icon">👥</span>
                  <span className="card-label">Joueurs</span>
                  <span className="player-count-badge">{activePlayers.length}</span>
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
                    {players.map((player, index) => {
                      const isOnEndScreen = player.location === 'end';
                      return (
                        <motion.div
                          key={player.uid}
                          className={`player-chip ${player.uid === myUid ? 'is-me' : ''} ${isOnEndScreen ? 'on-end-screen' : ''}`}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <div className="chip-avatar">
                            {player.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <span className="chip-name">
                            {player.name}
                            {isOnEndScreen && ' 📊'}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Fixed Start Button */}
            <div className="lobby-footer">
              <LobbyStartButton
                gameColor="#00ff66"
                icon="🎬"
                disabled={!canStart}
                loading={isStarting}
                onClick={handleStartGame}
              />
            </div>
          </>
        ) : (
          // PLAYER VIEW
          <div className="lobby-player-view mime">
            {/* Players Header */}
            <div className="players-header-card">
              <span className="players-icon">🎭</span>
              <span className="players-count">{activePlayers.length}</span>
              <span className="players-label">joueurs connectés</span>
            </div>

            {/* Theme Info for players */}
            {hasSelection && (
              <div className="player-info-card mime">
                <div className="player-info-text">
                  <span className="player-info-label">Thèmes sélectionnés</span>
                  <span className="player-info-title">{selectedThemeNames}</span>
                </div>
              </div>
            )}

            {/* Players List */}
            <div className="players-list-player">
              {players.map((player, index) => {
                const isOnEndScreen = player.location === 'end';
                return (
                  <motion.div
                    key={player.uid}
                    className={`player-chip-full ${player.uid === myUid ? 'is-me' : ''} ${isOnEndScreen ? 'on-end-screen' : ''}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <div className="chip-avatar-glow">
                      {player.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <span className="chip-name-full">
                      {player.name}
                      {player.uid === myUid && ' (toi)'}
                      {isOnEndScreen && ' 📊'}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* Waiting Animation */}
            <LobbyWaitingIndicator gameColor="#00ff66" />
          </div>
        )}
      </main>
    </div>
  );
}

