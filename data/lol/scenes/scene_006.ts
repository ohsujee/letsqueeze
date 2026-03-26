import type { Scene } from './index';

const scene: Scene = {
  id: 'scene_006',
  title: 'Les Précieuses et le Marquis',
  source: 'Molière — Les Précieuses ridicules, Scènes 9-10',
  tone: 'cringe',
  difficulty: 'moyen',
  duration: '3 min',
  playerCount: 2,
  pro: true,
  setup: 'Mascarille, un valet déguisé en marquis, vient impressionner Cathos, une « précieuse » qui parle de tout de façon exagérément raffinée. C\'est un concours de prétention.',
  roles: [
    { name: 'MASCARILLE', description: 'Faux marquis extravagant, poète autoproclamé, obsédé par son propre style' },
    { name: 'CATHOS', description: 'Précieuse snob, s\'exprime de façon alambiquée, pâmée devant tout ce qui est "noble"' },
  ],
  script: `MASCARILLE : [entre avec des révérences exagérées] Mesdames, vous serez surprises, sans doute, de l'audace de ma visite ; mais votre réputation vous attire cette méchante affaire, et le mérite a pour moi des charmes si puissants, que je cours partout après lui.

CATHOS : Si vous poursuivez le mérite, ce n'est pas sur nos terres que vous devez chasser.

MASCARILLE : [s'asseyant avec cérémonie] Ah, que dites-vous là ! Le mérite habite chez vous depuis la fondation du monde ! Mais... vous avez remarqué mon habit ?

CATHOS : Voilà un habit qui souffre en broderie une quantité de fleurs sur un fond de paille.

MASCARILLE : Que vous semble de ma petite-oie ? La trouvez-vous congruante à l'habit ?

CATHOS : Tout à fait ! Et ces plumes, c'est d'un furieusement beau !

MASCARILLE : Figurez-vous que le bas de soie m'a coûté ______ *(un prix absurde ou une monnaie imaginaire)*. Et le chapeau ! Sentez le chapeau.

CATHOS : [sentant] Il sent ______ *(décrivez une odeur inattendue)*.

MASCARILLE : Parfaitement ! C'est la dernière mode à la cour ! Les marquis cette saison sentent tous comme ça. On appelle ce parfum « Le Triomphe du Divin ».

CATHOS : Ah, c'est le dernier galant ! Mais dites-moi, Marquis, faites-vous des vers ?

MASCARILLE : Des vers ? Tous les matins avant mon chocolat, j'en compose quatorze. Tenez, jugez un peu de cette improvisation que je fis l'autre jour : [se lève, déclame]

« Oh ! oh ! je n'y prenais pas garde :
Tandis que, sans songer à mal, je vous regarde,
Votre œil en tapinois me dérobe mon cœur.
Au voleur, au voleur, au voleur, au voleur ! »

CATHOS : Voilà qui est poussé dans le dernier galant !

MASCARILLE : Tout ce que je fais me vient naturellement, c'est sans étude. Tenez, en voici un autre, de ce matin même :

« Mon cœur brûle pour ______ *(un objet du quotidien)* / Comme le soleil brûle pour la lune. »

CATHOS : [se pâmant] Ah ! C'est d'un... c'est d'un... je défaille ! Voilà ce qui s'appelle écrire ! Moi-même, je compose parfois. Écoutez ceci :

« Il est vrai que le ______ *(un astre ou phénomène naturel)* est d'une beauté ______ *(adjectif extravagant)* ce soir ! »

MASCARILLE : [applaudissant] Tudieu ! Voilà une pièce digne de l'Académie ! Et votre style ! Quelle élégance ! On voit bien que vous êtes de qualité. Pas comme ces bourgeoises qui disent « il fait beau » au lieu de dire...

CATHOS : Au lieu de dire « les éléments se sont habillés de lumière pour célébrer notre promenade » !

MASCARILLE : Exactement ! Ah, nous nous entendons ! Permettez que je baise cette main qui a écrit de si belles choses.

CATHOS : [retirant sa main] Ah, Marquis ! Vous usurpez sur ma liberté un empire dont je ne saurais souffrir !

MASCARILLE : [à part, au public] Si je suis pas marquis, au moins je parle mieux qu'eux.`,
};

export default scene;
