import type { CollectiveGame } from './index';

const game: CollectiveGame = {
  id: 'collective_012',
  title: 'Le Présentateur Météo',
  tone: 'absurde',
  difficulty: 'facile',
  duration: '3 min',
  pro: true,
  setup: 'Le Joker est le présentateur météo. Chaque joueur se voit attribuer une région française (le Joker les assigne). Aucun accessoire nécessaire.',
  rules: `Le Joker présente le bulletin météo du jour, mais la "météo" décrit en réalité les joueurs. Chaque joueur est une région et le Joker le pointe du doigt en annonçant ses prévisions. Les joueurs doivent rester impassibles pendant qu'on décrit leur "climat".

Déroulement :
1. Le Joker assigne une région à chaque joueur ("Toi tu es la Bretagne, toi l'Île-de-France...")
2. Le Joker prend une voix de présentateur télé et commence le bulletin
3. Il pointe chaque joueur-région en délivrant sa prévision
4. Premier tour : prévisions légères. Deuxième tour : escalade dans l'absurde
5. Tout joueur qui rit est accusé

Prévisions pré-écrites (une par joueur, le Joker adapte) :
- "Fort vent de malaise sur la région Bretagne, avec 90% de chance de crise existentielle d'ici jeudi."
- "Pluie de compliments non sollicités sur la Côte d'Azur. Sortez les parapluies émotionnels."
- "Brouillard épais d'excuses bidon sur l'Île-de-France. Visibilité : zéro crédibilité."
- "Alerte canicule de ragots sur le Sud-Ouest. Température ressentie : 47 degrés de mesquinerie."
- "Averse de textos envoyés à 3h du matin sur la Normandie. Prévoyez des regrets au réveil."
- "Vague de froid émotionnel sur les Alpes. Le thermomètre affiche -12 en empathie."
- "Tempête de stories Instagram non justifiées sur la Provence. Les filtres ne suffiront pas."
- "Éclaircie de motivation passagère sur le Nord. Ne vous inquiétez pas, ça ne durera pas."
- "Grêle de 'on se voit bientôt' jamais suivis d'effet sur le Centre-Val de Loire."
- "Phénomène rare sur l'Alsace : pluie de bon sens. Les autorités sont en alerte."

Après chaque prévision, la « région » ciblée peut répondre par UNE phrase en gardant un ton sérieux de maire local. Quiconque rit pendant sa réponse est accusé.

Le format est rapide : une prévision par joueur, puis on reboucle avec des prévisions de plus en plus absurdes jusqu'à ce que quelqu'un craque.`,
  variants: [
    'Les joueurs doivent mimer la météo qu\'on leur annonce (trembler pour le froid, fondre pour la canicule) sans rire',
    'Le Joker annonce des "alertes spéciales" en criant soudainement pour surprendre les joueurs',
  ],
};

export default game;
