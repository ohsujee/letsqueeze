# Mind Link - Concept du Jeu

> Inspiré du jeu "Contact" populaire sur TikTok, adapté pour Gigglz.

---

## Pitch

Un défenseur protège un mot secret. Les autres joueurs doivent le deviner en créant des **"links"** : trouver des mots en commun grâce à un seul indice, à la manière d'un réseau neuronal humain.

---

## Rôles

### Défenseur(s)
- **1 ou plusieurs** (configurable au lobby)
- Choisit un mot secret (saisie libre OU mot aléatoire)
- Révèle : première lettre + nombre de lettres (ex: `P _ _ _ _`)
- Peut **intercepter** les links des joueurs
- Gagne en tenant jusqu'à la fin du timer

### Joueurs (Attaquants)
- Tous les autres joueurs
- Doivent deviner le mot du défenseur
- Créent des **links** entre eux via des indices
- Les mots devinés doivent commencer par les lettres déjà révélées
- Gagnent en trouvant le mot secret

---

## Mécanique Principale : Le Link

### Flow d'un Link

1. **Joueur A** appuie sur un bouton → "J'ai un indice !"
2. **2 secondes** pour donner son indice (un seul mot)
3. **10 secondes** de fenêtre : n'importe quel joueur peut décider de **link** avec Joueur A
4. Si plusieurs joueurs veulent link → **Joueur A choisit** avec qui
5. **Countdown 3, 2, 1** → les deux révèlent leur mot simultanément
6. **Si match** → le défenseur doit révéler la prochaine lettre (avec possibilité de contester)
7. **Si pas match** → link échoué, on continue

### Interception du Défenseur

Pendant la même fenêtre de **10 secondes** (étape 3-4) :
- Le défenseur voit l'indice et peut appuyer sur **"J'ai trouvé !"**
- Il tape le mot qu'il pense que Joueur A voulait faire deviner
- **Joueur A confirme** si c'est le bon mot ou non
- Si correct → link annulé, le mot ne peut plus être utilisé
- Si incorrect → le link continue normalement

### Après un Link Réussi

Le défenseur reçoit une modale avec deux options :
- **"Révéler la prochaine lettre"** → flow normal
- **"Ne pas révéler"** → en cas d'erreur/contestation
- Un bouton de secours "Révéler quand même" reste disponible si invalidation par erreur

---

## Contrainte sur les Mots

Les mots devinés entre joueurs doivent **toujours commencer par les lettres déjà débloquées** du mot défendu.

**Exemple :**
- Mot défendu : `P _ _ _ _` → les joueurs doivent deviner des mots commençant par **P**
- Après révélation : `P A _ _ _` → les mots doivent commencer par **PA**
- Après : `P A R _ _` → les mots doivent commencer par **PAR**

L'indice, lui, peut être n'importe quel mot.

---

## Modes de Jeu

### Mode Oral (présentiel)
- Les joueurs disent leur mot à voix haute après le countdown
- Le défenseur valide ou non (bouton oui/non)
- Plus dynamique, idéal en soirée

### Mode Écrit (à distance)
- Les joueurs tapent leur mot sur leur écran
- Révélation simultanée après le countdown
- Correspondance automatique des textes
- Le défenseur peut quand même contester

Le mode est choisi à la création du lobby.

---

## Win Conditions

### Les Joueurs Gagnent si :
1. **Proposition directe** : un joueur appuie sur "J'ai trouvé le mot !" et propose le mot exact
   - Si mauvaise réponse → **pénalité de 30 secondes** retirée du timer
2. **Toutes les lettres débloquées** (rare mais possible)
3. **Le mot sort pendant un link** → le défenseur appuie sur "Ils ont trouvé mon mot !"

### Le Défenseur Gagne si :
- Le **timer arrive à zéro** sans que les joueurs aient trouvé le mot

### Résultat
- **Win / Lose** (pas de scoring individuel, comme La Règle)
- Équipe joueurs vs équipe défenseur(s)

---

## Configuration (Lobby)

| Paramètre | Options | Défaut |
|-----------|---------|--------|
| Mode | Oral / Écrit | Oral |
| Nombre de défenseurs | 1 à N-1 | 1 |
| Timer (minutes) | 3, 5, 7, 10, 15, 20 | 5 |
| Mot du défenseur | Libre / Aléatoire | Libre |

### Sélection des Défenseurs
- Le host sélectionne les défenseurs dans le lobby (comme les enquêteurs dans La Règle)
- Si plusieurs défenseurs : un seul est désigné aléatoirement pour choisir le mot (les autres regardent son écran)
- Tous les défenseurs peuvent intercepter les links indépendamment

---

## Vision UI : Le Réseau Neuronal

### Concept Visuel
Les joueurs apparaissent comme des **neurones** disposés en cercle, reliés par des connexions lumineuses. Quand un link se forme, l'énergie pulse entre les deux nodes connectés.

### Éléments Visuels
- **Nodes** : cercles avec avatar/initiales, pulsent doucement au repos
- **Connexions** : lignes lumineuses entre tous les joueurs (dormantes par défaut)
- **Link actif** : la connexion entre les deux joueurs s'illumine, énergie qui voyage
- **Indice** : affiché au centre du réseau, visible par tous
- **Mot défendu** : affiché en haut, lettres révélées + underscores
- **Timer** : barre ou cercle progressif

### Animations Clés
- Joueur lance un indice → son node pulse fort, onde qui se propage
- Joueur veut link → connexion s'allume entre les deux nodes
- Link réussi → explosion de particules le long de la connexion
- Défenseur intercepte → éclat rouge qui coupe la connexion
- Lettre révélée → animation satisfaisante sur le mot défendu

---

## Flow Complet d'une Partie

```
LOBBY
  → Host sélectionne les défenseurs
  → Configure : mode, timer, nb défenseurs
  → Tout le monde prêt → Start

CHOIX DU MOT
  → Défenseur(s) voient l'écran de saisie
  → Saisie libre OU bouton "Mot aléatoire"
  → Valide → Première lettre + underscores révélés à tous
  → Joueurs voient le réseau neuronal se former

JEU (boucle principale)
  → Joueur A : "J'ai un indice !" (bouton)
  → 2s pour taper/dire l'indice
  → Indice affiché au centre du réseau
  → 8s : joueurs peuvent link / défenseur peut intercepter
  → Si interception : Joueur A confirme → link annulé ou non
  → Si link accepté : countdown 3-2-1 → révélation
  → Si match : défenseur révèle prochaine lettre (ou conteste)
  → Si pas match : rien, on continue
  → À tout moment : joueur peut proposer le mot directement (-30s si raté)
  → Boucle jusqu'à win ou timeout

FIN
  → Écran résultat : qui a gagné (joueurs ou défenseur)
  → Le mot est révélé
  → Retour au lobby (changement de rôles possible)
```

---

## Limites Techniques

- **Max 20 joueurs** (config existante)
- **Min 2 joueurs** (1 défenseur + 1 joueur minimum)
- Timer max : 20 minutes
- Un seul link à la fois (pas de links simultanés)

---

*Dernière mise à jour : 2026-03-13*
