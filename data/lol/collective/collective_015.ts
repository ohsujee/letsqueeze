import type { CollectiveGame } from './index';

const game: CollectiveGame = {
  id: 'collective_015',
  title: 'Le Sous-Titrage en Direct',
  tone: 'genant',
  difficulty: 'facile',
  duration: '3 min',
  setup: 'Le Joker est le sous-titreur. Il choisit 2 joueurs pour jouer la conversation. Le reste du groupe est le public (qui n\'a PAS le droit de rire).',
  rules: `Deux joueurs ont une conversation normale et polie. Après CHAQUE réplique, le Joker lit à voix haute ce que le personnage pense VRAIMENT. Les acteurs doivent continuer la conversation comme si de rien n'était, visage impassible, malgré les sous-titres dévastateurs.

Déroulement :
1. Le Joker annonce le scénario et désigne les deux acteurs
2. Le premier acteur dit sa réplique (lue depuis le script)
3. Le Joker annonce : "Sous-titre :" puis lit la pensée réelle
4. Le deuxième acteur enchaîne avec sa réplique, et ainsi de suite
5. Les acteurs doivent garder leur sérieux APRÈS avoir entendu le sous-titre
6. Acteurs qui craquent, public qui rit = accusé

Script 1 — "Deux collègues se retrouvent à la machine à café" :
- A : "Salut ! Ça va bien ?" → Sous-titre : "Je t'ai vu arriver et j'ai failli faire demi-tour."
- B : "Super et toi ? T'as passé un bon week-end ?" → Sous-titre : "Je m'en fiche tellement que j'ai failli m'endormir en posant la question."
- A : "Oui tranquille, repos ! Et toi ?" → Sous-titre : "J'ai regardé le plafond pendant 48 heures en mangeant du fromage râpé à la main."
- B : "Pareil, rien de spécial !" → Sous-titre : "J'ai stalké mon ex pendant 6 heures puis j'ai pleuré dans ma douche."
- A : "Ah cool, on se fait un déj un de ces quatre ?" → Sous-titre : "Pitié dis non, pitié dis non, pitié dis non."
- B : "Carrément, avec plaisir !" → Sous-titre : "On sait tous les deux que ça n'arrivera jamais."
- A : "Allez, bonne journée !" → Sous-titre : "Enfin débarrassé."
- B : "Toi aussi !" → Sous-titre : "Je vais aller aux toilettes me remettre de cette interaction."

Script 2 — "Premier rendez-vous" :
- A : "Enchanté ! T'es encore plus beau/belle qu'en photo !" → Sous-titre : "T'as utilisé des photos d'il y a combien d'années exactement ?"
- B : "Merci, toi aussi ! J'adore cet endroit." → Sous-titre : "C'est le resto le moins cher que t'as trouvé ?"
- A : "Tu fais quoi dans la vie ? Ça a l'air passionnant !" → Sous-titre : "S'il te plaît, aie un travail. N'importe lequel."
- B : "Je suis en reconversion, c'est un nouveau départ !" → Sous-titre : "Je regarde des tutos YouTube en pyjama depuis mars."
- A : "C'est courageux, j'admire ça !" → Sous-titre : "Mon père va adorer cette information."
- B : "Et toi, t'as des passions ?" → Sous-titre : "Dis pas crypto, dis pas crypto, dis pas crypto."
- A : "Le sport, les voyages, la cuisine !" → Sous-titre : "Netflix, Uber Eats, et mon canapé."
- B : "On a trop de points communs !" → Sous-titre : "On a littéralement zéro point commun."
- A : "On se revoit bientôt ?" → Sous-titre : "Je vais te ghoster dans exactement 48 heures."
- B : "J'adorerais !" → Sous-titre : "J'ai déjà re-ouvert Tinder sous la table."

Script 3 — "Retrouvailles entre vieux amis" :
- A : "Woooow ça fait tellement longtemps !" → Sous-titre : "Je ne me souviens absolument pas de ton prénom."
- B : "Trop content de te revoir ! T'as pas changé !" → Sous-titre : "T'as pris 15 kilos mais ce serait malpoli de le dire."
- A : "Qu'est-ce que tu deviens ? Toujours avec Sophie ?" → Sous-titre : "Je sais déjà tout, j'ai vu ton divorce sur Facebook."
- B : "Non, c'est fini, mais je suis en paix avec ça." → Sous-titre : "Je ne suis pas du tout en paix avec ça."
- A : "T'inquiète, tu vas retrouver quelqu'un !" → Sous-titre : "Avec ta personnalité, ça va être compliqué quand même."
- B : "Et toi, le boulot, ça roule ?" → Sous-titre : "J'espère que tu galères plus que moi."
- A : "Ça va super bien, grosse promo récemment !" → Sous-titre : "On m'a donné un nouveau titre sans augmentation."
- B : "Bravo, tu le mérites tellement !" → Sous-titre : "La vie est injuste."
- A : "Faut qu'on se refasse une soirée comme avant !" → Sous-titre : "Comme avant quand je te supportais."
- B : "Grave, je t'envoie un message !" → Sous-titre : "Je vais perdre ton numéro volontairement."`,
  variants: [
    'Les acteurs doivent improviser leurs répliques (pas de script), et le Joker improvise les sous-titres en temps réel',
    'Le Joker ajoute parfois des "didascalies" : "(sourit mais meurt à l\'intérieur)", "(transpire abondamment)"',
  ],
};

export default game;
