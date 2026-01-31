'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Users, X, Minus, Plus, ArrowUpDown, TrendingUp, Clock, SortAsc } from 'lucide-react';

const SORT_OPTIONS = [
  { value: 'default', label: 'Par défaut', icon: ArrowUpDown },
  { value: 'popular', label: 'Les plus joués', icon: TrendingUp },
  { value: 'newest', label: 'Nouveautés', icon: Clock },
  { value: 'alphabetical', label: 'A-Z', icon: SortAsc },
];

export default function GameFilterBar({
  searchQuery,
  onSearchChange,
  playerCountFilter,
  onPlayerCountChange,
  sortBy,
  onSortChange
}) {
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const playerModalRef = useRef(null);
  const sortModalRef = useRef(null);

  // Close modals when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (playerModalRef.current && !playerModalRef.current.contains(e.target) && !e.target.closest('.player-filter-btn')) {
        setShowPlayerModal(false);
      }
      if (sortModalRef.current && !sortModalRef.current.contains(e.target) && !e.target.closest('.sort-filter-btn')) {
        setShowSortModal(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentSortOption = SORT_OPTIONS.find(o => o.value === sortBy) || SORT_OPTIONS[0];
  const SortIcon = currentSortOption.icon;

  // Player count stepper handlers
  const incrementPlayerCount = () => {
    if (playerCountFilter === null) {
      onPlayerCountChange(2);
    } else if (playerCountFilter < 20) {
      onPlayerCountChange(playerCountFilter + 1);
    }
  };

  const decrementPlayerCount = () => {
    if (playerCountFilter !== null && playerCountFilter > 2) {
      onPlayerCountChange(playerCountFilter - 1);
    } else {
      onPlayerCountChange(null);
    }
  };

  return (
    <div className="game-filter-bar">
      {/* Search Input with Glow */}
      <div className="game-search-wrapper">
        <Search className="game-search-icon" size={20} />
        <input
          type="text"
          className="game-search-input"
          placeholder="Rechercher..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button
            className="game-search-clear"
            onClick={() => onSearchChange('')}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="game-filter-actions">
        {/* Player Count Button */}
        <div className="player-filter-wrapper">
          <motion.button
            className={`player-filter-btn ${playerCountFilter ? 'active' : ''}`}
            onClick={() => {
              setShowPlayerModal(!showPlayerModal);
              setShowSortModal(false);
            }}
            whileTap={{ scale: 0.95 }}
          >
            <Users size={18} />
            {playerCountFilter && <span className="player-count-badge">{playerCountFilter}</span>}
          </motion.button>

          {/* Player Count Mini-Modal */}
          {showPlayerModal && (
            <motion.div
              ref={playerModalRef}
              className="player-modal"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              <div className="player-modal-header">Nombre de joueurs</div>
              <div className="player-stepper">
                <motion.button
                  className="stepper-btn minus"
                  onClick={decrementPlayerCount}
                  whileTap={{ scale: 0.9 }}
                  disabled={playerCountFilter === null}
                >
                  <Minus size={18} />
                </motion.button>
                <div className="stepper-value">
                  {playerCountFilter !== null ? (
                    <span className="value-number">{playerCountFilter}</span>
                  ) : (
                    <span className="value-all">Tous</span>
                  )}
                </div>
                <motion.button
                  className="stepper-btn plus"
                  onClick={incrementPlayerCount}
                  whileTap={{ scale: 0.9 }}
                  disabled={playerCountFilter === 20}
                >
                  <Plus size={18} />
                </motion.button>
              </div>
              {playerCountFilter && (
                <button
                  className="player-modal-reset"
                  onClick={() => {
                    onPlayerCountChange(null);
                    setShowPlayerModal(false);
                  }}
                >
                  Réinitialiser
                </button>
              )}
            </motion.div>
          )}
        </div>

        {/* Sort Button with Modal */}
        <div className="sort-filter-wrapper">
          <motion.button
            className={`sort-filter-btn ${sortBy !== 'default' ? 'active' : ''}`}
            onClick={() => {
              setShowSortModal(!showSortModal);
              setShowPlayerModal(false);
            }}
            whileTap={{ scale: 0.95 }}
          >
            <SortIcon size={18} />
          </motion.button>

          {/* Sort Modal */}
          {showSortModal && (
            <motion.div
              ref={sortModalRef}
              className="sort-modal"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              <div className="sort-modal-header">Trier par</div>
              <div className="sort-options">
                {SORT_OPTIONS.map((option) => {
                  const OptionIcon = option.icon;
                  return (
                    <button
                      key={option.value}
                      className={`sort-option ${sortBy === option.value ? 'active' : ''}`}
                      onClick={() => {
                        onSortChange(option.value);
                        setShowSortModal(false);
                      }}
                    >
                      <OptionIcon size={16} />
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>
              {sortBy !== 'default' && (
                <button
                  className="sort-modal-reset"
                  onClick={() => {
                    onSortChange('default');
                    setShowSortModal(false);
                  }}
                >
                  Réinitialiser
                </button>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
