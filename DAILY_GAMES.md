# Daily Games — Plan d'implémentation

> Deux jeux quotidiens solo pour générer du trafic régulier sur Gigglz.
> Objectif : créer une habitude quotidienne + classements pour l'engagement.

---

## Jeux prévus

| Jeu | Concept | Complexité |
|-----|---------|-----------|
| **Mot Mystère** | Wordle en français — 6 essais, feedback vert/jaune/gris | Simple |
| **Sémantique** | Cemantix-like — deviner par proximité sémantique | Moyen |

---

## 1. Architecture Firebase

### Structure RTDB

```
daily/
├── wordle/
│   └── {YYYY-MM-DD}/
│       ├── word          → "PIANO"       [auth != null]
│       ├── word_length   → 5             [public]
│       └── leaderboard/
│           └── {uid}/
│               ├── attempts   → 4
│               ├── timeMs     → 87432    (ms depuis premier essai)
│               ├── solved     → true
│               ├── name       → "Alice"
│               └── completedAt → timestamp
│
└── semantic/
    └── {YYYY-MM-DD}/
        ├── storage_path  → "semantic/semantic_2026-03-01.json.gz"  [auth != null]
        └── leaderboard/
            └── {uid}/
                ├── attempts   → 23
                ├── solved     → true
                ├── name       → "Bob"
                └── completedAt → timestamp
```

### Règles de sécurité

Les règles à ajouter dans `firebase.rules.json` :

```json
"daily": {
  "wordle": {
    "$date": {
      "word": {
        ".read": "auth != null",
        ".write": "root.child('admins').child(auth.uid).exists()"
      },
      "word_length": {
        ".read": true,
        ".write": "root.child('admins').child(auth.uid).exists()"
      },
      "leaderboard": {
        ".read": "auth != null",
        "$uid": {
          ".write": "auth != null && auth.uid == $uid",
          ".validate": "newData.hasChildren(['attempts', 'solved', 'name']) && newData.child('attempts').isNumber() && newData.child('solved').isBoolean()"
        }
      }
    }
  },
  "semantic": {
    "$date": {
      "storage_path": {
        ".read": "auth != null",
        ".write": "root.child('admins').child(auth.uid).exists()"
      },
      "leaderboard": {
        ".read": "auth != null",
        "$uid": {
          ".write": "auth != null && auth.uid == $uid",
          ".validate": "newData.hasChildren(['attempts', 'solved', 'name']) && newData.child('attempts').isNumber() && newData.child('solved').isBoolean()"
        }
      }
    }
  }
}
```

### Fonctionnement côté client — TOUT EN LOCAL

Le mot est téléchargé **une seule fois** au lancement du jeu.
Toute la logique (comparaison lettres, feedback) se fait côté client.
Aucun appel Firebase pendant le jeu, sauf pour soumettre le score final.

---

## 2. Mot Mystère (Wordle)

### Règles du jeu
- Mot de **5 lettres** uniquement
- **6 essais** maximum
- Feedback : 🟩 Bonne lettre, bonne place / 🟨 Bonne lettre, mauvaise place / ⬜ Lettre absente
- Score = temps (chrono depuis le 1er essai) + nombre de tentatives
- Classement du jour visible à la fin

### Liste de mots

**Source : Lexique383** — base de données académique française, usage libre.
- Télécharger : http://www.lexique.org/telLexique.php
- Filtrer : 5 lettres, fréquence > 1.0, sans trait d'union, sans caractères spéciaux

```python
# Script de génération one-shot (local)
import pandas as pd

df = pd.read_csv('Lexique383.tsv', sep='\t')
words = df[
    (df['ortho'].str.len() == 5) &
    (df['freqlivres'] > 1.0) &
    (~df['ortho'].str.contains('-')) &
    (df['ortho'].str.match(r'^[a-zA-ZÀ-ÿ]+$'))
]['ortho'].str.upper().unique()

# Sauvegarder
with open('wordle_words.txt', 'w') as f:
    f.write('\n'.join(sorted(words)))

print(f"{len(words)} mots générés")  # ~8 000-12 000 mots
```

Le fichier `wordle_words.txt` va dans `/public/data/` — fichier statique, chargé une fois côté client.

### Définir le mot du jour (admin)

Via l'interface admin Gigglz (à créer) ou directement dans Firebase Console :

```
daily/wordle/2026-03-01/word = "PIANO"
daily/wordle/2026-03-01/word_length = 5
```

---

## 3. Sémantique

### Règles du jeu
- Deviner un mot en tapant des mots et en recevant un score de similarité
- Score de -100°C (très éloigné) à 1000°C (le mot cible)
- Pas de limite de tentatives
- Score final = nombre de tentatives pour trouver

### Architecture des données

Le fichier `semantic_YYYY-MM-DD.json` contient un dictionnaire :
```json
{
  "chat": 823,
  "chien": 712,
  "animal": 634,
  "...": "...",
  "voiture": -12
}
```

Taille : ~150-200 KB gzippé. Téléchargé une fois par jour, mis en cache.

### Pipeline de génération — HuggingFace Spaces + GitHub Actions

Voir section 4 pour le tutoriel complet.

---

## 4. Tutoriel HuggingFace Spaces (génération automatique)

### Objectif

Héberger un microservice Python **gratuit** qui charge le modèle FastText
et génère les fichiers de similarité pour 7 jours d'un coup.
Déclenché automatiquement chaque semaine via GitHub Actions.
Aucun PC nécessaire.

---

### Étape 1 — Créer un compte HuggingFace

https://huggingface.co/join

---

### Étape 2 — Créer un Space

1. Aller sur https://huggingface.co/new-space
2. Choisir :
   - **Space name** : `gigglz-semantic-api`
   - **SDK** : `Gradio` (mais on va l'utiliser comme une API, pas comme une UI)
   - **Hardware** : `CPU basic` (gratuit)
   - **Visibility** : `Private` (pour ne pas exposer l'API publiquement)
3. Cliquer **Create Space**

---

### Étape 3 — Fichiers du Space

Créer ces fichiers dans le Space (via l'éditeur HF ou git) :

**`requirements.txt`**
```
fastapi
fasttext-wheel
numpy
firebase-admin
python-dotenv
uvicorn
gzip
```

**`app.py`**
```python
import fasttext
import numpy as np
import json
import gzip
import os
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Header
from fastapi.responses import JSONResponse
import firebase_admin
from firebase_admin import credentials, storage

app = FastAPI()

# Charger FastText au démarrage (une seule fois)
print("Chargement FastText...")
model = fasttext.load_model("cc.fr.300.bin")
print("FastText chargé !")

# Charger le dictionnaire français
with open("french_words.txt", "r", encoding="utf-8") as f:
    DICTIONARY = [w.strip().lower() for w in f.readlines() if w.strip()]

def cosine_similarity(v1, v2):
    dot = np.dot(v1, v2)
    norm = np.linalg.norm(v1) * np.linalg.norm(v2)
    return float(dot / norm) if norm > 0 else 0.0

def compute_similarities(target_word: str) -> dict:
    target_vec = model.get_word_vector(target_word.lower())
    scores = {}
    for word in DICTIONARY:
        vec = model.get_word_vector(word)
        sim = cosine_similarity(target_vec, vec)
        # Échelle -100 à 1000 (approximative, à calibrer)
        score = round(sim * 1000)
        scores[word] = max(-100, min(1000, score))
    return scores

@app.get("/health")
def health():
    return {"status": "ok", "words_in_dict": len(DICTIONARY)}

@app.post("/compute/{date}/{word}")
def compute_and_upload(
    date: str,
    word: str,
    x_api_key: str = Header(None)
):
    # Vérification clé API simple
    if x_api_key != os.environ.get("API_KEY"):
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Calcul des similarités
    scores = compute_similarities(word)

    # Sérialiser en JSON gzippé
    json_bytes = json.dumps(scores, ensure_ascii=False).encode("utf-8")
    compressed = gzip.compress(json_bytes)

    # Upload vers Firebase Storage
    # (firebase_admin initialisé avec les credentials en env var)
    bucket = storage.bucket()
    blob = bucket.blob(f"semantic/semantic_{date}.json.gz")
    blob.upload_from_string(compressed, content_type="application/gzip")
    blob.make_public()

    return {
        "date": date,
        "word": word,
        "words_computed": len(scores),
        "size_bytes": len(compressed),
        "url": blob.public_url
    }
```

**`french_words.txt`** : copier le fichier `wordle_words.txt` + ajouter des mots plus longs
(le dictionnaire Sémantique doit contenir ~50 000 mots)

**`cc.fr.300.bin`** : le modèle FastText français (2.2 GB)
- Télécharger : https://dl.fbaipublicfiles.com/fasttext/vectors-crawl/cc.fr.300.bin.gz
- Décompresser et uploader dans le Space (via `git lfs`)

> ⚠️ Le modèle fait 2.2 GB. HuggingFace Spaces supporte les gros fichiers via Git LFS.
> La première fois, ça prendra du temps à uploader. Ensuite le Space garde le modèle en cache.

---

### Étape 4 — Variables d'environnement du Space

Dans HuggingFace → Space Settings → Repository secrets :

```
API_KEY          → une clé secrète que tu inventes (ex: "mon-secret-gigglz-2026")
FIREBASE_CREDS   → le contenu JSON du service account Firebase (minifié)
FIREBASE_BUCKET  → ton-projet.appspot.com
```

Pour obtenir le service account Firebase :
Firebase Console → Paramètres projet → Comptes de service → Générer une nouvelle clé privée

---

### Étape 5 — GitHub Actions (automatisation hebdomadaire)

Créer le fichier `.github/workflows/semantic-weekly.yml` dans le repo Gigglz :

```yaml
name: Generate Semantic Daily Files

on:
  schedule:
    - cron: '0 20 * * 0'  # Tous les dimanches à 20h UTC (21h Paris)
  workflow_dispatch:       # Déclenchement manuel possible

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - name: Warmup HuggingFace Space
        run: |
          echo "Réveil du Space..."
          curl -f https://gigglz-semantic-api.hf.space/health || true
          sleep 30  # Attendre que le Space soit prêt

      - name: Verify Space is ready
        run: |
          for i in {1..5}; do
            STATUS=$(curl -s https://gigglz-semantic-api.hf.space/health | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)
            if [ "$STATUS" = "ok" ]; then
              echo "Space prêt !"
              break
            fi
            echo "Tentative $i/5, attente 20s..."
            sleep 20
          done

      - name: Generate semantic files for next 7 days
        env:
          HF_API_KEY: ${{ secrets.HF_API_KEY }}
          # Les mots de la semaine sont définis ici (à mettre à jour chaque semaine)
          WORDS_JSON: ${{ secrets.WEEKLY_SEMANTIC_WORDS }}
          # Format: {"2026-03-01":"CHAT","2026-03-02":"PIANO",...}
        run: |
          python3 - <<'EOF'
          import json, os, urllib.request

          words = json.loads(os.environ['WORDS_JSON'])
          api_key = os.environ['HF_API_KEY']

          for date, word in words.items():
              url = f"https://gigglz-semantic-api.hf.space/compute/{date}/{word}"
              req = urllib.request.Request(url, method='POST')
              req.add_header('x-api-key', api_key)
              with urllib.request.urlopen(req) as r:
                  result = json.loads(r.read())
                  print(f"{date}: {result['words_computed']} mots → {result['size_bytes']} bytes")
          EOF
```

**Secrets GitHub à configurer** (Settings → Secrets → Actions) :
- `HF_API_KEY` : ta clé secrète (la même que dans le Space)
- `WEEKLY_SEMANTIC_WORDS` : JSON des mots de la semaine (à mettre à jour)

---

### Étape 6 — Définir les mots de la semaine

Chaque semaine, dans GitHub → Settings → Secrets → `WEEKLY_SEMANTIC_WORDS`, mettre :

```json
{
  "2026-03-01": "SOURIS",
  "2026-03-02": "MUSIQUE",
  "2026-03-03": "SOLEIL",
  "2026-03-04": "MONTAGNE",
  "2026-03-05": "OCEAN",
  "2026-03-06": "REVE",
  "2026-03-07": "MAISON"
}
```

Et dans Firebase RTDB, ajouter les entrées correspondantes :
```
daily/semantic/2026-03-01/storage_path = "semantic/semantic_2026-03-01.json.gz"
```

---

## 5. Classements

### Modèle de score

**Mot Mystère :**
```
score = (7 - attempts) × 1000 + max(0, 300000 - timeMs) / 100
```
Ex : trouvé en 3 essais en 1min30 → (7-3)×1000 + (300000-90000)/100 = 4000 + 2100 = 6100 pts

**Sémantique :**
```
score = max(0, 2000 - attempts × 10)
```
Ex : trouvé en 35 essais → 2000 - 350 = 1650 pts

### Vues classement

- **Du jour** : les joueurs qui ont joué aujourd'hui, triés par score
- **De la semaine** : cumul des scores des 7 derniers jours
- **All-time** : à voir si nécessaire (complexe à maintenir)

### Affichage

- Top 10 visible pour tous
- Ta position toujours visible (même si hors top 10)
- Avatar + prénom + score + temps/tentatives
- Badge 🥇🥈🥉 pour le podium

---

## 6. Notifications Push

Via Firebase Cloud Messaging + Firebase Functions scheduled :

```javascript
// functions/src/dailyNotification.js
exports.dailyGameNotification = onSchedule(
  { schedule: "0 8 * * *", timeZone: "Europe/Paris" },
  async () => {
    await getMessaging().send({
      notification: {
        title: "🎮 Gigglz — Mots du jour !",
        body: "Mot Mystère et Sémantique vous attendent. Battez vos amis !",
      },
      data: { type: "daily_games" },
      topic: "daily_games",
    });
  }
);
```

---

## 7. UI / Intégration dans l'app

*Basé sur l'analyse des meilleures apps (NYT Games — Apple Design Award 2024, Duolingo, Wordle)*

### Position dans la home — Section dédiée en haut

**❌ Pas d'onglet séparé** — trop fragmenté pour 2 jeux, les gens n'iraient pas voir.
**❌ Pas dans la grille GameCard** — les états visuels sont trop différents.
**✅ Section "Aujourd'hui" fixe en haut de la home**, visible sans scroll, avant les jeux multijoueurs.

NYT Games (référence du genre) : unique home verticale avec sections distinctes, les cards reflètent dynamiquement l'état du jour. Duolingo : le widget de streak a augmenté l'engagement de 60%, les Daily Quests ont boosté les DAU de 25%.

```
HomeHeader
RejoinBanner (si applicable)
─────────────────────────────────
DailyGamesSection           ← NOUVEAU, toujours visible en premier
  DailyCard (Mot Mystère)
  DailyCard (Sémantique)
─────────────────────────────────
GameFilterBar
FavoritesSection (si favoris)
AllGamesSection (grille existante)
```

---

### DailyCard — 3 états visuels distincts

Format : **rectangle horizontal pleine largeur** (~90px de haut), pas carré.
Le scroll horizontal serait une erreur — les utilisateurs ratent souvent du contenu en scroll horizontal.

**État 1 — Non joué**
```
┌─────────────────────────────────────────┐
│  🟩  MOT MYSTÈRE              🔥 7      │
│      Mot du 17 février                  │
│      [JOUER AUJOURD'HUI  →]             │
└─────────────────────────────────────────┘
```

**État 2 — En cours**
```
┌─────────────────────────────────────────┐
│  🟩  MOT MYSTÈRE              🔥 7      │
│      [████████████░░░░░]  3/6           │
│      [REPRENDRE →]                      │
└─────────────────────────────────────────┘
```

**État 3 — Complété**
```
┌─────────────────────────────────────────┐
│  ✓   MOT MYSTÈRE              🔥 7      │
│      Résolu en 4 essais · 2m14s         │
│      [Partager] [Classement]            │
└─────────────────────────────────────────┘
```

**Animation streak en danger** : après 22h si pas encore joué, l'icône 🔥 pulse légèrement.

### Couleurs suggérées

| Jeu | Couleur | Raison |
|-----|---------|--------|
| Mot Mystère | `#10b981` (vert émeraude) | Cohérent avec les cases vertes Wordle |
| Sémantique | `#f97316` (orange) | "Proximité = chaleur", cohérent avec le système de température |

### Comparatif GameCard vs DailyCard

| Élément | GameCard | DailyCard |
|---------|----------|-----------|
| Format | Carré avec image | Rectangle horizontal pleine largeur |
| État | Statique | 3 états dynamiques |
| Info | Nom + joueurs | Nom + streak + progression du jour |
| Storage | Firebase | localStorage / Capacitor Preferences |
| Dans `GAMES` config | ✓ | ✗ (config séparée `dailyGames.js`) |

---

### Fichiers à créer

```
lib/config/dailyGames.js          ← config des jeux daily (id, nom, couleur, route)
lib/hooks/useDailyGame.js         ← localStorage: état du jour, streak, stats perso
lib/components/DailyCard.jsx      ← card stateful avec les 3 états
components/home/DailyGamesSection.jsx  ← wrapper section dans la home
app/daily/motmystere/page.jsx     ← le jeu Mot Mystère
app/daily/semantique/page.jsx     ← le jeu Sémantique
```

---

### Leaderboards — 2 niveaux

**Niveau 1 : Stats personnelles (locales, toujours visibles)**

Affichées sur l'écran de résultats, stockées en localStorage. Zéro friction.

```
Mot Mystère #183
Résolu en 4 essais  •  Temps : 2m14s
Meilleur : 2 essais  •  Série : 🔥 7 jours
Distribution: 1▪ 2▪▪▪ 3▪▪▪▪▪ 4▪▪▪ 5▪ 6▪
```

**Niveau 2 : Classement du jour (Firebase, derrière un tap)**

Accessible via bottom sheet depuis l'écran de résultats (pattern NYT Games).
Top 10 visible + ta position même si hors top 10.

Pour **Sémantique** spécifiquement : afficher le "chemin" (combien de fois dans le top 1000 / top 100 / top 10) en plus du nombre de tentatives — plus riche et moins punitif.

**Scoring :**
- Mot Mystère : `(7 - essais) × 1000 + max(0, 300000 - timeMs) / 100`
- Sémantique : `max(0, 2000 - tentatives × 10)`

---

### Streaks — Bienveillant, pas punitif

Les users avec 7 jours de streak sont 2.4x plus susceptibles de revenir le lendemain.
Mais les streaks punitifs créent de l'anxiété → churn.

- **1 freeze gratuit** tous les 30 jours (ou Pro = streaks protégés)
- Message : "Ton streak est protégé pour aujourd'hui" — jamais "AVERTISSEMENT"
- Milestones : badges à J1, J3, J7, J14, J30, J100 (affichés sur le profil)

### Partage social (effet Wordle)

Bouton "Partager" sur l'écran de résultats, génère un texte sans spoiler :

```
Mot Mystère Gigglz #183 🟩
4/6
⬛⬛⬛⬛⬛
⬛🟨⬛⬛⬛
⬛🟨🟨⬛🟩
🟩🟩🟩🟩🟩
🔥 Série : 7 jours — gigglz.app
```

---

### Notifications — Opt-in contextuel

**Ne pas demander la permission au démarrage.** Attendre que l'utilisateur ait joué 2-3 fois.

| Notification | Heure | Déclencheur |
|-------------|-------|-------------|
| Rappel quotidien | 20h (configurable) | Pas encore joué aujourd'hui |
| Streak en danger | 22h30 | Pas encore joué + streak ≥ 3 |
| Record battu par un ami | Immédiat | Event Firebase |

iOS opt-in = 51% seulement → le message contextuel augmente significativement le taux d'acceptation.

---

## 8. Checklist d'implémentation

### Phase 1 — Mot Mystère
- [ ] Firebase rules pour `daily/wordle`
- [ ] Fichier `wordle_words.txt` dans `/public/data/`
- [ ] Page `/motmystere`
- [ ] Hook `useWordleGame` (logique locale)
- [ ] Submission score → Firebase
- [ ] Vue classement du jour
- [ ] UI card dans la home

### Phase 2 — Sémantique
- [ ] Firebase rules pour `daily/semantic`
- [ ] Setup HuggingFace Space (tuto section 4)
- [ ] GitHub Actions workflow
- [ ] Page `/semantique`
- [ ] Hook `useSemanticGame` (download JSON + lookup local)
- [ ] Submission score → Firebase
- [ ] Vue classement du jour
- [ ] UI card dans la home

### Phase 3 — Notifications
- [ ] Firebase Function scheduled
- [ ] Abonnement FCM côté app (opt-in)
- [ ] Demande de permission notifications (onboarding)

---

*Document créé le 2026-02-17*
