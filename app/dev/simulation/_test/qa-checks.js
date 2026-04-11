/**
 * QA Check Utilities for Simulation Pages
 *
 * Injecter via evaluate_script dans le MCP Chrome DevTools.
 * Crée window.__qa avec toutes les fonctions de vérification.
 *
 * Usage MCP:
 *   evaluate_script: <contenu de ce fichier>
 *   evaluate_script: window.__qa.runAllChecks('lobby', 'quiz')
 */

(() => {
  // ─── Helpers ───────────────────────────────────────────────

  const getPanels = () => Array.from(document.querySelectorAll('.sim-panel-content'));

  const isVisible = (el) => {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none') return false;
    if (style.visibility === 'hidden') return false;
    if (style.opacity === '0') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };

  const getSelector = (el) => {
    if (!el) return 'null';
    let s = el.tagName.toLowerCase();
    if (el.id) s += `#${el.id}`;
    if (el.className && typeof el.className === 'string') {
      const cls = el.className.trim().split(/\s+/).slice(0, 2).join('.');
      if (cls) s += `.${cls}`;
    }
    return s;
  };

  // ─── Core Checks ──────────────────────────────────────────

  /**
   * Vérifie que tous les panels de simulation ont du contenu rendu
   */
  const checkPanelsRendered = () => {
    const panels = getPanels();
    const empty = [];
    panels.forEach((panel, i) => {
      // Un panel est "vide" s'il n'a que le <style> enfant et rien d'autre
      const realChildren = Array.from(panel.children).filter(c => c.tagName !== 'STYLE');
      if (realChildren.length === 0) {
        empty.push(i);
      }
    });
    return {
      pass: empty.length === 0,
      total: panels.length,
      empty,
      message: empty.length === 0
        ? `✓ ${panels.length} panels rendus`
        : `✗ Panels vides: ${empty.join(', ')}`
    };
  };

  /**
   * Vérifie que tous les éléments interactifs visibles ne sont pas bloqués
   * par un overlay (utilise elementFromPoint)
   */
  const checkInteractiveElements = () => {
    const panels = getPanels();
    const blocked = [];
    let total = 0;

    panels.forEach((panel, panelIndex) => {
      const interactives = panel.querySelectorAll(
        'button:not(:disabled), a[href], input, textarea, [role="button"]'
      );

      interactives.forEach(el => {
        if (!isVisible(el)) return;
        total++;

        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // elementFromPoint retourne l'élément le plus haut au z-index
        const topEl = document.elementFromPoint(centerX, centerY);

        if (!topEl) return; // hors viewport

        // L'élément est OK si c'est lui-même ou un de ses descendants
        if (topEl === el || el.contains(topEl)) return;

        // Ignorer les style tags et les éléments de transition
        if (topEl.tagName === 'STYLE') return;
        if (topEl.closest('.sim-panel-content style')) return;

        // Cas spécial : le parent contient l'élément (ex: label > input)
        if (topEl.contains(el)) return;

        blocked.push({
          panel: panelIndex,
          element: getSelector(el),
          text: (el.textContent || '').trim().slice(0, 40),
          blockedBy: getSelector(topEl),
          blockedByText: (topEl.textContent || '').trim().slice(0, 40),
          rect: {
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            w: Math.round(rect.width),
            h: Math.round(rect.height)
          }
        });
      });
    });

    return {
      pass: blocked.length === 0,
      total,
      blockedCount: blocked.length,
      blocked,
      message: blocked.length === 0
        ? `✓ ${total} éléments interactifs OK`
        : `✗ ${blocked.length}/${total} éléments bloqués`
    };
  };

  /**
   * Vérifie la phase actuellement affichée dans le header de simulation
   */
  const checkPhase = (expected) => {
    // Le header de simulation affiche "Phase: <phase>" dans un span bold
    const allText = document.body.innerText;
    const match = allText.match(/Phase:\s*(\w+)/);
    const actual = match ? match[1] : 'unknown';

    return {
      pass: actual === expected,
      actual,
      expected,
      message: actual === expected
        ? `✓ Phase: ${actual}`
        : `✗ Phase attendue: ${expected}, actuelle: ${actual}`
    };
  };

  /**
   * Vérifie le nombre de joueurs (panels ou texte "X players")
   */
  const checkPlayerCount = (expected) => {
    const allText = document.body.innerText;
    const match = allText.match(/(\d+)\s*players?/);
    const actual = match ? parseInt(match[1]) : getPanels().length;

    return {
      pass: actual === expected,
      actual,
      expected,
      message: actual === expected
        ? `✓ ${actual} joueurs`
        : `✗ Joueurs attendus: ${expected}, actuels: ${actual}`
    };
  };

  /**
   * Vérifie qu'un élément existe dans un panel spécifique
   */
  const checkElementExists = (selector, panelIndex) => {
    const panels = getPanels();
    if (panelIndex >= panels.length) {
      return { pass: false, found: false, message: `✗ Panel ${panelIndex} n'existe pas (${panels.length} panels)` };
    }
    const el = panels[panelIndex].querySelector(selector);
    const found = el !== null && isVisible(el);
    return {
      pass: found,
      found,
      panelIndex,
      selector,
      message: found
        ? `✓ "${selector}" trouvé dans panel ${panelIndex}`
        : `✗ "${selector}" absent du panel ${panelIndex}`
    };
  };

  /**
   * Vérifie que tous les panels contiennent un élément donné
   */
  const checkAllPanelsHaveElement = (selector) => {
    const panels = getPanels();
    const missing = [];
    panels.forEach((panel, i) => {
      const el = panel.querySelector(selector);
      if (!el || !isVisible(el)) missing.push(i);
    });
    return {
      pass: missing.length === 0,
      total: panels.length,
      missing,
      selector,
      message: missing.length === 0
        ? `✓ "${selector}" dans les ${panels.length} panels`
        : `✗ "${selector}" absent des panels: ${missing.join(', ')}`
    };
  };

  /**
   * Vérifie que des sélecteurs censés être visibles ne sont pas cachés
   */
  const checkNoHiddenRequired = (selectors) => {
    const hidden = [];
    selectors.forEach(selector => {
      const els = document.querySelectorAll(selector);
      if (els.length === 0) {
        hidden.push({ selector, reason: 'not found in DOM' });
      } else {
        els.forEach(el => {
          if (!isVisible(el)) {
            hidden.push({ selector, reason: 'hidden (display/visibility/opacity/size)' });
          }
        });
      }
    });
    return {
      pass: hidden.length === 0,
      hidden,
      message: hidden.length === 0
        ? `✓ ${selectors.length} sélecteurs visibles`
        : `✗ Éléments cachés: ${hidden.map(h => h.selector).join(', ')}`
    };
  };

  /**
   * Extrait les infos de la room depuis le header de simulation
   */
  const getRoomInfo = () => {
    const allText = document.body.innerText;

    // Room code (6 chars dans un badge Bungee)
    const codeMatch = allText.match(/([A-Z2-9]{6})/);
    const roomCode = codeMatch ? codeMatch[1] : null;

    // Phase
    const phaseMatch = allText.match(/Phase:\s*(\w+)/);
    const phase = phaseMatch ? phaseMatch[1] : null;

    // Player count
    const playerMatch = allText.match(/(\d+)\s*players?/);
    const playerCount = playerMatch ? parseInt(playerMatch[1]) : null;

    // Panels
    const panelCount = getPanels().length;

    return { roomCode, phase, playerCount, panelCount };
  };

  /**
   * Compte les erreurs JS dans la console (via un log intercepteur)
   * Note: les erreurs console sont mieux vérifiées via list_console_messages MCP
   * Ceci est un fallback pour les erreurs non-catchées
   */
  const checkUncaughtErrors = () => {
    const errors = window.__qaErrors || [];
    return {
      pass: errors.length === 0,
      count: errors.length,
      errors: errors.slice(0, 10), // Max 10
      message: errors.length === 0
        ? '✓ 0 erreurs non-catchées'
        : `✗ ${errors.length} erreurs: ${errors[0]?.message || ''}`
    };
  };

  /**
   * Vérifie les éléments spécifiques à une phase d'un jeu
   */
  const checkGameSpecific = (gameId, phase) => {
    const panels = getPanels();
    const results = [];

    const checks = GAME_SPECIFIC_CHECKS[gameId]?.[phase] || [];
    checks.forEach(check => {
      if (check.type === 'elementInPanel') {
        const panel = panels[check.panelIndex] || panels[0];
        if (!panel) return;
        const el = panel.querySelector(check.selector);
        const found = el !== null && isVisible(el);
        results.push({
          pass: found === check.expected,
          check: check.label,
          message: found === check.expected
            ? `✓ ${check.label}`
            : `✗ ${check.label} — ${found ? 'trouvé mais pas attendu' : 'non trouvé'}`
        });
      } else if (check.type === 'elementInAllPanels') {
        const missing = [];
        panels.forEach((panel, i) => {
          const el = panel.querySelector(check.selector);
          if (!el || !isVisible(el)) missing.push(i);
        });
        // Certains panels peuvent être exclus (ex: host n'a pas de buzzer)
        const expectedMissing = check.excludePanels || [];
        const unexpectedMissing = missing.filter(i => !expectedMissing.includes(i));
        results.push({
          pass: unexpectedMissing.length === 0,
          check: check.label,
          message: unexpectedMissing.length === 0
            ? `✓ ${check.label}`
            : `✗ ${check.label} — manquant dans panels: ${unexpectedMissing.join(', ')}`
        });
      }
    });

    return {
      pass: results.every(r => r.pass),
      results,
      message: results.every(r => r.pass)
        ? `✓ ${results.length} checks game-specific OK`
        : `✗ ${results.filter(r => !r.pass).length}/${results.length} checks échoués`
    };
  };

  // ─── Game-Specific Check Definitions ───────────────────────

  const GAME_SPECIFIC_CHECKS = {
    quiz: {
      lobby: [
        { type: 'elementInPanel', panelIndex: 0, selector: '.lobby-header', expected: true, label: 'Host: lobby header visible' },
      ],
      playing: [
        { type: 'elementInAllPanels', selector: '.game-play-header, [class*="header"]', label: 'Game header dans chaque panel', excludePanels: [] },
      ],
    },
    blindtest: {
      lobby: [
        { type: 'elementInPanel', panelIndex: 0, selector: '.lobby-header', expected: true, label: 'Host: lobby header visible' },
      ],
      playing: [],
    },
    alibi: {
      lobby: [
        { type: 'elementInPanel', panelIndex: 0, selector: '.lobby-header', expected: true, label: 'Host: lobby header visible' },
      ],
      prep: [],
      interrogation: [],
    },
    laregle: {
      lobby: [
        { type: 'elementInPanel', panelIndex: 0, selector: '.lobby-header, .lr-lobby', expected: true, label: 'Host: lobby visible' },
      ],
      choosing: [],
      playing: [],
      guessing: [],
    },
    mime: {
      lobby: [
        { type: 'elementInPanel', panelIndex: 0, selector: '.lobby-header', expected: true, label: 'Host: lobby header visible' },
      ],
      playing: [],
    },
    lol: {
      lobby: [
        { type: 'elementInPanel', panelIndex: 0, selector: '.lobby-header', expected: true, label: 'Host: lobby header visible' },
      ],
      playing: [],
    },
    mindlink: {
      lobby: [
        { type: 'elementInPanel', panelIndex: 0, selector: '.lobby-header', expected: true, label: 'Host: lobby header visible' },
      ],
      playing: [],
    },
    imposteur: {
      lobby: [
        { type: 'elementInPanel', panelIndex: 0, selector: '.lobby-header', expected: true, label: 'Host: lobby header visible' },
      ],
      roles: [],
      describing: [],
      discussion: [],
      voting: [],
      elimination: [],
      roundEnd: [],
    },
  };

  // ─── Master Runner ─────────────────────────────────────────

  /**
   * Lance tous les checks d'un coup pour une phase donnée
   * @param {string} phase - La phase actuelle (lobby, playing, etc.)
   * @param {string} gameId - L'ID du jeu (quiz, blindtest, etc.)
   * @returns {object} Résultat agrégé de tous les checks
   */
  const runAllChecks = (phase, gameId) => {
    const results = {};
    const failures = [];

    // 1. Panels rendus
    results.panels = checkPanelsRendered();
    if (!results.panels.pass) failures.push(results.panels.message);

    // 2. Phase correcte
    results.phase = checkPhase(phase);
    if (!results.phase.pass) failures.push(results.phase.message);

    // 3. Éléments interactifs non bloqués
    results.interactive = checkInteractiveElements();
    if (!results.interactive.pass) failures.push(results.interactive.message);

    // 4. Erreurs non-catchées
    results.errors = checkUncaughtErrors();
    if (!results.errors.pass) failures.push(results.errors.message);

    // 5. Checks game-specific
    if (gameId) {
      results.gameSpecific = checkGameSpecific(gameId, phase);
      if (!results.gameSpecific.pass) failures.push(results.gameSpecific.message);
    }

    const allPass = failures.length === 0;

    return {
      pass: allPass,
      phase,
      gameId: gameId || 'unknown',
      summary: allPass
        ? `✅ ALL PASS — ${phase} (${gameId})`
        : `❌ ${failures.length} FAILURES — ${phase} (${gameId})`,
      failures,
      details: results
    };
  };

  // ─── Error Interceptor ─────────────────────────────────────
  // Capture les erreurs non-catchées pour checkUncaughtErrors()

  if (!window.__qaErrorsInstalled) {
    window.__qaErrors = [];
    window.__qaErrorsInstalled = true;

    window.addEventListener('error', (event) => {
      window.__qaErrors.push({
        message: event.message,
        source: event.filename,
        line: event.lineno,
        col: event.colno,
        timestamp: Date.now()
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      window.__qaErrors.push({
        message: `Unhandled Promise: ${event.reason?.message || event.reason || 'unknown'}`,
        source: 'promise',
        timestamp: Date.now()
      });
    });
  }

  // ─── Expose API ────────────────────────────────────────────

  window.__qa = {
    checkPanelsRendered,
    checkInteractiveElements,
    checkPhase,
    checkPlayerCount,
    checkElementExists,
    checkAllPanelsHaveElement,
    checkNoHiddenRequired,
    checkUncaughtErrors,
    checkGameSpecific,
    getRoomInfo,
    runAllChecks,
    // Helpers exposés pour debug
    _getPanels: getPanels,
    _isVisible: isVisible,
    _GAME_CHECKS: GAME_SPECIFIC_CHECKS,
  };

  return '✓ window.__qa installé — ' + Object.keys(window.__qa).filter(k => !k.startsWith('_')).length + ' fonctions disponibles';
})();
