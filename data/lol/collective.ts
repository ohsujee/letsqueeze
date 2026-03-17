/**
 * LOL - Jeux Collectifs
 * Mini-jeux IRL qui forcent TOUS les joueurs a participer.
 * Le joueur du Joker lance le jeu, tout le monde joue.
 */

export interface CollectiveGame {
  id: string;
  title: string;
  tone: 'classique' | 'absurde' | 'genant' | 'physique';
  difficulty: 'facile' | 'moyen' | 'hard';
  duration: string;
  rules: string;
  setup: string;
  variants?: string[];
  pro?: boolean;
}

export const COLLECTIVE_GAMES: CollectiveGame[] = [
  {
    id: 'collective_001',
    title: 'Barbichette Royale',
    tone: 'classique',
    difficulty: 'facile',
    duration: '1-2 min',
    setup: 'Tout le monde se met en cercle, face a face par paires.',
    rules: `Le classique "Je te tiens, tu me tiens par la barbichette" mais en CHAINE.

Chaque joueur tient le menton de son voisin de droite. Tout le monde chante en meme temps :

"Je te tiens, tu me tiens par la barbichette. Le premier de nous deux qui rira aura une tapette."

A "tapette", tout le monde doit essayer de ne PAS rire en se regardant dans les yeux.

Le premier qui rit : l'accusation est lancee par le joueur du Joker.`,
  },
  {
    id: 'collective_002',
    title: 'Le Miroir Infernal',
    tone: 'physique',
    difficulty: 'facile',
    duration: '2-3 min',
    setup: 'Chaque joueur se met face a un autre joueur (par paires).',
    rules: `Le joueur du Joker donne des instructions que tout le monde doit imiter EN MIROIR.

Le Joker fait des mouvements de plus en plus ridicules, et tout le monde doit les copier EXACTEMENT.

Exemples de mouvements :
- Lever un bras tres lentement (facile)
- Faire une grimace (moyen)
- Danser le robot (dur)
- Faire semblant de nager (tres dur a garder son serieux)
- Faire un clin d'oeil tres exagere

Si quelqu'un rit pendant qu'il imite : accusation !`,
  },
  {
    id: 'collective_003',
    title: 'Le Telephone Genant',
    tone: 'genant',
    difficulty: 'moyen',
    duration: '2-3 min',
    setup: 'Tout le monde en file indienne ou en cercle.',
    rules: `Le joueur du Joker chuchote une phrase ABSURDE a l'oreille de son voisin. La phrase passe de personne en personne. Le DERNIER joueur doit la crier a voix haute.

Phrases a utiliser (le Joker en choisit une) :
- "Mon hamster s'appelle Gerard et il fait du yoga le mardi"
- "Je mange mes cereales avec de l'eau parce que le lait me juge"
- "Si tu fermes les yeux et que tu ecoutes fort, tu entends les fourmis chanter"
- "Mon reve c'est d'ouvrir un restaurant pour pigeons"
- "J'ai un secret : je parle a mes plantes et elles me repondent pas"

La phrase finale est toujours completement differente de l'originale et c'est la que les gens craquent.`,
  },
  {
    id: 'collective_004',
    title: 'Statue Emotionnelle',
    tone: 'absurde',
    difficulty: 'facile',
    duration: '1-2 min',
    setup: 'Tout le monde debout, un peu d\'espace entre chaque joueur.',
    rules: `Le joueur du Joker annonce une EMOTION et compte "3, 2, 1, FREEZE !"

A "FREEZE", tout le monde doit se figer dans une pose qui represente cette emotion. Et GARDER la pose pendant 10 secondes sans rire.

Emotions a annoncer (de plus en plus absurdes) :
1. "Joie" (facile)
2. "Tristesse extreme" (facile)
3. "Tu viens de marcher sur un Lego" (moyen)
4. "Tu decouvres que ton ex est la" (dur)
5. "Tu es un spaghetti qui prend conscience de son existence" (impossible)

Le Joker passe devant chaque statue et les commente comme dans un musee.`,
  },
  {
    id: 'collective_005',
    title: 'Le Doublage',
    tone: 'absurde',
    difficulty: 'moyen',
    duration: '2-3 min',
    setup: 'Par paires : un joueur bouge les levres (le "muet"), l\'autre parle (le "doubleur"). Le doubleur est DERRIERE le muet.',
    rules: `Le joueur du Joker donne un theme de discours a chaque "muet". Le muet ouvre la bouche et fait des gestes. Le "doubleur" derriere lui invente ce qu'il dit en temps reel.

Themes possibles :
- "Raconte ta pire date Tinder"
- "Tu es president et tu fais un discours"
- "Tu es un chef cuisinier qui presente son plat"
- "Tu expliques comment tu as rate ton permis 7 fois"

Le decalage entre les gestes du muet et les mots du doubleur est GARANTI hilarant.

Apres 1 minute, on inverse les roles.`,
  },
  {
    id: 'collective_006',
    title: 'Confession Absurde',
    tone: 'genant',
    difficulty: 'moyen',
    duration: '2-3 min',
    setup: 'Tout le monde en cercle.',
    pro: true,
    rules: `Tour par tour, chaque joueur doit "confesser" quelque chose d'INVENTE mais de plus en plus absurde. Celui qui rit est accuse.

Regle : la confession doit commencer par "Je dois avouer quelque chose..." et le ton doit etre ULTRA serieux.

Exemples pour inspirer :
- "Je dois avouer... je n'ai jamais su faire un noeud de lacet. Je porte des scratchs depuis 15 ans."
- "Je dois avouer... je parle a mon frigo la nuit. Il s'appelle Jean-Pierre."
- "Je dois avouer... j'ai peur des cotons-tiges. C'est une longue histoire."

Chaque confession doit etre PLUS absurde que la precedente. Le cercle continue jusqu'a ce que quelqu'un craque.`,
  },
  {
    id: 'collective_007',
    title: 'L\'Orchestre Invisible',
    tone: 'physique',
    difficulty: 'facile',
    duration: '1-2 min',
    setup: 'Tout le monde debout face au joueur du Joker.',
    rules: `Le joueur du Joker est le chef d'orchestre. Il attribue un "instrument" ridicule a chaque joueur :
- Guitare air (classique)
- Triangle (un seul "ding" de temps en temps)
- Batterie (taper sur ses genoux)
- Flute avec le nez
- Maracas avec les pieds

Le Joker dirige l'orchestre : "LES FLUTES !" et seules les flutes jouent. "TOUT LE MONDE !" et tout le monde joue en meme temps.

Il fait des crescendos, des pauses dramatiques, et des solos. Le solo de triangle est OBLIGATOIRE.

Celui qui rit pendant son solo : accuse !`,
  },
  {
    id: 'collective_008',
    title: 'Le Debat Serieux',
    tone: 'absurde',
    difficulty: 'hard',
    duration: '2-3 min',
    setup: 'Diviser les joueurs en deux camps. Le Joker est moderateur.',
    pro: true,
    rules: `Le joueur du Joker modere un DEBAT TRES SERIEUX sur un sujet completement idiot.

Sujets possibles (le Joker choisit) :
- "L'eau plate est-elle superieure a l'eau gazeuse ?"
- "Faut-il mettre la cereale avant ou apres le lait ?"
- "Les chats sont-ils des espions du gouvernement ?"
- "Est-il acceptable de manger une pizza avec les mains a un rendez-vous ?"

Regles du debat :
1. Le moderateur donne la parole a chaque camp (30 secondes)
2. Chaque camp doit argumenter SERIEUSEMENT
3. Le moderateur pose des questions pieges : "Mais avez-vous des PREUVES ?"
4. A la fin, le moderateur vote... pour le camp qu'il veut. Sans justification.`,
  },
];

export function getRandomCollectiveGames(count: number, excludeIds: string[] = [], proOnly?: boolean): CollectiveGame[] {
  let pool = COLLECTIVE_GAMES.filter(g => !excludeIds.includes(g.id));
  if (proOnly === false) pool = pool.filter(g => !g.pro);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
