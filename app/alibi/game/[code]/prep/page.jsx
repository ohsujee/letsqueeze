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
import DOMPurify from 'dompurify';
import ExitButton from "@/lib/components/ExitButton";
import { CountdownOverlay } from "@/components/shared/CountdownOverlay";
import { PhaseTransition } from "@/components/transitions/PhaseTransition";

export default function AlibiPrep() {
  const { code } = useParams();
  const router = useRouter();

  const [timeLeft, setTimeLeft] = useState(90);
  const [myTeam, setMyTeam] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [alibi, setAlibi] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [customQuestions, setCustomQuestions] = useState(["", "", ""]);
  const [showCountdown, setShowCountdown] = useState(false);
  const timerRef = useRef(null);

  // Fonction pour quitter et retourner au lobby
  async function exitGame() {
    if (isHost && code) {
      // Si c'est l'hôte, ramener tout le monde au lobby
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

  // Fonction appelée quand le countdown est terminé
  const handleCountdownComplete = () => {
    router.push(`/alibi/game/${code}/play`);
  };

  // Auth et récupération de l'équipe du joueur
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user && code) {
        // Récupérer l'équipe du joueur
        onValue(ref(db, `rooms_alibi/${code}/players/${user.uid}`), (snap) => {
          const player = snap.val();
          if (player) setMyTeam(player.team);
        });
        // Vérifier si c'est l'hôte
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
      // Initialiser les questions custom
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
      // Redirection vers le lobby si l'hôte quitte
      if (state?.phase === "lobby") {
        router.push(`/alibi/room/${code}`);
      }
    });

    return () => {
      alibiUnsub();
      questionsUnsub();
      stateUnsub();
    };
  }, [code, router]);

  // Timer countdown (seulement pour l'hôte)
  useEffect(() => {
    if (!isHost) return;

    if (timeLeft <= 0) {
      // Temps écoulé, passer à la phase interrogation
      if (timerRef.current) clearInterval(timerRef.current);
      update(ref(db, `rooms_alibi/${code}/state`), {
        phase: "interrogation",
        currentQuestion: 0
      });
      // Initialiser l'état de l'interrogation
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
  }, [timeLeft, code, isHost]);

  const handleSaveCustomQuestion = async (index, text) => {
    const questionId = 7 + index;
    await update(ref(db, `rooms_alibi/${code}/questions/${questionId}`), { text });
  };

  const handleSkipPrep = async () => {
    if (!isHost || !code) return;
    // Passer directement à la phase interrogation
    if (timerRef.current) clearInterval(timerRef.current);
    await update(ref(db, `rooms_alibi/${code}/state`), {
      phase: "interrogation",
      currentQuestion: 0,
      prepTimeLeft: 0
    });
    // Initialiser l'état de l'interrogation
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

  // Fonction pour parser le markdown basique (texte en gras avec **)
  const parseMarkdown = (text) => {
    if (!text) return "";
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-yellow-300 font-bold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  // Fonction pour afficher du HTML (nouveau format) - SANITIZED contre XSS
  const renderHTML = (html) => {
    if (!html) return null;
    // Sanitize HTML pour prévenir les attaques XSS
    const sanitizedHTML = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['strong', 'em', 'b', 'i', 'u', 'br', 'p', 'span', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4'],
      ALLOWED_ATTR: ['class', 'style']
    });
    return (
      <div
        dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
        className="prose prose-invert max-w-none"
        style={{
          // Style pour les éléments en gras dans le HTML
          '--tw-prose-bold': '#fde047', // text-yellow-300
        }}
      />
    );
  };

  return (
    <div className="alibi-theme">
      {/* Header Fixe */}
      <header className="player-game-header">
        <div className="player-game-header-content">
          <div className="player-game-title">{alibi?.title || "Alibi"}</div>
          <div className="player-progress-center">
            {timeLeft > 10 ? "⏱️" : "⚠️"} {formatTime(timeLeft)}
          </div>
          <div className="player-header-exit">
            <ExitButton
              variant="header"
              confirmMessage="Voulez-vous vraiment quitter ? Tout le monde retournera au lobby."
              onExit={exitGame}
            />
          </div>
        </div>
      </header>

      {/* Contenu avec padding-top */}
      <main className="player-game-content">
        <div className="game-container">
          <div className="game-content p-6 max-w-4xl mx-auto space-y-6 min-h-screen" style={{paddingBottom: '100px'}}>
            {/* Info préparation */}
            <motion.div
              className="card text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <p className="game-label opacity-80">Phase de préparation</p>
              {timeLeft <= 10 && (
                <p className="text-red-400 font-bold mt-2 animate-pulse">
                  L'interrogatoire va commencer !
                </p>
              )}
            </motion.div>

            {/* Bouton Skip pour l'hôte */}
            {isHost && timeLeft > 0 && (
              <motion.div
                className="card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
              >
                <button
                  className="btn btn-secondary w-full h-12 text-base"
                  onClick={handleSkipPrep}
                >
                  ⏭️ Passer directement aux questions (Dev/Test)
                </button>
                <p className="text-xs text-center opacity-60 mt-2">
                  Raccourci pour les tests - Saute la phase de préparation
                </p>
              </motion.div>
            )}

      {/* Vue SUSPECTS : Alibi à mémoriser */}
      {myTeam === "suspects" && alibi && (
        <motion.div
          className="card space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: 1,
            y: 0,
            boxShadow: [
              '0 4px 12px rgba(0, 0, 0, 0.2)',
              '0 4px 30px rgba(99, 102, 241, 0.3)',
              '0 4px 12px rgba(0, 0, 0, 0.2)'
            ]
          }}
          transition={{
            delay: 0.2,
            duration: 0.5,
            boxShadow: {
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="game-section-title text-primary">🎭 Ton Alibi</h2>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                fontSize: 'var(--font-size-xs)',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: '#6366F1',
                letterSpacing: 'var(--letter-spacing-wide)'
              }}
            >
              À mémoriser
            </motion.div>
          </div>
          <motion.p
            className="text-sm opacity-70"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            ⚠️ Mémorise bien tous les détails - tu n'auras plus accès à ce texte pendant l'interrogatoire !
          </motion.p>

          {alibi.isNewFormat ? (
            // Nouveau format : Context + Accused Document
            <div className="space-y-4">
              <motion.div
                className="bg-slate-700/50 rounded-xl border-l-4 border-primary mb-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                style={{
                  padding: 'var(--space-5)',
                  boxShadow: 'var(--shadow-md)'
                }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl">⚠️</span>
                  <p className="text-xs uppercase tracking-wider opacity-60 font-bold">Accusation</p>
                </div>
                <p className="text-base leading-relaxed font-medium opacity-95" style={{ lineHeight: '1.7' }}>
                  {alibi.context}
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.8 }}
                style={{
                  padding: 'var(--space-6)',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(59, 130, 246, 0.05))',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid rgba(99, 102, 241, 0.2)'
                }}
              >
                {renderHTML(alibi.accused_document)}
              </motion.div>
            </div>
          ) : (
            // Ancien format : Scenario avec markdown
            <motion.div
              className="prose prose-invert max-w-none"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              <div
                className="whitespace-pre-wrap leading-relaxed"
                style={{
                  padding: 'var(--space-6)',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(59, 130, 246, 0.05))',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid rgba(99, 102, 241, 0.2)'
                }}
              >
                {parseMarkdown(alibi.scenario)}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Vue INSPECTEURS : Contexte + Questions */}
      {myTeam === "inspectors" && (
        <div className="space-y-6">
          <motion.div
            className="card space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h2 className="game-section-title text-accent">🕵️ Contexte de l'alibi</h2>
            <p className="text-sm opacity-70">
              Les suspects vont devoir défendre cet alibi. Prépare tes questions !
            </p>
            {alibi && (
              alibi.isNewFormat ? (
                // Nouveau format : Context + Inspector Summary
                <div className="space-y-4">
                  <div className="bg-slate-700/50 rounded-xl border-l-4 border-accent mb-4" style={{
                    padding: 'var(--space-5)',
                    boxShadow: 'var(--shadow-md)'
                  }}>
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-2xl">⚠️</span>
                      <p className="text-xs uppercase tracking-wider opacity-60 font-bold">Accusation</p>
                    </div>
                    <p className="text-base leading-relaxed font-medium opacity-95" style={{ lineHeight: '1.7' }}>
                      {alibi.context}
                    </p>
                  </div>
                  <p className="text-sm opacity-80 italic">{alibi.inspector_summary}</p>
                </div>
              ) : (
                // Ancien format : Scenario complet
                <div className="prose prose-invert max-w-none">
                  <div className="whitespace-pre-wrap leading-relaxed text-sm opacity-90">
                    {parseMarkdown(alibi.scenario)}
                  </div>
                </div>
              )
            )}
          </motion.div>

          <motion.div
            className="card space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <h2 className="game-section-title">
              Questions prédéfinies ({alibi?.isNewFormat ? '10' : '7'})
            </h2>
            <ol className="space-y-2 list-decimal list-inside">
              {questions.slice(0, alibi?.isNewFormat ? 10 : 7).map((q, i) => (
                <li key={i} className="text-sm opacity-90">{q.text}</li>
              ))}
            </ol>
          </motion.div>

          {/* Questions personnalisées seulement pour l'ancien format */}
          {!alibi?.isNewFormat && (
            <motion.div
              className="card space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <h2 className="game-section-title">Questions personnalisées (3)</h2>
              <p className="text-sm opacity-70">
                Ajoute 3 questions basées sur l'alibi pour piéger les suspects !
              </p>
              <div className="space-y-3">
                {[0, 1, 2].map((index) => (
                  <div key={index}>
                    <label className="block text-sm font-bold mb-1 opacity-80">
                      Question {8 + index}
                    </label>
                    <input
                      type="text"
                      className="game-input game-input-accent"
                      placeholder="Ex: Quelle était la couleur exacte du café que vous avez commandé ?"
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

      {/* Aucune équipe assignée */}
      {!myTeam && (
        <motion.div
          className="card text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <p className="opacity-70">Tu n'es assigné à aucune équipe...</p>
        </motion.div>
      )}
          </div>
        </div>
      </main>

      <PhaseTransition
        isVisible={showCountdown}
        title="Interrogatoire"
        subtitle="Les inspecteurs vont vous questionner..."
        icon="🕵️"
        theme="interrogation"
        onComplete={handleCountdownComplete}
        duration={3500}
      />

      <style jsx>{`
        /* ===== ALIBI PREP PAGE - Guide UI Compliant ===== */

        /* Alibi Theme Variables */
        .alibi-theme {
          --alibi-primary: #f59e0b;
          --alibi-glow: #fbbf24;
          --alibi-dark: #b45309;
          --bg-primary: #0a0a0f;
          --bg-secondary: #12121a;
          --bg-card: rgba(20, 20, 30, 0.8);
          --text-primary: #ffffff;
          --text-secondary: rgba(255, 255, 255, 0.7);
          --text-muted: rgba(255, 255, 255, 0.5);
        }

        .game-container {
          position: relative;
          min-height: 100dvh;
          background: var(--bg-primary);
          overflow: hidden;
        }

        /* Animated Background - Alibi Theme (Amber/Gold) */
        .game-container::before {
          content: '';
          position: fixed;
          inset: 0;
          z-index: 0;
          background:
            radial-gradient(ellipse at 20% 80%, rgba(245, 158, 11, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(251, 191, 36, 0.10) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(180, 83, 9, 0.08) 0%, transparent 60%),
            var(--bg-primary);
          pointer-events: none;
        }

        .game-content {
          position: relative;
          z-index: 1;
        }

        /* Header - Guide Compliant */
        .player-game-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(10, 10, 15, 0.9);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(245, 158, 11, 0.15);
          padding: 12px 16px;
        }

        .player-game-header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 800px;
          margin: 0 auto;
        }

        .player-game-title {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .player-progress-center {
          font-family: var(--font-mono, 'Roboto Mono'), monospace;
          font-size: 1rem;
          font-weight: 700;
          color: var(--alibi-glow);
          text-shadow: 0 0 10px rgba(245, 158, 11, 0.5);
        }

        .player-header-exit {
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .player-header-exit:hover {
          opacity: 1;
        }

        /* Main Content */
        .player-game-content {
          position: relative;
          z-index: 1;
          padding-top: 60px;
        }

        /* Cards - Glassmorphism Alibi */
        .alibi-theme :global(.card) {
          background: rgba(20, 20, 30, 0.8);
          border-radius: 16px;
          padding: 1.25rem;
          border: 1px solid rgba(245, 158, 11, 0.15);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow:
            0 4px 20px rgba(0, 0, 0, 0.4),
            0 0 0 1px rgba(255, 255, 255, 0.03),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .alibi-theme :global(.card:hover) {
          border-color: rgba(245, 158, 11, 0.25);
          box-shadow:
            0 8px 30px rgba(0, 0, 0, 0.5),
            0 0 20px rgba(245, 158, 11, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        /* Section Titles - Guide Compliant */
        .alibi-theme :global(.game-section-title) {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-primary);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          text-shadow: 0 0 15px rgba(245, 158, 11, 0.3);
        }

        .alibi-theme :global(.game-section-title.text-primary) {
          color: var(--alibi-glow);
        }

        .alibi-theme :global(.game-section-title.text-accent) {
          color: #60a5fa;
        }

        /* Labels */
        .alibi-theme :global(.game-label) {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* Buttons - Alibi Theme */
        .alibi-theme :global(.btn) {
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 12px 24px;
          color: var(--text-primary);
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .alibi-theme :global(.btn:hover) {
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
        }

        .alibi-theme :global(.btn:active) {
          transform: translateY(1px) scale(0.98);
        }

        .alibi-theme :global(.btn-secondary) {
          background: rgba(245, 158, 11, 0.1);
          border: 2px solid rgba(245, 158, 11, 0.3);
          color: var(--alibi-glow);
        }

        .alibi-theme :global(.btn-secondary:hover) {
          background: rgba(245, 158, 11, 0.2);
          border-color: rgba(245, 158, 11, 0.5);
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.2);
        }

        /* Inputs - Alibi Accent */
        .alibi-theme :global(.game-input) {
          width: 100%;
          padding: 14px 18px;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: var(--text-primary);
          font-family: 'Inter', sans-serif;
          font-size: 1rem;
          letter-spacing: 0.02em;
          transition: all 0.3s ease;
        }

        .alibi-theme :global(.game-input:focus) {
          outline: none;
          border-color: var(--alibi-primary);
          background: rgba(245, 158, 11, 0.08);
          box-shadow:
            0 0 0 4px rgba(245, 158, 11, 0.15),
            0 0 20px rgba(245, 158, 11, 0.1);
        }

        .alibi-theme :global(.game-input::placeholder) {
          color: var(--text-muted);
        }

        .alibi-theme :global(.game-input-accent) {
          border-color: rgba(245, 158, 11, 0.2);
        }

        .alibi-theme :global(.game-input-accent:focus) {
          border-color: var(--alibi-glow);
          box-shadow:
            0 0 0 4px rgba(251, 191, 36, 0.2),
            0 0 25px rgba(251, 191, 36, 0.15);
        }

        /* Prose styling for alibi content */
        .alibi-theme :global(.prose) {
          color: var(--text-primary);
        }

        .alibi-theme :global(.prose strong) {
          color: var(--alibi-glow);
          font-weight: 700;
        }

        /* Animation pulsante pour les alertes */
        @keyframes alibi-pulse {
          0%, 100% {
            box-shadow: 0 0 20px rgba(245, 158, 11, 0.3);
          }
          50% {
            box-shadow: 0 0 40px rgba(245, 158, 11, 0.5);
          }
        }

        /* Animation de flottement */
        @keyframes alibi-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }

        /* Urgence animation */
        .alibi-theme :global(.animate-pulse) {
          animation: alibi-pulse 2s ease-in-out infinite;
        }

        /* Text glow effect */
        .alibi-theme :global(.text-yellow-300) {
          color: var(--alibi-glow) !important;
          text-shadow: 0 0 10px rgba(251, 191, 36, 0.5);
        }
      `}</style>
    </div>
  );
}
