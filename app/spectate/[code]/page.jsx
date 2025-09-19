"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { db, ref, onValue } from "@/lib/firebase";
import Qr from "@/components/Qr";

export default function SpectatorView() {
  const { code } = useParams();
  
  const [meta, setMeta] = useState(null);
  const [players, setPlayers] = useState([]);
  const [state, setState] = useState(null);
  const [quiz, setQuiz] = useState(null);

  // DB listeners
  useEffect(() => {
    if (!code) return;

    const metaUnsub = onValue(ref(db, `rooms/${code}/meta`), (snap) => {
      const m = snap.val();
      setMeta(m);
      if (m?.quizId) {
        fetch(`/data/${m.quizId}.json`)
          .then(r => r.json())
          .then(setQuiz)
          .catch(() => {});
      }
    });

    const playersUnsub = onValue(ref(db, `rooms/${code}/players`), (snap) => {
      const p = snap.val() || {};
      setPlayers(Object.values(p));
    });

    const stateUnsub = onValue(ref(db, `rooms/${code}/state`), (snap) => {
      setState(snap.val());
    });

    return () => {
      metaUnsub();
      playersUnsub();
      stateUnsub();
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
            <Qr text={joinUrl} size={150} />
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
        .spectator-view {
          width: 100vw;
          height: 100vh;
          background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-tertiary) 100%);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          color: var(--text-primary);
        }

        .spectator-header {
          background: rgba(30, 41, 59, 0.95);
          border-bottom: 3px solid var(--retro-blue);
          padding: 1.5rem;
          backdrop-filter: blur(10px);
        }

        .spectator-header-content {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          max-width: 1200px;
          margin: 0 auto;
          gap: 2rem;
        }

        .spectator-title h1 {
          font-size: 2.5rem;
          font-weight: 900;
          color: var(--retro-blue);
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 2px;
        }

        .spectator-subtitle {
          font-size: 1.25rem;
          font-weight: 600;
          opacity: 0.8;
          margin-top: 0.5rem;
        }

        .spectator-qr {
          display: flex;
          justify-content: center;
        }

        .spectator-code {
          text-align: right;
        }

        .code-label {
          font-size: 1rem;
          opacity: 0.7;
          margin-bottom: 0.5rem;
        }

        .code-value {
          font-size: 2.5rem;
          font-weight: 900;
          color: var(--retro-orange);
          letter-spacing: 4px;
        }

        .spectator-main {
          flex: 1;
          padding: 2rem;
          overflow: hidden;
        }

        .spectator-columns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3rem;
          height: 100%;
          max-width: 1200px;
          margin: 0 auto;
        }

        .spectator-column {
          background: rgba(30, 41, 59, 0.6);
          border: 2px solid var(--retro-blue);
          border-radius: var(--radius-lg);
          padding: 2rem;
          backdrop-filter: blur(8px);
          display: flex;
          flex-direction: column;
        }

        .column-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--retro-cyan);
          margin: 0 0 1.5rem 0;
          text-transform: uppercase;
          letter-spacing: 1px;
          text-align: center;
        }

        .ranking-list {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          overflow-y: auto;
        }

        .ranking-item {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 1rem;
          background: rgba(15, 23, 42, 0.7);
          border: 2px solid rgba(59, 130, 246, 0.3);
          border-radius: var(--radius-md);
          padding: 1rem;
          transition: all 0.2s ease;
        }

        .ranking-item:hover {
          border-color: var(--retro-blue);
          transform: translateY(-1px);
        }

        .rank-number {
          font-size: 1.5rem;
          font-weight: 900;
          color: var(--retro-orange);
          min-width: 2rem;
          text-align: center;
        }

        .player-name, .team-name {
          font-size: 1.125rem;
          font-weight: 700;
        }

        .team-name {
          padding: 0.5rem 1rem;
          border-radius: var(--radius-md);
          text-align: center;
        }

        .score {
          font-size: 1.25rem;
          font-weight: 900;
          color: var(--retro-green);
          min-width: 4rem;
          text-align: right;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          flex: 1;
        }

        .info-card {
          background: rgba(15, 23, 42, 0.7);
          border: 2px solid rgba(59, 130, 246, 0.3);
          border-radius: var(--radius-md);
          padding: 1.5rem;
          text-align: center;
        }

        .info-card.full-width {
          grid-column: 1 / -1;
        }

        .info-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .info-value {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--retro-blue);
        }

        .info-value.status {
          color: var(--retro-yellow);
          font-size: 1.25rem;
        }

        /* Responsive pour petits écrans */
        @media (max-width: 1024px) {
          .spectator-header-content {
            grid-template-columns: 1fr;
            text-align: center;
            gap: 1rem;
          }

          .spectator-code {
            text-align: center;
          }

          .spectator-columns {
            grid-template-columns: 1fr;
            gap: 2rem;
          }

          .spectator-title h1 {
            font-size: 2rem;
          }

          .code-value {
            font-size: 2rem;
          }
        }

        /* Optimisation TV (16:9) */
        @media (min-width: 1400px) {
          .spectator-view {
            max-height: calc(100vw * 9 / 16);
            margin: auto;
          }
        }
      `}</style>
    </div>
  );
}
