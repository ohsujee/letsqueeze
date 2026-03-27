import type { Scene } from './index';

const scene: Scene = {
  id: 'scene_017',
  title: 'Le Loup et l\'Agneau',
  source: 'La Fontaine — Le Loup et l\'Agneau, Livre I, Fable 10',
  tone: 'dark',
  difficulty: 'moyen',
  duration: '3 min',
  playerCount: 3,
  setup: 'Un agneau boit tranquillement dans un ruisseau. Un loup affamé surgit et cherche un prétexte pour le dévorer. Le dialogue est un faux procès où la conclusion est écrite d\'avance.',
  roles: [
    { name: 'LE NARRATEUR', description: 'Pose le décor avec gravité, annonce la morale et la chute finale' },
    { name: 'LE LOUP', description: 'Prédateur de mauvaise foi, cherche des excuses ridicules pour manger l\'agneau' },
    { name: 'L\'AGNEAU', description: 'Victime logique et polie, démonte chaque argument mais n\'a aucune chance' },
  ],
  script: `LE NARRATEUR : La raison du plus fort est toujours la meilleure.
Nous l'allons montrer tout à l'heure.

Un Agneau se désaltérait
Dans le courant d'une onde ______ *(adjectif, rime avec "désaltérait")*.
Un Loup survient à jeun, qui cherchait ______ *(un nom, rime avec "loup")*.
Et que la faim en ces lieux ______ *(verbe, rime avec "aventure")*.

LE LOUP : [menaçant] Qui te rend si hardi de troubler mon breuvage ?
Dit cet animal plein de ______ *(un nom, rime avec "breuvage")*.
Tu seras châtié de ta ______ *(un nom, rime avec "hardi")*.

L'AGNEAU : Sire, que Votre Majesté
Ne se mette pas en colère ;
Mais plutôt qu'elle considère
Que je me vas désaltérant
Dans le courant,
Plus de vingt pas au-dessous d'Elle ;
Et que par conséquent, en aucune façon,
Je ne puis troubler sa ______ *(un nom, rime avec "façon")*.

LE LOUP : Tu la troubles ! Et je sais que de moi
Tu médis l'an passé.

L'AGNEAU : Comment l'aurais-je fait si je n'étais pas né ?
Je tette encor ma mère.

LE LOUP : Si ce n'est toi, c'est donc ton frère.

L'AGNEAU : Je n'en ai point.

LE LOUP : C'est donc quelqu'un des tiens ;
Car vous ne m'épargnez guère,
Vous, vos bergers et vos ______ *(un nom, rime avec "tiens")*.
On me l'a dit : il faut que je me venge !

L'AGNEAU : [suppliant] Mais comment me venger d'un tort que j'ignore ?
Je suis petit, je suis sans ______ *(un nom, rime avec "ignore")*.

LE NARRATEUR : Là-dessus, au fond des forêts
Le Loup l'emporte et puis le mange,
Sans autre forme de procès.`,
};

export default scene;
