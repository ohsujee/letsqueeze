import type { Scene } from './index';

const scene: Scene = {
  id: 'scene_004',
  title: 'L\'Avare et son Trésor',
  source: 'Molière — L\'Avare, Acte IV, Scène 7',
  tone: 'dark',
  difficulty: 'moyen',
  duration: '3 min',
  playerCount: 2,
  setup: 'Harpagon vient de découvrir que sa cassette pleine d\'or a été volée. Il est en pleine crise. La Flèche, valet de son fils, est le suspect numéro un.',
  roles: [
    { name: 'HARPAGON', description: 'Avare dément, traite son argent comme un être aimé, soupçonne tout le monde' },
    { name: 'LA FLÈCHE', description: 'Valet insolent, nie tout avec un aplomb suspect' },
  ],
  script: `HARPAGON : [entre en hurlant] Au voleur ! Au voleur ! À l'assassin ! Au meurtrier ! Justice, juste ciel ! Je suis perdu, je suis assassiné ! On m'a coupé la gorge : on m'a dérobé mon argent !

[s'arrête, regarde autour]

HARPAGON : Qui peut-ce être ? Qu'est-il devenu ? Où est-il ? Où se cache-t-il ? [se saisissant le bras] Rends-moi mon argent, coquin ! Ah, c'est moi !

LA FLÈCHE : [entre innocemment] Monsieur ? Quelle est cette agitation ?

HARPAGON : [le saisissant] RENDS-MOI MON ARGENT !

LA FLÈCHE : Votre argent ? Quel argent ?

HARPAGON : Ma cassette ! Ma chère cassette ! Dix mille écus en or ! On me l'a prise ! Toi ! C'est toi !

LA FLÈCHE : Moi ? Je n'ai rien pris du tout ! J'étais ______ *(un endroit ou une activité suspecte)*.

HARPAGON : Je ne te crois pas ! Montre tes mains !

LA FLÈCHE : [montrant ses mains] Voilà.

HARPAGON : Les autres !

LA FLÈCHE : Les... autres ?

HARPAGON : Oui ! Tu en caches, j'en suis sûr ! Et tes poches ! Vide tes poches !

LA FLÈCHE : [vidant ses poches] Il n'y a rien, Monsieur.

HARPAGON : [fouillant l'air autour de La Flèche] Qu'as-tu là ? Dans ton regard ! Je vois la culpabilité dans tes yeux !

LA FLÈCHE : La culpabilité dans mes... Monsieur, vous perdez la raison.

HARPAGON : Ma raison ? J'ai perdu bien plus que ma raison ! J'ai perdu DIX MILLE ÉCUS ! Mon sang ! Ma vie ! Mes entrailles ! [au public] On m'a pris tout ce que j'avais ! Mon argent, mes bijoux, et même ______ *(un objet personnel absurde)* !

LA FLÈCHE : Mais Monsieur, peut-être avez-vous simplement oublié où vous l'avez mise ?

HARPAGON : OUBLIÉ ?! Oublie-t-on le lieu où l'on enterre son propre cœur ?! Elle était sous ______ *(décrivez une cachette absurdement élaborée)*.

LA FLÈCHE : [à part] La cachette parfaite, vraiment...

HARPAGON : Qu'as-tu murmuré ?!

LA FLÈCHE : Rien ! Je disais que c'est terrible, Monsieur. Terrible.

HARPAGON : Je veux faire pendre tout le monde ! Et si je ne retrouve mon argent, je me pendrai moi-même après !

LA FLÈCHE : [reculant vers la sortie] Monsieur, calmez-vous, prenez ______ *(un objet rassurant)* et respirez un grand coup...

HARPAGON : RESTE LÀ ! Personne ne sort ! Personne ne bouge ! Personne ne respire ! Mon argent... mon pauvre argent... mon cher ami... on m'a privé de toi ! [s'effondre] Hélas, mon pauvre argent, que je t'aimais...`,
};

export default scene;
