'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { onAuthStateChanged, auth } from '@/lib/firebase';
import {
  ChevronLeft, Lightbulb, Wifi, WifiOff, Check, Play,
  Settings2, Zap, Palette, RefreshCw, Search, X
} from 'lucide-react';
import hueService from '@/lib/hue-module/services/hueService';
import hueScenariosService, { COLORS } from '@/lib/hue-module/services/hueScenariosService';
import { GAME_EVENTS } from '@/lib/hue-module/components/HueGameConfig';

const ADMIN_EMAIL = 'yogarajah.sujeevan@gmail.com';

// Couleurs prédéfinies pour le sélecteur
const COLOR_PRESETS = [
  { id: 'red', name: 'Rouge', hue: 0, sat: 254, color: '#FF0000' },
  { id: 'orange', name: 'Orange', hue: 6000, sat: 254, color: '#FF6600' },
  { id: 'yellow', name: 'Jaune', hue: 12750, sat: 254, color: '#FFCC00' },
  { id: 'green', name: 'Vert', hue: 25500, sat: 254, color: '#00FF00' },
  { id: 'cyan', name: 'Cyan', hue: 35000, sat: 254, color: '#00FFFF' },
  { id: 'blue', name: 'Bleu', hue: 46920, sat: 254, color: '#0066FF' },
  { id: 'purple', name: 'Violet', hue: 50000, sat: 254, color: '#9900FF' },
  { id: 'pink', name: 'Rose', hue: 56100, sat: 254, color: '#FF00FF' },
  { id: 'white', name: 'Blanc', hue: 0, sat: 0, color: '#FFFFFF' },
  { id: 'warm', name: 'Blanc chaud', hue: 8000, sat: 140, color: '#FFE4B5' },
];

// Effets disponibles
const EFFECT_TYPES = [
  { id: 'solid', name: 'Couleur fixe', description: 'Une couleur stable' },
  { id: 'flash', name: 'Flash', description: 'Flash rapide puis retour' },
  { id: 'pulse', name: 'Pulsation', description: 'Effet de pulsation' },
  { id: 'rainbow', name: 'Arc-en-ciel', description: 'Cycle de couleurs' },
];

export default function HueSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('connection');

  // Connection state
  const [bridges, setBridges] = useState([]);
  const [selectedBridge, setSelectedBridge] = useState('');
  const [manualIp, setManualIp] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [showManualInput, setShowManualInput] = useState(false);

  // Lights state
  const [lights, setLights] = useState([]);
  const [selectedLights, setSelectedLights] = useState([]);
  const [loadingLights, setLoadingLights] = useState(false);

  // Room/Group state
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null); // null = toutes les lampes

  // Games config state
  const [activeGame, setActiveGame] = useState('alibi');
  const [gameConfigs, setGameConfigs] = useState({});
  const [editingEvent, setEditingEvent] = useState(null);
  const [testingScenario, setTestingScenario] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      } else if (currentUser.email !== ADMIN_EMAIL) {
        router.push('/profile');
      } else {
        setUser(currentUser);
        setLoading(false);
        loadHueConfig();
      }
    });
    return () => unsubscribe();
  }, [router]);

  const loadHueConfig = () => {
    const config = hueService.getConfig();
    setIsConnected(config.isConnected);
    setSelectedLights(config.selectedLights || []);

    // Load game configs
    const configs = {};
    Object.keys(GAME_EVENTS).forEach(gameId => {
      configs[gameId] = hueScenariosService.getGameConfig(gameId);
    });
    setGameConfigs(configs);

    if (config.isConnected) {
      loadLights();
    }
  };

  const loadLights = async () => {
    setLoadingLights(true);
    const [lightsData, groupsData] = await Promise.all([
      hueService.getLights(),
      hueService.getGroups()
    ]);
    setLights(lightsData);
    // Filtrer pour n'avoir que les pièces (Room) et zones
    setGroups(groupsData.filter(g => g.type === 'Room' || g.type === 'Zone'));
    setLoadingLights(false);
  };

  // Lampes filtrées par pièce sélectionnée
  const filteredLights = selectedGroup
    ? lights.filter(l => {
        const group = groups.find(g => g.id === selectedGroup);
        return group?.lights?.includes(l.id);
      })
    : lights;

  const handleDiscover = async () => {
    setIsSearching(true);
    setConnectionError(null);
    const found = await hueService.discoverBridges();
    setBridges(found);
    if (found.length === 0) {
      setConnectionError('Aucun bridge trouvé. Vérifiez que vous êtes sur le même réseau WiFi.');
      setShowManualInput(true);
    } else if (found.length === 1) {
      setSelectedBridge(found[0].ip);
    }
    setIsSearching(false);
  };

  const handleConnect = async () => {
    const ip = showManualInput ? manualIp : selectedBridge;
    if (!ip) return;

    setIsSearching(true);
    setConnectionError(null);

    const result = await hueService.connectToBridge(ip);

    if (result.success) {
      setIsConnected(true);
      loadLights();
      setActiveTab('lights');
    } else {
      setConnectionError(result.message);
    }
    setIsSearching(false);
  };

  const handleDisconnect = () => {
    hueService.disconnect();
    setIsConnected(false);
    setBridges([]);
    setSelectedBridge('');
    setLights([]);
    setSelectedLights([]);
  };

  const toggleLight = (lightId) => {
    const newSelection = selectedLights.includes(lightId)
      ? selectedLights.filter(id => id !== lightId)
      : [...selectedLights, lightId];
    setSelectedLights(newSelection);
    hueService.setSelectedLights(newSelection);
  };

  const selectAllLights = () => {
    // Sélectionner toutes les lampes de la pièce filtrée
    const allIds = filteredLights.map(l => l.id);
    setSelectedLights(allIds);
    hueService.setSelectedLights(allIds);
  };

  const deselectAllLights = () => {
    setSelectedLights([]);
    hueService.setSelectedLights([]);
  };

  const testLights = async () => {
    // Sauvegarder l'état actuel
    await hueService.saveCurrentState();

    // Flash blanc pour tester les lampes sélectionnées
    await hueService.setAllLightsState({ on: true, hue: 0, sat: 0, bri: 254, transitiontime: 0 });

    // Restaurer après 1.5s
    setTimeout(async () => {
      await hueService.restoreState();
    }, 1500);
  };

  const testColor = async (colorPreset) => {
    // Sauvegarder l'état actuel
    await hueService.saveCurrentState();

    // Teste la couleur sur les lampes sélectionnées uniquement
    await hueService.setAllLightsState({
      on: true,
      hue: colorPreset.hue,
      sat: colorPreset.sat,
      bri: 254,
      transitiontime: 2
    });

    // Restaurer après 2s
    setTimeout(async () => {
      await hueService.restoreState();
    }, 2000);
  };

  const saveEventConfig = (gameId, eventId, config) => {
    // Save to localStorage via the service
    if (typeof window !== 'undefined') {
      const stored = JSON.parse(localStorage.getItem('hue_event_configs') || '{}');
      if (!stored[gameId]) stored[gameId] = {};
      stored[gameId][eventId] = config;
      localStorage.setItem('hue_event_configs', JSON.stringify(stored));
    }

    // Update local state
    setGameConfigs(prev => ({
      ...prev,
      [gameId]: {
        ...prev[gameId],
        events: {
          ...prev[gameId]?.events,
          [eventId]: config
        }
      }
    }));
  };

  const getEventConfig = (gameId, eventId) => {
    if (typeof window !== 'undefined') {
      const stored = JSON.parse(localStorage.getItem('hue_event_configs') || '{}');
      return stored[gameId]?.[eventId] || { enabled: false, color: 'blue', effect: 'flash', lights: [] };
    }
    return { enabled: false, color: 'blue', effect: 'flash', lights: [] };
  };

  const toggleEventLight = (gameId, eventId, lightId) => {
    const config = getEventConfig(gameId, eventId);
    const currentLights = config.lights || [];
    const newLights = currentLights.includes(lightId)
      ? currentLights.filter(id => id !== lightId)
      : [...currentLights, lightId];
    saveEventConfig(gameId, eventId, { ...config, lights: newLights });
  };

  const selectAllEventLights = (gameId, eventId) => {
    const config = getEventConfig(gameId, eventId);
    const allLightIds = lights.map(l => l.id);
    saveEventConfig(gameId, eventId, { ...config, lights: allLightIds });
  };

  const deselectAllEventLights = (gameId, eventId) => {
    const config = getEventConfig(gameId, eventId);
    saveEventConfig(gameId, eventId, { ...config, lights: [] });
  };

  const testEventEffect = async (gameId, eventId) => {
    setTestingScenario(`${gameId}-${eventId}`);
    const config = getEventConfig(gameId, eventId);
    const colorPreset = COLOR_PRESETS.find(c => c.id === config.color) || COLOR_PRESETS[5];
    const eventLights = config.lights || [];

    if (eventLights.length === 0) {
      setTestingScenario(null);
      return;
    }

    // Sauvegarder l'état actuel de TOUTES les lampes du jeu
    const savedStates = {};
    for (const lightId of selectedLights) {
      const light = lights.find(l => l.id === lightId);
      if (light) {
        savedStates[lightId] = {
          on: light.state.on,
          bri: light.state.bri,
          hue: light.state.hue,
          sat: light.state.sat
        };
      }
    }

    // Trouver les lampes à éteindre (dans le jeu mais pas dans cet événement)
    const lightsToTurnOff = selectedLights.filter(id => !eventLights.includes(id));

    // Éteindre les lampes non sélectionnées pour cet événement
    for (const lightId of lightsToTurnOff) {
      await hueService.setLightState(lightId, { on: false, transitiontime: 2 });
    }

    // Appliquer l'effet sur les lampes de l'événement
    for (const lightId of eventLights) {
      await hueService.setLightState(lightId, {
        on: true,
        hue: colorPreset.hue,
        sat: colorPreset.sat,
        bri: 254,
        transitiontime: 0
      });
    }

    // Flash effect
    setTimeout(async () => {
      for (const lightId of eventLights) {
        await hueService.setLightState(lightId, {
          on: true,
          hue: colorPreset.hue,
          sat: colorPreset.sat,
          bri: 80,
          transitiontime: 2
        });
      }
    }, 200);

    // Restaurer après le test
    setTimeout(async () => {
      for (const [lightId, state] of Object.entries(savedStates)) {
        await hueService.setLightState(lightId, { ...state, transitiontime: 5 });
      }
      setTestingScenario(null);
    }, 2000);
  };

  if (loading) {
    return (
      <div className="hue-loading">
        <div className="hue-loading-spinner" />
        <style jsx>{`
          .hue-loading {
            min-height: 100vh;
            background: #000;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .hue-loading-spinner {
            width: 48px;
            height: 48px;
            border: 4px solid rgba(139, 92, 246, 0.2);
            border-top-color: #8B5CF6;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="hue-page">
      {/* Background Effects */}
      <div className="hue-bg">
        <div className="hue-bg-orb hue-bg-orb-1" />
        <div className="hue-bg-orb hue-bg-orb-2" />
        <div className="hue-bg-orb hue-bg-orb-3" />
      </div>

      {/* Header */}
      <header className="hue-header">
        <div className="hue-header-inner">
          <button onClick={() => router.push('/profile')} className="hue-back-btn">
            <ChevronLeft size={24} />
          </button>
          <div className="hue-header-title">
            <h1>Philips Hue</h1>
            <p>Synchronisez vos lumières avec le jeu</p>
          </div>
          <div className={`hue-status ${isConnected ? 'connected' : ''}`}>
            {isConnected ? <Wifi size={18} /> : <WifiOff size={18} />}
            <span>{isConnected ? 'Connecté' : 'Déconnecté'}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="hue-main">
        {/* Hero Section */}
        <section className="hue-hero">
          <div className="hue-hero-icon">
            <Lightbulb size={40} />
          </div>
          <div className="hue-hero-content">
            <h2>Éclairage Intelligent</h2>
            <p>Créez une expérience immersive avec vos lumières Philips Hue synchronisées aux événements du jeu.</p>
          </div>
        </section>

        {/* Tabs */}
        <nav className="hue-tabs">
          <button
            className={`hue-tab ${activeTab === 'connection' ? 'active' : ''}`}
            onClick={() => setActiveTab('connection')}
          >
            <Wifi size={20} />
            <span>Connexion</span>
          </button>
          <button
            className={`hue-tab ${activeTab === 'lights' ? 'active' : ''} ${!isConnected ? 'disabled' : ''}`}
            onClick={() => isConnected && setActiveTab('lights')}
            disabled={!isConnected}
          >
            <Lightbulb size={20} />
            <span>Lampes</span>
          </button>
          <button
            className={`hue-tab ${activeTab === 'config' ? 'active' : ''} ${!isConnected ? 'disabled' : ''}`}
            onClick={() => isConnected && setActiveTab('config')}
            disabled={!isConnected}
          >
            <Palette size={20} />
            <span>Couleurs</span>
          </button>
        </nav>

        {/* Tab Content */}
        <div className="hue-content">
          <AnimatePresence mode="wait">
            {/* Connection Tab */}
            {activeTab === 'connection' && (
              <motion.div
                key="connection"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="hue-section"
              >
                {isConnected ? (
                  <div className="hue-connected-card">
                    <div className="hue-connected-icon">
                      <Check size={32} />
                    </div>
                    <div className="hue-connected-info">
                      <h3>Bridge Connecté</h3>
                      <p>{hueService.getConfig().bridgeIp}</p>
                    </div>
                    <button onClick={handleDisconnect} className="hue-btn hue-btn-danger">
                      Déconnecter
                    </button>
                  </div>
                ) : (
                  <div className="hue-connection-flow">
                    {/* Search Button */}
                    <button
                      onClick={handleDiscover}
                      disabled={isSearching}
                      className="hue-btn hue-btn-primary hue-btn-large"
                    >
                      {isSearching ? (
                        <>
                          <RefreshCw size={22} className="spinning" />
                          <span>Recherche en cours...</span>
                        </>
                      ) : (
                        <>
                          <Search size={22} />
                          <span>Rechercher les bridges</span>
                        </>
                      )}
                    </button>

                    {/* Bridges Found */}
                    {bridges.length > 0 && (
                      <div className="hue-bridges-list">
                        <h4>Bridges trouvés</h4>
                        {bridges.map((bridge) => (
                          <button
                            key={bridge.id}
                            onClick={() => setSelectedBridge(bridge.ip)}
                            className={`hue-bridge-item ${selectedBridge === bridge.ip ? 'selected' : ''}`}
                          >
                            <div className="hue-bridge-icon">
                              <Lightbulb size={24} />
                            </div>
                            <div className="hue-bridge-info">
                              <span className="hue-bridge-ip">{bridge.ip}</span>
                              <span className="hue-bridge-id">{bridge.id}</span>
                            </div>
                            {selectedBridge === bridge.ip && <Check size={20} className="hue-bridge-check" />}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Manual Input Toggle */}
                    <button
                      onClick={() => setShowManualInput(!showManualInput)}
                      className="hue-link-btn"
                    >
                      {showManualInput ? 'Masquer la saisie manuelle' : 'Entrer l\'IP manuellement'}
                    </button>

                    {/* Manual IP Input */}
                    {showManualInput && (
                      <div className="hue-input-group">
                        <label>Adresse IP du bridge</label>
                        <input
                          type="text"
                          value={manualIp}
                          onChange={(e) => setManualIp(e.target.value)}
                          placeholder="192.168.1.xxx"
                          className="hue-input"
                        />
                      </div>
                    )}

                    {/* Connect Instructions */}
                    {(selectedBridge || manualIp) && (
                      <div className="hue-connect-section">
                        <div className="hue-instruction-card">
                          <span className="hue-instruction-icon">👆</span>
                          <p>Appuyez sur le <strong>bouton central</strong> de votre bridge Hue, puis cliquez sur Connecter</p>
                        </div>
                        <button
                          onClick={handleConnect}
                          disabled={isSearching}
                          className="hue-btn hue-btn-success hue-btn-large"
                        >
                          {isSearching ? 'Connexion...' : 'Connecter'}
                        </button>
                      </div>
                    )}

                    {/* Error */}
                    {connectionError && (
                      <div className="hue-error-card">
                        <X size={20} />
                        <p>{connectionError}</p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* Lights Tab */}
            {activeTab === 'lights' && isConnected && (
              <motion.div
                key="lights"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="hue-section"
              >
                {/* Room Selector */}
                {groups.length > 0 && (
                  <div className="hue-room-selector">
                    <label>Pièce du jeu</label>
                    <div className="hue-room-buttons">
                      <button
                        onClick={() => setSelectedGroup(null)}
                        className={`hue-room-btn ${selectedGroup === null ? 'active' : ''}`}
                      >
                        Toutes
                      </button>
                      {groups.map(group => (
                        <button
                          key={group.id}
                          onClick={() => setSelectedGroup(group.id)}
                          className={`hue-room-btn ${selectedGroup === group.id ? 'active' : ''}`}
                        >
                          {group.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lights Header */}
                <div className="hue-lights-header">
                  <div className="hue-lights-count">
                    <span className="count">{selectedLights.length}</span>
                    <span className="label">lampe{selectedLights.length !== 1 ? 's' : ''} sélectionnée{selectedLights.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="hue-lights-actions">
                    <button onClick={selectAllLights} className="hue-btn hue-btn-small">Tout</button>
                    <button onClick={deselectAllLights} className="hue-btn hue-btn-small">Aucun</button>
                    {selectedLights.length > 0 && (
                      <button onClick={testLights} className="hue-btn hue-btn-small hue-btn-accent">
                        <Zap size={16} />
                        Tester
                      </button>
                    )}
                  </div>
                </div>

                {/* Lights Grid */}
                {loadingLights ? (
                  <div className="hue-lights-loading">
                    <div className="hue-loading-spinner" />
                    <p>Chargement des lampes...</p>
                  </div>
                ) : filteredLights.length === 0 ? (
                  <div className="hue-lights-empty">
                    <Lightbulb size={48} />
                    <p>Aucune lampe trouvée</p>
                    <span>Vérifiez que vos lampes sont connectées au bridge</span>
                  </div>
                ) : (
                  <div className="hue-lights-grid">
                    {filteredLights.map((light) => (
                      <button
                        key={light.id}
                        onClick={() => toggleLight(light.id)}
                        className={`hue-light-card ${selectedLights.includes(light.id) ? 'selected' : ''}`}
                      >
                        <div className={`hue-light-bulb ${light.state.on ? 'on' : 'off'}`}>
                          <Lightbulb size={28} />
                        </div>
                        <div className="hue-light-info">
                          <span className="hue-light-name">{light.name}</span>
                          <span className="hue-light-state">{light.state.on ? 'Allumée' : 'Éteinte'}</span>
                        </div>
                        {selectedLights.includes(light.id) && (
                          <div className="hue-light-check">
                            <Check size={16} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Config Tab */}
            {activeTab === 'config' && isConnected && (
              <motion.div
                key="config"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="hue-section"
              >
                {/* Color Test Section */}
                <div className="hue-config-section">
                  <h3>
                    <Palette size={20} />
                    Test de couleurs
                  </h3>
                  <p className="hue-section-desc">Cliquez sur une couleur pour la tester sur vos lampes</p>
                  <div className="hue-color-grid">
                    {COLOR_PRESETS.map((color) => (
                      <button
                        key={color.id}
                        onClick={() => testColor(color)}
                        className="hue-color-btn"
                        style={{ '--color': color.color }}
                        title={color.name}
                      >
                        <div className="hue-color-swatch" />
                        <span>{color.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Game Selection */}
                <div className="hue-config-section">
                  <h3>
                    <Settings2 size={20} />
                    Configuration par jeu
                  </h3>
                  <div className="hue-game-tabs">
                    {Object.keys(GAME_EVENTS).map((gameId) => (
                      <button
                        key={gameId}
                        onClick={() => setActiveGame(gameId)}
                        className={`hue-game-tab ${activeGame === gameId ? 'active' : ''}`}
                      >
                        {GAME_EVENTS[gameId].name}
                      </button>
                    ))}
                  </div>

                  {/* Events List */}
                  <div className="hue-events-list">
                    {GAME_EVENTS[activeGame]?.events.map((event) => {
                      const config = getEventConfig(activeGame, event.id);
                      const selectedColor = COLOR_PRESETS.find(c => c.id === config.color) || COLOR_PRESETS[5];

                      return (
                        <div key={event.id} className="hue-event-card">
                          <div className="hue-event-header">
                            <div className="hue-event-info">
                              <h4>{event.name}</h4>
                              <p>{event.description}</p>
                            </div>
                            <button
                              onClick={() => {
                                const newConfig = { ...config, enabled: !config.enabled };
                                saveEventConfig(activeGame, event.id, newConfig);
                              }}
                              className={`hue-toggle ${config.enabled ? 'active' : ''}`}
                            >
                              <div className="hue-toggle-thumb" />
                            </button>
                          </div>

                          {config.enabled && (
                            <div className="hue-event-config">
                              {/* Sélecteur de lampes */}
                              <div className="hue-config-row">
                                <div className="hue-config-row-header">
                                  <label>Lampes</label>
                                  <div className="hue-config-row-actions">
                                    <button
                                      onClick={() => selectAllEventLights(activeGame, event.id)}
                                      className="hue-mini-btn"
                                    >
                                      Toutes
                                    </button>
                                    <button
                                      onClick={() => deselectAllEventLights(activeGame, event.id)}
                                      className="hue-mini-btn"
                                    >
                                      Aucune
                                    </button>
                                  </div>
                                </div>
                                {selectedLights.length === 0 ? (
                                  <p className="hue-no-lights">Sélectionnez d'abord des lampes dans l'onglet "Lampes"</p>
                                ) : (
                                  <div className="hue-event-lights">
                                    {/* Afficher SEULEMENT les lampes sélectionnées dans l'onglet Lampes */}
                                    {lights.filter(l => selectedLights.includes(l.id)).map((light) => {
                                      const isSelected = (config.lights || []).includes(light.id);
                                      return (
                                        <button
                                          key={light.id}
                                          onClick={() => toggleEventLight(activeGame, event.id, light.id)}
                                          className={`hue-event-light ${isSelected ? 'selected' : ''}`}
                                        >
                                          <Lightbulb size={14} />
                                          <span>{light.name}</span>
                                          {isSelected && <Check size={12} className="hue-event-light-check" />}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              <div className="hue-config-row">
                                <label>Couleur</label>
                                <div className="hue-color-select">
                                  {COLOR_PRESETS.slice(0, 8).map((color) => (
                                    <button
                                      key={color.id}
                                      onClick={() => {
                                        const newConfig = { ...config, color: color.id };
                                        saveEventConfig(activeGame, event.id, newConfig);
                                      }}
                                      className={`hue-color-option ${config.color === color.id ? 'selected' : ''}`}
                                      style={{ '--color': color.color }}
                                      title={color.name}
                                    />
                                  ))}
                                </div>
                              </div>

                              <div className="hue-config-row">
                                <label>Effet</label>
                                <div className="hue-effect-select">
                                  {EFFECT_TYPES.map((effect) => (
                                    <button
                                      key={effect.id}
                                      onClick={() => {
                                        const newConfig = { ...config, effect: effect.id };
                                        saveEventConfig(activeGame, event.id, newConfig);
                                      }}
                                      className={`hue-effect-option ${config.effect === effect.id ? 'selected' : ''}`}
                                    >
                                      {effect.name}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <button
                                onClick={() => testEventEffect(activeGame, event.id)}
                                disabled={testingScenario === `${activeGame}-${event.id}` || (config.lights || []).length === 0}
                                className="hue-btn hue-btn-small hue-btn-test"
                              >
                                <Play size={16} />
                                {testingScenario === `${activeGame}-${event.id}` ? 'Test...' : 'Tester'}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <style jsx>{`
        .hue-page {
          min-height: 100vh;
          background: #000;
          color: white;
          position: relative;
        }

        /* Background */
        .hue-bg {
          position: fixed;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .hue-bg-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
        }
        .hue-bg-orb-1 {
          top: -10%;
          left: 20%;
          width: 400px;
          height: 400px;
          background: rgba(139, 92, 246, 0.15);
        }
        .hue-bg-orb-2 {
          bottom: 20%;
          right: 10%;
          width: 300px;
          height: 300px;
          background: rgba(59, 130, 246, 0.12);
        }
        .hue-bg-orb-3 {
          top: 50%;
          left: -10%;
          width: 250px;
          height: 250px;
          background: rgba(245, 158, 11, 0.08);
        }

        /* Header */
        .hue-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .hue-header-inner {
          max-width: 800px;
          margin: 0 auto;
          padding: var(--space-4) var(--space-6);
          display: flex;
          align-items: center;
          gap: var(--space-4);
        }
        .hue-back-btn {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-lg);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .hue-back-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .hue-header-title {
          flex: 1;
        }
        .hue-header-title h1 {
          font-size: var(--font-size-xl);
          font-weight: 700;
          margin: 0;
        }
        .hue-header-title p {
          font-size: var(--font-size-sm);
          color: rgba(255, 255, 255, 0.5);
          margin: 0;
        }
        .hue-status {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-full);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          font-size: var(--font-size-sm);
          color: rgba(255, 255, 255, 0.5);
        }
        .hue-status.connected {
          background: rgba(34, 197, 94, 0.15);
          border-color: rgba(34, 197, 94, 0.3);
          color: #22C55E;
        }

        /* Main */
        .hue-main {
          position: relative;
          z-index: 1;
          max-width: 800px;
          margin: 0 auto;
          padding: var(--space-6);
          padding-bottom: var(--space-16);
        }

        /* Hero */
        .hue-hero {
          display: flex;
          gap: var(--space-5);
          padding: var(--space-6);
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(59, 130, 246, 0.1));
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: var(--radius-2xl);
          margin-bottom: var(--space-6);
        }
        .hue-hero-icon {
          width: 80px;
          height: 80px;
          border-radius: var(--radius-xl);
          background: linear-gradient(135deg, #8B5CF6, #3B82F6);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 8px 32px rgba(139, 92, 246, 0.3);
        }
        .hue-hero-content h2 {
          font-size: var(--font-size-2xl);
          font-weight: 700;
          margin: 0 0 var(--space-2) 0;
        }
        .hue-hero-content p {
          color: rgba(255, 255, 255, 0.6);
          margin: 0;
          line-height: 1.5;
        }

        /* Tabs */
        .hue-tabs {
          display: flex;
          gap: var(--space-2);
          padding: var(--space-1);
          background: rgba(255, 255, 255, 0.05);
          border-radius: var(--radius-xl);
          margin-bottom: var(--space-6);
        }
        .hue-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-4);
          border-radius: var(--radius-lg);
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          font-size: var(--font-size-sm);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .hue-tab:hover:not(.disabled) {
          color: rgba(255, 255, 255, 0.8);
          background: rgba(255, 255, 255, 0.05);
        }
        .hue-tab.active {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }
        .hue-tab.disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        /* Content */
        .hue-content {
          min-height: 400px;
        }
        .hue-section {
          display: flex;
          flex-direction: column;
          gap: var(--space-5);
        }

        /* Buttons */
        .hue-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-5);
          border-radius: var(--radius-lg);
          border: none;
          font-size: var(--font-size-sm);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .hue-btn-primary {
          background: linear-gradient(135deg, #8B5CF6, #6366F1);
          color: white;
        }
        .hue-btn-primary:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        .hue-btn-success {
          background: linear-gradient(135deg, #22C55E, #10B981);
          color: white;
        }
        .hue-btn-danger {
          background: rgba(239, 68, 68, 0.15);
          color: #EF4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .hue-btn-danger:hover {
          background: rgba(239, 68, 68, 0.25);
        }
        .hue-btn-large {
          width: 100%;
          padding: var(--space-4) var(--space-6);
          font-size: var(--font-size-base);
        }
        .hue-btn-small {
          padding: var(--space-2) var(--space-3);
          font-size: var(--font-size-xs);
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }
        .hue-btn-small:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        .hue-btn-accent {
          background: linear-gradient(135deg, #8B5CF6, #6366F1);
        }
        .hue-btn-test {
          margin-top: var(--space-3);
        }
        .hue-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .hue-link-btn {
          background: none;
          border: none;
          color: #8B5CF6;
          font-size: var(--font-size-sm);
          cursor: pointer;
          padding: var(--space-2);
        }
        .hue-link-btn:hover {
          text-decoration: underline;
        }

        /* Connected Card */
        .hue-connected-card {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          padding: var(--space-5);
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.1));
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: var(--radius-xl);
        }
        .hue-connected-icon {
          width: 56px;
          height: 56px;
          border-radius: var(--radius-lg);
          background: rgba(34, 197, 94, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #22C55E;
        }
        .hue-connected-info {
          flex: 1;
        }
        .hue-connected-info h3 {
          font-size: var(--font-size-lg);
          font-weight: 600;
          color: #22C55E;
          margin: 0;
        }
        .hue-connected-info p {
          color: rgba(34, 197, 94, 0.7);
          margin: 0;
          font-size: var(--font-size-sm);
        }

        /* Connection Flow */
        .hue-connection-flow {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        /* Bridges List */
        .hue-bridges-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .hue-bridges-list h4 {
          font-size: var(--font-size-sm);
          color: rgba(255, 255, 255, 0.5);
          margin: 0;
        }
        .hue-bridge-item {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          padding: var(--space-4);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
          width: 100%;
        }
        .hue-bridge-item:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
        }
        .hue-bridge-item.selected {
          background: rgba(139, 92, 246, 0.15);
          border-color: rgba(139, 92, 246, 0.4);
        }
        .hue-bridge-icon {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .hue-bridge-item.selected .hue-bridge-icon {
          background: linear-gradient(135deg, #8B5CF6, #6366F1);
        }
        .hue-bridge-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .hue-bridge-ip {
          font-weight: 600;
          color: white;
        }
        .hue-bridge-id {
          font-size: var(--font-size-xs);
          color: rgba(255, 255, 255, 0.5);
        }
        .hue-bridge-check {
          color: #8B5CF6;
        }

        /* Input */
        .hue-input-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .hue-input-group label {
          font-size: var(--font-size-sm);
          color: rgba(255, 255, 255, 0.7);
        }
        .hue-input {
          width: 100%;
          padding: var(--space-4);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: var(--radius-lg);
          color: white;
          font-size: var(--font-size-base);
        }
        .hue-input:focus {
          outline: none;
          border-color: #8B5CF6;
        }
        .hue-input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        /* Instruction Card */
        .hue-connect-section {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
        .hue-instruction-card {
          display: flex;
          align-items: flex-start;
          gap: var(--space-3);
          padding: var(--space-4);
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: var(--radius-lg);
        }
        .hue-instruction-icon {
          font-size: var(--font-size-2xl);
        }
        .hue-instruction-card p {
          margin: 0;
          color: #F59E0B;
          line-height: 1.5;
        }

        /* Error Card */
        .hue-error-card {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-4);
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: var(--radius-lg);
          color: #EF4444;
        }
        .hue-error-card p {
          margin: 0;
        }

        /* Room Selector */
        .hue-room-selector {
          margin-bottom: var(--space-4);
        }
        .hue-room-selector label {
          display: block;
          font-size: var(--font-size-sm);
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: var(--space-2);
        }
        .hue-room-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-2);
        }
        .hue-room-btn {
          padding: var(--space-2) var(--space-4);
          border-radius: var(--radius-lg);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.6);
          font-size: var(--font-size-sm);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .hue-room-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }
        .hue-room-btn.active {
          background: rgba(139, 92, 246, 0.2);
          border-color: #8B5CF6;
          color: #A78BFA;
        }

        /* Lights */
        .hue-lights-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-4);
          background: rgba(255, 255, 255, 0.03);
          border-radius: var(--radius-lg);
        }
        .hue-lights-count .count {
          font-size: var(--font-size-2xl);
          font-weight: 700;
          color: #8B5CF6;
        }
        .hue-lights-count .label {
          margin-left: var(--space-2);
          color: rgba(255, 255, 255, 0.6);
        }
        .hue-lights-actions {
          display: flex;
          gap: var(--space-2);
        }
        .hue-lights-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--space-12);
          gap: var(--space-4);
          color: rgba(255, 255, 255, 0.5);
        }
        .hue-loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(139, 92, 246, 0.2);
          border-top-color: #8B5CF6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        .hue-lights-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--space-12);
          gap: var(--space-3);
          color: rgba(255, 255, 255, 0.3);
          text-align: center;
        }
        .hue-lights-empty p {
          font-size: var(--font-size-lg);
          margin: 0;
        }
        .hue-lights-empty span {
          font-size: var(--font-size-sm);
        }
        .hue-lights-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: var(--space-3);
        }
        .hue-light-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-5);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-xl);
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          text-align: center;
        }
        .hue-light-card:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.2);
        }
        .hue-light-card.selected {
          background: rgba(139, 92, 246, 0.15);
          border-color: rgba(139, 92, 246, 0.4);
        }
        .hue-light-bulb {
          width: 56px;
          height: 56px;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .hue-light-bulb.off {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.4);
        }
        .hue-light-bulb.on {
          background: linear-gradient(135deg, #FBBF24, #F59E0B);
          color: #78350F;
          box-shadow: 0 4px 20px rgba(251, 191, 36, 0.4);
        }
        .hue-light-name {
          font-weight: 600;
          font-size: var(--font-size-sm);
        }
        .hue-light-state {
          font-size: var(--font-size-xs);
          color: rgba(255, 255, 255, 0.5);
        }
        .hue-light-check {
          position: absolute;
          top: var(--space-3);
          right: var(--space-3);
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #8B5CF6;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        /* Config Section */
        .hue-config-section {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-xl);
          padding: var(--space-5);
        }
        .hue-config-section h3 {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-size: var(--font-size-lg);
          font-weight: 600;
          margin: 0 0 var(--space-2) 0;
          color: white;
        }
        .hue-section-desc {
          color: rgba(255, 255, 255, 0.5);
          font-size: var(--font-size-sm);
          margin: 0 0 var(--space-4) 0;
        }

        /* Color Grid */
        .hue-color-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: var(--space-3);
        }
        .hue-color-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-3);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all 0.2s;
        }
        .hue-color-btn:hover {
          transform: scale(1.05);
          border-color: var(--color);
        }
        .hue-color-swatch {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-md);
          background: var(--color);
          box-shadow: 0 4px 12px color-mix(in srgb, var(--color) 40%, transparent);
        }
        .hue-color-btn span {
          font-size: var(--font-size-xs);
          color: rgba(255, 255, 255, 0.7);
        }

        /* Game Tabs */
        .hue-game-tabs {
          display: flex;
          gap: var(--space-2);
          margin-bottom: var(--space-4);
        }
        .hue-game-tab {
          padding: var(--space-2) var(--space-4);
          border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.05);
          border: none;
          color: rgba(255, 255, 255, 0.6);
          font-size: var(--font-size-sm);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .hue-game-tab:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .hue-game-tab.active {
          background: #8B5CF6;
          color: white;
        }

        /* Events List */
        .hue-events-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .hue-event-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }
        .hue-event-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-4);
        }
        .hue-event-info h4 {
          font-size: var(--font-size-base);
          font-weight: 600;
          margin: 0;
        }
        .hue-event-info p {
          font-size: var(--font-size-sm);
          color: rgba(255, 255, 255, 0.5);
          margin: var(--space-1) 0 0 0;
        }

        /* Toggle */
        .hue-toggle {
          width: 52px;
          height: 28px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.15);
          border: none;
          cursor: pointer;
          position: relative;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .hue-toggle.active {
          background: #8B5CF6;
        }
        .hue-toggle-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: white;
          transition: all 0.2s;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        .hue-toggle.active .hue-toggle-thumb {
          left: 26px;
        }

        /* Event Config */
        .hue-event-config {
          padding: var(--space-4);
          padding-top: var(--space-4);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .hue-config-row {
          margin-bottom: var(--space-4);
        }
        .hue-config-row-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-2);
        }
        .hue-config-row-header label {
          margin-bottom: 0;
        }
        .hue-config-row-actions {
          display: flex;
          gap: var(--space-2);
        }
        .hue-mini-btn {
          padding: var(--space-1) var(--space-2);
          font-size: var(--font-size-xs);
          background: rgba(255, 255, 255, 0.08);
          border: none;
          border-radius: var(--radius-sm);
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          transition: all 0.2s;
        }
        .hue-mini-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          color: white;
        }
        .hue-config-row label {
          display: block;
          font-size: var(--font-size-sm);
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: var(--space-2);
        }
        .hue-no-lights {
          font-size: var(--font-size-sm);
          color: rgba(255, 255, 255, 0.4);
          font-style: italic;
          margin: 0;
        }
        .hue-event-lights {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-2);
        }
        .hue-event-light {
          display: inline-flex;
          align-items: center;
          gap: var(--space-1);
          padding: var(--space-2) var(--space-3);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-md);
          color: rgba(255, 255, 255, 0.6);
          font-size: var(--font-size-xs);
          cursor: pointer;
          transition: all 0.2s;
        }
        .hue-event-light:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }
        .hue-event-light.selected {
          background: rgba(139, 92, 246, 0.2);
          border-color: rgba(139, 92, 246, 0.5);
          color: #A78BFA;
        }
        .hue-event-light-check {
          color: #8B5CF6;
        }
        .hue-color-select {
          display: flex;
          gap: var(--space-2);
          flex-wrap: wrap;
        }
        .hue-color-option {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-md);
          background: var(--color);
          border: 2px solid transparent;
          cursor: pointer;
          transition: all 0.2s;
        }
        .hue-color-option:hover {
          transform: scale(1.1);
        }
        .hue-color-option.selected {
          border-color: white;
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
        }
        .hue-effect-select {
          display: flex;
          gap: var(--space-2);
          flex-wrap: wrap;
        }
        .hue-effect-option {
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.7);
          font-size: var(--font-size-sm);
          cursor: pointer;
          transition: all 0.2s;
        }
        .hue-effect-option:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .hue-effect-option.selected {
          background: rgba(139, 92, 246, 0.2);
          border-color: #8B5CF6;
          color: #A78BFA;
        }

        /* Animations */
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spinning {
          animation: spin 1s linear infinite;
        }

        /* Mobile */
        @media (max-width: 640px) {
          .hue-main {
            padding: var(--space-4);
          }
          .hue-hero {
            flex-direction: column;
            text-align: center;
            padding: var(--space-5);
          }
          .hue-hero-icon {
            width: 64px;
            height: 64px;
          }
          .hue-color-grid {
            grid-template-columns: repeat(5, 1fr);
            gap: var(--space-2);
          }
          .hue-color-btn {
            padding: var(--space-2);
          }
          .hue-color-swatch {
            width: 32px;
            height: 32px;
          }
          .hue-color-btn span {
            display: none;
          }
          .hue-lights-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .hue-status span {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
