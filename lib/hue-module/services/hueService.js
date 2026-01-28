/**
 * Philips Hue Service
 * Module de connexion et contrôle des lampes Hue
 * Compatible avec n'importe quel projet React/Next.js
 */

const HUE_STORAGE_KEY = 'hue_config';

class HueService {
  constructor() {
    this.bridgeIp = null;
    this.username = null;
    this.selectedLights = [];
    this.isConnected = false;
    this.effectsEnabled = true; // Toggle pour activer/désactiver les effets sans déconnecter
    this.loadConfig();
  }

  // Charger la config depuis localStorage
  loadConfig() {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(HUE_STORAGE_KEY);
    if (stored) {
      const config = JSON.parse(stored);
      this.bridgeIp = config.bridgeIp;
      this.username = config.username;
      this.selectedLights = config.selectedLights || [];
      this.effectsEnabled = config.effectsEnabled !== false; // Par défaut activé
      this.isConnected = !!(this.bridgeIp && this.username);
    }
  }

  // Sauvegarder la config dans localStorage
  saveConfig() {
    if (typeof window === 'undefined') return;
    localStorage.setItem(HUE_STORAGE_KEY, JSON.stringify({
      bridgeIp: this.bridgeIp,
      username: this.username,
      selectedLights: this.selectedLights,
      effectsEnabled: this.effectsEnabled
    }));
  }

  // Activer/désactiver les effets lumineux
  setEffectsEnabled(enabled) {
    this.effectsEnabled = enabled;
    this.saveConfig();
  }

  // Découvrir les bridges sur le réseau local (via proxy API pour éviter CORS)
  async discoverBridges() {
    try {
      const response = await fetch('/api/hue/discover');
      if (!response.ok) {
        throw new Error('Discovery service error');
      }
      const bridges = await response.json();
      if (bridges.error) {
        throw new Error(bridges.message || bridges.error);
      }
      return bridges.map(b => ({ ip: b.internalipaddress, id: b.id }));
    } catch (error) {
      console.error('Erreur découverte bridges:', error);
      return [];
    }
  }

  // Connecter au bridge (l'utilisateur doit appuyer sur le bouton du bridge)
  // Utilise un proxy API pour éviter les problèmes CORS/mixed content
  async connectToBridge(bridgeIp) {
    try {
      const response = await fetch('/api/hue/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bridgeIp })
      });

      if (!response.ok) {
        return { success: false, error: 'NETWORK', message: 'Impossible de contacter le bridge' };
      }

      const data = await response.json();

      if (data.error) {
        return { success: false, error: 'NETWORK', message: data.message || 'Erreur réseau' };
      }

      if (data[0]?.error?.type === 101) {
        return { success: false, error: 'PRESS_BUTTON', message: 'Appuyez sur le bouton du bridge Hue puis réessayez' };
      }

      if (data[0]?.success?.username) {
        this.bridgeIp = bridgeIp;
        this.username = data[0].success.username;
        this.isConnected = true;
        this.saveConfig();
        return { success: true };
      }

      return { success: false, error: 'UNKNOWN', message: 'Erreur inconnue' };
    } catch (error) {
      console.error('Connect error:', error);
      return { success: false, error: 'NETWORK', message: 'Impossible de contacter le bridge' };
    }
  }

  // Déconnecter
  disconnect() {
    this.bridgeIp = null;
    this.username = null;
    this.selectedLights = [];
    this.isConnected = false;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(HUE_STORAGE_KEY);
    }
  }

  // Récupérer toutes les lampes
  async getLights() {
    if (!this.isConnected) return [];
    try {
      const response = await fetch(`http://${this.bridgeIp}/api/${this.username}/lights`);
      const lights = await response.json();
      return Object.entries(lights).map(([id, light]) => ({
        id,
        name: light.name,
        state: light.state,
        type: light.type
      }));
    } catch (error) {
      console.error('Erreur récupération lampes:', error);
      return [];
    }
  }

  // Récupérer tous les groupes/zones
  async getGroups() {
    if (!this.isConnected) return [];
    try {
      const response = await fetch(`http://${this.bridgeIp}/api/${this.username}/groups`);
      const groups = await response.json();
      return Object.entries(groups).map(([id, group]) => ({
        id,
        name: group.name,
        type: group.type,
        lights: group.lights
      }));
    } catch (error) {
      console.error('Erreur récupération groupes:', error);
      return [];
    }
  }

  // Définir les lampes sélectionnées pour le jeu
  setSelectedLights(lightIds) {
    this.selectedLights = lightIds;
    this.saveConfig();
  }

  // Contrôler une lampe spécifique
  async setLightState(lightId, state) {
    if (!this.isConnected) return false;
    try {
      await fetch(`http://${this.bridgeIp}/api/${this.username}/lights/${lightId}/state`, {
        method: 'PUT',
        body: JSON.stringify(state)
      });
      return true;
    } catch (error) {
      console.error('Erreur contrôle lampe:', error);
      return false;
    }
  }

  // Contrôler toutes les lampes sélectionnées
  async setAllLightsState(state) {
    if (!this.isConnected || this.selectedLights.length === 0) return false;
    const promises = this.selectedLights.map(id => this.setLightState(id, state));
    await Promise.all(promises);
    return true;
  }

  // Sauvegarder l'état actuel des lampes (pour restaurer après)
  async saveCurrentState() {
    const lights = await this.getLights();
    this._savedState = {};
    for (const light of lights) {
      if (this.selectedLights.includes(light.id)) {
        this._savedState[light.id] = {
          on: light.state.on,
          bri: light.state.bri,
          hue: light.state.hue,
          sat: light.state.sat
        };
      }
    }
  }

  // Restaurer l'état sauvegardé
  async restoreState() {
    if (!this._savedState) return;
    for (const [lightId, state] of Object.entries(this._savedState)) {
      await this.setLightState(lightId, state);
    }
  }

  // Getters
  getConfig() {
    return {
      bridgeIp: this.bridgeIp,
      isConnected: this.isConnected,
      selectedLights: this.selectedLights
    };
  }
}

// Export singleton
const hueService = new HueService();
export default hueService;
