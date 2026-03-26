import type { Scene } from './index';

const scene: Scene = {
  id: 'scene_009',
  title: 'Les Fâcheux du Salon',
  source: 'Molière — Les Fâcheux / Le Misanthrope (combiné)',
  tone: 'absurde',
  difficulty: 'hard',
  duration: '3-4 min',
  playerCount: 4,
  pro: true,
  setup: 'Un hôte reçoit dans son salon. Trois invités arrivent, chacun plus insupportable que le précédent. L\'hôte essaie de garder contenance pendant que la soirée dégénère.',
  roles: [
    { name: 'L\'HÔTE', description: 'Maître de maison poli qui craque progressivement' },
    { name: 'LE POÈTE', description: 'Sonnet interminable, quête d\'approbation constante' },
    { name: 'LE MARQUIS', description: 'Se vante de tout, interrompt tout le monde, rit de son propre esprit' },
    { name: 'LA COMTESSE', description: 'Médisante professionnelle, portrait acide de chaque absent' },
  ],
  script: `L'HÔTE : [accueillant] Bienvenue, bienvenue dans mon humble demeure ! Ce soir, nous allons passer une soirée de bonne compagnie, de conversation élevée et de—

LE POÈTE : [entrant en trombe] Ah, cher ami ! Vous tombez bien ! Il FAUT que vous entendiez mon dernier sonnet ! J'y ai travaillé quatorze mois !

L'HÔTE : Ah, peut-être après le souper—

LE POÈTE : [déjà en position de déclamation] « Ô astre lumineux, flambeau de mes nuits sombres... » Non attendez. [tousse] « Ô ASTRE lumineux, flambeau de mes nuits sombres, ______ *(un compliment grandiloquent)*, tu éclaires mon âme de tes feux sans nombres... »

L'HÔTE : C'est... très beau.

LE POÈTE : Vous trouvez ? VRAIMENT ? Attendez, je n'en suis qu'au premier vers !

LE MARQUIS : [entrant avec fracas] Me voilà, me voilà ! La soirée peut commencer ! Vous avez vu mon nouveau carrosse ? Douze chevaux ! Non, quatorze ! C'est-à-dire que—

L'HÔTE : Marquis, prenez place, je vous en—

LE MARQUIS : Figurez-vous que ce matin, à la cour, le Roi m'a regardé. Oui, REGARDÉ. Pendant ______ *(une durée absurde)*. Et il a dit... enfin il n'a rien dit, mais dans ses yeux il y avait un profond respect pour ma personne.

LE POÈTE : Oui, bon, très bien. MON SONNET. Où en étais-je ? « Ô astre lumineux— »

LE MARQUIS : Vous écrivez des sonnets ? J'en ai écrit un la semaine dernière. Le Roi a pleuré.

LE POÈTE : Le Roi ne sait pas lire.

LE MARQUIS : C'est justement pour ça qu'il a pleuré ! De frustration !

LA COMTESSE : [entrant majestueusement] Bonsoir, bonsoir. Pardonnez mon retard. J'étais chez la Duchesse de ______ *(un nom à particule ridicule)*. Quelle femme ! Aussi aimable qu'un clou rouillé.

L'HÔTE : Comtesse, quel plaisir—

LA COMTESSE : [s'asseyant] Est-ce que j'ai manqué quelque chose ? [regardant le Marquis] Ah, vous êtes là. J'ai entendu dire que votre dernier duel s'est terminé par ______ *(une issue humiliante)*.

LE MARQUIS : Un MENSONGE ! J'ai vaincu ______ *(un adversaire ridicule)* en duel la semaine dernière ! Demandez à n'importe qui !

LA COMTESSE : Le Roi dit que vous êtes parti en courant.

LE POÈTE : « Ô ASTRE LUMINEUX— »

L'HÔTE : [craquant légèrement] S'il vous plaît ! Un peu de tenue ! On est dans un salon, pas dans une—

LA COMTESSE : En parlant de tenue, avez-vous vu la robe de Madame de Clèves hier ? On aurait dit ______ *(portrait vestimentaire assassin)*.

LE MARQUIS : Moi, je l'ai trouvée charmante. Mais moins que moi, bien sûr. [rit tout seul]

LE POÈTE : PERSONNE ne veut entendre mon sonnet ?!

L'HÔTE : [se levant] Si, si ! Lisez votre sonnet ! Qu'on en finisse !

LE POÈTE : [solennel] Bien ! « Ô astre lumineux, flambeau de mes nuits sombres, tu éclaires mon âme de tes feux sans nombres. Et quand la nuit descend sur les coteaux fleuris... » je songe à ______ *(un objet banal, doit rimer avec "fleuris")* et mes yeux sont ravis. »

[silence]

LE MARQUIS : ...C'est tout ?

LA COMTESSE : J'ai entendu mieux à l'enterrement de mon perroquet.

L'HÔTE : [à bout] C'était... c'était MAGNIFIQUE. Et maintenant, si vous voulez bien tous ______ *(trouvez une excuse pour les mettre dehors)*.

LE MARQUIS : Quoi ? Déjà ? Mais je n'ai pas encore raconté mon exploit de chasse !

LA COMTESSE : Ni moi terminé le portrait de la Baronne de—

LE POÈTE : Et j'ai un DEUXIÈME sonnet !

L'HÔTE : [au public] Ô fâcheux, importuns, gens de cour et rimeurs, vous me persécutez de vos sottes humeurs ! [sort en courant]

LE MARQUIS : ...Il est parti.

LA COMTESSE : Quel hôte médiocre.

LE POÈTE : « Ô astre lumineux— »

LE MARQUIS & LA COMTESSE : NON !`,
};

export default scene;
