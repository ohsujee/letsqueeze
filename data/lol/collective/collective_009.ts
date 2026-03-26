import type { CollectiveGame } from './index';

const game: CollectiveGame = {
  id: 'collective_009',
  title: 'Le Miroir Infernal',
  tone: 'physique',
  difficulty: 'facile',
  duration: '3 min',
  setup: 'Tout le monde debout face au Joker. Le Joker est le modèle, les autres sont ses miroirs. Avant de commencer, le Joker désigne secrètement un joueur comme la "Bombe" (chuchoter ou montrer discrètement) — ce joueur ne dit rien et attend la révélation.',
  rules: `Le Joker fait des mouvements que tout le monde doit reproduire EN MIROIR et en parfaite synchronisation. Mais trois mécaniques spéciales viennent semer le chaos. Le Joker doit GARDER un visage de marbre — plus il est sérieux, plus c'est dévastateur.

═══ PHASE 1 — Miroir classique (0 à 60 secondes) ═══
Le Joker commence doucement et accélère progressivement. À tout moment, il peut crier "FREEZE !"

Mouvements Phase 1 (échauffement → montée) :
- Lever le bras droit lentement
- Toucher son nez avec l'index
- Faire un clin d'œil exagéré du côté gauche
- Se caresser la tête en se tapotant le ventre
- Faire le canard (marcher accroupi)

FREEZE ! — Tout le monde gèle dans sa position actuelle. Le Joker se promène et inspecte. Quiconque bouge ou rit : accusé ! Pendant le freeze, le Joker peut chuchoter quelque chose d'absurde à un joueur ("tu es un flamant rose", "tu fonds comme un glaçon"). Ce joueur doit intégrer la consigne quand le Joker crie "REPRISE !"

Quiconque se trompe de côté, retarde, ou RIT : accusé !

═══ PHASE 2 — Chaos mental (60 à 120 secondes) ═══
Le Joker choisit l'un de ces deux modes :

MODE INVERSION :
Le Joker crie "INVERSION !" — les règles se retournent. Les joueurs doivent faire l'OPPOSÉ de ce que fait le Joker (lever la main gauche quand le Joker lève la droite, se baisser quand il se lève, etc.). "DOUBLE INVERSION !" = retour au miroir normal. Le Joker alterne pour brouiller les cerveaux.

Mouvements Phase 2 (destructeurs en inversion) :
- Danser la macarena au ralenti
- Faire semblant de pleurer, puis sourire, puis pleurer
- Mimer un gorille qui se bat la poitrine
- Faire un dab au ralenti en moonwalk

OU MODE DUEL :
Le Joker désigne 2 joueurs pour un face-à-face. Ils se regardent dans les yeux. L'un mène, l'autre est le miroir. L'objectif du meneur : faire rire le miroir. Si le miroir rit avant 30 secondes → accusé. Si le miroir survit 30 secondes → c'est le meneur qui est accusé. Pendant le duel, le reste du groupe continue à reproduire le Joker.

═══ PHASE 3 — La Bombe (120 à 180 secondes) ═══
Le Joker crie "BOMBE !" et révèle le joueur désigné au début. La Bombe prend la place du Joker comme meneur pendant 30 secondes. Sa mission : faire les mouvements les plus ridicules et déstabilisants possibles pour faire craquer tout le monde.

Mouvements Phase 3 (suggestions pour la Bombe) :
- Faire une révérence de princesse puis un mouvement de karaté
- Faire la vague avec tout le corps comme un spaghetti
- Mimer une poule qui pond un œuf en situation de stress

Après les 30 secondes de la Bombe, le Joker reprend le contrôle pour le sprint final jusqu'à la fin des 3 minutes. Tout est permis : FREEZE, INVERSION, accélération maximale.`,
  variants: [
    'Ajouter plusieurs Bombes secrètes qui se révèlent en chaîne toutes les 20 secondes',
    'Combiner INVERSION + DUEL : le miroir du duel doit faire l\'opposé au lieu de copier',
    'Le Joker fait les mouvements DOS au groupe — les miroirs doivent deviner ce qu\'il fait',
  ],
};

export default game;
