import type { CollectiveGame } from './index';

const game: CollectiveGame = {
  id: 'collective_011',
  title: 'Le Commentateur de Musée',
  tone: 'absurde',
  difficulty: 'facile',
  duration: '3 min',
  pro: true,
  setup: 'Le Joker est l\'audioguide du musée. Tous les autres joueurs se figent dans une pose aléatoire de leur choix. Ils sont les œuvres d\'art.',
  rules: `Les joueurs se figent chacun dans une pose ridicule. Le Joker se promène parmi eux comme un audioguide de musée prestigieux et commente chaque "œuvre" avec un sérieux absolu. Les œuvres doivent tenir leur pose ET garder un visage impassible pendant le commentaire.

Déroulement :
1. Tous les joueurs (sauf le Joker) choisissent une pose et se figent
2. Le Joker s'approche de chaque œuvre, la regarde sous tous les angles, puis délivre son commentaire
3. Le Joker peut se pencher très près du visage de l'œuvre pour "examiner les détails"
4. Après un premier tour, le Joker refait un passage avec des commentaires encore plus absurdes
5. Tout joueur qui rit ou bouge est accusé

Commentaires pré-écrits (le Joker choisit selon la pose) :
- "Ici nous avons 'L'Angoisse du Lundi Matin', huile sur désespoir, période bleue de l'artiste..."
- "Cette pièce, intitulée 'Le Dernier Kebab', explore la relation entre l'homme et la sauce samouraï..."
- "Remarquez la tension dans le poignet gauche. L'artiste traverse clairement une rupture."
- "Cette œuvre a été refusée par le Louvre, le MoMA, et la boulangerie d'en face."
- "Estimée à 2,3 millions d'euros. Personnellement, je n'en donnerais pas un Babybel."
- "'Erreur 404 — Dignité Non Trouvée'. Technique mixte sur regrets, 2024."
- "L'artiste a déclaré, je cite : 'Je ne sais pas ce que j'ai fait, mais je suis désolé.'"
- "Si vous regardez attentivement les yeux... vous verrez qu'il n'y a absolument rien derrière."
- "Cette pièce s'intitule 'J'Aurais Dû Rester Couché'. Elle parle à toute une génération."
- "Le musée a tenté de la revendre trois fois. Les acheteurs ont tous pleuré."

Le Joker peut aussi improviser en réagissant à la pose réelle du joueur. Tout joueur qui craque est accusé.`,
  variants: [
    'Le Joker demande au "public" (les autres œuvres) de noter chaque pièce sur 10 — sans bouger ni parler, juste avec les doigts',
    'Une œuvre est déclarée "interactive" : le Joker peut la repositionner et elle doit garder la nouvelle pose',
  ],
};

export default game;
