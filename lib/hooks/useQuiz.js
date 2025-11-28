'use client';

import { useState, useEffect } from 'react';

/**
 * Hook pour charger un quiz depuis les données statiques
 * @param {string} quizId - ID du quiz à charger
 * @returns {Object|null} Données du quiz ou null si pas encore chargé
 */
export function useQuiz(quizId) {
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!quizId) {
      setQuiz(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/data/${quizId}.json`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Quiz "${quizId}" non trouvé`);
        }
        return response.json();
      })
      .then(data => {
        setQuiz(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(`[useQuiz] Erreur chargement ${quizId}:`, err);
        setError(err.message);
        setLoading(false);
      });
  }, [quizId]);

  return { quiz, loading, error };
}

export default useQuiz;
