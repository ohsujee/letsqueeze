/**
 * HueLightSelector Component
 * Sélection des lampes à utiliser pour le jeu
 */

'use client';

import { useState, useEffect } from 'react';
import hueService from '../services/hueService';

export default function HueLightSelector({ onSelectionChange }) {
  const [lights, setLights] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedLights, setSelectedLights] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('lights'); // 'lights' ou 'groups'

  useEffect(() => {
    loadLightsAndGroups();
  }, []);

  const loadLightsAndGroups = async () => {
    setIsLoading(true);
    const [lightsData, groupsData] = await Promise.all([
      hueService.getLights(),
      hueService.getGroups()
    ]);
    setLights(lightsData);
    setGroups(groupsData.filter(g => g.type === 'Room' || g.type === 'Zone'));
    
    // Charger la sélection existante
    const config = hueService.getConfig();
    setSelectedLights(config.selectedLights || []);
    
    setIsLoading(false);
  };

  const toggleLight = (lightId) => {
    const newSelection = selectedLights.includes(lightId)
      ? selectedLights.filter(id => id !== lightId)
      : [...selectedLights, lightId];
    
    setSelectedLights(newSelection);
    hueService.setSelectedLights(newSelection);
    if (onSelectionChange) onSelectionChange(newSelection);
  };

  const selectGroup = (group) => {
    const newSelection = [...new Set([...selectedLights, ...group.lights])];
    setSelectedLights(newSelection);
    hueService.setSelectedLights(newSelection);
    if (onSelectionChange) onSelectionChange(newSelection);
  };

  const selectAll = () => {
    const allIds = lights.map(l => l.id);
    setSelectedLights(allIds);
    hueService.setSelectedLights(allIds);
    if (onSelectionChange) onSelectionChange(allIds);
  };

  const deselectAll = () => {
    setSelectedLights([]);
    hueService.setSelectedLights([]);
    if (onSelectionChange) onSelectionChange([]);
  };

  const testSelectedLights = async () => {
    // Flash blanc rapide sur les lampes sélectionnées
    await hueService.setAllLightsState({
      on: true,
      hue: 0,
      sat: 0,
      bri: 254,
      transitiontime: 0
    });
    
    setTimeout(async () => {
      await hueService.setAllLightsState({
        on: true,
        hue: 46920,
        sat: 254,
        bri: 200,
        transitiontime: 5
      });
    }, 300);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header avec compteur et actions */}
      <div className="flex items-center justify-between">
        <p className="text-gray-300">
          <span className="text-white font-medium">{selectedLights.length}</span> lampe{selectedLights.length !== 1 ? 's' : ''} sélectionnée{selectedLights.length !== 1 ? 's' : ''}
        </p>
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
          >
            Tout
          </button>
          <button
            onClick={deselectAll}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
          >
            Aucun
          </button>
          {selectedLights.length > 0 && (
            <button
              onClick={testSelectedLights}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              Tester
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('lights')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'lights'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Lampes ({lights.length})
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'groups'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Pièces ({groups.length})
        </button>
      </div>

      {/* Liste des lampes */}
      {activeTab === 'lights' && (
        <div className="grid gap-2 max-h-64 overflow-y-auto">
          {lights.map((light) => (
            <button
              key={light.id}
              onClick={() => toggleLight(light.id)}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                selectedLights.includes(light.id)
                  ? 'bg-blue-600/30 border border-blue-500'
                  : 'bg-gray-700/50 border border-gray-600 hover:border-gray-500'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  selectedLights.includes(light.id)
                    ? 'border-blue-400 bg-blue-400'
                    : 'border-gray-500'
                }`}
              >
                {selectedLights.includes(light.id) && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="flex-1 text-left">
                <p className="text-white font-medium">{light.name}</p>
                <p className="text-gray-400 text-xs">{light.type}</p>
              </div>
              <div
                className={`w-3 h-3 rounded-full ${light.state.on ? 'bg-yellow-400' : 'bg-gray-600'}`}
              />
            </button>
          ))}
        </div>
      )}

      {/* Liste des groupes/pièces */}
      {activeTab === 'groups' && (
        <div className="grid gap-2 max-h-64 overflow-y-auto">
          {groups.map((group) => {
            const allSelected = group.lights.every(id => selectedLights.includes(id));
            const someSelected = group.lights.some(id => selectedLights.includes(id));
            
            return (
              <button
                key={group.id}
                onClick={() => selectGroup(group)}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                  allSelected
                    ? 'bg-blue-600/30 border border-blue-500'
                    : someSelected
                    ? 'bg-blue-600/10 border border-blue-500/50'
                    : 'bg-gray-700/50 border border-gray-600 hover:border-gray-500'
                }`}
              >
                <div className="flex-1 text-left">
                  <p className="text-white font-medium">{group.name}</p>
                  <p className="text-gray-400 text-xs">{group.lights.length} lampe{group.lights.length !== 1 ? 's' : ''}</p>
                </div>
                <span className="text-blue-400 text-sm">
                  + Ajouter
                </span>
              </button>
            );
          })}
        </div>
      )}

      {lights.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <p>Aucune lampe trouvée</p>
          <p className="text-sm mt-1">Vérifiez que vos lampes sont connectées au bridge</p>
        </div>
      )}
    </div>
  );
}
