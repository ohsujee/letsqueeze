import type { CollectiveGame } from './index';

const game: CollectiveGame = {
  id: 'collective_001',
  title: 'Le Procès Express',
  tone: 'absurde',
  difficulty: 'facile',
  duration: '3 min',
  setup: 'Le Joker est le juge. Tout le monde reste assis ou debout en demi-cercle face au juge.',
  rules: `Le Joker pointe du doigt un joueur et annonce un crime ABSURDE. L'accusé a 15 secondes pour se défendre SANS sourire. Le reste du groupe est le jury.

Déroulement :
1. Le Joker désigne un accusé et annonce le crime
2. L'accusé se lève et plaide sa cause (15 secondes, chrono par le Joker)
3. Le jury vote : pouce en haut = innocent, pouce en bas = coupable
4. Si l'accusé sourit ou rit pendant sa défense → coupable automatique !

Crimes à annoncer (le Joker choisit ou improvise) :
- "Accusé(e) d'avoir mangé une pizza à la fourchette devant des Italiens"
- "Accusé(e) d'avoir dit 'bon appétit' à quelqu'un qui allait aux toilettes"
- "Accusé(e) d'avoir fait un doigt d'honneur à un pigeon"
- "Accusé(e) d'avoir mis du ketchup sur un croissant"
- "Accusé(e) d'avoir chanté sous la douche en playback devant un shampoing"
- "Accusé(e) d'avoir répondu 'toi aussi' quand le serveur a dit 'bon appétit'"
- "Accusé(e) d'avoir couru pour attraper un bus... et de l'avoir raté à 1 mètre"
- "Accusé(e) d'avoir liké une photo de 2014 en stalkant un ex"

Le Joker peut désigner un CO-ACCUSÉ qui doit corroborer la défense de l'accusé sans s'être préparé. Les deux doivent garder leur sérieux.

Le Joker passe 3-4 accusés en 3 minutes. Rythme rapide !`,
  variants: [
    'Le jury peut poser UNE question piège à l\'accusé avant de voter',
    'L\'accusé doit se défendre en parlant comme un robot / en chuchotant / en criant',
  ],
};

export default game;
