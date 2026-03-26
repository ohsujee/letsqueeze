import type { CollectiveGame } from './index';

const game: CollectiveGame = {
  id: 'collective_010',
  title: 'Le Débat Présidentiel',
  tone: 'absurde',
  difficulty: 'hard',
  duration: '3 min',
  setup: 'Le Joker est le modérateur. Il choisit 2 candidats. Le reste du groupe est le public (qui n\'a PAS le droit de rire).',
  pro: true,
  rules: `Deux joueurs s'affrontent dans un débat d'une gravité ABSOLUE sur un sujet complètement débile. Le Joker modère avec un sérieux journalistique. Le public doit rester de marbre.

Déroulement :
1. Le Joker présente les candidats avec des titres pompeux ("Mesdames et Messieurs, accueillons le Professeur Dupont, expert mondial en...")
2. Chaque candidat a 30 secondes pour son argument d'ouverture
3. Le Joker pose des questions pièges
4. Phase de confrontation directe (les candidats se répondent)
5. Le public vote à la fin

Sujets de débat (le Joker choisit) :
- "La Terre est-elle un plat ou un dessert ? Défendez votre position."
- "Faut-il accorder le droit de vote aux pigeons ?"
- "Le slip doit-il se porter par-dessus le pantalon comme Superman ?"
- "La raclette est-elle un sport olympique légitime ?"
- "Doit-on remplacer la poignée de main par un check de fesses ?"
- "L'ananas sur la pizza mérite-t-il la prison ?"
- "Les chaussettes-claquettes sont-elles l'avenir de la haute couture ?"

Questions pièges du modérateur :
- "Avez-vous des CHIFFRES pour étayer cette affirmation ?"
- "Votre adversaire a dit [truc inventé], que répondez-vous ?"
- "Un mot pour la Nation, s'il vous plaît."
- "Regardez votre adversaire dans les yeux et répétez votre argument."

Le public qui rit est accusé. Les candidats qui craquent aussi. PERSONNE n'est à l'abri.`,
  variants: [
    'Chaque candidat a un "conseiller" qui lui chuchote des arguments à l\'oreille',
    'Le Joker peut déclarer un "SCANDALE !" et inventer une révélation sur un candidat',
  ],
};

export default game;
