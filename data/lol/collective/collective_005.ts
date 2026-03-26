import type { CollectiveGame } from './index';

const game: CollectiveGame = {
  id: 'collective_005',
  title: 'La Chorale Absurde',
  tone: 'physique',
  difficulty: 'facile',
  duration: '3 min',
  setup: 'Tout le monde debout face au Joker, qui est le chef de chœur. Le Joker choisit une chanson connue de tous.',
  rules: `Le Joker dirige une chorale où tout le monde chante la MÊME chanson mais chacun reçoit une émotion différente qu'il doit incarner en chantant.

Déroulement :
1. Le Joker choisit une chanson que tout le monde connaît (ex : "Joyeux Anniversaire", "Frère Jacques", "La Marseillaise", "Libérée Délivrée")
2. Il attribue une émotion à chaque joueur (en secret ou à voix haute)
3. Tout le monde chante EN MÊME TEMPS, chacun dans son émotion
4. Le Joker peut crier "SWITCH !" → chacun prend l'émotion de son voisin de droite

Émotions à distribuer :
- Rage absolue (chanter en criant de colère)
- Séduction maximale (chanter en mode ultra sensuel)
- Terreur pure (chanter comme si un monstre approchait)
- Ennui mortel (chanter en bâillant, monotone)
- Tristesse déchirante (chanter en sanglotant)
- Hype de DJ (chanter comme si c'était un drop de festival)
- Constipation intense (chanter en forçant)
- Opéra dramatique (tout donner, vibrato maximum)

Le Joker peut pointer un joueur pour un SOLO — il chante seul pendant 10 secondes dans son émotion pendant que tout le monde le regarde en silence. Quiconque rit pendant le solo : accusé !

Le chaos sonore de 6 personnes chantant "Frère Jacques" en rage/séduction/terreur EST la blague. Quiconque arrête de chanter pour rire : accusé !`,
  variants: [
    'Le Joker peut pointer quelqu\'un pour un SOLO dans son émotion',
    'Changer de chanson sans prévenir : "MAINTENANT : LA MARSEILLAISE !"',
  ],
};

export default game;
