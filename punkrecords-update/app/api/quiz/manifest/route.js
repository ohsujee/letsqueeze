import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const QUIZ_DIR = '/opt/letsqueeze/public/data/quiz';
const SUGGESTIONS_FILE = '/opt/punkrecords/data/quiz-suggestions.json';
const VALIDATIONS_FILE = '/opt/punkrecords/data/quiz-validations.json';
const OWNER = 'ohsujee';
const REPO = 'letsqueeze';
const FILE_PATH = 'public/data/quiz/manifest.json';
const BRANCH = 'main';

function githubHeaders() {
  return {
    'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };
}

export async function GET() {
  try {
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`;
    const res = await fetch(url, { headers: githubHeaders(), cache: 'no-store' });

    if (!res.ok) {
      const err = await res.json();
      return Response.json({ error: err.message || 'GitHub API error' }, { status: 500 });
    }

    const data = await res.json();
    const manifest = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));

    // Read suggestions file for verdict stats
    let allSuggestions = {};
    try {
      if (existsSync(SUGGESTIONS_FILE)) {
        allSuggestions = JSON.parse(readFileSync(SUGGESTIONS_FILE, 'utf8'));
      }
    } catch {}

    // Read validations file
    let allValidations = {};
    try {
      if (existsSync(VALIDATIONS_FILE)) {
        allValidations = JSON.parse(readFileSync(VALIDATIONS_FILE, 'utf8'));
      }
    } catch {}

    // Enrich with stats from local VPS files
    for (const cat of manifest.categories) {
      for (const theme of cat.themes) {
        try {
          const themeData = JSON.parse(readFileSync(join(QUIZ_DIR, `${theme.id}.json`), 'utf8'));
          const items = themeData.items || [];
          theme.questionCount = items.length;

          // validatedCount comes from quiz-validations.json (not from item.validated)
          const validatedIds = new Set(allValidations[theme.id] || []);
          theme.validatedCount = validatedIds.size;

          // verifiedStats: only count non-validated items
          const themeSugs = allSuggestions[theme.id] || {};
          let ok = 0, attention = 0, erreur = 0, aiModified = 0;
          for (const [itemId, entry] of Object.entries(themeSugs)) {
            const v = entry.verdict;
            if (!v) continue;

            // Count AI-modified questions (rewritten in pass1 or corrected in pass2)
            if (v.status === 'REWRITE' || v.pass1_rewritten || v.pass2_verdict === 'CORRIGE_ET_CONFIRME') {
              aiModified++;
            }

            if (validatedIds.has(itemId)) continue; // skip already validated for status counts
            const s = v.status;
            if (s === 'OK') ok++;
            else if (s === 'ATTENTION') attention++;
            else if (s === 'ERREUR') erreur++;
          }
          theme.verifiedStats = { ok, attention, erreur };
          theme.aiModifiedCount = aiModified;
        } catch {
          theme.questionCount = 0;
          theme.validatedCount = 0;
          theme.verifiedStats = { ok: 0, attention: 0, erreur: 0 };
          theme.aiModifiedCount = 0;
        }
      }
    }

    return Response.json({ ...manifest, _sha: data.sha });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const manifest = await req.json();
    const { _sha, ...rest } = manifest;

    // Strip all computed fields before saving to GitHub
    const toSave = {
      ...rest,
      categories: rest.categories.map(cat => ({
        ...cat,
        themes: cat.themes.map(({ questionCount, validatedCount, verifiedStats, aiModifiedCount, ...theme }) => theme),
      })),
    };

    const content = Buffer.from(JSON.stringify(toSave, null, 2)).toString('base64');

    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: githubHeaders(),
      body: JSON.stringify({
        message: 'chore(quiz): update manifest labels via Punkrecords',
        content,
        sha: _sha,
        branch: BRANCH,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return Response.json({ error: err.message || 'GitHub commit failed' }, { status: 500 });
    }

    const result = await res.json();
    return Response.json({ ok: true, sha: result.content?.sha });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
