 1. GameCard.jsx - Remplacer les emojis par des icônes SVG et grouper dans une pill :
                                          
  // Ajout de l'import Heart
  import { HelpCircle, Heart } from 'lucide-react';                                                                                                        
  // Remplacement de la section card-actions par une pill groupée                                                                                       
  <div className="card-actions-pill">
    {onShowHelp && (
      <motion.button
        className="pill-btn help"
        onClick={handleHelpClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <HelpCircle size={16} />
      </motion.button>
    )}
    <div className="pill-separator" />
    <motion.button
      className={`pill-btn favorite ${isFavorite ? 'active' : ''}`}
      onClick={handleFavoriteClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
    </motion.button>
  </div>

  2. globals.css - Nouveaux styles glassmorphism pour la pill