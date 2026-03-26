import type { CollectiveGame } from './index';

const game: CollectiveGame = {
  id: 'collective_013',
  title: 'Le Marionnettiste',
  tone: 'physique',
  difficulty: 'moyen',
  duration: '3 min',
  setup: 'Le Joker est le marionnettiste. Il choisit un premier joueur comme "marionnette". Le reste du groupe regarde (et n\'a PAS le droit de rire).',
  rules: `Le Joker "contrôle" un joueur comme une marionnette, en narrant chaque mouvement que la marionnette doit exécuter. La marionnette doit obéir immédiatement ET garder un visage parfaitement neutre. Le public aussi doit rester impassible.

Déroulement :
1. Le Joker choisit sa première marionnette
2. Il mime de tirer des fils imaginaires et narre les actions
3. La marionnette exécute EXACTEMENT ce qui est décrit, avec des mouvements saccadés de marionnette
4. Toutes les 30-45 secondes, le Joker change de marionnette ("Je repose celle-ci... et je prends celle-là !")
5. La marionnette qui rit, le public qui rit = accusé

Séquences pré-écrites (difficulté croissante) :
- "La marionnette se réveille doucement... elle découvre ses mains... elle ne comprend pas ce que c'est..."
- "La marionnette salue poliment le public. Avec élégance. Plus d'élégance. TROP d'élégance."
- "La marionnette tente de boire un verre d'eau invisible mais ses bras ne répondent plus correctement."
- "La marionnette tente de séduire la chaise la plus proche. Elle lui fait les yeux doux. Elle lui caresse le dossier."
- "La marionnette subit une erreur système et redémarre. (Le joueur doit se figer, vibrer, puis reprendre comme si de rien n'était.)"
- "Deux marionnettes se rencontrent. Elles essaient de se serrer la main mais les fils s'emmêlent."
- "La marionnette reçoit un appel téléphonique. Elle décroche son pied."
- "La marionnette tente un discours émouvant mais ses bras applaudissent tout seuls."

Le Joker peut aussi enchaîner des micro-ordres rapides : "Lève le bras — baisse-le — l'autre — tourne — stop — souris — non pas comme ça — voilà — non."`,
  variants: [
    'Deux marionnettes en même temps : le Joker doit gérer les deux avec des instructions différentes',
    'La marionnette "bugge" : à un signal du Joker, elle répète en boucle le dernier mouvement jusqu\'au prochain ordre',
  ],
};

export default game;
