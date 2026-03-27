import type { Scene } from './index';

const scene: Scene = {
  id: 'scene_019',
  title: 'La Cigale et la Fourmi',
  source: 'La Fontaine — La Cigale et la Fourmi, Livre I, Fable 1',
  tone: 'dark',
  difficulty: 'facile',
  duration: '3 min',
  playerCount: 2,
  setup: 'L\'hiver est venu. La Cigale, qui a chanté tout l\'été, se retrouve sans provisions. Elle va frapper chez la Fourmi, sa voisine. L\'accueil sera glacial.',
  roles: [
    { name: 'LA CIGALE', description: 'Artiste affamée, suppliante mais fière, tente de convaincre avec charme' },
    { name: 'LA FOURMI', description: 'Travailleuse impitoyable, froide et moqueuse, savoure sa revanche' },
  ],
  script: `LA CIGALE : [grelottant, narratrice] La Cigale, ayant chanté
Tout l'été,
Se trouva fort dépourvue
Quand la bise fut ______ *(adjectif féminin, rime avec "dépourvue")*.
Pas un seul petit morceau
De mouche ou de ______ *(un nom, rime avec "morceau")*.

[LA CIGALE frappe chez LA FOURMI]

LA CIGALE : [suppliante] Je viens chez vous, chère voisine,
Vous prier de me prêter
Quelque grain pour subsister
Jusqu'à la saison ______ *(adjectif féminin, rime avec "prêter")*.

LA FOURMI : [bras croisés] Vous me paierez, lui dit-elle,
Avant l'Oût, foi d'animal,
Intérêt et ______ *(un nom, rime avec "animal")*.

LA CIGALE : Je vous paierai, foi de Cigale ! Avant l'Oût, sans faute aucune !

LA FOURMI : [suspicieuse] Que faisiez-vous au temps chaud ?

LA CIGALE : [fièrement] Nuit et jour à tout ______ *(un nom ou participe, rime avec "chaud")*
Je chantais, ne vous déplaise.

LA FOURMI : [sourire cruel] Vous chantiez ? J'en suis fort aise.
Eh bien ! Dansez maintenant.

LA CIGALE : [bouche bée] ...Danser ? Mais... je vais mourir de faim !

LA FOURMI : [lui fermant la porte] Fallait y penser ______ *(adverbe, rime avec "faim")*.`,
};

export default scene;
