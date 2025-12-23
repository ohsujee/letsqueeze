/**
 * HueGameConfig Component
 * Configuration des scénarios lumineux par jeu
 */

'use client';

import { useState, useEffect } from 'react';
import hueScenariosService from '../services/hueScenariosService';

// Définition des événements par jeu
// À personnaliser selon les jeux de ton projet
const GAME_EVENTS = {
  alibi: {
    name: 'Alibi',
    events: [
      { id: 'ambiance', name: 'Ambiance globale', description: 'Ambiance de fond pendant le jeu' },
      { id: 'roundStart', name: 'Début interrogatoire', description: 'Après la lecture des alibis' },
      { id: 'goodAnswer', name: 'Bonne réponse', description: 'Quand le joueur trouve la bonne réponse' },
      { id: 'badAnswer', name: 'Mauvaise réponse', description: 'Quand le joueur se trompe' },
      { id: 'timeUp', name: 'Temps écoulé', description: 'Quand le temps est écoulé' },
      { id: 'victory', name: 'Fin - Bon score', description: 'À la fin si bon score' },
      { id: 'defeat', name: 'Fin - Mauvais score', description: 'À la fin si mauvais score' }
    ]
  },
  gigglz: {
    name: "Gigglz Quiz",
    events: [
      { id: 'ambiance', name: 'Ambiance globale', description: 'Ambiance de fond pendant le quiz' },
      { id: 'roundStart', name: 'Nouvelle question', description: 'Quand une question est révélée' },
      { id: 'buzz', name: 'Buzz', description: 'Quand un joueur buzze' },
      { id: 'goodAnswer', name: 'Bonne réponse', description: 'Réponse correcte' },
      { id: 'badAnswer', name: 'Mauvaise réponse', description: 'Réponse incorrecte' },
      { id: 'timeUp', name: 'Temps écoulé', description: 'Quand le compteur arrive à zéro' },
      { id: 'victory', name: 'Victoire', description: 'Fin de partie - célébration' }
    ]
  }
  // Ajouter d'autres jeux ici
};

export default function HueGameConfig({ gameId }) {
  const [config, setConfig] = useState({});
  const [availableScenarios, setAvailableScenarios] = useState([]);
  const [testingEvent, setTestingEvent] = useState(null);

  const gameDefinition = GAME_EVENTS[gameId];

  useEffect(() => {
    setAvailableScenarios(hueScenariosService.getAvailableScenarios());
    loadConfig();
  }, [gameId]);

  const loadConfig = () => {
    const gameConfig = hueScenariosService.getGameConfig(gameId);
    setConfig(gameConfig.events || {});
  };

  const handleScenarioChange = (eventId, scenarioId) => {
    const currentConfig = config[eventId] || {};
    hueScenariosService.setGameEventMapping(
      gameId,
      eventId,
      scenarioId,
      currentConfig.enabled !== false
    );
    loadConfig();
  };

  const handleToggle = (eventId) => {
    const currentConfig = config[eventId] || {};
    hueScenariosService.toggleGameEvent(
      gameId,
      eventId,
      currentConfig.enabled === false
    );
    loadConfig();
  };

  const handleTest = async (eventId) => {
    const eventConfig = config[eventId];
    if (!eventConfig?.scenarioId) return;
    
    setTestingEvent(eventId);
    await hueScenariosService.testScenario(eventConfig.scenarioId);
    setTestingEvent(null);
  };

  const initializeDefaults = () => {
    // Initialiser avec des scénarios par défaut
    const defaults = {
      ambiance: 'ambiance',
      roundStart: 'roundStart',
      goodAnswer: 'goodAnswer',
      badAnswer: 'badAnswer',
      timeUp: 'timeUp',
      victory: 'victory',
      defeat: 'defeat',
      buzz: 'buzz'
    };

    gameDefinition.events.forEach(event => {
      if (defaults[event.id]) {
        hueScenariosService.setGameEventMapping(gameId, event.id, defaults[event.id], true);
      }
    });
    loadConfig();
  };

  if (!gameDefinition) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>Jeu non configuré</p>
      </div>
    );
  }

  const hasAnyConfig = Object.keys(config).length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium text-white">{gameDefinition.name}</h4>
        {!hasAnyConfig && (
          <button
            onClick={initializeDefaults}
            className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Initialiser par défaut
          </button>
        )}
      </div>

      {/* Liste des événements */}
      <div className="space-y-3">
        {gameDefinition.events.map((event) => {
          const eventConfig = config[event.id] || {};
          const isEnabled = eventConfig.enabled !== false && eventConfig.scenarioId;
          
          return (
            <div
              key={event.id}
              className={`p-4 rounded-lg border transition-all ${
                isEnabled
                  ? 'bg-gray-700/50 border-gray-600'
                  : 'bg-gray-800/30 border-gray-700 opacity-60'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Toggle */}
                <button
                  onClick={() => handleToggle(event.id)}
                  className={`mt-1 w-10 h-6 rounded-full transition-colors relative ${
                    isEnabled ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      isEnabled ? 'left-5' : 'left-1'
                    }`}
                  />
                </button>

                {/* Info */}
                <div className="flex-1">
                  <p className="text-white font-medium">{event.name}</p>
                  <p className="text-gray-400 text-sm">{event.description}</p>
                  
                  {/* Sélection du scénario */}
                  <div className="mt-2 flex gap-2">
                    <select
                      value={eventConfig.scenarioId || ''}
                      onChange={(e) => handleScenarioChange(event.id, e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Sélectionner un effet</option>
                      {availableScenarios.map((scenario) => (
                        <option key={scenario.id} value={scenario.id}>
                          {scenario.name}
                        </option>
                      ))}
                    </select>
                    
                    {eventConfig.scenarioId && (
                      <button
                        onClick={() => handleTest(event.id)}
                        disabled={testingEvent === event.id}
                        className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white text-sm rounded transition-colors"
                      >
                        {testingEvent === event.id ? '...' : 'Test'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Export des définitions de jeux pour pouvoir les étendre
export { GAME_EVENTS };
