import type { Scene } from './index';

const scene: Scene = {
  id: 'scene_010',
  title: 'Le pauvre homme !',
  source: 'Molière — Tartuffe, Acte I, Scène 4',
  tone: 'absurde',
  difficulty: 'facile',
  duration: '3 min',
  playerCount: 2,
  setup: 'Orgon rentre de voyage et interroge Dorine sur ce qui s\'est passé en son absence. Quoi que Dorine raconte sur les malheurs de Madame, Orgon ne s\'intéresse qu\'à Tartuffe. Dorine décrit les festins de Tartuffe, et Orgon s\'apitoie : "Le pauvre homme !"',
  roles: [
    { name: 'ORGON', description: 'Bourgeois aveuglé par Tartuffe, incapable de s\'intéresser à sa propre femme' },
    { name: 'DORINE', description: 'Servante lucide et exaspérée, essaie en vain de faire réagir Orgon' },
  ],
  script: `ORGON : [entrant, manteau de voyage] Ah, Dorine ! Tout s'est-il bien passé ces deux jours ? Qu'est-ce qu'on fait céans ? Comme est-ce qu'on s'y porte ?

DORINE : Madame eut avant-hier la fièvre jusqu'au soir, avec ______ *(un symptôme médical exagéré)*.

ORGON : Et Tartuffe ?

DORINE : Tartuffe ? Il se porte à merveille, gros et gras, le teint frais et la bouche vermeille.

ORGON : Le pauvre homme !

DORINE : Le soir, Madame n'a pu toucher à rien. Elle ne pouvait pas manger, tant sa douleur de tête était grande.

ORGON : Et Tartuffe ?

DORINE : Il soupa, lui tout seul, devant elle, et fort dévotement il mangea deux perdrix, avec une moitié de gigot en hachis.

ORGON : Le pauvre homme !

DORINE : La nuit se passa tout entière sans que Madame pût fermer l'œil. Elle avait ______ *(une maladie ou affliction grotesque)* et nous dûmes veiller auprès d'elle jusqu'à l'aube.

ORGON : Et Tartuffe ?

DORINE : Pressé d'un sommeil agréable, il passa dans sa chambre au sortir de la table, et dans son lit bien chaud il se mit tout soudain, où sans trouble il dormit jusques au lendemain.

ORGON : Le pauvre homme !

DORINE : Enfin, au matin, Madame, à nos persuasions, consentit à voir le médecin. On lui fit une saignée, et elle faillit ______ *(une conséquence médicale dramatique)*.

ORGON : Et Tartuffe ?

DORINE : Il reprit courage comme il faut et, pour mieux se remonter l'âme, but à son déjeuner ______ *(un festin gargantuesque)*, en rendant grâce au Ciel de la bonté divine.

ORGON : Le pauvre homme !

DORINE : [exaspérée] Ils se portent tous deux fort bien enfin, et je vais à Madame annoncer par avance la part que vous prenez à sa convalescence.

ORGON : [seul, ému] Quel saint homme ! Il faut que j'aille le voir. Le pauvre homme !`,
};

export default scene;
