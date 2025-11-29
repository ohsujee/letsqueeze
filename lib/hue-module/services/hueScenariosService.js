/**
 * Hue Scenarios Service
 * Scénarios lumineux prédéfinis pour les événements de jeu
 */

import hueService from './hueService';

// Couleurs HSB pour Hue (hue: 0-65535, sat: 0-254, bri: 0-254)
const COLORS = {
  RED: { hue: 0, sat: 254, bri: 254 },
  GREEN: { hue: 25500, sat: 254, bri: 254 },
  BLUE: { hue: 46920, sat: 254, bri: 254 },
  YELLOW: { hue: 12750, sat: 254, bri: 254 },
  ORANGE: { hue: 6000, sat: 254, bri: 254 },
  PURPLE: { hue: 50000, sat: 254, bri: 254 },
  PINK: { hue: 56100, sat: 254, bri: 254 },
  CYAN: { hue: 35000, sat: 254, bri: 254 },
  WHITE: { hue: 0, sat: 0, bri: 254 },
  WARM_WHITE: { hue: 8000, sat: 140, bri: 200 },
  DIM_WHITE: { hue: 0, sat: 0, bri: 80 }
};

// Scénarios par défaut
const DEFAULT_SCENARIOS = {
  // Ambiance de fond pendant le jeu (lobby, attente)
  ambiance: {
    name: 'Ambiance globale',
    description: 'Ambiance de fond pendant le jeu',
    execute: async () => {
      await hueService.setAllLightsState({
        on: true,
        ...COLORS.PURPLE,
        bri: 150,
        transitiontime: 20 // 2 secondes
      });
    }
  },

  // Ambiance pendant une question (phase active)
  question: {
    name: 'Phase question',
    description: 'Ambiance pendant qu\'une question est affichée',
    execute: async () => {
      await hueService.setAllLightsState({
        on: true,
        ...COLORS.BLUE,
        bri: 180,
        transitiontime: 10 // 1 seconde
      });
    }
  },

  // Début d'un round/interrogatoire
  roundStart: {
    name: 'Début interrogatoire',
    description: 'Lancement d\'un nouveau round',
    execute: async () => {
      // Flash blanc puis ambiance question
      await hueService.setAllLightsState({
        on: true,
        ...COLORS.WHITE,
        bri: 254,
        transitiontime: 0
      });
      await sleep(300);
      await hueService.setAllLightsState({
        on: true,
        ...COLORS.BLUE,
        bri: 180,
        transitiontime: 10
      });
    }
  },

  // Bonne réponse
  goodAnswer: {
    name: 'Bonne réponse',
    description: 'Flash vert pour une bonne réponse',
    execute: async () => {
      const originalState = await saveCurrentLightState();
      
      // Flash vert
      await hueService.setAllLightsState({
        on: true,
        ...COLORS.GREEN,
        bri: 254,
        transitiontime: 0
      });
      await sleep(500);
      
      // Pulse
      await hueService.setAllLightsState({
        on: true,
        ...COLORS.GREEN,
        bri: 100,
        transitiontime: 2
      });
      await sleep(300);
      await hueService.setAllLightsState({
        on: true,
        ...COLORS.GREEN,
        bri: 254,
        transitiontime: 2
      });
      await sleep(500);
      
      // Retour ambiance
      await restoreLightState(originalState);
    }
  },

  // Mauvaise réponse
  badAnswer: {
    name: 'Mauvaise réponse',
    description: 'Flash rouge pour une mauvaise réponse',
    execute: async () => {
      const originalState = await saveCurrentLightState();
      
      // Flash rouge
      await hueService.setAllLightsState({
        on: true,
        ...COLORS.RED,
        bri: 254,
        transitiontime: 0
      });
      await sleep(400);
      await hueService.setAllLightsState({
        on: true,
        ...COLORS.RED,
        bri: 50,
        transitiontime: 1
      });
      await sleep(200);
      await hueService.setAllLightsState({
        on: true,
        ...COLORS.RED,
        bri: 254,
        transitiontime: 1
      });
      await sleep(400);
      
      // Retour ambiance
      await restoreLightState(originalState);
    }
  },

  // Temps écoulé
  timeUp: {
    name: 'Temps écoulé',
    description: 'Effet quand le temps est écoulé',
    execute: async () => {
      const originalState = await saveCurrentLightState();
      
      // Clignotement orange rapide
      for (let i = 0; i < 3; i++) {
        await hueService.setAllLightsState({
          on: true,
          ...COLORS.ORANGE,
          bri: 254,
          transitiontime: 0
        });
        await sleep(150);
        await hueService.setAllLightsState({
          on: true,
          ...COLORS.ORANGE,
          bri: 50,
          transitiontime: 0
        });
        await sleep(150);
      }
      
      // Retour ambiance
      await restoreLightState(originalState);
    }
  },

  // Compte à rebours (transition progressive)
  countdown: {
    name: 'Compte à rebours',
    description: 'Transition du vert au rouge pendant le temps imparti',
    execute: async (duration = 10000) => {
      const steps = 10;
      const stepDuration = duration / steps;
      
      for (let i = 0; i <= steps; i++) {
        const progress = i / steps;
        // Interpolation vert -> jaune -> orange -> rouge
        const hue = Math.round(25500 * (1 - progress)); // 25500 (vert) -> 0 (rouge)
        
        await hueService.setAllLightsState({
          on: true,
          hue,
          sat: 254,
          bri: Math.round(150 + (progress * 100)),
          transitiontime: Math.round(stepDuration / 100)
        });
        
        if (i < steps) await sleep(stepDuration);
      }
    }
  },

  // Fin de partie - Victoire
  victory: {
    name: 'Victoire',
    description: 'Célébration pour un bon score',
    execute: async () => {
      // Arc-en-ciel festif
      const colors = [COLORS.GREEN, COLORS.CYAN, COLORS.BLUE, COLORS.PURPLE, COLORS.PINK, COLORS.YELLOW];
      
      for (let round = 0; round < 2; round++) {
        for (const color of colors) {
          await hueService.setAllLightsState({
            on: true,
            ...color,
            bri: 254,
            transitiontime: 2
          });
          await sleep(300);
        }
      }
      
      // Fin sur vert victoire
      await hueService.setAllLightsState({
        on: true,
        ...COLORS.GREEN,
        bri: 200,
        transitiontime: 10
      });
    }
  },

  // Fin de partie - Défaite
  defeat: {
    name: 'Défaite',
    description: 'Ambiance pour un score décevant',
    execute: async () => {
      await hueService.setAllLightsState({
        on: true,
        ...COLORS.RED,
        bri: 80,
        transitiontime: 20
      });
      await sleep(1000);
      await hueService.setAllLightsState({
        on: true,
        ...COLORS.DIM_WHITE,
        transitiontime: 30
      });
    }
  },

  // Buzz (pour Let's Queeeze)
  buzz: {
    name: 'Buzz',
    description: 'Flash quand un joueur buzze',
    execute: async () => {
      const originalState = await saveCurrentLightState();
      
      await hueService.setAllLightsState({
        on: true,
        ...COLORS.WHITE,
        bri: 254,
        transitiontime: 0
      });
      await sleep(200);
      
      await restoreLightState(originalState);
    }
  },

  // Reset - éteindre les lampes
  off: {
    name: 'Éteindre',
    description: 'Éteindre les lampes',
    execute: async () => {
      await hueService.setAllLightsState({
        on: false,
        transitiontime: 10
      });
    }
  },

  // Reset - retour normal
  reset: {
    name: 'Reset',
    description: 'Retour à un éclairage normal',
    execute: async () => {
      await hueService.setAllLightsState({
        on: true,
        ...COLORS.WARM_WHITE,
        transitiontime: 20
      });
    }
  }
};

// Helpers
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let _savedState = null;

async function saveCurrentLightState() {
  if (!hueService.isConnected) return null;
  const lights = await hueService.getLights();
  const state = {};
  for (const light of lights) {
    if (hueService.selectedLights.includes(light.id)) {
      state[light.id] = {
        on: light.state.on,
        bri: light.state.bri,
        hue: light.state.hue,
        sat: light.state.sat
      };
    }
  }
  _savedState = state;
  return state;
}

async function restoreLightState(state) {
  if (!state) state = _savedState;
  if (!state) return;
  
  for (const [lightId, lightState] of Object.entries(state)) {
    await hueService.setLightState(lightId, {
      ...lightState,
      transitiontime: 10
    });
  }
}

// Mapping couleur ID -> HSB values
const COLOR_MAP = {
  red: { hue: 0, sat: 254 },
  orange: { hue: 6000, sat: 254 },
  yellow: { hue: 12750, sat: 254 },
  green: { hue: 25500, sat: 254 },
  cyan: { hue: 35000, sat: 254 },
  blue: { hue: 46920, sat: 254 },
  purple: { hue: 50000, sat: 254 },
  pink: { hue: 56100, sat: 254 },
  white: { hue: 0, sat: 0 },
  warm: { hue: 8000, sat: 140 }
};

// Événements temporaires qui doivent revenir à l'ambiance "question" après leur animation
const TEMPORARY_EVENTS = ['goodAnswer', 'badAnswer', 'timeUp', 'buzz'];

// Durée des animations temporaires (en ms) avant retour à l'ambiance
// Ces durées doivent être APRÈS la fin de l'animation applyEffect
const TEMPORARY_EVENT_DURATIONS = {
  goodAnswer: 1800,  // flash/pulse ~1.1s + 700ms de visibilité
  badAnswer: 1800,   // flash/pulse ~1.1s + 700ms de visibilité
  timeUp: 2200,      // pulse 3x ~1.8s + 400ms de visibilité
  buzz: 800          // flash court ~600ms + 200ms de visibilité
};

// Classe pour gérer les scénarios
class HueScenariosService {
  constructor() {
    this.scenarios = { ...DEFAULT_SCENARIOS };
    this.gameConfigs = this.loadGameConfigs();
    this._returnToQuestionTimeout = null; // Pour annuler le retour si nouvel événement
  }

  // Charger les configs de jeux depuis localStorage (ancien format)
  loadGameConfigs() {
    if (typeof window === 'undefined') return {};
    const stored = localStorage.getItem('hue_game_configs');
    return stored ? JSON.parse(stored) : {};
  }

  // Charger les configs d'événements (nouveau format avec couleurs/lampes personnalisées)
  loadEventConfigs() {
    if (typeof window === 'undefined') return {};
    const stored = localStorage.getItem('hue_event_configs');
    return stored ? JSON.parse(stored) : {};
  }

  // Sauvegarder les configs de jeux
  saveGameConfigs() {
    if (typeof window === 'undefined') return;
    localStorage.setItem('hue_game_configs', JSON.stringify(this.gameConfigs));
  }

  // Obtenir la config d'un jeu
  getGameConfig(gameId) {
    return this.gameConfigs[gameId] || {};
  }

  // Définir le mapping événement -> scénario pour un jeu
  setGameEventMapping(gameId, eventName, scenarioId, enabled = true) {
    if (!this.gameConfigs[gameId]) {
      this.gameConfigs[gameId] = { events: {} };
    }
    this.gameConfigs[gameId].events[eventName] = { scenarioId, enabled };
    this.saveGameConfigs();
  }

  // Activer/désactiver un événement pour un jeu
  toggleGameEvent(gameId, eventName, enabled) {
    if (this.gameConfigs[gameId]?.events?.[eventName]) {
      this.gameConfigs[gameId].events[eventName].enabled = enabled;
      this.saveGameConfigs();
    }
  }

  // Appliquer un effet sur des lampes spécifiques
  // La couleur RESTE après l'effet (pas de retour auto à l'ambiance)
  async applyEffect(lightIds, colorId, effect, bri = 254) {
    if (!lightIds || lightIds.length === 0) return;

    const color = COLOR_MAP[colorId] || COLOR_MAP.blue;
    const baseState = { on: true, hue: color.hue, sat: color.sat, bri };

    // Appliquer à chaque lampe spécifiquement
    const applyToLights = async (state) => {
      for (const lightId of lightIds) {
        await hueService.setLightState(lightId, state);
      }
    };

    switch (effect) {
      case 'solid':
        // Couleur fixe - reste indéfiniment
        await applyToLights({ ...baseState, transitiontime: 5 });
        break;

      case 'flash':
        // Flash puis reste sur la couleur
        await applyToLights({ ...baseState, bri: 254, transitiontime: 0 });
        await sleep(150);
        await applyToLights({ ...baseState, bri: 50, transitiontime: 1 });
        await sleep(150);
        await applyToLights({ ...baseState, bri: 254, transitiontime: 1 });
        await sleep(150);
        await applyToLights({ ...baseState, bri: 50, transitiontime: 1 });
        await sleep(150);
        // Reste sur la couleur de l'événement
        await applyToLights({ ...baseState, bri: 200, transitiontime: 5 });
        break;

      case 'pulse':
        // 3 pulsations puis reste sur la couleur
        for (let i = 0; i < 3; i++) {
          await applyToLights({ ...baseState, bri: 254, transitiontime: 2 });
          await sleep(300);
          await applyToLights({ ...baseState, bri: 80, transitiontime: 2 });
          await sleep(300);
        }
        // Reste sur la couleur de l'événement
        await applyToLights({ ...baseState, bri: 200, transitiontime: 5 });
        break;

      case 'rainbow':
        // Cycle arc-en-ciel puis reste sur la couleur configurée
        const rainbowColors = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink'];
        for (const c of rainbowColors) {
          const col = COLOR_MAP[c];
          await applyToLights({ on: true, hue: col.hue, sat: col.sat, bri: 254, transitiontime: 2 });
          await sleep(250);
        }
        // Reste sur la couleur configurée pour cet événement
        await applyToLights({ ...baseState, bri: 200, transitiontime: 5 });
        break;

      default:
        await applyToLights({ ...baseState, transitiontime: 5 });
    }
  }

  // Retourner à l'ambiance "question" après un événement temporaire
  async returnToQuestionAmbiance(gameId) {
    if (!hueService.isConnected) return;

    // Vérifier si l'événement "question" est configuré
    const eventConfigs = this.loadEventConfigs();
    const questionConfig = eventConfigs[gameId]?.['question'];

    if (questionConfig?.enabled && questionConfig.lights?.length > 0) {
      // Utiliser la config personnalisée de "question"
      await this.applyEffect(questionConfig.lights, questionConfig.color || 'blue', 'solid', 180);
    } else {
      // Fallback : utiliser le scénario par défaut "question"
      await this.scenarios.question?.execute?.();
    }
  }

  // Déclencher un scénario pour un événement de jeu
  // UNIQUEMENT si configuré dans /profile/hue - aucun fallback hardcodé
  async trigger(gameId, eventName, params = {}) {
    if (!hueService.isConnected) return false;

    // Annuler tout retour à l'ambiance question en cours
    if (this._returnToQuestionTimeout) {
      clearTimeout(this._returnToQuestionTimeout);
      this._returnToQuestionTimeout = null;
    }

    // Vérifier la config personnalisée (hue_event_configs)
    const eventConfigs = this.loadEventConfigs();
    const customConfig = eventConfigs[gameId]?.[eventName];

    // Si pas configuré ou pas activé → ne rien faire (garder le scénario Hue par défaut de l'utilisateur)
    if (!customConfig?.enabled) return false;

    const eventLights = customConfig.lights || [];
    const color = customConfig.color || 'blue';
    const effect = customConfig.effect || 'flash';

    // Si pas de lampes sélectionnées → ne rien faire
    if (eventLights.length === 0) return false;

    // Récupérer les lampes maîtres (sélectionnées dans l'onglet Lampes)
    const masterLights = hueService.selectedLights || [];

    // Trouver les lampes du jeu qui ne sont PAS sélectionnées pour cet événement → les éteindre
    const lightsToTurnOff = masterLights.filter(id => !eventLights.includes(id));

    try {
      // Éteindre les lampes non sélectionnées pour cet événement
      for (const lightId of lightsToTurnOff) {
        await hueService.setLightState(lightId, { on: false, transitiontime: 2 });
      }

      // Appliquer l'effet sur les lampes de l'événement
      await this.applyEffect(eventLights, color, effect);

      // Si c'est un événement temporaire, programmer le retour à l'ambiance "question"
      if (TEMPORARY_EVENTS.includes(eventName)) {
        const duration = TEMPORARY_EVENT_DURATIONS[eventName] || 1000;
        this._returnToQuestionTimeout = setTimeout(() => {
          this.returnToQuestionAmbiance(gameId);
          this._returnToQuestionTimeout = null;
        }, duration);
      }

      return true;
    } catch (error) {
      console.error(`Erreur effet ${gameId}/${eventName}:`, error);
      return false;
    }
  }

  // Tester un scénario directement
  async testScenario(scenarioId) {
    if (!hueService.isConnected) return false;
    
    const scenario = this.scenarios[scenarioId];
    if (!scenario) return false;
    
    try {
      await scenario.execute();
      return true;
    } catch (error) {
      console.error(`Erreur test scénario ${scenarioId}:`, error);
      return false;
    }
  }

  // Obtenir la liste des scénarios disponibles
  getAvailableScenarios() {
    return Object.entries(this.scenarios).map(([id, scenario]) => ({
      id,
      name: scenario.name,
      description: scenario.description
    }));
  }
}

// Export singleton
const hueScenariosService = new HueScenariosService();
export { hueScenariosService, COLORS, DEFAULT_SCENARIOS };
export default hueScenariosService;
