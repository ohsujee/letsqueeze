import type { Scene } from './index';

const scene: Scene = {
  id: 'scene_021',
  title: 'Le Rat de Ville et le Rat des Champs',
  source: 'La Fontaine — Le Rat de Ville et le Rat des Champs, Livre I, Fable 9',
  tone: 'wholesome',
  difficulty: 'facile',
  duration: '3 min',
  playerCount: 2,
  pro: true,
  setup: 'Le Rat de Ville invite son ami le Rat des Champs à un festin luxueux en ville. Mais le repas est sans cesse interrompu par des bruits terrifiants. Le Rat des Champs préfère sa vie simple.',
  roles: [
    { name: 'LE RAT DE VILLE', description: 'Mondain, snob, vante le luxe urbain — mais sursaute au moindre bruit' },
    { name: 'LE RAT DES CHAMPS', description: 'Simple, honnête, émerveillé d\'abord puis dégoûté par le stress de la ville' },
  ],
  script: `LE RAT DE VILLE : [narrant] Autrefois le Rat de ville
Invita le Rat des champs,
D'une façon fort ______ *(adjectif féminin, rime avec "ville")*,
À des reliefs d'ortolans.

LE RAT DES CHAMPS : [narrant] Sur un tapis de Turquie
Le couvert se trouva ______ *(participe passé, rime avec "Turquie")*.
Je vous laisse à penser la vie
Que firent ces deux amis.

LE RAT DE VILLE : [servant] Goûtez-moi ce ragoût ! Et ce vin ! Et ces ______ *(un nom, rime avec "amis")* !
À la campagne, vous n'avez jamais vu pareil festin !

LE RAT DES CHAMPS : [la bouche pleine] Ma foi, c'est vrai que chez moi, le menu c'est plutôt
Du blé, des noix, du ______ *(un nom, rime avec "plutôt")*...

LE RAT DE VILLE : Quelle misère ! Ici, mon cher, c'est tous les jours la fête !

[GRAND BRUIT — une porte claque]

LE RAT DES CHAMPS : [sursautant] Qu'est-ce que c'est ?!

LE RAT DE VILLE : [paniqué] Vite, cachons-nous ! [ils se cachent] Ce n'est rien, ce n'est rien ! Un domestique, voilà tout.

LE RAT DES CHAMPS : [tremblant] Je n'aime guère ce ______ *(un nom, rime avec "tout")*.

[Ils reviennent à table. Nouveau bruit.]

LE RAT DE VILLE : [re-paniqué] Le chat ! Sauvons nos ______ *(un nom, rime avec "chat")* !

LE RAT DES CHAMPS : [se levant] C'en est assez ! Adieu donc ; fi du plaisir
Que la crainte peut corrompre.

LE RAT DE VILLE : Mais attendez, restez ! Le dessert—

LE RAT DES CHAMPS : Votre festin est magnifique,
Mais j'aime mieux, en paix, mon trou ______ *(adjectif, rime avec "magnifique")*,
Sans chat, sans bruit, sans peur, sans domestique.
Bonsoir, cousin !`,
};

export default scene;
