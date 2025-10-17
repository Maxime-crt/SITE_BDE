import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Composant qui protège une route en vérifiant la présence d'un token
 * La vérification est synchrone et se fait AVANT le rendu des enfants
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const token = localStorage.getItem('token');
  const savedUser = localStorage.getItem('user');

  // Vérification synchrone - pas de rendu des enfants si pas de token
  if (!token || !savedUser) {
    return <Navigate to="/login" replace />;
  }

  // Token présent, on peut rendre les enfants
  return <>{children}</>;
}
