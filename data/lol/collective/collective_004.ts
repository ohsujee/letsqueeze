import type { CollectiveGame } from './index';

const game: CollectiveGame = {
  id: 'collective_004',
  title: 'Le Téléphone Arabe Gênant',
  tone: 'genant',
  difficulty: 'moyen',
  duration: '3 min',
  pro: true,
  setup: 'Tout le monde en file. Le Joker est au début de la chaîne. Minimum 4 joueurs pour que ce soit drôle.',
  rules: `Le Joker chuchote une phrase à l'oreille du premier joueur. Chaque joueur répète À VOIX HAUTE ce qu'il a compris au joueur suivant (pas en chuchotant !). La distorsion se fait en temps réel et tout le monde entend le massacre progressif.

Le DERNIER joueur doit dire la phrase finale EN REGARDANT TOUT LE MONDE DANS LES YEUX, sans sourire. Quiconque rit (y compris celui qui révèle) est accusé !

Règles strictes :
- On ne répète la phrase qu'UNE seule fois, à voix haute
- Pas le droit de demander de répéter
- Si on n'a pas compris, on transmet ce qu'on CROIT avoir entendu
- Le Joker révèle la phrase originale à la fin

Phrases conçues pour une distorsion maximale :
- "Mon dermatologue collectionne les croûtes de fromage et c'est son plus beau secret"
- "Le plombier a trouvé un canard vivant dans les tuyaux et il veut le garder"
- "Ma prof de yoga a pété en plein cours et elle a dit que c'était du chakra"
- "Le facteur m'a avoué qu'il lit mes cartes postales et qu'il est fan de ma tante Gisèle"
- "J'ai surpris mon voisin en train de parler à ses courgettes en les appelant par des prénoms"
- "Le dentiste m'a dit que mes dents ressemblent à Stonehenge et il avait l'air sincèrement ému"

Faire 2-3 tours avec des phrases différentes.`,
  variants: [
    'Le dernier joueur doit MIMER la phrase au lieu de la dire',
    'Chaque joueur ajoute un mot de son choix avant de transmettre',
  ],
};

export default game;
