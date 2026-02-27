# PUNK RECORDS — Plan Dashboard Admin

> punkrecords.gigglz.fun — Dashboard de gestion interne Gigglz

---

## Architecture Technique

```
Browser
  └── nginx (HTTPS 443) — punkrecords.gigglz.fun
        ├── /oauth2/*   → oauth2-proxy (auth GitHub)
        ├── /           → Dashboard Next.js (port 3001)  [auth required]
        └── /vscode/    → code-server (port 8080)         [auth required]
```

**Stack:**
- Next.js 15 (App Router) + Tailwind CSS + shadcn/ui
- Firebase Admin SDK (service account déjà sur le VPS)
- Recharts (graphiques)
- Déployé sur VPS `/opt/punkrecords`, port 3001, service systemd

---

## Sections & Onglets

### 1. Dashboard (/)
Métriques temps réel et historiques.

**Bloc "Utilisateurs"**
- Total users inscrits
- Nouveaux inscrits : aujourd'hui / 7j / 30j / 3m / 1an
- Graphique courbe d'inscription dans le temps

**Bloc "Activité en cours"**
- Rooms ouvertes en ce moment (Quiz, DeezTest, Alibi, La Règle)
- Nombre de joueurs connectés en temps réel

**Bloc "Jeux Daily"**
- Plays aujourd'hui : Mot Mystère, Sémantique
- Records du jour (leaderboard top 3)

**Bloc "Stats globales jeux"**
- Parties jouées par jeu (7j / 30j / 3m / 1an)
- Graphique barres : comparaison des jeux
- Temps moyen de session (si disponible)

**Filtres globaux:** Aujourd'hui | 7j | 30j | 3m | 1an

---

### 2. Utilisateurs (/users)
- Liste paginée des utilisateurs
- Recherche par pseudo / email / UID
- Détail : date inscription, jeux joués, abonnement (Pro/Free), streak

---

### 3. Jeux (/games)
- Stats détaillées par jeu
- Rooms créées / terminées / abandonnées
- Distribution des scores
- Questions les plus ratées (Quiz)

---

### 4. Revenus (/revenue) — Phase 2
- **RevenueCat** : MRR, ARR, nouveaux abonnés, churns (7j / 30j / 3m / 1an)
- **AdMob** : impressions, revenus estimés (données J-1, périodes custom)
- Graphiques combinés revenus totaux

---

### 5. Quiz Editor (/quiz) — Phase 2
- Liste des packs de quiz (depuis public/data/quiz/*.json)
- Interface d'édition des questions/réponses
- Validation auto (pas de réponse dans la question, format correct)
- Commit Git automatique à la sauvegarde

---

### 6. VS Code (/vscode)
- Iframe embarqué de code-server
- Terminal complet sur le VPS

---

## Design

- **Thème :** Dark, inspiré linear.app — sidebar gauche, contenu à droite
- **Couleurs :** Fond `#0a0a0a`, sidebar `#111`, accents violet `#8b5cf6` (couleur Gigglz)
- **Font :** Geist (Next.js default) ou Inter
- **Composants :** shadcn/ui (cards, badges, tables, charts)

---

## Roadmap

| Phase | Contenu | Status |
|-------|---------|--------|
| 1 | Dashboard Firebase (users, rooms, daily games) | 🔨 En cours |
| 2 | Revenus (RevenueCat + AdMob) | ⏳ À faire |
| 3 | Quiz Editor | ⏳ À faire |
| 4 | Page Utilisateurs détaillée | ⏳ À faire |

---

## Sources de Données Firebase

| Data | Chemin Firebase |
|------|-----------------|
| Profils users | `users/{uid}/profile/` |
| Rooms Quiz actives | `rooms/{code}/` |
| Rooms DeezTest | `rooms_deeztest/{code}/` |
| Rooms Alibi | `rooms_alibi/{code}/` |
| Rooms La Règle | `rooms_laregle/{code}/` |
| Mot Mystère daily | `daily_motmystere/{date}/leaderboard/` |
| Sémantique daily | `daily_semantique/{date}/leaderboard/` |

---

*Créé le 2026-02-19*
