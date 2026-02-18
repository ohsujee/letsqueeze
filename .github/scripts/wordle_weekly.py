import json, os, hashlib, urllib.request
from datetime import datetime, timedelta, timezone
import firebase_admin
from firebase_admin import credentials, db

# Charger la liste des mots cibles depuis GitHub
repo = os.environ.get('GITHUB_REPOSITORY', 'ohsujee/letsqueeze')
url = f"https://raw.githubusercontent.com/{repo}/main/public/data/wordle_targets.txt"
with urllib.request.urlopen(url, timeout=30) as r:
    words = [w.strip().lower() for w in r.read().decode().splitlines() if w.strip() and len(w.strip()) == 5]

print(f"{len(words)} mots cibles charges.")

# Init Firebase Admin
# Strip surrounding quotes (if copied from .env.local format) + replace literal \n
private_key = os.environ['FIREBASE_PRIVATE_KEY'].strip('"\'').replace('\\n', '\n')
cred = credentials.Certificate({
    "type": "service_account",
    "project_id": os.environ['FIREBASE_PROJECT_ID'],
    "private_key": private_key,
    "client_email": os.environ['FIREBASE_CLIENT_EMAIL'],
    "token_uri": "https://oauth2.googleapis.com/token",
})
firebase_admin.initialize_app(cred, {
    'databaseURL': os.environ['FIREBASE_DATABASE_URL']
})

today = datetime.now(timezone.utc).date()
dates = [(today + timedelta(days=i)).isoformat() for i in range(0, 7)]

success = 0
for date in dates:
    # Selection deterministe par hash de date
    h = int(hashlib.sha256(date.encode()).hexdigest(), 16)
    word = words[h % len(words)]

    # Ecrire seulement si pas deja defini
    ref = db.reference(f'daily/wordle/{date}/word')
    existing = ref.get()
    if existing:
        print(f"SKIP {date} — mot deja defini : '{existing}'")
        success += 1
        continue

    ref.set(word)
    print(f"OK {date} — mot assigne")
    success += 1

print()
print(f"Termine : {success}/{len(dates)} jours assignes.")
if success < len(dates):
    exit(1)
