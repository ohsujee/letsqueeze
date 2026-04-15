# Sémantique V2 — Notes de migration

> Document de travail qui liste tous les changements du modèle V2 et la checklist de migration vers la prod. Le jeu actuel reste intact tant que tous les points de cette doc n'ont pas été validés en test.

---

## 0. Architecture du jeu V2 parallèle (pendant la phase dev)

### Principe

V2 est un **jeu distinct** coexistant avec V1 pendant la phase dev. Il est **caché derrière `superFoundersOnly: true`** — seul le super-founder (Sujee) le voit sur sa home page. Les joueurs normaux continuent à voir et jouer à V1 sans changement.

### Cohérence des classements

Pendant la phase dev, V2 sert le **même mot du jour que V1** (logique V1 portée dans le backend beta). Les scores V2 sont écrits dans le **même namespace Firebase** que V1 (`daily/semantic/{date}/leaderboard`). Résultat : quand le super-founder joue V2, il contribue au classement officiel comme un joueur V1 normal, juste avec un modèle de scoring différent (NumberBatch au lieu de frWac).

### Deux backends en parallèle

| | V1 (prod) | V2 (beta) |
|---|---|---|
| Container Docker | `gigglz-api` | `gigglz-api-beta` |
| Port VPS | 8000 | 8001 |
| URL publique | `https://punkrecords.gigglz.fun/semantic-api` | `https://punkrecords.gigglz.fun/semantic-api-beta` |
| Modèle | frWac word2vec | NumberBatch 19.08 + filtres V2 |
| API KEY | `API_KEY=8fb7375e...` | `API_KEY=8fb7375e...` (même) |

### Structure frontend LetsQueeze

| Composant | V1 | V2 (nouveau) |
|-----------|----|-----|
| Page | `app/daily/semantique/page.jsx` | `app/daily/semantique-v2/page.jsx` |
| API routes | `app/api/daily/semantic-*` | `app/api/daily/semantic-v2-*` |
| Config jeu | `semantique` dans `dailyGames.js` | `semantique-v2` (avec `superFoundersOnly: true`) |
| Firebase node | `daily/semantic` | `daily/semantic` (**partagé !**) |
| Route frontend | `/daily/semantique` | `/daily/semantique-v2` |
| Env var URL | `SEMANTIC_API_URL` | `SEMANTIC_V2_API_URL` |
| Env var KEY | `SEMANTIC_API_KEY` | fallback sur `SEMANTIC_API_KEY` (pas d'env var dédiée nécessaire) |

Les composants (`SemanticLeaderboard`, `SemanticComponents`, `semantique.css`) sont **mutualisés** — V2 les importe depuis `../semantique/`.

### Structure Punkrecords

Nouvel onglet **Sémantique V2** dans la sidebar :
- Page `/semantique-v2` : identique à `/semantique` mais appelle `/admin/v2-word/{date}` (port 8001)
- Montre les 4 prochains jours avec les mots V2 (post-merge) + voisins NumberBatch
- L'onglet V1 (`/semantique`) reste en place et continue à montrer les mots V1

### Sélection des mots

**V1** (inchangé) : SHA pré-31/03/2026 + permutation cycles seedés `gigglz_semantic_cycle_{N}` après.

**V2** : nouvelle permutation seedée `gigglz_semantic_v2_cycle_{N}` sur la liste réduite **(840 mots − mots V1 joués depuis le lancement 2026-02-18)**. Au moment du setup, 55 mots V1 sont exclus → 785 mots dispos pour V2 → ~10 ans de jeu sans doublons.

La date de démarrage V2 est configurable via env vars `V2_LAUNCH_YEAR/MONTH/DAY` dans `/opt/gigglz-api-beta/.env` (défaut : 2026-04-15). À ajuster au moment du merge réel vers main.

### Endpoints ajoutés au backend beta

- `GET /admin/word/{date}` → mot V1 + 999 voisins NumberBatch (pour onglet Punkrecords V1)
- `GET /admin/v2-word/{date}` → mot V2 + 999 voisins NumberBatch (pour onglet Punkrecords V2)

### Source de vérité pour les mots V1 : proxy sur prod

**Problème rencontré** : répliquer l'algorithme V1 localement dans le beta est fragile, parce que prod filtre la liste de 840 mots par son propre modèle word2vec (qui peut manquer un mot, ex: `cœur`). Le modulo SHA et la permutation dépendent de la longueur effective de la liste, donc si beta a 840 mots et prod 839, les indices divergent → mots complètement différents.

**Solution** : le container beta appelle prod comme source de vérité via HTTP à `https://punkrecords.gigglz.fun/semantic-api/admin/word/{date}` pour obtenir le mot V1 exact. Résultats mis en cache localement (`_V1_WORD_CACHE`). Fallback sur l'algorithme local si prod inaccessible.

**Env vars beta (`/opt/gigglz-api-beta/.env`)** :
```bash
PROD_API_URL=https://punkrecords.gigglz.fun/semantic-api
PROD_API_KEY=8fb7375e1276f6721c6b0912b314b13d6821d09caf484aed1e90669bffd5fb65
```

**Avantage** : pas de risque de divergence entre les mots V1 joués par les vrais joueurs et les mots exclus de V2.

### V1_HISTORY dynamique (pas figé)

`V1_HISTORY` est **reconstruit à chaque démarrage du container beta** en appelant prod pour chaque date entre `GAME_LAUNCH_DATE` (2026-02-18) et `V2_LAUNCH_DATE`. Donc si on attend 2 semaines avant de merger et que V1 joue 14 nouveaux mots entre-temps :

1. On bump `V2_LAUNCH_DATE` dans `/opt/gigglz-api-beta/.env` à la vraie date de merge
2. On restart le container beta (`docker-compose restart gigglz-api-beta`)
3. V1_HISTORY inclut automatiquement les 14 nouveaux mots
4. Pool V2 recalculé, permutation V2 complètement re-seedée sur la liste réduite
5. **Aucun recouvrement possible** entre l'historique V1 complet et le futur V2

Pendant la phase "entre snapshot et merge", l'onglet Punkrecords V2 peut temporairement afficher des mots que V1 joue en prod. C'est normal (c'est une projection basée sur le snapshot actuel). Au merge, tout se réaligne.

### Env vars Vercel à ajouter

```
SEMANTIC_V2_API_URL=https://punkrecords.gigglz.fun/semantic-api-beta
```

La clé `SEMANTIC_V2_API_KEY` est **optionnelle** — les routes V2 tombent automatiquement en fallback sur `SEMANTIC_API_KEY` (identique en VPS).

---

## 1. Changement de modèle : frWac → NumberBatch 19.08

### Modèle actuel (prod)

- **Nom :** `frWac_non_lem_no_postag_no_phrase_200_cbow_cut0.bin`
- **Source :** Jean-Philippe Fauconnier (embeddings.net)
- **Corpus :** frWaC (web français, 1.6 milliards de mots)
- **Architecture :** Word2Vec CBOW, 200 dimensions
- **Vocabulaire brut :** 3.6M mots
- **Vocabulaire filtré (LEFFF + singulier + accents) :** ~119k mots

### Modèle V2 (beta, sur Punkrecords `/model-test`)

- **Nom :** `numberbatch-19.08.txt.gz` (filtré sur le français)
- **Source :** ConceptNet NumberBatch 19.08
- **Corpus :** Word2Vec + GloVe + **graphe de connaissances ConceptNet** (sens commun humain)
- **Architecture :** Retrofitted word embeddings, 300 dimensions
- **Vocabulaire brut :** 1 199 463 mots français
- **Vocabulaire filtré :** ~285k mots

### Pourquoi ce changement

Le modèle frWac (word2vec) capture la **co-occurrence statistique** dans du texte web uniquement. NumberBatch ajoute à ces embeddings un **retrofitting** via le graphe de connaissances ConceptNet qui encode des relations humaines explicites :

- `lunettes → RelatedTo → yeux`
- `lunettes → UsedFor → voir`
- `lunettes → RelatedTo → soleil`

Ces liens de sens commun sont directement injectés dans l'espace vectoriel, ce qui aligne la similarité cosinus sur l'intuition humaine au lieu de la simple co-occurrence textuelle.

NumberBatch a gagné la compétition internationale **SemEval 2017 Task 2** (Multilingual Semantic Word Similarity), 1ère place toutes langues confondues — c'est littéralement le benchmark de référence pour ce que le jeu sémantique fait.

### Scoring conservé

Le système de scoring reste **identique** :
- Cosinus de similarité entre le mot cible et le mot testé
- Rang 1 à 999 parmi les voisins filtrés (les plus proches)
- Rang 1000 pour le mot exact (solved)
- Formule de points finale inchangée : `max(100, 5000 / (1 + 0.05 * (attempts - 1)))`

---

## 2. Nouvelle liste : pluriels à conserver (`PLURAL_WHITELIST`)

### Problème en V1

Le filtre actuel exclut tous les mots en `-s` / `-x` dont le singulier existe dans le modèle. Résultat : des mots qui sont en pratique **toujours ou majoritairement au pluriel** en français sont exclus du jeu ou demandent au joueur d'écrire le singulier :

- `yeux` → le joueur doit écrire `œil` (rare en usage courant)
- `cheveux` → doit écrire `cheveu`
- `gens` → doit écrire une forme singulière absurde
- `toilettes` (WC) → `toilette` (action de se laver) — sens différent !

### Solution V2

Ajout d'une **whitelist curée** dans `app.py` qui protège ces mots du filtre singulier/pluriel :

```python
PLURAL_WHITELIST = {
    # Pluralia tantum stricts
    "lunettes", "ciseaux", "vacances", "fiançailles", "funérailles",
    "obsèques", "mœurs", "entrailles", "archives", "environs",
    "ténèbres", "représailles", "condoléances", "pénates",
    "victuailles", "armoiries", "catacombes", "décombres",
    "arrhes", "affres", "épousailles", "floralies", "agapes",
    "annales", "gémonies",
    # Pluriels majoritairement employés
    "yeux", "cheveux", "gens", "parents", "applaudissements",
    "félicitations", "remerciements", "excuses",
    # Pluriels à sens propre (≠ singulier)
    "affaires", "devoirs", "toilettes", "papiers", "courses",
    "jumelles", "menottes", "écouteurs", "baskets", "bretelles",
    "collants", "chaussettes", "chaussures", "bijoux",
    "provisions", "emplettes", "commissions",
    # Collectifs courants
    "moustaches", "sourcils", "cils",
}
```

### Impact sur le gameplay

1. **Côté voisins** : ces pluriels apparaîtront dans la liste des 999 mots les plus proches du mot cible.
2. **Côté input joueur** : quand le joueur tape un de ces mots, il n'est **plus** rejeté avec le message "Écris le mot au singulier" (HTTP 422).

### À faire en continu

Cette liste est **extensible**. Au fil des observations en jeu (mots mal classés, retours joueurs), on ajoutera les formes manquantes. Garder ce fichier à jour à chaque ajout.

---

## 2 bis. Filtre des conjugaisons et inflexions (LEFFF_INFLECTED)

### Problème détecté en V1

Le filtre LEFFF actuel ajoute **toutes** les formes françaises à `LEFFF_VALID` — y compris les conjugaisons de verbes et les inflexions d'adjectifs. Résultat : pour le mot cible `chaussures`, la liste des voisins contient des formes comme `chaussa`, `chausserait`, `chaussasse`, `chausseras`… alors qu'on veut uniquement des mots de forme de base (noms communs, infinitifs, adjectifs au masculin singulier).

### Solution V2

Construction d'un set `LEFFF_INFLECTED` qui contient uniquement les mots dont **toutes** les entrées LEFFF sont des formes fléchies (verbe conjugué ou adjectif inflecté avec `word ≠ lemma`) :

- `chaussa` → seulement V(lemma=chausser) → **EXCLU**
- `chausser` → V(lemma=chausser) → infinitif, word == lemma → **GARDÉ**
- `chaussée` → V(lemma=chausser) + NC(lemma=chaussée) → a un sens nominal → **GARDÉ**
- `bonne` → ADJ(lemma=bon) → **EXCLU** (sauf si aussi listé comme NC)
- `chausseur` → NC(lemma=chausseur) → **GARDÉ**

Ajout dans la construction du `VALID_VOCAB` :
```python
if w in LEFFF_INFLECTED and w not in PLURAL_WHITELIST:
    continue
```

Les pluralia tantum (whitelist) passent outre ce filtre au cas où un mot y figurerait.

### Impact attendu

Le `VALID_VOCAB` devrait passer de **~285k** à un nombre significativement plus bas (on estime 120-180k mots de base). Les listes de voisins deviendront propres : plus de verbes conjugués parasites.

### Règle respectée

Les **infinitifs sont conservés** (ex : `chausser`, `manger`, `courir`) car pour un verbe à l'infinitif on a `word == lemma`, donc la condition d'exclusion est fausse. Les joueurs pourront donc deviner avec des infinitifs comme proposition.

### Note importante — fix du tag POS

Dans la V1, le filtre LEFFF cherchait `pos.startswith("NPP")` pour exclure les noms propres. **Or LEFFF utilise des tags POS en minuscules** (`np`, `v`, `adj`, `nc`…) — le filtre NPP n'a donc jamais rien filtré en V1. Le V2 corrige ça en utilisant `pos == "np"`, `pos.startswith("v")`, `pos.startswith("adj")`.

---

## 2 ter. Fallback de détection des pluriels (mots rares)

### Problème détecté

Le filtre pluriel actuel utilise `simplemma.lemmatize()` pour détecter les pluriels. Mais simplemma ne connaît que les mots courants du français standard. Pour des mots rares présents dans NumberBatch (noms communs obscurs ou termes techniques), simplemma retourne le mot inchangé et le pluriel n'est pas filtré.

Exemples observés dans les voisins : `guénières` + `guénière`, `corsetages` + `corsetage`, `encravatements` + `encravatement`, `gainages` + `gainage`, `trés-pointes` + `trés-pointe`, `macfarlanes` + `macfarlane`.

### Solution V2

Ajout d'une étape 2 en fallback : si simplemma ne reconnaît pas le mot et que le mot se termine par `s`/`x`, on retire juste le dernier caractère et on vérifie si le singulier existe dans le modèle. Si oui, le pluriel est exclu.

```python
# Après le check simplemma sans match :
if len(w) > 2:
    singular = w[:-1]
    if (singular in model.key_to_index
        or _stripped_to_model.get(strip_accents(singular), None) is not None):
        continue
```

### Ordre des 3 étapes

1. **Simplemma** — pluriels irréguliers (chevaux → cheval, travaux → travail, bijoux → bijou…)
2. **Strip -s/-x final** — pluriels réguliers de mots rares que simplemma ignore
3. **Variante accent** — pluriel sans accent dont le singulier accentué existe dans le modèle

---

## 2 quater. Filtre de fréquence d'usage (wordfreq)

### Problème détecté

NumberBatch contient 1.2M mots français, dont une grande partie est **trop rare, technique ou archaïque** pour un jeu grand public : termes d'héraldique, de botanique obscure, noms propres transformés en adjectifs, mots littéraires du 19e siècle, etc. Même Cemantix (le vrai jeu) ne les accepte pas.

Exemples observés : `guénière`, `trés-pointe`, `macfarlane`, `encravatement`, `corsetage`, `gainage`…

### Solution V2 : wordfreq

Ajout de la librairie [`wordfreq`](https://pypi.org/project/wordfreq/) qui agrège des fréquences de mots depuis plusieurs corpus français (Wikipédia, sous-titres de films, actualités, Twitter, livres) sur l'échelle **Zipf** (0–8) :

- `7.0+` → mots grammaticaux (le, de, et…)
- `5.0-6.0` → très commun (maison, voiture, manger)
- `4.0-5.0` → commun (chaussure, lunettes, soleil)
- `3.0-4.0` → connu mais moins fréquent (escarpin, godasse)
- `2.0-3.0` → rare mais usuel dans un contexte
- `< 2.0` → rare / technique / archaïque

### Configuration

Le seuil est **réglable via `.env`** pour tuner sans rebuild :

```bash
WORDFREQ_MIN_ZIPF=2.5
```

Valeur actuelle du beta : **2.5** (mot rare mais compréhensible en contexte accepté).

### Application

Dans la construction du `VALID_VOCAB`, après les filtres LEFFF et pluriel, on vérifie le Zipf. Si `< MIN_ZIPF` (et sur la version sans accents aussi, au cas où), le mot est exclu. La `PLURAL_WHITELIST` passe outre ce filtre.

```python
if w not in PLURAL_WHITELIST:
    zipf = zipf_frequency(w, "fr")
    if zipf < MIN_ZIPF:
        zipf_stripped = zipf_frequency(strip_accents(w), "fr")
        if zipf_stripped < MIN_ZIPF:
            continue
```

### Impact attendu

À `zipf=2.5`, le `VALID_VOCAB` devrait encore diminuer significativement (de ~64k à probablement 30-40k mots), ne gardant que les mots qu'un locuteur francophone peut raisonnablement connaître. C'est le même niveau de vocabulaire que Cemantix ou les dictionnaires courants.

### Tuning en production

On peut ajuster le seuil au fur et à mesure :
- Trop strict (joueurs se plaignent que des mots courants sont exclus) → baisser à 2.0 ou 1.8
- Trop laxiste (mots obscurs apparaissent encore) → monter à 2.8 ou 3.0

Un simple `docker restart gigglz-api-beta` après changement du `.env` suffit (pas de rebuild nécessaire).

---

## 3. Checklist migration vers la prod

À faire **une fois les tests validés sur `/model-test`** :

### Fichiers à modifier

- [ ] `/opt/gigglz-api/app.py` (prod) — remplacer par la version V2 (NumberBatch + PLURAL_WHITELIST)
- [ ] `/opt/gigglz-api/.env` — retirer `FAUCONNIER_MODEL_URL`, adapter si besoin
- [ ] `/opt/gigglz-api/Dockerfile` — inchangé (gensim + simplemma suffisent)
- [ ] `/opt/gigglz-api/model_cache/` — remplacer `model.bin` par `model.txt` (NumberBatch FR extrait)

### Déploiement (jour du merge — stratégie recommandée)

**Étapes du merge V1 → V2 en prod** :

1. **Bump la date V2_LAUNCH_DATE** dans `/opt/gigglz-api-beta/.env` à la date réelle du merge :
   ```bash
   V2_LAUNCH_YEAR=YYYY
   V2_LAUNCH_MONTH=MM
   V2_LAUNCH_DAY=DD
   ```
2. **Restart beta** : `cd /opt/gigglz-api-beta && docker-compose restart`
   → V1_HISTORY se reconstruit depuis prod et intègre tous les mots joués entre le snapshot initial et le merge
3. **Vérifier** : `/admin/v2-word/{merge_date}` renvoie bien un mot qui n'est pas dans l'historique V1
4. **Merger `refacto/tier1` vers `main`** sur GitHub → Vercel redéploie la prod
5. **Côté app Capacitor** : aucune action requise si la card V2 reste `superFoundersOnly: true` jusqu'au moment où on veut vraiment passer tout le monde sur V2
6. Pour le **switch définitif** (V2 devient le jeu principal pour tout le monde) :
   - Option A : renommer la card `semantique-v2` en `semantique` dans `dailyGames.js`, supprimer l'ancienne, route `/daily/semantique` pointe sur V2
   - Option B : garder les deux en parallèle comme jeux distincts (V1 "Classique", V2 "Plus")

### Déploiement — ancienne approche (rejetée, gardée pour info)

~~Remplacer directement le modèle sur le container prod (gigglz-api)~~ — trop risqué, le beta est déjà opérationnel avec NumberBatch + filtres. Le chemin propre est de faire du V2 un jeu séparé puis de renommer.

### Recalcul des scores Firebase

⚠️ **Important** : tous les scores pré-calculés dans Firebase (`daily/semantic/{date}/scores`) correspondent à l'ancien modèle. Après migration :

- [ ] Lancer le workflow GitHub Actions `semantic-weekly.yml` manuellement pour recalculer les 7 prochains jours
- [ ] Les scores des dates passées restent avec l'ancien modèle (pas impactant car déjà joués)

### Documentation utilisateur à mettre à jour

- [ ] **Comment jouer** (modal in-game du jeu sémantique) — mentionner que :
  - Les pluriels comme `yeux`, `cheveux`, `lunettes` sont acceptés tels quels
  - Les accents sont facultatifs (déjà le cas)
  - (optionnel) que le modèle comprend le sens commun, pas uniquement les co-occurrences de texte

- [ ] Mettre à jour `SEMANTIQUE.md` pour refléter NumberBatch au lieu de frWac
- [ ] Archiver ce doc (`SEMANTIQUE_V2.md`) une fois la migration faite

### Métriques à surveiller post-migration

- Distribution des tentatives moyennes par partie (la V2 devrait être plus intuitive → moins de tentatives)
- Taux de succès sur 7 jours glissants
- Feedback Discord / avis App Store sur la difficulté

---

## 4. État actuel (15 avril 2026)

### Fait

- ✅ NumberBatch téléchargé et extrait (1.19M mots français)
- ✅ Container beta `gigglz-api-beta` (port 8001) en ligne avec NumberBatch + tous les filtres V2
- ✅ Filtres V2 :
  - LEFFF case-sensitive fix (`np`, `v`, `adj`)
  - PLURAL_WHITELIST (63 mots)
  - LEFFF_INFLECTED (conjugaisons de verbes, inflexions adjectifs)
  - Strip `-s/-x` fallback pour pluriels de mots rares
  - wordfreq zipf ≥ 2.5 (mots trop rares exclus)
- ✅ Matrice VALID_VOCAB normalisée pour top-N voisins garanti (pas de "66/999")
- ✅ Page Punkrecords `/model-test` refondue : sélection de mots récents + testeur unifié
- ✅ Logique V1 portée dans le beta (SHA + permutation) pour servir le même mot que prod
- ✅ Logique V2 implémentée (nouvelle permutation excluant historique V1)
- ✅ Jeu V2 frontend créé : `app/daily/semantique-v2/` + 4 routes API `semantic-v2-*`
- ✅ Config dailyGames.js : entrée `semantique-v2` avec `superFoundersOnly: true`
- ✅ DailyGamesSection.jsx : étendu à 5 jeux
- ✅ Onglet Punkrecords `/semantique-v2` + entrée Sidebar
- ✅ Endpoints backend `/admin/word/{date}` (V1) et `/admin/v2-word/{date}` (V2) avec 999 voisins

### Fait (suite — bugs et améliorations)

- ✅ Bug fix : liste V1 mismatch (prod filtre par son modèle, NumberBatch n'a pas les mêmes mots) → solution : beta proxy sur prod comme source de vérité
- ✅ Env vars beta : `PROD_API_URL=https://punkrecords.gigglz.fun/semantic-api`, `PROD_API_KEY=...`
- ✅ Cache local `_V1_WORD_CACHE` pour éviter les appels répétés à prod
- ✅ V1_HISTORY reconstruit dynamiquement au démarrage (pas figé en dur)
- ✅ Commit `504a0c2` + push sur `origin/refacto/tier1`
- ✅ Env var Vercel `SEMANTIC_V2_API_URL` ajoutée par Sujee

### À faire

- ⏳ Tests super-founder via preview Vercel ou app mobile (swap capacitor.config.ts)
- ⏳ Refonte redesign complète du jeu (prévu dans les 1-2 semaines — priorité de Sujee)
- ⏳ Validation qualitative du modèle V2 sur plusieurs jours
- ⏳ Décision go/no-go pour le merge vers main

### Au moment du merge (dans 1-2 semaines environ)

1. **Bump** `V2_LAUNCH_YEAR/MONTH/DAY` dans `/opt/gigglz-api-beta/.env` à la vraie date de merge
2. `docker-compose restart gigglz-api-beta` → V1_HISTORY se reconstruit avec les ~14 mots additionnels joués entretemps → pool V2 ajusté → permutation re-seedée → zéro recouvrement garanti
3. `git merge refacto/tier1` vers main → Vercel redéploie la prod
4. **Pendant la phase dev (avant merge)** : acceptable que l'onglet Punkrecords V2 affiche des mots qui seront joués par V1 d'ici le merge. C'est une projection basée sur le snapshot actuel. Au merge, tout se réaligne automatiquement.
5. Mettre à jour la modal "Comment jouer" du jeu pour mentionner :
   - Les pluriels courants (yeux, lunettes, cheveux...) sont acceptés tels quels
   - Le modèle comprend maintenant le sens commun, pas seulement la co-occurrence
6. Archiver ce doc (`SEMANTIQUE_V2.md` → `docs/archive/`) une fois la migration consolidée
