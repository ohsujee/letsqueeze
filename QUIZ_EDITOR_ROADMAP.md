# Quiz Editor & Bug Reporting — Roadmap

## Vue d'ensemble

Deux projets liés :
1. **Quiz Editor Redesign** (Punkrecords) — meilleure ergonomie pour réviser les questions
2. **Système de tickets** (LetsQueeze + Punkrecords) — les joueurs remontent les problèmes, on les traite directement dans l'éditeur

---

## Phase 1 — Quiz Editor Redesign (Punkrecords)

### 1.1 Suppression du champ `difficulty`

- Script de migration qui retire `difficulty` de tous les 51 fichiers JSON
- Mettre à jour l'API `/api/quiz/verify` (ne plus envoyer `difficulty` dans le prompt)
- Retirer la colonne et le `<select>` de l'UI

### 1.2 Nouveau layout : Question/Réponse actuelle + Suggestion côte à côte

**Colonnes :** `#` | `Question actuelle` | `Réponse actuelle` | `Question retravaillée` | `Réponse retravaillée` | `Statut` | `Actions`

**Comportement :**
- Avant vérification : colonnes "retravaillées" vides / grisées
- Après vérification : colonnes "retravaillées" peuplées avec les suggestions Claude — **toujours les deux**, même si l'une est identique à l'originale
- Les colonnes "retravaillées" sont des **textareas éditables** (on peut corriger la suggestion avant d'accepter)
- Bouton **Accepter** → remplace l'actuelle par la retravaillée + sauvegarde
- Bouton **Rejeter** → vide la colonne retravaillée, garde l'originale

### 1.3 Diff highlighting

Mettre en surbrillance mot par mot ce qui a changé entre l'originale et la suggestion :
- Mots supprimés → `<del>` rouge
- Mots ajoutés → `<ins>` vert
- Si identique → aucun highlight (indication visuelle "inchangé")

Algorithme : diff mot à mot simple (pas besoin de lib externe, LCS basique suffit).

---

## Phase 2 — Signalement in-game (LetsQueeze)

### 2.1 Bouton "Signaler un problème" dans la Host/Asker View

Petit bouton ⚠️ discret par question dans la vue host (et asker en party mode).

**Modal de signalement :**
```
[ ] La réponse est incorrecte
[ ] La question est mal formulée / confuse
[ ] La réponse apparaît dans la question
[ ] Question trop ambiguë / trop vague
[ ] Autre : [champ libre]

[Annuler]  [Signaler]
```

Multi-select possible. "Autre" ouvre un champ texte libre.

### 2.2 Remplacement automatique de la question signalée

Quand un rapport est soumis :
1. La question courante est marquée comme signalée dans le `state` Firebase
2. La host view passe **automatiquement à la question suivante** sans pénalité
3. Le nombre de questions total reste le même (la question signalée est remplacée)

Concrètement : dans le `state`, on ajoute `reportedQuestionIds: [...]` et le host view skip les questions signalées.

### 2.3 Structure Firebase

```
quiz_reports/{reportId}
  questionId: "nar001"
  themeId:    "animes-naruto"
  themeTitle: "Naruto"
  questionText: "Quel est le..."   ← snapshot de la question au moment du report
  reportTypes: ["question_confuse", "autre"]
  customText: "..."                ← texte libre si "Autre"
  roomCode: "ABC123"
  reporterUid: "uid..."
  timestamp: serverTimestamp()
  status: "open" | "resolved" | "rejected"
```

### 2.4 Firebase Rules

```json
"quiz_reports": {
  "$reportId": {
    ".write": "auth != null",
    ".read": false
  }
}
```

Seul Punkrecords (Firebase Admin) peut lire les reports.

---

## Phase 3 — Tickets dans Punkrecords

### 3.1 Nouvelle page `/tickets`

- Liste tous les `quiz_reports` triés par date (plus récents en premier)
- Filtres : `Ouvert` / `Résolu` / `Rejeté`
- Chaque ticket affiche : thème, texte de la question, types de problèmes, date, status
- Badge count "open" dans la sidebar Punkrecords

### 3.2 Deep link vers la question dans l'éditeur

Cliquer sur un ticket → `/quiz/[themeId]?q=questionId`

Dans l'éditeur :
- Auto-scroll jusqu'à la question concernée
- Highlight temporaire de la ligne (border colorée)
- Bouton "Résoudre ce ticket" dans le header de la ligne → marque le report comme `resolved` dans Firebase

### 3.3 Workflow complet

```
Joueur voit un problème
  → Modal in-game → Submit
    → Firebase quiz_reports (status: open)
      → Punkrecords /tickets affiche le ticket
        → Admin clique → /quiz/[themeId]?q=questionId
          → Vérifie avec Claude / corrige manuellement
          → Accepte corrections + Sauvegarde
          → Marque ticket "resolved"
          → Deploy → Vercel redéploie
```

---

## Ordre d'implémentation recommandé

| # | Tâche | Projet | Statut |
|---|-------|--------|--------|
| 1 | Migration : supprimer `difficulty` des 51 JSON | VPS script | ✅ Fait (5701 questions) |
| 2 | Refonte UI éditeur (colonnes côte à côte + diff) | Punkrecords | ✅ Fait |
| 3 | Bouton signalement + modal in-game | LetsQueeze | ⬜ À faire |
| 4 | Logique remplacement question signalée | LetsQueeze | ⬜ À faire |
| 5 | Firebase `quiz_reports` + rules | Firebase | ✅ Fait |
| 6 | Page `/tickets` dans Punkrecords | Punkrecords | ✅ Fait |
| 7 | Deep link éditeur + bouton "Résoudre" | Punkrecords | ✅ Fait |

---

## Notes importantes

- Les reports sont **en lecture seule depuis le client** (sécurité Firebase rules)
- Le `questionText` est snapshotté au moment du report (utile si la question est modifiée entre-temps)
- La logique de remplacement in-game ne nécessite pas de nouvelle question : elle skip vers la **question suivante du même thème déjà chargé**
- Punkrecords utilise déjà `firebase-admin.js` → on branche la lecture des reports dessus directement
