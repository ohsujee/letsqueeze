'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronDown, Lightbulb, Wifi, WifiOff, Check, Play,
  Settings2, Zap, Palette, RefreshCw, Search, X,
  Sparkles, Clock, Trophy, Frown, Bell, CirclePlay, CheckCircle, XCircle, Timer
} from 'lucide-react';

// Philips Hue Logo
const HueLogo = ({ size = 32 }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
    <path d="M20.672 9.6c-2.043 0-3.505 1.386-3.682 3.416h-.664c-.247 0-.395.144-.395.384 0 .24.148.384.395.384h.661c.152 2.09 1.652 3.423 3.915 3.423.944 0 1.685-.144 2.332-.453.158-.075.337-.217.292-.471a.334.334 0 0 0-.15-.242c-.104-.065-.25-.072-.422-.02a7.93 7.93 0 0 0-.352.12c-.414.146-.771.273-1.599.273-1.75 0-2.908-1.023-2.952-2.605v-.025h5.444c.313 0 .492-.164.505-.463v-.058C23.994 9.865 21.452 9.6 20.672 9.6zm2.376 3.416h-5l.004-.035c.121-1.58 1.161-2.601 2.649-2.601 1.134 0 2.347.685 2.347 2.606zM9.542 10.221c0-.335-.195-.534-.52-.534s-.52.2-.52.534v2.795h1.04zm4.29 3.817c0 1.324-.948 2.361-2.16 2.361-1.433 0-2.13-.763-2.13-2.333v-.282h-1.04v.34c0 2.046.965 3.083 2.868 3.083 1.12 0 1.943-.486 2.443-1.445l.02-.036v.861c0 .334.193.534.519.534.325 0 .52-.2.52-.534v-2.803h-1.04zm.52-4.351c-.326 0-.52.2-.52.534v2.795h1.04v-2.795c0-.335-.195-.534-.52-.534zM3.645 9.6c-1.66 0-2.31 1.072-2.471 1.4l-.135.278V7.355c0-.347-.199-.562-.52-.562-.32 0-.519.215-.519.562v5.661h1.039v-.015c0-1.249.72-2.592 2.304-2.592 1.29 0 2.001.828 2.001 2.332v.275h1.04v-.246c0-2.044-.973-3.17-2.739-3.17zM0 16.558c0 .347.199.563.52.563.32 0 .519-.216.519-.563v-2.774H0zm5.344 0c0 .347.2.563.52.563s.52-.216.52-.563v-2.774h-1.04z"/>
  </svg>
);
import hueService from '@/lib/hue-module/services/hueService';
import hueScenariosService, { COLORS } from '@/lib/hue-module/services/hueScenariosService';
import { GAME_EVENTS } from '@/lib/hue-module/components/HueGameConfig';
import { useAuthProtect } from '@/lib/hooks/useAuthProtect';
import LoadingScreen from '@/components/ui/LoadingScreen';
import './hue.css';

// Feature now available to all connected users (not guests)

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
  const { user, loading } = useAuthProtect();
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
  const [testingColor, setTestingColor] = useState(null);

  // Event icons mapping
  const EVENT_ICONS = {
    ambiance: Sparkles,
    roundStart: CirclePlay,
    goodAnswer: CheckCircle,
    badAnswer: XCircle,
    timeUp: Timer,
    victory: Trophy,
    defeat: Frown,
    buzz: Bell
  };

  // Presets for quick configuration
  const PRESETS = [
    {
      id: 'gameshow',
      name: 'Game Show',
      icon: '🎬',
      config: {
        ambiance: { color: 'blue', effect: 'solid', enabled: true },
        goodAnswer: { color: 'green', effect: 'flash', enabled: true },
        badAnswer: { color: 'red', effect: 'flash', enabled: true },
        victory: { color: 'yellow', effect: 'rainbow', enabled: true }
      }
    },
    {
      id: 'chill',
      name: 'Chill',
      icon: '🌙',
      config: {
        ambiance: { color: 'purple', effect: 'solid', enabled: true },
        goodAnswer: { color: 'cyan', effect: 'pulse', enabled: true },
        badAnswer: { color: 'orange', effect: 'solid', enabled: true },
        victory: { color: 'pink', effect: 'pulse', enabled: true }
      }
    },
    {
      id: 'intense',
      name: 'Intense',
      icon: '🔥',
      config: {
        ambiance: { color: 'red', effect: 'pulse', enabled: true },
        roundStart: { color: 'orange', effect: 'flash', enabled: true },
        goodAnswer: { color: 'green', effect: 'flash', enabled: true },
        badAnswer: { color: 'red', effect: 'flash', enabled: true },
        timeUp: { color: 'orange', effect: 'pulse', enabled: true },
        victory: { color: 'yellow', effect: 'rainbow', enabled: true },
        defeat: { color: 'purple', effect: 'solid', enabled: true }
      }
    }
  ];

  // Load Hue config when user is available
  useEffect(() => {
    if (!user) return;
    loadHueConfig();
  }, [user]);

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
    setTestingColor(colorPreset.id);

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
      setTestingColor(null);
    }, 2000);
  };

  // Apply preset configuration
  const applyPreset = (preset) => {
    Object.entries(preset.config).forEach(([eventId, eventConfig]) => {
      saveEventConfig(activeGame, eventId, {
        ...eventConfig,
        lights: selectedLights // Use all selected lights
      });
    });
  };

  // Test full sequence
  const testFullSequence = async () => {
    const events = GAME_EVENTS[activeGame]?.events || [];
    for (const event of events) {
      const config = getEventConfig(activeGame, event.id);
      if (config.enabled && (config.lights || []).length > 0) {
        await testEventEffect(activeGame, event.id);
        await new Promise(resolve => setTimeout(resolve, 2500)); // Wait between effects
      }
    }
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
    return <LoadingScreen game="quiz" />;
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
        {/* Hero Section - Compact */}
        <section className="hue-hero">
          <div className="hue-hero-icon">
            <HueLogo size={32} />
          </div>
          <div className="hue-hero-content">
            <h2>Éclairage Intelligent</h2>
            <p>Synchronisez vos lumières avec les événements du jeu.</p>
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
                    {/* Search Button - Hidden when bridges found */}
                    {bridges.length === 0 && (
                      <button
                        onClick={handleDiscover}
                        disabled={isSearching}
                        className="hue-btn hue-btn-primary hue-btn-large"
                      >
                        {isSearching ? (
                          <>
                            <RefreshCw size={20} className="spinning" />
                            <span>Recherche...</span>
                          </>
                        ) : (
                          <>
                            <Search size={20} />
                            <span>Rechercher les bridges</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Bridges Found - Compact */}
                    {bridges.length > 0 && (
                      <div className="hue-bridges-list">
                        {bridges.map((bridge) => (
                          <button
                            key={bridge.id}
                            onClick={() => setSelectedBridge(bridge.ip)}
                            className={`hue-bridge-item ${selectedBridge === bridge.ip ? 'selected' : ''}`}
                          >
                            <div className="hue-bridge-icon">
                              <Lightbulb size={20} />
                            </div>
                            <div className="hue-bridge-info">
                              <span className="hue-bridge-ip">{bridge.ip}</span>
                            </div>
                            {selectedBridge === bridge.ip && <Check size={18} className="hue-bridge-check" />}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Instruction + Connect Button */}
                    {(selectedBridge || manualIp) && (
                      <>
                        <div className={`hue-instruction-card ${connectionError ? 'error' : ''}`}>
                          {connectionError ? (
                            <p>Le bouton du bridge n'a pas été appuyé. Appuyez dessus puis réessayez.</p>
                          ) : (
                            <p>Appuyez sur le <strong>bouton du bridge</strong> puis cliquez sur Connecter</p>
                          )}
                        </div>
                        <button
                          onClick={handleConnect}
                          disabled={isSearching}
                          className="hue-btn hue-btn-success hue-btn-large"
                        >
                          {isSearching ? 'Connexion...' : 'Connecter'}
                        </button>
                      </>
                    )}

                    {/* Manual Input Toggle - Only when no bridge found */}
                    {bridges.length === 0 && (
                      <button
                        onClick={() => setShowManualInput(!showManualInput)}
                        className="hue-link-btn"
                      >
                        {showManualInput ? 'Masquer' : 'Entrer l\'IP manuellement'}
                      </button>
                    )}

                    {/* Manual IP Input */}
                    {showManualInput && bridges.length === 0 && (
                      <div className="hue-input-group">
                        <input
                          type="text"
                          value={manualIp}
                          onChange={(e) => setManualIp(e.target.value)}
                          placeholder="192.168.1.xxx"
                          className="hue-input"
                        />
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
                    <span className="count">{selectedLights.length}</span> sélectionnée{selectedLights.length !== 1 ? 's' : ''}
                  </div>
                  <div className="hue-lights-actions">
                    <button onClick={selectAllLights} className="hue-btn hue-btn-small">Tout</button>
                    <button onClick={deselectAllLights} className="hue-btn hue-btn-small">Aucun</button>
                  </div>
                </div>

                {/* Lights Grid - Scrollable */}
                <div className="hue-lights-scroll">
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
                      {filteredLights.map((light) => {
                        const isSelected = selectedLights.includes(light.id);
                        const isOn = light.state.on;
                        return (
                          <button
                            key={light.id}
                            onClick={() => toggleLight(light.id)}
                            className={`hue-light-card ${isSelected ? 'selected' : ''} ${isOn ? 'is-on' : ''}`}
                          >
                            {isOn && <div className="light-glow" />}
                            {isSelected && <div className="selection-ring" />}

                            <div className={`light-icon ${isOn ? 'on' : 'off'}`}>
                              <Lightbulb size={28} strokeWidth={1.5} />
                            </div>

                            <span className="light-name">{light.name}</span>
                            <span className="light-status">{isOn ? 'Allumée' : 'Éteinte'}</span>

                            {isSelected && (
                              <div className="check-badge">
                                <Check size={10} strokeWidth={3} />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
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
                        className={`hue-color-btn ${testingColor === color.id ? 'testing' : ''}`}
                        style={{ '--color': color.color }}
                        title={color.name}
                        disabled={testingColor !== null}
                      >
                        <div className="hue-color-swatch">
                          {testingColor === color.id && (
                            <div className="color-testing-indicator">
                              <Zap size={16} />
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Presets Section - Sans encadré */}
                <div className="hue-presets-section">
                  <div className="hue-presets-grid">
                    {PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => applyPreset(preset)}
                        className="hue-preset-card"
                      >
                        <span className="preset-icon">{preset.icon}</span>
                        <span className="preset-name">{preset.name}</span>
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

                  {/* Test Sequence Button */}
                  <button
                    onClick={testFullSequence}
                    className="hue-test-sequence-btn"
                    disabled={testingScenario !== null}
                  >
                    <Play size={16} />
                    Tester la séquence
                  </button>

                  {/* Events List */}
                  <div className="hue-events-list">
                    {GAME_EVENTS[activeGame]?.events.map((event) => {
                      const config = getEventConfig(activeGame, event.id);
                      const selectedColor = COLOR_PRESETS.find(c => c.id === config.color) || COLOR_PRESETS[5];
                      const EventIcon = EVENT_ICONS[event.id] || Sparkles;
                      const isConfigured = config.enabled && (config.lights || []).length > 0;
                      const isExpanded = editingEvent === `${activeGame}-${event.id}`;

                      return (
                        <div
                          key={event.id}
                          className={`hue-event-card ${config.enabled ? 'enabled' : ''} ${isConfigured ? 'configured' : ''} ${isExpanded ? 'expanded' : ''}`}
                          style={isConfigured ? { '--event-color': selectedColor.color } : {}}
                        >
                          <div
                            className="hue-event-header"
                            onClick={() => setEditingEvent(isExpanded ? null : `${activeGame}-${event.id}`)}
                          >
                            <div className="event-icon-wrap">
                              <EventIcon size={18} />
                            </div>
                            <div className="hue-event-info">
                              <div className="event-title-row">
                                <h4>{event.name}</h4>
                                {isConfigured && (
                                  <div
                                    className="event-color-dot"
                                    style={{ background: selectedColor.color }}
                                  />
                                )}
                              </div>
                              <p>{event.description}</p>
                            </div>
                            <div className="event-actions">
                              <ChevronDown size={18} className={`event-chevron ${isExpanded ? 'rotated' : ''}`} />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newConfig = { ...config, enabled: !config.enabled };
                                  saveEventConfig(activeGame, event.id, newConfig);
                                }}
                                className={`hue-toggle ${config.enabled ? 'active' : ''}`}
                              >
                                <div className="hue-toggle-thumb" />
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
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

    </div>
  );
}
