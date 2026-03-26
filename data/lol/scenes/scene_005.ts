import type { Scene } from './index';

const scene: Scene = {
  id: 'scene_005',
  title: 'La Tirade du Nez',
  source: 'Rostand — Cyrano de Bergerac, Acte I, Scène 4',
  tone: 'absurde',
  difficulty: 'moyen',
  duration: '3 min',
  playerCount: 2,
  pro: true,
  setup: 'Le Vicomte de Valvert vient d\'insulter le nez de Cyrano avec un banal « Vous... vous avez un nez... euh... très grand. » Cyrano lui montre comment on fait une VRAIE insulte.',
  roles: [
    { name: 'CYRANO', description: 'Bretteur poète au nez immense, brillant et susceptible' },
    { name: 'LE VICOMTE', description: 'Petit noble prétentieux, vexé et dépassé par l\'éloquence de Cyrano' },
  ],
  script: `LE VICOMTE : [avec mépris] Vous... vous avez un nez... heu... très grand.

CYRANO : [très calme] C'est tout ?

LE VICOMTE : Mais...

CYRANO : Ah non, c'est un peu court, jeune homme ! On pouvait dire... oh, Dieu ! bien des choses en somme. En variant le ton, par exemple, tenez :

[se redresse, prend des poses à chaque catégorie]

CYRANO : Agressif : « Moi, monsieur, si j'avais un tel nez, il faudrait sur-le-champ que je me l'amputasse ! »

LE VICOMTE : Mais je...

CYRANO : Amical : « Mais il doit tremper dans votre tasse ! Pour boire, faites-vous fabriquer un hanap ! »

LE VICOMTE : Monsieur, je...

CYRANO : Descriptif : « C'est un roc ! C'est un pic ! C'est un cap ! Que dis-je, c'est un cap ?... C'est une péninsule ! »

CYRANO : Gastronomique : « C'est un roc de ______ *(un fromage ou un plat)* ! »

LE VICOMTE : [rouge de colère] Je n'ai pas à supporter...

CYRANO : Curieux : « De quoi sert cette oblongue capsule ? D'écritoire, monsieur, ou de boîte à ciseaux ? »

LE VICOMTE : Assez !

CYRANO : Gracieux : « Aimez-vous à ce point les oiseaux que paternellement vous vous préoccupâtes de tendre ce perchoir à leurs petites pattes ? »

LE VICOMTE : ______ *(tentez une insulte à votre tour, le Vicomte perd patience)* !

CYRANO : [à peine perturbé] Truculent : « Ça, monsieur, lorsque vous pétunez, la vapeur du tabac vous sort-elle du nez sans qu'un voisin ne crie : au feu ! ? »

LE VICOMTE : Vous êtes un... un... ______ *(trouvez une insulte en vers si possible)* !

CYRANO : Prévenant : « Gardez-vous, votre tête entraînée par ce poids, de tomber en avant sur le sol ! »

Dramatique : « C'est la mer Rouge quand il saigne ! »

Admiratif : « Pour un parfumeur, quelle enseigne ! »

LE VICOMTE : [dégainant à moitié] J'en ai assez ! Je vais...

CYRANO : Lyrique : « Est-ce une conque, êtes-vous un triton ? »

LE VICOMTE : ______ *(dernière tentative d'insulte, pitoyable)* !

CYRANO : [s'approchant, souriant] Voilà ce qu'à peu près, mon cher, vous m'auriez dit si vous aviez un peu de lettres et d'esprit. Mais d'esprit, ô le plus lamentable des êtres, vous n'en eûtes jamais un atome. Et de lettres, vous n'avez que les trois qui forment le mot : SOT !

[salue le public avec panache]`,
};

export default scene;
