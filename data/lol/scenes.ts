/**
 * LOL - Scenarios Theatraux (Duos, Trios, Quatuors)
 * Le joueur du Joker choisit ses partenaires.
 * Chaque role a ses propres instructions visibles uniquement sur son telephone.
 */

export interface SceneRole {
  name: string;
  instructions: string;
}

export interface Scene {
  id: string;
  title: string;
  tone: 'absurde' | 'genant' | 'cringe' | 'dark' | 'wholesome';
  difficulty: 'facile' | 'moyen' | 'hard';
  duration: string;
  playerCount: number; // 2 = duo, 3 = trio, 4 = quatuor
  setup: string;
  roles: SceneRole[];
  twist?: string;
  pro?: boolean;
}

export const SCENES: Scene[] = [
  // --- DUOS ---
  {
    id: 'scene_001',
    title: 'Le Restaurant Impossible',
    tone: 'absurde',
    difficulty: 'facile',
    playerCount: 2,
    duration: '2-3 min',
    setup: 'Un client entre dans un restaurant tres chic. Le serveur est BEAUCOUP trop intense.',
    roles: [
      {
        name: 'Le Serveur Dramatique',
        instructions: `Tu es un serveur dans un restaurant 5 etoiles. Tu prends ton travail BEAUCOUP trop a coeur. Chaque plat que tu presentes, tu le decris comme si c'etait une oeuvre d'art qui t'a fait pleurer. Tu verses une larme quand le client commande.

Quand le client dit ce qu'il veut manger, tu dis : "Magnifique choix. Vous avez change ma vie." Et tu t'en vas en essuyant une larme.

Si le client se plaint, tu t'effondres et tu dis : "C'est le chef. Il traverse une periode difficile. Son poisson rouge est parti."`,
      },
      {
        name: 'Le Client Perdu',
        instructions: `Tu es dans un restaurant tres chic mais tu voulais aller au McDonald's d'a cote. Tu comprends rien au menu. Tu demandes s'ils ont des nuggets. Puis un Happy Meal. Tu te plains que les portions sont trop petites.

A un moment, demande si tu peux avoir du ketchup. Quand le serveur reagit, dis : "OK, de la mayo alors ?"

Tu finis par commander "le truc le moins cher" en pointant un truc au hasard sur un menu imaginaire.`,
      },
    ],
    twist: 'A la fin, le client recoit une addition de 847 euros pour un verre d\'eau.',
  },
  {
    id: 'scene_002',
    title: 'Le Couple en Therapie',
    tone: 'genant',
    difficulty: 'moyen',
    playerCount: 2,
    duration: '2-3 min',
    setup: 'Un couple est en therapie de couple. Le probleme : l\'un des deux ne remet JAMAIS le bouchon du dentifrice.',
    roles: [
      {
        name: 'L\'Accusateur',
        instructions: `Tu es en therapie de couple et tu es FURIEUX/FURIEUSE. Le probleme ? Ton/ta partenaire ne remet JAMAIS le bouchon du dentifrice. C'est un sujet extremement grave pour toi.

Parle comme si c'etait la pire trahison de ta vie. Dis des choses comme :
- "Ca fait 3 ans. 3 ANS que je vis avec ce traumatisme."
- "Ma mere m'avait prevenu(e)."
- "J'en ai parle a mes collegues. Ils sont choques."

A la fin, revele un autre probleme : il/elle mange les cereales directement dans la boite. Eclate en sanglots.`,
      },
      {
        name: 'L\'Accuse(e)',
        instructions: `Tu es en therapie de couple et tu trouves que ton/ta partenaire exagere COMPLETEMENT. Le dentifrice, c'est pas si grave. Mais tu dois quand meme essayer de t'excuser... tres mal.

Tes excuses :
- "Mais le bouchon, il revient tout seul normalement non ?"
- "J'ai essaye une fois de le remettre. Ca m'a pris 4 secondes. C'est 4 secondes de ma vie."
- "Tu sais ce qui est VRAIMENT un probleme ? Toi tu coupes pas les lumieres. L'electricite ca coute de l'argent."

A la fin, propose une solution : acheter deux tubes de dentifrice. Un pour chacun. "Comme ca on divorce pas."`,
      },
    ],
  },
  {
    id: 'scene_003',
    title: 'L\'Entretien d\'Embauche Surréaliste',
    tone: 'absurde',
    difficulty: 'facile',
    playerCount: 2,
    duration: '2-3 min',
    setup: 'Un candidat passe un entretien pour un poste mysterieux. Le recruteur pose des questions de plus en plus bizarres.',
    roles: [
      {
        name: 'Le Recruteur',
        instructions: `Tu recrutes pour un poste dont tu ne reveles jamais le titre. Tes questions :

1. "Bonjour, asseyez-vous. Premiere question : quel bruit fait un frigo quand personne ne l'ecoute ?"
2. "Tres bien. Combien de temps pouvez-vous maintenir un contact visuel sans cligner ?" (Fais le test en le fixant)
3. "Si vous etiez un meuble, lequel seriez-vous et pourquoi ce meuble specifiquement est-il triste ?"
4. "Derniere question. Imitez un pingouin qui a perdu ses cles."

Quelle que soit la reponse, prends des notes TRES serieuses en hochant la tete. A la fin, dis : "Felicitations. Vous commencez lundi. Le poste est gardien de nuit dans un aquarium."`,
      },
      {
        name: 'Le Candidat',
        instructions: `Tu es desespere d'avoir ce job. Tu ne sais pas ce que c'est comme poste mais tu le veux ABSOLUMENT. Reponds a chaque question avec un serieux absolu. Trouve des reponses. N'hesite pas a te lever, mimer, faire des bruits.

Si le recruteur te demande quelque chose de bizarre, dis : "C'est exactement mon domaine d'expertise." Puis improvise une reponse confiante.

A la fin, quelle que soit l'issue, serre sa main avec les deux mains et dis : "Merci. C'est le plus bel entretien de ma vie."`,
      },
    ],
  },
  {
    id: 'scene_004',
    title: 'La Declaration d\'Amour au Mauvais Moment',
    tone: 'genant',
    difficulty: 'moyen',
    playerCount: 2,
    duration: '1-2 min',
    setup: 'Quelqu\'un declare sa flamme a une personne qui est clairement en train de faire autre chose de tres banal.',
    pro: true,
    roles: [
      {
        name: 'L\'Amoureux/se Transit',
        instructions: `Tu dois declarer ton amour a l'autre joueur. Le probleme : tu es BEAUCOUP trop intense. Ton texte :

"Arrete tout ce que tu fais. Il faut que je te dise quelque chose. [Pause dramatique] Depuis la premiere fois que je t'ai vu(e)... manger ce sandwich au jambon... j'ai su que c'etait toi."

"Tes yeux... tes yeux sont comme... des yeux. Mais en mieux."

"Je sais que c'est soudain. Mais j'ai ecrit un poeme." [Sors un papier imaginaire et lis :] "Tes sourcils sont comme deux routes qui menent vers le bonheur."

Si l'autre te rejette, tombe a genoux et crie : "POURQUOIIII ?!" pendant 5 secondes.`,
      },
      {
        name: 'La Personne Occupee',
        instructions: `Tu es en train de faire un truc completement banal (regarder ton telephone, te curer les ongles, compter tes doigts). Quand l'autre commence a te parler, tu l'ecoutes a peine.

Tes reactions :
- "Attends 2 secondes, j'ai un message"
- "C'est mignon. T'as fini ?"
- "Euh... on se connait ?"
- "Le poeme etait... hmm... tu peux le refaire en mieux ?"

A la fin, dis : "Bon ecoute. Tu me plais bien. Mais d'abord faut que tu rencontres mon chat. C'est lui qui decide."`,
      },
    ],
  },
  {
    id: 'scene_005',
    title: 'Le Medecin Douteux',
    tone: 'absurde',
    difficulty: 'facile',
    playerCount: 2,
    duration: '2-3 min',
    setup: 'Un patient vient pour un simple rhume. Le medecin a clairement eu son diplome sur Internet.',
    roles: [
      {
        name: 'Le Medecin',
        instructions: `Tu es "docteur". Tu as eu ton diplome en ligne en 3 jours. Tu fais semblant de tout savoir.

1. Accueille le patient : "Ah, bonjour, entrez. Allongez-vous. Non pas la. Par terre. Voila."
2. Examine-le : regarde son coude, declare "Hmm, c'est bien ce que je pensais." Ne dis pas quoi.
3. Prescription : "Je vous prescris... 4 litres de jus d'orange. Par heure. Pendant 3 mois."
4. Si le patient questionne : "Vous avez fait medecine vous ? Non ? Alors."
5. A la fin : "Ca fera 200 euros. Ah, on prend pas la carte. Juste les coquillages."`,
      },
      {
        name: 'Le Patient',
        instructions: `Tu viens juste pour un petit rhume. Mais le medecin est de plus en plus bizarre et tu commences a paniquer.

1. Commence normal : "Bonjour docteur, j'ai un petit rhume."
2. Quand il t'examine bizarrement, demande : "Euh, c'est normal ca ?"
3. Quand il prescrit un truc bizarre, dis : "Mon ancien medecin me donnait juste du Doliprane..."
4. A la fin, dis : "Je crois que je vais demander un deuxieme avis." Et pars doucement en reculant sans le quitter des yeux.`,
      },
    ],
  },
  {
    id: 'scene_006',
    title: 'Le Demenagement Emotionnel',
    tone: 'wholesome',
    difficulty: 'facile',
    playerCount: 2,
    duration: '1-2 min',
    setup: 'Deux colocataires font leurs cartons car l\'un des deux demenage. Ils sont BEAUCOUP trop emotionnels a propos d\'objets banals.',
    roles: [
      {
        name: 'Celui/Celle qui Part',
        instructions: `Tu demenages et tu fais tes cartons avec ton/ta coloc. Chaque objet que tu prends declenche un souvenir emu.

- [Prend un stylo imaginaire] "Ce stylo... c'est celui avec lequel on a ecrit la liste de courses ce fameux samedi."
- [Prend une tasse] "Et cette tasse... c'est MA tasse. Mais tu pourras la visiter."
- [Prend un objet random] "Ca, je te le laisse. Pour que tu te souviennes de moi."

A la fin : "Promets-moi qu'on se fera des aperos. Genre une fois par semaine. Non, par jour. Promets."`,
      },
      {
        name: 'Celui/Celle qui Reste',
        instructions: `Ton/ta coloc demenage et tu essaies d'etre fort(e) mais tu craques a chaque objet.

- "Non, prends pas le stylo ! Prends le stylo... [voix qui tremble] ...c'est ton stylo..."
- "La tasse, elle va me manquer. JE LUI PARLE LE MATIN."
- Quand il/elle te laisse un objet : "Je le mettrai dans un cadre. Sur la cheminee. A cote de la photo de nous au supermarche."

A la fin : "C'est pas un au revoir. C'est un... a plus tard... [eclate en sanglots] REVIENS DANS 5 MINUTES !"`,
      },
    ],
  },
  // --- TRIOS ---
  {
    id: 'scene_007',
    title: 'Le Tribunal du Frigo',
    tone: 'absurde',
    difficulty: 'moyen',
    playerCount: 3,
    duration: '2-3 min',
    setup: 'Un proces pour determiner qui a mange le dernier yaourt. Juge, accuse et avocat de la defense.',
    roles: [
      {
        name: 'Le Juge',
        instructions: `Tu presides le tribunal du frigo. C'est l'affaire la plus importante de ta carriere. Utilise un objet comme marteau de juge.

- "L'audience est ouverte ! Affaire numero 847 : le yaourt disparu."
- Interroge l'accuse : "Ou etiez-vous le soir du 14 a 23h47 ?"
- Quand l'avocat parle, dis : "OBJECTION ! ... ah pardon, c'est moi le juge, c'est moi qui decide des objections."
- Verdict final (apres 2 min) : "Le tribunal declare l'accuse... COUPABLE. La sentence : racheter 12 yaourts. Et un Danette en dedommagement moral."`,
      },
      {
        name: 'L\'Accuse(e)',
        instructions: `Tu es accuse(e) d'avoir mange le dernier yaourt. Tu nies TOUT malgre les preuves evidentes.

- "Je n'ai JAMAIS touche ce yaourt. C'etait peut-etre le chat."
- "D'accord j'etais dans la cuisine a cette heure-la. Mais je cherchais de l'eau. De l'EAU."
- Si on te presse : "OK j'ai ouvert le frigo. J'ai VU le yaourt. Mais je l'ai REGARDE, c'est tout. On a le droit de regarder un yaourt."
- A la fin : "D'accord. C'etait moi. Mais il etait DELICIEUX et je regrette RIEN."`,
      },
      {
        name: 'L\'Avocat(e) de la Defense',
        instructions: `Tu defends l'accuse(e) du yaourt. Tu es un tres mauvais avocat mais tres enthousiaste.

- "Votre Honneur ! Mon client est INNOCENT. La preuve : regardez sa tete. C'est pas une tete de mangeur de yaourt."
- Presente des "preuves" ridicules : "Piece a conviction A : cette cuillere. Elle est PROPRE. Un mangeur de yaourt aurait une cuillere SALE."
- Quand ca tourne mal : "Je demande une pause ! Mon client a besoin de... manger un yaourt. NON. Boire de l'eau."
- A la fin, abandonne la defense : "OK meme moi je le crois plus. Mais demandez la clemence. C'etait un yaourt a la fraise. On fait tous des erreurs."`,
      },
    ],
  },
  {
    id: 'scene_008',
    title: 'L\'Agence Immobiliere de l\'Enfer',
    tone: 'cringe',
    difficulty: 'moyen',
    playerCount: 3,
    duration: '2-3 min',
    setup: 'Un agent immobilier fait visiter un appartement horrible a un couple. L\'agent est d\'une mauvaise foi absolue.',
    pro: true,
    roles: [
      {
        name: 'L\'Agent Immobilier',
        instructions: `Tu fais visiter le PIRE appartement du monde mais tu le presentes comme un palace. Fais le tour de la "piece" en montrant des choses imaginaires.

- "Voici le salon ! 3m2. C'est ce qu'on appelle un espace COSY. Minimaliste. Tres tendance."
- "La cuisine est la. Oui, c'est le meme meuble que le salon. C'est un CONCEPT. Open space."
- "La vue ? Magnifique. Vous voyez ce mur ? Derriere ce mur il y a une vue. Faut juste imaginer."
- "Le loyer est de 1800 euros. Charges comprises. Ah non, charges en plus. Et y'a une taxe chat."

Si le couple se plaint : "Au prix du marche actuel, c'est une AFFAIRE. Y'a 40 visites demain."`,
      },
      {
        name: 'Le Partenaire Enthousiaste',
        instructions: `Tu ADORES l'appartement. Tu trouves tout genial malgre les defauts evidents. Tu te projettes deja.

- "Cheri(e) regarde ! On peut mettre le canape... la. Et la tele... sur le canape."
- "3m2 c'est LARGEMENT suffisant. On a juste a se debarrasser de nos affaires. TOUTES nos affaires."
- "Le mur en face c'est pas grave, on mettra un poster de plage. Ca fera COMME une vue."
- A ton/ta partenaire : "Arrete d'etre negatif/ve ! C'est notre CHEZ-NOUS. Enfin ce sera notre chez-nous. Si on signe."`,
      },
      {
        name: 'Le Partenaire Horrifie(e)',
        instructions: `Tu es en PANIQUE. Cet appartement est une catastrophe et tu comprends pas pourquoi ton/ta partenaire est emballe(e).

- "Excuse-moi mais... c'est un placard ca non ?"
- "Y'a pas de fenetre. On a BESOIN de fenetres. Pour respirer."
- Au partenaire : "Tu me fais peur la. On peut pas vivre ici. MON BRAS touche les deux murs en meme temps."
- A l'agent : "Est-ce qu'il y a deja eu des gens qui ont SURVECU ici ?"
- A la fin : "OK on prend... NON. Non on prend pas. [Au partenaire] Toi et moi on doit parler."`,
      },
    ],
  },
  // --- QUATUOR ---
  {
    id: 'scene_009',
    title: 'La Reunion de Copropriete',
    tone: 'absurde',
    difficulty: 'hard',
    playerCount: 4,
    duration: '2-3 min',
    setup: 'Reunion de copropriete qui degenere. Chacun a une plainte de plus en plus absurde.',
    pro: true,
    roles: [
      {
        name: 'Le President (Joueur du Joker)',
        instructions: `Tu presides la reunion. Tu essaies desesperement de garder le controle mais c'est le chaos.

- "Ordre du jour numero 1 : les poubelles. Qui met ses poubelles devant la porte du voisin ?"
- Quand tout degenere : "S'IL VOUS PLAIT ! Un a la fois !"
- "On VOTE. Qui est pour interdire les chats dans l'ascenseur ? ... Qui est pour interdire les GENS dans l'ascenseur ?"
- A la fin : "La seance est levee. Prochaine reunion : jamais. Je demissionne."`,
      },
      {
        name: 'Le Voisin du 3eme',
        instructions: `Ta plainte : le voisin du dessus fait des bruits BIZARRES a 3h du matin. Tu imites les bruits. (Fais des bruits absurdes.)

- "Toutes les nuits ! TOUTES LES NUITS ! Ca fait [imite un bruit ridicule]."
- "J'ai appele la police. Ils sont venus. ILS ONT ENTENDU. Ils sont repartis parce qu'ils avaient peur."
- Si quelqu'un te coupe : "MON PROBLEME EST PLUS GRAVE QUE LE TIEN."`,
      },
      {
        name: 'Le Voisin Ecolo',
        instructions: `Tu veux que l'immeuble devienne 100% ecolo. Tes propositions sont absurdes.

- "Je propose qu'on remplace l'ascenseur par une liane. C'est ecologique ET sportif."
- "Les lumieres du couloir ? On les remplace par des lucioles. J'en ai commande 400."
- "Chaque appartement devrait avoir sa propre chevre pour tondre le balcon."
- Si quelqu'un proteste : "C'est EXACTEMENT ce genre de mentalite qui detruit la planete."`,
      },
      {
        name: 'La Voisine Commere',
        instructions: `Tu sais TOUT sur tout le monde dans l'immeuble. Tu interromps constamment pour balancer des potins.

- "En parlant de bruit, je sais QUI fait du bruit. Mais je dis pas qui. [Pause] C'est Mme Dupont."
- "L'ecologie c'est bien mais le voisin du 5eme, lui, il jette ses spaghettis par la fenetre. Je l'ai VU."
- "Je dis ca, je dis rien, mais le gardien, il dort dans la cave. Avec un hamac. Et un ventilateur."
- A la fin : "Avant de partir, j'ai une information CRUCIALE. [Chuchote] Le chat du 2eme... c'est pas un chat."`,
      },
    ],
  },
];

export function getRandomScenes(count: number, maxPlayers: number, excludeIds: string[] = [], proOnly?: boolean): Scene[] {
  let pool = SCENES.filter(s => !excludeIds.includes(s.id) && s.playerCount <= maxPlayers);
  if (proOnly === false) pool = pool.filter(s => !s.pro);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
