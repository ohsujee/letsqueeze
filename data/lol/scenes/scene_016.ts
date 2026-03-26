import type { Scene } from './index';

const scene: Scene = {
  id: 'scene_016',
  title: 'Le Double Déguisement',
  source: 'Marivaux — Le Jeu de l\'amour et du hasard, Acte I (adapté)',
  tone: 'genant',
  difficulty: 'moyen',
  duration: '3 min',
  playerCount: 3,
  pro: true,
  setup: 'Silvia s\'est déguisée en servante pour observer Dorante incognito. Dorante s\'est déguisé en valet pour la même raison. Arlequin, vrai valet de Dorante, se fait passer pour le maître. Chacun tente de jouer son rôle, mais trahit constamment sa vraie nature.',
  roles: [
    { name: 'SILVIA', description: 'Noble déguisée en servante, n\'arrive pas à être vulgaire, parle trop bien' },
    { name: 'DORANTE', description: 'Noble déguisé en valet, trop poli et cultivé pour être crédible' },
    { name: 'ARLEQUIN', description: 'Vrai valet déguisé en maître, en fait trop, manières grotesques et faux-pas constants' },
  ],
  script: `ARLEQUIN : [entrant avec une révérence exagérée] Bonjour à toute la compagnie ! C'est MOI, le maître ! Dorante ! En personne ! L'homme de qualité ! Admirez mon pourpoint !

SILVIA : [à part] Voilà donc le prétendant qu'on me destine ? [à Arlequin] Bienvenue, Monsieur.

ARLEQUIN : Merci, ma petite. [se reprenant] C'est-à-dire : merci, Mademois— euh... comment on dit déjà ? ______ *(une formule de politesse ratée, trop pompeuse ou trop familière)*.

SILVIA : [choquée] Voilà un maître qui a de curieuses manières.

DORANTE : [entrant, jouant le valet] Pardon, Mademoiselle. Je suis le valet de Monsieur. Veuillez excuser mon maître, il est... fatigué du voyage.

SILVIA : [troublée par Dorante] Vous êtes bien poli pour un valet.

DORANTE : [se rattrapant] Moi ? Poli ? Ah non, je suis très... très ordinaire. Je suis qu'un simple... enfin ______ *(une tentative de paraître commun, formulée trop élégamment)*.

SILVIA : [à part] Ce valet parle mieux que son maître...

ARLEQUIN : [attrapant un verre] Eh bien, servante ! Du vin pour le maître de céans ! Et pas de la piquette ! Du bon ! [boit au goulot, s'essuie la bouche avec la manche]

DORANTE : [grimaçant] Mon... maître plaisante. C'est de l'humour aristocratique.

SILVIA : [ironique] Ah oui, très raffiné.

ARLEQUIN : Alors, c'est vous ma future épouse ? Pas mal, pas mal. Tournez-vous un peu que je voie ? [Silvia le foudroie du regard] Je veux dire : vous avez ______ *(un compliment maladroit, mélange de vulgarité et de prétention)*.

SILVIA : [sèchement] Monsieur, une servante comme moi ne mérite pas tant d'attention.

DORANTE : [sans réfléchir] Vous méritez toute l'attention du monde. Votre esprit brille d'une lumière—

SILVIA : [suspicieuse] Quoi ?

DORANTE : [paniqué] C'est-à-dire... vous avez l'air... pas bête... pour une servante.

SILVIA : [vexée] Merci infiniment.

ARLEQUIN : [à Dorante, chuchotant fort] Eh, Bourguignon ! Tu dragues la bonne ?! C'est MA fiancée ! [à Silvia] Pardonnez mon valet. Figurez-vous qu'hier il a ______ *(un faux-pas inventé par Arlequin pour discréditer Dorante)*.

DORANTE : [indigné] C'est absolument faux ! Je n'ai jamais— [se retient] ...Oui, Monsieur. Pardon, Monsieur. Je suis un simple valet.

SILVIA : [à part] Ce valet s'excuse avec une dignité suspecte.

ARLEQUIN : Bon ! Servante, conduisez-moi à mes appartements ! Le maître est fatigué ! [bâille bruyamment]

SILVIA : [à Dorante] Votre maître est-il toujours... ainsi ?

DORANTE : [avec un soupir sincère] ______ *(un aveu involontaire sur la vraie nature d'Arlequin)*.

SILVIA : [le dévisageant] Vous êtes un valet bien étrange.

DORANTE : Et vous êtes une servante bien étrange.

[Ils se regardent. Silence. Arlequin renverse un vase au fond.]

ARLEQUIN : C'était un vase de pauvre ! Ça ne vaut rien ! [à part] Être maître, c'est épuisant.`,
};

export default scene;
