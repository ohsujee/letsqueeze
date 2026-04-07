/**
 * Avatar Configuration
 * Images are static in /public/images/avatars/ — no upload needed.
 * Firebase stores only { avatarId: 'fox', avatarColor: '#8b5cf6' }
 */

export const AVATARS = [
  { id: 'parrot', name: 'Perroquet' },
  { id: 'penguin', name: 'Pingouin' },
  { id: 'giraffe', name: 'Girafe' },
  { id: 'bear', name: 'Ours' },
  { id: 'puffer-fish', name: 'Poisson-globe' },
  { id: 'sloth', name: 'Paresseux' },
  { id: 'gorilla', name: 'Gorille' },
  { id: 'fox', name: 'Renard' },
  { id: 'zebra', name: 'Zèbre' },
  { id: 'bat', name: 'Chauve-souris' },
  { id: 'owl', name: 'Hibou' },
  { id: 'crab', name: 'Crabe' },
  { id: 'llama', name: 'Lama' },
  { id: 'snake', name: 'Serpent' },
  { id: 'wolf', name: 'Loup' },
  { id: 'lion', name: 'Lion' },
  { id: 'goat', name: 'Chèvre' },
  { id: 'rabbit', name: 'Lapin' },
  { id: 'ferret', name: 'Furet' },
  { id: 'mouse', name: 'Souris' },
  { id: 'turtle', name: 'Tortue' },
  { id: 'hen', name: 'Poule' },
  { id: 'pig', name: 'Cochon' },
  { id: 'hedgehog', name: 'Hérisson' },
  { id: 'walrus', name: 'Morse' },
  { id: 'skunk', name: 'Moufette' },
  { id: 'frog', name: 'Grenouille' },
  { id: 'chameleons', name: 'Caméléon' },
  { id: 'squirrel', name: 'Écureuil' },
  { id: 'rhino', name: 'Rhinocéros' },
  { id: 'ostrich', name: 'Autruche' },
  { id: 'hippopotamus', name: 'Hippopotame' },
  { id: 'koala', name: 'Koala' },
  { id: 'camel', name: 'Chameau' },
  { id: 'beaver', name: 'Castor' },
  { id: 'dog', name: 'Chien' },
  { id: 'turkey', name: 'Dinde' },
  { id: 'deer', name: 'Cerf' },
  { id: 'cow', name: 'Vache' },
  { id: 'elephant', name: 'Éléphant' },
  { id: 'chicken', name: 'Poulet' },
  { id: 'duck', name: 'Canard' },
  { id: 'wild-boar', name: 'Sanglier' },
  { id: 'bee', name: 'Abeille' },
  { id: 'horse', name: 'Cheval' },
  { id: 'sheep', name: 'Mouton' },
  { id: 'panda', name: 'Panda' },
  { id: 'monkey', name: 'Singe' },
  { id: 'cat', name: 'Chat' },
  { id: 'octopus', name: 'Pieuvre' },
];

export const AVATAR_COLORS = [
  '#8b5cf6', // violet
  '#7c3aed', // violet foncé
  '#3b82f6', // bleu
  '#06b6d4', // cyan
  '#22c55e', // vert
  '#84cc16', // lime
  '#fbbf24', // jaune
  '#f97316', // orange
  '#ef4444', // rouge
  '#ec4899', // rose
  '#f43f5e', // rose foncé
  '#6366f1', // indigo
  '#0891b2', // teal
  '#d97706', // amber
  '#ffffff', // blanc
  '#1a1a2e', // dark (default)
  '#334155', // slate
];

export const DEFAULT_AVATAR = { id: null, color: '#8b5cf6' };

export function getAvatarUrl(avatarId) {
  if (!avatarId) return null;
  return `/images/avatars/${avatarId}.webp`;
}
