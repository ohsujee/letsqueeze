export type MimeTheme = 'general' | 'disney' | 'metiers' | 'animaux';

export interface ThemeInfo {
  id: MimeTheme;
  name: string;
  emoji: string;
  wordCount: number;
}

export const mimeWords: Record<MimeTheme, string[]> = {
  general: [
    "Avion", "Téléphone", "Pizza", "Guitare", "Natation",
    "Photographe", "Parapluie", "Escalier", "Miroir", "Vélo",
    "Dentifrice", "Parachute", "Aspirateur", "Trampoline", "Jumelles",
    "Machine à laver", "Tondeuse", "Haltères", "Ski", "Plongée",
    "Bowling", "Fléchettes", "Billard", "Cerf-volant", "Pêche",
    "Repassage", "Couture", "Jardinage", "Maquillage", "Coiffure",
    "Selfie", "Texto", "Réveil", "Douche", "Brossage de dents",
    "Éternuement", "Hoquet", "Ronflement", "Bâillement", "Applaudissement",
    "Sifflement", "Jonglage", "Équilibriste", "Magicien", "Robot",
    "Zombie", "Fantôme", "Ninja", "Cowboy", "Astronaute"
  ],
  disney: [
    "Simba", "Elsa", "Buzz l'Éclair", "Pocahontas", "Aladdin",
    "Nemo", "Dumbo", "Pinocchio", "Cendrillon", "Tarzan",
    "Mulan", "Hercule", "Stitch", "Ratatouille", "Wall-E",
    "Vaiana", "Raiponce", "Maléfique", "Ursula", "Scar",
    "Génie", "Olaf", "Dory", "Woody", "Flash McQueen",
    "Monstres et Cie", "Peter Pan", "Fée Clochette", "Baloo", "Rafiki"
  ],
  metiers: [
    "Pompier", "Dentiste", "Coiffeur", "Pilote", "Boulanger",
    "Médecin", "Professeur", "Policier", "Cuisinier", "Peintre",
    "Plombier", "Électricien", "Facteur", "Serveur", "DJ",
    "Photographe", "Chirurgien", "Vétérinaire", "Arbitre", "Coach",
    "Mannequin", "Acteur", "Chanteur", "Danseur", "Magicien",
    "Clown", "Cascadeur", "Présentateur TV", "Journaliste", "Avocat"
  ],
  animaux: [
    "Éléphant", "Kangourou", "Serpent", "Aigle", "Grenouille",
    "Gorille", "Pingouin", "Crocodile", "Papillon", "Dauphin",
    "Girafe", "Singe", "Lion", "Ours", "Chameau",
    "Autruche", "Flamant rose", "Paon", "Koala", "Paresseux",
    "Escargot", "Crabe", "Pieuvre", "Requin", "Méduse",
    "Scorpion", "Araignée", "Abeille", "Fourmi", "Caméléon"
  ]
};

export const themeInfos: ThemeInfo[] = [
  { id: 'general', name: 'Général', emoji: '🎯', wordCount: mimeWords.general.length },
  { id: 'disney', name: 'Disney', emoji: '🏰', wordCount: mimeWords.disney.length },
  { id: 'metiers', name: 'Métiers', emoji: '👷', wordCount: mimeWords.metiers.length },
  { id: 'animaux', name: 'Animaux', emoji: '🦁', wordCount: mimeWords.animaux.length },
];

// Utility to get random word from selected themes
export function getRandomWord(selectedThemes: MimeTheme[]): string {
  if (selectedThemes.length === 0) return '';

  // Combine all words from selected themes
  const allWords = selectedThemes.flatMap(theme => mimeWords[theme]);

  // Return random word
  return allWords[Math.floor(Math.random() * allWords.length)];
}

// Shuffle array utility
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Get shuffled words from selected themes (no repeats until all used)
export function createWordPool(selectedThemes: MimeTheme[]): string[] {
  if (selectedThemes.length === 0) return [];
  const allWords = selectedThemes.flatMap(theme => mimeWords[theme]);
  return shuffleArray(allWords);
}
