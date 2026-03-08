# Système Anti-Triche — Daily Games (Sémantique & Mot Mystère)

> Roadmap complète incluant la Phase 1 (déjà implémentée) et la Phase 2 (multi-jours).

---

## Philosophie

- ❌ Pas de ban de compte
- ❌ Pas de message agressif ou culpabilisant
- ❌ Pas de suppression silencieuse sans explication
- ✅ Détection progressive sur plusieurs jours (statistiques impossibles à simuler)
- ✅ Deuxième chance : après avertissement + reset, on surveille à nouveau
- ✅ Approche légère et fun côté UX, béton côté architecture
- ✅ Score de suspicion jamais exposé au joueur (il ajusterait son comportement)

---

---

# PHASE 1 — Détection 1 essai (IMPLÉMENTÉE ✅)

## Pourquoi

Trouver le mot du premier coup est statistiquement quasi-impossible :
- Sémantique : 1 mot parmi des dizaines de milliers
- Mot Mystère : 1 mot parmi des milliers de mots de 5 lettres français

## Déclenchement

`attempts === 1 && solved === true`

## UX — Modal "Oulà, première tentative ?"

| Bouton | Action |
|--------|--------|
| 🎲 Jouer un autre mot | Pub rewarded obligatoire → mot alternatif → peut se classer |
| Je comprends | Game terminée, non classé ce jour |

## Architecture

- `completeGame({ skipLeaderboard: true })` → streak/stats locaux OK, pas d'écriture leaderboard
- `writeLeaderboard()` → utilisé uniquement après victoire sur le mot alternatif
- Mot alternatif Sémantique : date - 365 jours via VPS
- Mot alternatif Mot Mystère : token chiffré AES-256-CBC via `/api/daily/wordle/alternative`

## Fichiers concernés (tous ✅ déjà créés)

| Fichier | Statut |
|---------|--------|
| `lib/hooks/useDailyGame.js` | ✅ `skipLeaderboard` + `writeLeaderboard` |
| `app/daily/semantique/page.jsx` | ✅ Détection + modal + flow alternatif |
| `app/daily/motmystere/page.jsx` | ✅ Détection + modal + flow alternatif |
| `components/ui/SuspiciousResultModal.jsx` | ✅ Modal fun |
| `components/ui/InboxNotifModal.jsx` | ✅ Modal notification admin |
| `lib/hooks/useInbox.js` | ✅ Écoute Firebase inbox |
| `app/api/daily/semantic-alternative/route.js` | ✅ |
| `app/api/daily/wordle/alternative/route.js` | ✅ GET token + POST check |
| `firebase.rules.json` | ✅ Règles inbox |
| `app/(main)/layout.jsx` | ✅ useInbox + InboxNotifModal montés |
| Punkrecords `app/anticheat/page.jsx` | ✅ Vue admin |
| Punkrecords `app/api/admin/leaderboard-entry/route.js` | ✅ GET suspect + DELETE + notify |

---

---

# PHASE 2 — Détection multi-jours (À IMPLÉMENTER)

## Le problème

Un tricheur qui comprend la Phase 1 soumet volontairement un mauvais mot en 1er essai, puis la réponse en 2e. Résultat : 2 essais, non détecté.

La vraie preuve : **des statistiques impossibles sur plusieurs jours.**

Un joueur honnête, même très bon, a des mauvais jours. Un tricheur qui cherche la réponse tous les jours aura une distribution anormalement homogène et bonne. Statistiquement impossible à maintenir honnêtement.

**Données de référence (recherche arXiv 2309.02110) :**
- Solver optimal Wordle : 3.42 essais en moyenne (plancher humain atteignable)
- Probabilité de résoudre en ≤ 2 essais : ~8-10% par jour pour un très bon joueur
- 10 jours consécutifs à ≤ 2 essais : (0.10)^10 = 0.000000001% → impossible honnêtement

---

## Structure Firebase (nouveau)

### Données anti-triche par joueur (écriture admin uniquement)

```
users/{uid}/anti_cheat/{gameId}/
├── suspicionScore: 0-100        ← score cumulé
├── flagged: boolean             ← true si >= 75
├── warningPending: boolean      ← true = modale à afficher au prochain lancement
├── warningShownAt: timestamp    ← date du dernier avertissement
├── resetAt: timestamp           ← date du dernier reset après avertissement
├── gamesAnalyzed: number        ← nb de parties prises en compte
├── avgAttempts: number          ← moyenne essais sur fenêtre
├── winRate: number              ← taux de victoire sur fenêtre
├── zScore: number               ← écarts-types au-dessus de la population
├── lastUpdated: timestamp
└── history/{date}/              ← historique des parties analysées
    ├── attempts: number
    ├── solved: boolean
    └── score: number
```

### Leaderboard — nouveau champ

```
daily/{wordle|semantic}/{date}/leaderboard/{uid}/
└── unranked: boolean    ← true = retiré du classement (mais entrée conservée pour audit)
```

### Admin — joueurs flagués

```
admin/flagged_players/{uid}/
├── gameId: string
├── suspicionScore: number
├── flaggedAt: timestamp
├── avgAttempts: number
└── winRate: number
```

---

## Signaux de suspicion

### Mot Mystère (Wordle)

Population de référence : moyenne 4.0 essais, écart-type 1.2

| Signal | Condition | Poids |
|--------|-----------|-------|
| Taux de victoire | > 95% sur ≥ 10 parties | +30 |
| Moyenne essais (z-score) | z > 3.0 (avg < 0.4) sur ≥ 10 parties | +30 |
| Moyenne essais (z-score modéré) | z > 2.0 sur ≥ 10 parties | +15 |
| Taux 1 essai | > 2% des parties | +30 |
| Taux 1 essai (modéré) | > 1% des parties | +15 |
| Jamais > 4 essais | 0 partie à 5-6 essais ou perdue sur ≥ 10 parties | +10 |

**Seuil de déclenchement : ≥ 75 sur ≥ 10 parties**

### Sémantique

Population de référence : moyenne ~20 essais, écart-type ~15

| Signal | Condition | Poids |
|--------|-----------|-------|
| Taux de victoire | > 90% sur ≥ 10 parties | +30 |
| Moyenne essais | < 5 sur ≥ 10 parties | +40 |
| Moyenne essais (modéré) | < 10 sur ≥ 10 parties | +20 |
| Absence de mots "glaciaux" | 0 essai avec rang > 1000 sur ≥ 3 jours consécutifs | +30 |
| Jamais > 15 essais | 0 mauvaise journée sur ≥ 10 parties | +20 |

**Seuil de déclenchement : ≥ 75 sur ≥ 10 parties**

> **Pourquoi 10 parties minimum ?** En dessous, un joueur chanceux peut atteindre ces scores légitimement. Sur 10 parties, la probabilité que ce soit de la chance devient < 0.001%.

---

## Calibration — Ne pas flaguer les vrais bons joueurs

- Moyenne ≤ 3.0 essais sur Wordle → suspect (le solver optimal humain est 3.42)
- Moyenne ≤ 2.5 essais sur Wordle → très suspect
- Jamais utiliser le timing seul comme signal (peut être rapide pour des raisons légitimes)
- Fenêtre glissante de 30 jours (pas de pénalité à vie)

---

## Cycle de suspicion (réversible)

```
Partie complétée
  → Calcul suspicion (VPS nightly ou API route)
  → score < 75 → surveillance silencieuse

  → score ≥ 75 ET gamesAnalyzed ≥ 10
      → jours flagués : unranked: true dans leaderboard
      → admin/flagged_players/{uid} mis à jour
      → users/{uid}/anti_cheat/{gameId}/warningPending: true

  → Joueur ouvre Sémantique ou Mot Mystère
      → client lit warningPending
      → affiche SuspicionWarningModal (nouveau)
      → warningPending: false + suspicionScore: 0 + resetAt: now
      → monitoring repart de zéro

  → Si ça recommence → nouveau cycle
  → Si ça s'arrête → suspicion reste à 0 → joueur "blanchi"
```

---

## Sécurité Firebase — Fix critique

### Problème actuel

`writeLeaderboard()` dans `useDailyGame.js` écrit **directement depuis le client** vers Firebase. N'importe qui peut injecter un score depuis la console navigateur :
```javascript
firebase.database().ref('daily/wordle/2026-03-07/leaderboard/uid').set({score: 99999})
```

### Solution : API route serveur + règles Firebase restrictives

**Étape 1 — Nouvelle API route (LetsQueeze)**

`POST /api/daily/submit-result`
1. Vérifie le token Firebase (identité)
2. Rejoue les guesses côté serveur pour vérifier `solved` et `attempts`
3. Calcule le score côté serveur (jamais faire confiance au client)
4. Stocke les guesses pour audit dans `users/{uid}/daily/{gameId}/{date}/guesses`
5. Écrit le leaderboard via Firebase Admin SDK
6. Met à jour le suspicion score en asynchrone

**Étape 2 — Règles Firebase**

```json
"daily": {
  "wordle": {
    "$date": {
      "leaderboard": {
        ".read": "auth != null",
        ".write": false
      }
    }
  },
  "semantic": {
    "$date": {
      "leaderboard": {
        ".read": "auth != null",
        ".write": false
      }
    }
  }
}
```

> L'écriture se fait uniquement via Admin SDK (depuis l'API route Next.js), qui bypass les règles Firebase.

---

## Architecture du calcul de suspicion

### Option A — VPS Scheduler (recommandée)

Le VPS Punkrecords a déjà un `scheduler.js` avec cron jobs configurables via Firebase.
Ajouter un schedule dans `notifications/schedules/anticheat_daily` :

```json
{
  "enabled": true,
  "cron": "0 2 * * *",
  "target": "internal",
  "action": "recalculate_suspicion"
}
```

Le scheduler appelle `/api/anticheat/recalculate` (Punkrecords) à 2h du matin :
1. Lit tous les users ayant joué dans les 30 derniers jours
2. Pour chaque user, calcule le suspicion score
3. Met à jour `users/{uid}/anti_cheat/{gameId}` via firebase-admin
4. Si score ≥ 75 : marque les entrées leaderboard comme `unranked`, écrit `warningPending`

**Avantages :** firebase-admin déjà configuré sur le VPS, scheduler déjà en place, aucune Cloud Function nécessaire, calcul asynchrone sans impact sur l'UX.

### Option B — API route Next.js (fallback)

Calculer en fin de partie dans `POST /api/daily/submit-result`.
Inconvénient : limité à la fenêtre de 30s des API routes Vercel, et Firebase Admin SDK à configurer côté Vercel.

**→ Privilégier l'Option A.**

---

## UX — SuspicionWarningModal (nouveau composant)

S'affiche au lancement de Sémantique ou Mot Mystère si `warningPending === true`.

**Ton :** neutre, non accusateur, respectueux.

> **Hey, on a revu ton classement 👀**
>
> On a détecté des performances inhabituelles sur tes dernières parties.
> Pour garder le jeu équitable, tes scores des jours concernés ont été retirés du classement.
>
> Si tu penses que c'est une erreur, écris-nous !

- Bouton : "J'ai compris" → `warningPending: false`, reset suspicion score à 0
- **Ne jamais mentionner les critères de détection**
- **Ne jamais dire "tu triches"**
- Email de contact visible pour contestation

---

## Leaderboard public — Filtrage

Les entrées avec `unranked: true` :
- Exclues du classement public (ne s'affichent pas)
- Conservées dans Firebase pour audit admin
- Côté client : le joueur concerné voit "Non classé" sur son propre écran

---

## Fichiers à créer / modifier

### LetsQueeze (Vercel)

| Fichier | Action | Priorité |
|---------|--------|----------|
| `app/api/daily/submit-result/route.js` | **CRÉER** | 🔴 Critique (sécurité) |
| `firebase.rules.json` | **MODIFIER** — interdire écriture client leaderboard | 🔴 Critique |
| `lib/hooks/useDailyGame.js` | **MODIFIER** — remplacer `writeLeaderboard` par appel API | 🔴 Critique |
| `components/ui/SuspicionWarningModal.jsx` | **CRÉER** | 🟡 Phase 2 |
| `lib/hooks/useInbox.js` | **MODIFIER** — ajouter écoute `warningPending` | 🟡 Phase 2 |
| `app/daily/motmystere/page.jsx` | **MODIFIER** — lire `warningPending` au lancement | 🟡 Phase 2 |
| `app/daily/semantique/page.jsx` | **MODIFIER** — idem | 🟡 Phase 2 |

### Punkrecords VPS

| Fichier | Action | Priorité |
|---------|--------|----------|
| `app/api/anticheat/recalculate/route.js` | **CRÉER** — calcul nightly suspicion scores | 🟡 Phase 2 |
| `app/anticheat/page.jsx` | **MODIFIER** — ajouter vue multi-jours + joueurs flagués | 🟡 Phase 2 |
| `scheduler.js` | **MODIFIER** — ajouter action `recalculate_suspicion` | 🟡 Phase 2 |

---

## Ordre d'implémentation recommandé

### Sprint 1 — Sécurité (critique, faire en premier)
1. Créer `POST /api/daily/submit-result` avec validation serveur-side des guesses
2. Modifier `useDailyGame.js` pour appeler cette API au lieu d'écrire directement
3. Mettre à jour `firebase.rules.json` — interdire écriture client sur leaderboard
4. `firebase deploy --only database`
5. Tester : vérifier qu'un score injecté depuis la console est refusé

### Sprint 2 — Collecte de données
6. Dans `submit-result`, stocker les guesses pour audit (`users/{uid}/daily/{gameId}/{date}/guesses`)
7. Dans `submit-result`, écrire l'historique anti-triche `users/{uid}/anti_cheat/{gameId}/history/{date}`

### Sprint 3 — Calcul suspicion (VPS)
8. Créer `/api/anticheat/recalculate` sur Punkrecords
9. Ajouter le schedule dans Firebase `notifications/schedules/anticheat_daily` (cron 2h du matin)
10. Modifier `scheduler.js` pour gérer l'action `recalculate_suspicion`
11. Tester sur des données réelles

### Sprint 4 — UX avertissement
12. Créer `SuspicionWarningModal.jsx`
13. Modifier `useInbox.js` pour écouter `warningPending`
14. Afficher la modale dans Sémantique et Mot Mystère
15. Gérer le reset du score suspicion après affichage

### Sprint 5 — Admin visibility (Punkrecords)
16. Mettre à jour la page anticheat pour afficher les joueurs flagués multi-jours
17. Ajouter action "Débloquer manuellement" (reset suspicion score depuis admin)

---

## Tests de validation Phase 2

- [ ] Simuler 10 parties avec avg 2 essais → suspicion score ≥ 75 calculé correctement
- [ ] Leaderboard : entrées concernées passent à `unranked: true`
- [ ] Joueur ouvre le jeu → `SuspicionWarningModal` apparaît
- [ ] Joueur clique "J'ai compris" → modal ne réapparaît pas, suspicion reset à 0
- [ ] Joueur joue normalement après reset → suspicion recalculé depuis zéro
- [ ] Faux positif : joueur légitime avec 15+ parties et avg 3.5 → pas flagué
- [ ] Injection score depuis console navigateur → refusée par règles Firebase
- [ ] Admin Punkrecords : voir la liste des joueurs flagués + débloquer manuellement

---

## Variables d'environnement

| Variable | Où | Usage |
|----------|----|-------|
| `ALT_WORD_SECRET` | Vercel | Clé AES token mot alternatif Wordle |
| `SEMANTIC_API_URL` | Vercel (déjà présent) | VPS sémantique |
| `SEMANTIC_API_KEY` | Vercel (déjà présent) | Auth VPS |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | Vercel (déjà présent) | Admin Firebase |
| `SA_PATH` | VPS (déjà présent) | Service account Punkrecords |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | VPS (déjà présent) | Firebase URL |
| `ANTICHEAT_API_KEY` | VPS (à créer) | Auth de la route `/api/anticheat/recalculate` |

---

## Notes architecture VPS (Punkrecords)

- `scheduler.js` → lit `notifications/schedules` dans Firebase, crée des cron jobs à la volée
- `firebase-admin.js` → Firebase Admin SDK configuré avec service account `/opt/punkrecords-sa.json`
- Le scheduler tourne en continu avec le serveur Next.js
- Ajouter une action dans le scheduler en modifiant comment il dispatch les appels API internes
- La route `/api/anticheat/recalculate` doit être protégée par un header `x-api-key` (même pattern que `/api/admin/reset-leaderboards`)
