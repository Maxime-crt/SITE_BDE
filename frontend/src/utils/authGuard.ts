/**
 * Vérifie immédiatement si l'utilisateur peut accéder à la page actuelle
 * Cette fonction s'exécute de manière synchrone AVANT le rendu de React
 */
export function checkAuthGuard(): boolean {
  const token = localStorage.getItem('token');
  const savedUser = localStorage.getItem('user');
  const publicPaths = ['/login', '/register', '/verify-email'];
  const currentPath = window.location.pathname;
  const isPublicPath = publicPaths.includes(currentPath);

  // Si pas de token et qu'on est sur une page protégée
  if ((!token || !savedUser) && !isPublicPath) {
    // Redirection immédiate avant le rendu React
    window.location.replace('/login');
    return false; // Bloquer le rendu
  }

  return true; // Autoriser le rendu
}
