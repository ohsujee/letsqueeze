import type { Scene } from './index';

const scene: Scene = {
  id: 'scene_011',
  title: 'La Calomnie',
  source: 'Beaumarchais — Le Barbier de Séville, Acte II, Scène 8',
  tone: 'absurde',
  difficulty: 'moyen',
  duration: '3 min',
  playerCount: 2,
  pro: true,
  setup: 'Basile, maître de musique véreux, explique au vieux docteur Bartholo comment détruire la réputation du Comte Almaviva grâce à la calomnie. Il décrit le processus comme un crescendo musical, de la rumeur murmurée au scandale public.',
  roles: [
    { name: 'BASILE', description: 'Maître de musique sournois, décrit la calomnie comme une symphonie maléfique' },
    { name: 'BARTHOLO', description: 'Vieux docteur jaloux, veut empêcher Rosine d\'épouser le Comte' },
  ],
  script: `BARTHOLO : Mais enfin, Basile, comment nous défaire de ce Comte ? Il rôde autour de Rosine comme un vautour !

BASILE : La calomnie, Monsieur ? Vous ne savez guère ce que vous dédaignez. J'ai vu les plus honnêtes gens près d'en être accablés. Croyez qu'il n'y a pas de plate méchanceté, pas d'horreurs, pas de conte absurde, qu'on ne fasse adopter aux oisifs d'une grande ville.

BARTHOLO : Et comment procède-t-on ?

BASILE : D'abord un bruit léger, rasant le sol comme hirondelle avant l'orage, pianissimo, murmure et file, et sème en courant le trait empoisonné. On chuchote à l'oreille : « Il paraît que le Comte ______ *(une rumeur embarrassante sur sa vie privée)* ».

BARTHOLO : [intéressé] Ah ? On dit ça ?

BASILE : Non, non, pas encore. Mais patience ! Piano, piano. Quelqu'un le recueille, et piano, piano, vous le glissez en oreille adroitement. Le mal est fait. On murmure au salon : « Vous savez que le Comte... eh bien, figurez-vous qu'il a ______ *(un détail physique moqueur : tic, difformité, habitude corporelle)* ! » Tout le monde le regarde différemment.

BARTHOLO : Mais c'est épouvantable !

BASILE : Mezzo forte ! La rumeur enfle, et tel bouche qui la reçoit la rend en canonnant. On s'indigne dans les cercles : « Le Comte ! Ce scélérat ! On a découvert qu'il ______ *(une accusation financière scandaleuse)* ! » Les gens reculent d'horreur !

BARTHOLO : [ravi et effrayé] Diable ! Continuez !

BASILE : Forte ! Le public gronde ! La haine éclate ! Rinforzando ! On crie, on tempête dans les rues ! C'est un crescendo public, un chorus universel de haine et de proscription ! Il n'y a pas un ami qui ne vous accuse, pas un parent qui ne vous renie !

BARTHOLO : [admiratif] Mais c'est... c'est du génie !

BASILE : Fortissimo ! Et voyez ! Le tonnerre, la tempête, le tremblement de terre ! C'est un vacarme, un tohu-bohu général ! Et le pauvre diable calomnié ? Il est par terre, écrasé, anéanti ! Il croupit dans l'opprobre — et tout ça grâce à ______ *(la toute première rumeur embarrassante)*, qui n'était qu'un petit bruit léger !

BARTHOLO : [après un silence] C'est magnifique, Basile. Mais... si quelqu'un vérifie ?

BASILE : Vérifier ? Personne ne vérifie ! La calomnie, Monsieur, la calomnie ! Il n'y a rien de si sot que les sots !

BARTHOLO : Vous avez raison. Calomniez, calomniez ! Il en restera toujours quelque chose !

BASILE : [s'inclinant] C'est ce qu'on dit. [à part] Surtout quand on me paie pour ça.`,
};

export default scene;
