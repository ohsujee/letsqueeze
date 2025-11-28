# Guide de Création de Quiz - Let's Queeeze

> Ce guide s'inspire des meilleures pratiques des émissions TV comme **Jeopardy!**, **Who Wants to Be a Millionaire** et des pubs quiz professionnels.

---

## Table des matières

1. [Format Technique](#1-format-technique)
2. [La Règle d'Or des Bonnes Questions](#2-la-règle-dor-des-bonnes-questions)
3. [Équilibrer la Difficulté](#3-équilibrer-la-difficulté)
4. [Structure d'un Quiz Engageant](#4-structure-dun-quiz-engageant)
5. [Catégories Populaires](#5-catégories-populaires)
6. [Rédiger des Questions Captivantes](#6-rédiger-des-questions-captivantes)
7. [Exemples par Type](#7-exemples-par-type)
8. [Erreurs à Éviter](#8-erreurs-à-éviter)
9. [Checklist Finale](#9-checklist-finale)

---

## 1. Format Technique

### Structure du fichier JSON

```json
{
  "id": "nom-du-quiz",
  "title": "Titre Affiché",
  "lang": "fr",
  "items": [
    {
      "id": "q001",
      "question": "La question ici ?",
      "answer": "La réponse",
      "difficulty": "normal",
      "category": "Catégorie"
    }
  ]
}
```

### Champs obligatoires

| Champ | Description | Exemple |
|-------|-------------|---------|
| `id` | Identifiant unique du quiz (kebab-case) | `"friends-saison-1"` |
| `title` | Titre affiché dans l'app | `"Friends - Saison 1"` |
| `items` | Tableau des questions | `[...]` |

### Champs par question

| Champ | Description | Valeurs |
|-------|-------------|---------|
| `id` | ID unique de la question | `"q001"`, `"q002"`, etc. |
| `question` | Le texte de la question | String |
| `answer` | La réponse attendue | String |
| `difficulty` | Niveau de difficulté | `"normal"` ou `"difficile"` |
| `category` | Catégorie/thème | String libre |

### Enregistrer dans le manifest

Ajoute ton quiz dans `public/data/manifest.json` :

```json
{
  "id": "mon-quiz",
  "title": "Mon Super Quiz",
  "emoji": "🎯",
  "difficulty": "Moyen",
  "questionCount": 25,
  "category": "Général",
  "description": "Description courte et accrocheuse"
}
```

---

## 2. La Règle d'Or des Bonnes Questions

> *"Une bonne question provoque l'une de ces trois réactions : 'Je le savais !', 'Zut, j'aurais dû le savoir !', ou 'Je ne savais pas, mais maintenant je suis content de l'apprendre !'"*
> — Billy Wisse, Head Writer de Jeopardy!

### Les 3 Critères Essentiels

1. **EXACTITUDE** - Vérifie toujours tes réponses avec au moins 2 sources fiables
2. **CLARTÉ** - La question doit être comprise du premier coup
3. **JOUABILITÉ** - Même difficile, la réponse doit être "devinable"

### La Question Parfaite

```
✅ BONNE QUESTION :
"Dans quel film de 1994, Tom Hanks dit-il 'La vie c'est comme une boîte de chocolats' ?"
→ Réponse : Forrest Gump
→ Même sans connaître, on peut deviner (année + acteur = indices)

❌ MAUVAISE QUESTION :
"Quel est le 47ème mot prononcé dans Forrest Gump ?"
→ Impossible à deviner, frustrant, pas fun
```

---

## 3. Équilibrer la Difficulté

### La Distribution Idéale (pour 20-30 questions)

| Niveau | Proportion | Rôle |
|--------|------------|------|
| **Facile** | 20-25% | Mettre en confiance, tout le monde peut marquer |
| **Normal** | 50-60% | Cœur du quiz, challengeant mais accessible |
| **Difficile** | 20-25% | Départager les experts, moments "wow" |

### Exemple pour un quiz de 25 questions

- 5 questions **faciles** (début + réparties)
- 15 questions **normales** (le corps principal)
- 5 questions **difficiles** (fin + points clés)

### Progression Recommandée (Style "Millionnaire")

```
Questions 1-3   → Facile (échauffement)
Questions 4-8   → Normal (montée en puissance)
Questions 9-12  → Normal-Difficile (challenge)
Questions 13-15 → Mix (montagnes russes)
Questions 16-20 → Difficile (climax)
```

> **Astuce TV Show** : Comme les montagnes russes, alternez les montées et descentes de difficulté pour maintenir l'engagement !

---

## 4. Structure d'un Quiz Engageant

### Format Recommandé : 20-30 questions

| Ordre | Questions | Objectif |
|-------|-----------|----------|
| **Ouverture** | 1-3 | Facile + fun, mettre à l'aise |
| **Développement** | 4-15 | Varier catégories et difficultés |
| **Climax** | 16-20+ | Monter l'intensité, questions mémorables |

### Varier les Types de Questions

1. **Questions directes** : "Quelle est la capitale de..."
2. **Questions à indices** : "Ce réalisateur français, connu pour Amélie Poulain, a aussi fait..."
3. **Questions contextuelles** : "Dans les années 90, quel groupe a sorti..."
4. **Questions "complète la phrase"** : "Dans Star Wars, la phrase célèbre est : 'Je suis ton...'"

---

## 5. Catégories Populaires

### Catégories Classiques (toujours efficaces)

| Catégorie | Sous-thèmes | Niveau d'engagement |
|-----------|-------------|---------------------|
| **Cinéma/Séries** | Répliques, acteurs, années | ⭐⭐⭐⭐⭐ |
| **Musique** | Paroles, artistes, clips | ⭐⭐⭐⭐⭐ |
| **Culture Pop** | Célébrités, tendances, mèmes | ⭐⭐⭐⭐⭐ |
| **Sport** | Football, JO, records | ⭐⭐⭐⭐ |
| **Géographie** | Capitales, drapeaux, monuments | ⭐⭐⭐⭐ |
| **Histoire** | Dates, personnages, événements | ⭐⭐⭐ |
| **Sciences** | Vulgarisation, inventions | ⭐⭐⭐ |

### Catégories Fun (pour mixer)

- **Années 90/2000** - Nostalgie garantie
- **Nourriture & Boissons** - Universel
- **Jeux Vidéo Rétro** - Pour les gamers
- **Dessins Animés** - Enfance de tous
- **Réseaux Sociaux** - Actualité
- **Logos & Marques** - Visuel
- **Prénoms de Stars** - Facile et fun

### Idées de Rounds Spéciaux

1. **Round "Connexion"** - 4 questions dont les réponses ont un lien caché
2. **Round "Vrai ou Faux"** - Changement de rythme
3. **Round "Année"** - Toutes les réponses sont des années
4. **Round "Première Lettre"** - Toutes les réponses commencent par la même lettre

---

## 6. Rédiger des Questions Captivantes

### La Longueur Idéale

```
TROP COURT ❌
"Capitale de la France ?"

PARFAIT ✅
"Quelle ville européenne, traversée par la Seine, est la capitale de la France ?"

TROP LONG ❌
"Quelle est cette ville située dans le nord de la France, traversée par
un fleuve qui se jette dans la Manche, connue pour sa tour métallique
construite en 1889, et qui est également la capitale du pays ?"
```

> **Règle** : Vise environ 80-120 caractères par question

### Ajouter du Contexte (comme Jeopardy!)

Au lieu de questions sèches, ajoute des indices et du contexte :

```
BASIQUE :
"Qui a écrit Harry Potter ?"

ENRICHI :
"Cette auteure britannique, d'abord refusée par 12 éditeurs,
a créé le sorcier le plus célèbre du monde. Qui est-elle ?"
```

### Inclure les Deux Versions (VF/VO)

Pour les questions sur les films/séries, inclure les deux :

```json
{
  "question": "Quelle est la réplique culte de Terminator ?",
  "answer": "« I'll be back » (VO) / « Je reviendrai » (VF)"
}
```

---

## 7. Exemples par Type

### Questions Faciles (tout le monde peut répondre)

```json
{
  "question": "De quelle couleur sont les Schtroumpfs ?",
  "answer": "Bleus",
  "difficulty": "normal",
  "category": "Dessins animés"
}
```

```json
{
  "question": "Quel super-héros est surnommé 'l'homme araignée' ?",
  "answer": "Spider-Man",
  "difficulty": "normal",
  "category": "Comics"
}
```

### Questions Normales (réflexion requise)

```json
{
  "question": "Dans quel film de 1997, Leonardo DiCaprio crie-t-il 'Je suis le roi du monde' ?",
  "answer": "Titanic",
  "difficulty": "normal",
  "category": "Cinéma"
}
```

```json
{
  "question": "Quel groupe britannique a sorti l'album 'Thriller' en 1982 ? Attention, piège !",
  "answer": "Aucun - c'est Michael Jackson (artiste solo américain)",
  "difficulty": "normal",
  "category": "Musique"
}
```

### Questions Difficiles (pour les experts)

```json
{
  "question": "Dans 'Retour vers le Futur', à quelle vitesse exacte (en miles/h) la DeLorean doit-elle rouler pour voyager dans le temps ?",
  "answer": "88 miles par heure (88 mph)",
  "difficulty": "difficile",
  "category": "Cinéma Culte"
}
```

```json
{
  "question": "Quel est le vrai prénom de Bono, le chanteur de U2 ?",
  "answer": "Paul (Paul David Hewson)",
  "difficulty": "difficile",
  "category": "Musique"
}
```

### Questions "Culture Générale Fun"

```json
{
  "question": "Quel est le seul aliment qui ne périme jamais ?",
  "answer": "Le miel",
  "difficulty": "normal",
  "category": "Insolite"
}
```

```json
{
  "question": "Quelle est la phobie de quelqu'un qui a peur des clowns ?",
  "answer": "La coulrophobie",
  "difficulty": "difficile",
  "category": "Vocabulaire"
}
```

---

## 8. Erreurs à Éviter

### Les 7 Péchés Capitaux du Quiz

| ❌ À éviter | ✅ À faire |
|------------|-----------|
| Questions trop nichées | Rester dans la culture populaire |
| Réponses impossibles à deviner | Inclure des indices contextuels |
| Que des questions difficiles | Mixer les niveaux |
| Questions ambiguës | Une seule réponse possible |
| Trop de texte | Concis et percutant |
| Sujets controversés | Rester fun et léger |
| Informations non vérifiées | Double-checker les sources |

### Exemples de Questions à Retravailler

```
❌ "Combien de feuilles a le trèfle irlandais sur le logo de l'équipe de rugby ?"
→ Trop spécifique, frustrant

✅ "Le trèfle irlandais a traditionnellement combien de feuilles ?"
→ Plus accessible, même réponse (3)
```

```
❌ "En quelle année est né le chanteur de Coldplay ?"
→ Impossible à deviner

✅ "Chris Martin, le chanteur de Coldplay, est né dans les années : 70, 80 ou 90 ?"
→ Format plus jouable
```

---

## 9. Checklist Finale

Avant de publier ton quiz, vérifie :

### Technique
- [ ] Fichier JSON valide (pas d'erreurs de syntaxe)
- [ ] Tous les champs obligatoires remplis
- [ ] IDs uniques pour chaque question
- [ ] Quiz ajouté au `manifest.json`

### Contenu
- [ ] Au moins 20 questions
- [ ] Mix de difficultés (20% facile, 60% normal, 20% difficile)
- [ ] Catégories variées
- [ ] Réponses vérifiées (2 sources minimum)
- [ ] Questions claires et non ambiguës

### Expérience Joueur
- [ ] Première question facile et engageante
- [ ] Progression de difficulté cohérente
- [ ] Pas de questions frustrantes
- [ ] Dernière question mémorable

### Polish
- [ ] Orthographe vérifiée
- [ ] VF/VO incluses si pertinent
- [ ] Questions testées sur quelqu'un

---

## Ressources & Inspiration

### S'inspirer des Meilleures Émissions

- **Jeopardy!** - Questions à indices, format "réponse-question"
- **Who Wants to Be a Millionaire** - Progression de difficulté
- **Questions pour un Champion** - Culture générale française
- **Le Grand Quiz** - Format accessible et fun

### Où Trouver des Idées

- Wikipedia (vérifier les sources)
- IMDb pour cinéma/séries
- Spotify pour musique (dates, albums)
- Actualités récentes
- Vos propres passions !

---

## Template de Démarrage

Copie ce template pour créer ton quiz :

```json
{
  "id": "mon-nouveau-quiz",
  "title": "Mon Super Quiz",
  "lang": "fr",
  "items": [
    {
      "id": "q001",
      "question": "Question facile pour commencer ?",
      "answer": "Réponse évidente",
      "difficulty": "normal",
      "category": "Intro"
    },
    {
      "id": "q002",
      "question": "Question normale avec un peu de contexte ?",
      "answer": "Réponse",
      "difficulty": "normal",
      "category": "Catégorie"
    },
    {
      "id": "q003",
      "question": "Question plus difficile pour les experts ?",
      "answer": "Réponse détaillée si nécessaire",
      "difficulty": "difficile",
      "category": "Expert"
    }
  ]
}
```

---

## Sources

Ce guide s'appuie sur les meilleures pratiques de :
- [Jeopardy! Writers Room](https://www.jeopardy.com/jbuzz/cast-crew/inside-jeopardy-writers-room)
- [TriviaHub - How to Write Great Trivia](https://triviahublive.io/how-to-write-a-great-trivia-quiz/)
- [QuizRunners - Creating Great Questions](https://quizrunners.com/blogs/how-to-host-a-quiz-night/hosting-a-trivia-night-creating-great-questions-and-categories)
- [Water Cooler Trivia](https://www.watercoolertrivia.com/blog/fun-trivia-categories)
- [TriviaNerd Categories](https://www.trivianerd.com/categories)

---

*Bon quiz ! 🎯*
