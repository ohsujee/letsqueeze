/**
 * Philips Hue Module
 * Module complet pour l'intégration des lumières Hue dans les jeux
 * 
 * Usage:
 * 
 * 1. Dans la page Profil/Settings:
 *    import { HueSettingsSection } from '@/hue-module';
 *    <HueSettingsSection userEmail={user.email} />
 * 
 * 2. Dans les jeux pour déclencher des effets:
 *    import { hueScenariosService } from '@/hue-module';
 *    hueScenariosService.trigger('alibi', 'goodAnswer');
 */

// Services
export { default as hueService } from './services/hueService';
export { default as hueScenariosService, COLORS, DEFAULT_SCENARIOS } from './services/hueScenariosService';

// Components
export { default as HueConnection } from './components/HueConnection';
export { default as HueLightSelector } from './components/HueLightSelector';
export { default as HueGameConfig, GAME_EVENTS } from './components/HueGameConfig';
export { default as HueSettingsSection } from './components/HueSettingsSection';
