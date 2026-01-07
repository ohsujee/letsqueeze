"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  auth,
  db,
  ref,
  onValue,
  update,
  onAuthStateChanged,
} from "@/lib/firebase";
import { motion } from 'framer-motion';
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { useToast } from "@/lib/hooks/useToast";
import { Clock, Send, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { TROUVE_COLORS } from "@/data/trouveregle-rules";

const CYAN_PRIMARY = TROUVE_COLORS.primary;
const CYAN_LIGHT = TROUVE_COLORS.light;

export default function TrouveRegleInvestigatePage() {
  const { code } = useParams();
  const router = useRouter();
  const toast = useToast();

  const [meta, setMeta] = useState(null);
  const [state, setState] = useState(null);
  const [myUid, setMyUid] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [guessInput, setGuessInput] = useState('');

  const { players } = usePlayers({ roomCode: code, roomPrefix: 'rooms_trouveregle' });

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setMyUid(user?.uid || null);
    });
    return () => unsub();
  }, []);

  const isHost = myUid && meta?.hostUid === myUid;
  const myPlayer = players.find(p => p.uid === myUid);

  // Room guard
  useRoomGuard({
    roomCode: code,
    roomPrefix: 'rooms_trouveregle',
    playerUid: myUid,
    isHost: false
  });

  // DB listeners
  useEffect(() => {
    if (!code) return;

    const metaUnsub = onValue(ref(db, `rooms_trouveregle/${code}/meta`), (snap) => {
      const m = snap.val();
      if (m && !m.closed) {
        setMeta(m);
      }
    });

    const stateUnsub = onValue(ref(db, `rooms_trouveregle/${code}/state`), (snap) => {
      const s = snap.val();
      setState(s);

      // Redirect on phase changes
      if (s?.phase === 'lobby') {
        router.push(`/trouveregle/room/${code}`);
      } else if (s?.phase === 'ended') {
        router.push(`/trouveregle/game/${code}/end`);
      }
    });

    return () => {
      metaUnsub();
      stateUnsub();
    };
  }, [code, router]);

  // Timer countdown
  useEffect(() => {
    if (!state?.timerEndAt) return;

    const tick = () => {
      const remaining = Math.max(0, Math.floor((state.timerEndAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [state?.timerEndAt]);

  // Submit guess
  const handleSubmitGuess = async () => {
    if (!guessInput.trim() || state?.phase !== 'playing') return;

    const newGuesses = [...(state.guesses || []), guessInput.trim()];

    await update(ref(db, `rooms_trouveregle/${code}/state`), {
      phase: 'guessing',
      guesses: newGuesses,
      guessAttempts: newGuesses.length
    });

    setGuessInput('');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const attemptsLeft = 3 - (state?.guessAttempts || 0);
  const otherInvestigators = players.filter(p =>
    p.role === 'investigator' && p.uid !== myUid
  );
  const gamePlayers = players.filter(p => p.role !== 'investigator');

  // Loading
  if (!meta || !state) {
    return (
      <div className="trouve-investigate">
        <div className="loading">
          <div className="spinner" />
          <p>Chargement...</p>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="trouve-investigate">
      {/* Header */}
      <header className="investigate-header">
        <div className="header-left">
          <span className="role-badge">🔍 Enquêteur</span>
        </div>
        {state.phase === 'playing' && (
          <div className={`timer ${timeLeft <= 30 ? 'warning' : ''} ${timeLeft <= 10 ? 'danger' : ''}`}>
            <Clock size={18} />
            <span>{formatTime(timeLeft)}</span>
          </div>
        )}
        <div className="header-right">
          <span className="attempts-badge">
            {attemptsLeft} essai{attemptsLeft !== 1 ? 's' : ''} restant{attemptsLeft !== 1 ? 's' : ''}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="investigate-main">
        {/* PHASE: CHOOSING (Waiting Room) */}
        {state.phase === 'choosing' && (
          <div className="waiting-phase">
            <div className="waiting-card">
              <div className="waiting-animation">
                <div className="waiting-circle" />
                <span className="waiting-icon">🔍</span>
              </div>
              <h2>Salle d'attente</h2>
              <p>Les joueurs choisissent une règle secrète...</p>

              <div className="waiting-tips">
                <h3>Pendant ce temps, prépare-toi !</h3>
                <ul>
                  <li>Tu pourras poser des questions aux joueurs</li>
                  <li>Observe leurs réponses et comportements</li>
                  <li>Tu auras 3 essais pour deviner la règle</li>
                </ul>
              </div>

              {otherInvestigators.length > 0 && (
                <div className="co-investigators">
                  <span className="co-label">Co-enquêteur{otherInvestigators.length > 1 ? 's' : ''} :</span>
                  <div className="co-names">
                    {otherInvestigators.map(p => (
                      <span key={p.uid} className="co-name">{p.name}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PHASE: PLAYING */}
        {state.phase === 'playing' && (
          <div className="playing-phase">
            <div className="instruction-card">
              <h2>🎭 Trouve la règle !</h2>
              <p>
                Les joueurs suivent une règle secrète dans leurs réponses.
                Pose des questions et observe pour la découvrir !
              </p>
            </div>

            <div className="players-section">
              <h3>Joueurs à interroger</h3>
              <div className="players-grid">
                {gamePlayers.map(player => (
                  <div key={player.uid} className="player-card">
                    <div className="player-avatar">
                      {player.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <span className="player-name">{player.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Previous guesses */}
            {state.guesses && state.guesses.length > 0 && (
              <div className="previous-guesses">
                <h3>Essais précédents</h3>
                <div className="guesses-list">
                  {state.guesses.map((guess, idx) => (
                    <div key={idx} className="guess-item wrong">
                      <XCircle size={16} />
                      <span>{guess}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Guess input */}
            <div className="guess-section">
              <h3>Proposer une réponse</h3>
              <div className="guess-input-row">
                <input
                  type="text"
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  placeholder="La règle est..."
                  className="guess-input"
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitGuess()}
                />
                <motion.button
                  className="guess-submit"
                  onClick={handleSubmitGuess}
                  disabled={!guessInput.trim() || attemptsLeft <= 0}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Send size={20} />
                </motion.button>
              </div>
              <p className="guess-hint">
                <AlertCircle size={14} />
                Décris la règle que tu penses avoir trouvée
              </p>
            </div>
          </div>
        )}

        {/* PHASE: GUESSING (Waiting for votes) */}
        {state.phase === 'guessing' && (
          <div className="guessing-phase">
            <div className="guess-pending">
              <div className="pending-icon">🤔</div>
              <h2>Ta proposition :</h2>
              <div className="guess-box">
                <p>"{state.guesses?.[state.guesses.length - 1]}"</p>
              </div>
              <div className="voting-status">
                <div className="spinner small" />
                <span>Les joueurs vérifient ta réponse...</span>
              </div>
            </div>
          </div>
        )}

        {/* PHASE: REVEAL */}
        {state.phase === 'reveal' && (
          <div className="reveal-phase">
            <div className={`reveal-result ${state.foundByInvestigators ? 'won' : 'lost'}`}>
              <span className="reveal-icon">
                {state.foundByInvestigators ? '🎉' : '😢'}
              </span>
              <h2>
                {state.foundByInvestigators
                  ? 'Bien joué ! Tu as trouvé !'
                  : 'Dommage ! La règle t\'a échappé...'}
              </h2>
            </div>

            <div className="reveal-rule">
              <span className="reveal-label">La règle était :</span>
              <p className="reveal-text">{state.currentRule?.text}</p>
            </div>

            {state.guesses && state.guesses.length > 0 && (
              <div className="your-guesses">
                <h3>Tes propositions :</h3>
                <div className="guesses-list">
                  {state.guesses.map((guess, idx) => (
                    <div
                      key={idx}
                      className={`guess-item ${
                        idx === state.guesses.length - 1 && state.foundByInvestigators
                          ? 'correct' : 'wrong'
                      }`}
                    >
                      {idx === state.guesses.length - 1 && state.foundByInvestigators
                        ? <CheckCircle size={16} />
                        : <XCircle size={16} />
                      }
                      <span>{guess}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="waiting-host">
              <div className="spinner small" />
              <span>En attente des résultats...</span>
            </div>
          </div>
        )}
      </main>

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
  .trouve-investigate {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--bg-primary, #0a0a0f);
  }

  .trouve-investigate::before {
    content: '';
    position: fixed;
    inset: 0;
    z-index: 0;
    background:
      radial-gradient(ellipse at 50% 0%, rgba(168, 85, 247, 0.15) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 80%, rgba(168, 85, 247, 0.08) 0%, transparent 50%),
      var(--bg-primary, #0a0a0f);
    pointer-events: none;
  }

  .loading {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    color: rgba(255, 255, 255, 0.6);
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(168, 85, 247, 0.2);
    border-top-color: #a855f7;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .spinner.small {
    width: 24px;
    height: 24px;
    border-width: 2px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Header */
  .investigate-header {
    position: relative;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: rgba(10, 10, 15, 0.9);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(168, 85, 247, 0.2);
  }

  .header-left, .header-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .role-badge {
    padding: 6px 12px;
    background: rgba(168, 85, 247, 0.2);
    border: 1px solid rgba(168, 85, 247, 0.3);
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 600;
    color: #c084fc;
  }

  .timer {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: rgba(168, 85, 247, 0.15);
    border: 1px solid rgba(168, 85, 247, 0.3);
    border-radius: 10px;
    font-family: var(--font-title, 'Bungee'), cursive;
    font-size: 1.2rem;
    color: #c084fc;
  }

  .timer.warning {
    background: rgba(251, 191, 36, 0.15);
    border-color: rgba(251, 191, 36, 0.3);
    color: #fbbf24;
  }

  .timer.danger {
    background: rgba(239, 68, 68, 0.15);
    border-color: rgba(239, 68, 68, 0.3);
    color: #f87171;
    animation: pulse 0.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  .attempts-badge {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.6);
  }

  /* Main */
  .investigate-main {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    position: relative;
    z-index: 1;
  }

  /* WAITING PHASE */
  .waiting-phase {
    max-width: 500px;
    margin: 0 auto;
  }

  .waiting-card {
    text-align: center;
    padding: 32px 24px;
    background: rgba(20, 20, 30, 0.8);
    border: 1px solid rgba(168, 85, 247, 0.25);
    border-radius: 16px;
  }

  .waiting-animation {
    position: relative;
    width: 100px;
    height: 100px;
    margin: 0 auto 20px;
  }

  .waiting-circle {
    position: absolute;
    inset: 0;
    border: 3px solid rgba(168, 85, 247, 0.2);
    border-top-color: #a855f7;
    border-radius: 50%;
    animation: spin 2s linear infinite;
  }

  .waiting-icon {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
  }

  .waiting-card h2 {
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 1.4rem;
    color: #ffffff;
    margin: 0 0 8px 0;
  }

  .waiting-card > p {
    color: rgba(255, 255, 255, 0.6);
    margin: 0 0 24px 0;
  }

  .waiting-tips {
    text-align: left;
    padding: 16px;
    background: rgba(168, 85, 247, 0.1);
    border-radius: 12px;
  }

  .waiting-tips h3 {
    font-size: 0.9rem;
    color: #c084fc;
    margin: 0 0 12px 0;
  }

  .waiting-tips ul {
    margin: 0;
    padding-left: 20px;
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.7);
  }

  .waiting-tips li {
    margin-bottom: 8px;
  }

  .co-investigators {
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .co-label {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .co-names {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-top: 8px;
  }

  .co-name {
    padding: 4px 12px;
    background: rgba(168, 85, 247, 0.2);
    border-radius: 6px;
    font-size: 0.85rem;
    color: #c084fc;
  }

  /* PLAYING PHASE */
  .playing-phase {
    max-width: 500px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .instruction-card {
    padding: 20px;
    background: rgba(168, 85, 247, 0.1);
    border: 1px solid rgba(168, 85, 247, 0.25);
    border-radius: 14px;
    text-align: center;
  }

  .instruction-card h2 {
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 1.3rem;
    color: #ffffff;
    margin: 0 0 8px 0;
  }

  .instruction-card p {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.7);
    margin: 0;
  }

  .players-section {
    background: rgba(20, 20, 30, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 14px;
    padding: 16px;
  }

  .players-section h3 {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.7);
    margin: 0 0 12px 0;
  }

  .players-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .player-card {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: rgba(6, 182, 212, 0.1);
    border: 1px solid rgba(6, 182, 212, 0.2);
    border-radius: 10px;
  }

  .player-avatar {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${CYAN_PRIMARY};
    border-radius: 50%;
    font-size: 0.8rem;
    font-weight: 700;
    color: #0a0a0f;
  }

  .player-name {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.9);
  }

  .previous-guesses {
    background: rgba(20, 20, 30, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 14px;
    padding: 16px;
  }

  .previous-guesses h3 {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.7);
    margin: 0 0 12px 0;
  }

  .guesses-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .guess-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 0.9rem;
  }

  .guess-item.wrong {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    color: #f87171;
  }

  .guess-item.correct {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.2);
    color: #4ade80;
  }

  .guess-section {
    background: rgba(20, 20, 30, 0.8);
    border: 1px solid rgba(168, 85, 247, 0.25);
    border-radius: 14px;
    padding: 16px;
  }

  .guess-section h3 {
    font-size: 0.9rem;
    color: #c084fc;
    margin: 0 0 12px 0;
  }

  .guess-input-row {
    display: flex;
    gap: 10px;
  }

  .guess-input {
    flex: 1;
    padding: 14px 16px;
    border: 1px solid rgba(168, 85, 247, 0.3);
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.3);
    color: #ffffff;
    font-size: 1rem;
    outline: none;
  }

  .guess-input:focus {
    border-color: #a855f7;
  }

  .guess-input::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  .guess-submit {
    width: 52px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 10px;
    background: linear-gradient(135deg, #c084fc, #a855f7);
    color: #0a0a0f;
    cursor: pointer;
  }

  .guess-submit:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .guess-hint {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 10px;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
  }

  /* GUESSING PHASE */
  .guessing-phase {
    max-width: 500px;
    margin: 0 auto;
  }

  .guess-pending {
    text-align: center;
    padding: 32px 24px;
    background: rgba(20, 20, 30, 0.8);
    border: 1px solid rgba(168, 85, 247, 0.25);
    border-radius: 16px;
  }

  .pending-icon {
    font-size: 3rem;
    margin-bottom: 16px;
  }

  .guess-pending h2 {
    font-size: 1.1rem;
    color: rgba(255, 255, 255, 0.8);
    margin: 0 0 16px 0;
  }

  .guess-box {
    padding: 16px 20px;
    background: rgba(168, 85, 247, 0.15);
    border: 1px solid rgba(168, 85, 247, 0.3);
    border-radius: 12px;
    margin-bottom: 20px;
  }

  .guess-box p {
    font-size: 1.1rem;
    font-style: italic;
    color: #ffffff;
    margin: 0;
  }

  .voting-status {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.9rem;
  }

  /* REVEAL PHASE */
  .reveal-phase {
    max-width: 500px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .reveal-result {
    text-align: center;
    padding: 24px;
    border-radius: 16px;
  }

  .reveal-result.won {
    background: rgba(34, 197, 94, 0.15);
    border: 2px solid rgba(34, 197, 94, 0.3);
  }

  .reveal-result.lost {
    background: rgba(239, 68, 68, 0.15);
    border: 2px solid rgba(239, 68, 68, 0.3);
  }

  .reveal-icon {
    font-size: 3rem;
    display: block;
    margin-bottom: 12px;
  }

  .reveal-result h2 {
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 1.2rem;
    color: #ffffff;
    margin: 0;
  }

  .reveal-rule {
    text-align: center;
    padding: 20px;
    background: rgba(6, 182, 212, 0.1);
    border: 1px solid rgba(6, 182, 212, 0.3);
    border-radius: 14px;
  }

  .reveal-label {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.6);
    text-transform: uppercase;
  }

  .reveal-text {
    font-size: 1.1rem;
    color: ${CYAN_LIGHT};
    margin: 8px 0 0 0;
  }

  .your-guesses {
    background: rgba(20, 20, 30, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 14px;
    padding: 16px;
  }

  .your-guesses h3 {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.7);
    margin: 0 0 12px 0;
  }

  .waiting-host {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 16px;
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.9rem;
  }
`;
