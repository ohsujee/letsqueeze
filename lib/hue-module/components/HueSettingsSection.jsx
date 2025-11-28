/**
 * HueSettingsSection Component
 * Section complète pour les réglages Hue dans la page Profil/Settings
 * Inclut : Connexion, Sélection des lampes, Config par jeu
 */

'use client';

import { useState, useEffect } from 'react';
import hueService from '../services/hueService';
import HueConnection from './HueConnection';
import HueLightSelector from './HueLightSelector';
import HueGameConfig, { GAME_EVENTS } from './HueGameConfig';

// Liste des jeux disponibles (à synchroniser avec GAME_EVENTS)
const AVAILABLE_GAMES = Object.keys(GAME_EVENTS);

export default function HueSettingsSection({ userEmail, adminEmail = 'yogarajah.sujeevan@gmail.com' }) {
  const [isConnected, setIsConnected] = useState(false);
  const [activeGame, setActiveGame] = useState(AVAILABLE_GAMES[0]);
  const [expandedSection, setExpandedSection] = useState('connection');

  // Vérifier si l'utilisateur est admin
  const isAdmin = userEmail === adminEmail;

  useEffect(() => {
    const config = hueService.getConfig();
    setIsConnected(config.isConnected);
  }, []);

  const handleConnectionChange = (connected) => {
    setIsConnected(connected);
    if (connected) {
      setExpandedSection('lights');
    }
  };

  // Si pas admin, ne pas afficher la section
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Philips Hue</h3>
            <p className="text-sm text-gray-400">Contrôle des lumières pendant le jeu</p>
          </div>
          <div className="ml-auto">
            {isConnected ? (
              <span className="px-3 py-1 bg-green-600/30 text-green-400 text-sm rounded-full">
                Connecté
              </span>
            ) : (
              <span className="px-3 py-1 bg-gray-600/30 text-gray-400 text-sm rounded-full">
                Non connecté
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Section Connexion */}
      <div className="border-b border-gray-700">
        <button
          onClick={() => setExpandedSection(expandedSection === 'connection' ? '' : 'connection')}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-700/30 transition-colors"
        >
          <span className="font-medium text-white">1. Connexion au Bridge</span>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${
              expandedSection === 'connection' ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {expandedSection === 'connection' && (
          <div className="px-4 pb-4">
            <HueConnection onConnectionChange={handleConnectionChange} />
          </div>
        )}
      </div>

      {/* Section Lampes */}
      <div className="border-b border-gray-700">
        <button
          onClick={() => isConnected && setExpandedSection(expandedSection === 'lights' ? '' : 'lights')}
          disabled={!isConnected}
          className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors ${
            isConnected ? 'hover:bg-gray-700/30' : 'opacity-50 cursor-not-allowed'
          }`}
        >
          <span className="font-medium text-white">2. Sélection des lampes</span>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${
              expandedSection === 'lights' ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {expandedSection === 'lights' && isConnected && (
          <div className="px-4 pb-4">
            <HueLightSelector />
          </div>
        )}
      </div>

      {/* Section Config par jeu */}
      <div>
        <button
          onClick={() => isConnected && setExpandedSection(expandedSection === 'games' ? '' : 'games')}
          disabled={!isConnected}
          className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors ${
            isConnected ? 'hover:bg-gray-700/30' : 'opacity-50 cursor-not-allowed'
          }`}
        >
          <span className="font-medium text-white">3. Configuration par jeu</span>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${
              expandedSection === 'games' ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {expandedSection === 'games' && isConnected && (
          <div className="px-4 pb-4 space-y-4">
            {/* Tabs des jeux */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {AVAILABLE_GAMES.map((gameId) => (
                <button
                  key={gameId}
                  onClick={() => setActiveGame(gameId)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeGame === gameId
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {GAME_EVENTS[gameId]?.name || gameId}
                </button>
              ))}
            </div>

            {/* Config du jeu sélectionné */}
            <HueGameConfig gameId={activeGame} />
          </div>
        )}
      </div>
    </div>
  );
}
