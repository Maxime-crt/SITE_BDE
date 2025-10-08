import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import { authApi } from './services/api';
import type { User } from './types';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuthPageDetection } from './hooks/useAuthPageDetection';

const queryClient = new QueryClient();

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Détecter les pages d'authentification
  useAuthPageDetection();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

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
              user ? <Dashboard /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/events/:id"
            element={
              user ? <EventDetail user={user} /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/my-tickets"
            element={
              user ? <MyTickets /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/purchase-ticket/:eventId"
            element={
              user ? <PurchaseTicket /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/events/:eventId/rate"
            element={
              user ? <RateEvent /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/support"
            element={
              user ? <Support user={user} /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/create-event"
            element={
              user ? (
                user.isAdmin ? <CreateEvent /> : <Navigate to="/" />
              ) : <Navigate to="/login" />
            }
          />
          <Route
            path="/events/:id/edit"
            element={
              user ? (
                user.isAdmin ? <CreateEvent /> : <Navigate to="/" />
              ) : <Navigate to="/login" />
            }
          />
          <Route
            path="/admin/support"
            element={
              user ? (
                user.isAdmin ? <AdminSupport /> : <Navigate to="/" />
              ) : <Navigate to="/login" />
            }
          />
          <Route
            path="/admin/scan"
            element={
              user ? (
                user.isAdmin ? <ScanTicket /> : <Navigate to="/" />
              ) : <Navigate to="/login" />
            }
          />
          <Route
            path="/admin"
            element={
              user ? (
                user.isAdmin ? <AdminDashboard /> : <Navigate to="/" />
              ) : <Navigate to="/login" />
            }
          />
          <Route
            path="/profile"
            element={
              user ? <Profile user={user} /> : <Navigate to="/login" />
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
