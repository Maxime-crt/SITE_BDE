import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Composant qui protège une route en vérifiant la présence d'un token
 * et que la charte d'utilisation a été acceptée
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const token = localStorage.getItem('token');
  const savedUser = localStorage.getItem('user');

  // Vérification synchrone - pas de rendu des enfants si pas de token
  if (!token || !savedUser) {
    return <Navigate to="/login" replace />;
  }

  // Vérifier si la charte a été acceptée
  try {
    const user = JSON.parse(savedUser);
    if (!user.charterAcceptedAt) {
      return <Navigate to="/accept-charter" replace />;
    }
  } catch {
    return <Navigate to="/login" replace />;
  }

  // Token présent et charte acceptée, on peut rendre les enfants
  return <>{children}</>;
}
