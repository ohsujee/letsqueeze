'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import GameCardOriginal from './GameCardOriginal';
import './card-compare.css';

const GAMES_DATA = [
  { id: 'quiz', name: 'Quiz Buzzer', image: '/images/optimized/quiz-buzzer.webp', minPlayers: 2, color: '#8b5cf6' },
  { id: 'alibi', name: 'Alibi', image: '/images/optimized/alibi.webp', minPlayers: 3, color: '#f59e0b' },
  { id: 'blindtest', name: 'Blind Test', image: '/images/optimized/blind-test.webp', minPlayers: 2, poweredBy: 'deezer', color: '#A238FF' },
  { id: 'mime', name: 'Mime', image: '/images/optimized/mime-game.webp', minPlayers: 2, color: '#34d399' },
  { id: 'laregle', name: 'La Règle', image: '/images/optimized/laregle.webp', minPlayers: 2, isNew: true, color: '#06b6d4' },
  { id: 'lol', name: 'LOL', image: '/images/optimized/lol.webp', minPlayers: 2, isNew: true, color: '#EF4444' },
  { id: 'mindlink', name: 'Mind Link', image: '/images/optimized/mindlink.webp', minPlayers: 3, isNew: true, color: '#ec4899' },
  { id: 'imposteur', name: 'Imposteur', image: '/images/optimized/imposteur.webp', minPlayers: 3, isNew: true, color: '#84cc16' },
  { id: 'memory', name: 'Memory', image: '/images/optimized/memory.webp', minPlayers: 2, comingSoon: true, color: '#ec4899' },
];

const TITLE_POSITIONS = ['center', 'bottom', 'off'];
const DB_NAME = 'cc_card_compare';
const DB_STORE = 'state';
const DB_VERSION = 1;

const defaultCrop = () => ({ scale: 1, x: 0, y: 0 });

// Read file as base64 data URL
function fileToDataURL(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

// ---- IndexedDB helpers (no size limit like localStorage) ----
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const store = tx.objectStore(DB_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

async function idbSet(key, value) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      const store = tx.objectStore(DB_STORE);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch { /* ignore */ }
}

async function idbClear() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      const store = tx.objectStore(DB_STORE);
      store.clear();
      tx.oncomplete = () => resolve();
    });
  } catch { /* ignore */ }
}

export default function CardComparePage() {
  const [loaded, setLoaded] = useState(false);
  const [newImages, setNewImages] = useState({});
  const [crops, setCrops] = useState({});
  const [validated, setValidated] = useState({});
  const [titlePos, setTitlePos] = useState('center');
  const dragRef = useRef(null);

  // Load from IndexedDB on mount
  useEffect(() => {
    (async () => {
      const saved = await idbGet('data');
      if (saved) {
        if (saved.images) setNewImages(saved.images);
        if (saved.crops) setCrops(saved.crops);
        if (saved.validated) setValidated(saved.validated);
        if (saved.titlePos) setTitlePos(saved.titlePos);
      }
      setLoaded(true);
    })();
  }, []);

  // Persist to IndexedDB on change (debounced)
  const saveTimer = useRef(null);
  useEffect(() => {
    if (!loaded) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      idbSet('data', { images: newImages, crops, validated, titlePos });
    }, 300);
  }, [newImages, crops, validated, titlePos, loaded]);

  const getCrop = (gameId) => crops[gameId] || defaultCrop();

  const handleDrop = async (gameId, e) => {
    e.preventDefault();
    e.currentTarget.classList?.remove('cc-drop-zone--active');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const dataURL = await fileToDataURL(files[0]);
      setNewImages(prev => ({ ...prev, [gameId]: dataURL }));
      setCrops(prev => ({ ...prev, [gameId]: defaultCrop() }));
      setValidated(prev => ({ ...prev, [gameId]: false }));
    }
  };

  // Zoom with mouse wheel (only when holding Ctrl or Shift to not block scroll)
  const handleWheel = useCallback((gameId, e) => {
    if (!e.ctrlKey && !e.shiftKey) return; // let page scroll normally
    e.preventDefault();
    setCrops(prev => {
      const crop = prev[gameId] || defaultCrop();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      const newScale = Math.max(0.3, Math.min(3, crop.scale + delta));
      return { ...prev, [gameId]: { ...crop, scale: newScale } };
    });
    setValidated(prev => ({ ...prev, [gameId]: false }));
  }, []);

  // Drag to reposition
  const handlePointerDown = useCallback((gameId, e) => {
    e.preventDefault();
    const crop = crops[gameId] || defaultCrop();
    dragRef.current = {
      gameId,
      startX: e.clientX - crop.x,
      startY: e.clientY - crop.y,
    };

    const onMove = (ev) => {
      if (!dragRef.current) return;
      const { gameId: id, startX, startY } = dragRef.current;
      setCrops(prev => ({
        ...prev,
        [id]: { ...(prev[id] || defaultCrop()), x: ev.clientX - startX, y: ev.clientY - startY },
      }));
      setValidated(prev => ({ ...prev, [id]: false }));
    };

    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [crops]);

  // Reset crop
  const handleReset = (gameId) => {
    setCrops(prev => ({ ...prev, [gameId]: defaultCrop() }));
    setValidated(prev => ({ ...prev, [gameId]: false }));
  };

  // Remove image
  const handleRemove = (gameId) => {
    setNewImages(prev => {
      const next = { ...prev };
      delete next[gameId];
      return next;
    });
    setCrops(prev => {
      const next = { ...prev };
      delete next[gameId];
      return next;
    });
    setValidated(prev => ({ ...prev, [gameId]: false }));
  };

  // Replace image via file picker
  const handleReplace = (gameId) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        const dataURL = await fileToDataURL(file);
        setNewImages(prev => ({ ...prev, [gameId]: dataURL }));
        setCrops(prev => ({ ...prev, [gameId]: defaultCrop() }));
        setValidated(prev => ({ ...prev, [gameId]: false }));
      }
    };
    input.click();
  };

  const toggleValidated = (gameId) => {
    setValidated(prev => ({ ...prev, [gameId]: !prev[gameId] }));
  };

  // Clear everything
  const handleClearAll = () => {
    setNewImages({});
    setCrops({});
    setValidated({});
    idbClear();
  };

  const validatedCount = Object.values(validated).filter(Boolean).length;
  const hasAnyImage = Object.keys(newImages).length > 0;

  if (!loaded) return null;

  return (
    <div className="cc-page">
      <header className="cc-header">
        <h1 className="cc-title">Game Cards — Old vs New</h1>
        <p className="cc-subtitle">
          Glisse les images, molette = zoom, drag = repositionner. Persiste au refresh.
        </p>
        <div className="cc-controls">
          <div className="cc-progress">
            <span className="cc-progress-count">{validatedCount}/{GAMES_DATA.length}</span>
            <span className="cc-progress-label">validées</span>
          </div>
          <div className="cc-title-toggle">
            <span className="cc-toggle-label">Titre</span>
            {TITLE_POSITIONS.map(pos => (
              <button
                key={pos}
                className={`cc-toggle-btn ${titlePos === pos ? 'cc-toggle-btn--active' : ''}`}
                onClick={() => setTitlePos(pos)}
              >
                {pos === 'center' ? 'Centre' : pos === 'bottom' ? 'Bas' : 'Off'}
              </button>
            ))}
          </div>
          {hasAnyImage && (
            <button className="cc-crop-btn cc-clear-btn" onClick={handleClearAll}>
              Tout effacer
            </button>
          )}
        </div>
      </header>

      <div className="cc-grid">
        {GAMES_DATA.map(game => {
          const newImg = newImages[game.id];
          const crop = getCrop(game.id);
          const isValidated = validated[game.id];

          return (
            <div key={game.id} className={`cc-row ${isValidated ? 'cc-row--validated' : ''}`}>
              <div className="cc-game-name" style={{ color: game.color }}>{game.name}</div>

              <div className="cc-compare">
                {/* Original */}
                <div className="cc-slot">
                  <span className="cc-slot-label">Original</span>
                  <div className="cc-card-wrap">
                    <GameCardOriginal game={game} />
                  </div>
                </div>

                <div className="cc-arrow">→</div>

                {/* NEW — drop zone or interactive crop preview */}
                <div className="cc-slot">
                  <span className="cc-slot-label">New</span>
                  {newImg ? (
                    <div className="cc-preview-wrap">
                      <div
                        className={`cc-preview ${isValidated ? 'cc-preview--locked' : ''}`}
                        onWheel={(e) => !isValidated && handleWheel(game.id, e)}
                        onPointerDown={(e) => !isValidated && handlePointerDown(game.id, e)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(game.id, e)}
                      >
                        <img
                          src={newImg}
                          alt=""
                          className="cc-preview-img"
                          draggable={false}
                          style={{
                            transform: `translate(${crop.x}px, ${crop.y}px) scale(${crop.scale})`,
                          }}
                        />
                        <div className="cc-preview-overlay" />
                        {titlePos !== 'off' && (
                          <div className={`cc-preview-title cc-preview-title--${titlePos}`}>
                            <h3 className="cc-preview-name">{game.name}</h3>
                          </div>
                        )}
                        {game.minPlayers && (
                          <div className="cc-preview-pill">{game.minPlayers}+ joueurs</div>
                        )}
                        {!isValidated && (
                          <div className="cc-preview-hint">Ctrl+Molette = zoom · Drag = position</div>
                        )}
                      </div>
                      {/* Crop controls */}
                      {!isValidated && (
                        <div className="cc-crop-controls">
                          <button className="cc-crop-btn" onClick={() => handleReset(game.id)}>Reset</button>
                          <span className="cc-crop-info">{Math.round(crop.scale * 100)}%</span>
                          <button className="cc-crop-btn" onClick={() => handleReplace(game.id)}>Remplacer</button>
                          <button className="cc-crop-btn cc-crop-btn--danger" onClick={() => handleRemove(game.id)}>✕</button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      className="cc-drop-zone"
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('cc-drop-zone--active'); }}
                      onDragLeave={(e) => e.currentTarget.classList.remove('cc-drop-zone--active')}
                      onDrop={(e) => handleDrop(game.id, e)}
                      style={{ borderColor: game.color + '40' }}
                    >
                      <span>Glisse l'image ici</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                className={`cc-validate-btn ${isValidated ? 'cc-validate-btn--active' : ''}`}
                onClick={() => toggleValidated(game.id)}
                style={isValidated ? { background: '#22c55e', borderBottomColor: '#16a34a' } : {}}
              >
                {isValidated ? '✓ Validé' : 'Valider'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
