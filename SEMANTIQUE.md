# Sémantique — Architecture & Guide Complet

> Documentation technique du jeu daily Sémantique dans Gigglz.

---

## 1. Vue d'ensemble

Sémantique est un jeu de devinette sémantique : le joueur doit trouver le mot secret du jour en recevant pour chaque essai sa **proximité sémantique** avec le mot cible. Plus le mot est proche, plus il est "chaud".

**Particularités :**
- Jeu 100% solo (pas de room Firebase, pas de lobby)
- Un mot par jour, identique pour tous les joueurs
- Scores pré-calculés à l'avance → réponses instantanées
- Sélection du mot **100% automatique** via hash déterministe de la date

---

## 2. Dataset — Pourquoi Fauconnier frWac ?

### Ce que le vrai Cémantix utilise

Le jeu [Cémantix](https://cemantix.certitudes.org/) utilise les embeddings word2vec de **Jean-Philippe Fauconnier** entraînés sur le corpus **frWac** (1,6 milliard de mots du web français, domaines `.fr`).

### Pourquoi PAS sentence-transformers

Notre implémentation initiale utilisait `paraphrase-multilingual-MiniLM-L12-v2`. Ce modèle est conçu pour comparer des **phrases entières** (paraphrase detection), pas des mots isolés. Sur des mots seuls, les similarités sont incohérentes et les résultats peu fiables pour un jeu.

### Pourquoi Fauconnier frWac

| Aspect | Fauconnier frWac word2vec | sentence-transformers MiniLM |
|--------|--------------------------|------------------------------|
| Type | Embeddings statiques (1 vecteur par mot) | Embeddings contextuels (phrases) |
| Corpus | 1,6B mots français du web | Multilingue, paires de paraphrases |
| Granularité | **Mot-niveau** ✓ | Phrase-niveau ✗ |
| Précision French | Entraîné 100% en français ✓ | Multilingue (dilué) |
| Inférence | Lookup table (instantané, pas GPU) | Forward pass neural (lent) |
| Comportement jeu | Co-occurrence distributionnelle ✓ | Paraphrase sémantique ✗ |

**Conclusion** : frWac mesure la co-occurrence — deux mots sont proches s'ils apparaissent dans les mêmes contextes ("chaud" et "froid" sont proches car tous deux dans "il fait ___"). C'est exactement le signal qu'utilise Cémantix.

### Télécharger le modèle

Page officielle : **https://fauconnier.github.io/#data**

Modèle recommandé : `frWac_non_lem_no_postag_no_phrase_200_cbow_cut0` (~200MB)
- 200 dimensions — bon équilibre qualité/taille
- `cbow` — bon pour les mots fréquents
- `cut0` — vocabulaire maximal (tous les mots du corpus)
- `non_lem` — formes fléchies (plus naturel pour un jeu)

Copier l'URL de téléchargement depuis la page Fauconnier et la configurer comme secret `FAUCONNIER_MODEL_URL` dans le HF Space.

---

## 3. Système de scoring — Rang 1–1000

### Principe

Contrairement à notre première implémentation (cosinus normalisé 0–1), le vrai système Cémantix utilise un **rang parmi les 1000 voisins les plus proches** :

| Valeur | Signification |
|--------|---------------|
| `1000` | Le mot secret lui-même (victoire) |
| `999` | Le voisin le plus proche du mot secret |
| `500` | Le 500ème voisin le plus proche |
| `1` | Le 1000ème voisin le plus proche |
| Absent | Mot hors top 1000 ("froid") |

### Conversion pour l'affichage

Pour conserver le système de températures existant :

```
score_display = rank / 1000   → 0.001 à 1.0
celsius = score_display × 100 → 0.1°C à 100°C
```

Seuils de température :
- `≥ 100°C` → 🎯 Trouvé !
- `≥ 50°C` → 😱 Brûlant (top 50)
- `≥ 40°C` → 🔥 Très chaud (top 100)
- `≥ 20°C` → 😎 Chaud (top 300)
- `≥ 0°C` → 🥶 Froid (top 1000)
- `< 0°C` → 🧊 Glacial (hors top 1000)

---

## 4. Sélection automatique du mot

### Algorithme

Le mot du jour est sélectionné de façon **100% déterministe** à partir de la date :

```python
# Python (HF Space + GitHub Action)
import hashlib, struct

def get_word_for_date(date_str: str, words: list) -> str:
    h = hashlib.sha256(date_str.encode()).digest()
    n = struct.unpack('>I', h[:4])[0]  # unsigned big-endian 32-bit
    return words[n % len(words)]
```

```javascript
// JavaScript (si jamais nécessaire côté client)
async function getWordForDate(dateStr, words) {
  const data = new TextEncoder().encode(dateStr);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const view = new DataView(hashBuffer);
  const n = view.getUint32(0, false); // big-endian unsigned
  return words[n % words.length];
}
```

**Propriétés :**
- Même date → toujours le même mot
- Aucune intervention humaine nécessaire
- Identique en Python (HF Space) et JS (client si besoin)
- Le mot change exactement à minuit UTC

### Pool de mots cibles

Fichier : `public/data/semantic_words.txt`
- ~300 noms communs français fréquents
- Tous présents dans le vocabulaire Fauconnier frWac
- Filtrés automatiquement au démarrage du HF Space
- Mots trop rares automatiquement exclus (pas dans le modèle)

---

## 5. Gestion des accents

### Règle

Les accents font partie de l'orthographe française correcte (`étoile` ≠ `etoile` dans le modèle Fauconnier). Cependant, pour améliorer l'UX mobile, le système stocke **les deux formes** dans Firebase :

```python
# HF Space — lors du calcul
scores["forêt"] = rank     # forme canonique
scores["foret"] = rank     # forme sans accent → même rang
```

Ainsi le joueur peut taper `foret` ou `forêt` — les deux fonctionnent.

---

## 6. Architecture technique

### Flux complet

```
Chaque dimanche 20h UTC
      ↓
GitHub Actions (semantic-weekly.yml)
      ↓ [warmup HF Space]
      ↓ [POST /compute/2026-02-17 ... /compute/2026-02-23]
      ↓
HuggingFace Space (FastAPI + gensim + Fauconnier)
      ↓ [calcul 999 voisins × 7 jours]
      ↓
Firebase RTDB
  daily/semantic/2026-02-17/
    ├── word: "musique"
    └── scores: { "musique": 1000, "chanson": 999, ... "bruit": 1, "foret": 750, "forêt": 750 }
      ↓
Joueur ouvre Sémantique (Next.js)
      ↓ [charge scores depuis Firebase → instantané]
      ↓ [chaque essai = lookup local, pas d'API]
      ↓
Victoire → écriture dans Firebase leaderboard
```

### Firebase Structure

```
daily/semantic/{YYYY-MM-DD}/
  ├── word: "musique"           ← mot secret (lisible, mais pas affiché au joueur)
  └── scores: {                 ← ~1000-2000 entrées (accents + sans accents)
      "musique": 1000,          ← target word
      "chanson": 999,           ← nearest neighbor
      "melodie": 998,
      ...
      "son": 1,                 ← 999th neighbor
      "bruit": 450,             ← somewhere in the middle
      "foret": 750,             ← unaccented variant
      "forêt": 750              ← canonical
    }
  └── leaderboard/{uid}/        ← écrit par le client après victoire
      ├── name, score, attempts, timeMs, solvedAt
```

---

## 7. HuggingFace Space — Setup

### Secrets à configurer

Aller sur https://huggingface.co/spaces/letsqueeze/gigglz-semantic-api → Settings → Repository secrets

| Secret | Valeur |
|--------|--------|
| `API_KEY` | Clé secrète aléatoire (générer avec `openssl rand -hex 32`) |
| `FAUCONNIER_MODEL_URL` | URL de téléchargement du modèle frWac depuis https://fauconnier.github.io/#data |
| `FIREBASE_CREDS` | Contenu JSON du service account Firebase (Firebase Console → Project Settings → Service accounts → Generate new private key) |
| `FIREBASE_DATABASE_URL` | URL de la RTDB Firebase (ex: `https://ton-projet-rtdb.europe-west1.firebasedatabase.app`) |

### Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Statut + nb de mots chargés + taille vocabulaire |
| `POST /compute/{date}` | Calcule et écrit dans Firebase les scores pour cette date (mot auto-sélectionné) |

Header requis : `x-api-key: {API_KEY}`

### Temps de démarrage à froid

- Téléchargement du modèle (~200MB) : ~30–60s selon réseau
- Chargement gensim : ~10–20s
- Filtrage du vocabulaire : ~5s
- **Total cold start : ~1–2 minutes**

Le GitHub Action attend jusqu'à 6 minutes avant de commencer le calcul.

---

## 8. GitHub Actions — Setup

### Secret à configurer

GitHub repo → Settings → Secrets and variables → Actions

| Secret | Valeur |
|--------|--------|
| `HF_API_KEY` | Même valeur que le secret `API_KEY` du HF Space |

**Plus besoin de `WEEKLY_SEMANTIC_WORDS`** — tout est automatique.

### Déclenchement

- **Automatique** : Chaque dimanche à 20h UTC (21h heure française)
- **Manuel** : GitHub → Actions → "Generate Semantic Daily Scores" → Run workflow

Le workflow calcule les 7 jours suivants (du jour courant + 6 jours).

---

## 9. Règles du jeu et UX

### Mots acceptés
- Tout mot présent dans le vocabulaire Fauconnier (environ quelques centaines de milliers)
- Mots hors vocabulaire → message "Mot non reconnu"
- Mots déjà essayés → message "Mot déjà essayé"

### Affichage
- Le dernier essai affiché en haut (latest entry)
- Les essais précédents triés par score décroissant
- Rang affiché avec barre de progression si dans le top 1000

### Fin de partie
- Victoire : trouver le mot exact (rank = 1000)
- Pas de limite d'essais (jeu infini, comme Cémantix)
- Score final : `max(100, floor(5000 / nb_essais))`

---

## 10. Maintenance

### Changer les mots cibles

Modifier `public/data/semantic_words.txt` → pusher sur main → les prochains calculs HF Space utiliseront la liste mise à jour.

### Relancer le calcul manuellement

GitHub → Actions → "Generate Semantic Daily Scores" → Run workflow.

Ou via curl :
```bash
curl -X POST https://letsqueeze-gigglz-semantic-api.hf.space/compute/2026-02-17 \
  -H "x-api-key: YOUR_API_KEY"
```

### Vérifier que les scores sont dans Firebase

Firebase Console → Realtime Database → `daily/semantic/2026-02-17/scores`

---

*Dernière mise à jour : 2026-02-18*
