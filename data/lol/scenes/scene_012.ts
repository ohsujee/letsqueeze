import type { Scene } from './index';

const scene: Scene = {
  id: 'scene_012',
  title: 'Vous l\'avez voulu, George Dandin !',
  source: 'Molière — George Dandin, Acte I (adapté)',
  tone: 'genant',
  difficulty: 'moyen',
  duration: '3 min',
  playerCount: 3,
  pro: true,
  setup: 'George Dandin, riche paysan, a épousé Angélique, fille de la noble famille de Sotenville. Il regrette amèrement ce mariage. Chaque fois qu\'il accuse sa femme, sa belle-mère prend le parti d\'Angélique et l\'humilie. Dandin finit toujours par se lamenter seul.',
  roles: [
    { name: 'GEORGE DANDIN', description: 'Paysan marié au-dessus de sa condition, accuse sa femme mais n\'est jamais cru' },
    { name: 'ANGÉLIQUE', description: 'Jeune aristocrate dédaigneuse, retourne chaque accusation avec aplomb' },
    { name: 'MADAME DE SOTENVILLE', description: 'Belle-mère hautaine, défend sa fille avec un mépris glacial pour Dandin' },
  ],
  script: `GEORGE DANDIN : [seul] Ah ! qu'une femme Demoiselle est une étrange affaire, et que mon mariage est une leçon bien parlante à tous les paysans qui veulent s'élever au-dessus de leur condition !

ANGÉLIQUE : [entrant] Eh bien, Monsieur, qu'avez-vous encore à grogner ?

GEORGE DANDIN : J'ai, Madame, que vous êtes rentrée à deux heures du matin, et que ______ *(une accusation domestique précise)* !

ANGÉLIQUE : [offensée] Moi ? Comment osez-vous ? J'étais simplement chez ma cousine, et nous avons parlé de broderie !

GEORGE DANDIN : De broderie ! Jusqu'à deux heures du matin !

MADAME DE SOTENVILLE : [entrant majestueusement] Qu'est-ce que j'entends ? Vous osez accuser ma fille ? Apprenez, petit bonhomme, que vous avez épousé une Demoiselle de Sotenville ! Les Sotenville ne mentent JAMAIS !

GEORGE DANDIN : Mais, belle-mère, je vous assure que—

MADAME DE SOTENVILLE : Taisez-vous ! Un homme de votre extraction devrait ______ *(une humiliation sociale)* plutôt que de calomnier une femme de qualité !

GEORGE DANDIN : [seul] Vous l'avez voulu, vous l'avez voulu, George Dandin, vous l'avez voulu !

ANGÉLIQUE : [revenant] D'ailleurs, Monsieur, puisque nous en sommes aux reproches, c'est moi qui devrais me plaindre. Savez-vous ce qu'on dit de vous au village ?

GEORGE DANDIN : Qu'est-ce qu'on dit ?

ANGÉLIQUE : On dit que vous ______ *(une activité noble et vertueuse — l'inverse de ce qu'on reprocherait)*.

GEORGE DANDIN : C'est un mensonge ! C'est vous qui—

MADAME DE SOTENVILLE : Encore ! Vous recommencez ! Savez-vous que mon défunt mari, Monsieur de Sotenville, aurait fait passer un rustre pareil par la fenêtre ? Et il aurait eu raison !

GEORGE DANDIN : Mais Madame, les faits sont là—

MADAME DE SOTENVILLE : Les faits ! Les faits ! Un paysan qui parle de faits ! Apprenez qu'une Sotenville a toujours raison, même quand elle a tort ! C'est le PRIVILÈGE de la noblesse !

ANGÉLIQUE : Voyez, Monsieur ? Même ma mère le dit. C'est vous le coupable. Maintenant, excusez-vous.

GEORGE DANDIN : Que je m'excuse ?! C'est le monde à l'envers !

MADAME DE SOTENVILLE : ______ *(un ordre humiliant donné à Dandin)*, et que je n'entende plus parler de cette affaire !

GEORGE DANDIN : [résigné] Oui, Madame. Pardon, Madame.

ANGÉLIQUE : Bien. Voilà un mari raisonnable. [sort avec sa mère]

GEORGE DANDIN : [seul, accablé] Ah ! vous l'avez voulu, George Dandin, vous l'avez voulu ! Vous avez justement ce que vous méritez !

MADAME DE SOTENVILLE : [passant la tête] J'ai oublié : ______ *(une dernière exigence absurde)*.

GEORGE DANDIN : Oui, belle-mère. [elle sort] Vous l'avez voulu... George Dandin... vous l'avez voulu.`,
};

export default scene;
