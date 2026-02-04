'use client';

import { useState } from 'react';
import { Eye, Trophy } from 'lucide-react';
import AlibiPartyEndScreen from '@/components/game-alibi/AlibiPartyEndScreen';
import AlibiSpectatorView from '@/components/game-alibi/AlibiSpectatorView';

// ===== MOCK DATA =====

// Pour AlibiPartyEndScreen
const MOCK_GROUPS = {
  group1: {
    name: 'Les Détectives',
    color: '#FF2D55',
    score: { correct: 8, total: 10 }
  },
  group2: {
    name: 'Team Rocket',
    color: '#00D4FF',
    score: { correct: 8, total: 10 }  // Égalité avec group1
  },
  group3: {
    name: 'Les Alibistes',
    color: '#50C832',
    score: { correct: 5, total: 10 }
  },
  group4: {
    name: 'Suspect Zero',
    color: '#FFB800',
    score: { correct: 3, total: 10 }
  }
};

// Pour AlibiSpectatorView
const MOCK_INSPECTOR_GROUP = {
  name: 'Les Détectives',
  color: '#FF2D55'
};

const MOCK_ACCUSED_GROUP = {
  name: 'Team Rocket',
  color: '#00D4FF',
  players: [
    { uid: 'p1', name: 'Alice' },
    { uid: 'p2', name: 'Bob' },
    { uid: 'p3', name: 'Charlie' },
    { uid: 'p4', name: 'Diana' },
    { uid: 'p5', name: 'Emile' },
    { uid: 'p6', name: 'Fiona' }
  ]
};

const MOCK_QUESTION = {
  text: 'Où étiez-vous exactement à 22h15 ?',
  hint: 'Le suspect prétend avoir été au restaurant'
};

const MOCK_INTERROGATION_STATES = {
  waiting: {
    state: 'waiting',
    responses: {},
    verdict: null
  },
  answering: {
    state: 'answering',
    responses: {
      p1: { uid: 'p1', name: 'Alice', answer: 'On était tous au restaurant Le Petit Bistrot.' },
      p2: { uid: 'p2', name: 'Bob', answer: 'Oui, au Petit Bistrot, on a mangé des pâtes.' }
    },
    verdict: null
  },
  answering_many: {
    state: 'answering',
    responses: {
      p1: { uid: 'p1', name: 'Alice', answer: 'On était tous au restaurant Le Petit Bistrot, celui qui est juste à côté de la gare. On y est arrivés vers 21h30 je crois.' },
      p2: { uid: 'p2', name: 'Bob', answer: 'Oui, au Petit Bistrot, on a mangé des pâtes carbonara et bu du vin rouge. Le serveur s\'appelait Marco.' },
      p3: { uid: 'p3', name: 'Charlie', answer: 'Exactement, Le Petit Bistrot ! J\'ai pris les lasagnes végétariennes, elles étaient délicieuses. On a bien rigolé ce soir-là.' },
      p4: { uid: 'p4', name: 'Diana', answer: 'Je confirme, on était tous ensemble au resto. J\'étais assise entre Alice et Emile. On a parlé du prochain voyage prévu.' },
      p5: { uid: 'p5', name: 'Emile', answer: 'Oui oui, le Petit Bistrot ! J\'ai commandé une pizza quatre fromages et une bière. On est partis vers 23h je dirais.' },
      p6: { uid: 'p6', name: 'Fiona', answer: 'C\'est ça, on était au restaurant italien près de la gare. J\'ai pris un tiramisu en dessert, il était super bon !' }
    },
    verdict: null
  },
  verdict_correct: {
    state: 'verdict',
    responses: {
      p1: { uid: 'p1', name: 'Alice', answer: 'On était tous au restaurant Le Petit Bistrot.' },
      p2: { uid: 'p2', name: 'Bob', answer: 'Oui, au Petit Bistrot, on a mangé des pâtes.' },
      p3: { uid: 'p3', name: 'Charlie', answer: 'Exactement, Le Petit Bistrot, pâtes carbonara!' }
    },
    verdict: 'correct'
  },
  verdict_incorrect: {
    state: 'verdict',
    responses: {
      p1: { uid: 'p1', name: 'Alice', answer: 'On était au cinéma.' },
      p2: { uid: 'p2', name: 'Bob', answer: 'Au restaurant je crois...' },
      p3: { uid: 'p3', name: 'Charlie', answer: 'Chez moi à regarder la télé.' }
    },
    verdict: 'incorrect'
  }
};

// ===== MAIN PAGE =====
export default function AlibiPartyViewsDevPage() {
  const [activeView, setActiveView] = useState('spectator');
  const [spectatorState, setSpectatorState] = useState('answering');
  const [myGroupId, setMyGroupId] = useState('group1');
  const [isHost, setIsHost] = useState(true);

  return (
    <div className="dev-page">
      <div className="animated-background" />

      {/* Controls */}
      <div className="dev-controls">
        {/* View Switcher */}
        <div className="control-section">
          <span className="control-label">Vue :</span>
          <div className="view-switcher">
            <button
              className={`switch-btn ${activeView === 'spectator' ? 'active' : ''}`}
              onClick={() => setActiveView('spectator')}
            >
              <Eye size={16} />
              Spectateur
            </button>
            <button
              className={`switch-btn ${activeView === 'end' ? 'active' : ''}`}
              onClick={() => setActiveView('end')}
            >
              <Trophy size={16} />
              Fin de Partie
            </button>
          </div>
        </div>

        {/* Spectator State Selector */}
        {activeView === 'spectator' && (
          <div className="control-section">
            <span className="control-label">État :</span>
            <div className="state-selector">
              {Object.keys(MOCK_INTERROGATION_STATES).map(state => (
                <button
                  key={state}
                  className={`state-btn ${spectatorState === state ? 'active' : ''}`}
                  onClick={() => setSpectatorState(state)}
                >
                  {state.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* End Screen Options */}
        {activeView === 'end' && (
          <>
            <div className="control-section">
              <span className="control-label">Mon groupe :</span>
              <select
                value={myGroupId}
                onChange={(e) => setMyGroupId(e.target.value)}
                className="select-input"
              >
                <option value="group1">Les Détectives (1er)</option>
                <option value="group2">Team Rocket (2ème)</option>
                <option value="group3">Les Alibistes (3ème)</option>
                <option value="group4">Suspect Zero (4ème)</option>
                <option value="">Aucun (spectateur pur)</option>
              </select>
            </div>
            <div className="control-section">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isHost}
                  onChange={(e) => setIsHost(e.target.checked)}
                />
                Je suis l'hôte
              </label>
            </div>
          </>
        )}
      </div>

      {/* Component Preview */}
      <div className="preview-container">
        {activeView === 'spectator' ? (
          <AlibiSpectatorView
            inspectorGroup={MOCK_INSPECTOR_GROUP}
            accusedGroup={MOCK_ACCUSED_GROUP}
            question={MOCK_QUESTION}
            interrogation={MOCK_INTERROGATION_STATES[spectatorState]}
            progress={{ current: 5, total: 10 }}
            timeLeft={spectatorState.startsWith('answering') ? 8 : 0}
            roundsUntilMyTurn={2}
          />
        ) : (
          <AlibiPartyEndScreen
            groups={MOCK_GROUPS}
            myGroupId={myGroupId || null}
            isHost={isHost}
            onNewGame={() => alert('Rejouer clicked!')}
            onGoHome={() => alert('Quitter clicked!')}
            hostPresent={true}
          />
        )}
      </div>

      <style jsx>{`
        .dev-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #0a0a0f;
        }

        .animated-background {
          position: fixed;
          inset: 0;
          z-index: -1;
          background:
            radial-gradient(ellipse at 20% 80%, rgba(245, 158, 11, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(251, 191, 36, 0.10) 0%, transparent 50%),
            #0a0a0f;
          pointer-events: none;
        }

        .dev-controls {
          position: sticky;
          top: 0;
          z-index: 100;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 16px;
          padding: 12px 16px;
          background: rgba(10, 10, 15, 0.95);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .control-section {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .control-label {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .view-switcher {
          display: flex;
          gap: 4px;
        }

        .switch-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.6);
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .switch-btn:hover {
          background: rgba(245, 158, 11, 0.1);
          border-color: rgba(245, 158, 11, 0.3);
        }

        .switch-btn.active {
          background: rgba(245, 158, 11, 0.2);
          border-color: #f59e0b;
          color: #fbbf24;
        }

        .state-selector {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .state-btn {
          padding: 6px 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.7rem;
          cursor: pointer;
          transition: all 0.2s;
          text-transform: capitalize;
        }

        .state-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .state-btn.active {
          background: rgba(139, 92, 246, 0.2);
          border-color: #8b5cf6;
          color: #a78bfa;
        }

        .select-input {
          padding: 6px 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 6px;
          color: white;
          font-size: 0.8rem;
          cursor: pointer;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
        }

        .checkbox-label input {
          accent-color: #f59e0b;
        }

        .preview-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          min-height: 0;
        }
      `}</style>
    </div>
  );
}
