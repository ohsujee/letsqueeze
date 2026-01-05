@echo off
REM Script pour lancer ngrok avec le domaine personnalise LetsQueeze
REM Double-cliquez sur ce fichier ou lancez-le depuis le terminal

set NGROK_PATH=C:\Users\ohsuj\AppData\Local\npm-cache\_npx\094a17e86d981b10\node_modules\ngrok\bin\ngrok.exe
set DOMAIN=ja-subloral-estella.ngrok-free.dev
set PORT=3000

echo Lancement de ngrok sur le port %PORT% avec le domaine %DOMAIN%...
echo.
echo URL publique: https://%DOMAIN%
echo.

"%NGROK_PATH%" http %PORT% --domain=%DOMAIN%

pause
