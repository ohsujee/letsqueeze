"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { db, ref, onValue } from "@/lib/firebase";
import { usePlayers } from "@/lib/hooks/usePlayers";
import Qr from "@/components/ui/Qr";
import QrModal from "@/lib/components/QrModal";

export default function SpectatorView() {
  const { code } = useParams();

  const [meta, setMeta] = useState(null);
  const [state, setState] = useState(null);
  const [quiz, setQuiz] = useState(null);

  // Centralized players hook
  const { players } = usePlayers({ roomCode: code, roomPrefix: 'rooms' });

  // DB listeners
  useEffect(() => {
    if (!code) return;

    const metaUnsub = onValue(ref(db, `rooms/${code}/meta`), (snap) => {
      setMeta(snap.val());
    });

    const stateUnsub = onValue(ref(db, `rooms/${code}/state`), (snap) => {
      setState(snap.val());
    });

    const quizUnsub = onValue(ref(db, `rooms/${code}/quiz`), (snap) => {
      setQuiz(snap.val());
    });

    return () => {
      metaUnsub();
      stateUnsub();
      quizUnsub();
    };
  }, [code]);

  // Données calculées
  const title = quiz?.title || (meta?.quizId?.replace(/-/g, " ")) || "Quiz";
  const total = quiz?.items?.length || 0;
  const qIndex = state?.currentIndex || 0;
  const progressLabel = total ? `Question ${Math.min(qIndex + 1, total)} / ${total}` : "";
  
  const joinUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/join?code=${code}` 
    : "";

  // Classements
  const playersSorted = useMemo(() => 
    players.slice().sort((a, b) => (b.score || 0) - (a.score || 0))
  , [players]);

  const teamsSorted = useMemo(() => {
    if (meta?.mode !== "équipes") return [];
    const teams = meta?.teams || {};
    return Object.keys(teams)
      .map(k => ({ id: k, ...teams[k] }))
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [meta?.teams, meta?.mode]);

  // Status du jeu
  const getGameStatus = () => {
    if (state?.phase === "ended") return "🏁 Partie terminée";
    if (state?.lockUid) {
      const playerName = players.find(p => p.uid === state.lockUid)?.name || "Un joueur";
      return `🔔 ${playerName} a buzzé !`;
    }
    if (state?.revealed) return "⚡ Question en cours...";
    return "⏳ En attente...";
  };

  return (
    <div className="spectator-view">
      {/* Header */}
      <header className="spectator-header">
        <div className="spectator-header-content">
          <div className="spectator-title">
            <h1>LET'S QUEEEZE</h1>
            <div className="spectator-subtitle">{title}</div>
          </div>
          
          <div className="spectator-qr">
            <QrModal text={joinUrl} buttonText="📱 Afficher QR Code" />
          </div>
          
          <div className="spectator-code">
            <div className="code-label">Code:</div>
            <div className="code-value">{code}</div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="spectator-main">
        <div className="spectator-columns">
          {/* Classement principal */}
          <div className="spectator-column">
            <h2 className="column-title">🏆 CLASSEMENT EN DIRECT</h2>
            
            {meta?.mode === "équipes" ? (
              <div className="ranking-list">
                {teamsSorted.slice(0, 8).map((team, i) => (
                  <div key={team.id} className="ranking-item team-item">
                    <div className="rank-number">{i + 1}</div>
                    <div 
                      className="team-name"
                      style={{ 
                        backgroundColor: team.color,
                        color: '#1E293B',
                        fontWeight: 'bold'
                      }}
                    >
                      {team.name}
                    </div>
                    <div className="score">{team.score || 0}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ranking-list">
                {playersSorted.slice(0, 8).map((player, i) => (
                  <div key={player.uid} className="ranking-item">
                    <div className="rank-number">{i + 1}</div>
                    <div className="player-name">{player.name}</div>
                    <div className="score">{player.score || 0}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info partie */}
          <div className="spectator-column">
            <h2 className="column-title">📊 INFORMATIONS</h2>
            
            <div className="info-grid">
              <div className="info-card">
                <div className="info-label">Progression</div>
                <div className="info-value">{progressLabel}</div>
              </div>
              
              <div className="info-card">
                <div className="info-label">Joueurs</div>
                <div className="info-value">{players.length}</div>
              </div>
              
              <div className="info-card">
                <div className="info-label">Mode</div>
                <div className="info-value">{meta?.mode || "Individuel"}</div>
              </div>
              
              <div className="info-card full-width">
                <div className="info-label">Status</div>
                <div className="info-value status">{getGameStatus()}</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        /* ===== Base Layout ===== */
        .spectator-view {
          flex: 1;
          min-height: 0;
          position: relative;
          width: 100%;
          display: flex;
          flex-direction: column;
          color: var(--text-primary, #ffffff);
          background: var(--bg-primary, #0a0a0f);
        }

        /* ===== Animated Background - Guide Compliant ===== */
        .spectator-view::before {
          content: '';
          position: fixed;
          inset: 0;
          z-index: 0;
          background:
            radial-gradient(ellipse at 20% 80%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(167, 139, 250, 0.10) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(139, 92, 246, 0.05) 0%, transparent 70%),
            var(--bg-primary, #0a0a0f);
          pointer-events: none;
        }

        /* ===== Header - Glassmorphism Style ===== */
        .spectator-header {
          position: relative;
          z-index: 10;
          background: rgba(20, 20, 30, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(139, 92, 246, 0.3);
          padding: 1.5rem 2rem;
          box-shadow:
            0 4px 30px rgba(0, 0, 0, 0.3),
            0 0 40px rgba(139, 92, 246, 0.1);
        }

        .spectator-header-content {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          max-width: 1200px;
          margin: 0 auto;
          gap: 2rem;
        }

        /* ===== Title with Glow - Guide Typography ===== */
        .spectator-title h1 {
          font-family: 'Bungee', cursive;
          font-size: clamp(1.75rem, 4vw, 2.5rem);
          color: var(--quiz-glow, #a78bfa);
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          text-shadow:
            0 0 10px rgba(167, 139, 250, 0.8),
            0 0 20px rgba(167, 139, 250, 0.5),
            0 0 40px rgba(139, 92, 246, 0.4);
        }

        .spectator-subtitle {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--text-secondary, rgba(255, 255, 255, 0.7));
          margin-top: 0.5rem;
          letter-spacing: 0.02em;
        }

        .spectator-qr {
          display: flex;
          justify-content: center;
        }

        .spectator-code {
          text-align: right;
        }

        .code-label {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-muted, rgba(255, 255, 255, 0.5));
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 0.5rem;
        }

        .code-value {
          font-family: 'Bungee', cursive;
          font-size: clamp(1.75rem, 4vw, 2.5rem);
          color: var(--quiz-primary, #8b5cf6);
          letter-spacing: 0.15em;
          text-shadow:
            0 0 10px rgba(139, 92, 246, 0.6),
            0 0 20px rgba(139, 92, 246, 0.4);
        }

        /* ===== Main Content Area ===== */
        .spectator-main {
          position: relative;
          z-index: 1;
          flex: 1;
          padding: 2rem;
          overflow: hidden;
        }

        .spectator-columns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          height: 100%;
          max-width: 1200px;
          margin: 0 auto;
        }

        /* ===== Card Columns - Glassmorphism ===== */
        .spectator-column {
          position: relative;
          background: rgba(20, 20, 30, 0.8);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 20px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.4),
            0 0 0 1px rgba(255, 255, 255, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Gradient border effect */
        .spectator-column::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 20px;
          padding: 1px;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.4), rgba(167, 139, 250, 0.2), rgba(139, 92, 246, 0.1));
          -webkit-mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
          mask-composite: exclude;
          pointer-events: none;
          opacity: 0.6;
        }

        .spectator-column:hover {
          box-shadow:
            0 12px 40px rgba(0, 0, 0, 0.5),
            0 0 50px rgba(139, 92, 246, 0.15);
        }

        .spectator-column:hover::before {
          opacity: 1;
        }

        /* ===== Column Title - Section Style ===== */
        .column-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--quiz-glow, #a78bfa);
          margin: 0 0 1.25rem 0;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          text-align: center;
          text-shadow: 0 0 15px rgba(167, 139, 250, 0.5);
        }

        /* ===== Ranking List ===== */
        .ranking-list {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          overflow-y: auto;
          padding-right: 4px;
        }

        /* Custom scrollbar */
        .ranking-list::-webkit-scrollbar {
          width: 4px;
        }

        .ranking-list::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 2px;
        }

        .ranking-list::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.4);
          border-radius: 2px;
        }

        /* ===== Player Card Style ===== */
        .ranking-item {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 12px;
          padding: 0.875rem 1rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: slide-in 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .ranking-item:hover {
          background: rgba(139, 92, 246, 0.1);
          border-color: rgba(139, 92, 246, 0.4);
          transform: translateX(4px);
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.2);
        }

        /* First 3 positions highlight */
        .ranking-item:nth-child(1) {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(251, 191, 36, 0.08));
          border-color: rgba(245, 158, 11, 0.3);
        }

        .ranking-item:nth-child(2) {
          background: linear-gradient(135deg, rgba(148, 163, 184, 0.12), rgba(203, 213, 225, 0.06));
          border-color: rgba(148, 163, 184, 0.3);
        }

        .ranking-item:nth-child(3) {
          background: linear-gradient(135deg, rgba(205, 127, 50, 0.12), rgba(180, 100, 30, 0.06));
          border-color: rgba(205, 127, 50, 0.3);
        }

        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .rank-number {
          font-family: 'Bungee', cursive;
          font-size: 1.375rem;
          min-width: 2.5rem;
          text-align: center;
        }

        .ranking-item:nth-child(1) .rank-number { color: #fbbf24; text-shadow: 0 0 10px rgba(251, 191, 36, 0.6); }
        .ranking-item:nth-child(2) .rank-number { color: #cbd5e1; text-shadow: 0 0 10px rgba(203, 213, 225, 0.5); }
        .ranking-item:nth-child(3) .rank-number { color: #cd7f32; text-shadow: 0 0 10px rgba(205, 127, 50, 0.5); }
        .ranking-item:nth-child(n+4) .rank-number { color: var(--quiz-glow, #a78bfa); }

        .player-name {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.0625rem;
          font-weight: 600;
          color: var(--text-primary, #ffffff);
        }

        .team-name {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.0625rem;
          font-weight: 700;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          text-align: center;
        }

        .score {
          font-family: 'Roboto Mono', monospace;
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--success, #22c55e);
          min-width: 3.5rem;
          text-align: right;
          text-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
        }

        /* ===== Info Grid ===== */
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          flex: 1;
          align-content: start;
        }

        /* ===== Info Cards - Glassmorphism ===== */
        .info-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 12px;
          padding: 1.25rem;
          text-align: center;
          transition: all 0.3s ease;
        }

        .info-card:hover {
          background: rgba(139, 92, 246, 0.08);
          border-color: rgba(139, 92, 246, 0.3);
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.15);
        }

        .info-card.full-width {
          grid-column: 1 / -1;
        }

        .info-label {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted, rgba(255, 255, 255, 0.5));
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .info-value {
          font-family: 'Bungee', cursive;
          font-size: 1.375rem;
          color: var(--quiz-glow, #a78bfa);
          text-shadow: 0 0 10px rgba(167, 139, 250, 0.4);
        }

        .info-value.status {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--alibi-glow, #fbbf24);
          text-shadow: 0 0 10px rgba(251, 191, 36, 0.4);
        }

        /* ===== Floating Glow Orbs (Decorative) ===== */
        .spectator-view::after {
          content: '';
          position: fixed;
          top: 20%;
          right: 10%;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%);
          filter: blur(60px);
          pointer-events: none;
          z-index: 0;
          animation: float 8s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }

        /* ===== Responsive - Tablet & Mobile ===== */
        @media (max-width: 1024px) {
          .spectator-header {
            padding: 1rem 1.5rem;
          }

          .spectator-header-content {
            grid-template-columns: 1fr;
            text-align: center;
            gap: 1rem;
          }

          .spectator-title {
            order: 1;
          }

          .spectator-qr {
            order: 3;
          }

          .spectator-code {
            order: 2;
            text-align: center;
          }

          .spectator-main {
            padding: 1.5rem;
          }

          .spectator-columns {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .spectator-column {
            max-height: 45vh;
          }

          .spectator-title h1 {
            font-size: 1.75rem;
          }

          .code-value {
            font-size: 1.75rem;
          }
        }

        /* ===== TV Optimization (16:9) ===== */
        @media (min-width: 1400px) {
          .spectator-view {
            max-height: calc(100vw * 9 / 16);
            margin: auto;
          }

          .spectator-title h1 {
            font-size: 2.75rem;
          }

          .code-value {
            font-size: 2.75rem;
          }

          .column-title {
            font-size: 1.5rem;
          }

          .ranking-item {
            padding: 1rem 1.25rem;
          }

          .rank-number {
            font-size: 1.5rem;
          }

          .player-name, .team-name {
            font-size: 1.25rem;
          }

          .score {
            font-size: 1.375rem;
          }
        }
      `}</style>
    </div>
  );
}
