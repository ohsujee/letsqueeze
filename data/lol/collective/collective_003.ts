import type { CollectiveGame } from './index';

const game: CollectiveGame = {
  id: 'collective_003',
  title: 'Statue Émotionnelle',
  tone: 'physique',
  difficulty: 'facile',
  duration: '3 min',
  setup: 'Tout le monde debout, un peu d\'espace entre chaque joueur. Le Joker fait face au groupe.',
  rules: `Le Joker annonce une situation/émotion et compte "3, 2, 1, FREEZE !" À "FREEZE", tout le monde se fige dans une pose qui représente cette émotion. Interdiction de bouger pendant 10 secondes.

Le Joker passe devant chaque statue et les commente comme un guide de musée ultra sérieux : "Ici nous avons une œuvre magnifique intitulée 'La Douleur du Lundi Matin'..."

Situations à annoncer (du drôle au dévastateur) :
1. "Tu viens de gagner au loto" (échauffement)
2. "Tu réalises que tu as envoyé un message intime au groupe familial"
3. "Tu marches pieds nus et tu écrases un truc froid et mou"
4. "Ton crush te fait un clin d'œil mais tu sais pas si c'est pour toi"
5. "Tu pètes dans un ascenseur bondé et tout le monde te regarde"
6. "Tu es un spaghetti qui prend conscience de son existence"
7. "Tu vois le prix de l'addition au restaurant"
8. "Tu fais semblant de comprendre une blague que t'as pas comprise"
9. "On te dit 'il faut qu'on parle' par message"
10. "Tu découvres que ton Uber est arrivé mais tu es encore en pyjama"

Après chaque freeze, le Joker peut taper sur l'épaule d'une statue : celle-ci doit « prendre vie » et expliquer son œuvre d'art en 10 secondes avec un ton de guide de musée, sans sourire.

Enchaîner 5-6 émotions en 3 minutes. Quiconque bouge ou rit pendant le freeze : accusé !`,
  variants: [
    'Le Joker désigne une statue au hasard : cette personne doit "prendre vie" et raconter son histoire en 10 secondes, toujours figée dans sa pose',
    'Deux joueurs doivent fusionner leurs poses en une seule sculpture à deux, le Joker lui donne un titre de musée',
  ],
};

export default game;
