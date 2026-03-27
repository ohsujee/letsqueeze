import type { CollectiveGame } from './index';

const game: CollectiveGame = {
  id: 'collective_016',
  title: 'Le Documentaire Animalier',
  tone: 'absurde',
  difficulty: 'facile',
  duration: '3 min',
  pro: true,
  setup: 'Le Joker est le narrateur du documentaire. Les autres joueurs s\'installent normalement (assis, debout, peu importe). Aucun accessoire nécessaire.',
  rules: `Le Joker narre un documentaire animalier sur les autres joueurs, qui doivent simplement se comporter NORMALEMENT (rester assis, boire, regarder leur téléphone...). Le Joker les observe et commente leurs moindres gestes comme un naturaliste fasciné. Les joueurs doivent continuer à agir naturellement sans craquer.

Déroulement :
1. Le Joker demande à tout le monde de "faire comme si de rien n'était" et de vaquer à leurs occupations
2. Le Joker commence sa narration en chuchotant, comme dans un vrai documentaire nature
3. Il commente chaque micro-geste des joueurs avec un sérieux scientifique
4. Il peut se rapprocher lentement d'un joueur comme pour observer un animal rare
5. Tout joueur qui rit ou réagit au commentaire est accusé

Narration pré-écrite (le Joker adapte selon ce que font les joueurs) :
- (chuchoter) "Ici nous observons le rare Homo Sofalicus dans son habitat naturel... Il tend la main vers son téléphone... un geste de survie ancestral..."
- (chuchoter) "Le mâle dominant s'approche du frigo... territoire disputé depuis des millénaires... Il ouvre la porte avec une grâce qui force le respect."
- (ton alarmé) "ATTENTION — le spécimen vient de croiser un regard. C'est un moment extrêmement rare dans la nature. Les deux individus détournent les yeux. Fascinant."
- (chuchoter) "La femelle alpha gratte son nez. Les scientifiques débattent encore de la signification de ce rituel."
- (gasp dramatique) "Il... il va se lever. Non. Fausse alerte. Il s'est juste repositionné. Le canapé a gagné cette bataille."
- (chuchoter) "Observez la technique de boisson... Le verre est porté aux lèvres avec une précision chirurgicale... Des années d'évolution pour en arriver là."
- (ton scientifique) "Le groupe entre dans une phase de silence. Dans le monde animal, cela précède soit l'accouplement, soit la bagarre. Nous verrons bien."
- (chuchoter) "Ce spécimen semble nerveux. Il sourit. Non — c'est un rictus de défense. La nature est cruelle."
- (ton émerveillé) "Incroyable ! Deux individus ont échangé un regard ET un sourire. Les chercheurs du CNRS seront informés."
- (chuchoter) "Le sujet tente de garder son sérieux... On observe des micro-contractions au niveau des zygomatiques... La science retiendra son nom."
- (ton alarmé) "Il bouge ! Le prédateur se lève ! Oh... il va juste aux toilettes. Quel rebondissement."
- (conclusion solennelle) "Et ainsi s'achève notre observation. Ces créatures magnifiques continueront de survivre... contre toute attente."

Indications scéniques pour le Joker : alterner entre chuchotement intime, ton alarmé soudain, et émerveillement scientifique. Se déplacer lentement autour des joueurs comme un caméraman en brousse.`,
  variants: [
    'Le Joker désigne un joueur comme "bébé de l\'espèce" : les autres doivent le nourrir et le protéger (sans rire)',
    'Un joueur est déclaré "espèce menacée" et les autres doivent l\'ignorer complètement pendant que le Joker supplie le public de faire un don',
  ],
};

export default game;
