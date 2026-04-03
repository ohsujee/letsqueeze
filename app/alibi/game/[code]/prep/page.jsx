"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  auth,
  db,
  ref,
  onValue,
  update,
  signInAnonymously,
  onAuthStateChanged,
} from "@/lib/firebase";
import { motion } from 'framer-motion';
import { Pause, Play, SkipForward, ChevronUp, ChevronDown } from 'lucide-react';

// Dynamic import for DOMPurify - only loaded when needed
let DOMPurifyModule = null;
async function getDOMPurify() {
  if (!DOMPurifyModule) {
    DOMPurifyModule = (await import('dompurify')).default;
  }
  return DOMPurifyModule;
}
import ExitButton from "@/lib/components/ExitButton";
import { AlibiPhaseTransition } from "@/components/game-alibi/AlibiPhaseTransition";
import DisconnectAlert from "@/components/game/DisconnectAlert";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { usePlayerCleanup } from "@/lib/hooks/usePlayerCleanup";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { useHostDisconnect } from "@/lib/hooks/useHostDisconnect";
import { useInactivityDetection } from "@/lib/hooks/useInactivityDetection";
import './alibi-prep.css';
import GameStatusBanners from "@/components/game/GameStatusBanners";
import { ALIBI_GROUP_CONFIG } from "@/lib/config/rooms";
import '@/app/alibi/alibi-theme.css';

export function AlibiPrepContent({ code, myUid: devUid }) {
  const nextRouter = useRouter();
  const noopRouter = useMemo(() => ({ push: () => {}, replace: () => {}, back: () => {} }), []);
  const router = devUid ? noopRouter : nextRouter;

  const [myUid, setMyUid] = useState(devUid || null);
  const [meta, setMeta] = useState(null);
  const [timeLeft, setTimeLeft] = useState(90);
  const [myTeam, setMyTeam] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [alibi, setAlibi] = useState(null);
  const [sanitizedDoc, setSanitizedDoc] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [customQuestions, setCustomQuestions] = useState(["", "", ""]);
  const [showCountdown, setShowCountdown] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  // Scroll indicators
  const documentScrollRef = useRef(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  // Party Mode state
  const [isPartyMode, setIsPartyMode] = useState(false);
  const [myGroupId, setMyGroupId] = useState(null);
  const [groups, setGroups] = useState({});
  const [myGroupAlibi, setMyGroupAlibi] = useState(null);

  // Centralized players hook
  const { players } = usePlayers({ roomCode: code, roomPrefix: 'rooms_alibi' });

  // Room guard - détecte kick et fermeture room
  const { isHostTemporarilyDisconnected, hostDisconnectedAt } = useRoomGuard({
    roomCode: code,
    roomPrefix: 'rooms_alibi',
    playerUid: myUid,
    isHost
  });

  // Keep screen awake during game

  // Scroll indicators for document
  useEffect(() => {
    const container = documentScrollRef.current;
    if (!container) return;

    const checkScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setCanScrollUp(scrollTop > 10);
      setCanScrollDown(scrollTop < scrollHeight - clientHeight - 10);
    };

    checkScroll();
    container.addEventListener('scroll', checkScroll);

    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', checkScroll);
      resizeObserver.disconnect();
    };
  }, [sanitizedDoc, alibi]);

  // Host disconnect - gère la grace period si l'hôte perd sa connexion
  // UNIVERSAL: Utiliser hostUid - le hook détermine si on est l'hôte
  useHostDisconnect({
    roomCode: code,
    roomPrefix: 'rooms_alibi',
    hostUid: meta?.hostUid
  });

  // Player cleanup - gère déconnexion pendant la prep (traité comme playing pour préserver le score)
  const { markActive } = usePlayerCleanup({
    roomCode: code,
    roomPrefix: 'rooms_alibi',
    playerUid: myUid,
    isHost,
    phase: 'playing'
  });

  // Inactivity detection - marque le joueur inactif après 30s
  useInactivityDetection({
    roomCode: code,
    roomPrefix: 'rooms_alibi',
    playerUid: myUid,
    inactivityTimeout: 30000
  });

  // Fonction pour quitter et retourner au lobby
  async function exitGame() {
    if (isHost && code) {
      if (timerRef.current) clearInterval(timerRef.current);
      await update(ref(db, `rooms_alibi/${code}`), {
        state: {
          phase: "lobby",
          currentQuestion: 0,
          prepTimeLeft: 90,
          questionTimeLeft: 30,
          allAnswered: false
        },
        interrogation: null,
        questions: null,
        alibi: null
      });
    }
    router.push(`/alibi/room/${code}`);
  }

  const handleCountdownComplete = () => {
    router.push(`/alibi/game/${code}/play`);
  };

  // Auth - only set myUid (skip in dev mode)
  useEffect(() => {
    if (devUid) return;
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setMyUid(user.uid);
      } else {
        signInAnonymously(auth).catch(() => {});
      }
    });
    return () => unsub();
  }, [devUid]);

  // Listen to player team/group - separate effect with proper cleanup
  useEffect(() => {
    if (!code || !myUid) return;

    const playerRef = ref(db, `rooms_alibi/${code}/players/${myUid}`);
    const unsub = onValue(playerRef, (snap) => {
      const player = snap.val();
      if (player) {
        setMyTeam(player.team);
        setMyGroupId(player.groupId || null);
      }
    });

    return () => unsub();
  }, [code, myUid]);

  // Listen to host - separate effect with proper cleanup
  useEffect(() => {
    if (!code || !myUid) return;

    const hostRef = ref(db, `rooms_alibi/${code}/meta/hostUid`);
    const unsub = onValue(hostRef, (snap) => {
      const hUid = snap.val();
      setIsHost(hUid === myUid);
    });

    return () => unsub();
  }, [code, myUid]);

  // Écouter les données de la room
  useEffect(() => {
    if (!code) return;

    // Listen to meta for Party Mode detection
    const metaUnsub = onValue(ref(db, `rooms_alibi/${code}/meta`), (snap) => {
      const metaData = snap.val();
      setMeta(metaData);
      if (metaData?.gameMasterMode === 'party') {
        setIsPartyMode(true);
      }
    });

    // Listen to groups (Party Mode)
    const groupsUnsub = onValue(ref(db, `rooms_alibi/${code}/groups`), (snap) => {
      setGroups(snap.val() || {});
    });

    // Listen to alibi (Game Master Mode)
    const alibiUnsub = onValue(ref(db, `rooms_alibi/${code}/alibi`), (snap) => {
      setAlibi(snap.val());
    });

    const questionsUnsub = onValue(ref(db, `rooms_alibi/${code}/questions`), (snap) => {
      const q = snap.val() || [];
      setQuestions(q);
      setCustomQuestions([
        q[7]?.text || "",
        q[8]?.text || "",
        q[9]?.text || ""
      ]);
    });

    const stateUnsub = onValue(ref(db, `rooms_alibi/${code}/state`), (snap) => {
      const state = snap.val();
      if (state?.phase === "interrogation" && !showCountdown) {
        setShowCountdown(true);
      }
      if (state?.prepTimeLeft !== undefined) {
        setTimeLeft(state.prepTimeLeft);
      }
      if (state?.prepPaused !== undefined) {
        setIsPaused(state.prepPaused);
      }
      if (state?.phase === "lobby") {
        router.push(`/alibi/room/${code}`);
      }
    });

    return () => {
      metaUnsub();
      groupsUnsub();
      alibiUnsub();
      questionsUnsub();
      stateUnsub();
    };
  }, [code, router, showCountdown]);

  // Party Mode: get my group's alibi
  useEffect(() => {
    if (!isPartyMode || !myGroupId || !groups[myGroupId]) {
      setMyGroupAlibi(null);
      return;
    }
    setMyGroupAlibi(groups[myGroupId]?.alibiData || null);
  }, [isPartyMode, myGroupId, groups]);

  // Timer countdown (seulement pour l'hôte)
  useEffect(() => {
    if (!isHost) return;

    if (isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    if (timeLeft <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      update(ref(db, `rooms_alibi/${code}/state`), {
        phase: "interrogation",
        currentQuestion: 0
      });
      update(ref(db, `rooms_alibi/${code}/interrogation`), {
        currentQuestion: 0,
        state: "waiting",
        timeLeft: 30,
        responses: {},
        verdict: null
      });
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1;
        update(ref(db, `rooms_alibi/${code}/state`), { prepTimeLeft: newTime });
        return newTime;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft, code, isHost, isPaused]);

  const handleTogglePause = async () => {
    if (!isHost || !code) return;
    await update(ref(db, `rooms_alibi/${code}/state`), { prepPaused: !isPaused });
  };

  const handleSaveCustomQuestion = async (index, text) => {
    const questionId = 7 + index;
    await update(ref(db, `rooms_alibi/${code}/questions/${questionId}`), { text });
  };

  const handleSkipPrep = async () => {
    if (!isHost || !code) return;
    if (timerRef.current) clearInterval(timerRef.current);
    await update(ref(db, `rooms_alibi/${code}/state`), {
      phase: "interrogation",
      currentQuestion: 0,
      prepTimeLeft: 0
    });
    await update(ref(db, `rooms_alibi/${code}/interrogation`), {
      currentQuestion: 0,
      state: "waiting",
      timeLeft: 30,
      responses: {},
      verdict: null
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const parseMarkdown = (text) => {
    if (!text) return "";
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-alibi-glow">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  // Sanitize HTML when alibi changes (async DOMPurify)
  // Works for both Game Master Mode (alibi) and Party Mode (myGroupAlibi)
  useEffect(() => {
    const currentAlibi = isPartyMode ? myGroupAlibi : alibi;
    if (!currentAlibi?.accused_document) {
      setSanitizedDoc(null);
      return;
    }

    (async () => {
      const DOMPurify = await getDOMPurify();
      const sanitized = DOMPurify.sanitize(currentAlibi.accused_document, {
        ALLOWED_TAGS: ['strong', 'em', 'b', 'i', 'u', 'br', 'p', 'span', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4'],
        ALLOWED_ATTR: ['class', 'style']
      });
      setSanitizedDoc(sanitized);
    })();
  }, [isPartyMode, alibi?.accused_document, myGroupAlibi?.accused_document]);

  const renderHTML = () => {
    if (!sanitizedDoc) return null;
    return (
      <div
        dangerouslySetInnerHTML={{ __html: sanitizedDoc }}
        className="alibi-prose"
      />
    );
  };

  // Calcul du pourcentage pour la barre de progression
  const progressPercent = (timeLeft / 90) * 100;
  const isUrgent = timeLeft <= 15;

  // Get current alibi based on mode
  const currentAlibi = isPartyMode ? myGroupAlibi : alibi;
  const myGroup = isPartyMode && myGroupId ? groups[myGroupId] : null;

  return (
    <div className="game-screen game-page">
      {/* Animated Background */}
      <div className="animated-background" />

      {/* Header Fixe */}
      <header className="game-header">
        <div className="header-content">
          <div className="header-title">{currentAlibi?.title || "Alibi"}</div>

          <div className="timer-section">
            {isHost && (
              <motion.button
                className="pause-btn"
                onClick={handleTogglePause}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                title={isPaused ? "Reprendre" : "Pause"}
              >
                {isPaused ? <Play size={16} /> : <Pause size={16} />}
              </motion.button>
            )}
            <span className={`timer-display ${isPaused ? 'paused' : ''} ${isUrgent ? 'urgent' : ''}`}>
              {formatTime(timeLeft)}
            </span>
          </div>

          <ExitButton
            variant="header"
            confirmMessage="Voulez-vous vraiment quitter ? Tout le monde retournera au lobby."
            onExit={exitGame}
          />
        </div>

        {/* Barre de progression */}
        <div className="progress-bar">
          <motion.div
            className={`progress-fill ${isUrgent ? 'urgent' : ''}`}
            initial={{ width: '100%' }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </header>

      {/* Contenu Principal */}
      <main className="prep-content">
        <div className="prep-wrapper">
          {/* Titre de la phase */}
          <motion.div
            className="phase-header"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {isPartyMode ? (
              <>
                {/* Party Mode: everyone memorizes their group's alibi */}
                <div className="group-badge-prep" style={{ '--group-color': myGroup?.color }}>
                  <span className="group-dot" style={{ background: myGroup?.color }} />
                  <span className="group-name">{myGroup?.name || 'Ton groupe'}</span>
                </div>
                <h1 className="game-title">🎭 Mémorise ton Alibi</h1>
                <p className="phase-subtitle">
                  Tu n'auras plus accès à ce texte pendant l'interrogatoire !
                </p>
              </>
            ) : (
              <>
                {/* Game Master Mode: inspectors vs suspects */}
                <h1 className="game-title">
                  {myTeam === "suspects" ? "🎭 Mémorise ton Alibi" : "🕵️ Prépare tes Questions"}
                </h1>
                <p className="phase-subtitle">
                  {myTeam === "suspects"
                    ? "Tu n'auras plus accès à ce texte pendant l'interrogatoire !"
                    : "Les suspects vont devoir défendre cet alibi"}
                </p>
              </>
            )}
          </motion.div>

          {/* Contrôles Hôte (Game Master Mode only) */}
          {isHost && !isPartyMode && timeLeft > 0 && (
            <motion.div
              className="host-controls"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <motion.button
                className="btn-skip"
                onClick={handleSkipPrep}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <SkipForward size={18} />
                Lancer l'interrogatoire
              </motion.button>
            </motion.div>
          )}

          {/* Vue SUSPECTS (Game Master Mode) ou vue PARTY MODE (tous les joueurs) */}
          {((myTeam === "suspects" && alibi) || (isPartyMode && currentAlibi)) && (
            <div className="alibi-card-wrapper">
              {/* Scroll indicator - Up (outside card for visibility) */}
              <div className={`scroll-indicator up ${canScrollUp ? 'visible' : ''}`}>
                <ChevronUp size={20} />
              </div>

              <motion.div
                className={`alibi-card ${isPaused ? 'paused' : ''}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <div className="card-glow" />

                {currentAlibi?.isNewFormat ? (
                  <div className="alibi-content">
                    {/* Document de l'accusé */}
                    <div className="document-box" ref={documentScrollRef}>
                      {renderHTML()}
                    </div>
                  </div>
                ) : (
                  <div className="alibi-content">
                    <div className="document-box" ref={documentScrollRef}>
                      <div className="scenario-text">
                        {parseMarkdown(currentAlibi?.scenario)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Overlay pause sur l'alibi */}
                {isPaused && (
                  <motion.div
                    className="pause-blur-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="pause-label">
                      <Pause size={32} />
                      <span>PAUSE</span>
                    </div>
                  </motion.div>
                )}
              </motion.div>

              {/* Scroll indicator - Down (outside card for visibility) */}
              <div className={`scroll-indicator down ${canScrollDown ? 'visible' : ''}`}>
                <ChevronDown size={20} />
              </div>
            </div>
          )}

          {/* Vue INSPECTEURS (Game Master Mode only) */}
          {!isPartyMode && myTeam === "inspectors" && alibi && (
            <div className="inspector-section">
              {/* Questions */}
              <motion.div
                className="questions-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="card-glow inspector" />
                <h2 className="section-title">
                  ❓ Questions ({alibi?.isNewFormat ? '10' : '7'})
                </h2>
                <ol className="questions-list">
                  {questions.slice(0, alibi?.isNewFormat ? 10 : 7).map((q, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                    >
                      {q.text}
                    </motion.li>
                  ))}
                </ol>
              </motion.div>

              {/* Questions personnalisées (ancien format) */}
              {!alibi?.isNewFormat && (
                <motion.div
                  className="custom-questions-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="card-glow inspector" />
                  <h2 className="section-title">✏️ Tes Questions (3)</h2>
                  <p className="custom-hint">Piège les suspects avec tes propres questions !</p>
                  <div className="custom-inputs">
                    {[0, 1, 2].map((index) => (
                      <div key={index} className="input-group">
                        <label>Question {8 + index}</label>
                        <input
                          type="text"
                          className="game-input"
                          placeholder="Ex: Quelle était la couleur du café ?"
                          value={customQuestions[index]}
                          onChange={(e) => {
                            const newCustom = [...customQuestions];
                            newCustom[index] = e.target.value;
                            setCustomQuestions(newCustom);
                            handleSaveCustomQuestion(index, e.target.value);
                          }}
                          maxLength={200}
                          autoComplete="off"
                        />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Aucune équipe / groupe */}
          {((!isPartyMode && !myTeam) || (isPartyMode && !myGroupId)) && (
            <motion.div
              className="no-team-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p>{isPartyMode ? "Tu n'es assigné à aucun groupe..." : "Tu n'es assigné à aucune équipe..."}</p>
            </motion.div>
          )}
        </div>
      </main>

      {/* Disconnect Alert */}
      <DisconnectAlert
        roomCode={code}
        roomPrefix="rooms_alibi"
        playerUid={myUid}
        onReconnect={markActive}
      />

      {/* Game Status Banners */}
      <GameStatusBanners
        isHost={isHost}
        isHostTemporarilyDisconnected={isHostTemporarilyDisconnected}
        hostDisconnectedAt={hostDisconnectedAt}
      />

      <AlibiPhaseTransition
        isVisible={showCountdown}
        title="L'enquête commence"
        subtitle="Les inspecteurs vont te questionner..."
        type="interrogation"
        onComplete={handleCountdownComplete}
        duration={3500}
      />

    </div>
  );
}

export default function AlibiPrep() {
  const { code } = useParams();
  return <AlibiPrepContent code={code} />;
}
