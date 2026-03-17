'use client';

import { useState, useEffect, useCallback, useRef, useMemo, memo, useTransition } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// ─── Diff mot à mot ─────────────────────────────────────────────

function tokenize(text) { return text.split(/(\s+)/); }

function lcs(a, b) {
  const m = a.length, n = b.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);
  return dp;
}

function wordDiff(original, revised) {
  if (!original || !revised) return [{ text: revised || '', type: 'same' }];
  if (original === revised) return [{ text: revised, type: 'same' }];
  const a = tokenize(original), b = tokenize(revised);
  const dp = lcs(a, b);
  const result = [];
  let i = a.length, j = b.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i-1] === b[j-1]) { result.unshift({ text: b[j-1], type: 'same' }); i--; j--; }
    else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) { result.unshift({ text: b[j-1], type: 'added' }); j--; }
    else { result.unshift({ text: a[i-1], type: 'removed' }); i--; }
  }
  return result;
}

function DiffView({ original, revised }) {
  if (!revised) return <span style={{ color: '#38384f', fontSize: '11px' }}>—</span>;
  if (original === revised) return (
    <span style={{ fontSize: '11px', color: '#38384f', fontStyle: 'italic' }}>identique</span>
  );
  const segments = wordDiff(original, revised);
  return (
    <span style={{ fontSize: '12px', lineHeight: 1.6, color: '#c4c4d4' }}>
      {segments.map((seg, i) =>
        seg.type === 'added'
          ? <mark key={i} style={{ background: 'rgba(74,222,128,0.2)', color: '#4ade80', borderRadius: '2px', padding: '0 2px' }}>{seg.text}</mark>
          : seg.type === 'removed'
          ? <del key={i} style={{ color: 'rgba(248,113,113,0.5)', textDecoration: 'line-through' }}>{seg.text}</del>
          : <span key={i}>{seg.text}</span>
      )}
    </span>
  );
}

const STATUS_CONFIGS = {
  OK:        { bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.25)',  color: '#4ade80', icon: '✓' },
  ATTENTION: { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)',  color: '#fcd34d', icon: '⚠' },
  ERREUR:    { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.25)',   color: '#f87171', icon: '✕' },
};

function StatusBadge({ status, score }) {
  const cfg = STATUS_CONFIGS[status];
  if (!cfg) return null;
  return (
    <span style={{
      fontSize: '11px', fontFamily: 'monospace', whiteSpace: 'nowrap',
      padding: '3px 8px', borderRadius: '5px', border: `1px solid ${cfg.border}`,
      background: cfg.bg, color: cfg.color,
    }}>
      {cfg.icon} {score}/100
    </span>
  );
}

// ─── Checklist analyse ───────────────────────────────────────────

const ANALYSE_LABELS = {
  fuite_reponse:    'Fuite réponse',
  factuel:          'Factuel',
  pyramidalite:     'Pyramidalité',
  style:            'Style',
  longueur:         'Longueur',
  chiffres_reponse: 'Chiffres',
  grammaire:        'Grammaire',
  ambiguite:        'Ambiguïté',
  format_reponse:   'Format',
};

const AnalyseChecklist = memo(function AnalyseChecklist({ analyse }) {
  if (!analyse) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '6px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.15)' }}>
      {Object.entries(ANALYSE_LABELS).map(([key, label]) => {
        const check = analyse[key];
        if (!check) return null;
        return (
          <div
            key={key}
            title={check.detail}
            style={{
              fontSize: '10px', padding: '2px 7px', borderRadius: '4px', cursor: 'help',
              background: check.ok ? 'rgba(74,222,128,0.07)' : 'rgba(239,68,68,0.07)',
              border: `1px solid ${check.ok ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.2)'}`,
              color: check.ok ? 'rgba(74,222,128,0.8)' : '#f87171',
            }}
          >
            {check.ok ? '✓' : '✗'} {label}
          </div>
        );
      })}
    </div>
  );
});

// ─── Cartes de corrections ───────────────────────────────────────

const CorrectionCards = memo(function CorrectionCards({ corrections, item, onAccept }) {
  if (!corrections?.length) return null;
  return (
    <div style={{ margin: '0 14px 10px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
      {corrections.map((correction, i) => (
        <div key={i} style={{ borderRadius: '8px', border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.03)', overflow: 'hidden' }}>
          <div style={{ padding: '7px 12px', borderBottom: '1px solid rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {correction.label || `Option ${i + 1}`}
            </span>
            <button
              onClick={() => onAccept(item.id, i)}
              style={{ fontSize: '11px', padding: '3px 10px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', borderRadius: '5px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
            >
              ✓ Accepter
            </button>
          </div>
          <div style={{ padding: '8px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '10px', color: '#38384f', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Question</div>
              <DiffView original={item.question} revised={correction.question} />
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#38384f', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Réponse</div>
              <DiffView original={item.answer} revised={correction.answer} />
            </div>
          </div>
          {correction.explication && (
            <div style={{ padding: '0 12px 8px', fontSize: '11px', color: '#55556a', fontStyle: 'italic' }}>{correction.explication}</div>
          )}
        </div>
      ))}
    </div>
  );
});

const VERIFY_PHASES = ['Analyse…', 'Recherche web…', 'Vérification…', 'Verdict…'];

const INPUT_BASE = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '5px',
  outline: 'none',
  color: '#d4d4e8',
  resize: 'vertical',
  width: '100%',
  lineHeight: 1.65,
  fontFamily: 'inherit',
  padding: '5px 8px',
  boxSizing: 'border-box',
};
const PAGE_SIZE = 50;

// ─── Carte Question ──────────────────────────────────────────────

const QuestionCard = memo(function QuestionCard({
  item, idx, verdict, isVerifying,
  isSaved, isModified,
  onUpdate, onVerify, onAcceptCorrection, onClearVerdict, onSave, onValidate, onUnvalidate, onDelete,
  isHighlighted, batchVerifying, isBatchCurrent, cardRef, isSelected, onToggleSelect,
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const timersRef = useRef([]);

  // Local state for text fields — typing never triggers a parent re-render
  const [localQuestion, setLocalQuestion] = useState(() => item.question);
  const [localAnswer, setLocalAnswer] = useState(() => item.answer);
  const debounceRef = useRef(null);
  const ownUpdatesRef = useRef({ question: item.question, answer: item.answer });

  // Sync from parent only for external changes (e.g. correction accepted)
  useEffect(() => {
    if (item.question !== ownUpdatesRef.current.question) {
      setLocalQuestion(item.question);
      ownUpdatesRef.current.question = item.question;
    }
    if (item.answer !== ownUpdatesRef.current.answer) {
      setLocalAnswer(item.answer);
      ownUpdatesRef.current.answer = item.answer;
    }
  }, [item.question, item.answer]);

  const handleFieldChange = useCallback((field, val) => {
    if (field === 'question') { setLocalQuestion(val); ownUpdatesRef.current.question = val; }
    else { setLocalAnswer(val); ownUpdatesRef.current.answer = val; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onUpdate(item.id, field, val), 400);
  }, [item.id, onUpdate]);

  const handleFieldBlur = useCallback((field, val) => {
    clearTimeout(debounceRef.current);
    onUpdate(item.id, field, val);
  }, [item.id, onUpdate]);

  useEffect(() => {
    if (!isVerifying) {
      timersRef.current.forEach(t => { clearTimeout(t); clearInterval(t); });
      timersRef.current = [];
      setPhaseIdx(0); setProgress(0);
      return;
    }
    setPhaseIdx(0); setProgress(2);
    const t1 = setTimeout(() => setPhaseIdx(1), 3000);
    const t2 = setTimeout(() => setPhaseIdx(2), 10000);
    const t3 = setTimeout(() => setPhaseIdx(3), 20000);
    const startTime = Date.now();
    const tick = setInterval(() => {
      setProgress(Math.min(88, 88 * (1 - Math.exp(-(Date.now() - startTime) / 12000))));
    }, 300);
    timersRef.current = [t1, t2, t3, tick];
    return () => timersRef.current.forEach(t => { clearTimeout(t); clearInterval(t); });
  }, [isVerifying]);

  useEffect(() => {
    if (verdict && verdict.status !== 'OK') setPanelOpen(true);
  }, [verdict]);

  const borderColor = item.validated
    ? 'rgba(99,102,241,0.35)'
    : verdict?.status === 'ERREUR'    ? 'rgba(239,68,68,0.3)'
    : verdict?.status === 'ATTENTION' ? 'rgba(245,158,11,0.2)'
    : verdict?.status === 'OK'        ? 'rgba(74,222,128,0.15)'
    : isBatchCurrent                   ? 'rgba(99,102,241,0.3)'
    : 'rgba(255,255,255,0.07)';

  const hasCorrections = verdict?.corrections?.length > 0;

  return (
    <div
      ref={cardRef}
      style={{
        contain: 'content',
        background: '#111116',
        border: `1px solid ${borderColor}`,
        borderRadius: '10px', overflow: 'hidden', transition: 'border-color .15s',
        ...(isHighlighted ? { outline: '2px solid rgba(99,102,241,0.5)', outlineOffset: '1px' } : {}),
        opacity: item.validated ? 0.75 : 1,
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: item.validated ? 'rgba(99,102,241,0.05)' : 'transparent',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <input type="checkbox" checked={!!isSelected} onChange={() => onToggleSelect?.(item.id)} onClick={e => e.stopPropagation()} style={{ cursor: 'pointer', accentColor: '#6366f1', width: '13px', height: '13px', flexShrink: 0 }} />
          <span style={{ fontSize: '11px', color: '#38384f', fontFamily: 'monospace', minWidth: '28px' }}>#{idx + 1}</span>
          {isModified && <span style={{ fontSize: '9px', color: '#fcd34d', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '3px', padding: '1px 5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>modifié</span>}
          {isSaved && <span style={{ fontSize: '9px', color: '#4ade80', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: '3px', padding: '1px 5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>sauvegardé</span>}
          {item.validated && <span style={{ fontSize: '10px', color: '#818cf8', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '4px', padding: '2px 8px', fontWeight: 600 }}>✓ Validée</span>}
          {(verdict?.status === 'REWRITE' || verdict?.pass1_rewritten || verdict?.pass2_verdict === 'CORRIGE_ET_CONFIRME') && (
            <span style={{ fontSize: '9px', color: '#c4b5fd', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '3px', padding: '1px 6px', fontWeight: 600 }}>✏️ IA</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {verdict && !isVerifying && (
            <button onClick={() => setPanelOpen(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <StatusBadge status={verdict.status} score={verdict.score} />
            </button>
          )}
          {isVerifying && <span style={{ fontSize: '11px', color: '#818cf8', fontFamily: 'monospace' }}>⟳ {VERIFY_PHASES[phaseIdx]}</span>}
          <button
            onClick={() => onVerify(item)}
            disabled={isVerifying || batchVerifying}
            style={{
              fontSize: '11px', padding: '4px 10px', borderRadius: '6px', fontFamily: 'inherit',
              background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
              color: '#818cf8', cursor: (isVerifying || batchVerifying) ? 'not-allowed' : 'pointer',
              opacity: (isVerifying || batchVerifying) ? 0.4 : 1,
            }}
          >
            {isVerifying ? '⟳' : '🤖 Vérifier'}
          </button>
          {item.validated ? (
            <button onClick={() => onUnvalidate(item.id)} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', fontFamily: 'inherit', background: 'transparent', border: '1px solid rgba(99,102,241,0.2)', color: '#38384f', cursor: 'pointer' }}>
              Retirer ✓
            </button>
          ) : (
            <button onClick={() => onValidate(item.id)} style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '6px', fontFamily: 'inherit', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', cursor: 'pointer', fontWeight: 600 }}>
              ✓ Valider
            </button>
          )}
          <button
            onClick={() => { if (confirm(`Supprimer la question #${idx + 1} ?\n"${item.answer}"`)) onDelete(item.id); }}
            style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', fontFamily: 'inherit', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: '#55556a', cursor: 'pointer' }}
            title="Supprimer cette question"
          >
            🗑
          </button>
        </div>
      </div>

      {/* Progress bar vérification */}
      {isVerifying && (
        <div style={{ height: '2px', background: 'rgba(99,102,241,0.15)' }}>
          <div style={{ height: '100%', background: '#6366f1', width: `${progress}%`, transition: 'width 0.3s ease-out' }} />
        </div>
      )}

      {/* Checklist analyse */}
      {verdict?.analyse && <AnalyseChecklist analyse={verdict.analyse} />}

      {/* Champs */}
      <div style={{ padding: '10px 14px 8px' }}>
        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#38384f', marginBottom: '4px' }}>Question</div>
          <textarea
            value={localQuestion}
            onChange={e => handleFieldChange('question', e.target.value)}
            onBlur={e => handleFieldBlur('question', e.target.value)}
            rows={2}
            className="qc-field"
            style={{ ...INPUT_BASE, fontSize: '13px' }}
          />
        </div>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#38384f', marginBottom: '4px' }}>Réponse</div>
          <input
            type="text"
            value={localAnswer}
            onChange={e => handleFieldChange('answer', e.target.value)}
            onBlur={e => handleFieldBlur('answer', e.target.value)}
            className="qc-field"
            style={{ ...INPUT_BASE, fontSize: '13px', resize: undefined }}
          />
        </div>
      </div>

      {/* Verdict panel */}
      {panelOpen && verdict && (
        <div style={{
          margin: '0 14px 10px', borderRadius: '8px',
          border: `1px solid ${verdict.status === 'OK' ? 'rgba(74,222,128,0.2)' : verdict.status === 'ATTENTION' ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'}`,
          background: verdict.status === 'OK' ? 'rgba(74,222,128,0.04)' : verdict.status === 'ATTENTION' ? 'rgba(245,158,11,0.04)' : 'rgba(239,68,68,0.04)',
          padding: '9px 12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '12px', color: '#a1a1b5', lineHeight: 1.5, flex: 1, margin: 0 }}>{verdict.explication}</p>
            <div style={{ display: 'flex', gap: '5px', marginLeft: '10px', flexShrink: 0 }}>
              {verdict.status !== 'OK' && (
                <button onClick={() => onClearVerdict(item.id)} style={{ fontSize: '10px', color: '#38384f', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '4px', cursor: 'pointer', padding: '2px 7px', fontFamily: 'inherit' }}>Effacer</button>
              )}
              <button onClick={() => setPanelOpen(false)} style={{ color: '#38384f', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', padding: 0 }}>✕</button>
            </div>
          </div>
        </div>
      )}

      {/* AI modification diff (rewrite or correction) */}
      {panelOpen && (verdict?.original || verdict?.pass1_original) && (verdict.status === 'REWRITE' || verdict?.pass1_rewritten || verdict?.pass2_verdict === 'CORRIGE_ET_CONFIRME') && (
        <div style={{
          margin: '0 14px 10px', borderRadius: '8px',
          border: '1px solid rgba(168,85,247,0.2)',
          background: 'rgba(168,85,247,0.03)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '6px 12px', borderBottom: '1px solid rgba(168,85,247,0.1)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#c4b5fd', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {verdict.status === 'REWRITE' ? '✏️ Réécrite (structure)'
                : verdict.pass1_rewritten ? '✏️ Réécrite (structure) + ' + (verdict.pass2_verdict === 'CORRIGE_ET_CONFIRME' ? '🔧 Corrigée (fact-check)' : '✅ Confirmée (fact-check)')
                : '🔧 Corrigée (fact-check)'}
            </span>
          </div>
          <div style={{ padding: '8px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '10px', color: '#38384f', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Question</div>
              <DiffView original={(verdict.original || verdict.pass1_original)?.question} revised={item.question} />
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#38384f', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Réponse</div>
              <DiffView original={(verdict.original || verdict.pass1_original)?.answer} revised={item.answer} />
            </div>
          </div>
        </div>
      )}

      {/* Corrections */}
      {hasCorrections && <CorrectionCards corrections={verdict.corrections} item={item} onAccept={onAcceptCorrection} />}

      {/* Save footer */}
      {(isModified || isSaved) && (
        <div style={{ padding: '0 14px 10px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => onSave(item.id)}
            disabled={!isModified}
            style={{
              fontSize: '11px', padding: '5px 14px', borderRadius: '6px', fontFamily: 'inherit',
              cursor: isModified ? 'pointer' : 'default',
              ...(isSaved
                ? { background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80' }
                : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#c4c4d4' }
              ),
            }}
          >
            {isSaved ? '✓ Sauvegardé' : '💾 Sauvegarder'}
          </button>
        </div>
      )}
    </div>
  );
}, (prev, next) => (
  prev.item === next.item &&
  prev.verdict === next.verdict &&
  prev.isVerifying === next.isVerifying &&
  prev.isSaved === next.isSaved &&
  prev.isModified === next.isModified &&
  prev.isHighlighted === next.isHighlighted &&
  prev.batchVerifying === next.batchVerifying &&
  prev.isBatchCurrent === next.isBatchCurrent &&
  prev.isSelected === next.isSelected &&
  prev.onDelete === next.onDelete
));

// ─── Carte Draft ─────────────────────────────────────────────────

function DraftCard({ draft, onAccept, onReject }) {
  return (
    <div style={{ background: '#111116', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '10px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: 'rgba(245,158,11,0.05)', borderBottom: '1px solid rgba(245,158,11,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: '#fcd34d', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '4px', padding: '2px 7px', fontWeight: 600 }}>✨ Nouveau</span>
          {draft.category && <span style={{ fontSize: '10px', color: '#55556a', fontFamily: 'monospace' }}>{draft.category}</span>}
          <span style={{ fontSize: '10px', color: '#38384f', fontFamily: 'monospace' }}>{draft.difficulty}</span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => onAccept(draft.id)} style={{ fontSize: '11px', padding: '4px 12px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
            ✓ Ajouter au thème
          </button>
          <button onClick={() => onReject(draft.id)} style={{ fontSize: '11px', padding: '4px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#55556a', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit' }}>
            ✕
          </button>
        </div>
      </div>
      <div style={{ padding: '10px 14px 8px' }}>
        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#38384f', marginBottom: '4px' }}>Question</div>
          <p style={{ fontSize: '13px', color: '#d4d4e8', lineHeight: 1.65, margin: 0 }}>{draft.question}</p>
        </div>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#38384f', marginBottom: '4px' }}>Réponse</div>
          <p style={{ fontSize: '13px', color: '#c4c4d4', lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>{draft.answer}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ─────────────────────────────────────────────

export default function QuizThemePage() {
  const params = useParams();
  const themeId = params.themeId;
  const searchParams = useSearchParams();
  const targetQuestionId = searchParams.get('q');
  const ticketId = searchParams.get('ticketId');
  const [highlightId, setHighlightId] = useState(null);
  const rowRefs = useRef({});
  const itemsRef = useRef([]);
  const verdictsRef = useRef({});
  const saveTimeouts = useRef({});
  const stopBatchRef = useRef(false);

  const [themeData, setThemeData] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savedIds, setSavedIds] = useState(new Set());
  const [modifiedIds, setModifiedIds] = useState(new Set());
  const [verdicts, setVerdicts] = useState({});
  const [verifyingIds, setVerifyingIds] = useState(new Set());
  const [deploying, setDeploying] = useState(false);
  const [deployMsg, setDeployMsg] = useState(null);
  const [filter, setFilter] = useState('unvalidated');
  const [batchVerifying, setBatchVerifying] = useState(false);
  const [batchProgress, setBatchProgress] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [drafts, setDrafts] = useState([]);
  const [quotaError, setQuotaError] = useState(null);
  const [page, setPage] = useState(0);
  const [, startCardsTransition] = useTransition();

  // V2 state (server-side polling)
  const [v2Running, setV2Running] = useState(false);
  const [v2Progress, setV2Progress] = useState(null); // { current, total, phase, phaseLabel, detail }
  const [v2Stats, setV2Stats] = useState(null); // { confirmed, corrected, uncertain, rewritten, errors }
  const [v2Finished, setV2Finished] = useState(null); // final stats when done
  const [v2LastRun, setV2LastRun] = useState(null); // last run info from server state
  const v2PollRef = useRef(null);

  // Modal génération
  const [generateModal, setGenerateModal] = useState(false);
  const [generateCount, setGenerateCount] = useState(10);
  const [generateFocus, setGenerateFocus] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateMsg, setGenerateMsg] = useState(null);

  useEffect(() => { verdictsRef.current = verdicts; }, [verdicts]);

  // Scroll vers question cible
  useEffect(() => {
    if (!targetQuestionId || items.length === 0) return;
    setHighlightId(targetQuestionId);
    setTimeout(() => {
      const el = rowRefs.current[targetQuestionId];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
    const t = setTimeout(() => setHighlightId(null), 3000);
    return () => clearTimeout(t);
  }, [targetQuestionId, items.length]);

  // Chargement initial
  useEffect(() => {
    Promise.all([
      fetch(`/api/quiz/${themeId}`).then(r => r.json()),
      fetch(`/api/quiz/${themeId}/generate`).then(r => r.json()).catch(() => ({ drafts: [] })),
    ]).then(([data, draftData]) => {
      setThemeData(data);
      startCardsTransition(() => {
        const validatedSet = new Set(data.validatedIds || []);
        const itemsWithValidated = (data.items || []).map(item => ({
          ...item,
          validated: validatedSet.has(item.id),
        }));
        setItems(itemsWithValidated);
        itemsRef.current = itemsWithValidated;
        if (data.suggestions && Object.keys(data.suggestions).length > 0) {
          const restoredVerdicts = {};
          for (const [itemId, entry] of Object.entries(data.suggestions)) {
            if (entry.verdict?.status) restoredVerdicts[itemId] = entry.verdict;
          }
          setVerdicts(restoredVerdicts);
        }
        setDrafts(draftData.drafts || []);
        setLoading(false);
      });
    }).catch(err => { setError(err.message); setLoading(false); });
  }, [themeId]);

  const updateItem = useCallback((id, field, value) => {
    setItems(prev => {
      const next = prev.map(item => item.id === id ? { ...item, [field]: value } : item);
      itemsRef.current = next;
      return next;
    });
    setModifiedIds(prev => { const n = new Set(prev); n.add(id); return n; });
    setSavedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  }, []);

  const saveItem = useCallback(async (itemId) => {
    const item = itemsRef.current.find(i => i.id === itemId);
    if (!item) return;
    try {
      const res = await fetch(`/api/quiz/${themeId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateItem', itemId, item }),
      });
      if (!res.ok) throw new Error('Echec sauvegarde');
      setSavedIds(prev => { const n = new Set(prev); n.add(itemId); return n; });
      setModifiedIds(prev => { const n = new Set(prev); n.delete(itemId); return n; });
      if (ticketId && itemId === targetQuestionId) {
        await fetch('/api/tickets', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: ticketId, status: 'resolved' }),
        });
      }
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  }, [themeId, ticketId, targetQuestionId]);

  const validateItem = useCallback(async (itemId) => {
    setItems(prev => prev.map(item => item.id === itemId ? { ...item, validated: true } : item));
    try {
      await fetch('/api/quiz/validate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId, itemId }),
      });
    } catch (err) {
      setItems(prev => prev.map(item => item.id === itemId ? { ...item, validated: false } : item));
      alert('Erreur validation : ' + err.message);
    }
  }, [themeId]);

  const unvalidateItem = useCallback(async (itemId) => {
    setItems(prev => prev.map(item => item.id === itemId ? { ...item, validated: false } : item));
    try {
      await fetch('/api/quiz/validate', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId, itemId }),
      });
    } catch (err) {
      setItems(prev => prev.map(item => item.id === itemId ? { ...item, validated: true } : item));
      alert('Erreur : ' + err.message);
    }
  }, [themeId]);

  const itemIndexMap = useMemo(() => new Map(items.map((item, i) => [item.id, i])), [items]);

  const filteredItems = useMemo(() => items.filter(item => {
    const v = verdicts[item.id];
    const matchesFilter =
      filter === 'all'         ? true
      : filter === 'validated'   ? item.validated
      : filter === 'unvalidated' ? !item.validated
      : filter === 'aiModified'  ? (v?.status === 'REWRITE' || v?.pass1_rewritten || v?.pass2_verdict === 'CORRIGE_ET_CONFIRME')
      : !item.validated && v?.status === filter;
    const matchesSearch = !search.trim()
      ? true
      : item.question.toLowerCase().includes(search.toLowerCase())
        || item.answer.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  }), [items, filter, search, verdicts]);

  useEffect(() => { setPage(0); }, [filter, search]);

  const pagedItems = useMemo(() =>
    filteredItems.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
  [filteredItems, page]);
  const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE);

  const validateAll = useCallback(async () => {
    const visibleIds = filteredItems.map(i => i.id);
    const visibleSet = new Set(visibleIds);
    setItems(prev => prev.map(item => visibleSet.has(item.id) ? { ...item, validated: true } : item));
    try {
      await fetch('/api/quiz/validate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId, itemIds: visibleIds }),
      });
    } catch (err) {
      setItems(prev => prev.map(item => visibleSet.has(item.id) ? { ...item, validated: false } : item));
      alert('Erreur : ' + err.message);
    }
  }, [filteredItems, themeId]);

  // ─── Ancien système de vérification (v1) ──────────────────────

  const verifyItem = useCallback(async (item) => {
    setVerifyingIds(prev => { const n = new Set(prev); n.add(item.id); return n; });
    try {
      const res = await fetch('/api/quiz/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: item.question, answer: item.answer, category: item.category }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        const errMsg = data.error || `Erreur HTTP ${res.status}`;
        const isQuota = /quota|rate.?limit|usage.?limit|exceeded|overload|capacity|credit/i.test(errMsg);
        if (isQuota) return { isQuota: true };
        const errVerdict = { status: 'ERREUR', score: 0, analyse: null, corrections: [], explication: errMsg };
        setVerdicts(prev => ({ ...prev, [item.id]: errVerdict }));
        fetch(`/api/quiz/${themeId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save', itemId: item.id, verdict: errVerdict }),
        }).catch(() => {});
        return { ok: false };
      }
      if (data.status) {
        setVerdicts(prev => ({ ...prev, [item.id]: data }));
        fetch(`/api/quiz/${themeId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save', itemId: item.id, verdict: data }),
        }).catch(() => {});
      }
      return { ok: true };
    } catch (err) {
      setVerdicts(prev => ({
        ...prev,
        [item.id]: { status: 'ERREUR', score: 0, analyse: null, corrections: [], explication: err.message },
      }));
      return { ok: false };
    } finally {
      setVerifyingIds(prev => { const n = new Set(prev); n.delete(item.id); return n; });
    }
  }, [themeId]);

  const validateSelected = useCallback(async () => {
    const ids = [...selectedIds];
    setItems(prev => prev.map(item => selectedIds.has(item.id) ? { ...item, validated: true } : item));
    try {
      await fetch('/api/quiz/validate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId, itemIds: ids }),
      });
    } catch (err) {
      setItems(prev => prev.map(item => selectedIds.has(item.id) ? { ...item, validated: false } : item));
      alert('Erreur : ' + err.message);
    }
    setSelectedIds(new Set());
  }, [selectedIds, themeId]);

  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const verifyAll = useCallback(async (includeAlreadyVerified = false) => {
    stopBatchRef.current = false;
    setQuotaError(null);
    const toVerify = filteredItems.filter(i => {
      if (i.validated) return false;
      if (!includeAlreadyVerified && verdicts[i.id]?.status) return false;
      return true;
    });
    if (toVerify.length === 0) return;

    setBatchVerifying(true);
    setBatchProgress({ current: 0, total: toVerify.length, currentId: null });

    for (let i = 0; i < toVerify.length; i++) {
      if (stopBatchRef.current) break;
      const item = toVerify[i];
      setBatchProgress({ current: i + 1, total: toVerify.length, currentId: item.id });
      const result = await verifyItem(item);
      if (result?.isQuota) {
        setQuotaError(`Quota Claude atteint — vérification arrêtée à la question ${i + 1}/${toVerify.length}. Les questions suivantes n'ont pas été vérifiées, relancez plus tard.`);
        break;
      }
    }

    setBatchVerifying(false);
    setBatchProgress(null);
    stopBatchRef.current = false;
  }, [filteredItems, verdicts, verifyItem]);

  // ─── NOUVEAU : Vérification v2 (server-side + polling) ────────

  const refreshItemsFromServer = useCallback(async () => {
    try {
      const refreshed = await fetch(`/api/quiz/${themeId}`).then(r => r.json());
      const validatedSet = new Set(refreshed.validatedIds || []);
      const refreshedItems = (refreshed.items || []).map(item => ({
        ...item,
        validated: validatedSet.has(item.id),
      }));
      setItems(refreshedItems);
      itemsRef.current = refreshedItems;
      if (refreshed.suggestions) {
        const restoredVerdicts = {};
        for (const [itemId, entry] of Object.entries(refreshed.suggestions)) {
          if (entry.verdict?.status) restoredVerdicts[itemId] = entry.verdict;
        }
        setVerdicts(restoredVerdicts);
      }
    } catch {}
  }, [themeId]);

  const deleteItem = useCallback(async (itemId) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
    setVerdicts(prev => { const n = { ...prev }; delete n[itemId]; return n; });
    try {
      const res = await fetch(`/api/quiz/${themeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteItem', itemId }),
      });
      if (!res.ok) throw new Error('Erreur serveur');
    } catch (err) {
      alert('Erreur suppression : ' + err.message);
      refreshItemsFromServer();
    }
  }, [themeId, refreshItemsFromServer]);

  const startV2Polling = useCallback(() => {
    if (v2PollRef.current) return; // already polling
    const poll = async () => {
      try {
        const res = await fetch(`/api/quiz/verify-v2?themeId=${themeId}`);
        const data = await res.json();

        // Save lastRun if present
        if (data.lastRun) setV2LastRun(data.lastRun);

        if (!data || !data.active) {
          // Verification finished or not running
          clearInterval(v2PollRef.current);
          v2PollRef.current = null;
          setV2Running(false);
          setV2Progress(null);

          if (data?.phase === 'done' || data?.phase === 'stopped' || data?.phase === 'quota' || data?.phase === 'error') {
            setV2Stats(data.stats || null);
            setV2Finished(data);
            if (data.error === 'quota') {
              setQuotaError(data.detail || 'Quota Claude atteint.');
            }
            // Refresh items to get latest data
            refreshItemsFromServer();
            // Clear server progress after reading
            fetch('/api/quiz/verify-v2', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'clear' }),
            }).catch(() => {});
          }
          return;
        }

        // Active verification — update UI
        setV2Running(true);
        setV2Progress({
          current: data.current || 0,
          total: data.total || 0,
          phase: data.phaseLabel || data.phase || '',
          detail: data.detail || '',
        });
        setV2Stats(data.stats || null);

        // Mark current item as verifying
        if (data.currentItemId) {
          setVerifyingIds(new Set([data.currentItemId]));
        }
      } catch {}
    };

    // Initial poll immediately
    poll();
    v2PollRef.current = setInterval(poll, 2000);
  }, [themeId, refreshItemsFromServer]);

  // Check for active verification + load lastRun on mount
  useEffect(() => {
    const checkActive = async () => {
      try {
        const res = await fetch(`/api/quiz/verify-v2?themeId=${themeId}`);
        const data = await res.json();
        if (data?.lastRun) setV2LastRun(data.lastRun);
        if (data?.active) {
          setV2Running(true);
          startV2Polling();
        }
      } catch {}
    };
    checkActive();
    return () => {
      if (v2PollRef.current) { clearInterval(v2PollRef.current); v2PollRef.current = null; }
    };
  }, [startV2Polling, themeId]);

  // Periodically refresh items during active verification (every 10s)
  useEffect(() => {
    if (!v2Running) return;
    const interval = setInterval(refreshItemsFromServer, 10000);
    return () => clearInterval(interval);
  }, [v2Running, refreshItemsFromServer]);

  const verifyAllV2 = useCallback(async () => {
    setQuotaError(null);
    setV2Finished(null);
    setV2LastRun(null);
    setV2Running(true);
    setV2Stats({ confirmed: 0, corrected: 0, uncertain: 0, rewritten: 0, errors: 0 });

    try {
      const res = await fetch('/api/quiz/verify-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', themeId }),
      });
      const data = await res.json();

      if (data.error) {
        setQuotaError(data.error);
        setV2Running(false);
        return;
      }

      // Start polling for progress
      startV2Polling();
    } catch (err) {
      setQuotaError(`Erreur: ${err.message}`);
      setV2Running(false);
    }
  }, [themeId, startV2Polling]);

  const stopBatch = useCallback(() => {
    stopBatchRef.current = true;
    // Also stop server-side v2 verification
    fetch('/api/quiz/verify-v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop' }),
    }).catch(() => {});
  }, []);

  const acceptCorrection = useCallback((itemId, correctionIndex) => {
    const verdict = verdictsRef.current[itemId];
    if (!verdict?.corrections?.[correctionIndex]) return;
    const correction = verdict.corrections[correctionIndex];

    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, question: correction.question, answer: correction.answer } : item
    ));
    setModifiedIds(prev => { const n = new Set(prev); n.add(itemId); return n; });
    setSavedIds(prev => { const n = new Set(prev); n.delete(itemId); return n; });

    const updatedVerdict = { ...verdict, corrections: [] };
    setVerdicts(prev => ({ ...prev, [itemId]: updatedVerdict }));
    fetch(`/api/quiz/${themeId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save', itemId, verdict: updatedVerdict }),
    }).catch(() => {});
  }, [themeId]);

  const clearVerdict = useCallback((itemId) => {
    setVerdicts(prev => { const n = { ...prev }; delete n[itemId]; return n; });
    fetch(`/api/quiz/${themeId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', itemId }),
    }).catch(() => {});
  }, [themeId]);

  // Drafts
  const acceptDraft = useCallback(async (draftId) => {
    try {
      const res = await fetch(`/api/quiz/${themeId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acceptDraft', draftId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Echec');

      const refreshed = await fetch(`/api/quiz/${themeId}`).then(r => r.json());
      const validatedSet = new Set(refreshed.validatedIds || []);
      setItems((refreshed.items || []).map(item => ({ ...item, validated: validatedSet.has(item.id) })));
      setDrafts(prev => prev.filter(d => d.id !== draftId));
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  }, [themeId]);

  const rejectDraft = useCallback(async (draftId) => {
    try {
      await fetch(`/api/quiz/${themeId}/generate`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId }),
      });
      setDrafts(prev => prev.filter(d => d.id !== draftId));
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  }, [themeId]);

  const generateQuestions = useCallback(async () => {
    setGenerating(true);
    setGenerateMsg(null);
    try {
      const res = await fetch(`/api/quiz/${themeId}/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: generateCount, focus: generateFocus }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDrafts(prev => [...prev, ...(data.drafts || [])]);
      setGenerateModal(false);
      setGenerateFocus('');
    } catch (err) {
      setGenerateMsg(err.message);
    } finally {
      setGenerating(false);
    }
  }, [themeId, generateCount, generateFocus]);

  const deploy = async () => {
    setDeploying(true); setDeployMsg(null);
    try {
      const res = await fetch('/api/quiz/deploy', { method: 'POST' });
      const data = await res.json();
      setDeployMsg(data.error
        ? { type: 'error', text: data.error }
        : { type: 'ok', text: data.message });
    } catch (err) {
      setDeployMsg({ type: 'error', text: err.message });
    } finally {
      setDeploying(false);
    }
  };

  const stats = useMemo(() => items.reduce((acc, item) => {
    acc.total++;
    const v = verdicts[item.id];
    const status = v?.status;
    if (item.validated) {
      acc.validated++;
    } else {
      acc.unvalidated++;
      if (status === 'OK') acc.ok++;
      else if (status === 'ATTENTION') acc.attention++;
      else if (status === 'ERREUR') acc.erreur++;
      if (!status) acc.unverified++;
    }
    // Count AI-modified regardless of validation status
    if (status === 'REWRITE' || v?.pass1_rewritten || v?.pass2_verdict === 'CORRIGE_ET_CONFIRME') {
      acc.aiModified++;
    }
    return acc;
  }, { total: 0, validated: 0, unvalidated: 0, ok: 0, attention: 0, erreur: 0, unverified: 0, aiModified: 0 }), [items, verdicts]);

  const FILTERS = useMemo(() => [
    { key: 'unvalidated', label: `À valider (${stats.unvalidated})` },
    { key: 'all',         label: `Tout (${stats.total})` },
    { key: 'validated',   label: `Validées (${stats.validated})` },
    { key: 'ERREUR',      label: `Erreurs (${stats.erreur})` },
    { key: 'ATTENTION',   label: `Attention (${stats.attention})` },
    { key: 'OK',          label: `OK IA (${stats.ok})` },
    ...(stats.aiModified > 0 ? [{ key: 'aiModified', label: `✏️ Modifiées IA (${stats.aiModified})` }] : []),
  ], [stats]);

  const validatedPct = stats.total > 0 ? Math.round((stats.validated / stats.total) * 100) : 0;

  if (loading) return (
    <div style={{ padding: '36px 40px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '40px' }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{ height: '100px', background: '#111116', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', animation: 'pulse 1.5s ease-in-out infinite', opacity: 0.6 }} />
        ))}
      </div>
    </div>
  );

  if (error) return (
    <div style={{ padding: '36px 40px' }}>
      <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '12px', padding: '20px', color: '#fca5a5', fontSize: '13px' }}>{error}</div>
    </div>
  );

  return (
    <div style={{ padding: '36px 40px' }}>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <Link href="/quiz" style={{ fontSize: '12px', color: '#38384f', textDecoration: 'none' }}
            onMouseEnter={e => e.currentTarget.style.color = '#818cf8'}
            onMouseLeave={e => e.currentTarget.style.color = '#38384f'}
          >← Quiz Editor</Link>
          <h1 style={{ fontSize: '19px', fontWeight: 600, color: '#ededf5', letterSpacing: '-0.35px', lineHeight: 1.2, marginTop: '4px' }}>{themeData?.title}</h1>
          <p style={{ fontSize: '11px', color: '#38384f', fontFamily: 'monospace', marginTop: '3px' }}>{themeId} · {items.length} questions{drafts.length > 0 ? ` · ${drafts.length} en attente` : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setGenerateModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '7px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
              fontFamily: 'inherit', cursor: 'pointer',
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#fcd34d',
            }}
          >
            ✨ Générer
          </button>
          <button
            onClick={deploy}
            disabled={deploying}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
              fontFamily: 'inherit', cursor: deploying ? 'not-allowed' : 'pointer',
              background: deploying ? 'rgba(255,255,255,0.04)' : '#6366f1',
              border: deploying ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(99,102,241,0.3)',
              color: deploying ? '#2d2d3d' : '#fff', opacity: deploying ? 0.6 : 1,
            }}
          >
            {deploying ? '⟳ Déploiement…' : '↑ Déployer sur GitHub'}
          </button>
        </div>
      </div>

      {/* Deploy message */}
      {deployMsg && (
        <div style={{
          marginBottom: '16px', padding: '10px 14px', borderRadius: '8px', fontSize: '12px',
          ...(deployMsg.type === 'ok'
            ? { background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', color: '#6ee7b7' }
            : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#fca5a5' }
          ),
        }}>{deployMsg.text}</div>
      )}

      {quotaError && (
        <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: '8px', color: '#fca5a5', fontSize: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <span>⚠️ {quotaError}</span>
          <button onClick={() => setQuotaError(null)} style={{ color: '#55556a', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', padding: 0, flexShrink: 0 }}>✕</button>
        </div>
      )}

      {/* V2 Last Run Info */}
      {!v2Running && !v2Finished && v2LastRun && v2LastRun.reason !== 'done' && (
        <div style={{
          padding: '10px 14px',
          background: v2LastRun.reason === 'quota' ? 'rgba(239,68,68,0.06)' : 'rgba(251,191,36,0.06)',
          border: `1px solid ${v2LastRun.reason === 'quota' ? 'rgba(239,68,68,0.15)' : 'rgba(251,191,36,0.15)'}`,
          borderRadius: '8px', marginBottom: '16px', fontSize: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: v2LastRun.reason === 'quota' ? '#fca5a5' : '#fcd34d', fontWeight: 600 }}>
              {v2LastRun.reason === 'quota' ? '⚠️ Dernière session : quota atteint' :
               v2LastRun.reason === 'stopped' ? '⏹ Dernière session : arrêtée manuellement' :
               v2LastRun.reason === 'error' ? '❌ Dernière session : erreur' :
               '📋 Dernière session'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#55556a', fontSize: '11px' }}>
                {v2LastRun.endedAt ? new Date(v2LastRun.endedAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
              <button onClick={() => setV2LastRun(null)} style={{ color: '#38384f', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', padding: 0 }}>✕</button>
            </div>
          </div>
          {v2LastRun.detail && <div style={{ color: '#8888a0', marginBottom: '4px' }}>{v2LastRun.detail}</div>}
          {v2LastRun.stats && (
            <div style={{ display: 'flex', gap: '12px', color: '#55556a', fontSize: '11px', flexWrap: 'wrap' }}>
              {v2LastRun.stats.confirmed > 0 && <span>✅ {v2LastRun.stats.confirmed} confirmées</span>}
              {v2LastRun.stats.corrected > 0 && <span>🔧 {v2LastRun.stats.corrected} corrigées</span>}
              {v2LastRun.stats.uncertain > 0 && <span>⚠️ {v2LastRun.stats.uncertain} incertaines</span>}
              {v2LastRun.stats.errors > 0 && <span>❌ {v2LastRun.stats.errors} erreurs</span>}
            </div>
          )}
          {v2LastRun.errorBreakdown && Object.values(v2LastRun.errorBreakdown).some(v => v > 0) && (
            <div style={{ display: 'flex', gap: '12px', color: '#55556a', fontSize: '11px', marginTop: '2px', flexWrap: 'wrap' }}>
              {v2LastRun.errorBreakdown.quota > 0 && <span style={{ color: '#f87171' }}>Quota: {v2LastRun.errorBreakdown.quota}</span>}
              {v2LastRun.errorBreakdown.timeout > 0 && <span style={{ color: '#fbbf24' }}>Timeout: {v2LastRun.errorBreakdown.timeout}</span>}
              {v2LastRun.errorBreakdown.cli_error > 0 && <span style={{ color: '#fb923c' }}>CLI: {v2LastRun.errorBreakdown.cli_error}</span>}
              {v2LastRun.errorBreakdown.parse > 0 && <span style={{ color: '#c084fc' }}>Parse: {v2LastRun.errorBreakdown.parse}</span>}
            </div>
          )}
          <div style={{ marginTop: '6px', color: '#818cf8', fontSize: '11px' }}>
            Relancez "Vérifier tout v2" pour reprendre là où ça s'est arrêté.
          </div>
        </div>
      )}

      {/* V2 Progress Banner */}
      {v2Running && (
        <div style={{
          padding: '16px 18px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: '10px', marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#818cf8', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <span style={{ fontSize: '13px', color: '#a5b4fc', fontWeight: 600 }}>
                {v2Progress?.phase || 'Démarrage…'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {v2Progress && v2Progress.total > 0 && (
                <span style={{ fontSize: '12px', color: '#818cf8', fontFamily: 'monospace' }}>
                  {v2Progress.current}/{v2Progress.total}
                </span>
              )}
              <button
                onClick={stopBatch}
                style={{ fontSize: '11px', padding: '4px 10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Stop
              </button>
            </div>
          </div>
          {v2Progress?.detail && (
            <div style={{ fontSize: '11px', color: '#55556a', marginBottom: '8px' }}>{v2Progress.detail}</div>
          )}
          {v2Progress && v2Progress.total > 0 && (
            <div style={{ height: '4px', background: 'rgba(99,102,241,0.15)', borderRadius: '2px', overflow: 'hidden', marginBottom: '8px' }}>
              <div style={{ height: '100%', background: '#6366f1', width: `${(v2Progress.current / v2Progress.total) * 100}%`, transition: 'width 0.5s ease' }} />
            </div>
          )}
          {v2Stats && (
            <div style={{ display: 'flex', gap: '14px', fontSize: '11px', flexWrap: 'wrap' }}>
              {v2Stats.confirmed > 0 && <span style={{ color: '#4ade80' }}>✅ {v2Stats.confirmed} confirmées</span>}
              {v2Stats.corrected > 0 && <span style={{ color: '#818cf8' }}>🔧 {v2Stats.corrected} corrigées</span>}
              {v2Stats.uncertain > 0 && <span style={{ color: '#fcd34d' }}>⚠️ {v2Stats.uncertain} incertaines</span>}
              {v2Stats.rewritten > 0 && <span style={{ color: '#c4c4d4' }}>✏️ {v2Stats.rewritten} réécrites (P1)</span>}
              {v2Stats.errors > 0 && <span style={{ color: '#f87171' }}>❌ {v2Stats.errors} erreurs</span>}
            </div>
          )}
        </div>
      )}

      {/* V2 Results Summary (after completion) */}
      {!v2Running && v2Stats && (v2Stats.confirmed + v2Stats.corrected + v2Stats.uncertain + v2Stats.rewritten > 0) && (
        <div style={{
          padding: '12px 16px',
          background: v2Finished?.phase === 'done' ? 'rgba(74,222,128,0.05)' : v2Finished?.phase === 'quota' ? 'rgba(239,68,68,0.05)' : 'rgba(99,102,241,0.05)',
          border: `1px solid ${v2Finished?.phase === 'done' ? 'rgba(74,222,128,0.15)' : v2Finished?.phase === 'quota' ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)'}`,
          borderRadius: '10px', marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', color: v2Finished?.phase === 'done' ? '#4ade80' : '#fcd34d', fontWeight: 600 }}>
              {v2Finished?.phase === 'done' ? '✅ Vérification terminée' : v2Finished?.phase === 'stopped' ? '⏹ Vérification arrêtée' : v2Finished?.phase === 'quota' ? '⚠️ Quota atteint' : '📋 Résultats'}
            </span>
            <button onClick={() => { setV2Stats(null); setV2Finished(null); }} style={{ color: '#38384f', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: '14px', fontSize: '12px', flexWrap: 'wrap' }}>
            <span style={{ color: '#4ade80' }}>✅ {v2Stats.confirmed} auto-validées</span>
            <span style={{ color: '#818cf8' }}>🔧 {v2Stats.corrected} corrigées + validées</span>
            <span style={{ color: '#fcd34d' }}>⚠️ {v2Stats.uncertain} à revoir</span>
            <span style={{ color: '#c4c4d4' }}>✏️ {v2Stats.rewritten} réécrites (structure)</span>
          </div>
        </div>
      )}

      {/* Stats + progress */}
      <div style={{ padding: '12px 16px', background: '#111116', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <span style={{ fontSize: '12px', color: '#818cf8', fontWeight: 600 }}>
            ✓ {stats.validated}/{stats.total} validées ({validatedPct}%)
          </span>
          {stats.erreur > 0 && <span style={{ fontSize: '12px', color: '#f87171' }}>✕ {stats.erreur} erreurs</span>}
          {stats.attention > 0 && <span style={{ fontSize: '12px', color: '#fcd34d' }}>⚠ {stats.attention} attention</span>}
          {stats.ok > 0 && <span style={{ fontSize: '12px', color: '#4ade80' }}>✓ {stats.ok} OK (IA)</span>}
          <div style={{ flex: 1 }} />

          {/* Batch progress ou boutons vérification */}
          {batchVerifying && batchProgress ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#818cf8', fontFamily: 'monospace' }}>
                ⟳ {batchProgress.current}/{batchProgress.total}
                {batchProgress.currentId && ` — #${(itemIndexMap.get(batchProgress.currentId) ?? -1) + 1}`}
              </span>
              <div style={{ width: '80px', height: '4px', background: 'rgba(99,102,241,0.15)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#6366f1', width: `${(batchProgress.current / batchProgress.total) * 100}%`, transition: 'width 0.3s' }} />
              </div>
              <button
                onClick={stopBatch}
                style={{ fontSize: '11px', padding: '3px 8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', borderRadius: '5px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                ■ Stop
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {/* V2 Button */}
              <button
                onClick={verifyAllV2}
                disabled={v2Running || batchVerifying || stats.unvalidated === 0}
                style={{
                  fontSize: '11px', padding: '5px 12px', fontFamily: 'inherit',
                  background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)',
                  color: '#6ee7b7', borderRadius: '6px', fontWeight: 600,
                  cursor: (v2Running || batchVerifying || stats.unvalidated === 0) ? 'not-allowed' : 'pointer',
                  opacity: (v2Running || batchVerifying || stats.unvalidated === 0) ? 0.4 : 1,
                }}
              >
                🚀 Vérifier tout v2 ({stats.unvalidated})
              </button>

              {/* V1 buttons */}
              <button
                onClick={() => verifyAll(false)}
                disabled={batchVerifying || v2Running || stats.unverified === 0}
                style={{
                  fontSize: '11px', padding: '5px 12px', fontFamily: 'inherit',
                  background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                  color: '#818cf8', borderRadius: '6px',
                  cursor: (batchVerifying || v2Running || stats.unverified === 0) ? 'not-allowed' : 'pointer',
                  opacity: (batchVerifying || v2Running || stats.unverified === 0) ? 0.4 : 1,
                }}
              >
                🤖 Vérifier v1 ({stats.unverified})
              </button>
              {(stats.ok + stats.attention + stats.erreur) > 0 && (
                <button
                  onClick={() => verifyAll(true)}
                  disabled={batchVerifying || v2Running}
                  title="Re-vérifier toutes les questions, y compris celles déjà vérifiées"
                  style={{
                    fontSize: '11px', padding: '5px 10px', fontFamily: 'inherit',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    color: '#38384f', borderRadius: '6px', cursor: (batchVerifying || v2Running) ? 'not-allowed' : 'pointer',
                  }}
                >
                  ↺ Re-vérifier v1
                </button>
              )}
            </div>
          )}

          {filteredItems.length > 0 && filter !== 'validated' && (
            <button
              onClick={validateAll}
              style={{
                fontSize: '11px', padding: '5px 12px', fontFamily: 'inherit',
                background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
                color: '#a5b4fc', borderRadius: '6px', cursor: 'pointer', fontWeight: 600,
              }}
            >
              ✓ Valider visible ({filteredItems.length})
            </button>
          )}
        </div>

        {/* Barre de progression */}
        <div style={{ display: 'flex', height: '4px', borderRadius: '2px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', gap: '1px' }}>
          {stats.validated > 0 && <div style={{ width: `${validatedPct}%`, background: '#6366f1' }} />}
          {stats.ok > 0 && <div style={{ width: `${Math.round((stats.ok / stats.total) * 100)}%`, background: '#4ade80' }} />}
          {stats.attention > 0 && <div style={{ width: `${Math.round((stats.attention / stats.total) * 100)}%`, background: '#fcd34d' }} />}
          {stats.erreur > 0 && <div style={{ width: `${Math.round((stats.erreur / stats.total) * 100)}%`, background: '#f87171' }} />}
        </div>
      </div>

      {/* Barre de sélection */}
      {selectedIds.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', marginBottom: '12px' }}>
          <span style={{ fontSize: '11px', color: '#818cf8', fontWeight: 600 }}>{selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}</span>
          <button onClick={validateSelected} style={{ fontSize: '11px', padding: '3px 10px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', borderRadius: '5px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>✓ Valider</button>
          <button onClick={() => setSelectedIds(new Set())} style={{ fontSize: '11px', color: '#38384f', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Désélect.</button>
          <div style={{ flex: 1 }} />
          <button onClick={() => setSelectedIds(new Set(filteredItems.map(i => i.id)))} style={{ fontSize: '11px', color: '#38384f', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Tout sélectionner</button>
        </div>
      )}

      {/* Recherche + Filtres */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Rechercher dans les questions…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, maxWidth: '280px', background: '#111116', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '8px', padding: '7px 12px', color: '#c4c4d4', fontSize: '12px',
            outline: 'none', fontFamily: 'inherit',
          }}
          onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.3)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.07)'}
        />
        <div className="pr-tabs" style={{ flex: 1 }}>
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} className={`pr-tab${filter === f.key ? ' active' : ''}`}>
              {f.label}
            </button>
          ))}
        </div>
        {filteredItems.length > 0 && (
          <button
            onClick={() => setSelectedIds(prev =>
              prev.size === filteredItems.length ? new Set() : new Set(filteredItems.map(i => i.id))
            )}
            style={{ fontSize: '11px', padding: '5px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#38384f', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
          >
            {selectedIds.size === filteredItems.length ? '□ Désélect.' : '☐ Tout sélect.'}
          </button>
        )}
      </div>

      {/* Drafts en attente */}
      {drafts.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', color: '#fcd34d', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
            ✨ {drafts.length} question{drafts.length > 1 ? 's' : ''} générée{drafts.length > 1 ? 's' : ''} — à valider
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {drafts.map(draft => (
              <DraftCard key={draft.id} draft={draft} onAccept={acceptDraft} onReject={rejectDraft} />
            ))}
          </div>
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '16px 0' }} />
        </div>
      )}

      {/* Cards questions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#2d2d3d' }}>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>
              {filter === 'validated' ? '🎉' : filter === 'unvalidated' ? '✨' : '🔍'}
            </div>
            <p style={{ fontSize: '13px' }}>
              {filter === 'validated' ? "Aucune question validée pour l'instant"
               : filter === 'unvalidated' ? 'Toutes les questions sont validées !'
               : 'Aucune question dans ce filtre'}
            </p>
          </div>
        ) : (
          pagedItems.map((item) => (
            <QuestionCard
              key={item.id}
              item={item}
              idx={itemIndexMap.get(item.id) ?? 0}
              verdict={verdicts[item.id]}
              isVerifying={verifyingIds.has(item.id)}
              isSaved={savedIds.has(item.id)}
              isModified={modifiedIds.has(item.id)}
              isHighlighted={highlightId === item.id}
              batchVerifying={batchVerifying || v2Running}
              isBatchCurrent={batchProgress?.currentId === item.id}
              cardRef={el => { rowRefs.current[item.id] = el; }}
              onUpdate={updateItem}
              onVerify={verifyItem}
              onAcceptCorrection={acceptCorrection}
              onClearVerdict={clearVerdict}
              onSave={saveItem}
              onValidate={validateItem}
              onUnvalidate={unvalidateItem}
              onDelete={deleteItem}
              isSelected={selectedIds.has(item.id)}
              onToggleSelect={toggleSelect}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', paddingTop: '20px', paddingBottom: '8px' }}>
          <button
            onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0 }); }}
            disabled={page === 0}
            style={{
              fontSize: '12px', padding: '6px 16px', borderRadius: '7px', fontFamily: 'inherit',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: page === 0 ? '#2d2d3d' : '#8888a0', cursor: page === 0 ? 'not-allowed' : 'pointer',
            }}
          >← Préc.</button>
          <span style={{ fontSize: '12px', color: '#38384f', fontFamily: 'monospace' }}>
            {page + 1} / {totalPages} · #{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredItems.length)} sur {filteredItems.length}
          </span>
          <button
            onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0 }); }}
            disabled={page === totalPages - 1}
            style={{
              fontSize: '12px', padding: '6px 16px', borderRadius: '7px', fontFamily: 'inherit',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: page === totalPages - 1 ? '#2d2d3d' : '#8888a0', cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer',
            }}
          >Suiv. →</button>
        </div>
      )}

      {/* Modal génération */}
      {generateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#111116', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '24px', width: '380px', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#ededf5', marginBottom: '18px', margin: '0 0 18px 0' }}>
              ✨ Générer des questions
            </h3>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', color: '#55556a', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nombre de questions</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[5, 10, 15, 20].map(n => (
                  <button
                    key={n}
                    onClick={() => setGenerateCount(n)}
                    style={{
                      flex: 1, padding: '8px', borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer',
                      background: generateCount === n ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${generateCount === n ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.07)'}`,
                      color: generateCount === n ? '#a5b4fc' : '#55556a',
                      fontWeight: generateCount === n ? 600 : 400,
                    }}
                  >{n}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', color: '#55556a', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Focus (optionnel)</div>
              <input
                type="text"
                placeholder="ex: Personnages secondaires, Saison 3, Combats…"
                value={generateFocus}
                onChange={e => setGenerateFocus(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !generating && generateQuestions()}
                style={{
                  width: '100%', background: '#0d0d12', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px', padding: '8px 12px', color: '#c4c4d4', fontSize: '12px',
                  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.35)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
              <p style={{ fontSize: '11px', color: '#38384f', margin: '6px 0 0 0' }}>
                Claude lira tout le thème ({items.length} questions) pour éviter les doublons.
              </p>
            </div>

            {generateMsg && (
              <div style={{ marginBottom: '14px', padding: '8px 12px', borderRadius: '7px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#fca5a5', fontSize: '11px' }}>
                {generateMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setGenerateModal(false); setGenerateMsg(null); }}
                style={{ padding: '8px 16px', borderRadius: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#55556a', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Annuler
              </button>
              <button
                onClick={generateQuestions}
                disabled={generating}
                style={{
                  padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: generating ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', fontWeight: 600,
                  background: generating ? 'rgba(255,255,255,0.04)' : '#6366f1',
                  border: 'none', color: generating ? '#2d2d3d' : '#fff',
                  opacity: generating ? 0.7 : 1,
                }}
              >
                {generating ? '⟳ Génération en cours…' : `✨ Générer ${generateCount} questions`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
