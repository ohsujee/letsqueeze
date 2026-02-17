/**
 * Télécharge Lexique383 et génère public/data/wordle_words.txt
 * avec tous les mots français de 5 lettres (normalisés sans accents).
 * Usage: node scripts/build-word-list.js
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const TSV_URL =
  'http://www.lexique.org/databases/Lexique383/Lexique383.tsv';

function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function download(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  console.log('Téléchargement de Lexique383...');
  const tsv = await download(TSV_URL);

  const lines = tsv.split('\n');
  const header = lines[0].split('\t');
  const orthoIdx = header.indexOf('ortho');

  if (orthoIdx === -1) {
    throw new Error('Colonne "ortho" introuvable. Headers: ' + header.slice(0, 5).join(', '));
  }

  const words = new Set();

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    const ortho = cols[orthoIdx]?.trim();
    if (!ortho) continue;

    const norm = normalize(ortho);

    // Exactement 5 lettres, que des lettres (pas de tiret, chiffre, apostrophe)
    if (norm.length !== 5) continue;
    if (!/^[a-z]{5}$/.test(norm)) continue;

    words.add(norm);
  }

  const sorted = [...words].sort();
  console.log(`${sorted.length} mots uniques de 5 lettres trouvés.`);

  const outPath = path.join(__dirname, '../public/data/wordle_words.txt');
  fs.writeFileSync(outPath, sorted.join('\n') + '\n', 'utf8');
  console.log(`Écrit dans ${outPath}`);
}

main().catch((err) => {
  console.error('Erreur:', err.message);
  process.exit(1);
});
