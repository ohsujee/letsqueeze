import type { Scene } from './index';

const scene: Scene = {
  id: 'scene_007',
  title: 'Le Tribunal de l\'Amour',
  source: 'Molière — Le Misanthrope, Acte II, Scènes 4-5 (adapté)',
  tone: 'genant',
  difficulty: 'moyen',
  duration: '3 min',
  playerCount: 3,
  setup: 'Alceste, qui déteste l\'hypocrisie, confronte Célimène, qui adore médire de tout le monde. Philinte essaie désespérément de calmer le jeu.',
  roles: [
    { name: 'ALCESTE', description: 'Misanthrope furieux, dit ses vérités en face, incapable de compliment' },
    { name: 'CÉLIMÈNE', description: 'Coquette spirituelle, assassine les gens avec le sourire' },
    { name: 'PHILINTE', description: 'Diplomate mou, ami d\'Alceste, complimente tout le monde sans conviction' },
  ],
  script: `PHILINTE : [tentant de détendre] Allons, cher Alceste, ne soyez pas si sombre. La compagnie de Célimène devrait vous réjouir.

ALCESTE : Me réjouir ? Moi ? Les hommes, la plupart, sont étrangement faits ! Dans la juste nature on ne les voit jamais.

CÉLIMÈNE : Ah, le voilà qui commence ! Monsieur veut encore nous faire la leçon sur l'honnêteté ?

ALCESTE : Oui, Madame ! Vous qui passez votre temps à dire du bien des gens en face et du mal derrière !

CÉLIMÈNE : Moi ? Jamais ! J'adore tout le monde ! Tenez, justement, j'ai croisé ______ *(un nom de personnage absent)* hier. Quelle personne charmante !

ALCESTE : Charmante ? La dernière fois, vous avez dit que cette personne avait l'esprit d'un tabouret !

CÉLIMÈNE : Un tabouret de QUALITÉ. En bois noble.

PHILINTE : [s'interposant] Allons, allons ! Tout le monde a des qualités ! Moi par exemple, je trouve qu'Alceste est... ______ *(trouvez un compliment maladroit pour Alceste)*.

ALCESTE : Taisez-vous, Philinte ! Vous êtes exactement le problème ! Vous aimez tout le monde, vous complimentez tout le monde, vous êtes d'accord avec tout le monde !

PHILINTE : C'est vrai. Et je trouve ça très bien.

ALCESTE : VOUS VOYEZ ?!

CÉLIMÈNE : [riant] Alceste, votre franchise est touchante. Vraiment. Mais avouez que dans le monde, on ne peut pas dire à chacun ce qu'on pense.

ALCESTE : Et pourquoi pas ? Je veux qu'on soit sincère, et qu'en homme d'honneur on ne lâche aucun mot qui ne parte du cœur.

CÉLIMÈNE : Fort bien ! Alors dites-moi, en toute sincérité, ce que vous pensez de ma robe.

ALCESTE : [hésitant] Votre robe est...

PHILINTE : [soufflant] Magnifique, dis magnifique...

ALCESTE : ______ *(dites ce que vous pensez VRAIMENT de la robe, sans filtre)*.

CÉLIMÈNE : [blessée puis se reprenant] Eh bien ! Au moins c'est honnête. Moi aussi je vais être honnête. Philinte, que pensez-vous d'Alceste ? En VRAI.

PHILINTE : [paniqué] En vrai ? Alceste est mon ami. Mon très cher ami. Il est... il est parfois un peu...

ALCESTE : Dites-le !

PHILINTE : ______ *(essayez de dire un défaut de la manière la plus diplomatique possible)*.

ALCESTE : C'est EXACTEMENT ce que je reproche à cette société ! Personne ne dit rien ! Tout est faux ! Tout est masque !

CÉLIMÈNE : Très bien, Alceste. Puisque vous voulez la vérité, je vais vous dire ce que je pense de vous : ______ *(portrait acide mais avec esprit)*.

ALCESTE : [silence, puis] ...C'était très bien formulé.

PHILINTE : [soulagé] Ah ! Enfin un moment de paix.

ALCESTE : Je la déteste. [sort]

CÉLIMÈNE : Il reviendra. Il revient toujours.

PHILINTE : [hésitant entre les deux] Je... euh... au revoir. [sort des deux côtés à la fois, hésite, sort]`,
};

export default scene;
