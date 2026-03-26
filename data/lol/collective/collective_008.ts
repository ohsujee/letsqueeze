import type { CollectiveGame } from './index';

const game: CollectiveGame = {
  id: 'collective_008',
  title: 'Le Commentateur Sportif',
  tone: 'absurde',
  difficulty: 'hard',
  duration: '3 min',
  setup: 'Le Joker observe le groupe. Les autres joueurs font des actions normales (boire, s\'asseoir, se gratter, etc.).',
  pro: true,
  rules: `Le Joker commente les actions banales des autres joueurs comme si c'était la finale de la Coupe du Monde. Les autres doivent continuer leurs actions normalement SANS RIRE.

Le Joker doit :
- Parler FORT, avec PASSION, comme un vrai commentateur
- Donner des surnoms épiques aux joueurs ("LE TITAN", "LA MACHINE", "LE PHÉNOMÈNE")
- Créer du suspense sur des gestes minuscules
- Faire des analyses tactiques absurdes

Exemples de commentaires :
- "IL PREND SON VERRE ! QUELLE TECHNIQUE ! Regardez l'angle du poignet, c'est CHIRURGICAL !"
- "ELLE SE GRATTE LE NEZ ! OH ! OH ! La France retient son souffle ! Est-ce le nez droit ? OUI ! C'est le nez DROIT !"
- "Il croise les bras ! INCROYABLE stratégie défensive ! On n'avait pas vu ça depuis la finale de 98 !"
- "ELLE BÂILLE ! QUELLE PROVOCATION ! C'est un message envoyé à ses adversaires ! 'Je m'ennuie face à vous !' Quel CULOT !"
- "Il regarde son téléphone... TEMPS MORT TACTIQUE ! Le coach lui envoie des instructions !"
- "ATTENTION ! Elle replace une mèche de cheveux ! C'est le geste signature ! LE PUBLIC EST EN DÉLIRE !"

Le Joker peut demander aux joueurs de faire des actions spécifiques pour les commenter. Quiconque rit ou casse son action : accusé !`,
  variants: [
    'Deux joueurs commentent en même temps, chacun avec une version différente',
    'Le Joker fait des ralentis : "Revoyons l\'action..." et le joueur doit refaire son geste au ralenti',
  ],
};

export default game;
