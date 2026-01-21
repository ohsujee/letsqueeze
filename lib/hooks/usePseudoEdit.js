/**
 * usePseudoEdit - Gestion de l'édition de pseudo
 *
 * Encapsule la validation, sauvegarde et état d'édition du pseudo.
 * Utilisé dans onboarding et profile.
 *
 * Usage:
 *   const {
 *     pseudo,
 *     setPseudo,
 *     error,
 *     saving,
 *     isEditing,
 *     startEdit,
 *     cancelEdit,
 *     savePseudo,
 *   } = usePseudoEdit({
 *     uid: user.uid,
 *     initialPseudo: 'MonPseudo',
 *     onSuccess: () => router.push('/home'),
 *   });
 */

import { useState, useCallback } from 'react';
import { validatePseudo, updateUserPseudo } from '@/lib/userProfile';

/**
 * @param {Object} options
 * @param {string} options.uid - User ID
 * @param {string} options.initialPseudo - Initial pseudo value
 * @param {Function} options.onSuccess - Callback after successful save
 * @param {Function} options.onError - Callback on error
 * @param {boolean} options.startInEditMode - Start in edit mode (default: false)
 * @returns {Object}
 */
export function usePseudoEdit(options = {}) {
  const {
    uid,
    initialPseudo = '',
    onSuccess,
    onError,
    startInEditMode = false,
  } = options;

  const [pseudo, setPseudo] = useState(initialPseudo);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(startInEditMode);

  // Start editing
  const startEdit = useCallback((currentPseudo = '') => {
    setPseudo(currentPseudo);
    setError('');
    setIsEditing(true);
  }, []);

  // Cancel editing
  const cancelEdit = useCallback(() => {
    setPseudo(initialPseudo);
    setError('');
    setIsEditing(false);
  }, [initialPseudo]);

  // Validate only (without saving)
  const validate = useCallback(() => {
    const trimmed = pseudo.trim();
    const validation = validatePseudo(trimmed);
    if (!validation.valid) {
      setError(validation.error);
      return false;
    }
    setError('');
    return true;
  }, [pseudo]);

  // Save pseudo
  const savePseudo = useCallback(async () => {
    const trimmed = pseudo.trim();

    // Validate
    const validation = validatePseudo(trimmed);
    if (!validation.valid) {
      setError(validation.error);
      return false;
    }

    if (!uid) {
      setError('Utilisateur non connecté');
      return false;
    }

    try {
      setSaving(true);
      setError('');

      await updateUserPseudo(uid, trimmed);

      setIsEditing(false);
      onSuccess?.(trimmed);
      return true;
    } catch (err) {
      console.error('[usePseudoEdit] Save error:', err);
      const errorMsg = 'Erreur lors de la sauvegarde';
      setError(errorMsg);
      onError?.(err);
      return false;
    } finally {
      setSaving(false);
    }
  }, [pseudo, uid, onSuccess, onError]);

  // Clear error
  const clearError = useCallback(() => {
    setError('');
  }, []);

  return {
    // State
    pseudo,
    setPseudo,
    error,
    saving,
    isEditing,

    // Actions
    startEdit,
    cancelEdit,
    savePseudo,
    validate,
    clearError,

    // Computed
    isValid: pseudo.trim().length >= 2 && pseudo.length <= 16,
    canSave: pseudo.trim().length >= 2 && !saving,
  };
}

export default usePseudoEdit;
