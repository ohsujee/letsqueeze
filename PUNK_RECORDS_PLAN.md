# PUNK RECORDS — État des lieux

> punkrecords.gigglz.fun — Dashboard de gestion interne Gigglz
> *Dernière mise à jour : 2026-02-28*

---

## Architecture Technique

```
Browser
  └── nginx (HTTPS 443) — punkrecords.gigglz.fun
        ├── /oauth2/*   → oauth2-proxy (auth GitHub)
        ├── /           → Dashboard Next.js (port 3001)  [auth required]
        └── /vscode/    → code-server (port 8080)         [auth required]
```

**Stack :**
- Next.js 15 (App Router) + Tailwind CSS
- Firebase Admin SDK (service account sur le VPS)
- Déployé sur VPS `/opt/punkrecords`, port 3001, service systemd

**Déploiement :**
```bash
scp <fichiers> punkrecords:/opt/punkrecords/...
ssh punkrecords "cd /opt/punkrecords && npm run build"
ssh punkrecords "cp -r .next/static .next/standalone/.next/static"
ssh punkrecords "cp .env.local .next/standalone/.env.local"
ssh punkrecords "systemctl restart punkrecords"
```
> Note : le `GITHUB_TOKEN` est injecté via systemd (ne nécessite pas d'être dans standalone)

---

## Sections disponibles

### ✅ Dashboard (/dashboard)
Métriques Firebase temps réel :
- Total users inscrits, nouveaux inscrits (aujourd'hui / 7j / 30j)
- Rooms ouvertes en ce moment par jeu
- Parties jouées par jeu

---

### ✅ Utilisateurs (/users)
- Liste paginée des utilisateurs Firebase
- Recherche par pseudo / email / UID
- Détail : date inscription, abonnement (Pro/Free)

---

### ✅ Notifications (/notifications)
- Envoi de push notifications aux joueurs
- Historique des notifications envoyées
- Planification de notifications

---

### ✅ Simulateur de revenus (/revenue-simulator)
- Simulation des revenus (abonnements + pubs)

---

### ✅ Quiz Editor (/quiz)

#### Page principale — Labels & Free/Pro
- Lecture du `manifest.json` **directement depuis GitHub** (source unique de vérité)
- Toggle des labels par thème : `free` (jouable sans Pro), `isNew` (badge Nouveau)
- Comptage : thèmes Free / Pro only, total questions
- **Sauvegarder & Déployer** = commit `manifest.json` sur GitHub → Vercel redéploie automatiquement
- Toast de confirmation en bas à droite (auto-dismiss 5s)

**Règle importante :** le manifest est géré exclusivement via cet éditeur.
Ne jamais modifier `manifest.json` via la route deploy (qui gère uniquement les fichiers de questions).

#### Page thème — Éditeur de questions (/quiz/[themeId])
- Lecture des questions depuis le VPS (`/opt/letsqueeze/public/data/quiz/`)
- Édition inline question/réponse avec sauvegarde par question
- Vérification IA (Claude) : score qualité, suggestions de reformulation
- Diff mot à mot entre version originale et suggestion
- Accepter / Rejeter les suggestions IA
- **Déployer sur GitHub** = commit unique (Git Data API) de tous les fichiers modifiés → Vercel redéploie

**Architecture données quiz :**
| Fichier | Source de vérité | Géré par |
|---------|-----------------|----------|
| `manifest.json` | GitHub | Éditeur labels (/quiz) |
| `database-*.json` | VPS `/opt/letsqueeze/public/data/quiz/` | Éditeur questions (/quiz/[themeId]) |

---

### ✅ Tickets (/tickets)
- Signalements de questions reçus depuis le jeu (Firebase `quiz_reports/`)
- Lien direct vers la question dans l'éditeur (`?q=questionId&ticketId=xxx`)
- Résolution automatique du ticket lors de la sauvegarde de la question
- Statuts : open / resolved / rejected

---

### ✅ Workspace (/workspace)
- Terminal et éditeur de fichiers sur le VPS

### ✅ Claude (/claude)
- Interface Claude directement dans le dashboard

### ✅ VS Code (/vscode)
- code-server embarqué (terminal complet sur le VPS)

---

## Variables d'environnement (VPS)

| Variable | Où | Usage |
|----------|----|-------|
| `GITHUB_TOKEN` | systemd + `.env.local` | Lecture/écriture GitHub API (manifest + deploy) |
| `SA_PATH` | `.env.local` | Chemin service account Firebase Admin |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | `.env.local` | Firebase Realtime DB |
| `GITHUB_CLIENT_SECRET` | `.env.local` | OAuth GitHub (auth dashboard) |

> Le `GITHUB_TOKEN` est un Personal Access Token classic avec scope `repo`.
> Il est injecté dans systemd → **persistant même après rebuild**.

---

## Sources de données Firebase

| Data | Chemin Firebase |
|------|-----------------|
| Profils users | `users/{uid}/profile/` |
| Rooms Quiz | `rooms/{code}/` |
| Rooms DeezTest | `rooms_deeztest/{code}/` |
| Rooms Alibi | `rooms_alibi/{code}/` |
| Rooms La Règle | `rooms_laregle/{code}/` |
| Signalements questions | `quiz_reports/{id}/` |
| Questions masquées | `unavailable_questions/{questionId}/` |

---

## Roadmap

| Section | Status |
|---------|--------|
| Dashboard Firebase | ✅ Fait |
| Utilisateurs | ✅ Fait |
| Notifications | ✅ Fait |
| Simulateur revenus | ✅ Fait |
| Quiz Editor (labels) | ✅ Fait |
| Quiz Editor (questions) | ✅ Fait |
| Tickets | ✅ Fait (lien sidebar à ajouter si absent) |
| Revenus (RevenueCat + AdMob) | ⏳ À faire |
| Stats détaillées par jeu | ⏳ À faire |
| Page utilisateur détaillée | ⏳ À faire |
