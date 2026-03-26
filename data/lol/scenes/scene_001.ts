import type { Scene } from './index';

const scene: Scene = {
  id: 'scene_001',
  title: 'Le Malade et sa Servante',
  source: 'Molière — Le Malade imaginaire, Acte III, Scène 10',
  tone: 'absurde',
  difficulty: 'facile',
  duration: '3 min',
  playerCount: 2,
  setup: 'Toinette s\'est déguisée en médecin pour examiner Argan, le malade imaginaire. Elle prend un ton doctoral absurde. Argan ne la reconnaît pas (ou fait semblant).',
  roles: [
    { name: 'TOINETTE', description: 'Servante déguisée en médecin, diagnostique tout par "le poumon"' },
    { name: 'ARGAN', description: 'Hypocondriaque convaincu, énumère ses maux avec passion' },
  ],
  script: `TOINETTE : [entre avec gravité] Donnez-moi votre pouls. [lui prend le bras] Allons donc, que l'on batte comme il faut. Ah, je vous ferai bien aller comme vous devez. Ce pouls-là fait l'impertinent.

ARGAN : Ah, docteur, je suis ravi de vous voir ! J'ai ______ *(décrivez un symptôme absurde)*.

TOINETTE : [hochant la tête] Je vois, je vois. Vous avez là un pouls qui ne sait ce qu'il veut dire. Quel âge avez-vous ?

ARGAN : Ah... comment, quel âge ?

TOINETTE : Oui. Quel âge avez-vous ?

ARGAN : Moi ? J'ai ______ *(un âge et une justification ridicule)*.

TOINETTE : [très sérieuse] C'est bien ce que je pensais. Vous êtes bien malade.

ARGAN : Oui, docteur. Surtout quand je mange, j'ai mal au...

TOINETTE : Le poumon.

ARGAN : Non, j'ai mal au ventre, et parfois...

TOINETTE : Le poumon.

ARGAN : Mais je vous dis que c'est pas le poumon ! J'ai des douleurs dans la tête...

TOINETTE : Le poumon.

ARGAN : [exaspéré] Mais enfin ! Ce n'est point le poumon ! C'est ______ *(un organe ou un mal imaginaire)* !

TOINETTE : Le poumon, vous dis-je. Que sentez-vous ?

ARGAN : Je sens quelquefois des douleurs de tête.

TOINETTE : Justement, le poumon.

ARGAN : Il me semble parfois que j'ai un voile devant les yeux.

TOINETTE : Le poumon.

ARGAN : J'ai quelquefois des maux de cœur.

TOINETTE : Le poumon. [pause] Vous mangez bien ?

ARGAN : Oui, docteur.

TOINETTE : Le poumon. Vous aimez le vin ?

ARGAN : Oui, docteur.

TOINETTE : Le poumon. [s'approche avec autorité] Il vous faut un traitement de choc. Mon ordonnance : ______ *(prescrivez un traitement complètement absurde)*. Tous les matins, à jeun.

ARGAN : Mais docteur, c'est impossible !

TOINETTE : Ignorant ! C'est pour purger votre — devinez quoi ?

ARGAN : ...le poumon ?

TOINETTE : LE POUMON ! Voilà un médecin qui commence à raisonner. [salue et sort avec dignité]`,
};

export default scene;
