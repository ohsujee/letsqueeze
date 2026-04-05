'use client';

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { GameLaunchCountdown } from '@/components/transitions/GameLaunchCountdown';
import { GameEndTransition } from '@/components/transitions/GameEndTransition';
import AskerTransition from '@/components/game/AskerTransition';

const GAMES = [
  { id: 'quiz', label: 'Quiz', color: '#8b5cf6' },
  { id: 'deeztest', label: 'BlindTest', color: '#A238FF' },
  { id: 'alibi', label: 'Alibi', color: '#f59e0b' },
  { id: 'laregle', label: 'La Règle', color: '#06b6d4' },
  { id: 'mime', label: 'Mime', color: '#34d399' },
];

export default function TransitionsPreview() {
  const [activeTransition, setActiveTransition] = useState(null);
  const [selectedGame, setSelectedGame] = useState('quiz');
  const [showAsker, setShowAsker] = useState(false);
  const [askerConfig, setAskerConfig] = useState({ isMe: false, hasTeam: false });

  const game = GAMES.find(g => g.id === selectedGame);

  return (
    <div style={{
      flex: 1, minHeight: 0, background: '#04060f',
      fontFamily: "'Space Grotesk', sans-serif",
      display: 'flex', flexDirection: 'column', padding: '20px',
    }}>
      <a href="/dev" style={{ color: '#6b6b8a', textDecoration: 'none', fontSize: '0.8rem', marginBottom: '16px' }}>
        &larr; Dev Studio
      </a>

      <h1 style={{ fontFamily: 'Bungee, sans-serif', fontSize: '1.3rem', color: '#eef2ff', margin: '0 0 8px' }}>
        Transitions Preview
      </h1>
      <p style={{ color: '#6b6b8a', fontSize: '0.8rem', margin: '0 0 24px' }}>
        Teste toutes les transitions du jeu
      </p>

      {/* Game selector */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {GAMES.map(g => (
          <button
            key={g.id}
            onClick={() => setSelectedGame(g.id)}
            style={{
              padding: '8px 14px',
              background: selectedGame === g.id ? g.color : '#222240',
              border: 'none',
              borderBottom: selectedGame === g.id ? `3px solid ${darken(g.color)}` : '3px solid #1a1a35',
              borderRadius: '10px',
              color: '#fff',
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Transition buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button
          onClick={() => setActiveTransition('countdown')}
          style={btnStyle(game.color)}
        >
          🎯 Countdown 3-2-1-GO!
        </button>

        <button
          onClick={() => setActiveTransition('end')}
          style={btnStyle(game.color)}
        >
          🏆 Fin de partie (Calcul des scores)
        </button>

        <button
          onClick={() => { setAskerConfig({ isMe: false, hasTeam: false }); setShowAsker(true); }}
          style={btnStyle(game.color)}
        >
          🎤 Asker — Autre joueur (solo)
        </button>

        <button
          onClick={() => { setAskerConfig({ isMe: true, hasTeam: false }); setShowAsker(true); }}
          style={btnStyle(game.color)}
        >
          🎤 Asker — C'est mon tour (solo)
        </button>

        <button
          onClick={() => { setAskerConfig({ isMe: false, hasTeam: true }); setShowAsker(true); }}
          style={btnStyle(game.color)}
        >
          🎤 Asker — Autre joueur (équipes)
        </button>

        <button
          onClick={() => { setAskerConfig({ isMe: true, hasTeam: true }); setShowAsker(true); }}
          style={btnStyle(game.color)}
        >
          🎤 Asker — C'est mon tour (équipes)
        </button>
      </div>

      {/* Active transitions */}
      <AnimatePresence>
        {activeTransition === 'countdown' && (
          <GameLaunchCountdown
            gameColor={game.color}
            onComplete={() => setActiveTransition(null)}
          />
        )}
        {activeTransition === 'end' && (
          <GameEndTransition
            variant={selectedGame}
            onComplete={() => setActiveTransition(null)}
          />
        )}
      </AnimatePresence>

      <AskerTransition
        show={showAsker}
        asker={{
          uid: 'test',
          name: 'Alice',
          ...(askerConfig.hasTeam ? { teamName: 'Équipe Rouge', teamColor: '#E84466' } : {}),
        }}
        isMe={askerConfig.isMe}
        onComplete={() => setShowAsker(false)}
        duration={2500}
        game={selectedGame === 'deeztest' ? 'blindtest' : selectedGame}
        themeColor={game.color}
      />
    </div>
  );
}

function btnStyle(color) {
  return {
    padding: '14px 20px',
    background: '#222240',
    border: 'none',
    borderBottom: '3px solid #1a1a35',
    borderRadius: '12px',
    color: '#fff',
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '0.85rem',
    fontWeight: 700,
    cursor: 'pointer',
    textAlign: 'left',
  };
}

function darken(hex) {
  const color = hex.replace('#', '');
  const r = Math.max(0, parseInt(color.slice(0, 2), 16) - 40);
  const g = Math.max(0, parseInt(color.slice(2, 4), 16) - 40);
  const b = Math.max(0, parseInt(color.slice(4, 6), 16) - 40);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
