#!/bin/bash
# Script pour lancer ngrok avec le domaine personnalisé LetsQueeze
# Usage: ./scripts/start-ngrok.sh

NGROK_PATH="/c/Users/ohsuj/AppData/Local/npm-cache/_npx/094a17e86d981b10/node_modules/ngrok/bin/ngrok.exe"
DOMAIN="ja-subloral-estella.ngrok-free.dev"
PORT=3000

echo "Lancement de ngrok sur le port $PORT avec le domaine $DOMAIN..."
"$NGROK_PATH" http $PORT --domain=$DOMAIN
