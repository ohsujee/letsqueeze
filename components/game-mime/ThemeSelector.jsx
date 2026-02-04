'use client';

import { useState, useEffect } from 'react';
import { getDatabase, ref, get } from 'firebase/database';
import { getApp } from 'firebase/app';
import { Check } from 'lucide-react';
import './ThemeSelector.css';

// Thèmes disponibles par défaut (si pas dans Firebase)
const DEFAULT_THEMES = [
  { id: 'actions', name: 'Actions', emoji: '🏃', wordCount: 50 },
  { id: 'animaux', name: 'Animaux', emoji: '🐕', wordCount: 40 },
  { id: 'metiers', name: 'Métiers', emoji: '👨‍🍳', wordCount: 35 },
  { id: 'sports', name: 'Sports', emoji: '⚽', wordCount: 30 },
  { id: 'films', name: 'Films', emoji: '🎬', wordCount: 45 },
  { id: 'objets', name: 'Objets', emoji: '📦', wordCount: 50 },
  { id: 'celebrites', name: 'Célébrités', emoji: '⭐', wordCount: 30 },
  { id: 'lieux', name: 'Lieux', emoji: '🏠', wordCount: 35 },
];

/**
 * ThemeSelector - Sélection des thèmes pour Mime
 *
 * @param {Object} props
 * @param {string[]} props.selectedThemes - IDs des thèmes sélectionnés
 * @param {Function} props.onChange - Callback quand la sélection change
 */
export default function ThemeSelector({ selectedThemes = [], onChange }) {
  const [themes, setThemes] = useState(DEFAULT_THEMES);
  const [loading, setLoading] = useState(true);
  const db = getDatabase(getApp());

  // Charger les thèmes depuis Firebase
  useEffect(() => {
    const loadThemes = async () => {
      try {
        const themesSnap = await get(ref(db, 'mime_themes'));
        const data = themesSnap.val();

        if (data) {
          // Convertir l'objet en tableau
          const themesArray = Object.entries(data).map(([id, theme]) => ({
            id,
            name: theme.name || id,
            emoji: theme.emoji || '🎭',
            wordCount: theme.words?.length || 0
          }));
          setThemes(themesArray);
        }
      } catch (error) {
        console.warn('Using default themes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadThemes();
  }, [db]);

  // Toggle un thème
  const toggleTheme = (themeId) => {
    const newSelection = selectedThemes.includes(themeId)
      ? selectedThemes.filter(id => id !== themeId)
      : [...selectedThemes, themeId];

    onChange(newSelection);
  };

  // Sélectionner tous les thèmes
  const selectAll = () => {
    onChange(themes.map(t => t.id));
  };

  // Désélectionner tous
  const selectNone = () => {
    onChange([]);
  };

  if (loading) {
    return (
      <div className="theme-selector loading">
        <div className="loader-sm" />
      </div>
    );
  }

  return (
    <div className="theme-selector">
      {/* Actions rapides */}
      <div className="theme-actions">
        <button
          className="btn-select-action"
          onClick={selectAll}
          disabled={selectedThemes.length === themes.length}
        >
          Tout sélectionner
        </button>
        <button
          className="btn-select-action"
          onClick={selectNone}
          disabled={selectedThemes.length === 0}
        >
          Tout désélectionner
        </button>
      </div>

      {/* Grille des thèmes */}
      <div className="themes-grid">
        {themes.map((theme) => {
          const isSelected = selectedThemes.includes(theme.id);
          return (
            <button
              key={theme.id}
              className={`theme-card ${isSelected ? 'selected' : ''}`}
              onClick={() => toggleTheme(theme.id)}
            >
              <span className="theme-emoji">{theme.emoji}</span>
              <span className="theme-name">{theme.name}</span>
              {theme.wordCount > 0 && (
                <span className="theme-count">{theme.wordCount} mots</span>
              )}
              {isSelected && (
                <div className="theme-check">
                  <Check size={16} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Info sélection */}
      <div className="selection-info">
        {selectedThemes.length} thème{selectedThemes.length !== 1 ? 's' : ''} sélectionné{selectedThemes.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
