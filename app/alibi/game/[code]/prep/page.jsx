"use client";

import { useEffect, useState, useRef } from "react";
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
import { Pause, Play, SkipForward } from 'lucide-react';

// Dynamic import for DOMPurify - only loaded when needed
let DOMPurifyModule = null;
async function getDOMPurify() {
  if (!DOMPurifyModule) {
    DOMPurifyModule = (await import('dompurify')).default;
  }
  return DOMPurifyModule;
}
import ExitButton from "@/lib/components/ExitButton";
import { AlibiPhaseTransition } from "@/components/alibi/AlibiPhaseTransition";

export default function AlibiPrep() {
  const { code } = useParams();
  const router = useRouter();

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

  // Auth et récupération de l'équipe du joueur
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user && code) {
        onValue(ref(db, `rooms_alibi/${code}/players/${user.uid}`), (snap) => {
          const player = snap.val();
          if (player) setMyTeam(player.team);
        });
        onValue(ref(db, `rooms_alibi/${code}/meta/hostUid`), (snap) => {
          setIsHost(snap.val() === user.uid);
        });
      } else if (!user) {
        signInAnonymously(auth).catch(() => {});
      }
    });
    return () => unsub();
  }, [code]);

  // Écouter les données de la room
  useEffect(() => {
    if (!code) return;

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
      alibiUnsub();
      questionsUnsub();
      stateUnsub();
    };
  }, [code, router, showCountdown]);

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
  useEffect(() => {
    if (!alibi?.accused_document) {
      setSanitizedDoc(null);
      return;
    }

    (async () => {
      const DOMPurify = await getDOMPurify();
      const sanitized = DOMPurify.sanitize(alibi.accused_document, {
        ALLOWED_TAGS: ['strong', 'em', 'b', 'i', 'u', 'br', 'p', 'span', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4'],
        ALLOWED_ATTR: ['class', 'style']
      });
      setSanitizedDoc(sanitized);
    })();
  }, [alibi?.accused_document]);

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

  return (
    <div className="game-screen">
      {/* Animated Background */}
      <div className="animated-background" />

      {/* Header Fixe */}
      <header className="game-header">
        <div className="header-content">
          <div className="header-title">{alibi?.title || "Alibi"}</div>

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
            <h1 className="game-title">
              {myTeam === "suspects" ? "🎭 Mémorise ton Alibi" : "🕵️ Prépare tes Questions"}
            </h1>
            <p className="phase-subtitle">
              {myTeam === "suspects"
                ? "Tu n'auras plus accès à ce texte pendant l'interrogatoire !"
                : "Les suspects vont devoir défendre cet alibi"}
            </p>
          </motion.div>

          {/* Contrôles Hôte */}
          {isHost && timeLeft > 0 && (
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

          {/* Vue SUSPECTS */}
          {myTeam === "suspects" && alibi && (
            <motion.div
              className={`alibi-card ${isPaused ? 'paused' : ''}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div className="card-glow" />

              {alibi.isNewFormat ? (
                <div className="alibi-content">
                  {/* Contexte / Accusation */}
                  <div className="accusation-box">
                    <div className="accusation-header">
                      <span className="accusation-icon">⚠️</span>
                      <span className="accusation-label">Accusation</span>
                    </div>
                    <p className="accusation-text">{alibi.context}</p>
                  </div>

                  {/* Document de l'accusé */}
                  <div className="document-box">
                    {renderHTML()}
                  </div>
                </div>
              ) : (
                <div className="alibi-content">
                  <div className="document-box">
                    <div className="scenario-text">
                      {parseMarkdown(alibi.scenario)}
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
          )}

          {/* Vue INSPECTEURS */}
          {myTeam === "inspectors" && alibi && (
            <div className="inspector-section">
              {/* Contexte */}
              <motion.div
                className="context-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="card-glow inspector" />
                <h2 className="section-title">📋 Contexte</h2>

                {alibi.isNewFormat ? (
                  <div className="context-content">
                    <div className="accusation-box inspector">
                      <div className="accusation-header">
                        <span className="accusation-icon">⚠️</span>
                        <span className="accusation-label">Accusation</span>
                      </div>
                      <p className="accusation-text">{alibi.context}</p>
                    </div>
                    <p className="inspector-summary">{alibi.inspector_summary}</p>
                  </div>
                ) : (
                  <div className="scenario-text small">
                    {parseMarkdown(alibi.scenario)}
                  </div>
                )}
              </motion.div>

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

          {/* Aucune équipe */}
          {!myTeam && (
            <motion.div
              className="no-team-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p>Tu n'es assigné à aucune équipe...</p>
            </motion.div>
          )}
        </div>
      </main>


      <AlibiPhaseTransition
        isVisible={showCountdown}
        title="L'enquête commence"
        subtitle="Les inspecteurs vont vous questionner..."
        type="interrogation"
        onComplete={handleCountdownComplete}
        duration={3500}
      />

      <style jsx>{`
        /* ===== GAME SCREEN LAYOUT (Style Guide Section 6.1) ===== */
        .game-screen {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary, #0a0a0f);
        }

        /* Animated Background (Style Guide Section 7.1) */
        .animated-background {
          position: fixed;
          inset: 0;
          z-index: -1;
          background:
            radial-gradient(ellipse at 20% 80%, rgba(245, 158, 11, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(251, 191, 36, 0.10) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(180, 83, 9, 0.08) 0%, transparent 60%),
            #0a0a0f;
          pointer-events: none;
        }

        /* ===== HEADER ===== */
        .game-header {
          flex-shrink: 0;
          position: relative;
          z-index: 10;
          background: rgba(10, 10, 15, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(245, 158, 11, 0.2);
          padding-top: 0;
        }

        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 16px;
        }

        .header-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.875rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.7);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .timer-section {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pause-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: #fbbf24;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .timer-display {
          font-family: 'Roboto Mono', monospace;
          font-size: 1.25rem;
          font-weight: 700;
          color: #fbbf24;
          text-shadow: 0 0 20px rgba(251, 191, 36, 0.5);
        }

        .timer-display.paused {
          opacity: 0.5;
          animation: blink 1s ease-in-out infinite;
        }

        .timer-display.urgent {
          color: #ef4444;
          text-shadow: 0 0 20px rgba(239, 68, 68, 0.6);
          animation: urgency-pulse 0.5s ease-in-out infinite;
        }

        /* Progress Bar (Style Guide Section 4.4) */
        .progress-bar {
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #f59e0b, #fbbf24);
          position: relative;
          border-radius: 0 2px 2px 0;
        }

        .progress-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
          animation: shimmer 2s infinite;
        }

        .progress-fill.urgent {
          background: linear-gradient(90deg, #ef4444, #f59e0b);
        }

        @keyframes shimmer {
          100% { left: 100%; }
        }

        /* ===== MAIN CONTENT ===== */
        .prep-content {
          flex: 1;
          position: relative;
          z-index: 1;
          padding: 12px;
          padding-bottom: calc(12px + env(safe-area-inset-bottom));
          overflow: hidden;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }

        .prep-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
          min-height: 0;
          overflow: hidden;
        }

        /* ===== PHASE HEADER ===== */
        :global(.phase-header) {
          text-align: center;
          flex-shrink: 0;
        }

        /* Game Title (Style Guide Section 3) */
        :global(.game-title) {
          font-family: 'Bungee', cursive;
          font-size: clamp(1.125rem, 4vw, 1.5rem);
          color: #ffffff;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          text-shadow:
            0 0 10px rgba(251, 191, 36, 0.5),
            0 0 20px rgba(251, 191, 36, 0.3),
            0 0 40px rgba(245, 158, 11, 0.2);
          margin: 0 0 4px 0;
        }

        :global(.phase-subtitle) {
          font-family: 'Inter', sans-serif;
          font-size: 0.8125rem;
          color: rgba(255, 255, 255, 0.6);
          margin: 0;
        }

        /* ===== HOST CONTROLS ===== */
        :global(.host-controls) {
          display: flex;
          justify-content: center;
          flex-shrink: 0;
        }

        :global(.btn-skip) {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border: none;
          border-radius: 12px;
          color: white;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          cursor: pointer;
          box-shadow:
            0 4px 15px rgba(245, 158, 11, 0.4),
            0 0 30px rgba(245, 158, 11, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* ===== CARDS ===== */
        :global(.alibi-card),
        :global(.context-card),
        :global(.questions-card),
        :global(.custom-questions-card),
        :global(.no-team-card) {
          position: relative;
          background: rgba(20, 20, 30, 0.8);
          border-radius: 16px;
          padding: 16px;
          border: 1px solid rgba(245, 158, 11, 0.25);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          flex-shrink: 0;
          overflow: hidden;
          box-shadow:
            0 4px 20px rgba(0, 0, 0, 0.3),
            0 0 0 1px rgba(255, 255, 255, 0.05);
        }

        /* Carte principale scrollable (suspects) */
        :global(.alibi-card) {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          padding: 12px;
        }

        /* Cartes inspecteurs - pas de flex-shrink pour permettre le scroll du parent */
        :global(.context-card),
        :global(.questions-card),
        :global(.custom-questions-card) {
          flex-shrink: 0;
        }

        /* Card Glow Effect - AMBRE unifié */
        :global(.card-glow),
        :global(.card-glow.inspector) {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(245, 158, 11, 0.08) 0%, transparent 50%);
          animation: glow-pulse 4s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes glow-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }

        /* Section Title - AMBRE unifié */
        :global(.section-title) {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1rem;
          font-weight: 700;
          color: #fbbf24;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin: 0 0 12px 0;
          position: relative;
          z-index: 1;
        }

        /* ===== ALIBI CONTENT ===== */
        :global(.alibi-content) {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex: 1;
          min-height: 0;
          overflow: hidden;
          transition: filter 0.3s ease;
        }

        :global(.accusation-box) {
          position: relative;
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05));
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 12px;
          padding: 12px 14px;
          flex-shrink: 0;
          box-shadow:
            0 4px 16px rgba(245, 158, 11, 0.15),
            0 0 0 1px rgba(255, 255, 255, 0.03),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
          overflow: hidden;
        }

        /* Glow effect subtil */
        :global(.accusation-box::before) {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, transparent 50%);
          animation: glow-pulse 4s ease-in-out infinite;
          pointer-events: none;
        }

        :global(.accusation-box.inspector) {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(245, 158, 11, 0.04));
        }

        :global(.accusation-header) {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        :global(.accusation-icon) {
          font-size: 1.125rem;
          filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.5));
        }

        :global(.accusation-label) {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.7rem;
          font-weight: 700;
          color: #fbbf24;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          text-shadow: 0 0 10px rgba(251, 191, 36, 0.4);
        }

        :global(.accusation-text) {
          position: relative;
          z-index: 1;
          font-family: 'Inter', sans-serif;
          font-size: 0.9375rem;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.9);
          margin: 0;
        }

        :global(.document-box) {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 10px;
          border: 1px solid rgba(245, 158, 11, 0.1);
        }

        :global(.scenario-text) {
          font-family: 'Inter', sans-serif;
          font-size: 0.9375rem;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.9);
          white-space: pre-wrap;
        }

        :global(.scenario-text.small) {
          font-size: 0.875rem;
          line-height: 1.6;
        }

        /* Prose styling */
        :global(.alibi-prose) {
          font-family: 'Inter', sans-serif;
          font-size: 0.9375rem;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.9);
        }

        :global(.alibi-prose strong),
        :global(.alibi-prose b) {
          color: #fbbf24;
          font-weight: 700;
        }

        :global(.text-alibi-glow) {
          color: #fbbf24;
          text-shadow: 0 0 10px rgba(251, 191, 36, 0.5);
        }

        /* ===== INSPECTOR SECTION ===== */
        :global(.inspector-section) {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
        }

        :global(.context-content) {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        :global(.inspector-summary) {
          font-family: 'Inter', sans-serif;
          font-size: 0.875rem;
          font-style: italic;
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
          position: relative;
          z-index: 1;
        }

        /* Questions List */
        :global(.questions-list) {
          position: relative;
          z-index: 1;
          list-style: decimal;
          padding-left: 24px;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        :global(.questions-list li) {
          font-family: 'Inter', sans-serif;
          font-size: 0.875rem;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.85);
        }

        /* Custom Questions */
        :global(.custom-hint) {
          font-family: 'Inter', sans-serif;
          font-size: 0.8125rem;
          color: rgba(255, 255, 255, 0.6);
          margin: 0 0 12px 0;
          position: relative;
          z-index: 1;
        }

        :global(.custom-inputs) {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        :global(.input-group) {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        :global(.input-group label) {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.75rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* Game Input - AMBRE unifié */
        :global(.game-input) {
          width: 100%;
          padding: 14px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(245, 158, 11, 0.2);
          border-radius: 12px;
          color: #ffffff;
          font-family: 'Inter', sans-serif;
          font-size: 0.9375rem;
          transition: all 0.3s ease;
        }

        :global(.game-input:focus) {
          outline: none;
          border-color: #f59e0b;
          background: rgba(245, 158, 11, 0.1);
          box-shadow:
            0 0 0 4px rgba(245, 158, 11, 0.15),
            0 0 20px rgba(245, 158, 11, 0.1);
        }

        :global(.game-input::placeholder) {
          color: rgba(255, 255, 255, 0.4);
        }

        /* No Team Card */
        :global(.no-team-card) {
          text-align: center;
        }

        :global(.no-team-card p) {
          font-family: 'Inter', sans-serif;
          font-size: 0.9375rem;
          color: rgba(255, 255, 255, 0.5);
          margin: 0;
        }

        /* ===== PAUSE BLUR OVERLAY (sur carte alibi) ===== */
        :global(.alibi-card.paused .alibi-content),
        :global(.alibi-card.paused .card-glow) {
          filter: blur(12px);
          pointer-events: none;
          user-select: none;
        }

        :global(.pause-blur-overlay) {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          background: rgba(10, 10, 15, 0.4);
          border-radius: 16px;
        }

        :global(.pause-label) {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 24px 40px;
          background: rgba(245, 158, 11, 0.15);
          border: 2px solid rgba(245, 158, 11, 0.4);
          border-radius: 20px;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow:
            0 0 40px rgba(245, 158, 11, 0.3),
            0 8px 32px rgba(0, 0, 0, 0.4);
        }

        :global(.pause-label) svg {
          color: #fbbf24;
          filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.6));
        }

        :global(.pause-label span) {
          font-family: 'Bungee', cursive;
          font-size: 1.5rem;
          color: #fbbf24;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          text-shadow:
            0 0 10px rgba(251, 191, 36, 0.5),
            0 0 20px rgba(251, 191, 36, 0.3);
        }

        /* ===== ANIMATIONS ===== */
        @keyframes blink {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        @keyframes urgency-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 480px) {
          :global(.game-title) {
            font-size: 1.125rem;
          }

          .prep-content {
            padding: 10px;
          }

          :global(.alibi-card),
          :global(.context-card),
          :global(.questions-card),
          :global(.custom-questions-card) {
            padding: 12px;
          }
        }
      `}</style>
    </div>
  );
}
