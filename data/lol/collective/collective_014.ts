import type { CollectiveGame } from './index';

const game: CollectiveGame = {
  id: 'collective_014',
  title: 'La Bande-Son',
  tone: 'absurde',
  difficulty: 'moyen',
  duration: '3 min',
  setup: 'Le Joker est le bruiteur. Il choisit 2 joueurs pour jouer une scène. Le reste du groupe est le public (qui n\'a PAS le droit de rire).',
  pro: true,
  rules: `Deux joueurs miment une scène du quotidien en silence. Le Joker fournit TOUS les bruits et effets sonores avec sa bouche et son corps. Les sons sont volontairement absurdes et disproportionnés. Les acteurs doivent rester en personnage malgré les bruits ridicules. Le public doit garder son sérieux.

Déroulement :
1. Le Joker annonce la scène aux deux acteurs
2. Les acteurs commencent à mimer. Ils ne parlent PAS.
3. Le Joker produit les effets sonores pour CHAQUE action (ouvrir une porte, s'asseoir, boire...)
4. Les sons doivent être de plus en plus exagérés et inappropriés
5. Après ~60 secondes, on change de scène (ou d'acteurs)
6. Acteurs qui craquent, public qui rit = accusé

Scènes avec effets sonores prévus :
- Scène : Au restaurant. Sons → porte qui s'ouvre (grincement dramatique de film d'horreur), chaise qu'on tire (cri aigu), menu qu'on ouvre (explosion), verre qu'on pose (gong de temple bouddhiste), bouchée de nourriture (moteur de formule 1).
- Scène : Chez le médecin. Sons → porte du cabinet (alarme de sous-marin), stéthoscope posé sur le torse (boing de dessin animé), réflexe du genou (coup de fouet), ordonnance imprimée (mitraillette), "au revoir docteur" (applaudissements de stade).
- Scène : Au supermarché. Sons → caddie qui roule (hélicoptère), produit scanné (laser de Star Wars), sac plastique (tempête de vent), paiement carte (jackpot de machine à sous), porte automatique (décollage de fusée).
- Scène : Rendez-vous galant. Sons → arrivée (fanfare présidentielle), bisou sur la joue (ventouse), rire gêné (klaxon de camion), silence romantique (grillon + vent du désert), addition (tonnerre).
- Scène : Entretien d'embauche. Sons → poignée de main (craquement d'os), s'asseoir (whoopee cushion), ouvrir son CV (parchemin antique), réponse du candidat (écho de cathédrale), "on vous rappellera" (game over 8-bit).

Le Joker peut ajouter des sons non sollicités (musique de fond soudaine, rire enregistré, bruit de pas quand personne ne bouge).`,
  variants: [
    'Les acteurs doivent PARLER mais le Joker fait les bruits PAR-DESSUS leurs répliques',
    'Le public devient un orchestre : chaque spectateur se voit attribuer un son spécifique à produire au signal du Joker',
  ],
};

export default game;
