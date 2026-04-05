"use client";
import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Lock, ChevronLeft } from 'lucide-react';
import { useBackHandler } from '@/lib/hooks/useBackHandler';

export default function QuizSelectorModal({
  isOpen, onClose, categories, currentSelection, onSelectQuiz, userIsPro
}) {
  const [mounted, setMounted] = useState(false);
  const [screen, setScreen] = useState('categories');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedThemes, setSelectedThemes] = useState([]);

  useEffect(() => { setMounted(true); }, []);

  const handleClose = useCallback(() => {
    setScreen('categories');
    setSelectedCategory(null);
    setSelectedThemes([]);
    onClose();
  }, [onClose]);

  useBackHandler(handleClose, isOpen);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (currentSelection?.categoryId) {
        const cat = categories.find(c => c.id === currentSelection.categoryId);
        if (cat) {
          setSelectedCategory(cat);
          setSelectedThemes(currentSelection.themeIds || []);
          setScreen('themes');
        }
      } else {
        setScreen('categories');
        setSelectedCategory(null);
        setSelectedThemes([]);
      }
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen, currentSelection, categories]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setSelectedThemes([]);
    setScreen('themes');
  };

  const handleBack = () => {
    setScreen('categories');
    setSelectedCategory(null);
    setSelectedThemes([]);
  };

  const handleThemeToggle = (themeId, isLocked, isComingSoon) => {
    if (isLocked || isComingSoon) return;
    setSelectedThemes(prev =>
      prev.includes(themeId) ? prev.filter(id => id !== themeId) : [...prev, themeId]
    );
  };

  const handleSelectAll = () => {
    if (!selectedCategory) return;
    const available = selectedCategory.themes.filter(t => !t.comingSoon && (userIsPro || t.free)).map(t => t.id);
    const allSelected = available.every(id => selectedThemes.includes(id));
    setSelectedThemes(allSelected ? [] : available);
  };

  const handleValidate = () => {
    if (selectedThemes.length === 0) return;
    onSelectQuiz({
      categoryId: selectedCategory.id,
      categoryName: selectedCategory.name,
      categoryEmoji: selectedCategory.emoji,
      themeIds: selectedThemes,
      themes: selectedCategory.themes.filter(t => selectedThemes.includes(t.id))
    });
    handleClose();
  };

  const totalQuestions = selectedCategory?.themes
    .filter(t => selectedThemes.includes(t.id))
    .reduce((sum, t) => sum + t.questionCount, 0) || 0;

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="quiz-modal-wrapper open"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <div className="quiz-modal-backdrop" onClick={handleClose} />

          {/* Modal */}
          <motion.div
            className="quiz-modal"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 400, mass: 0.8 }}
          >
            {/* Handle */}
            <div className="quiz-modal-handle" />

            {/* Header */}
            <div className="quiz-modal-header">
              {screen === 'themes' && (
                <button className="quiz-modal-back" onClick={handleBack}>
                  <ChevronLeft size={24} />
                </button>
              )}
              <h2 className="quiz-modal-title">
                {screen === 'categories' ? 'Choisis ta catégorie' : selectedCategory?.name}
              </h2>
              <button className="quiz-modal-close" onClick={handleClose}>
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="quiz-modal-content">
              <AnimatePresence mode="wait">
                {screen === 'categories' ? (
                  <motion.div
                    key="categories"
                    className="quiz-categories-grid"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {categories.map((category, index) => {
                      const availableCount = category.themes.filter(t => !t.comingSoon).length;
                      const isCurrentCategory = currentSelection?.categoryId === category.id;
                      return (
                        <motion.button
                          key={category.id}
                          className={`quiz-category-card ${isCurrentCategory ? 'selected' : ''}`}
                          onClick={() => handleCategoryClick(category)}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <span className="category-emoji">{category.emoji}</span>
                          <span className="category-name">{category.name}</span>
                          <span className="category-count">{availableCount} thème{availableCount > 1 ? 's' : ''}</span>
                          {isCurrentCategory && (
                            <div className="category-selected-badge"><Check size={12} /></div>
                          )}
                        </motion.button>
                      );
                    })}
                  </motion.div>
                ) : (
                  <motion.div
                    key="themes"
                    className="quiz-themes-container"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="quiz-themes-header">
                      <p className="quiz-themes-subtitle">Sélectionne les thèmes à mélanger</p>
                      <button className="quiz-select-all-btn" onClick={handleSelectAll}>
                        {selectedCategory?.themes
                          .filter((t, i) => !t.comingSoon && (userIsPro || i < 3))
                          .every(t => selectedThemes.includes(t.id))
                          ? 'Tout désélectionner' : 'Tout sélectionner'}
                      </button>
                    </div>

                    <div className="quiz-themes-list">
                      {selectedCategory?.themes.map((theme, index) => {
                        const isSelected = selectedThemes.includes(theme.id);
                        const isLocked = !userIsPro && !theme.free;
                        const isComingSoon = theme.comingSoon;
                        const isDisabled = isLocked || isComingSoon;
                        return (
                          <motion.button
                            key={theme.id}
                            className={`quiz-theme-item ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                            onClick={() => handleThemeToggle(theme.id, isLocked, isComingSoon)}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                          >
                            <div className={`theme-checkbox ${isSelected ? 'checked' : ''}`}>
                              {(isLocked || isComingSoon) ? <Lock size={14} /> : isSelected ? <Check size={14} /> : null}
                            </div>
                            <span className="theme-emoji">{theme.emoji}</span>
                            <div className="theme-info">
                              <span className="theme-title">
                                {theme.title}
                                {theme.isNew && !isDisabled && <span className="theme-new-badge">NEW</span>}
                              </span>
                              <span className="theme-meta">
                                {isComingSoon ? 'Bientôt disponible' : `${theme.questionCount} questions`}
                              </span>
                            </div>
                            {isLocked && !isComingSoon && <span className="theme-lock-badge">PRO</span>}
                          </motion.button>
                        );
                      })}
                    </div>

                    <div className="quiz-themes-footer">
                      <button
                        className={`quiz-validate-btn ${selectedThemes.length === 0 ? 'disabled' : ''}`}
                        onClick={handleValidate}
                        disabled={selectedThemes.length === 0}
                      >
                        <span className="validate-text">
                          {selectedThemes.length === 0
                            ? 'Sélectionne au moins 1 thème'
                            : `Valider (${selectedThemes.length} thème${selectedThemes.length > 1 ? 's' : ''})`}
                        </span>
                        <span className="validate-meta">
                          {totalQuestions > 0 && `${totalQuestions} questions disponibles`}
                        </span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
