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

      <style jsx>{`
        .hue-page {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary, #0a0a0f);
          color: white;
          position: relative;
          overflow-x: hidden;
          width: 100%;
          max-width: 100vw;
        }

        /* Background - Style Guide Section 7.1 */
        .hue-bg {
          position: fixed;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          background:
            radial-gradient(ellipse at 20% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 60%, rgba(59, 130, 246, 0.10) 0%, transparent 50%),
            radial-gradient(ellipse at 40% 80%, rgba(245, 158, 11, 0.08) 0%, transparent 50%);
        }
        .hue-bg-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          animation: float 8s ease-in-out infinite;
        }
        .hue-bg-orb-1 {
          top: -10%;
          left: 20%;
          width: 400px;
          height: 400px;
          background: rgba(139, 92, 246, 0.12);
        }
        .hue-bg-orb-2 {
          bottom: 20%;
          right: 10%;
          width: 300px;
          height: 300px;
          background: rgba(59, 130, 246, 0.10);
          animation-delay: -3s;
        }
        .hue-bg-orb-3 {
          top: 50%;
          left: -10%;
          width: 250px;
          height: 250px;
          background: rgba(245, 158, 11, 0.08);
          animation-delay: -5s;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }

        /* Header */
        .hue-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(10, 10, 15, 0.9);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(139, 92, 246, 0.2);
        }
        .hue-header-inner {
          max-width: 800px;
          margin: 0 auto;
          padding: 16px 24px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .hue-back-btn {
          width: 44px;
          height: 44px;
          border-radius: 12px;
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
          background: rgba(139, 92, 246, 0.15);
          border-color: rgba(139, 92, 246, 0.3);
        }
        .hue-header-title {
          flex: 1;
        }
        .hue-header-title h1 {
          font-family: 'Bungee', cursive;
          font-size: 1.25rem;
          font-weight: 400;
          margin: 0;
          text-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
        }
        .hue-header-title p {
          font-family: 'Inter', sans-serif;
          font-size: 0.8125rem;
          color: rgba(255, 255, 255, 0.5);
          margin: 0;
        }
        .hue-status {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          font-family: 'Inter', sans-serif;
          font-size: 0.75rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.5);
        }
        .hue-status.connected {
          background: rgba(34, 197, 94, 0.15);
          border-color: rgba(34, 197, 94, 0.3);
          color: #22C55E;
        }

        /* Main */
        .hue-main {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          position: relative;
          z-index: 1;
          max-width: 800px;
          width: 100%;
          margin: 0 auto;
          padding: 24px;
          padding-bottom: calc(100px + var(--safe-area-bottom, 0px));
          box-sizing: border-box;
        }

        /* Hero - Compact */
        .hue-hero {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: rgba(20, 20, 30, 0.8);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(139, 92, 246, 0.25);
          border-radius: 16px;
          margin-bottom: 20px;
        }
        .hue-hero-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, #8B5CF6, #3B82F6);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
        }
        .hue-hero-content h2 {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1rem;
          font-weight: 700;
          margin: 0 0 2px 0;
          color: #ffffff;
        }
        .hue-hero-content p {
          font-family: 'Inter', sans-serif;
          font-size: 0.8125rem;
          color: rgba(255, 255, 255, 0.6);
          margin: 0;
          line-height: 1.4;
        }

        /* Tabs */
        .hue-tabs {
          display: flex;
          gap: 6px;
          padding: 4px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 14px;
          margin-bottom: 24px;
        }
        .hue-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 16px;
          border-radius: 10px;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .hue-tab:hover:not(.disabled) {
          color: rgba(255, 255, 255, 0.8);
          background: rgba(255, 255, 255, 0.05);
        }
        .hue-tab.active {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(139, 92, 246, 0.15));
          color: white;
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.2);
        }
        .hue-tab.disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        /* Content */
        .hue-content {
        }
        .hue-section {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* Buttons - Style Guide 3D Effect */
        .hue-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: 12px;
          border: none;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .hue-btn-primary {
          background: linear-gradient(135deg, #8B5CF6, #7c3aed);
          color: white;
          box-shadow:
            0 4px 0 #6d28d9,
            0 6px 20px rgba(139, 92, 246, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }
        .hue-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow:
            0 6px 0 #6d28d9,
            0 10px 30px rgba(139, 92, 246, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }
        .hue-btn-primary:active {
          transform: translateY(2px);
          box-shadow:
            0 2px 0 #6d28d9,
            0 4px 10px rgba(139, 92, 246, 0.3);
        }
        .hue-btn-success {
          background: linear-gradient(135deg, #22C55E, #16a34a);
          color: white;
          box-shadow:
            0 4px 0 #15803d,
            0 6px 20px rgba(34, 197, 94, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }
        .hue-btn-success:hover {
          transform: translateY(-2px);
          box-shadow:
            0 6px 0 #15803d,
            0 10px 30px rgba(34, 197, 94, 0.5);
        }
        .hue-btn-danger {
          background: rgba(239, 68, 68, 0.15);
          color: #EF4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .hue-btn-danger:hover {
          background: rgba(239, 68, 68, 0.25);
          border-color: rgba(239, 68, 68, 0.5);
        }
        .hue-btn-large {
          width: 100%;
          padding: 16px 24px;
          font-size: 1rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .hue-btn-small {
          padding: 8px 12px;
          font-size: 0.75rem;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          box-shadow: none;
        }
        .hue-btn-small:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: none;
        }
        .hue-btn-accent {
          background: linear-gradient(135deg, #8B5CF6, #7c3aed);
          box-shadow:
            0 4px 0 #6d28d9,
            0 6px 15px rgba(139, 92, 246, 0.3);
        }
        .hue-btn-test {
          margin-top: 12px;
        }
        .hue-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
        }

        .hue-link-btn {
          background: none;
          border: none;
          color: #a78bfa;
          font-family: 'Inter', sans-serif;
          font-size: 0.875rem;
          cursor: pointer;
          padding: 8px;
          transition: color 0.2s;
        }
        .hue-link-btn:hover {
          color: #8b5cf6;
          text-decoration: underline;
        }

        /* Connected Card */
        .hue-connected-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: rgba(20, 20, 30, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 16px;
          box-shadow:
            0 0 30px rgba(34, 197, 94, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }
        .hue-connected-icon {
          width: 56px;
          height: 56px;
          border-radius: 12px;
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
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.125rem;
          font-weight: 600;
          color: #22C55E;
          margin: 0;
        }
        .hue-connected-info p {
          font-family: 'Inter', sans-serif;
          color: rgba(34, 197, 94, 0.7);
          margin: 0;
          font-size: 0.875rem;
        }

        /* Connection Flow */
        .hue-connection-flow {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .hue-instruction-card {
          padding: 12px 16px;
          background: rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 10px;
          text-align: center;
        }
        .hue-instruction-card p {
          font-family: 'Inter', sans-serif;
          font-size: 0.8125rem;
          color: rgba(255, 255, 255, 0.8);
          margin: 0;
          line-height: 1.4;
        }
        .hue-instruction-card strong {
          color: #a78bfa;
        }
        .hue-instruction-card.error {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.3);
        }
        .hue-instruction-card.error p {
          color: #fca5a5;
        }

        /* Bridges List */
        .hue-bridges-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .hue-bridge-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
          width: 100%;
        }
        .hue-bridge-item:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(139, 92, 246, 0.3);
        }
        .hue-bridge-item.selected {
          background: rgba(139, 92, 246, 0.15);
          border-color: rgba(139, 92, 246, 0.4);
        }
        .hue-bridge-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .hue-bridge-item.selected .hue-bridge-icon {
          background: linear-gradient(135deg, #8B5CF6, #7c3aed);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
        }
        .hue-bridge-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .hue-bridge-ip {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600;
          color: white;
        }
        .hue-bridge-id {
          font-family: 'Inter', sans-serif;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
        }
        .hue-bridge-check {
          color: #a78bfa;
        }

        /* Input */
        .hue-input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .hue-input-group label {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.7);
        }
        .hue-input {
          width: 100%;
          padding: 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: white;
          font-family: 'Inter', sans-serif;
          font-size: 1rem;
          transition: all 0.2s;
        }
        .hue-input:focus {
          outline: none;
          border-color: #8B5CF6;
          background: rgba(139, 92, 246, 0.1);
          box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.15);
        }
        .hue-input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        /* Instruction Card */
        .hue-connect-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          width: 100%;
          padding: 14px 20px;
          background: linear-gradient(135deg, #22C55E, #16a34a);
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow:
            0 4px 0 #15803d,
            0 6px 20px rgba(34, 197, 94, 0.4);
        }
        .hue-connect-btn:hover {
          transform: translateY(-2px);
          box-shadow:
            0 6px 0 #15803d,
            0 10px 30px rgba(34, 197, 94, 0.5);
        }
        .hue-connect-btn:active {
          transform: translateY(2px);
          box-shadow:
            0 2px 0 #15803d,
            0 4px 10px rgba(34, 197, 94, 0.3);
        }
        .hue-connect-btn:disabled {
          opacity: 0.6;
          cursor: wait;
          transform: none;
        }
        .hue-connect-hint {
          font-family: 'Inter', sans-serif;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.8);
        }
        .hue-connect-label {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1rem;
          font-weight: 700;
          color: white;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .hue-instruction-card {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 12px;
        }
        .hue-instruction-icon {
          font-size: 1.5rem;
        }
        .hue-instruction-card p {
          font-family: 'Inter', sans-serif;
          margin: 0;
          color: #fbbf24;
          line-height: 1.5;
          font-size: 0.9375rem;
        }

        /* Error Card */
        .hue-error-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 12px;
          color: #EF4444;
        }
        .hue-error-card p {
          font-family: 'Inter', sans-serif;
          margin: 0;
        }

        /* Room Selector - Compact horizontal scroll */
        .hue-room-selector {
          margin-bottom: 12px;
        }
        .hue-room-buttons {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding-bottom: 4px;
        }
        .hue-room-buttons::-webkit-scrollbar {
          display: none;
        }
        .hue-room-btn {
          padding: 6px 12px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.6);
          font-family: 'Inter', sans-serif;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .hue-room-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(139, 92, 246, 0.3);
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
          padding: 10px 12px;
          background: rgba(20, 20, 30, 0.6);
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          margin-bottom: 12px;
        }
        .hue-lights-count {
          font-family: 'Inter', sans-serif;
          font-size: 0.8125rem;
          color: rgba(255, 255, 255, 0.6);
        }
        .hue-lights-count .count {
          font-weight: 700;
          color: #a78bfa;
        }
        .hue-lights-actions {
          display: flex;
          gap: 6px;
        }
        .hue-lights-scroll {
          position: relative;
        }
        .hue-lights-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px;
          gap: 16px;
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
          padding: 48px;
          gap: 12px;
          color: rgba(255, 255, 255, 0.3);
          text-align: center;
        }
        .hue-lights-empty p {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.125rem;
          margin: 0;
        }
        .hue-lights-empty span {
          font-family: 'Inter', sans-serif;
          font-size: 0.875rem;
        }
        .hue-lights-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        /* Light Card - Premium Design */
        .hue-light-card {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 18px 12px 14px;
          background: linear-gradient(145deg, rgba(30, 30, 40, 0.8), rgba(20, 20, 28, 0.9));
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          cursor: pointer;
          text-align: center;
          min-width: 0;
          overflow: hidden;
          transition: transform 0.2s, border-color 0.3s;
        }
        .hue-light-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.04) 0%, transparent 60%);
          pointer-events: none;
        }
        .hue-light-card:hover {
          border-color: rgba(255, 255, 255, 0.12);
        }

        /* Selection Ring */
        .selection-ring {
          position: absolute;
          inset: -1px;
          border-radius: 17px;
          border: 2px solid transparent;
          background: linear-gradient(135deg, #8B5CF6, #6366F1) border-box;
          -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          animation: pulse-ring 2s ease-in-out infinite;
        }
        @keyframes pulse-ring {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        /* Light Glow - For ON state */
        .light-glow {
          position: absolute;
          top: -20px;
          left: 50%;
          transform: translateX(-50%);
          width: 80px;
          height: 80px;
          background: radial-gradient(circle, rgba(251, 191, 36, 0.4) 0%, rgba(251, 191, 36, 0.1) 40%, transparent 70%);
          pointer-events: none;
          animation: glow-pulse 3s ease-in-out infinite;
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.8; transform: translateX(-50%) scale(1); }
          50% { opacity: 1; transform: translateX(-50%) scale(1.1); }
        }

        /* Light Icon */
        .light-icon {
          position: relative;
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          z-index: 1;
        }
        .light-icon.off {
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.35);
        }
        .light-icon.on {
          background: linear-gradient(145deg, #FCD34D, #F59E0B);
          color: #78350F;
          box-shadow:
            0 4px 20px rgba(251, 191, 36, 0.5),
            0 0 40px rgba(251, 191, 36, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }

        /* Light Rays - Decorative effect for ON */
        .light-rays {
          position: absolute;
          inset: -8px;
          border-radius: 20px;
          background: conic-gradient(
            from 0deg,
            transparent 0deg,
            rgba(251, 191, 36, 0.15) 20deg,
            transparent 40deg,
            rgba(251, 191, 36, 0.1) 60deg,
            transparent 80deg,
            rgba(251, 191, 36, 0.15) 100deg,
            transparent 120deg
          );
          animation: rotate-rays 8s linear infinite;
          pointer-events: none;
        }
        @keyframes rotate-rays {
          to { transform: rotate(360deg); }
        }

        /* Light Name */
        .light-name {
          display: block;
          width: 100%;
          font-family: 'Space Grotesk', system-ui, sans-serif;
          font-weight: 600;
          font-size: 0.8125rem;
          color: #ffffff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          letter-spacing: -0.01em;
          z-index: 1;
        }

        /* Light Status */
        .light-status {
          display: block;
          font-family: system-ui, sans-serif;
          font-size: 0.6875rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: rgba(255, 255, 255, 0.35);
          z-index: 1;
        }
        .hue-light-card.is-on .light-status {
          color: #FCD34D;
          text-shadow: 0 0 10px rgba(251, 191, 36, 0.5);
        }

        /* Check Badge */
        .check-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, #8B5CF6, #7C3AED);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 2px 8px rgba(139, 92, 246, 0.5);
          z-index: 2;
        }

        /* Selected state enhancements */
        .hue-light-card.selected {
          background: linear-gradient(145deg, rgba(139, 92, 246, 0.15), rgba(99, 102, 241, 0.1));
        }
        .hue-light-card.selected .light-icon.off {
          background: rgba(139, 92, 246, 0.2);
          color: rgba(167, 139, 250, 0.8);
        }

        /* Config Section */
        .hue-config-section {
          background: rgba(20, 20, 30, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .hue-config-section:last-child {
          margin-bottom: 0;
        }
        .hue-config-section h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0 0 8px 0;
          color: white;
        }
        .hue-section-desc {
          font-family: 'Inter', sans-serif;
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.875rem;
          margin: 0 0 16px 0;
        }

        /* Color Grid */
        .hue-color-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
        }
        .hue-color-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          aspect-ratio: 1;
          padding: 8px;
          background: rgba(255, 255, 255, 0.03);
          border: 2px solid transparent;
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .hue-color-btn:hover:not(:disabled) {
          transform: scale(1.08);
          border-color: var(--color);
          box-shadow: 0 0 25px color-mix(in srgb, var(--color) 40%, transparent);
        }
        .hue-color-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .hue-color-btn.testing {
          animation: color-pulse 0.6s ease-in-out infinite;
          border-color: var(--color);
          box-shadow: 0 0 30px color-mix(in srgb, var(--color) 50%, transparent);
        }
        @keyframes color-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .hue-color-swatch {
          width: 100%;
          height: 100%;
          border-radius: 10px;
          background: var(--color);
          box-shadow:
            0 4px 12px color-mix(in srgb, var(--color) 40%, transparent),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .color-testing-indicator {
          color: white;
          animation: zap-pulse 0.4s ease-in-out infinite;
          filter: drop-shadow(0 0 8px white);
        }
        @keyframes zap-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.9); }
        }

        /* Presets Section */
        .hue-presets-section {
          margin-bottom: 20px;
        }
        .hue-presets-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        .hue-preset-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 16px 10px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .hue-preset-card:hover {
          border-color: rgba(139, 92, 246, 0.5);
          background: rgba(139, 92, 246, 0.1);
        }
        .hue-preset-card:active {
          transform: scale(0.97);
        }
        .preset-icon {
          font-size: 1.75rem;
        }
        .preset-name {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.75rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
        }

        /* Test Sequence Button - Outline style */
        .hue-test-sequence-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 10px 16px;
          margin-bottom: 14px;
          background: transparent;
          border: 1px solid rgba(139, 92, 246, 0.4);
          border-radius: 10px;
          color: #a78bfa;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .hue-test-sequence-btn:hover {
          background: rgba(139, 92, 246, 0.1);
          border-color: rgba(139, 92, 246, 0.6);
        }
        .hue-test-sequence-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Game Tabs */
        .hue-game-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }
        .hue-game-tab {
          padding: 8px 16px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: none;
          color: rgba(255, 255, 255, 0.6);
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .hue-game-tab:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .hue-game-tab.active {
          background: linear-gradient(135deg, #8B5CF6, #7c3aed);
          color: white;
          box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
        }

        /* Events List */
        .hue-events-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .hue-event-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        .hue-event-card.enabled {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.12);
        }
        .hue-event-card.configured {
          border-color: color-mix(in srgb, var(--event-color) 40%, transparent);
          box-shadow: 0 0 20px color-mix(in srgb, var(--event-color) 15%, transparent);
        }
        .hue-event-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
        }
        .event-icon-wrap {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.5);
          flex-shrink: 0;
          transition: all 0.3s;
        }
        .hue-event-card.enabled .event-icon-wrap {
          background: rgba(139, 92, 246, 0.2);
          color: #a78bfa;
        }
        .hue-event-card.configured .event-icon-wrap {
          background: color-mix(in srgb, var(--event-color) 25%, transparent);
          color: var(--event-color);
        }
        .hue-event-info {
          flex: 1;
          min-width: 0;
        }
        .event-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .hue-event-info h4 {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.9375rem;
          font-weight: 600;
          margin: 0;
        }
        .event-color-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
          box-shadow: 0 0 8px currentColor;
        }
        .hue-event-info p {
          font-family: 'Inter', sans-serif;
          font-size: 0.8125rem;
          color: rgba(255, 255, 255, 0.45);
          margin: 2px 0 0 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .event-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .event-chevron {
          color: rgba(255, 255, 255, 0.4);
          transition: transform 0.2s ease;
        }
        .event-chevron.rotated {
          transform: rotate(180deg);
        }
        .hue-event-card.expanded .event-chevron {
          color: #a78bfa;
        }
        .hue-event-header {
          cursor: pointer;
        }
        .hue-event-header:hover .event-chevron {
          color: rgba(255, 255, 255, 0.7);
        }

        /* Toggle - Style Guide */
        .hue-toggle {
          width: 52px;
          height: 28px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid rgba(255, 255, 255, 0.1);
          cursor: pointer;
          position: relative;
          transition: all 0.3s ease;
          flex-shrink: 0;
        }
        .hue-toggle.active {
          background: linear-gradient(135deg, #8B5CF6, #7c3aed);
          border-color: transparent;
          box-shadow: 0 0 15px rgba(139, 92, 246, 0.4);
        }
        .hue-toggle-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        .hue-toggle.active .hue-toggle-thumb {
          transform: translateX(24px);
        }

        /* Event Config */
        .hue-event-config {
          padding: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .hue-config-row {
          margin-bottom: 16px;
        }
        .hue-config-row-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .hue-config-row-header label {
          margin-bottom: 0;
        }
        .hue-config-row-actions {
          display: flex;
          gap: 8px;
        }
        .hue-mini-btn {
          padding: 4px 8px;
          font-family: 'Inter', sans-serif;
          font-size: 0.75rem;
          background: rgba(255, 255, 255, 0.08);
          border: none;
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          transition: all 0.2s;
        }
        .hue-mini-btn:hover {
          background: rgba(139, 92, 246, 0.2);
          color: #a78bfa;
        }
        .hue-config-row label {
          display: block;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 8px;
        }
        .hue-no-lights {
          font-family: 'Inter', sans-serif;
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.4);
          font-style: italic;
          margin: 0;
        }
        .hue-event-lights {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .hue-event-light {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.6);
          font-family: 'Inter', sans-serif;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .hue-event-light:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(139, 92, 246, 0.3);
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
          gap: 8px;
          flex-wrap: wrap;
        }
        .hue-color-option {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: var(--color);
          border: 2px solid transparent;
          cursor: pointer;
          transition: all 0.2s;
        }
        .hue-color-option:hover {
          transform: scale(1.1);
          box-shadow: 0 0 15px color-mix(in srgb, var(--color) 50%, transparent);
        }
        .hue-color-option.selected {
          border-color: white;
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
        }
        .hue-effect-select {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .hue-effect-option {
          padding: 8px 12px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.7);
          font-family: 'Inter', sans-serif;
          font-size: 0.875rem;
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
            padding: 12px;
            padding-bottom: calc(100px + var(--safe-area-bottom, 0px));
          }
          .hue-hero {
            padding: 12px;
          }
          .hue-hero-icon {
            width: 40px;
            height: 40px;
          }
          .hue-config-section {
            padding: 14px;
          }
          .hue-color-grid {
            grid-template-columns: repeat(5, 1fr);
            gap: 8px;
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
          .hue-tab span {
            display: none;
          }
          .hue-tab {
            padding: 12px;
          }
        }
      `}</style>
    </div>
  );
}
