import toast from 'react-hot-toast';

/**
 * Gère l'affichage des erreurs en ignorant les erreurs d'authentification
 * qui sont déjà gérées par l'intercepteur axios
 */
export const handleApiError = (error: any, fallbackMessage: string) => {
  // Ignorer les erreurs d'authentification (401/403) qui sont gérées par l'intercepteur
  if (error.isAuthError) {
    return;
  }

  // Afficher le message d'erreur pour toutes les autres erreurs
  const errorMessage = error.response?.data?.error || fallbackMessage;
  toast.error(errorMessage);
};

/**
 * Version de handleApiError pour les cas où on veut aussi logger l'erreur
 */
export const handleApiErrorWithLog = (error: any, fallbackMessage: string, context?: string) => {
  // Ignorer les erreurs d'authentification (401/403) qui sont gérées par l'intercepteur
  if (error.isAuthError) {
    return;
  }

  // Logger l'erreur
  if (context) {
    console.error(`${context}:`, error);
  } else {
    console.error('Erreur API:', error);
  }

  // Afficher le message d'erreur
  const errorMessage = error.response?.data?.error || fallbackMessage;
  toast.error(errorMessage);
};
