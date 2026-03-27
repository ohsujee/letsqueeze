import type { CollectiveGame } from './index';

const game: CollectiveGame = {
  id: 'collective_002',
  title: 'Le Doublage Catastrophe',
  tone: 'absurde',
  difficulty: 'moyen',
  duration: '3 min',
  pro: true,
  setup: 'Tout le monde s\'assoit face à la scène. Le Joker désigne 2 volontaires : un "Muet" (celui qui bouge et mime) et une "Voix" (celui qui improvise le doublage). Le Muet se place devant, la Voix juste derrière ou à côté.',
  rules: `Le Muet gesticule, mime et ouvre la bouche SANS émettre un son. La Voix improvise tout ce que le Muet est censé "dire" en temps réel. Le Joker est le réalisateur : il intervient ACTIVEMENT pendant la scène.

Déroulement :
1. Le Joker annonce un sujet (voir liste ci-dessous) et crie "ACTION !"
2. La paire joue la scène (~45 secondes)
3. PENDANT la scène, le Joker crie des modificateurs toutes les 15-20 secondes :
   → "ACCENT RUSSE !" — la Voix change d'accent immédiatement
   → "DOUBLE VITESSE !" — tout s'accélère (gestes ET voix)
   → "FILM D'HORREUR !" — la scène bascule dans l'épouvante
   → "ÉCHANGE !" — le Muet et la Voix inversent leurs rôles sur-le-champ
   → "NOUVELLE VOIX !" — le Joker pointe quelqu'un dans le public qui devient la nouvelle Voix
4. "COUPEZ !" → la scène s'arrête, nouveaux volontaires
5. Enchaîner 3 à 4 scènes en 3 minutes

Règle d'accusation : les PERFORMEURS sont immunisés pendant qu'ils jouent. Seul le PUBLIC peut être accusé de rire. Dès qu'un performeur retourne dans le public, il redevient accusable.

Sujets à attribuer (un par scène) :
- "Tu es un chirurgien qui opère à cœur ouvert tout en commentant un match de foot"
- "Tu fais un discours de remerciement aux Oscars pour le rôle d'une poubelle"
- "Tu es un agent immobilier qui vend un studio de 4m² comme un palace"
- "Tu es un présentateur météo qui annonce l'apocalypse avec le sourire"
- "Tu es un coach de vie qui donne des conseils existentiels en pleurant"
- "Tu es un serveur dans un restaurant étoilé qui décrit un plat à base de chaussettes"
- "Tu annonces ta démission à ton patron en le complimentant sans arrêt"
- "Tu es un commentateur sportif qui décrit quelqu'un qui fait la vaisselle"`,
  variants: [
    'La Voix a les yeux fermés et ne voit pas les gestes du Muet — décalage garanti',
    'Le Joker ajoute le modificateur "CHUCHOTEMENT !" — la Voix doit tout murmurer de manière dramatique',
  ],
};

export default game;
