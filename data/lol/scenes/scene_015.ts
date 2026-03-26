import type { Scene } from './index';

const scene: Scene = {
  id: 'scene_015',
  title: 'Le Procès du chien',
  source: 'Racine — Les Plaideurs, Acte III (adapté)',
  tone: 'absurde',
  difficulty: 'moyen',
  duration: '3 min',
  playerCount: 3,
  setup: 'Le juge Dandin, obsédé par le fait de juger, organise un procès contre un chien accusé d\'avoir volé un chapon. Deux avocats s\'affrontent avec un formalisme juridique absurde. Le juge veut condamner avant même d\'entendre les arguments.',
  roles: [
    { name: 'LE JUGE DANDIN', description: 'Magistrat maniaque, veut juger à tout prix, interrompt pour condamner' },
    { name: 'L\'AVOCAT DE LA DÉFENSE', description: 'Défend le chien avec une passion sincère et des arguments juridiques délirants' },
    { name: 'L\'AVOCAT DE L\'ACCUSATION', description: 'Accable le chien avec une rhétorique pompeuse et des preuves absurdes' },
  ],
  script: `LE JUGE DANDIN : L'audience est ouverte ! Ah, qu'il est doux de juger ! Qu'on amène l'accusé !

L'AVOCAT DE L'ACCUSATION : Monsieur le Juge, l'accusé — un chien de race indéterminée — est poursuivi pour vol de chapon avec effraction, préméditation et ______ *(un chef d'accusation juridique absurde)*.

LE JUGE DANDIN : Coupable ! Qu'on le pende !

L'AVOCAT DE LA DÉFENSE : Objection ! On n'a même pas entendu la défense ! Ce chien, Monsieur le Juge, est innocent ! Il souffrait d'une faim terrible, car son maître ne le nourrit que de ______ *(un aliment indigne d'un chien)*.

LE JUGE DANDIN : Et alors ? La faim n'excuse pas le crime !

L'AVOCAT DE LA DÉFENSE : C'est un cas de force majeure, Monsieur le Juge ! Article 7 du Code des Animaux Domestiques : « Nul quadrupède ne saurait être tenu responsable de ses actes quand l'estomac commande. »

L'AVOCAT DE L'ACCUSATION : Ce code n'existe pas !

L'AVOCAT DE LA DÉFENSE : Il DEVRAIT exister !

LE JUGE DANDIN : Silence ! Des preuves ! Il me faut des preuves !

L'AVOCAT DE L'ACCUSATION : Voici la pièce à conviction numéro un : ______ *(une preuve matérielle ridicule)*. Retrouvée sur les lieux du crime, à côté d'une plume de chapon !

L'AVOCAT DE LA DÉFENSE : Cette preuve a été fabriquée ! Mon client a un alibi ! Au moment des faits, il était en train de ______ *(une activité canine formulée comme un alibi sérieux)*.

L'AVOCAT DE L'ACCUSATION : Mensonge ! Trois témoins — un chat, un perroquet et la voisine du dessus — l'ont formellement identifié !

L'AVOCAT DE LA DÉFENSE : Le chat est un ennemi juré de mon client ! Le perroquet ne fait que répéter ce qu'on lui dit ! Et la voisine est myope !

LE JUGE DANDIN : [impatient] Bon, bon, j'en ai assez entendu ! Je vais rendre mon verdict !

L'AVOCAT DE LA DÉFENSE : Attendez ! Un dernier argument ! Ce chien est père de famille ! Il a ______ *(un nombre exagéré)* chiots à nourrir ! Vous allez laisser ces orphelins sans père ?

LE JUGE DANDIN : [ému malgré lui] Des orphelins... C'est terrible... Mais la loi est la loi !

L'AVOCAT DE L'ACCUSATION : La loi est formelle ! Ce chien est un criminel récidiviste ! Il a déjà volé trois saucisses, un rôti et ______ *(un objet incongru pour un chien)* !

LE JUGE DANDIN : Le verdict ! Silence dans la salle ! L'accusé est déclaré... coupable ! Mais compte tenu des chiots... sa peine sera réduite. Il est condamné à rapporter le chapon. Qu'on le ramène !

L'AVOCAT DE LA DÉFENSE : Justice est rendue !

L'AVOCAT DE L'ACCUSATION : C'est un scandale !

LE JUGE DANDIN : [soupirant d'aise] Aaah... Qu'on m'amène l'affaire suivante. Il paraît que le chat du voisin a cassé un vase. Qu'on le juge !`,
};

export default scene;
