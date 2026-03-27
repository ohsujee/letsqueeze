import type { Scene } from './index';

const scene: Scene = {
  id: 'scene_014',
  title: 'Mes gages !',
  source: 'Molière — Dom Juan, Acte V (adapté)',
  tone: 'dark',
  difficulty: 'moyen',
  duration: '3 min',
  playerCount: 2,
  pro: true,
  setup: 'Dom Juan, libertin sans scrupules, annonce à son valet Sganarelle ses derniers méfaits. Sganarelle tente de protester moralement, mais Dom Juan le réduit au silence avec une logique tordue. Sganarelle cède à chaque fois, avant de se souvenir de l\'essentiel : ses gages impayés.',
  roles: [
    { name: 'DOM JUAN', description: 'Séducteur cynique, justifie tout avec une éloquence redoutable' },
    { name: 'SGANARELLE', description: 'Valet moraliste mais lâche, proteste puis capitule, obsédé par ses gages' },
  ],
  script: `SGANARELLE : Monsieur, puis-je vous parler franchement ?

DOM JUAN : Parle, Sganarelle. Je t'écoute.

SGANARELLE : Eh bien, Monsieur, je suis un peu scandalisé de la vie que vous menez. On dit partout que vous avez ______ *(un méfait impliquant une personne)*.

DOM JUAN : Moi ? Et quand cela serait ? N'ai-je pas raison ? Cette personne était malheureuse avant de me connaître. Je lui ai offert un moment de bonheur. C'est presque de la charité !

SGANARELLE : De la... charité ? Monsieur, ce n'est pas—

DOM JUAN : Voudrais-tu que je laisse tant de beauté languir dans l'ennui ? Non ! Je suis trop généreux pour ça. La constance n'est bonne que pour les ridicules. La belle chose de vouloir se piquer d'un faux honneur d'être fidèle !

SGANARELLE : Oui, Monsieur... vous avez raison. Mais tout de même, on raconte aussi que vous avez trahi ______ *(une personne que Dom Juan a trompée ou trahie)* !

DOM JUAN : Ah, ça ! C'est une calomnie ! Enfin... pas tout à fait. Mais vois-tu, Sganarelle, c'est la faute de la société. On m'a élevé ainsi. Que veux-tu que j'y fasse ?

SGANARELLE : [hésitant] C'est vrai que... l'éducation... mais enfin, Monsieur, le Ciel vous punira !

DOM JUAN : Le Ciel ? Le Ciel est trop occupé, Sganarelle. Il a des guerres, des famines, des tremblements de terre. Tu crois qu'il va s'occuper de moi ?

SGANARELLE : Oui, Monsieur, vous avez raison. Le Ciel est très occupé. Mais tout de même !

DOM JUAN : Tout de même quoi ?

SGANARELLE : ______ *(une objection morale maladroite)* !

DOM JUAN : [le fixant] Sganarelle, est-ce que tu me fais la morale ?

SGANARELLE : [reculant] Moi ? Non, Monsieur ! Jamais ! Je disais ça... comme ça... en passant. Votre logique est imparable. Vous êtes le plus grand esprit de notre siècle.

DOM JUAN : Bien. Et maintenant, allons. J'ai rendez-vous avec la femme du Commandeur.

SGANARELLE : La femme du— ! Monsieur, le Commandeur est mort ! Vous l'avez tué vous-même ! Sa statue bouge ! Elle vous a invité à dîner ! Vous n'allez pas en plus ______ *(une provocation supplémentaire envers le Commandeur)* ?!

DOM JUAN : Si.

SGANARELLE : Oui, Monsieur, vous avez raison.

DOM JUAN : [sortant] Viens.

SGANARELLE : [seul] Mes gages, mes gages, mes gages ! Voilà ce que j'y gagne ! Un maître impie, une vie de terreur, et pas un sou en retour ! Ciel offensé, lois violées, filles déshonorées, familles déshonorées, maris poussés à bout, tout le monde est content — sauf MOI ! Mes gages ! MES GAGES !`,
};

export default scene;
