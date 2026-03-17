import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';

const QUIZ_DIR = '/opt/letsqueeze/public/data/quiz';
const SUGGESTIONS_FILE = '/opt/punkrecords/data/quiz-suggestions.json';
const VALIDATIONS_FILE = '/opt/punkrecords/data/quiz-validations.json';
const OWNER = 'ohsujee';
const REPO = 'letsqueeze';
const BRANCH = 'main';
const QUIZ_PATH_PREFIX = 'public/data/quiz';

function githubHeaders() {
  return {
    'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };
}

function gitBlobSha(content) {
  const buf = Buffer.from(content, 'utf8');
  const header = Buffer.from(`blob ${buf.byteLength}\0`);
  return crypto.createHash('sha1').update(Buffer.concat([header, buf])).digest('hex');
}

function readJson(file) {
  try {
    if (!existsSync(file)) return {};
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch { return {}; }
}

// Compare les fichiers locaux avec GitHub, retourne la liste des fichiers modifies
async function getModifiedFiles() {
  const refRes = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`,
    { headers: githubHeaders(), cache: 'no-store' }
  );
  if (!refRes.ok) throw new Error('Impossible de recuperer la ref de la branche');
  const latestCommitSha = (await refRes.json()).object.sha;

  const commitRes = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/git/commits/${latestCommitSha}`,
    { headers: githubHeaders(), cache: 'no-store' }
  );
  if (!commitRes.ok) throw new Error('Impossible de recuperer le commit');
  const baseTreeSha = (await commitRes.json()).tree.sha;

  const treeRes = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/git/trees/${baseTreeSha}?recursive=1`,
    { headers: githubHeaders(), cache: 'no-store' }
  );
  if (!treeRes.ok) throw new Error('Impossible de recuperer l\'arbre Git');
  const githubTree = await treeRes.json();

  const remoteShas = {};
  for (const item of githubTree.tree) {
    if (item.type === 'blob') remoteShas[item.path] = item.sha;
  }

  const files = readdirSync(QUIZ_DIR).filter(f => f.endsWith('.json') && f !== 'manifest.json');
  const modified = [];
  for (const filename of files) {
    const localContent = readFileSync(join(QUIZ_DIR, filename), 'utf8');
    const remotePath = `${QUIZ_PATH_PREFIX}/${filename}`;
    const localSha = gitBlobSha(localContent);
    if (remoteShas[remotePath] !== localSha) {
      modified.push({ filename, path: remotePath, content: localContent });
    }
  }

  return { modified, baseTreeSha, latestCommitSha };
}

// Enrich modified files with stats
function enrichWithStats(modified) {
  const allSuggestions = readJson(SUGGESTIONS_FILE);
  const allValidations = readJson(VALIDATIONS_FILE);

  // Read manifest for theme titles
  let manifest = { categories: [] };
  try {
    const manifestPath = join(QUIZ_DIR, 'manifest.json');
    if (existsSync(manifestPath)) {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    }
  } catch {}
  const themeMap = {};
  for (const cat of manifest.categories || []) {
    for (const t of cat.themes || []) {
      themeMap[t.id] = { title: t.title, emoji: t.emoji, category: cat.name };
    }
  }

  return modified.map(f => {
    const themeId = f.filename.replace('.json', '');
    const meta = themeMap[themeId] || {};

    let totalQuestions = 0;
    try {
      const data = JSON.parse(f.content);
      totalQuestions = (data.items || []).length;
    } catch {}

    const validatedIds = new Set(allValidations[themeId] || []);
    const themeSugs = allSuggestions[themeId] || {};

    let aiModified = 0;
    let ok = 0, attention = 0, erreur = 0;
    for (const [itemId, entry] of Object.entries(themeSugs)) {
      const v = entry.verdict;
      if (!v) continue;
      if (v.status === 'REWRITE' || v.pass1_rewritten || v.pass2_verdict === 'CORRIGE_ET_CONFIRME') aiModified++;
      if (validatedIds.has(itemId)) continue;
      if (v.status === 'OK') ok++;
      else if (v.status === 'ATTENTION') attention++;
      else if (v.status === 'ERREUR') erreur++;
    }

    return {
      themeId,
      title: meta.title || themeId,
      emoji: meta.emoji || '',
      category: meta.category || '',
      totalQuestions,
      validatedCount: validatedIds.size,
      aiModifiedCount: aiModified,
      verifiedStats: { ok, attention, erreur },
    };
  });
}

// GET — compte les fichiers modifies avec details
export async function GET() {
  try {
    const { modified } = await getModifiedFiles();
    const details = enrichWithStats(modified);
    return Response.json({
      count: modified.length,
      themes: modified.map(f => f.filename.replace('.json', '')),
      details,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST — deploie tous les fichiers modifies
export async function POST() {
  try {
    const { modified, baseTreeSha, latestCommitSha } = await getModifiedFiles();

    if (modified.length === 0) {
      return Response.json({ message: 'Deja a jour — aucune modification a deployer ✓' });
    }

    const treeEntries = modified.map(f => ({
      path: f.path,
      mode: '100644',
      type: 'blob',
      content: f.content,
    }));

    const newTreeRes = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/git/trees`,
      {
        method: 'POST',
        headers: githubHeaders(),
        body: JSON.stringify({ base_tree: baseTreeSha, tree: treeEntries }),
      }
    );
    if (!newTreeRes.ok) throw new Error('Impossible de creer le tree Git');
    const newTreeSha = (await newTreeRes.json()).sha;

    const themeNames = modified.map(f => f.filename.replace('.json', ''));
    const newCommitRes = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/git/commits`,
      {
        method: 'POST',
        headers: githubHeaders(),
        body: JSON.stringify({
          message: `chore(quiz): update ${treeEntries.length} file(s) via Punkrecords\n\nThemes: ${themeNames.join(', ')}`,
          tree: newTreeSha,
          parents: [latestCommitSha],
        }),
      }
    );
    if (!newCommitRes.ok) throw new Error('Impossible de creer le commit');
    const newCommitSha = (await newCommitRes.json()).sha;

    const updateRes = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`,
      {
        method: 'PATCH',
        headers: githubHeaders(),
        body: JSON.stringify({ sha: newCommitSha }),
      }
    );
    if (!updateRes.ok) throw new Error('Impossible de mettre a jour la branche');

    const details = enrichWithStats(modified);

    return Response.json({
      message: `Deploye ✓ — ${treeEntries.length} fichier(s) en 1 commit → Vercel redeploie automatiquement`,
      deployed: details,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
