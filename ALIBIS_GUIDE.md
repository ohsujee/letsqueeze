# Guide de Création d'Alibis

## 📋 Format JSON

```json
{
  "id": "nom-de-fichier-sans-extension",
  "title": "Titre Court de l'Alibi",
  "context": "1-2 phrases décrivant le crime, le timing et la suspicion (max 30 mots).",
  "accused_document": "<p>Document de 220-300 mots avec des <strong>éléments en gras</strong> intégrés dans le texte...</p>",
  "inspector_summary": "Rappel d'une ligne résumant l'alibi pour les inspecteurs.",
  "inspector_questions": [
    "Vous avez dit que... — question précise 1 ?",
    "Vous avez dit que... — question précise 2 ?",
    "... (10 questions au total)"
  ],
  "reading_time_seconds": 90
}
```

## ✅ Règles STRICTES

### 1. Structure Obligatoire

**Contexte (1-2 phrases, ~30 mots max)**
- Factuel, court, style "briefing d'enquête"
- Dire : crime + timing + suspicion
- Exemple : *"Un braquage a eu lieu dans une banque entre 18h et 19h30. Des témoins vous ont vu dans le quartier. Vous affirmez avoir été ailleurs."*

**Document Accusés (220-300 mots)**
- Lisible en ~90 secondes
- Dense mais pas trop complexe
- 6-12 éléments en **gras** (`<strong>`) intégrés dans le texte HTML
- Inclure détails : visuels, auditifs, temporels, matériels
- ❌ PAS de valeurs exactes (heures ultra-précises, montants, plaques)
- ❌ PAS de noms propres déterminants
- Laisser des trous pour improvisation

**Inspector Summary (1 ligne)**
- Résumé très court de l'alibi
- Exemple : *"Les accusés prétendent avoir assisté à un cours de cuisine pendant le crime."*

**Questions (exactement 10)**
- TOUTES commencent par : **"Vous avez dit que..."**
- Doivent forcer à inventer des détails précis
- ❌ PAS de questions trop vagues
- ✅ Viser le factuel précis

### 2. Types d'Indices Utiles

- **Temporel vague** : "vers la mi-journée", "à la fin d'une chanson"
- **Objets** : petits objets, couleurs, matériaux
- **Détails visuels** : couleur veste, présence animal, état d'un mur
- **Sons/odeurs** : radio, cuisson, odeur café
- **Actions** : "a demandé d'aller chercher", "a pris une photo"

### 3. Exemples de Bonnes Questions

✅ **Correct** :
- "Vous avez dit que vous êtes entrés par une porte côté cour — quelle inscription ou panneau y figurait ?"
- "Vous avez dit avoir pris une photo — à quelle heure figure sur l'image ?"
- "Vous avez dit qu'un objet était rouge — de quel type d'objet s'agissait-il ?"

❌ **Incorrect** :
- "Pourquoi êtes-vous allé là ?" *(trop vague)*
- "À quelle heure précise êtes-vous arrivé ?" *(si l'heure est dans le texte)*

### 4. Interdits / Pièges à Éviter

- ❌ Pas de valeurs exactes dans le texte (heures précises, montants, plaques complètes)
- ❌ Pas de bloc récapitulatif d'éléments en gras séparé
- ❌ Pas d'indices inutiles qui n'alimentent pas les questions
- ❌ Pas de contradictions internes
- ❌ Pas de réponses exactes fournies dans le texte

## 📝 Checklist Rapide

Avant de valider un nouvel alibi :

- [ ] Contexte = 1-2 phrases, clair (~30 mots)
- [ ] Accusés = 220-300 mots, dense, lisible en 90s
- [ ] 6-12 éléments en gras (`<strong>`) intégrés dans le texte HTML
- [ ] Aucune réponse exacte fournie dans le texte
- [ ] Inspecteurs = rappel 1 ligne + 10 questions
- [ ] Toutes les questions commencent par "Vous avez dit que..."
- [ ] Pas de noms propres déterminants ni d'adresses complètes
- [ ] Aucune question ne peut être répondue directement par le texte

## 🎮 Intégration UX

L'app gère automatiquement :
- Affichage du texte accusés avec éléments en gras (90s)
- Après préparation : cache le texte, affiche questions 1 par 1
- Inspecteurs voient : rappel + 10 questions
- Pas de bloc "éléments" récapitulatif (respecte les règles)

## 📁 Fichiers Exemples

Voir les fichiers dans `/public/data/alibis/` :
- `cours-cuisine-risotto.json` - Cours de cuisine
- `seance-yoga-groupe.json` - Séance de yoga
- `atelier-poterie.json` - Atelier de poterie

## 🆕 Ajouter un Nouvel Alibi

1. Créer le fichier JSON dans `/public/data/alibis/nom-alibi.json`
2. Respecter le format et toutes les règles ci-dessus
3. Ajouter l'entrée dans `/public/data/alibis/manifest.json` :
   ```json
   { "id": "nom-alibi", "title": "Titre de l'Alibi" }
   ```
4. Tester en créant une room Alibi dans l'app

## 🔄 Compatibilité

L'app supporte deux formats :
- **Nouveau format** (décrit ci-dessus) - Recommandé
- **Ancien format** (avec `scenario`, `keyElements`, `predefinedQuestions`) - Déprécié mais toujours fonctionnel

Les anciens alibis (`bibliotheque.json`, `restaurant-italien.json`, `studio-photo.json`) utilisent l'ancien format et restent compatibles.
