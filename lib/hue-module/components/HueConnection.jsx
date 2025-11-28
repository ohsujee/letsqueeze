/**
 * HueConnection Component
 * Interface de connexion au bridge Philips Hue
 */

'use client';

import { useState, useEffect } from 'react';
import hueService from '../services/hueService';

export default function HueConnection({ onConnectionChange }) {
  const [bridges, setBridges] = useState([]);
  const [selectedBridge, setSelectedBridge] = useState('');
  const [manualIp, setManualIp] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showManualInput, setShowManualInput] = useState(false);

  useEffect(() => {
    // Vérifier si déjà connecté
    const config = hueService.getConfig();
    setIsConnected(config.isConnected);
    if (config.isConnected && onConnectionChange) {
      onConnectionChange(true);
    }
  }, []);

  const handleDiscover = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const found = await hueService.discoverBridges();
      setBridges(found);
      if (found.length === 0) {
        setError('Aucun bridge trouvé. Vérifiez que votre bridge est allumé et connecté au même réseau.');
        setShowManualInput(true);
      } else if (found.length === 1) {
        setSelectedBridge(found[0].ip);
      }
    } catch (err) {
      setError('Erreur lors de la recherche des bridges');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    const ip = showManualInput ? manualIp : selectedBridge;
    if (!ip) {
      setError('Veuillez sélectionner ou entrer l\'IP du bridge');
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await hueService.connectToBridge(ip);

    if (result.success) {
      setIsConnected(true);
      if (onConnectionChange) onConnectionChange(true);
    } else {
      setError(result.message);
    }

    setIsLoading(false);
  };

  const handleDisconnect = () => {
    hueService.disconnect();
    setIsConnected(false);
    setBridges([]);
    setSelectedBridge('');
    setManualIp('');
    if (onConnectionChange) onConnectionChange(false);
  };

  if (isConnected) {
    const config = hueService.getConfig();
    return (
      <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <div>
              <p className="text-green-400 font-medium">Bridge Hue connecté</p>
              <p className="text-green-400/60 text-sm">{config.bridgeIp}</p>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
          >
            Déconnecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-3 h-3 bg-gray-500 rounded-full" />
        <p className="text-gray-400">Non connecté</p>
      </div>

      {/* Découverte automatique */}
      <div className="space-y-3">
        <button
          onClick={handleDiscover}
          disabled={isLoading}
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Recherche...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Rechercher les bridges
            </>
          )}
        </button>

        {/* Liste des bridges trouvés */}
        {bridges.length > 0 && (
          <select
            value={selectedBridge}
            onChange={(e) => setSelectedBridge(e.target.value)}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Sélectionner un bridge</option>
            {bridges.map((bridge) => (
              <option key={bridge.id} value={bridge.ip}>
                {bridge.ip} ({bridge.id})
              </option>
            ))}
          </select>
        )}

        {/* Toggle IP manuelle */}
        <button
          onClick={() => setShowManualInput(!showManualInput)}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          {showManualInput ? 'Masquer la saisie manuelle' : 'Entrer l\'IP manuellement'}
        </button>

        {/* Saisie IP manuelle */}
        {showManualInput && (
          <input
            type="text"
            value={manualIp}
            onChange={(e) => setManualIp(e.target.value)}
            placeholder="192.168.1.xxx"
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
        )}
      </div>

      {/* Bouton connexion */}
      {(selectedBridge || manualIp) && (
        <div className="space-y-3">
          <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-3">
            <p className="text-yellow-400 text-sm">
              👆 Appuyez sur le bouton central de votre bridge Hue, puis cliquez sur "Connecter"
            </p>
          </div>
          
          <button
            onClick={handleConnect}
            disabled={isLoading}
            className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
          >
            {isLoading ? 'Connexion...' : 'Connecter'}
          </button>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
