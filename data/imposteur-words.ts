/**
 * Imposteur - Word Pairs Database
 * 200+ pairs organized by category
 * No difficulty levels — pairs are naturally varied in closeness
 */

export type WordCategory =
  | 'food'       // Nourriture & boissons
  | 'animals'    // Animaux
  | 'places'     // Lieux
  | 'objects'    // Objets du quotidien
  | 'people'     // Métiers & personnages
  | 'culture'    // Films, séries, musique, jeux
  | 'concepts'   // Concepts abstraits
  | 'sports'     // Sports & activités
  | 'nature';    // Nature & science

export interface WordPair {
  id: string;
  civilian: string;
  undercover: string;
  category: WordCategory;
}

export const IMPOSTEUR_COLORS = {
  primary: '#84cc16',
  light: '#a3e635',
  dark: '#65a30d',
  glow: 'rgba(132, 204, 22, 0.5)',
};

export const wordPairs: WordPair[] = [
  // ============================================
  // FOOD (F) — Nourriture & boissons
  // ============================================
  { id: 'F001', civilian: 'Pizza', undercover: 'Burger', category: 'food' },
  { id: 'F002', civilian: 'Café', undercover: 'Thé', category: 'food' },
  { id: 'F003', civilian: 'Beurre', undercover: 'Margarine', category: 'food' },
  { id: 'F004', civilian: 'Cappuccino', undercover: 'Latte', category: 'food' },
  { id: 'F005', civilian: 'Croissant', undercover: 'Pain au chocolat', category: 'food' },
  { id: 'F006', civilian: 'Sushi', undercover: 'Maki', category: 'food' },
  { id: 'F007', civilian: 'Crêpe', undercover: 'Gaufre', category: 'food' },
  { id: 'F008', civilian: 'Glace', undercover: 'Sorbet', category: 'food' },
  { id: 'F009', civilian: 'Chocolat noir', undercover: 'Chocolat au lait', category: 'food' },
  { id: 'F010', civilian: 'Coca-Cola', undercover: 'Pepsi', category: 'food' },
  { id: 'F011', civilian: 'Frites', undercover: 'Potatoes', category: 'food' },
  { id: 'F012', civilian: 'Ketchup', undercover: 'Mayonnaise', category: 'food' },
  { id: 'F013', civilian: 'Pain', undercover: 'Baguette', category: 'food' },
  { id: 'F014', civilian: 'Raclette', undercover: 'Fondue', category: 'food' },
  { id: 'F015', civilian: 'Steak', undercover: 'Côtelette', category: 'food' },
  { id: 'F016', civilian: 'Crème brûlée', undercover: 'Panna cotta', category: 'food' },
  { id: 'F017', civilian: 'Tacos', undercover: 'Burrito', category: 'food' },
  { id: 'F018', civilian: 'Vin rouge', undercover: 'Vin rosé', category: 'food' },
  { id: 'F019', civilian: 'Bière', undercover: 'Cidre', category: 'food' },
  { id: 'F020', civilian: 'Confiture', undercover: 'Miel', category: 'food' },
  { id: 'F021', civilian: 'Omelette', undercover: 'Œuf brouillé', category: 'food' },
  { id: 'F022', civilian: 'Tiramisu', undercover: 'Cheesecake', category: 'food' },
  { id: 'F023', civilian: 'Soupe', undercover: 'Bouillon', category: 'food' },
  { id: 'F024', civilian: 'Nems', undercover: 'Samoussa', category: 'food' },
  { id: 'F025', civilian: 'Fromage', undercover: 'Yaourt', category: 'food' },
  { id: 'F026', civilian: 'Pomme', undercover: 'Poire', category: 'food' },
  { id: 'F027', civilian: 'Citron', undercover: 'Orange', category: 'food' },
  { id: 'F028', civilian: 'Bonbon', undercover: 'Chewing-gum', category: 'food' },
  { id: 'F029', civilian: 'Kebab', undercover: 'Shawarma', category: 'food' },
  { id: 'F030', civilian: 'Pâtes', undercover: 'Riz', category: 'food' },
  { id: 'F031', civilian: 'Champagne', undercover: 'Prosecco', category: 'food' },
  { id: 'F032', civilian: 'Smoothie', undercover: 'Milkshake', category: 'food' },

  // ============================================
  // ANIMALS (A) — Animaux
  // ============================================
  { id: 'A001', civilian: 'Chat', undercover: 'Chien', category: 'animals' },
  { id: 'A002', civilian: 'Pingouin', undercover: 'Manchot', category: 'animals' },
  { id: 'A003', civilian: 'Crocodile', undercover: 'Alligator', category: 'animals' },
  { id: 'A004', civilian: 'Abeille', undercover: 'Guêpe', category: 'animals' },
  { id: 'A005', civilian: 'Dauphin', undercover: 'Baleine', category: 'animals' },
  { id: 'A006', civilian: 'Aigle', undercover: 'Faucon', category: 'animals' },
  { id: 'A007', civilian: 'Tortue', undercover: 'Escargot', category: 'animals' },
  { id: 'A008', civilian: 'Loup', undercover: 'Renard', category: 'animals' },
  { id: 'A009', civilian: 'Lion', undercover: 'Tigre', category: 'animals' },
  { id: 'A010', civilian: 'Cheval', undercover: 'Âne', category: 'animals' },
  { id: 'A011', civilian: 'Papillon', undercover: 'Libellule', category: 'animals' },
  { id: 'A012', civilian: 'Requin', undercover: 'Orque', category: 'animals' },
  { id: 'A013', civilian: 'Perroquet', undercover: 'Perruche', category: 'animals' },
  { id: 'A014', civilian: 'Mouton', undercover: 'Chèvre', category: 'animals' },
  { id: 'A015', civilian: 'Grenouille', undercover: 'Crapaud', category: 'animals' },
  { id: 'A016', civilian: 'Souris', undercover: 'Rat', category: 'animals' },
  { id: 'A017', civilian: 'Singe', undercover: 'Gorille', category: 'animals' },
  { id: 'A018', civilian: 'Hibou', undercover: 'Chouette', category: 'animals' },
  { id: 'A019', civilian: 'Phoque', undercover: 'Otarie', category: 'animals' },
  { id: 'A020', civilian: 'Lapin', undercover: 'Lièvre', category: 'animals' },
  { id: 'A021', civilian: 'Panthère', undercover: 'Léopard', category: 'animals' },
  { id: 'A022', civilian: 'Cerf', undercover: 'Élan', category: 'animals' },
  { id: 'A023', civilian: 'Hamster', undercover: 'Cochon d\'Inde', category: 'animals' },
  { id: 'A024', civilian: 'Méduse', undercover: 'Pieuvre', category: 'animals' },
  { id: 'A025', civilian: 'Hérisson', undercover: 'Porc-épic', category: 'animals' },

  // ============================================
  // PLACES (L) — Lieux
  // ============================================
  { id: 'L001', civilian: 'Plage', undercover: 'Piscine', category: 'places' },
  { id: 'L002', civilian: 'Hôtel', undercover: 'Auberge', category: 'places' },
  { id: 'L003', civilian: 'Château', undercover: 'Palais', category: 'places' },
  { id: 'L004', civilian: 'Paris', undercover: 'Londres', category: 'places' },
  { id: 'L005', civilian: 'Cinéma', undercover: 'Théâtre', category: 'places' },
  { id: 'L006', civilian: 'Bibliothèque', undercover: 'Librairie', category: 'places' },
  { id: 'L007', civilian: 'Restaurant', undercover: 'Café', category: 'places' },
  { id: 'L008', civilian: 'Métro', undercover: 'Tramway', category: 'places' },
  { id: 'L009', civilian: 'Aéroport', undercover: 'Gare', category: 'places' },
  { id: 'L010', civilian: 'Montagne', undercover: 'Colline', category: 'places' },
  { id: 'L011', civilian: 'Forêt', undercover: 'Jungle', category: 'places' },
  { id: 'L012', civilian: 'Église', undercover: 'Cathédrale', category: 'places' },
  { id: 'L013', civilian: 'Zoo', undercover: 'Aquarium', category: 'places' },
  { id: 'L014', civilian: 'Supermarché', undercover: 'Marché', category: 'places' },
  { id: 'L015', civilian: 'Lycée', undercover: 'Collège', category: 'places' },
  { id: 'L016', civilian: 'Musée', undercover: 'Galerie', category: 'places' },
  { id: 'L017', civilian: 'Camping', undercover: 'Glamping', category: 'places' },
  { id: 'L018', civilian: 'Île', undercover: 'Presqu\'île', category: 'places' },
  { id: 'L019', civilian: 'Stade', undercover: 'Gymnase', category: 'places' },
  { id: 'L020', civilian: 'Parc', undercover: 'Jardin', category: 'places' },
  { id: 'L021', civilian: 'Hôpital', undercover: 'Clinique', category: 'places' },
  { id: 'L022', civilian: 'Désert', undercover: 'Savane', category: 'places' },
  { id: 'L023', civilian: 'Grotte', undercover: 'Caverne', category: 'places' },
  { id: 'L024', civilian: 'Pharmacie', undercover: 'Parapharmacie', category: 'places' },
  { id: 'L025', civilian: 'Balcon', undercover: 'Terrasse', category: 'places' },

  // ============================================
  // OBJECTS (O) — Objets du quotidien
  // ============================================
  { id: 'O001', civilian: 'Guitare', undercover: 'Ukulélé', category: 'objects' },
  { id: 'O002', civilian: 'Canapé', undercover: 'Fauteuil', category: 'objects' },
  { id: 'O003', civilian: 'Montre', undercover: 'Horloge', category: 'objects' },
  { id: 'O004', civilian: 'Vélo', undercover: 'Trottinette', category: 'objects' },
  { id: 'O005', civilian: 'Lunettes', undercover: 'Lentilles', category: 'objects' },
  { id: 'O006', civilian: 'Stylo', undercover: 'Crayon', category: 'objects' },
  { id: 'O007', civilian: 'Téléphone', undercover: 'Tablette', category: 'objects' },
  { id: 'O008', civilian: 'Bougie', undercover: 'Lampe', category: 'objects' },
  { id: 'O009', civilian: 'Sac à dos', undercover: 'Valise', category: 'objects' },
  { id: 'O010', civilian: 'Parapluie', undercover: 'Imperméable', category: 'objects' },
  { id: 'O011', civilian: 'Chaussettes', undercover: 'Collants', category: 'objects' },
  { id: 'O012', civilian: 'Couteau', undercover: 'Ciseaux', category: 'objects' },
  { id: 'O013', civilian: 'Casquette', undercover: 'Chapeau', category: 'objects' },
  { id: 'O014', civilian: 'Oreiller', undercover: 'Coussin', category: 'objects' },
  { id: 'O015', civilian: 'Miroir', undercover: 'Fenêtre', category: 'objects' },
  { id: 'O016', civilian: 'Écharpe', undercover: 'Foulard', category: 'objects' },
  { id: 'O017', civilian: 'Clé', undercover: 'Badge', category: 'objects' },
  { id: 'O018', civilian: 'Savon', undercover: 'Gel douche', category: 'objects' },
  { id: 'O019', civilian: 'Tondeuse', undercover: 'Rasoir', category: 'objects' },
  { id: 'O020', civilian: 'Portefeuille', undercover: 'Porte-monnaie', category: 'objects' },
  { id: 'O021', civilian: 'Baskets', undercover: 'Sandales', category: 'objects' },
  { id: 'O022', civilian: 'Drap', undercover: 'Couverture', category: 'objects' },
  { id: 'O023', civilian: 'Briquet', undercover: 'Allumette', category: 'objects' },
  { id: 'O024', civilian: 'Dictionnaire', undercover: 'Encyclopédie', category: 'objects' },
  { id: 'O025', civilian: 'Piano', undercover: 'Synthétiseur', category: 'objects' },

  // ============================================
  // PEOPLE (P) — Métiers & personnages
  // ============================================
  { id: 'P001', civilian: 'Médecin', undercover: 'Infirmier', category: 'people' },
  { id: 'P002', civilian: 'Policier', undercover: 'Gendarme', category: 'people' },
  { id: 'P003', civilian: 'Professeur', undercover: 'Maître', category: 'people' },
  { id: 'P004', civilian: 'Cuisinier', undercover: 'Pâtissier', category: 'people' },
  { id: 'P005', civilian: 'Pilote', undercover: 'Chauffeur', category: 'people' },
  { id: 'P006', civilian: 'Roi', undercover: 'Empereur', category: 'people' },
  { id: 'P007', civilian: 'Sorcier', undercover: 'Magicien', category: 'people' },
  { id: 'P008', civilian: 'Pirate', undercover: 'Viking', category: 'people' },
  { id: 'P009', civilian: 'Président', undercover: 'Premier ministre', category: 'people' },
  { id: 'P010', civilian: 'Avocat', undercover: 'Juge', category: 'people' },
  { id: 'P011', civilian: 'Astronaute', undercover: 'Pilote', category: 'people' },
  { id: 'P012', civilian: 'Architecte', undercover: 'Ingénieur', category: 'people' },
  { id: 'P013', civilian: 'Boulanger', undercover: 'Pâtissier', category: 'people' },
  { id: 'P014', civilian: 'Détective', undercover: 'Espion', category: 'people' },
  { id: 'P015', civilian: 'Pompier', undercover: 'Ambulancier', category: 'people' },
  { id: 'P016', civilian: 'Photographe', undercover: 'Cameraman', category: 'people' },
  { id: 'P017', civilian: 'Journaliste', undercover: 'Présentateur', category: 'people' },
  { id: 'P018', civilian: 'Chanteur', undercover: 'Rappeur', category: 'people' },
  { id: 'P019', civilian: 'Danseur', undercover: 'Gymnaste', category: 'people' },
  { id: 'P020', civilian: 'Ninja', undercover: 'Samouraï', category: 'people' },

  // ============================================
  // CULTURE (C) — Films, séries, musique, jeux
  // ============================================
  { id: 'C001', civilian: 'Netflix', undercover: 'YouTube', category: 'culture' },
  { id: 'C002', civilian: 'Batman', undercover: 'Superman', category: 'culture' },
  { id: 'C003', civilian: 'Harry Potter', undercover: 'Le Seigneur des Anneaux', category: 'culture' },
  { id: 'C004', civilian: 'Mario', undercover: 'Sonic', category: 'culture' },
  { id: 'C005', civilian: 'Star Wars', undercover: 'Star Trek', category: 'culture' },
  { id: 'C006', civilian: 'Instagram', undercover: 'TikTok', category: 'culture' },
  { id: 'C007', civilian: 'Minecraft', undercover: 'Roblox', category: 'culture' },
  { id: 'C008', civilian: 'Spotify', undercover: 'Apple Music', category: 'culture' },
  { id: 'C009', civilian: 'PlayStation', undercover: 'Xbox', category: 'culture' },
  { id: 'C010', civilian: 'iPhone', undercover: 'Samsung', category: 'culture' },
  { id: 'C011', civilian: 'Disney', undercover: 'Pixar', category: 'culture' },
  { id: 'C012', civilian: 'Manga', undercover: 'Comics', category: 'culture' },
  { id: 'C013', civilian: 'Rap', undercover: 'R&B', category: 'culture' },
  { id: 'C014', civilian: 'Rock', undercover: 'Metal', category: 'culture' },
  { id: 'C015', civilian: 'Fortnite', undercover: 'Warzone', category: 'culture' },
  { id: 'C016', civilian: 'Spider-Man', undercover: 'Iron Man', category: 'culture' },
  { id: 'C017', civilian: 'Pokémon', undercover: 'Digimon', category: 'culture' },
  { id: 'C018', civilian: 'Naruto', undercover: 'One Piece', category: 'culture' },
  { id: 'C019', civilian: 'Snapchat', undercover: 'WhatsApp', category: 'culture' },
  { id: 'C020', civilian: 'Google', undercover: 'Bing', category: 'culture' },
  { id: 'C021', civilian: 'FIFA', undercover: 'PES', category: 'culture' },
  { id: 'C022', civilian: 'Lego', undercover: 'Playmobil', category: 'culture' },
  { id: 'C023', civilian: 'Dragon Ball', undercover: 'One Punch Man', category: 'culture' },
  { id: 'C024', civilian: 'GTA', undercover: 'Red Dead Redemption', category: 'culture' },
  { id: 'C025', civilian: 'Twitter', undercover: 'Threads', category: 'culture' },

  // ============================================
  // CONCEPTS (X) — Concepts abstraits
  // ============================================
  { id: 'X001', civilian: 'Amour', undercover: 'Amitié', category: 'concepts' },
  { id: 'X002', civilian: 'Courage', undercover: 'Bravoure', category: 'concepts' },
  { id: 'X003', civilian: 'Rêve', undercover: 'Cauchemar', category: 'concepts' },
  { id: 'X004', civilian: 'Chance', undercover: 'Destin', category: 'concepts' },
  { id: 'X005', civilian: 'Vacances', undercover: 'Week-end', category: 'concepts' },
  { id: 'X006', civilian: 'Mensonge', undercover: 'Secret', category: 'concepts' },
  { id: 'X007', civilian: 'Anniversaire', undercover: 'Fête', category: 'concepts' },
  { id: 'X008', civilian: 'Mariage', undercover: 'Fiançailles', category: 'concepts' },
  { id: 'X009', civilian: 'Examen', undercover: 'Contrôle', category: 'concepts' },
  { id: 'X010', civilian: 'Nostalgie', undercover: 'Mélancolie', category: 'concepts' },
  { id: 'X011', civilian: 'Jalousie', undercover: 'Envie', category: 'concepts' },
  { id: 'X012', civilian: 'Vengeance', undercover: 'Justice', category: 'concepts' },
  { id: 'X013', civilian: 'Liberté', undercover: 'Indépendance', category: 'concepts' },
  { id: 'X014', civilian: 'Colère', undercover: 'Frustration', category: 'concepts' },
  { id: 'X015', civilian: 'Solitude', undercover: 'Isolement', category: 'concepts' },
  { id: 'X016', civilian: 'Paradis', undercover: 'Enfer', category: 'concepts' },
  { id: 'X017', civilian: 'Passé', undercover: 'Futur', category: 'concepts' },
  { id: 'X018', civilian: 'Talent', undercover: 'Génie', category: 'concepts' },
  { id: 'X019', civilian: 'Erreur', undercover: 'Échec', category: 'concepts' },
  { id: 'X020', civilian: 'Peur', undercover: 'Anxiété', category: 'concepts' },

  // ============================================
  // SPORTS (S) — Sports & activités
  // ============================================
  { id: 'S001', civilian: 'Football', undercover: 'Rugby', category: 'sports' },
  { id: 'S002', civilian: 'Ski', undercover: 'Snowboard', category: 'sports' },
  { id: 'S003', civilian: 'Tennis', undercover: 'Badminton', category: 'sports' },
  { id: 'S004', civilian: 'Boxe', undercover: 'Karaté', category: 'sports' },
  { id: 'S005', civilian: 'Surf', undercover: 'Planche à voile', category: 'sports' },
  { id: 'S006', civilian: 'Marathon', undercover: 'Sprint', category: 'sports' },
  { id: 'S007', civilian: 'Yoga', undercover: 'Pilates', category: 'sports' },
  { id: 'S008', civilian: 'Basket', undercover: 'Handball', category: 'sports' },
  { id: 'S009', civilian: 'Natation', undercover: 'Plongée', category: 'sports' },
  { id: 'S010', civilian: 'Escalade', undercover: 'Randonnée', category: 'sports' },
  { id: 'S011', civilian: 'Danse', undercover: 'Gymnastique', category: 'sports' },
  { id: 'S012', civilian: 'Pétanque', undercover: 'Bowling', category: 'sports' },
  { id: 'S013', civilian: 'Patinage', undercover: 'Roller', category: 'sports' },
  { id: 'S014', civilian: 'Golf', undercover: 'Mini-golf', category: 'sports' },
  { id: 'S015', civilian: 'Musculation', undercover: 'Crossfit', category: 'sports' },

  // ============================================
  // NATURE (N) — Nature & science
  // ============================================
  { id: 'N001', civilian: 'Soleil', undercover: 'Lune', category: 'nature' },
  { id: 'N002', civilian: 'Océan', undercover: 'Mer', category: 'nature' },
  { id: 'N003', civilian: 'Sapin', undercover: 'Épicéa', category: 'nature' },
  { id: 'N004', civilian: 'Rose', undercover: 'Tulipe', category: 'nature' },
  { id: 'N005', civilian: 'Volcan', undercover: 'Geyser', category: 'nature' },
  { id: 'N006', civilian: 'Étoile', undercover: 'Planète', category: 'nature' },
  { id: 'N007', civilian: 'Tonnerre', undercover: 'Éclair', category: 'nature' },
  { id: 'N008', civilian: 'Lac', undercover: 'Étang', category: 'nature' },
  { id: 'N009', civilian: 'Diamant', undercover: 'Rubis', category: 'nature' },
  { id: 'N010', civilian: 'Arc-en-ciel', undercover: 'Aurore boréale', category: 'nature' },
  { id: 'N011', civilian: 'Neige', undercover: 'Grêle', category: 'nature' },
  { id: 'N012', civilian: 'Rivière', undercover: 'Fleuve', category: 'nature' },
  { id: 'N013', civilian: 'Sable', undercover: 'Gravier', category: 'nature' },
  { id: 'N014', civilian: 'Stalactite', undercover: 'Stalagmite', category: 'nature' },
  { id: 'N015', civilian: 'Tornade', undercover: 'Ouragan', category: 'nature' },
  { id: 'N016', civilian: 'Marée haute', undercover: 'Vague', category: 'nature' },
  { id: 'N017', civilian: 'Brouillard', undercover: 'Brume', category: 'nature' },
  { id: 'N018', civilian: 'Champignon', undercover: 'Truffe', category: 'nature' },
];

/**
 * Get a random word pair, excluding already used ones
 * @param excludeIds - Array of pair IDs to exclude (for multi-round games)
 * @returns A random WordPair, or null if all pairs have been used
 */
export function getRandomWordPair(excludeIds: string[] = []): WordPair | null {
  const available = wordPairs.filter(pair => !excludeIds.includes(pair.id));
  if (available.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * available.length);
  return available[randomIndex];
}

/**
 * Get word pairs by category
 * @param category - The category to filter by
 * @returns Array of WordPairs in that category
 */
export function getWordPairsByCategory(category: WordCategory): WordPair[] {
  return wordPairs.filter(pair => pair.category === category);
}

/**
 * Get total count of word pairs
 */
export function getWordPairCount(): number {
  return wordPairs.length;
}

export default wordPairs;
