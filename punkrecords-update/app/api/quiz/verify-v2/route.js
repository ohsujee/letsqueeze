import { spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const DATA_DIR = '/opt/punkrecords/data';
const SUGGESTIONS_FILE = join(DATA_DIR, 'quiz-suggestions.json');
const VALIDATIONS_FILE = join(DATA_DIR, 'quiz-validations.json');
const QUIZ_DIR = '/opt/letsqueeze/public/data/quiz';
const PROGRESS_FILE = join(DATA_DIR, 'quiz-verify-progress.json');
const STATE_FILE = join(DATA_DIR, 'quiz-verify-state.json');

function readJson(file) {
  try {
    if (!existsSync(file)) return {};
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch { return {}; }
}

function writeJson(file, data) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// ─── Progress tracking (server-side) ────────────────────────────

let stopRequested = false;

function readProgress() {
  try {
    if (!existsSync(PROGRESS_FILE)) return null;
    return JSON.parse(readFileSync(PROGRESS_FILE, 'utf8'));
  } catch { return null; }
}

function writeProgress(data) {
  writeJson(PROGRESS_FILE, { ...data, updatedAt: new Date().toISOString() });
}

function clearProgress() {
  if (existsSync(PROGRESS_FILE)) {
    try { writeFileSync(PROGRESS_FILE, '{}', 'utf8'); } catch {}
  }
}

// ─── Claude CLI runner ──────────────────────────────────────────

function runClaude(prompt, { allowWebSearch = false, timeout = 120000 } = {}) {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';

    const args = ['--output-format', 'json'];
    if (allowWebSearch) args.push('--allowedTools', 'WebSearch');
    args.push('-p', prompt);

    const proc = spawn('claude', args, {
      cwd: '/opt/letsqueeze',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error('Claude timeout'));
    }, timeout);

    proc.stdout.on('data', chunk => { stdout += chunk.toString(); });
    proc.stderr.on('data', chunk => { stderr += chunk.toString(); });

    proc.on('close', code => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`Claude exit ${code}: ${stderr.slice(0, 400)}`));
        return;
      }
      try {
        const parsed = JSON.parse(stdout);
        resolve(typeof parsed.result === 'string' ? parsed.result : stdout);
      } catch {
        resolve(stdout);
      }
    });

    proc.on('error', err => { clearTimeout(timer); reject(err); });
  });
}

function parseJsonFromText(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try { return JSON.parse(jsonMatch[0]); } catch { return null; }
}

function parseJsonArrayFromText(text) {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

// ─── Prompts ────────────────────────────────────────────────────

function buildPass1Prompt(questions) {
  const questionsBlock = questions.map((q, i) =>
    `[${i}] Question: ${q.question}\n    Réponse: ${q.answer}`
  ).join('\n\n');

  return `Tu es un expert en quiz francophones. Analyse ces ${questions.length} questions sur des critères STRUCTURELS uniquement (pas de vérification factuelle, pas de recherche web).

QUESTIONS À ANALYSER :
${questionsBlock}

Pour CHAQUE question, vérifie ces 7 critères :

1. FUITE_REPONSE — La réponse (en entier ou en partie, synonyme, citation, nombre, concept) apparaît-elle dans la question ? Un joueur peut-il répondre SANS connaissance du sujet ?
2. PYRAMIDALITE — La question progresse-t-elle du plus obscur vers le plus évident, avec 2-3 indices distincts ?
3. STYLE — Phrases complètes (sujet-verbe-complément), pas fragmenté/télégraphique, lisible à voix haute en <15s ?
4. LONGUEUR — Entre 150 et 300 caractères ?
5. CHIFFRES_REPONSE — La réponse est-elle un nombre brut (date, quantité) ? Si oui, les chiffres doivent être dans la question, pas en réponse. Exception : noms propres numériques (C-17, R2-D2).
6. GRAMMAIRE — Orthographe, accords, ponctuation, noms propres avec majuscule, point d'interrogation final ?
7. FORMAT_REPONSE — Réponse sans article inutile ? Pour les anime : format "VO (VF officielle)" ?

Pour chaque question, donne :
- "pass": true si TOUS les critères sont OK, false sinon
- "issues": liste des critères échoués avec détail
- Si pass=false : "rewrite" avec la question ET la réponse corrigées (tu peux modifier les deux)

IMPORTANT : Ne vérifie PAS si les faits sont vrais. Ne fais PAS de recherche web. Concentre-toi UNIQUEMENT sur la forme.

Réponds UNIQUEMENT avec ce JSON valide, sans markdown :
[
  {"index":0,"pass":true,"issues":[]},
  {"index":1,"pass":false,"issues":[{"critere":"FUITE_REPONSE","detail":"Le mot X apparaît dans la question"}],"rewrite":{"question":"...","answer":"..."}}
]`;
}

function buildPass2Prompt(question, answer) {
  return `Vérifie si ce fait de quiz est correct. Utilise WebSearch pour confirmer.

QUESTION : ${question}
RÉPONSE ATTENDUE : ${answer}

Recherche sur le web et réponds UNIQUEMENT avec ce JSON valide :
{"verdict":"CONFIRME","source":"URL ou description de la source","detail":"Explication courte"}

Valeurs possibles pour verdict :
- "CONFIRME" — Le fait est vérifié et correct
- "FAUX" — Le fait est incorrect. Ajoute alors : "correction":{"question":"question corrigée","answer":"réponse corrigée"} avec la bonne information
- "INCERTAIN" — Impossible de confirmer avec certitude (sources contradictoires, information introuvable)

IMPORTANT : Tu DOIS appeler WebSearch. Sois concis.`;
}

// ─── Sauvegarde verdict + auto-validation ───────────────────────

function saveVerdict(themeId, itemId, verdict) {
  const allSuggestions = readJson(SUGGESTIONS_FILE);
  if (!allSuggestions[themeId]) allSuggestions[themeId] = {};
  allSuggestions[themeId][itemId] = { verdict };
  writeJson(SUGGESTIONS_FILE, allSuggestions);
}

function autoValidate(themeId, itemId) {
  const validations = readJson(VALIDATIONS_FILE);
  if (!validations[themeId]) validations[themeId] = [];
  if (!validations[themeId].includes(itemId)) {
    validations[themeId].push(itemId);
  }
  writeJson(VALIDATIONS_FILE, validations);
}

function updateQuizItem(themeId, itemId, newQuestion, newAnswer) {
  const filePath = join(QUIZ_DIR, `${themeId}.json`);
  if (!existsSync(filePath)) return false;
  const data = JSON.parse(readFileSync(filePath, 'utf8'));
  const idx = data.items.findIndex(i => i.id === itemId);
  if (idx === -1) return false;
  data.items[idx].question = newQuestion;
  data.items[idx].answer = newAnswer;
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  return true;
}

// ─── Persistent state (survives across runs) ───────────────────

function readState() {
  try {
    if (!existsSync(STATE_FILE)) return {};
    return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  } catch { return {}; }
}

function writeState(data) {
  writeJson(STATE_FILE, data);
}

function clearState(themeId) {
  const state = readState();
  delete state[themeId];
  writeJson(STATE_FILE, state);
}

// ─── Background verification orchestrator ───────────────────────

function categorizeError(err) {
  const msg = err.message || '';
  if (/timeout/i.test(msg)) return 'timeout';
  if (/quota|rate.?limit|usage.?limit|exceeded|overload|capacity|credit/i.test(msg)) return 'quota';
  if (/exit [1-9]/i.test(msg)) return 'cli_error';
  return 'unknown';
}

function saveLastRun(themeId, reason, stats, errorBreakdown, detail) {
  const state = readState();
  if (!state[themeId]) state[themeId] = {};
  state[themeId].lastRun = {
    endedAt: new Date().toISOString(),
    reason,
    detail,
    stats,
    errorBreakdown,
  };
  writeState(state);
}

async function runVerification(themeId) {
  stopRequested = false;
  const stats = { confirmed: 0, corrected: 0, uncertain: 0, rewritten: 0, errors: 0 };
  const errorBreakdown = { quota: 0, timeout: 0, cli_error: 0, parse: 0, unknown: 0 };

  // Load all unvalidated questions
  const filePath = join(QUIZ_DIR, `${themeId}.json`);
  if (!existsSync(filePath)) {
    writeProgress({ active: false, themeId, error: 'Thème introuvable' });
    return;
  }

  const validations = readJson(VALIDATIONS_FILE);
  const validatedIds = new Set(validations[themeId] || []);
  const quizData = JSON.parse(readFileSync(filePath, 'utf8'));
  const toVerify = quizData.items.filter(i => !validatedIds.has(i.id));

  if (toVerify.length === 0) {
    writeProgress({ active: false, themeId, phase: 'done', stats, detail: 'Toutes les questions sont déjà validées' });
    clearState(themeId);
    return;
  }

  const totalQuestions = toVerify.length;

  // Check if pass 1 was already completed for this theme
  const persistedState = readState();
  const themeState = persistedState[themeId] || {};
  const pass1AlreadyDone = themeState.pass1Done === true;

  // ── PASSE 1 : Analyse structurelle (batch de 10) ──
  if (!pass1AlreadyDone) {
    const BATCH_SIZE = 10;
    const totalBatches = Math.ceil(toVerify.length / BATCH_SIZE);

    for (let i = 0; i < toVerify.length; i += BATCH_SIZE) {
      if (stopRequested) {
        saveLastRun(themeId, 'stopped', stats, errorBreakdown, 'Arrêté par l\'utilisateur');
        writeProgress({ active: false, themeId, phase: 'stopped', stats, errorBreakdown, detail: 'Arrêté par l\'utilisateur' });
        return;
      }

      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const batch = toVerify.slice(i, i + BATCH_SIZE);

      writeProgress({
        active: true,
        themeId,
        phase: 'pass1',
        phaseLabel: 'Passe 1 — Analyse structurelle',
        current: Math.min(i + BATCH_SIZE, toVerify.length),
        total: totalQuestions,
        detail: `Batch ${batchNum}/${totalBatches} (questions ${i + 1}-${Math.min(i + BATCH_SIZE, toVerify.length)})`,
        stats,
        startedAt: i === 0 ? new Date().toISOString() : undefined,
      });

      try {
        const prompt = buildPass1Prompt(batch.map(q => ({ id: q.id, question: q.question, answer: q.answer })));
        const rawResult = await runClaude(prompt, { allowWebSearch: false, timeout: 90000 });
        const text = typeof rawResult === 'string' ? rawResult : JSON.stringify(rawResult);
        const results = parseJsonArrayFromText(text);

        if (results && Array.isArray(results)) {
          for (const result of results) {
            const q = batch[result.index];
            if (!q) continue;
            if (!result.pass && result.rewrite) {
              updateQuizItem(themeId, q.id, result.rewrite.question, result.rewrite.answer);
              saveVerdict(themeId, q.id, {
                status: 'REWRITE',
                pass1_issues: result.issues,
                rewrite: result.rewrite,
                original: { question: q.question, answer: q.answer },
              });
              stats.rewritten++;
            }
          }
        }
      } catch (err) {
        const errType = categorizeError(err);
        errorBreakdown[errType]++;
        stats.errors++;
        if (errType === 'quota') {
          const detail = `Quota atteint pendant Passe 1 (batch ${batchNum})`;
          saveLastRun(themeId, 'quota', stats, errorBreakdown, detail);
          writeProgress({ active: false, themeId, phase: 'quota', stats, errorBreakdown, detail, error: 'quota' });
          return;
        }
      }
    }

    // Pass 1 complete — persist this so we don't redo it
    const currentState = readState();
    currentState[themeId] = { ...currentState[themeId], pass1Done: true, pass1DoneAt: new Date().toISOString() };
    writeState(currentState);
  } else {
    // Pass 1 was already done — show skip message briefly
    writeProgress({
      active: true,
      themeId,
      phase: 'pass1',
      phaseLabel: 'Passe 1 — Déjà effectuée',
      current: totalQuestions,
      total: totalQuestions,
      detail: 'Passe 1 déjà complétée, passage direct à la passe 2',
      stats,
      startedAt: new Date().toISOString(),
    });
  }

  // ── PASSE 2 : Vérification factuelle (individuelle) ──
  // Reload items (may have been rewritten by pass 1)
  const updatedData = JSON.parse(readFileSync(filePath, 'utf8'));
  const updatedValidations = readJson(VALIDATIONS_FILE);
  const updatedValidatedIds = new Set(updatedValidations[themeId] || []);
  const allSuggestions = readJson(SUGGESTIONS_FILE);
  const themeSuggestions = allSuggestions[themeId] || {};

  // Skip questions that already have a pass2 verdict (CONFIRME, INCERTAIN, FAUX, etc.)
  const toFactCheck = updatedData.items.filter(i => {
    if (updatedValidatedIds.has(i.id)) return false; // already validated
    const existing = themeSuggestions[i.id]?.verdict;
    if (existing?.pass2_verdict) return false; // already has a pass2 result
    return true;
  });

  const totalPass2 = toFactCheck.length;

  if (totalPass2 === 0) {
    writeProgress({
      active: false, themeId, phase: 'done', stats,
      detail: `Terminé — toutes les questions ont déjà un verdict`,
      finishedAt: new Date().toISOString(),
    });
    clearState(themeId);
    return;
  }

  for (let i = 0; i < toFactCheck.length; i++) {
    if (stopRequested) {
      writeProgress({ active: false, themeId, phase: 'stopped', stats, detail: 'Arrêté par l\'utilisateur' });
      return;
    }

    const item = toFactCheck[i];

    // Check if this question was rewritten in Pass 1 — preserve that info
    const existingVerdict = themeSuggestions[item.id]?.verdict;
    const pass1Rewrite = (existingVerdict?.status === 'REWRITE') ? {
      pass1_rewritten: true,
      pass1_issues: existingVerdict.pass1_issues,
      pass1_original: existingVerdict.original,
    } : {};

    writeProgress({
      active: true,
      themeId,
      phase: 'pass2',
      phaseLabel: 'Passe 2 — Vérification factuelle',
      current: i + 1,
      total: totalPass2,
      detail: `Question ${i + 1}/${totalPass2} — "${item.answer}"`,
      currentItemId: item.id,
      stats,
    });

    try {
      const prompt = buildPass2Prompt(item.question, item.answer);
      const rawResult = await runClaude(prompt, { allowWebSearch: true, timeout: 60000 });
      const text = typeof rawResult === 'string' ? rawResult : JSON.stringify(rawResult);
      const result = parseJsonFromText(text);

      if (!result?.verdict) {
        errorBreakdown.parse++;
        saveVerdict(themeId, item.id, {
          ...pass1Rewrite,
          status: 'ATTENTION', score: 50, pass2_verdict: 'INCERTAIN',
          detail: 'Réponse non parseable', source: '', analyse: null, corrections: [],
          explication: '⚠️ Réponse IA non parseable',
        });
        stats.uncertain++;
        continue;
      }

      if (result.verdict === 'CONFIRME') {
        saveVerdict(themeId, item.id, {
          ...pass1Rewrite,
          status: 'OK', score: 100, pass2_verdict: 'CONFIRME',
          source: result.source, detail: result.detail,
          analyse: null, corrections: [],
          explication: pass1Rewrite.pass1_rewritten
            ? `✏️ Réécrite (structure) + ✅ Vérifié — ${result.detail}`
            : `✅ Vérifié — ${result.detail}`,
        });
        autoValidate(themeId, item.id);
        stats.confirmed++;
        continue;
      }

      if (result.verdict === 'FAUX' && result.correction) {
        updateQuizItem(themeId, item.id, result.correction.question, result.correction.answer);

        // Re-verify correction
        try {
          const rePrompt = buildPass2Prompt(result.correction.question, result.correction.answer);
          const reRaw = await runClaude(rePrompt, { allowWebSearch: true, timeout: 60000 });
          const reText = typeof reRaw === 'string' ? reRaw : JSON.stringify(reRaw);
          const reResult = parseJsonFromText(reText);

          if (reResult?.verdict === 'CONFIRME') {
            saveVerdict(themeId, item.id, {
              ...pass1Rewrite,
              status: 'OK', score: 95, pass2_verdict: 'CORRIGE_ET_CONFIRME',
              source: reResult.source, detail: reResult.detail,
              original: pass1Rewrite.pass1_original || { question: item.question, answer: item.answer },
              correction: result.correction,
              analyse: null, corrections: [],
              explication: pass1Rewrite.pass1_rewritten
                ? `✏️ Réécrite (structure) + 🔧 Corrigé et vérifié — ${reResult.detail}`
                : `🔧 Corrigé et vérifié — ${reResult.detail}`,
            });
            autoValidate(themeId, item.id);
            stats.corrected++;
            continue;
          }
        } catch {
          // re-verify failed
        }

        // Correction not confirmed
        saveVerdict(themeId, item.id, {
          ...pass1Rewrite,
          status: 'ATTENTION', score: 40, pass2_verdict: 'FAUX_NON_RESOLU',
          detail: result.detail, source: result.source,
          correction: result.correction,
          original: pass1Rewrite.pass1_original || { question: item.question, answer: item.answer },
          analyse: null,
          corrections: [{ label: 'Correction proposée', question: result.correction.question, answer: result.correction.answer, explication: result.detail }],
          explication: `⚠️ Fait incorrect — correction proposée mais non confirmée. ${result.detail}`,
        });
        stats.uncertain++;
        continue;
      }

      // INCERTAIN
      saveVerdict(themeId, item.id, {
        ...pass1Rewrite,
        status: 'ATTENTION', score: 50, pass2_verdict: 'INCERTAIN',
        detail: result.detail, source: result.source || '',
        analyse: null, corrections: [],
        explication: `⚠️ Incertain — ${result.detail}`,
      });
      stats.uncertain++;

    } catch (err) {
      const errType = categorizeError(err);
      errorBreakdown[errType]++;
      stats.errors++;
      if (errType === 'quota') {
        const detail = `Quota atteint à la question ${i + 1}/${totalPass2}`;
        saveLastRun(themeId, 'quota', stats, errorBreakdown, detail);
        writeProgress({ active: false, themeId, phase: 'quota', stats, errorBreakdown, detail, error: 'quota' });
        return;
      }
      saveVerdict(themeId, item.id, {
        status: 'ATTENTION', score: 0, analyse: null, corrections: [],
        explication: `Erreur (${errType}) : ${err.message?.slice(0, 200)}`,
      });
    }
  }

  // Done!
  const doneDetail = `Terminé — ${stats.confirmed} confirmées, ${stats.corrected} corrigées, ${stats.uncertain} incertaines, ${stats.rewritten} réécrites`;
  saveLastRun(themeId, 'done', stats, errorBreakdown, doneDetail);
  clearState(themeId);
  writeProgress({
    active: false,
    themeId,
    phase: 'done',
    stats,
    errorBreakdown,
    detail: doneDetail,
    finishedAt: new Date().toISOString(),
  });
}

// ─── Global verification (all themes sequentially) ──────────────

const GLOBAL_PROGRESS_FILE = join(DATA_DIR, 'quiz-verify-global-progress.json');

function readGlobalProgress() {
  try {
    if (!existsSync(GLOBAL_PROGRESS_FILE)) return null;
    return JSON.parse(readFileSync(GLOBAL_PROGRESS_FILE, 'utf8'));
  } catch { return null; }
}

function writeGlobalProgress(data) {
  writeJson(GLOBAL_PROGRESS_FILE, { ...data, updatedAt: new Date().toISOString() });
}

async function runGlobalVerification() {
  stopRequested = false;

  // Read manifest to get ordered list of themes
  const manifestPath = join(QUIZ_DIR, 'manifest.json');
  if (!existsSync(manifestPath)) {
    writeGlobalProgress({ active: false, error: 'manifest.json introuvable' });
    return;
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const allThemes = [];
  for (const cat of manifest.categories || []) {
    for (const theme of cat.themes || []) {
      allThemes.push({ id: theme.id, title: theme.title, emoji: theme.emoji, category: cat.name });
    }
  }

  // Filter: only themes that have unvalidated questions
  const validations = readJson(VALIDATIONS_FILE);
  const themesToVerify = [];
  for (const theme of allThemes) {
    const filePath = join(QUIZ_DIR, `${theme.id}.json`);
    if (!existsSync(filePath)) continue;
    try {
      const data = JSON.parse(readFileSync(filePath, 'utf8'));
      const validatedIds = new Set(validations[theme.id] || []);
      const unvalidated = (data.items || []).filter(i => !validatedIds.has(i.id)).length;
      if (unvalidated > 0) {
        themesToVerify.push({ ...theme, totalQuestions: (data.items || []).length, unvalidated });
      }
    } catch {}
  }

  if (themesToVerify.length === 0) {
    writeGlobalProgress({
      active: false,
      phase: 'done',
      detail: 'Tous les themes sont deja 100% valides',
      completedThemes: [],
      totalThemes: 0,
    });
    return;
  }

  const completedThemes = [];
  const globalStats = { confirmed: 0, corrected: 0, uncertain: 0, rewritten: 0, errors: 0 };

  for (let t = 0; t < themesToVerify.length; t++) {
    if (stopRequested) {
      writeGlobalProgress({
        active: false,
        phase: 'stopped',
        detail: `Arrete apres ${completedThemes.length}/${themesToVerify.length} themes`,
        currentThemeIndex: t,
        totalThemes: themesToVerify.length,
        completedThemes,
        globalStats,
      });
      return;
    }

    const theme = themesToVerify[t];

    writeGlobalProgress({
      active: true,
      phase: 'verifying',
      currentThemeId: theme.id,
      currentThemeTitle: theme.title,
      currentThemeEmoji: theme.emoji,
      currentThemeCategory: theme.category,
      currentThemeIndex: t,
      totalThemes: themesToVerify.length,
      completedThemes,
      globalStats,
      detail: `Theme ${t + 1}/${themesToVerify.length} : ${theme.emoji} ${theme.title} (${theme.unvalidated} a verifier)`,
    });

    // Run verification for this theme (reuses existing function)
    // runVerification writes to PROGRESS_FILE, which the global polling also reads
    try {
      await runVerification(theme.id);
    } catch (err) {
      // Theme failed — log and continue to next
      completedThemes.push({
        themeId: theme.id,
        title: theme.title,
        emoji: theme.emoji,
        status: 'error',
        error: err.message?.slice(0, 200),
      });
      writeGlobalProgress({
        active: true,
        phase: 'verifying',
        currentThemeId: theme.id,
        currentThemeIndex: t,
        totalThemes: themesToVerify.length,
        completedThemes,
        globalStats,
        detail: `Erreur sur ${theme.title}, passage au suivant...`,
      });
      continue;
    }

    // Check if stopped during runVerification
    if (stopRequested) {
      writeGlobalProgress({
        active: false,
        phase: 'stopped',
        detail: `Arrete pendant ${theme.title}`,
        currentThemeIndex: t,
        totalThemes: themesToVerify.length,
        completedThemes,
        globalStats,
      });
      return;
    }

    // Read the per-theme progress to get final stats
    const themeProgress = readProgress();
    const themeStats = themeProgress?.stats || {};

    // Check if stopped due to quota
    if (themeProgress?.phase === 'quota') {
      completedThemes.push({
        themeId: theme.id,
        title: theme.title,
        emoji: theme.emoji,
        status: 'quota',
        stats: themeStats,
      });
      // Accumulate
      for (const k of Object.keys(globalStats)) {
        globalStats[k] += themeStats[k] || 0;
      }
      writeGlobalProgress({
        active: false,
        phase: 'quota',
        detail: `Quota atteint sur ${theme.title} (${completedThemes.length}/${themesToVerify.length} themes traites)`,
        currentThemeId: theme.id,
        currentThemeIndex: t,
        totalThemes: themesToVerify.length,
        completedThemes,
        globalStats,
      });
      return;
    }

    // Theme done
    completedThemes.push({
      themeId: theme.id,
      title: theme.title,
      emoji: theme.emoji,
      status: themeProgress?.phase === 'done' ? 'done' : 'partial',
      stats: themeStats,
    });

    // Accumulate global stats
    for (const k of Object.keys(globalStats)) {
      globalStats[k] += themeStats[k] || 0;
    }
  }

  // All done!
  writeGlobalProgress({
    active: false,
    phase: 'done',
    detail: `Termine — ${completedThemes.length} themes verifies`,
    totalThemes: themesToVerify.length,
    completedThemes,
    globalStats,
    finishedAt: new Date().toISOString(),
  });
}

// ─── API Handlers ───────────────────────────────────────────────

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const themeId = searchParams.get('themeId');
  const mode = searchParams.get('mode');

  // Global progress mode
  if (mode === 'global') {
    const globalProgress = readGlobalProgress();
    const perThemeProgress = readProgress();
    return Response.json({
      global: globalProgress || { active: false },
      currentTheme: perThemeProgress || { active: false },
    });
  }

  const progress = readProgress();
  const state = readState();
  const lastRun = themeId ? (state[themeId]?.lastRun || null) : null;

  return Response.json({
    ...(progress || { active: false }),
    lastRun,
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;

    // ── Start verification ──
    if (action === 'start') {
      const { themeId } = body;
      if (!themeId) return Response.json({ error: 'themeId requis' }, { status: 400 });

      const current = readProgress();
      if (current?.active) {
        return Response.json({ error: 'Une vérification est déjà en cours', progress: current }, { status: 409 });
      }

      writeProgress({
        active: true,
        themeId,
        phase: 'starting',
        phaseLabel: 'Démarrage…',
        current: 0,
        total: 0,
        detail: 'Chargement des questions…',
        stats: { confirmed: 0, corrected: 0, uncertain: 0, rewritten: 0, errors: 0 },
        startedAt: new Date().toISOString(),
      });

      // Fire and forget — runs in background on the server
      runVerification(themeId).catch(err => {
        const detail = `Erreur fatale: ${err.message}`;
        saveLastRun(themeId, 'error', { confirmed: 0, corrected: 0, uncertain: 0, rewritten: 0, errors: 1 }, {}, detail);
        writeProgress({ active: false, themeId, phase: 'error', error: err.message, detail });
      });

      return Response.json({ ok: true, message: 'Vérification lancée' });
    }

    // ── Stop verification ──
    if (action === 'stop') {
      stopRequested = true;
      return Response.json({ ok: true, message: 'Arrêt demandé' });
    }

    // ── Clear progress ──
    if (action === 'clear') {
      clearProgress();
      return Response.json({ ok: true });
    }

    // ── Start global verification ──
    if (action === 'start-global') {
      const current = readProgress();
      const globalCurrent = readGlobalProgress();
      if (current?.active || globalCurrent?.active) {
        return Response.json({ error: 'Une verification est deja en cours' }, { status: 409 });
      }

      writeGlobalProgress({
        active: true,
        phase: 'starting',
        detail: 'Chargement des themes...',
        completedThemes: [],
        globalStats: { confirmed: 0, corrected: 0, uncertain: 0, rewritten: 0, errors: 0 },
        startedAt: new Date().toISOString(),
      });

      // Fire and forget
      runGlobalVerification().catch(err => {
        writeGlobalProgress({
          active: false,
          phase: 'error',
          error: err.message,
          detail: `Erreur fatale: ${err.message}`,
        });
      });

      return Response.json({ ok: true, message: 'Verification globale lancee' });
    }

    // ── Clear global progress ──
    if (action === 'clear-global') {
      if (existsSync(GLOBAL_PROGRESS_FILE)) {
        try { writeFileSync(GLOBAL_PROGRESS_FILE, '{}', 'utf8'); } catch {}
      }
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Action inconnue. Utilisez start, stop, clear, start-global ou clear-global.' }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
