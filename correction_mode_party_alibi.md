# Correction Mode Party Alibi — 2026-03-19

## Problème signalé

En mode Party Alibi :
1. Les joueurs ne jouent pas chacun leur tour (pas d'alternance)
2. Le jeu ne s'arrête pas après les questions prévues — il recommence comme s'il y avait encore des manches

## Diagnostic

### Mismatch rotation vs logique de questions

**`generateRoundRotation`** (dans `lib/hooks/useAlibiGroupRotation.js`) crée la bonne structure :
- Chaque round = **1 question** avec alternance automatique inspecteur/accusé
- Exemple 2 groupes, 10 questions chacun → 20 rounds :
  - Round 0: G1 interroge G2
  - Round 1: G2 interroge G1
  - Round 2: G1 interroge G2
  - ...etc (20 au total)

**Mais `handleNextQuestion`** (dans `app/alibi/game/[code]/play/page.jsx`) traitait chaque round comme ayant **`questionsPerGroup` (10) questions** avant d'avancer :

```javascript
// AVANT (bugué)
const questionInRound = currentQuestion % questionsPerGroup;
if (questionInRound >= questionsPerGroup - 1) {
  // avance au round suivant seulement après 10 questions
}
```

### Conséquences

- **Pas d'alternance** — G1 interrogeait G2 pendant 10 questions d'affilée avant de switch
- **20 rounds × 10 questions/round = 200 questions** au lieu de 20 → le jeu ne finissait jamais

## Corrections appliquées

### Fichier : `app/alibi/game/[code]/play/page.jsx`

#### 1. `handleNextQuestion` — 1 round = 1 question

```javascript
// APRÈS (corrigé)
if (isPartyMode) {
  if (currentRound >= totalRounds - 1) {
    // Dernière question — fin de partie
    await update(ref(db, `rooms_alibi/${code}/state`), { phase: "end" });
  } else {
    // Avancer au round suivant (= prochaine question avec alternance)
    await advanceToNextRound();
    setShowRoundTransition(true);
    await update(ref(db, `rooms_alibi/${code}/interrogation`), {
      currentQuestion: 0,
      state: "waiting",
      startedAt: null,
      responses: {},
      verdict: null
    });
  }
}
```

#### 2. Header — affichage simplifié

```jsx
// AVANT
<>Round {currentRound + 1}/{totalRounds} • Q{currentQuestion + 1}</>

// APRÈS
<>Question {currentRound + 1}/{totalRounds}</>
```

#### 3. Progress bar — basée sur les rounds

```javascript
// AVANT
return gameProgress?.percentage || 0;

// APRÈS
return totalRounds > 0 ? Math.round(((currentRound + 1) / totalRounds) * 100) : 0;
```

#### 4. Question badges — numéro basé sur le round

```jsx
// AVANT
<div className="interro-question-badge">Question {currentQuestion + 1}</div>

// APRÈS
<div className="interro-question-badge">Question {isPartyMode ? currentRound + 1 : currentQuestion + 1}</div>
```

### End screen (`AlibiPartyEndScreen.jsx`)

Pas de modification nécessaire. Le composant lit `groups/{id}/score.correct` et `score.total` depuis Firebase. Le scoring dans `judgeAnswers` incrémente `total` de 1 par verdict, ce qui est correct puisque chaque round = 1 question.

## Fichiers impliqués

| Fichier | Modifié | Rôle |
|---------|:-------:|------|
| `app/alibi/game/[code]/play/page.jsx` | Oui | Logique interrogation + UI |
| `lib/hooks/useAlibiGroupRotation.js` | Non | Rotation (déjà correct) |
| `components/game-alibi/AlibiPartyEndScreen.jsx` | Non | Classement fin de partie (déjà correct) |
| `lib/config/rooms.js` | Non | Config `QUESTIONS_PER_GROUP` (déjà correct) |

## Rappel architecture rotation

```
generateRoundRotation(groupIds, questionsPerGroup)
  → Pour 2 groupes, questionsPerGroup=10 :
    20 rounds, alternance G1↔G2
  → Pour 3 groupes, questionsPerGroup=8 :
    24 rounds, rotation G1→G2→G3

advanceToNextRound()
  → Incrémente currentRound
  → Met à jour inspectorGroupId / accusedGroupId
  → Si currentRound >= totalRounds → phase = "end"

judgeAnswers(isCorrect)
  → Incrémente groups/{accusedGroupId}/score.total (+1)
  → Si cohérent : incrémente score.correct (+1)
```
