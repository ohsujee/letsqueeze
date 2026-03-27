import type { Scene } from './index';

const scene: Scene = {
  id: 'scene_002',
  title: 'La Leçon de Philosophie',
  source: 'Molière — Le Bourgeois gentilhomme, Acte II, Scène 4',
  tone: 'absurde',
  difficulty: 'facile',
  duration: '3 min',
  playerCount: 2,
  setup: 'Monsieur Jourdain, riche bourgeois, prend sa leçon de philosophie. Il découvre avec émerveillement qu\'il fait de la prose depuis quarante ans.',
  roles: [
    { name: 'LE MAÎTRE', description: 'Professeur de philosophie, patient puis dépassé par la bêtise' },
    { name: 'JOURDAIN', description: 'Bourgeois naïf et enthousiaste, émerveillé par tout ce qu\'il apprend' },
  ],
  script: `LE MAÎTRE : Que voulez-vous que je vous enseigne ?

JOURDAIN : Apprenez-moi l'orthographe.

LE MAÎTRE : Soit. Pour bien suivre votre pensée, il faut commencer par une exacte connaissance de la nature des lettres. La voix A se forme en ouvrant fort la bouche : A.

JOURDAIN : A, A. Oui !

LE MAÎTRE : La voix E se forme en rapprochant la mâchoire d'en bas de celle d'en haut : A, E.

JOURDAIN : A, E, A, E. Ma foi, oui ! Ah, que cela est beau !

LE MAÎTRE : Et la voix I, en rapprochant encore davantage les mâchoires l'une de l'autre : A, E, I.

JOURDAIN : A, E, I, I, I, I. Cela est vrai ! Vive la science ! Et le ______ *(un son d'animal)*, comment fait-on ?

LE MAÎTRE : [perplexe] Le... pardon ?

JOURDAIN : Oui ! Le ______ *(même son inventé)* ! Ma femme le fait quand elle est en colère. C'est de la philosophie aussi, non ?

LE MAÎTRE : [tousse] Passons. Il y a, Monsieur Jourdain, trois manières de s'exprimer : la prose, le vers... et ______ *(un type de bruit humain : rot, sifflement, etc.)*.

JOURDAIN : Et quand on dit « Nicole, apportez-moi mes pantoufles », c'est quoi ?

LE MAÎTRE : De la prose.

JOURDAIN : Par ma foi ! Il y a plus de quarante ans que je dis de la prose sans que j'en susse rien, et je vous suis le plus obligé du monde de m'avoir appris cela !

LE MAÎTRE : Bien. Maintenant, si vous voulez écrire un billet doux à une belle marquise...

JOURDAIN : Oui ! Oui ! Mettez : « Belle marquise, vos beaux yeux me font mourir d'amour. »

LE MAÎTRE : On peut mettre d'abord : « Vos beaux yeux me font, belle marquise, mourir d'amour. » Ou bien : « D'amour mourir me font, belle marquise, vos beaux yeux. »

JOURDAIN : Mais de toutes ces façons-là, laquelle est la meilleure ?

LE MAÎTRE : Celle que vous avez dite : « Belle marquise, vos beaux yeux me font mourir d'amour. »

JOURDAIN : Et pourtant je n'ai jamais étudié ! Du premier coup ! Comme ça ! [se tourne vers le public] Et moi qui croyais que pour être philosophe il fallait ______ *(complétez avec une condition absurde)* !

LE MAÎTRE : [se prend la tête] Monsieur Jourdain, la philosophie, c'est l'amour de la sagesse, c'est...

JOURDAIN : Attendez, attendez ! J'ai une question de philosophie ! Si ma femme me dit « tu es un imbécile », c'est de la prose ou du vers ?

LE MAÎTRE : De la prose, hélas.

JOURDAIN : Et si elle le chante ?

LE MAÎTRE : ...du vers, je suppose.

JOURDAIN : MAGNIFIQUE ! Donc quand elle me crie dessus, je n'ai qu'à lui dire : « Madame, veuillez formuler vos insultes en vers, s'il vous plaît. » C'est ça la philosophie !

LE MAÎTRE : [ramasse ses affaires] Je crois que la leçon est terminée pour aujourd'hui.`,
};

export default scene;
