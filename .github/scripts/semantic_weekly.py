import json, os, urllib.request, urllib.error
from datetime import datetime, timedelta, timezone

api_key = os.environ['SEMANTIC_API_KEY']
base_url = os.environ['SEMANTIC_API_URL']

today = datetime.now(timezone.utc).date()
dates = [(today + timedelta(days=i)).isoformat() for i in range(0, 7)]

print(f"Calcul des scores pour : {', '.join(dates)}")
print()

success = 0
for date in dates:
    url = f"{base_url}/compute/{date}"
    req = urllib.request.Request(url, method='POST')
    req.add_header('x-api-key', api_key)
    req.add_header('Content-Length', '0')
    try:
        with urllib.request.urlopen(req, timeout=600) as r:
            result = json.loads(r.read())
            word = result.get('word', '?')
            written = result.get('scores_written', '?')
            print(f"OK {date} — mot : '{word}' — {written} scores ecrits dans Firebase")
            success += 1
    except urllib.error.HTTPError as e:
        print(f"ERREUR {date} — HTTP {e.code}: {e.read().decode()[:300]}")
    except Exception as e:
        print(f"ERREUR {date} — {e}")

print()
print(f"Termine : {success}/{len(dates)} jours calcules avec succes.")
if success < len(dates):
    exit(1)
