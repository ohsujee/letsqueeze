import type { Scene } from './index';

const scene: Scene = {
  id: 'scene_013',
  title: 'Le Sonnet de Trissotin',
  source: 'Molière — Les Femmes savantes, Acte III, Scène 2',
  tone: 'cringe',
  difficulty: 'hard',
  duration: '3 min',
  playerCount: 4,
  pro: true,
  setup: 'Trissotin, poète médiocre mais adulé, lit son dernier sonnet devant trois femmes qui rivalisent d\'extase à chaque vers. Plus le vers est banal, plus les réactions sont démesurées. Les trois femmes se coupent la parole pour exprimer leur admiration.',
  roles: [
    { name: 'TRISSOTIN', description: 'Poète vaniteux, savoure chaque compliment, fait durer le plaisir' },
    { name: 'PHILAMINTE', description: 'Mère de famille, intellectuelle autoproclamée, s\'évanouit presque d\'admiration' },
    { name: 'ARMANDE', description: 'Fille aînée pédante, analyse chaque vers avec une passion exagérée' },
    { name: 'BÉLISE', description: 'Tante exaltée, croit que chaque vers parle d\'elle, réagit physiquement' },
  ],
  script: `TRISSOTIN : [toussotant avec importance] Mesdames, j'ai composé hier un petit sonnet sur la fièvre qui a pris une princesse. Et je crois que vous le trouverez assez joli.

PHILAMINTE : Ah ! Nous sommes prêtes ! Un sonnet de Monsieur Trissotin !

ARMANDE : Les vers de Monsieur Trissotin ont des grâces qu'on ne trouve nulle part ailleurs !

BÉLISE : Je sens déjà que je vais défaillir.

TRISSOTIN : [déployant son papier] « Votre prudence est endormie, de traiter magnifiquement et de loger superbement votre plus cruelle ennemie. »

PHILAMINTE : ______ *(une exclamation admirative)* !

ARMANDE : Quelle finesse ! « Votre plus cruelle ennemie » ! C'est la fièvre qu'il veut dire !

BÉLISE : [frissonnant] Ah, c'est exactement ce que je ressens quand j'ai chaud !

TRISSOTIN : [flatté] Vous aimez ce début ? Attendez la suite. « Faites-la sortir, quoi qu'on die, de votre riche appartement, où cette ingrate insolemment attaque votre belle vie. »

ARMANDE : ______ *(une réaction intellectuelle exagérée)* !

BÉLISE : « Attaque votre belle vie » ! Mon Dieu, c'est MOI qu'il décrit ! Je suis attaquée !

PHILAMINTE : Taisez-vous, Bélise ! Ce vers est universel ! C'est du génie pur !

TRISSOTIN : [ravi] Mesdames, mesdames, il reste encore les tercets. « Quoi ? Sans respecter votre rang, elle se prend à votre sang, et nuit et jour vous fait outrage ! »

PHILAMINTE : ______ *(un cri d'admiration physique)* !

BÉLISE : ______ *(une réaction émotionnelle démesurée)* !

ARMANDE : Le mot « outrage » ! Quel choix ! Quelle AUDACE ! On dirait un coup d'épée dans la langue française !

TRISSOTIN : [se rengorgeant] Et voici le coup final, le trait, la pointe. « Si vous la conduisez aux bains, ce n'est plus prendre soin de votre mal, c'est vouloir noyer les gens ! »

PHILAMINTE : ______ *(un superlatif impossible)* ! On n'a rien écrit de pareil depuis les Anciens !

ARMANDE : ______ *(une analyse littéraire délirante)* !

BÉLISE : ______ *(une réaction physique incontrôlée)* ! Je n'en puis plus !

TRISSOTIN : [modeste] Ce n'est qu'une petite bagatelle, un rien...

PHILAMINTE : Comment, une bagatelle ? C'est un chef-d'œuvre ! Il faut l'envoyer à l'Académie !

ARMANDE : Immédiatement ! Et en plusieurs exemplaires !

BÉLISE : Et gravé dans le marbre !

TRISSOTIN : [faussement humble] Mesdames, vous me flattez. Mais puisque vous insistez... j'ai aussi un madrigal. Et une épigramme. Et une ode.

PHILAMINTE : Lisez ! Lisez tout !

BÉLISE : Je vais chercher des sels, je sens que je vais m'évanouir de bonheur !

ARMANDE : ______ *(une supplique intellectuelle désespérée)* !

TRISSOTIN : [se rasseyant avec délice] Très bien. « Sur un carrosse de couleur amarante, donné à une dame de ses amies... » Cela fait quatorze strophes.

PHILAMINTE : [aux anges] Quatorze ! Quel festin !

BÉLISE : [s'éventant] Je ne survivrai pas.`,
};

export default scene;
