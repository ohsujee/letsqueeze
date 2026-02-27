"use client";
import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Lock, ChevronLeft, CheckSquare, Square } from 'lucide-react';

export default function QuizSelectorModal({
  isOpen,
  onClose,
  categories,
  currentSelection,
  onSelectQuiz,
  userIsPro
}) {
  const [mounted, setMounted] = useState(false);
  const [screen, setScreen] = useState('categories'); // 'categories' | 'themes'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedThemes, setSelectedThemes] = useState([]);
  const modalRef = useRef(null);
  const dragState = useRef({ isDragging: false, startY: 0 });

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (modalRef.current) {
        modalRef.current.style.transition = '';
        modalRef.current.style.transform = '';
      }
      // If there's a current selection, pre-select it
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
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, currentSelection, categories]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (modalRef.current) {
      modalRef.current.style.transition = '';
      modalRef.current.style.transform = '';
    }
    setScreen('categories');
    setSelectedCategory(null);
    setSelectedThemes([]);
    onClose();
  };

  const handleDragPointerDown = (e) => {
    dragState.current = { isDragging: true, startY: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleDragPointerMove = (e) => {
    if (!dragState.current.isDragging) return;
    const dy = Math.max(0, e.clientY - dragState.current.startY);
    if (modalRef.current) {
      modalRef.current.style.transition = 'none';
      modalRef.current.style.transform = `translateY(${dy}px)`;
    }
  };

  const handleDragPointerUp = (e) => {
    if (!dragState.current.isDragging) return;
    dragState.current.isDragging = false;
    const dy = Math.max(0, e.clientY - dragState.current.startY);
    if (!modalRef.current) return;
    if (dy > 100) {
      modalRef.current.style.transition = 'transform 0.25s ease-in';
      modalRef.current.style.transform = 'translateY(110%)';
      setTimeout(handleClose, 250);
    } else {
      modalRef.current.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
      modalRef.current.style.transform = 'translateY(0)';
    }
  };

  const handleDragPointerCancel = () => {
    if (!dragState.current.isDragging) return;
    dragState.current.isDragging = false;
    if (modalRef.current) {
      modalRef.current.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
      modalRef.current.style.transform = 'translateY(0)';
    }
  };

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
      prev.includes(themeId)
        ? prev.filter(id => id !== themeId)
        : [...prev, themeId]
    );
  };

  const handleSelectAll = () => {
    if (!selectedCategory) return;

    const availableThemes = selectedCategory.themes
      .filter(theme => !theme.comingSoon && (userIsPro || theme.free))
      .map(theme => theme.id);

    // If all are selected, deselect all. Otherwise select all.
    const allSelected = availableThemes.every(id => selectedThemes.includes(id));
    setSelectedThemes(allSelected ? [] : availableThemes);
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

  // Calculate total questions from selected themes
  const totalQuestions = selectedCategory?.themes
    .filter(t => selectedThemes.includes(t.id))
    .reduce((sum, t) => sum + t.questionCount, 0) || 0;

  if (!mounted || !isOpen) return null;

  const modalContent = (
    <div className="quiz-modal-wrapper open">
      <div className="quiz-modal-backdrop" onClick={handleClose} />

      <div ref={modalRef} className="quiz-modal quiz-modal-categories">
        {/* Handle */}
        <div
          className="quiz-modal-handle"
          style={{ touchAction: 'none', cursor: 'grab' }}
          onPointerDown={handleDragPointerDown}
          onPointerMove={handleDragPointerMove}
          onPointerUp={handleDragPointerUp}
          onPointerCancel={handleDragPointerCancel}
        />

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

        {/* Content with animations */}
        <div className="quiz-modal-content">
          <AnimatePresence mode="wait">
            {screen === 'categories' ? (
              /* CATEGORIES GRID */
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
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <span className="category-emoji">{category.emoji}</span>
                      <span className="category-name">{category.name}</span>
                      <span className="category-count">{availableCount} thème{availableCount > 1 ? 's' : ''}</span>
                      {isCurrentCategory && (
                        <div className="category-selected-badge">
                          <Check size={12} />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </motion.div>
            ) : (
              /* THEMES LIST */
              <motion.div
                key="themes"
                className="quiz-themes-container"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Subtitle + Select All */}
                <div className="quiz-themes-header">
                  <p className="quiz-themes-subtitle">
                    Sélectionne les thèmes à mélanger
                  </p>
                  <button
                    className="quiz-select-all-btn"
                    onClick={handleSelectAll}
                  >
                    {selectedCategory?.themes
                      .filter((t, i) => !t.comingSoon && (userIsPro || i < 3))
                      .every(t => selectedThemes.includes(t.id))
                      ? 'Tout désélectionner'
                      : 'Tout sélectionner'}
                  </button>
                </div>

                {/* Themes List */}
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
                        whileHover={!isDisabled ? { scale: 1.01 } : {}}
                        whileTap={!isDisabled ? { scale: 0.99 } : {}}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        {/* Checkbox */}
                        <div className={`theme-checkbox ${isSelected ? 'checked' : ''}`}>
                          {isComingSoon ? (
                            <Lock size={14} />
                          ) : isLocked ? (
                            <Lock size={14} />
                          ) : isSelected ? (
                            <Check size={14} />
                          ) : null}
                        </div>

                        {/* Theme Info */}
                        <span className="theme-emoji">{theme.emoji}</span>
                        <div className="theme-info">
                          <span className="theme-title">
                            {theme.title}
                            {theme.isNew && !isLocked && !isComingSoon && (
                              <span className="theme-new-badge">NEW</span>
                            )}
                          </span>
                          <span className="theme-meta">
                            {isComingSoon
                              ? 'Bientôt disponible'
                              : `${theme.questionCount} questions`}
                          </span>
                        </div>

                        {/* Lock Badge */}
                        {isLocked && !isComingSoon && (
                          <span className="theme-lock-badge">PRO</span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Validate Button */}
                <div className="quiz-themes-footer">
                  <motion.button
                    className={`quiz-validate-btn ${selectedThemes.length === 0 ? 'disabled' : ''}`}
                    onClick={handleValidate}
                    disabled={selectedThemes.length === 0}
                    whileHover={selectedThemes.length > 0 ? { scale: 1.02 } : {}}
                    whileTap={selectedThemes.length > 0 ? { scale: 0.98 } : {}}
                  >
                    <span className="validate-text">
                      {selectedThemes.length === 0
                        ? 'Sélectionne au moins 1 thème'
                        : `Valider (${selectedThemes.length} thème${selectedThemes.length > 1 ? 's' : ''})`}
                    </span>
                    <span className="validate-meta">
                      {totalQuestions > 0 && `${totalQuestions} questions disponibles`}
                    </span>
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
