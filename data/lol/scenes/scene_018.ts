import type { Scene } from './index';

const scene: Scene = {
  id: 'scene_018',
  title: 'Le Lièvre et la Tortue',
  source: 'La Fontaine — Le Lièvre et la Tortue, Livre VI, Fable 10',
  tone: 'absurde',
  difficulty: 'facile',
  duration: '3 min',
  playerCount: 3,
  pro: true,
  setup: 'Une tortue défie un lièvre à la course. Le lièvre, sûr de lui, traîne en chemin. La tortue avance sans relâche. Le public connaît la fin, mais le trajet est savoureux.',
  roles: [
    { name: 'LE NARRATEUR', description: 'Raconte avec malice, savoure l\'humiliation du lièvre' },
    { name: 'LE LIÈVRE', description: 'Arrogant et moqueur, prend tout à la légère, panique trop tard' },
    { name: 'LA TORTUE', description: 'Calme, déterminée, humble dans la victoire' },
  ],
  script: `LE NARRATEUR : Rien ne sert de courir ; il faut partir à point.
Le Lièvre et la Tortue en sont un ______ *(un nom, rime avec "point")*.

LA TORTUE : [posément] Gageons que vous n'atteindrez point
Sitôt que moi ce but.

LE LIÈVRE : [explosant de rire] Sitôt ? Êtes-vous sage ?
Vous, me battre à la course ? Il faudrait qu'on vous ______ *(verbe, rime avec "sage")* !
Repartit l'animal léger.
Ma commère, il vous faut ______ *(verbe, rime avec "léger")*.

LA TORTUE : Sage ou non, je parie encore.

LE NARRATEUR : Ainsi fut fait ; et de tous deux
On mit près du but les ______ *(un nom, rime avec "deux")*.
N'importe quoi, la Tortue part la première.
Le Lièvre, lui, juge l'affaire sans ______ *(un nom, rime avec "première")*.

LE LIÈVRE : [bâillant] Laissons la Tortue aller son train de sénateur.
Elle part, elle s'évertue,
Elle se hâte avec lenteur.
Moi, j'ai le temps de brouter l'herbe,
De dormir, et d'écouter ______ *(un nom, rime avec "herbe")*.

LE NARRATEUR : Il s'amuse à toute autre chose qu'à la course.
Il broute, il se repose, il s'amuse, il ______ *(verbe, rime avec "course")*.
Cependant la Tortue avance, pas à pas,
Et ne s'arrête pas.

LE LIÈVRE : [soudain paniqué] Mais... où est-elle ?! [regarde au loin] Elle est presque au bout !

LE NARRATEUR : Il partit comme un trait ; mais les élans qu'il fit
Furent vains : la Tortue arriva la ______ *(adjectif, rime avec "fit")*.

LA TORTUE : [sereine] Eh bien ! Qu'avais-je dit ?
À quoi vous sert votre vitesse ?
Moi, j'ai gagné. Et si vous aviez sur le dos
Une maison, vous seriez arrivé bien plus tôt !

LE LIÈVRE : [effondré] C'est impossible... J'ai perdu contre une... une...

LA TORTUE : [souriante] Une Tortue. Bonne journée.`,
};

export default scene;
