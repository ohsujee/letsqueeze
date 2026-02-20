FAQ
Puis-je avoir une page spéciale pour moi le jour J ?

C’est une question fréquente et je dois donner la même réponse à tout le monde : désolé, ça ne pourra pas se faire. Techniquement, ce n’est pas aussi facile que ça en a l’air, et le fait que cette requête survienne assez souvent en ferait une corvée supplémentaire.

Le site met quelquefois du temps à répondre, pourquoi ?

Cela devrait s’être amélioré grâce à un fournisseur plus stable et des optimisations du site, mais il reste quelques facteurs à considérer :

L’algorithme est consommateur de CPU, il n'y a pas de magie : il faut faire ces calculs de proximité syntaxique et sur une page wikipédia avec de nombreux mots, ça peut prendre un certain temps, surtout en début de journée.
Évitez le rush de midi sur pédantix : dans les premières minutes, il y a beaucoup de joueurs et une réponse peut prendre quelques secondes.
Certaines personnes peu scrupuleuses prennent un malin plaisir à exercer leur bot sur le site. Ça ne sert que leur ego et ça ralentit tout le monde.
Comment marche l’algorithme derrière cémantix ?

Imaginez que l’on vous envoie sur une île déserte avec un livre pour toute distraction, et que ce livre est écrit dans une langue que vous ne connaissez pas. Disons l’Hawaïen (si vous connaissez cette langue, choisissez-en une autre). A votre retour, on vous demande de résumer l’histoire que vous avez lue. Vous n’en aurez aucune idée : le livre ne contient pas d’image et rien ne peut vous faire comprendre le sens des mots, il n’y a pas de pierre de Rosette sur l’ile. Tout ce que vous pourrez dire est que le livre contient des mots : des ensembles de lettres séparés par des espaces.
Pourtant, vous serez surpris de réaliser que vous pouvez répondre à quelques questions concernant la langue. Par exemple, si on vous demande quel mot irait bien avec kumulāʻau, vous direz hua. Si on vous demande par quoi on pourrait remplacer manu dans une phrase, vous pourriez dire holoholona. Ainsi, sans même connaître le sens de ces mots, vous pouvez les associer, et votre interlocuteur a de bonnes chances d’être satisfait de vos réponses. Vous avez simplement observé la fréquence de certaines séquences de mots ainsi que la position de ces mots dans ces séquences et pouvez donc en déduire des associations avec un certain degré de confiance.
Ce que l’algorithme fait derrière cémantix est exactement ça : il ne connaît pas le français, il n’a pas de dictionnaire ni de livre de grammaire lui permettant de comprendre un texte, une phrase ou même un mot. Il ne sait pas ce qu’est un nom, un verbe ou un adjectif (ou un adverbe), ni ce qu’est un synonyme ou un antonyme, une racine grecque ou latine. Tout ce qu’on lui fournit est un corpus de textes assez grand pour que statistiquement, les associations de mots qu’il forme aient une bonne chance d’être correctes. Statistiquement, il est toujours possible qu’il donne des résultats qui semblent illogiques pour un humain. Ce qui est logique, c’est qu’il a tiré son information de textes existants, et il y a toujours une raison pour laquelle l’association a été faite, même si elle ne semble pas évidente au premier coup d’oeil.

Comment se font les associations ?


Voici un exemple en deux phrases :

Alice va promener son petit chien.
Bob va nourrir son gros chien.
Si ces phrases se répètent un certain nombre de fois dans un texte, on peut naturellement conclure que “petit et chien”, “gros et chien” sont associés car physiquement proches dans la phrase, mais aussi “petit et gros” car bien qu’ils ne soient pas proches physiquement (ils n’apparaissent pas dans la même phrase), ils sont interchangeables grâce à la proximité du mot chien, ce qui doit les associer bien qu’ils veuillent dire le contraire. Par contre, on ne verra jamais la phrase “Charlotte lance la balle à son chien canin”, ce qui fait que chien et canin ne sont pas proches, tout du moins rarement physiquement. Seule une interchangeabilité pourrait le faire (par exemple, David lance la balle à son compagnon canin). Selon le même principe, “promener et nourrir” doivent être associés, ce qui peut paraître surprenant, de même qu’“Alice et Bob”, mais après tout, peut-être le sont-ils 😊. Il faut se rappeler que tout est une question de statistiques, la fréquence de ces associations dans le texte leur donne un ordre de préférence.

Comment sont calculées les températures ?

C’est en 2013 qu’une équipe d’ingénieurs de chez Google a eu l’idée de représenter les mots d’un texte dans un espace multi-dimensionnel (on parle ici de centaines de dimensions) en suivant les règles d’association décrites plus haut et en considérant leur position relative par rapport aux autres mots. Chaque mot se voit attribuer un vecteur dans chaque dimension de cet espace, ce qui constitue ainsi un système de coordonnées. Ce modèle est connu sous le nom de word2vec. Une fois que cela est fait, il est facile de calculer la “distance” entre deux mots, quels qu’ils soient. Cette distance est la température affichée dans cémantix.

Comment s’opère le choix des mots ?

La liste des mots proches du mot secret est entièrement déterminée par l’algorithme, sans aucune intervention humaine. En revanche, le choix du modèle de word2vec a une influence car plusieurs paramètres entrent en jeu : le choix du corpus (la base de textes), l’algorithme d’association des mots, le nombre de dimensions, la taille du voisinage d’un mot dans un texte, la lemmatisation du texte (le procédé visant à ramener les variations d’un mot : féminin, pluriel, ou conjugaisons d’un verbe, à son dénominateur commun comme le ferait un dictionnaire). Des modèles différents peuvent donner des résultats étonnamment différents, même s’ils utilisent le même corpus. D’expérience, il n’y a pas de modèle “parfait”, et les résultats peuvent toujours réserver quelques surprises aux joueurs.
Le choix du mot secret est aléatoire, à une exception près. Les mots secrets sont tous des mots relativement courants de la langue française, tout le monde devrait les connaître. Si un mot se rapporte à l’actualité, s’il est similaire à un autre mot du jour, s’il peut paraître offensif ou orienté, s’il semble trop facile ou trop difficile à trouver, c’est une coïncidence.

