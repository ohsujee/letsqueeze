import type { CollectiveGame } from './index';

const game: CollectiveGame = {
  id: 'collective_006',
  title: 'Le Ralenti Dramatique',
  tone: 'physique',
  difficulty: 'moyen',
  duration: '3 min',
  setup: 'Espace pour bouger. Le Joker est le narrateur. Tout le monde se prépare à mimer.',
  rules: `Le Joker annonce une scène du quotidien. Tous les joueurs doivent l'exécuter en EXTRÊME ralenti, comme dans un film d'action. Pendant ce temps, le Joker fait la narration dramatique en voix off.

Déroulement :
1. Le Joker annonce la scène
2. Tout le monde la joue au ralenti (TRÈS lent, chaque geste dure 5-10 secondes)
3. Le Joker commente comme un narrateur de documentaire dramatique
4. Quiconque accélère ou rit : accusé !

Scènes à jouer :
- "Vous ouvrez le frigo et il n'y a plus rien à manger" (le Joker : "Le drame... Le néant... Rien que du vide et un vieux yaourt périmé...")
- "Vous recevez un message de votre ex" (le Joker : "La main tremble... Le cœur s'arrête... C'est un simple 'salut ça va ?'... MAIS QUE VEUT-IL DIRE ?!")
- "Vous marchez sur un Lego" (le Joker : "Le pied se pose... La douleur monte... Cosmique... Ancestrale...")
- "Vous essayez de prendre un selfie de groupe" (le Joker : "Le bras se lèèèève... Mais la lumière n'est pas bonne... On recommence...")
- "Vous découvrez l'addition au restaurant" (le Joker : "Les yeux parcourent le papier... 47 euros le dessert... Le monde s'effondre...")

VARIANTE OBLIGATOIRE : Le Joker désigne UN joueur qui fait la scène en vitesse normale pendant que tous les autres sont au ralenti. Le contraste visuel est la source principale de comédie.

Le Joker doit maintenir la narration dramatique avec le plus grand sérieux possible. 2-3 scènes en 3 minutes.`,
  variants: [
    'Un joueur fait la scène en accéléré pendant que les autres sont au ralenti',
    'Le Joker peut crier "PAUSE !" et tout le monde doit se figer',
  ],
};

export default game;
