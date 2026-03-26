import type { CollectiveGame } from './index';

const game: CollectiveGame = {
  id: 'collective_017',
  title: 'L\'Interview d\'Embauche',
  tone: 'absurde',
  difficulty: 'moyen',
  duration: '3 min',
  pro: true,
  setup: 'Le Joker est le recruteur RH. Il fait passer un entretien à un joueur à la fois. Le reste du groupe est le "comité de recrutement" (qui n\'a PAS le droit de rire).',
  rules: `Le Joker fait passer des entretiens d'embauche pour des postes complètement absurdes. Le candidat doit répondre avec un sérieux professionnel TOTAL. Le comité de recrutement (les autres joueurs) observe sans broncher.

Déroulement :
1. Le Joker appelle un candidat : "Veuillez vous asseoir. Merci d'avoir postulé."
2. Il présente le poste avec gravité
3. Il pose 4-5 questions avec un professionnalisme imperturbable
4. Le candidat doit répondre sérieusement (pas le droit de dire "je sais pas")
5. Après ~60 secondes, le Joker dit "Merci, on vous rappellera" et passe au candidat suivant
6. Candidat qui rit, comité qui rit = accusé

Entretien 1 — "Chuchoteur Professionnel de Pigeons — Ville de Paris" :
- "Parlez-moi de votre expérience en médiation aviaire."
- "Un pigeon refuse de quitter une terrasse de restaurant. Quelle est votre approche ?"
- "Sur une échelle de 1 à 10, évaluez votre intelligence émotionnelle aviaire."
- "Êtes-vous à l'aise avec le travail de nuit ? Les pigeons parisiens ont des horaires imprévisibles."
- "Votre plus grande faiblesse ? Et ne dites pas 'les mouettes'."

Entretien 2 — "Testeur de Canapés Longue Durée — IKEA" :
- "Combien d'heures consécutives pouvez-vous rester assis sans intervention médicale ?"
- "Décrivez votre technique de sieste optimale en 3 mots."
- "Un client vous demande si le canapé est confortable. Vous êtes dessus depuis 14 heures. Que répondez-vous ?"
- "Avez-vous des compétences en diplomatie de coussin ? Les conflits d'accoudoir sont fréquents."
- "Où vous voyez-vous dans 5 ans ? Et 'toujours sur ce canapé' est une réponse acceptable."

Entretien 3 — "Influenceur pour Légumes Moches — Carrefour" :
- "Montrez-moi comment vous vendriez cette carotte tordue à 50 000 followers."
- "Une aubergine difforme reçoit des commentaires haineux sur Instagram. Comment gérez-vous la crise ?"
- "Quel est votre taux d'engagement moyen sur du contenu poireau ?"
- "Avez-vous déjà fait pleurer quelqu'un avec une story sur un brocoli ? C'est important pour nous."
- "Notre concurrent utilise des filtres sur ses courgettes. Quelle est votre position éthique ?"

Le Joker doit garder un ton RH corporate impeccable : "Très bien", "Intéressant", "Je note", hochement de tête pensif, prise de notes imaginaire.`,
  variants: [
    'Le comité de recrutement peut poser UNE question chacun — mais elle doit être sérieuse (ce qui est encore plus dur)',
    'Le candidat doit présenter un "CV" en inventant ses expériences passées dans le domaine absurde du poste',
  ],
};

export default game;
