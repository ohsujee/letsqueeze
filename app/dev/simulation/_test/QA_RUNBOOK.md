# QA Runbook — Tests automatisés des simulations

> Ce document est exécuté par Claude via MCP Chrome DevTools.
> Chaque section = un jeu. Chaque étape = un appel MCP.

## Prérequis

1. Serveur dev lancé sur `localhost:3000`
2. Authentifié via `navigate_page → http://localhost:3000/dev/signin?uid=<HOST_UID>`
3. MCP Chrome DevTools connecté

---

## Étape 0 : Injecter les utilitaires QA

**Une seule fois par session.** Lire le fichier `app/dev/simulation/_test/qa-checks.js` et l'injecter :

```
evaluate_script: <contenu complet de qa-checks.js>
```

Résultat attendu : `"✓ window.__qa installé — X fonctions disponibles"`

---

## Convention de test

Pour chaque jeu :

1. **Navigate** → page simulation
2. **Create** → cliquer "Create Simulation"
3. **Wait** → 3-4 secondes (room creation + seed players)
4. **Check lobby** → `window.__qa.runAllChecks('lobby', '{gameId}')`
5. **Console errors** → `list_console_messages` type: error
6. **Avancer les phases** → soit click boutons, soit `evaluate_script` pour écrire dans Firebase
7. **Check chaque phase** → `runAllChecks` + console errors
8. **Si FAIL** → `take_screenshot` pour debug, noter le problème
9. **Reset** → cliquer "↺ Lobby" puis re-tester si nécessaire

### Template d'appel Firebase via evaluate_script

```js
// Pour modifier l'état Firebase depuis le navigateur :
() => {
  const { getDatabase, ref, update } = window.__firebase || {};
  // OU utiliser l'import dynamique :
  return import('/lib/firebase.js').then(({ db, ref, update }) => {
    return update(ref(db, 'PREFIX/CODE/state'), { /* changes */ });
  });
}
```

---

## Jeu 1 : Quiz Buzzer

**URL:** `/dev/simulation/quiz`
**Prefix:** `rooms`
**Modes:** Game Master, Party, Team

### 1.1 Créer la simulation
- `navigate_page` → `http://localhost:3000/dev/simulation/quiz`
- `click` → bouton "Create Simulation"
- `wait_for` → 4 secondes
- `evaluate_script` → `window.__qa.getRoomInfo()`
- ✅ Attendu: `{ roomCode: "XXXXXX", playerCount: 5, phase: "lobby" }`

### 1.2 Lobby — checks de base
- `evaluate_script` → `window.__qa.runAllChecks('lobby', 'quiz')`
- `list_console_messages` → types: ["error"]
- ✅ Attendu: pass = true, 0 erreurs console

### 1.3 Lancer la partie
- `click` → bouton Start dans le premier panel (host)
- `wait_for` → 5 secondes (countdown 3-2-1-GO + transition)
- `evaluate_script` → `window.__qa.checkPhase('playing')`
- ✅ Attendu: phase = "playing"

### 1.4 Phase playing — éléments interactifs
- `evaluate_script` → `window.__qa.runAllChecks('playing', 'quiz')`
- `list_console_messages` → types: ["error"]
- ✅ Attendu: tous les boutons/buzzers cliquables, pas de blocage

### 1.5 Simuler un buzz
```js
evaluate_script: () => {
  // Écrire un buzz dans Firebase
  const code = window.__qa.getRoomInfo().roomCode;
  return fetch('/api/dev/seed-players', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomCode: code, prefix: 'rooms',
      action: 'updateScore', playerUid: 'fake_p1', score: 100
    })
  }).then(r => r.json());
}
```
- `evaluate_script` → `window.__qa.checkInteractiveElements()`
- ✅ Attendu: host panel montre les boutons validate/wrong, score mis à jour

### 1.6 Fin de partie
- `evaluate_script` : écrire `state.phase = 'ended'` via Firebase
- `wait_for` → 4 secondes (transition)
- `evaluate_script` → `window.__qa.runAllChecks('ended', 'quiz')`
- ✅ Attendu: panels en mode "end", scores affichés

### 1.7 Reset lobby
- `click` → bouton "↺ Lobby"
- `wait_for` → 2 secondes
- `evaluate_script` → `window.__qa.checkPhase('lobby')`
- ✅ Attendu: retour lobby, scores à 0

### 1.8 Mode Party (si supporté)
- Après reset lobby, modifier le mode via Firebase :
```js
evaluate_script: () => {
  const code = window.__qa.getRoomInfo().roomCode;
  return import('@/lib/firebase').then(({ db, ref, update }) => {
    return update(ref(db, `rooms/${code}/meta`), { gameMasterMode: 'party' });
  }).then(() => 'Party mode set');
}
```
- Relancer la partie → vérifier que l'asker rotation fonctionne
- `evaluate_script` → `window.__qa.checkInteractiveElements()`

---

## Jeu 2 : Blind Test

**URL:** `/dev/simulation/blindtest`
**Prefix:** `rooms_blindtest`
**Modes:** Game Master, Party, Team

### 2.1–2.3 : Même flow que Quiz (créer, lobby, lancer)

### 2.4 Phase playing — spécifique BlindTest
- Vérifier la présence du host view (BlindTestHostView) dans le panel host
- Vérifier les buzzers dans les panels joueurs
- `evaluate_script` → `window.__qa.runAllChecks('playing', 'blindtest')`

### 2.5 Simuler buzz + bonne réponse
- Firebase: set `lockUid`, puis `revealed: true`
- Vérifier le reveal screen (track name, artist)
- `evaluate_script` → `window.__qa.checkInteractiveElements()`

### 2.6 Simuler mauvaise réponse + pénalité
- Firebase: set `blockedUntil` sur le joueur
- Vérifier que le buzzer du joueur pénalisé est désactivé

### 2.7–2.8 : End + Reset (même que Quiz)

---

## Jeu 3 : La Règle

**URL:** `/dev/simulation/laregle`
**Prefix:** `rooms_laregle`
**Modes:** Game Master uniquement

### 3.1–3.2 : Créer + Lobby

### 3.3 Phase choosing — vote sur les règles
- L'host doit sélectionner des enquêteurs puis lancer
- `evaluate_script` → `window.__qa.runAllChecks('choosing', 'laregle')`
- Vérifier : panels enquêteurs montrent la vue attente, panels civils montrent les cartes de vote

### 3.4 Simuler les votes
- Firebase: écrire `state.votes.fake_p1 = 'rule_1'` etc.
- Vérifier l'animation de reveal (revealPhase: 'revealing')

### 3.5 Phase playing — timer + règle
- Firebase: set `phase: 'playing'`, `currentRule`, `timerEndAt`
- `evaluate_script` → `window.__qa.runAllChecks('playing', 'laregle')`
- Vérifier : timer affiché, règle visible (hold-to-reveal pour les civils)

### 3.6 Timer pause/resume
- Firebase: set `timerPaused: true` / `false`
- Vérifier l'affichage du timer en pause

### 3.7 Élimination d'un joueur
- Firebase: écrire dans `eliminations/fake_p2`
- Vérifier la notification d'élimination

### 3.8 Phase guessing — enquêteur devine
- Firebase: set `phase: 'guessing'`, `guessAttempts: 1`
- Vérifier les boutons de vote (oui/non) sur les panels civils
- Simuler votes négatifs → retour playing

### 3.9 Fin — enquêteurs gagnent / civils gagnent
- Tester les deux cas : `foundByInvestigators: true` et `false`
- Vérifier l'écran de résultat approprié

---

## Jeu 4 : Alibi

**URL:** `/dev/simulation/alibi`
**Prefix:** `rooms_alibi`
**Modes:** Game Master, Party

### 4.1–4.2 : Créer + Lobby

### 4.3 Phase prep — préparation 90s
- Lancer depuis le host → transition vers prep
- `evaluate_script` → `window.__qa.runAllChecks('prep', 'alibi')`
- Vérifier : timer visible, document d'alibi affiché

### 4.4 Phase interrogation
- Vérifier les champs de texte (textarea) pour les suspects
- Vérifier les cartes de question pour l'inspecteur
- `evaluate_script` → `window.__qa.checkInteractiveElements()`

### 4.5 Soumission de réponse
- Firebase: écrire une réponse dans `interrogation/responses/fake_p1`
- Vérifier que la réponse est marquée comme soumise

### 4.6 Verdict correct / incorrect
- Firebase: set `interrogation.verdict = 'correct'` puis `'incorrect'`
- Vérifier l'affichage du verdict

### 4.7 Fin de partie
- Firebase: set `state.phase = 'ended'`
- Vérifier le score final, l'écran de résultat

---

## Jeu 5 : Mime

**URL:** `/dev/simulation/mime`
**Prefix:** `rooms_mime`
**Modes:** Game Master uniquement

### 5.1–5.2 : Créer + Lobby (sélection thèmes nécessaire)

### 5.3 Phase playing — mimeur vs guessers
- Vérifier : panel mimeur montre MimeHostView, panels guessers montrent MimeGuesserView
- `evaluate_script` → `window.__qa.runAllChecks('playing', 'mime')`

### 5.4 Buzz d'un guesser
- Firebase: set `lockUid: 'fake_p2'`
- Vérifier le buzz banner

### 5.5 Bonne devinette — scores mimeur + guesser
- Firebase: incrémenter les scores, avancer l'index
- Vérifier les deux scores mis à jour

### 5.6 Mauvaise devinette — pénalité
- Firebase: décrémenter score, set `blockedUntil`
- Vérifier le buzzer désactivé temporairement

### 5.7 Rotation mimeur
- Firebase: set `currentMimeUid` sur un autre joueur
- Vérifier la transition de mimeur (AskerTransition)

### 5.8 Fin + Reset

---

## Jeu 6 : LOL

**URL:** `/dev/simulation/lol`
**Prefix:** `rooms_lol`
**Modes:** Game Master uniquement

### 6.1–6.2 : Créer + Lobby
### 6.3 Phase playing — vérifier éléments
### 6.4 Fin de partie

---

## Jeu 7 : Mind Link

**URL:** `/dev/simulation/mindlink`
**Prefix:** `rooms_mindlink`
**Modes:** Game Master uniquement

### 7.1–7.2 : Créer + Lobby
### 7.3 Phase choosing — défenseurs choisissent un mot
### 7.4 Phase playing — attaquants vs défenseurs
### 7.5 Fin de partie

---

## Jeu 8 : Imposteur

**URL:** `/dev/simulation/imposteur`
**Prefix:** `rooms_imposteur`
**Modes:** Game Master uniquement

### 8.1–8.2 : Créer + Lobby

### 8.3 Phase roles — distribution des rôles
- `evaluate_script` → `window.__qa.runAllChecks('roles', 'imposteur')`
- Vérifier que chaque panel montre un rôle

### 8.4 Tous les joueurs marquent "rôle vu"
- Firebase: set `hasSeenRole: true` pour tous
- Vérifier la transition vers describing

### 8.5 Phase describing — tour d'indices
- Vérifier le joueur actif, le champ de saisie d'indice
- `evaluate_script` → `window.__qa.checkInteractiveElements()`

### 8.6 Soumettre un indice
- Firebase: écrire dans `descriptions/1/fake_p1`
- Vérifier l'avancement du tour

### 8.7 Phase discussion
- Firebase: set `phase: 'discussion'`
- Vérifier les boutons "Voter" / "Continuer"

### 8.8 Phase voting — vote d'élimination
- Firebase: set `phase: 'voting'`
- Vérifier la grille de vote (ImposteurVoteGrid)

### 8.9 Élimination — rôle révélé
- Firebase: set `players.fake_p3.alive = false` + reveal role
- Vérifier l'animation d'élimination

### 8.10 Round end — gagnants
- Firebase: set `phase: 'roundEnd'`, `winner: 'civilians'`
- Vérifier l'affichage du résultat

### 8.11 Fin de partie
- Firebase: set `phase: 'ended'`
- Vérifier l'écran final

---

## Rapport de résultats

À la fin de chaque session de test, compiler un rapport :

```
## Rapport QA — [DATE]

### Résumé
| Jeu | Scénarios | Pass | Fail | Erreurs console |
|-----|-----------|------|------|-----------------|
| Quiz | 9 | ? | ? | ? |
| BlindTest | 8 | ? | ? | ? |
| La Règle | 10 | ? | ? | ? |
| Alibi | 7 | ? | ? | ? |
| Mime | 8 | ? | ? | ? |
| LOL | 4 | ? | ? | ? |
| MindLink | 5 | ? | ? | ? |
| Imposteur | 11 | ? | ? | ? |
| **TOTAL** | **62** | **?** | **?** | **?** |

### Problèmes trouvés
1. [JEU] Phase [X] : description du problème
   - Screenshot: [si pris]
   - Élément bloqué: [selector] par [blocker]
   - Console error: [message]

### Actions requises
- [ ] Fix 1
- [ ] Fix 2
```

---

## Notes

- **Timing** : les phases de transition ont des délais (3-5s). Toujours `wait_for` après un changement de phase.
- **Firebase SDK** : accessible dans la page via `import('@/lib/firebase')` ou directement si les modules sont déjà chargés.
- **Seed players API** : `POST /api/dev/seed-players` pour ajouter/modifier/supprimer des joueurs.
- **Screenshot** : uniquement quand un check échoue, pour documenter le problème.
- **Réinjection QA** : si la page est rechargée (navigation), réinjecter `window.__qa`.
