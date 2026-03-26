import type { Scene } from './index';

const scene: Scene = {
  id: 'scene_008',
  title: 'La Consultation Médicale',
  source: 'Molière — Le Médecin malgré lui, Acte II, Scène 4',
  tone: 'absurde',
  difficulty: 'hard',
  duration: '3 min',
  playerCount: 3,
  setup: 'Sganarelle, un bûcheron ivrogne, a été battu jusqu\'à ce qu\'il accepte de se faire passer pour médecin. Il examine Lucinde (qui feint d\'être muette) devant son père Géronte, paniqué.',
  roles: [
    { name: 'SGANARELLE', description: 'Faux médecin improvisé, invente du latin et des diagnostics avec aplomb' },
    { name: 'GÉRONTE', description: 'Père riche et crédule, désespéré par la maladie de sa fille' },
    { name: 'LUCINDE', description: 'Fille qui feint d\'être muette, ne communique que par gestes et grognements' },
  ],
  script: `GÉRONTE : [amenant Lucinde] Monsieur le médecin, voici ma fille. Elle est muette, sans que jusques ici j'aie pu en savoir la cause.

SGANARELLE : [examinant Lucinde de loin] Fort bien. Qu'elle s'approche. [Lucinde s'approche] Donnez-moi votre bras. [lui prend le pouls] Voilà un pouls qui marque que votre fille est muette.

GÉRONTE : Oui, Monsieur, c'est là son mal. Vous l'avez trouvé du premier coup.

SGANARELLE : Ah, ah ! [avec importance] Nous autres grands médecins, nous connaissons d'abord les choses. Un ignorant aurait été embarrassé ; mais moi, du premier coup : muette.

GÉRONTE : Mais d'où cela vient-il ?

SGANARELLE : Il n'est rien de plus aisé. Cela vient de ce qu'elle a perdu la parole.

GÉRONTE : Oui, mais la cause, s'il vous plaît, qui fait qu'elle a perdu la parole ?

SGANARELLE : Aristote, là-dessus, dit... de fort belles choses. C'est que... ______ *(une explication pseudo-médicale en faux latin)*.

GÉRONTE : [impressionné] Ah ! Que voilà un grand homme !

SGANARELLE : Grand homme, oui. Or ces humeurs étant causées... [Lucinde fait des gestes désespérés] Taisez-vous, je vous prie ! Le médecin parle !

LUCINDE : [fait des bruits frustrés] Mmh ! Mmh !

SGANARELLE : Nous disions donc que ces vapeurs formées par les exhalaisons des influences qui partent de la région des maladies, venant... pour ainsi dire... ______ *(enchaînez du charabia médical avec des mots au hasard)*.

GÉRONTE : [ébloui] On ne peut pas mieux raisonner, sans doute. Mais dites-moi, que faut-il faire ?

SGANARELLE : Ce qu'il faut faire ? Mon ordonnance, la voici. [solennel] Premièrement : du pain trempé dans du vin.

GÉRONTE : Du pain trempé dans du vin ?

SGANARELLE : Oui ! Ne voyez-vous pas que le pain donne la croûte aux mots, et que le vin délie la langue ? Pain et vin ! Les deux ensemble font ______ *(un terme médical latin bidon)*.

GÉRONTE : C'est vrai ! C'est vrai ! Comment n'y ai-je pas pensé ?

LUCINDE : [soudainement, crie] JE NE VEUX PAS ÉPOUSER L'HOMME QUE VOUS M'IMPOSEZ !

GÉRONTE : [stupéfait] Elle parle !

SGANARELLE : [triomphant] Et voilà ! C'est mon remède qui fait effet ! Ah, quel grand médecin je suis !

GÉRONTE : Oui mais... elle dit qu'elle ne veut pas se marier !

SGANARELLE : Ah ça, c'est un autre mal. Celui-là est plus grave. Je prescris ______ *(prescrivez un remède absurde contre la désobéissance)*.

GÉRONTE : Mais docteur, est-ce que ça va marcher ?

SGANARELLE : Monsieur, je suis médecin. Remettez-vous en moi. ______ *(une formule latine de conclusion solennelle)* ! Ça fera 400 livres.

LUCINDE : [redevenue muette] Mmh ! Mmh ! [fait non de la tête]

GÉRONTE : [payant] Quel grand homme ! Quel grand homme !

SGANARELLE : [empochant, au public] Voilà une maladie qui me plaît fort.`,
};

export default scene;
