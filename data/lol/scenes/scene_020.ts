import type { Scene } from './index';

const scene: Scene = {
  id: 'scene_020',
  title: 'Le Chêne et le Roseau',
  source: 'La Fontaine — Le Chêne et le Roseau, Livre I, Fable 22',
  tone: 'absurde',
  difficulty: 'moyen',
  duration: '3 min',
  playerCount: 3,
  pro: true,
  setup: 'Un chêne immense et arrogant se moque d\'un roseau fragile qui plie au moindre vent. Mais une tempête va renverser l\'ordre des choses. Le Narrateur décrit la catastrophe finale.',
  roles: [
    { name: 'LE NARRATEUR', description: 'Pose le décor, décrit la tempête avec emphase dramatique' },
    { name: 'LE CHÊNE', description: 'Colossal, pompeux, condescendant — puis terrifié quand la tempête arrive' },
    { name: 'LE ROSEAU', description: 'Petit, humble, philosophe — plie mais ne rompt jamais' },
  ],
  script: `LE CHÊNE : [regardant le Roseau de haut] Le moindre vent qui d'aventure
Fait rider la face de ______ *(un nom, rime avec "aventure")*,
Vous oblige à baisser la tête ;
Cependant que mon front, au Caucase ______ *(adjectif, rime avec "tête")*,
Non content de braver les coups du soleil,
Brave l'effort de la ______ *(un nom, rime avec "soleil")*.

Tout vous est aquilon, tout me semble zéphyr.
Vous avez bien sujet d'accuser la ______ *(un nom, rime avec "zéphyr")*.

LE ROSEAU : [calmement] Votre compassion part d'un bon naturel ;
Mais quittez ce souci. Les vents me sont moins qu'à vous ______ *(adjectif, rime avec "naturel")*.
Je plie, et ne romps pas.
Vous avez jusqu'ici contre leurs coups épouvantables
Résisté sans courber le dos ;
Mais attendons la fin.

LE NARRATEUR : [dramatique] Comme il disait ces mots,
Du bout de l'horizon accourt avec furie
Le plus terrible des enfants
Que le Nord eût portés jusque-là dans ses ______ *(un nom, rime avec "furie")*.

L'arbre tient bon ; le Roseau plie.
Le vent redouble ses efforts,
Et fait si bien qu'il ______ *(verbe, rime avec "efforts")*
Celui de qui la tête au ciel était voisine,
Et dont les pieds touchaient à l'Empire des Morts.`,
};

export default scene;
