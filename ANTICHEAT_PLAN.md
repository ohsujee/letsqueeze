# Système Anti-Triche — Daily Games (Sémantique & Mot Mystère)

## Pourquoi ce système

Les deux jeux daily récompensent massivement le 1er essai :
- **Sémantique** : 5000 pts (formule `5000 / attempts`)
- **Mot Mystère** : ~9000 pts (formule `(7 - attempts) * 1000 + bonus temps`)

Trouver le mot du premier coup est statistiquement quasi-impossible de façon légitime :
- Sémantique : 1 mot parmi des dizaines de milliers de candidats possibles
- Mot Mystère : 1 mot parmi des milliers de mots de 5 lettres français

Des joueurs se font souffler le mot (amis, groupe de discussion, etc.). L'objectif n'est **pas de punir** mais de maintenir un environnement équitable, avec une approche légère et fun.

---

## Approche choisie

### Ce qu'on NE fait PAS
- ❌ Ban du compte
- ❌ Message agressif ou culpabilisant
- ❌ Suppression silencieuse sans explication

### Ce qu'on fait
- ✅ Modal fun et légère qui apparaît après un 1er essai réussi
- ✅ Exclusion du leaderboard pour cette partie
- ✅ Streak et stats personnelles préservées (pas de pénalité locale)
- ✅ Option de jouer un mot alternatif pour quand même se classer
- ✅ Outil admin pour gérer les cas existants

---

## UX — La modale "As-tu demandé à un ami ?"

### Déclenchement
Apparaît **uniquement** si `attempts === 1 && solved === true`, à la place de l'écran de fin normal.

### Texte de la modale

**Titre :**
> Oulà, première tentative ? 🎯

**Corps :**
> C'est statistiquement quasi-impossible de trouver le mot du premier coup...
> Tu aurais eu de l'aide ? 😏
>
> Pas de jugement — mais pour garder le classement équitable pour tout le monde,
> ton résultat ne sera pas affiché aujourd'hui.
>
> *(Si c'était vraiment toi, toutes nos excuses — tu es juste un génie absolu.)*

**Boutons :**

| Bouton | Action |
|--------|--------|
| 🎲 **Jouer un autre mot** | Lance une partie avec un mot alternatif, permet de se classer |
| **Je comprends** | Ferme la modal, game terminée sans leaderboard |

---

## Architecture technique

### Détection

Dans chaque page de jeu, **avant** l'appel à `completeGame()` :
```javascript
if (attempts === 1 && solved) {
  completeGame({ solved, attempts, timeMs, score, skipLeaderboard: true });
  // → streak/stats locaux mis à jour, mais PAS d'écriture leaderboard Firebase
  setShowSuspiciousModal(true);
  return;
}
// Flow normal
completeGame({ solved, attempts, timeMs, score });
```

### `useDailyGame.js` — ajout `skipLeaderboard`

Paramètre optionnel dans `completeGame()` :
```javascript
const completeGame = useCallback(async ({
  solved, attempts, timeMs, score, revealedWord,
  skipLeaderboard = false   // ← NOUVEAU, défaut false = comportement inchangé
}) => {
  // ... sauvegarde locale (localStorage, streak, stats) → inchangé ...

  if (!skipLeaderboard && user) {
    // écriture leaderboard Firebase (code actuel)
  }
}, [...]);
```

Nouvelle fonction `writeLeaderboard()` pour les parties alternatives (écrit uniquement dans le leaderboard, sans toucher streak/stats).

**Impact sur le jeu normal : zéro.** Le défaut est `false`.

---

## Mot alternatif

### Pourquoi proposer un mot alternatif
Pour ne pas frustrer les joueurs légitimes (génie ou chance réelle) et leur donner la possibilité de se classer quand même.

### Sémantique — Source du mot alternatif
Le VPS dispose de tous les mots jusqu'à 3 ans à l'avance.

**Endpoint VPS confirmé :** `GET /word/{date}` (avec auth)

**Approche :** Utiliser le mot d'une date passée (ex: il y a 365 jours) comme mot alternatif. Ce mot est déjà "révélé" (date passée) donc acceptable comme alternative. Le scoring sémantique continue de fonctionner normalement avec cette date alternative.

**Nouvelle route Next.js :** `GET /api/daily/semantic-alternative?date=YYYY-MM-DD`
- Calcule `alternativeDate = today - 365 jours`
- Appelle `SEMANTIC_API_URL/word/{alternativeDate}` côté serveur pour vérifier
- Retourne `{ alternativeDate }`
- Le jeu utilise ce `alternativeDate` pour tous les appels scoring

### Mot Mystère — Source du mot alternatif
Les mots sont dans Firebase `daily/wordle/{date}/word` (géré admin).

**Approche :** Liste de fallback de ~15 mots côté serveur, exclure le mot du jour.

**Nouvelle route Next.js :**
- `GET /api/daily/wordle/alternative?date=YYYY-MM-DD` → retourne `{ token }` (mot alternatif chiffré AES-256-CBC avec `ALT_WORD_SECRET` ou fallback sur `SEMANTIC_API_KEY`)
- `POST /api/daily/wordle/alternative { guess, token, attemptNumber }` → valide le guess (token chiffré côté serveur pour éviter l'inspection réseau)

### Flow alternatif en jeu

1. Joueur clique "Jouer un autre mot"
2. Appel à l'API alternative → reçoit le mot/date alternatif (ou token chiffré)
3. État du jeu resetté en mémoire (guesses, attempts) sans toucher Firebase
4. Jeu repart normalement avec ce mot
5. Victoire → `writeLeaderboard()` → dans le leaderboard avec le vrai nombre d'essais

**Important :** Les guesses alt sont dans un state séparé (`altGuesses`, `altFeedbacks`, etc.). Si le joueur ferme et rouvre l'app, le mode alternatif est perdu — le jeu affiche juste l'écran de fin normal (sans leaderboard, puisque `completeGame` a déjà été appelé avec `skipLeaderboard: true`). C'est comportement acceptable.

---

## Gestion des cas existants (admin)

### Vue Punkrecords — Anti-Triche

**Nouvelle page** `app/anticheat/page.jsx` dans Punkrecords :
- Affiche les leaderboards du jour (Sémantique + Mot Mystère)
- Filtrés sur `attempts === 1 && solved === true`
- Colonnes : Jeu, Heure, Pseudo, UID, Score, Actions
- Deux boutons par ligne :
  - **"Supprimer + Notifier"** → supprime leaderboard + écrit notification Firebase inbox
  - **"Supprimer seulement"** → supprime sans notification

### API admin ciblée

**Nouvelle route :** `GET /api/admin/leaderboard-entry?game=wordle|semantic&date=YYYY-MM-DD`
→ Retourne les entrées suspectes

**Nouvelle route :** `DELETE /api/admin/leaderboard-entry`
```json
{
  "game": "wordle",
  "date": "2026-03-02",
  "uid": "xxx",
  "notify": true
}
```
Actions :
1. Supprime `daily/{game}/{date}/leaderboard/{uid}` dans Firebase
2. Si `notify: true` → écrit `users/{uid}/inbox/{notifId}` avec la notification (via firebase-admin, bypass des règles)

---

## Notifications in-game

### Règles Firebase (à ajouter dans `firebase.rules.json`)
```json
"inbox": {
  ".read": "auth != null && auth.uid == $uid",
  "$notifId": {
    ".write": "auth != null && auth.uid == $uid"
  }
}
```
> L'admin écrit via firebase-admin (service account) qui bypass les règles.

Structure d'une notification :
```json
{
  "type": "anticheat",
  "game": "semantique",
  "date": "2026-03-02",
  "read": false,
  "createdAt": 1709452340000
}
```

### Hook `useInbox.js` (nouveau)
- Écoute `users/{uid}/inbox/` (onValue)
- Si notification non lue de type `anticheat` → déclenche l'affichage de la modale
- Marque comme `read: true` dans Firebase immédiatement (affichée une seule fois)
- Monté dans `app/(main)/layout.jsx`

### Modale notification in-game (`InboxNotifModal.jsx`)

> **Hey, on a revu le classement 👀**
>
> On a détecté un résultat inhabituel sur ta partie de [Sémantique / Mot Mystère]
> du [date] et on a préféré la retirer du classement pour garder le jeu équitable.
>
> Si tu penses que c'est une erreur, pas de souci — écris-nous !

---

## Fichiers à créer / modifier

### LetsQueeze

| Fichier | Action | Statut |
|---------|--------|--------|
| `lib/hooks/useDailyGame.js` | MODIFIER | Ajout param `skipLeaderboard` + fonction `writeLeaderboard` |
| `app/daily/semantique/page.jsx` | MODIFIER | Détection 1 essai + modal + flow alternatif |
| `app/daily/motmystere/page.jsx` | MODIFIER | Idem |
| `components/ui/SuspiciousResultModal.jsx` | **CRÉÉ** ✅ | Modal fun anti-triche |
| `components/ui/InboxNotifModal.jsx` | **CRÉÉ** ✅ | Modal notification admin |
| `lib/hooks/useInbox.js` | **CRÉÉ** ✅ | Écoute Firebase inbox |
| `app/api/daily/semantic-alternative/route.js` | **CRÉÉ** ✅ | Mot alternatif VPS |
| `app/api/daily/wordle/alternative/route.js` | **CRÉÉ** ✅ | Mot alternatif Wordle (GET token + POST check) |
| `firebase.rules.json` | **MODIFIÉ** ✅ | Ajout règles inbox (pas encore déployé) |
| `app/(main)/layout.jsx` | MODIFIER | Monter `useInbox` + `InboxNotifModal` |

### Punkrecords (VPS)

| Fichier | Action | Statut |
|---------|--------|--------|
| `app/anticheat/page.jsx` | **CRÉÉ** ✅ | Vue admin leaderboards 1 essai |
| `app/api/admin/leaderboard-entry/route.js` | **CRÉÉ** ✅ | GET suspect + DELETE ciblé + notify |
| `components/Sidebar.jsx` | **MODIFIÉ** ✅ | Lien "Anti-Triche" ajouté |

---

## Compatibilité — Zéro impact sur le jeu normal

| Changement | Impact sur joueurs normaux (2+ essais) |
|------------|----------------------------------------|
| `skipLeaderboard` dans useDailyGame | Aucun (défaut = `false`) |
| Détection dans les pages | Aucun (condition ultra-spécifique) |
| Nouveaux composants modaux | Aucun (pas montés si condition non remplie) |
| Nouvelles routes API | Aucun (nouvelles routes, rien de modifié) |
| Firebase inbox rules | Additif seulement |
| Punkrecords | Déploiement séparé |

---

## Ordre d'implémentation (à faire)

1. `useDailyGame.js` → param `skipLeaderboard` + `writeLeaderboard`
2. Détection + `SuspiciousResultModal` dans `app/daily/semantique/page.jsx`
3. Idem dans `app/daily/motmystere/page.jsx`
4. Flow "Jouer un autre mot" dans les deux pages (APIs alternative déjà créées ✅)
5. `app/(main)/layout.jsx` → monter `useInbox` + `InboxNotifModal`
6. `firebase deploy --only database` → déployer les règles inbox
7. Déployer Punkrecords sur VPS (anticheat page + API déjà créées ✅)
8. `git push` LetsQueeze → Vercel déploie

---

## Tests de validation

- [ ] Jouer Sémantique, entrer le bon mot directement → modale apparaît, absent du leaderboard, streak/stats OK
- [ ] Idem Mot Mystère
- [ ] Cliquer "Je comprends" → game proprement terminée
- [ ] Cliquer "Jouer un autre mot" → nouveau jeu se lance avec autre mot, victoire → dans leaderboard
- [ ] 2 essais et + → flow totalement inchangé, zéro modal
- [ ] Admin : supprimer entrée via Punkrecords → disparaît du leaderboard Firebase
- [ ] Admin : supprimer + notifier → `InboxNotifModal` apparaît au prochain lancement de l'app

---

## Variables d'environnement requises

| Variable | Où | Usage |
|----------|----|-------|
| `ALT_WORD_SECRET` | Vercel | Clé de chiffrement AES du token wordle alternatif (optionnel, fallback sur `SEMANTIC_API_KEY`) |
| `SEMANTIC_API_URL` | Vercel (déjà présent) | VPS sémantique |
| `SEMANTIC_API_KEY` | Vercel (déjà présent) | Auth VPS |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | Vercel (déjà présent) | Admin Firebase pour route wordle/alternative |
