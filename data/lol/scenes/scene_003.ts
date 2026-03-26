import type { Scene } from './index';

const scene: Scene = {
  id: 'scene_003',
  title: 'Que Diable Allait-il Faire dans Cette Galère ?',
  source: 'Molière — Les Fourberies de Scapin, Acte II, Scène 7',
  tone: 'genant',
  difficulty: 'moyen',
  duration: '3 min',
  playerCount: 2,
  setup: 'Scapin annonce à Géronte que son fils Léandre a été capturé par des Turcs sur une galère. Il faut payer la rançon. Géronte, d\'une avarice légendaire, se lamente à chaque nouveau montant.',
  roles: [
    { name: 'SCAPIN', description: 'Valet rusé et manipulateur, invente des détails de plus en plus extravagants' },
    { name: 'GÉRONTE', description: 'Vieillard avare, répète sa plainte célèbre avec une douleur croissante' },
  ],
  script: `SCAPIN : Monsieur, votre fils...

GÉRONTE : Quoi ? Qu'est-ce ? Mon fils ?

SCAPIN : Est tombé dans une disgrâce la plus étrange du monde. Il s'est allé jeter dans la galère d'un Turc. Et le Turc l'a envoyé en mer, et m'envoie vous dire que si vous ne lui envoyez pas cinq cents écus, il va emmener votre fils en Alger.

GÉRONTE : Comment, diantre ! cinq cents écus ?

SCAPIN : Oui, Monsieur. Et de plus, il ne m'a donné pour cela que deux heures.

GÉRONTE : Ah, le pendard de Turc ! Mais que diable allait-il faire dans cette galère ?

SCAPIN : Il ne songeait pas à ce qui est arrivé.

GÉRONTE : Mais que diable allait-il faire dans cette galère ?

SCAPIN : On ne prévoit pas tous les hasards. De grâce, Monsieur, dépêchez.

GÉRONTE : [se lamentant] Que diable allait-il faire dans cette galère ? Va-t'en, Scapin, va dire à ce Turc que je vais envoyer la justice après lui.

SCAPIN : La justice en pleine mer ? Vous moquez-vous des gens ? Et puis, il demande aussi ______ *(ajoutez une exigence absurde à la rançon)*.

GÉRONTE : QUOI ?! Et en plus de cinq cents écus, il veut ÇA ?!

SCAPIN : Monsieur, le Turc a dit que c'était non négociable. Et il a ajouté que si dans une heure il ne reçoit pas le tout, il ______ *(une menace turque ridicule)*.

GÉRONTE : [au bord des larmes] Que diable allait-il faire dans cette galère ?!

SCAPIN : Songez, Monsieur, que le temps presse, et que vous courez risque de perdre votre fils.

GÉRONTE : Cinq cents écus... c'est cinq cents écus !

SCAPIN : Oui.

GÉRONTE : [comptant sur ses doigts] Sais-tu bien ce que c'est que cinq cents écus ?

SCAPIN : Oui, Monsieur, je sais que c'est beaucoup. Mais votre fils...

GÉRONTE : Mais que diable allait-il faire dans cette galère ?

SCAPIN : Oh, à quoi bon revenir toujours là-dessus ? Il y est allé, voilà ! Et d'ailleurs, la galère avait ______ *(décrivez un détail luxueux qui rend Géronte encore plus furieux)*.

GÉRONTE : Il a pris la GALÈRE DE LUXE en plus ?! Que diable allait-il faire dans cette galère ?!

SCAPIN : Vous avez raison. Mais le temps presse. Il faut les cinq cents écus. Plus le supplément. Sinon, adieu votre fils.

GÉRONTE : [fouillant dans ses poches avec une douleur physique] Tiens... voilà la clef de mon armoire.

SCAPIN : Bien.

GÉRONTE : [retenant la clef] Tu iras prendre dans le coffre... [ne lâche pas] ...toute la somme... [tire la clef en arrière] Ah ! Que diable allait-il faire dans cette galère ?!

SCAPIN : [lui arrachant la clef] Merci, Monsieur. Votre fils sera éternellement reconnaissant.

GÉRONTE : [seul, effondré] Cinq cents écus... que diable allait-il faire... dans cette maudite galère...`,
};

export default scene;
