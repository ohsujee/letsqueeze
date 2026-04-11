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
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, SkipForward, CaretDown } from '@phosphor-icons/react';
import { getFlatCSSVars } from '@/lib/config/colors';

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
import { useAppShellBg } from "@/lib/hooks/useAppShellBg";
import './alibi-prep.css';
import GameStatusBanners from "@/components/game/GameStatusBanners";

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
  // 'redacted' → 'revealing' → 'visible'
  const [redactionState, setRedactionState] = useState('redacted');
  const timerRef = useRef(null);
  const contentRef = useRef(null);
  const [showScrollHint, setShowScrollHint] = useState(true);


  // Party Mode state
  const [isPartyMode, setIsPartyMode] = useState(false);
  const [myGroupId, setMyGroupId] = useState(null);
  const [groups, setGroups] = useState({});
  const [myGroupAlibi, setMyGroupAlibi] = useState(null);

  // Safe-area color continuity:
  //  - Suspect view (party mode default): aged paper beige
  //  - Inspector view (gamemaster only): manila case file
  useAppShellBg(!isPartyMode && myTeam === 'inspectors' ? '#c8ad75' : '#f0e8d8');

  // Centralized players hook
  const { players } = usePlayers({ roomCode: code, roomPrefix: 'rooms_alibi' });

  // Room guard - détecte kick et fermeture room
  const { isHostTemporarilyDisconnected, hostDisconnectedAt } = useRoomGuard({
    roomCode: code,
    roomPrefix: 'rooms_alibi',
    playerUid: myUid,
    isHost
  });


  // Redaction lifecycle: redacted (2s) → revealing (2s) → visible
  useEffect(() => {
    if (redactionState === 'redacted') {
      const t = setTimeout(() => setRedactionState('revealing'), 2000);
      return () => clearTimeout(t);
    }
    if (redactionState === 'revealing') {
      const t = setTimeout(() => setRedactionState('visible'), 2000);
      return () => clearTimeout(t);
    }
  }, [redactionState]);

  // Show scroll hint only if content overflows AND user hasn't scrolled to bottom
  const scrollDismissedRef = useRef(false);
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const check = () => {
      const canScroll = el.scrollHeight > el.clientHeight + 20;
      if (!canScroll) { setShowScrollHint(false); return; }
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 20;
      if (atBottom || scrollDismissedRef.current) {
        scrollDismissedRef.current = true;
        setShowScrollHint(false);
      } else {
        setShowScrollHint(true);
      }
    };
    const t = setTimeout(check, 300);
    el.addEventListener('scroll', check);
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => { clearTimeout(t); el.removeEventListener('scroll', check); ro.disconnect(); };
  }, []);

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
      if (state?.phase === "interrogation") {
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
  }, [code, router]);

  // Party Mode: get my group's alibi
  useEffect(() => {
    if (!isPartyMode || !myGroupId || !groups[myGroupId]) {
      setMyGroupAlibi(null);
      return;
    }
    setMyGroupAlibi(groups[myGroupId]?.alibiData || null);
  }, [isPartyMode, myGroupId, groups]);

  // Timer countdown (seulement pour l'hôte, après déclassification)
  useEffect(() => {
    if (!isHost) return;
    if (redactionState !== 'visible') return;

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
  }, [timeLeft, code, isHost, isPaused, redactionState]);

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
        return <strong key={i} className="text-alibi-highlight">{part.slice(2, -2)}</strong>;
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
        ALLOWED_ATTR: ['class']
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
    <div className={`alibi-prep game-page ${isPartyMode || myTeam === 'suspects' ? 'suspect-view' : myTeam === 'inspectors' ? 'inspector-view' : ''}`} style={getFlatCSSVars('alibi')}>

      {/* Header */}
      <header className="prep-header">
        <div className="prep-header-content">
          <div className="prep-header-left">
            <span className="prep-header-label">Dossier d'enquête</span>
            <span className="prep-header-title">{currentAlibi?.title || "Alibi"}</span>
          </div>

          <div className="prep-timer-section">
            {isHost && (
              <motion.button
                className="prep-pause-btn"
                onClick={handleTogglePause}
                whileTap={{ scale: 0.95 }}
                title={isPaused ? "Reprendre" : "Pause"}
              >
                {isPaused ? <Play size={16} weight="bold" /> : <Pause size={16} weight="bold" />}
              </motion.button>
            )}
            <span className={`prep-timer-display ${isPaused ? 'paused' : ''} ${isUrgent ? 'urgent' : ''}`}>
              {formatTime(timeLeft)}
            </span>
          </div>

          <ExitButton
            variant="header"
            confirmMessage="Voulez-vous vraiment quitter ? Tout le monde retournera au lobby."
            onExit={exitGame}
            color={myTeam === 'inspectors' ? '#5c4420' : '#8a3030'}
          />
        </div>

        <div className="prep-progress-bar">
          <motion.div
            className={`prep-progress-fill ${isUrgent ? 'urgent' : ''}`}
            initial={{ width: '100%' }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="prep-content" ref={contentRef}>
        <div className="prep-wrapper">

          {/* Phase Header */}
          <motion.div className="prep-phase-header" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {isPartyMode ? (
              <>
                <div className="prep-group-badge">
                  <span className="prep-group-dot" style={{ background: myGroup?.color }} />
                  <span className="prep-group-name">{myGroup?.name || 'Ton groupe'}</span>
                </div>
                <h1 className="prep-title">Mémorise ton Alibi</h1>
                <p className="prep-subtitle">Tu n'auras plus accès à ce texte pendant l'interrogatoire</p>
              </>
            ) : (
              <>
                <h1 className="prep-title">
                  {myTeam === "suspects" ? "Mémorise ton Alibi" : "Prépare tes Questions"}
                </h1>
                <p className="prep-subtitle">
                  {myTeam === "suspects"
                    ? "Tu n'auras plus accès à ce texte pendant l'interrogatoire"
                    : "Les suspects vont devoir défendre cet alibi"}
                </p>
              </>
            )}
          </motion.div>

          {/* Host: Skip Button */}
          {isHost && !isPartyMode && timeLeft > 0 && (
            <motion.div className="prep-host-controls" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
              <motion.button className="prep-skip-btn" onClick={handleSkipPrep} whileTap={{ scale: 0.98 }}>
                <SkipForward size={18} weight="bold" /> Passer la préparation
              </motion.button>
            </motion.div>
          )}

          {/* Suspect Card / Party Mode Card */}
          {((myTeam === "suspects" && alibi) || (isPartyMode && currentAlibi)) && (
            <motion.div
              className={`prep-alibi-card ${isPaused ? 'paused' : ''} ${!isPaused ? `redaction-${redactionState}` : ''}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
                <div className="prep-document-box">
                  {currentAlibi?.isNewFormat ? renderHTML() : (
                    <div className="prep-scenario-text">{parseMarkdown(currentAlibi?.scenario)}</div>
                  )}
                </div>

            </motion.div>
          )}

          {/* Stamps — suspects/party only */}
          {(myTeam === 'suspects' || isPartyMode) && <AnimatePresence>
            {redactionState === 'redacted' && !isPaused && (
              <motion.div key="classified" className="prep-pause-overlay"
                initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <motion.div className="prep-pause-label"
                  initial={{ scale: 2.5, rotate: -20, opacity: 0 }}
                  animate={{ scale: 1, rotate: -5, opacity: 1 }}
                  exit={{ scale: 1.5, rotate: -10, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}>
                  <span>CLASSIFIÉ</span>
                </motion.div>
              </motion.div>
            )}

            {redactionState === 'revealing' && !isPaused && (
              <motion.div key="declassified" className="prep-pause-overlay"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}>
                <motion.div className="prep-declassified-label"
                  initial={{ scale: 2.5, rotate: -20, opacity: 0 }}
                  animate={{ scale: 1, rotate: -5, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}>
                  <span>DÉCLASSIFIÉ</span>
                </motion.div>
              </motion.div>
            )}

            {isPaused && (
              <motion.div key="paused" className="prep-pause-overlay"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}>
                <motion.div className="prep-pause-label"
                  initial={{ scale: 2.5, rotate: -20, opacity: 0 }}
                  animate={{ scale: 1, rotate: -5, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}>
                  <span>CLASSIFIÉ</span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>}

          {/* Inspector View */}
          {!isPartyMode && myTeam === "inspectors" && alibi && (
            <div className="prep-inspector-section">
              <motion.div className="prep-questions-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <h2 className="prep-section-title">Questions</h2>
                <ol className="prep-questions-list">
                  {questions.slice(0, alibi?.isNewFormat ? 10 : 7).map((q, i) => (
                    <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }}>
                      <div className="prep-question-content">
                        {q.hint && <div className="prep-question-hint">« {q.hint} »</div>}
                        <div className="prep-question-row">
                          <span className="prep-question-number">{i + 1}</span>
                          <span className="prep-question-text">{q.text}</span>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </ol>
              </motion.div>

              {!alibi?.isNewFormat && (
                <motion.div className="prep-custom-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <h2 className="prep-section-title">Tes Questions</h2>
                  <p className="prep-custom-hint">Piège les suspects avec tes propres questions !</p>
                  <div className="prep-custom-inputs">
                    {[0, 1, 2].map((index) => (
                      <div key={index} className="prep-input-group">
                        <label>Question {8 + index}</label>
                        <input
                          type="text"
                          className="prep-game-input"
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

          {/* No Team */}
          {((!isPartyMode && !myTeam) || (isPartyMode && !myGroupId)) && (
            <motion.div className="prep-no-team" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <p>{isPartyMode ? "Tu n'es assigné à aucun groupe..." : "Tu n'es assigné à aucune équipe..."}</p>
            </motion.div>
          )}
        </div>
      </main>

      {/* Scroll hint */}
      <AnimatePresence>
        {showScrollHint && (
          <motion.div
            className="prep-scroll-hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: [0, 4, 0] }}
            exit={{ opacity: 0 }}
            transition={{ y: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 0.2 } }}
          >
            <CaretDown size={18} weight="bold" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlays */}
      <DisconnectAlert roomCode={code} roomPrefix="rooms_alibi" playerUid={myUid} onReconnect={markActive} />
      <GameStatusBanners isHost={isHost} isHostTemporarilyDisconnected={isHostTemporarilyDisconnected} hostDisconnectedAt={hostDisconnectedAt} />
      <AlibiPhaseTransition isVisible={showCountdown} title="L'enquête commence" subtitle="Les inspecteurs vont te questionner..." type="interrogation" onComplete={handleCountdownComplete} duration={3500} />
    </div>
  );
}

export default function AlibiPrep() {
  const { code } = useParams();
  return <AlibiPrepContent code={code} />;
}
