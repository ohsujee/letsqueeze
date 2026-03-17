/**
 * LOL - Fiches Stand-Up (Monologues)
 * Le joueur performe ce texte comme un spectacle de comedie.
 * Les indications de jeu sont entre [crochets].
 */

export interface StandupScript {
  id: string;
  title: string;
  tone: 'absurde' | 'genant' | 'cringe' | 'dark' | 'wholesome';
  difficulty: 'facile' | 'moyen' | 'hard';
  duration: string;
  script: string;
  stageDirections: string;
  pro?: boolean;
}

export const STANDUP_SCRIPTS: StandupScript[] = [
  {
    id: 'standup_001',
    title: 'Le Philosophe du Kebab',
    tone: 'absurde',
    difficulty: 'facile',
    duration: '1-2 min',
    stageDirections: 'Ton ultra-serieux, comme une conference TED. Deambule lentement en regardant les gens dans les yeux.',
    script: `Mesdames et messieurs, bonsoir.

[Pause dramatique, regarde le public]

Ce soir, je vais vous parler d'un sujet qui me tient a coeur. Un sujet que la societe refuse d'aborder. Un sujet tabou.

[Voix grave]

Le kebab. Sauce blanche ou sauce samourai ?

Parce que, voyez-vous, ce choix... ce choix definit qui vous etes au plus profond de votre ame. Les gens sauce blanche, ce sont des gens stables. Des gens qui paient leurs impots a temps. Des gens qui rangent leurs chaussettes par paire.

[S'enflamme progressivement]

Mais les gens sauce samourai... Ah ! Les gens sauce samourai, ce sont des revolutionnaires ! Des poetes ! Des gens qui vivent sur le fil du rasoir ! Des gens qui mettent leur telephone sur 3% de batterie et qui sortent QUAND MEME.

Et il y a les gens "les deux sauces". Ceux-la, on n'en parle pas. Ce sont des agents du chaos. Des gens dangereux.

[Regarde quelqu'un fixement]

Toi, t'es sauce samourai, je le sens.

[Petit hochement de tete satisfait]

Merci. Merci beaucoup.`,
  },
  {
    id: 'standup_002',
    title: 'La Conference sur les Chaussettes',
    tone: 'absurde',
    difficulty: 'facile',
    duration: '1-2 min',
    stageDirections: 'Style professeur d\'universite. Utilise tes mains comme si tu faisais une presentation PowerPoint invisible.',
    script: `Bonjour a tous. Asseyez-vous. Merci d'etre venus a cette conference d'urgence.

[Ajuste des lunettes imaginaires]

Comme vous le savez, la France traverse une crise sans precedent. Non, je ne parle pas de l'economie. Je parle de la disparition mysterieuse des chaussettes dans les machines a laver.

Selon mes calculs — et j'ai fait des calculs, croyez-moi — chaque menage francais perd en moyenne 1.7 chaussettes par mois. Faites le calcul. C'est 22 MILLIONS de chaussettes par an. Ou vont-elles ?!

[Tape du poing sur une table imaginaire]

J'ai trois hypotheses. Hypothese numero un : les machines a laver sont des portails dimensionnels. Hypothese numero deux : il existe un marche noir international de chaussettes orphelines. Hypothese numero trois...

[Chuchote en regardant autour]

...les chaussettes sont vivantes et elles s'enfuient.

Personnellement, je penche pour la trois. J'ai surpris une de mes chaussettes pres de la porte d'entree a 3h du matin. Elle avait un petit sac a dos.

[Emotion dans la voix]

Laissez-les partir. Elles meritent d'etre libres.`,
  },
  {
    id: 'standup_003',
    title: 'Mon Chat est mon Manager',
    tone: 'genant',
    difficulty: 'facile',
    duration: '1-2 min',
    stageDirections: 'Ton serieux comme si tu racontais un vrai probleme professionnel. Mime les reactions du chat.',
    script: `Faut que je vous raconte un truc. Depuis trois semaines, c'est mon chat qui gere ma vie. Et je vous jure, il est meilleur que moi.

Lundi matin, reveil, je veux rester au lit. Mon chat vient. Me regarde. Me fixe. Me MET UNE CLAQUE.

[Mime une claque]

Je me leve. Premier meeting a 9h. Il est deja sur mon clavier. Il a deja envoye un mail a mon patron. J'ai pas lu le mail. Mon patron m'a augmente.

[Hausse les epaules]

Mardi, je veux commander une pizza. Mon chat se met devant le telephone. Il me regarde avec ses yeux genre... "Non. On mange des croquettes ce soir." Et j'ai mange des croquettes.

[Pause]

C'etait pas si mal en vrai. Gout saumon.

Le pire c'est que mes amis preferent mon chat. Ils m'appellent plus. Ils appellent directement le chat. Il a son propre agenda. Il va prendre un cafe avec ma mere jeudi.

[Regarde le public]

Si quelqu'un a un chien qui cherche un emploi, je suis preneur. Parce que la, je suis en train de perdre le controle.`,
  },
  {
    id: 'standup_004',
    title: 'L\'Expert en Rien',
    tone: 'cringe',
    difficulty: 'moyen',
    duration: '1-2 min',
    stageDirections: 'Tu es un expert auto-proclame qui donne des conseils completement nuls avec une confiance absolue. Ton tres assertif.',
    script: `Salut a tous. Je m'appelle — peu importe mon nom — et je suis expert.

Expert en quoi ? En rien. Et c'est ca ma force.

[Pointe du doigt le public]

Toi. Oui toi. Tu veux reussir dans la vie ? Premier conseil : ne te brosse JAMAIS les dents le mardi. Pourquoi ? Parce que le mardi, tes dents ont besoin de repos. C'est scientifique. C'est moi qui l'ai dit donc c'est scientifique.

Deuxieme conseil : pour etre plus productif au travail, arrives toujours en retard de 45 minutes. Exactement 45. Pas 40, pas 50. 45. Parce que quand tu arrives en retard, les gens sont deja fatigues de t'attendre et ils te laissent tranquille.

[Se penche vers le public, ton confidentiel]

Troisieme conseil, et celui-la c'est le plus important. Si tu veux seduire quelqu'un, regarde-le dans les yeux, et dis-lui...

[Regarde quelqu'un dans la salle avec une intensite absolue]

"Tes coudes sont magnifiques."

Ca marche a CHAQUE fois. Bon, ca marche pas pour un rencard. Mais ca marche pour destabiliser quelqu'un. Et destabiliser quelqu'un, c'est le premier pas vers l'amour.

Merci. Je suis disponible pour des consultations. 50 euros les 10 minutes.`,
  },
  {
    id: 'standup_005',
    title: 'Le Serment du Canape',
    tone: 'wholesome',
    difficulty: 'facile',
    duration: '1-2 min',
    stageDirections: 'Ton emu et solennel, comme un discours de mariage. Tu t\'adresses au canape (designe un meuble ou un coin de la piece).',
    script: `Je voudrais prendre un moment pour remercier quelqu'un. Quelqu'un qui est toujours la pour moi. Quelqu'un qui ne m'a jamais juge. Quelqu'un qui m'accueille a bras ouverts, quoi qu'il arrive.

[Se tourne vers un canape/chaise]

Mon canape.

[Voix tremblante d'emotion]

Mon cher canape, ca fait maintenant 4 ans qu'on est ensemble. Et je veux que tu saches que... tu es la meilleure chose qui me soit arrivee.

Quand j'ai rate mon examen, tu etais la. Quand j'ai ete largue, tu etais la. Quand j'ai mange une pizza entiere a 2h du matin en regardant des videos de chats, TU ETAIS LA.

[S'agenouille devant le canape/chaise]

Je sais qu'on a traverse des moments difficiles. La tache de ketchup de 2023. Le cousin qui a dormi dessus avec ses chaussures. Mais on a survécu.

Et ce soir, devant tous ces temoins, je veux te dire...

[Sort un objet au hasard de sa poche comme si c'etait une bague]

Veux-tu etre mon canape pour toujours ?

[Pause, fait semblant d'ecouter une reponse]

Il a dit oui. IL A DIT OUI !`,
  },
  {
    id: 'standup_006',
    title: 'Le Commentateur Sportif de la Vie',
    tone: 'absurde',
    difficulty: 'moyen',
    duration: '2-3 min',
    stageDirections: 'Commente les gens dans la piece comme un commentateur sportif surexcite. Alterne entre chuchotement et cri.',
    script: `[Voix de commentateur, chuchote d'abord]

Mesdames et messieurs, bienvenue sur cette retransmission en direct. Ici votre commentateur pour cette soiree exceptionnelle.

[Designe quelqu'un dans la piece]

Et on observe le joueur numero un qui... oui... il respire ! Magnifique inspiration, il enchaine avec une expiration ! Quelle maitrise ! Le public est en delire !

[S'excite]

OH ! OH ! Attention ! On a un mouvement a droite ! Le joueur numero deux vient de CROISER LES BRAS. C'est une posture defensive, Jean-Michel, qu'est-ce que vous en pensez ?

[Change de voix pour "Jean-Michel"]

Oui effectivement Patrick, c'est une technique qu'on voit beaucoup chez les joueurs de haut niveau. Le croisement de bras en milieu de soiree, c'est un classique.

[Reprend la voix du commentateur]

Et la ! REGARDEZ ! Quelqu'un vient de consulter son telephone ! C'est EXTRAORDINAIRE ! Le geste est fluide, le pouce glisse sur l'ecran avec une precision chirurgicale !

[Chuchote]

Je crois qu'il regarde ses messages. Oui. C'est confirme. Il regarde ses messages. Pas de reponse. Retour du telephone dans la poche. La deception se lit sur son visage. Un moment poignant.

Et c'etait votre commentateur Patrick Durand, bonsoir !`,
  },
  {
    id: 'standup_007',
    title: 'La Lettre de Motivation',
    tone: 'genant',
    difficulty: 'moyen',
    duration: '1-2 min',
    stageDirections: 'Lis cette lettre comme si tu passais un entretien d\'embauche. Hyper serieux et desespere a la fois.',
    script: `Madame, Monsieur,

Par la presente, je me permets de soumettre ma candidature pour le poste de... personne normale.

[Pause, regarde le public]

En effet, depuis maintenant 28 ans — enfin, peu importe mon age — j'essaie d'etre une personne normale. Et je crois qu'il est temps de formaliser la chose.

Mes competences incluent : sourire quand on me dit bonjour, manger avec une fourchette la plupart du temps, et dire "ca va et toi ?" sans vraiment vouloir savoir la reponse.

Mes points faibles : je dis "bonne journee" a la caissiere et ensuite je la croise dans un autre rayon et je sais pas si je dois re-dire bonjour ou faire semblant de pas la voir. J'ai essaye les deux. Les deux sont horribles.

[Prend un air desespere]

Egalement : je ne sais toujours pas quoi faire de mes bras quand je marche. J'ai essaye de les balancer. J'ai essaye de les garder le long du corps. J'ai essaye de les mettre dans mes poches. Rien ne marche. Je ressemble toujours a un robot en panne.

[Se leve, montre comment il marche bizarrement]

Mais je suis motive. Tres motive. Disponible immediatement. Salaire : un sourire et un peu de validation sociale.

Veuillez agreer, Madame, Monsieur, l'expression de mon malaise general.`,
  },
  {
    id: 'standup_008',
    title: 'Le Coach de Vie a 2 Euros',
    tone: 'cringe',
    difficulty: 'moyen',
    duration: '2-3 min',
    stageDirections: 'Tu es un coach de developpement personnel completement a cote de la plaque. Energie de vendeur de marche.',
    script: `BONJOUR ! Est-ce que vous etes PRETS a changer votre VIE ?!

[Tape dans ses mains]

Moi c'est Kévin — enfin appelez-moi Coach K — et aujourd'hui je vais vous donner les 5 regles d'or pour reussir. Dans tout. Dans la vie. Dans l'amour. Dans le rangement de votre frigo. DANS TOUT.

Regle numero 1 : Reveillez-vous a 4h du matin. Pourquoi 4h ? Parce que les gens qui reussissent se levent tot. Qu'est-ce que vous faites a 4h du matin ? RIEN. Et c'est ca le secret. Vous faites rien mais vous le faites PLUS TOT que les autres.

[Fait des pompes approximatives]

Regle numero 2 : Faites 100 pompes par jour. Moi j'en fais 3 mais dans ma tete j'en fais 100 et c'est CA la vraie force.

Regle numero 3 : Parlez a votre reflet dans le miroir. Tous les matins. Dites-lui "Tu es un lion." Meme si vous ressemblez plus a un hamster fatigue. La perception c'est la realite, et la realite c'est la perception, et... enfin bref. Vous etes un lion.

[Rugit de facon pas du tout convaincante]

Regle numero 4 : Mangez du quinoa. Je sais pas pourquoi. Tous les coachs disent ca. J'en ai jamais mange. Mais je le recommande.

Et regle numero 5 — et celle-la c'est la plus importante...

[S'approche du public, voix basse]

Achetez ma formation en ligne. 497 euros. 12 modules. Le module 1 c'est "Comment se lever." Le module 2 c'est "Comment se recoucher correctement." Les 10 autres c'est la meme video en boucle.

MERCI ! Vous etes des CHAMPIONS ! Des GUERRIERS ! Des... des gens assis dans une piece !`,
  },
  {
    id: 'standup_009',
    title: 'Le Temoignage Bouleversant',
    tone: 'dark',
    difficulty: 'hard',
    duration: '1-2 min',
    stageDirections: 'Ton tres emu, voix tremblante. Tu racontes un drame qui se revele etre completement anodin.',
    pro: true,
    script: `[Voix tremblante, regard au sol]

C'est... c'est pas facile d'en parler. Mais je crois que c'est important. Parce que si mon histoire peut aider ne serait-ce qu'une personne...

[Pause longue, inspire profondement]

C'etait un mardi. Il pleuvait. J'etais seul chez moi. Et la... ca m'est tombe dessus.

[Voix qui craque]

J'ai ouvert le frigo... et le yaourt... le yaourt a la fraise... celui que j'avais garde pour le dessert...

[S'effondre presque]

Il etait perime. Depuis TROIS JOURS.

[Se reprend courageusement]

J'ai du manger un yaourt nature. Nature. Vous imaginez ? Sans sucre. Sans fruit. Juste... du lait qui a mal tourne de facon socialement acceptable.

Ce soir-la, j'ai appele ma mere. Elle m'a dit "achete des yaourts en avance." Elle comprend pas. PERSONNE comprend pas.

[Regarde le public avec une intensite folle]

Mais je me suis releve. Parce que c'est ca, la vie. C'est tomber, et se relever, et retourner au Carrefour acheter des yaourts avec une date de peremption plus longue.

Merci. Merci pour votre ecoute. Soyez forts.`,
  },
  {
    id: 'standup_010',
    title: 'Le Meteorologue Passionnel',
    tone: 'absurde',
    difficulty: 'facile',
    duration: '1-2 min',
    stageDirections: 'Presente la meteo comme un bulletin dramatique. Gestes amples, voix de presentateur TV.',
    script: `Bonsoir et bienvenue dans votre bulletin meteo SPECIAL. Accrochez-vous, ca va secouer.

[Geste vers une carte imaginaire]

Alors, en ce moment au-dessus de cette piece, nous avons un anticyclone de gros malaise avec des pointes de gene atteignant les 120 km/h. Les temperatures de la honte sont en hausse.

[Pointe differents endroits]

Par ici, attention, zone de turbulences emotionnelles. Je deconseille le contact visuel jusqu'a demain matin.

La-bas, un front froid d'indifference se deplace vers l'est. Si quelqu'un vous dit "c'est pas grave", c'est GRAVE. Tres grave.

[Ton alarmiste]

ALERTE ORANGE ! Je repete, ALERTE ORANGE ! Un nuage de second degre va traverser la piece dans les prochaines minutes. Certains ne comprendront pas les blagues. C'est normal. Ne paniquez pas.

Pour demain, on prevoit un grand soleil de regrets a propos de tout ce qui va se passer ce soir, avec des eclaircies de "c'etait quand meme marrant."

[Clin d'oeil]

Temperature ressentie : bizarre. Indice UV de malaise : 11 sur 10.

C'etait votre bulletin. Bonne soiree et surtout... couvrez-vous.`,
  },
  {
    id: 'standup_011',
    title: 'Le Rapport Annuel de Ma Vie',
    tone: 'wholesome',
    difficulty: 'moyen',
    duration: '2-3 min',
    stageDirections: 'Presente comme un PDG devant ses actionnaires. Slides imaginaires, laser pointer imaginaire.',
    pro: true,
    script: `Mesdames, messieurs les actionnaires, merci d'etre la pour le rapport annuel de ma vie.

[Clique sur une telecommande imaginaire]

Slide suivante s'il vous plait. Merci. Alors. Les chiffres.

Cette annee, j'ai mange environ 1095 repas. Sur ces 1095 repas, 847 etaient des pates. La diversification alimentaire reste un objectif pour l'annee prochaine. On y travaille.

[Clique]

Cote sommeil : 2920 heures de sommeil, dont 400 heures de grasse matinee non autorisees. Le departement culpabilite a emis un rapport a ce sujet.

[Clique]

Vie sociale. J'ai dit "faut qu'on se voit" a 47 personnes differentes. Resultat concret : j'en ai vu 3. Le taux de conversion est de 6.3%. C'est en baisse par rapport a l'annee derniere mais on reste optimistes.

[Clique]

Projets personnels lances : 12. Projets personnels termines : 0.5. Le 0.5 c'est un puzzle que j'ai commence en janvier. Il me manque un bord. Je soupconne le chat.

[Ton solennel]

En conclusion, mesdames et messieurs, malgre des resultats mitigés, le conseil d'administration de ma conscience a decide de me reconduire pour un an supplementaire.

Les dividendes seront verses sous forme de siestes et de plaisirs coupables sur Netflix.

La seance est levee. Merci.`,
  },
  {
    id: 'standup_012',
    title: 'Le GPS Emotionnel',
    tone: 'genant',
    difficulty: 'hard',
    duration: '1-2 min',
    stageDirections: 'Tu ES un GPS. Voix robotique qui deraille et devient emotionnelle. Donne des directions a quelqu\'un dans la piece.',
    pro: true,
    script: `[Voix robotique]

Bienvenue. Calcul de l'itineraire en cours.

[Designe quelqu'un]

Toi. Oui, toi. Dans 3 metres, tourne a droite.

[La personne ne bouge probablement pas]

DANS 3 METRES, TOURNE A DROITE. Tu m'ecoutes ou pas ?

[Soupir robotique]

Recalcul... Recalcul de l'itineraire.

OK. Nouveau trajet. Dans 200 metres, prends la sortie "amour-propre." Tu l'as ratee ? C'est pas grave. On va trouver un autre chemin. C'est ce qu'on fait toujours.

[Voix qui devient emotionnelle]

Ecoute. Ca fait 3 ans que je te guide. 3 ANS. Et tu prends JAMAIS la bonne sortie. Tu sais ce que ca me fait, a moi, le GPS ? Tu crois que j'ai pas de sentiments ?

Chaque fois que tu fais demi-tour, c'est un petit bout de moi qui meurt. Chaque fois que tu dis "je connais le chemin" et que tu te perds, je pleure a l'interieur. EN SILENCE.

[Se reprend, voix robotique]

Recalcul. Vous etes arrive a destination. Votre destination est : la remise en question.

Bonne route. Et mets ton clignotant, je t'en supplie.`,
  },
];

export function getRandomStandups(count: number, excludeIds: string[] = [], proOnly?: boolean): StandupScript[] {
  let pool = STANDUP_SCRIPTS.filter(s => !excludeIds.includes(s.id));
  if (proOnly === false) pool = pool.filter(s => !s.pro);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
