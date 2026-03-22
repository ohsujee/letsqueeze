/**
 * Daily Games Configuration
 * Separate from multiplayer games - solo, no lobby, no Firebase room
 */

export const DAILY_GAMES = [
  {
    id: 'motmystere',
    name: 'Mot Mystère',
    description: 'Trouve le mot en 6 essais',
    gradient: 'linear-gradient(135deg, #059669, #10b981)',
    glowColor: '#10b981',
    icon: '🟩',
    image: '/images/daily/motmystere.webp',
    route: '/daily/motmystere',
    firebaseNode: 'daily/wordle',
  },
  {
    id: 'semantique',
    name: 'Sémantique',
    description: 'Devine par proximité',
    gradient: 'linear-gradient(135deg, #ea6a0a, #f97316)',
    glowColor: '#f97316',
    icon: '🌡️',
    image: '/images/daily/semantique.webp',
    route: '/daily/semantique',
    firebaseNode: 'daily/semantic',
  },
  {
    id: 'total',
    name: 'Total',
    description: 'Atteins la cible !',
    gradient: 'linear-gradient(135deg, #2563eb, #3b82f6)',
    glowColor: '#3b82f6',
    icon: '🔢',
    image: '/images/daily/total.webp',
    route: '/daily/total',
    firebaseNode: 'daily/total',
    availableFrom: '2026-03-23',
    isNew: true,
  },
];
