export type MimeTheme = 'general' | 'disney' | 'metiers' | 'animaux' | 'objets';

export interface ThemeInfo {
  id: MimeTheme;
  name: string;
  emoji: string;
  wordCount: number;
}

export const mimeWords: Record<MimeTheme, string[]> = {
  general: [
    // Actions quotidiennes
    "Avion", "Téléphone", "Pizza", "Guitare", "Natation",
    "Photographe", "Parapluie", "Escalier", "Miroir", "Vélo",
    "Dentifrice", "Parachute", "Aspirateur", "Trampoline", "Jumelles",
    "Machine à laver", "Tondeuse", "Haltères", "Ski", "Plongée",
    "Bowling", "Fléchettes", "Billard", "Cerf-volant", "Pêche",
    "Repassage", "Couture", "Jardinage", "Maquillage", "Coiffure",
    "Selfie", "Texto", "Réveil", "Douche", "Brossage de dents",
    "Éternuement", "Hoquet", "Ronflement", "Bâillement", "Applaudissement",
    "Sifflement", "Jonglage", "Équilibriste", "Magicien", "Robot",
    "Zombie", "Fantôme", "Ninja", "Cowboy", "Astronaute",
    // Sports & Loisirs
    "Football", "Basketball", "Tennis", "Golf", "Boxe",
    "Karaté", "Surf", "Escalade", "Patinage", "Danse",
    "Yoga", "Musculation", "Course à pied", "Saut en longueur", "Lancer de poids",
    "Planche à voile", "Kayak", "Rafting", "Parapente", "Deltaplane",
    // Actions du quotidien
    "Cuisiner", "Manger", "Boire", "Dormir", "Se réveiller",
    "Conduire", "Marcher", "Courir", "Sauter", "Danser",
    "Chanter", "Pleurer", "Rire", "Crier", "Chuchoter",
    "Écrire", "Lire", "Dessiner", "Peindre", "Sculpter",
    "Tricoter", "Coudre", "Repasser", "Balayer", "Laver la vaisselle",
    // Expressions & émotions
    "Amoureux", "En colère", "Surpris", "Fatigué", "Excité",
    "Timide", "Fier", "Jaloux", "Stressé", "Détendu",
    // Situations
    "Embouteillage", "File d'attente", "Rendez-vous galant", "Entretien d'embauche", "Examen",
    "Mariage", "Anniversaire", "Fête", "Concert", "Cinéma"
  ],

  disney: [
    // Classiques
    "Simba", "Elsa", "Buzz l'Éclair", "Pocahontas", "Aladdin",
    "Nemo", "Dumbo", "Pinocchio", "Cendrillon", "Tarzan",
    "Mulan", "Hercule", "Stitch", "Ratatouille", "Wall-E",
    "Vaiana", "Raiponce", "Maléfique", "Ursula", "Scar",
    "Génie", "Olaf", "Dory", "Woody", "Flash McQueen",
    "Monstres et Cie", "Peter Pan", "Fée Clochette", "Baloo", "Rafiki",
    // Personnages supplémentaires
    "Mickey", "Minnie", "Donald", "Dingo", "Pluto",
    "Blanche-Neige", "Aurore", "Belle", "Ariel", "Jasmine",
    "Tiana", "Mérida", "Anna", "Kristoff", "Hans",
    "Maui", "Sébastien", "Timon", "Pumbaa", "Zazu",
    "Mufasa", "Jafar", "Hadès", "Cruella", "Gaston",
    "Frollo", "Capitaine Crochet", "Yzma", "Lotso", "Syndrome",
    "Roi Triton", "Marraine la Bonne Fée", "Grand-mère Feuillage", "Mushu", "Pascal",
    "Maximus", "Sven", "Baymax", "Hiro", "Ralph",
    "Vanellope", "Jack Sparrow", "Davy Jones", "Elastigirl", "Frozone",
    "Edna Mode", "Bing Bong", "Joie", "Tristesse", "Colère",
    "Peur", "Dégoût", "Coco", "Miguel", "Héctor",
    "Luca", "Alberto", "Giulia", "Mirabel", "Bruno",
    "Raya", "Sisu", "Encanto", "La Bête", "Lumière",
    "Big Ben", "Madame Samovar", "Zip", "Roi Louie", "Kaa",
    "Shere Khan", "Mowgli", "Bagheera", "Abu", "Tapis volant"
  ],

  metiers: [
    // Métiers classiques
    "Pompier", "Dentiste", "Coiffeur", "Pilote", "Boulanger",
    "Médecin", "Professeur", "Policier", "Cuisinier", "Peintre",
    "Plombier", "Électricien", "Facteur", "Serveur", "DJ",
    "Photographe", "Chirurgien", "Vétérinaire", "Arbitre", "Coach",
    "Mannequin", "Acteur", "Chanteur", "Danseur", "Magicien",
    "Clown", "Cascadeur", "Présentateur TV", "Journaliste", "Avocat",
    // Métiers supplémentaires
    "Architecte", "Ingénieur", "Informaticien", "Comptable", "Banquier",
    "Agent immobilier", "Agriculteur", "Jardinier", "Fleuriste", "Boucher",
    "Poissonnier", "Fromager", "Pâtissier", "Chocolatier", "Sommelier",
    "Barman", "Concierge", "Réceptionniste", "Guide touristique", "Traducteur",
    "Bibliothécaire", "Archéologue", "Astronome", "Biologiste", "Chimiste",
    "Physicien", "Mathématicien", "Psychologue", "Psychiatre", "Kinésithérapeute",
    "Ostéopathe", "Sage-femme", "Infirmier", "Ambulancier", "Pompiste",
    "Mécanicien", "Carrossier", "Garagiste", "Chauffeur de taxi", "Chauffeur de bus",
    "Conducteur de train", "Pilote d'avion", "Hôtesse de l'air", "Capitaine de bateau", "Marin",
    "Pêcheur", "Mineur", "Ouvrier", "Maçon", "Menuisier",
    "Charpentier", "Couvreur", "Vitrier", "Serrurier", "Déménageur",
    "Éboueur", "Agent d'entretien", "Gardien", "Vigile", "Détective",
    "Espion", "Militaire", "Gendarme", "Douanier", "Juge",
    "Notaire", "Huissier", "Expert-comptable", "Consultant", "Manager",
    "PDG", "Entrepreneur", "Styliste", "Couturier", "Maquilleur",
    "Tatoueur", "Piercing", "Masseur", "Coach sportif", "Nutritionniste"
  ],

  animaux: [
    // Animaux classiques
    "Éléphant", "Kangourou", "Serpent", "Aigle", "Grenouille",
    "Gorille", "Pingouin", "Crocodile", "Papillon", "Dauphin",
    "Girafe", "Singe", "Lion", "Ours", "Chameau",
    "Autruche", "Flamant rose", "Paon", "Koala", "Paresseux",
    "Escargot", "Crabe", "Pieuvre", "Requin", "Méduse",
    "Scorpion", "Araignée", "Abeille", "Fourmi", "Caméléon",
    // Mammifères
    "Chien", "Chat", "Lapin", "Hamster", "Cochon d'Inde",
    "Cheval", "Âne", "Zèbre", "Hippopotame", "Rhinocéros",
    "Tigre", "Léopard", "Guépard", "Panthère", "Jaguar",
    "Loup", "Renard", "Coyote", "Hyène", "Chacal",
    "Cerf", "Biche", "Élan", "Renne", "Antilope",
    "Gazelle", "Buffle", "Bison", "Taureau", "Vache",
    "Mouton", "Chèvre", "Cochon", "Sanglier", "Phacochère",
    "Hérisson", "Taupe", "Castor", "Loutre", "Morse",
    "Phoque", "Otarie", "Baleine", "Orque", "Cachalot",
    "Chauve-souris", "Écureuil", "Marmotte", "Raton laveur", "Blaireau",
    "Moufette", "Tatou", "Fourmilier", "Orang-outan", "Chimpanzé",
    "Babouin", "Mandrill", "Lémurien", "Panda", "Panda roux",
    // Oiseaux
    "Perroquet", "Toucan", "Pélican", "Hibou", "Chouette",
    "Corbeau", "Pie", "Moineau", "Pigeon", "Colombe",
    "Canard", "Oie", "Cygne", "Cigogne", "Héron",
    "Mouette", "Albatros", "Faucon", "Vautour", "Condor",
    // Reptiles & Amphibiens
    "Tortue", "Lézard", "Iguane", "Gecko", "Dragon de Komodo",
    "Cobra", "Python", "Anaconda", "Vipère", "Boa",
    "Alligator", "Salamandre", "Triton", "Crapaud", "Axolotl",
    // Insectes & Autres
    "Coccinelle", "Libellule", "Mante religieuse", "Sauterelle", "Grillon",
    "Cigale", "Moustique", "Mouche", "Guêpe", "Frelon",
    "Cafard", "Mille-pattes", "Ver de terre", "Limace", "Sangsue"
  ],

  objets: [
    // Maison & Cuisine
    "Réfrigérateur", "Four", "Micro-ondes", "Lave-vaisselle", "Grille-pain",
    "Cafetière", "Bouilloire", "Mixeur", "Robot culinaire", "Poêle",
    "Casserole", "Marmite", "Passoire", "Louche", "Spatule",
    "Couteau", "Fourchette", "Cuillère", "Assiette", "Bol",
    "Verre", "Tasse", "Carafe", "Tire-bouchon", "Ouvre-boîte",
    "Planche à découper", "Rouleau à pâtisserie", "Fouet", "Râpe", "Économe",
    // Électronique
    "Télévision", "Ordinateur", "Tablette", "Smartphone", "Montre connectée",
    "Casque audio", "Enceinte", "Télécommande", "Console de jeux", "Manette",
    "Appareil photo", "Caméra", "Drone", "Imprimante", "Scanner",
    "Clé USB", "Disque dur", "Chargeur", "Câble", "Batterie externe",
    // Bureau & École
    "Stylo", "Crayon", "Gomme", "Règle", "Compas",
    "Équerre", "Rapporteur", "Ciseaux", "Colle", "Scotch",
    "Agrafeuse", "Perforatrice", "Trombone", "Punaise", "Post-it",
    "Cahier", "Classeur", "Pochette", "Cartable", "Trousse",
    "Calculatrice", "Globe terrestre", "Microscope", "Loupe", "Jumelles",
    // Vêtements & Accessoires
    "Chapeau", "Casquette", "Bonnet", "Écharpe", "Gants",
    "Lunettes", "Lunettes de soleil", "Montre", "Bracelet", "Collier",
    "Boucles d'oreilles", "Bague", "Ceinture", "Cravate", "Nœud papillon",
    "Parapluie", "Sac à main", "Portefeuille", "Valise", "Sac à dos",
    // Outils
    "Marteau", "Tournevis", "Clé à molette", "Pince", "Scie",
    "Perceuse", "Visseuse", "Niveau à bulle", "Mètre ruban", "Échelle",
    "Escabeau", "Brouette", "Pelle", "Râteau", "Arrosoir",
    "Sécateur", "Tronçonneuse", "Tondeuse", "Débroussailleuse", "Souffleur",
    // Sports & Loisirs
    "Ballon", "Raquette", "Batte", "Club de golf", "Skis",
    "Snowboard", "Planche de surf", "Vélo", "Trottinette", "Skateboard",
    "Roller", "Patins à glace", "Corde à sauter", "Hula hoop", "Frisbee",
    "Cerf-volant", "Boomerang", "Arc et flèches", "Canne à pêche", "Filet",
    // Musique
    "Guitare", "Piano", "Violon", "Batterie", "Saxophone",
    "Trompette", "Flûte", "Harmonica", "Accordéon", "Tambour",
    "Maracas", "Triangle", "Xylophone", "Harpe", "Banjo",
    // Divers
    "Parapluie", "Lampe", "Bougie", "Allumettes", "Briquet",
    "Clés", "Cadenas", "Serrure", "Boussole", "Carte",
    "Dés", "Cartes à jouer", "Puzzle", "Rubik's cube", "Yo-yo",
    "Toupie", "Billes", "Peluche", "Poupée", "Figurine",
    "Balançoire", "Toboggan", "Bac à sable", "Trampoline", "Piscine gonflable"
  ]
};

export const themeInfos: ThemeInfo[] = [
  { id: 'general', name: 'Général', emoji: '🎯', wordCount: mimeWords.general.length },
  { id: 'disney', name: 'Disney', emoji: '🏰', wordCount: mimeWords.disney.length },
  { id: 'metiers', name: 'Métiers', emoji: '👷', wordCount: mimeWords.metiers.length },
  { id: 'animaux', name: 'Animaux', emoji: '🦁', wordCount: mimeWords.animaux.length },
  { id: 'objets', name: 'Objets', emoji: '📦', wordCount: mimeWords.objets.length },
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
