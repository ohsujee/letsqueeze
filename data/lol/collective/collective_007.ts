import type { CollectiveGame } from './index';

const game: CollectiveGame = {
  id: 'collective_007',
  title: 'Confession ou Invention',
  tone: 'genant',
  difficulty: 'moyen',
  duration: '3 min',
  setup: 'Tout le monde en cercle. Le Joker donne l\'ordre de passage.',
  pro: true,
  rules: `Chaque joueur raconte une "confession" — soit VRAIE, soit complètement INVENTÉE. Le groupe vote : réalité ou fiction ? Le twist : les histoires les plus absurdes sont souvent vraies.

Déroulement :
1. Chaque joueur a 30 secondes pour sa confession
2. La confession DOIT commencer par "Je dois avouer un truc..." avec un ton ultra sérieux
3. Le groupe vote à main levée : VRAI ou FAUX
4. Le confesseur révèle la vérité
5. MAIS SURTOUT : quiconque RIT pendant la confession de quelqu'un est accusé !

Rôle du Joker — Cartes de confession :
Le Joker dispose de "cartes de confession" pré-écrites. Si un joueur n'a pas d'idée, le Joker lui donne une carte qu'il doit lire et revendiquer comme sienne avec un sérieux total.

Cartes de confession du Joker :
- "Je dois avouer un truc... J'ai déjà fait semblant de parler au téléphone pour éviter quelqu'un dans la rue. Et c'était ma propre mère."
- "Je dois avouer un truc... J'ai pleuré devant un documentaire sur les crevettes. Vraiment pleuré. Avec des sanglots."
- "Je dois avouer un truc... J'ai déjà dit 'je t'aime' par accident à un livreur Uber Eats."
- "Je dois avouer un truc... J'ai un doudou. J'ai 27 ans. Il s'appelle Maurice."
- "Je dois avouer un truc... J'ai goûté de la nourriture pour chat une fois. Par curiosité. Et j'ai trouvé ça correct."
- "Je dois avouer un truc... Je parle à mes plantes. Et je suis convaincu que la fougère du salon me juge."
- "Je dois avouer un truc... J'ai déjà applaudi tout seul à la fin d'un film. Dans mon salon. En pyjama."
- "Je dois avouer un truc... Je fais semblant de comprendre le vin. Je dis 'hmm, fruité' à chaque gorgée, même pour du jus de pomme."

Conseils au Joker pour lancer le jeu :
- "Souvenez-vous : ton SÉRIEUX, regard dans les yeux, AUCUN sourire"
- "Si vous n'avez pas d'idée, je vous donne une carte et vous la lisez comme si c'était votre vie"

Faire un tour complet. Le sérieux du ton VS l'absurdité du contenu = combo létal.`,
  variants: [
    'Le groupe peut poser UNE question de suivi avant de voter',
    'Le Joker peut exiger que la confession soit chuchotée pour plus de malaise',
  ],
};

export default game;
