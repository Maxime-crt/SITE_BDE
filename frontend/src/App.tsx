import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import EventDetail from './pages/EventDetail';
import CreateEvent from './pages/CreateEvent';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import AdminSupport from './pages/AdminSupport';
import ScanTicket from './pages/ScanTicket';
import MyTickets from './pages/MyTickets';
import PurchaseTicket from './pages/PurchaseTicket';
import RateEvent from './pages/RateEvent';
import Support from './pages/Support';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { ProtectedRoute } from './components/ProtectedRoute';
import { authApi } from './services/api';
import type { User } from './types';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuthPageDetection } from './hooks/useAuthPageDetection';
import { checkAuthGuard } from './utils/authGuard';

const queryClient = new QueryClient();

// Vérification AVANT le rendu de React
const canRender = checkAuthGuard();

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // Détecter les pages d'authentification
  useAuthPageDetection();

  // Vérification initiale au chargement de l'app
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (!token || !savedUser) {
        setLoading(false);
        return;
      }

      // Valider le token une seule fois au démarrage
      try {
        const response = await authApi.getCurrentUser();
        setUser(response.user);
        localStorage.setItem('user', JSON.stringify(response.user));
      } catch (error) {
        console.log('Token invalide ou expiré, nettoyage de la session');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Vérifier à chaque changement de route si on a un token
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const publicPaths = ['/login', '/register', '/verify-email'];
    const isPublicPath = publicPaths.includes(location.pathname);

    // Si pas de token et page protégée, rediriger immédiatement
    if (!token && !isPublicPath) {
      window.location.replace('/login');
      return;
    }

    // Si on a un token, charger l'user depuis localStorage
    if (token && savedUser && !user) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Erreur parsing user:', e);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        if (!isPublicPath) {
          window.location.replace('/login');
        }
      }
    }
  }, [location.pathname, user]);

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
    setUser(response.user);
    return response;
  };

  const register = async (data: {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    password: string;
  }) => {
    const response = await authApi.register(data);
    // Ne plus sauvegarder ici - géré dans Register.tsx selon requiresVerification
    return response;
  };

  const refreshUser = async () => {
    try {
      const response = await authApi.getCurrentUser();
      localStorage.setItem('user', JSON.stringify(response.user));
      setUser(response.user);
    } catch (error) {
      console.error('Erreur lors du rafraîchissement du profil:', error);
    }
  };

  const logout = async () => {
    try {
      // Appeler la route logout côté serveur pour mettre à jour le statut
      await authApi.logout();
    } catch (error) {
      console.error('Erreur lors de la déconnexion côté serveur:', error);
    } finally {
      // Nettoyer côté client dans tous les cas
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors flex flex-col">
      <Navbar user={user} onLogout={logout} />

      <main className="flex-1">
        <Routes>
          <Route
            path="/login"
            element={
              user ? <Navigate to="/" /> : <Login onLogin={login} />
            }
          />
          <Route
            path="/register"
            element={
              user ? <Navigate to="/" /> : <Register />
            }
          />
          <Route
            path="/verify-email"
            element={<VerifyEmail />}
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/:id"
            element={
              <ProtectedRoute>
                {user && <EventDetail user={user} />}
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-tickets"
            element={
              <ProtectedRoute>
                <MyTickets />
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchase-ticket/:eventId"
            element={
              <ProtectedRoute>
                <PurchaseTicket />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/:eventId/rate"
            element={
              <ProtectedRoute>
                <RateEvent />
              </ProtectedRoute>
            }
          />
          <Route
            path="/support"
            element={
              <ProtectedRoute>
                {user && <Support user={user} />}
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-event"
            element={
              <ProtectedRoute>
                {user && (user.isAdmin ? <CreateEvent /> : <Navigate to="/" />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/:id/edit"
            element={
              <ProtectedRoute>
                {user && (user.isAdmin ? <CreateEvent /> : <Navigate to="/" />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/support"
            element={
              <ProtectedRoute>
                {user && (user.isAdmin ? <AdminSupport /> : <Navigate to="/" />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/scan"
            element={
              <ProtectedRoute>
                {user && (user.isAdmin ? <ScanTicket /> : <Navigate to="/" />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                {user && (user.isAdmin ? <AdminDashboard /> : <Navigate to="/" />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                {user && <Profile user={user} />}
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>

      <Footer />

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 2000,
          style: {
            maxWidth: '500px',
          },
        }}
      />
    </div>
  );
}

function App() {
  // Si on ne peut pas rendre (redirection en cours), afficher un loader
  if (!canRender) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AppContent />
        </Router>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App
