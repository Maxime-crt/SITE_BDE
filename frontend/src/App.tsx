import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import EventDetail from './pages/EventDetail';
import CreateRide from './pages/CreateRide';
import CreateEvent from './pages/CreateEvent';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
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
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
    setUser(response.user);
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
    <div className="min-h-screen bg-background text-foreground transition-colors">
      {user && <Navbar user={user} onLogout={logout} />}

      <Routes>
        <Route
          path="/login"
          element={
            user ? <Navigate to="/dashboard" /> : <Login onLogin={login} />
          }
        />
        <Route
          path="/register"
          element={
            user ? <Navigate to="/dashboard" /> : <Register onRegister={register} />
          }
        />
        <Route
          path="/dashboard"
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
          path="/events/:id/create-ride"
          element={
            user ? <CreateRide user={user} /> : <Navigate to="/login" />
          }
        />
        <Route
          path="/create-event"
          element={
            user ? (
              user.isAdmin ? <CreateEvent /> : <Navigate to="/dashboard" />
            ) : <Navigate to="/login" />
          }
        />
        <Route
          path="/admin"
          element={
            user ? (
              user.isAdmin ? <AdminDashboard /> : <Navigate to="/dashboard" />
            ) : <Navigate to="/login" />
          }
        />
        <Route
          path="/profile"
          element={
            user ? <Profile user={user} /> : <Navigate to="/login" />
          }
        />
        <Route
          path="/"
          element={<Navigate to={user ? "/dashboard" : "/login"} />}
        />
      </Routes>

      {user && <Footer />}

      <Toaster position="top-right" />
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
