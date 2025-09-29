import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Star, User, LogOut, Menu, Car, X, Shield } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ThemeToggle } from './ThemeToggle';
import type { User as UserType } from '../types';

interface NavbarProps {
  user: UserType;
  onLogout: () => void;
}

export default function Navbar({ user, onLogout }: NavbarProps) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo et navigation principale */}
          <div className="flex items-center space-x-8">
            <Link to="/dashboard" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <Car className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                BDE Covoiturage
              </span>
            </Link>

          </div>

          {/* Actions utilisateur */}
          <div className="flex items-center space-x-4">
            {/* Badge de notation */}
            <div className="hidden sm:flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                Salut, <span className="font-medium text-foreground">{user.firstName}</span> 👋
              </span>
              {user.isAdmin && (
                <Badge variant="default" className="flex items-center space-x-1 bg-red-500 hover:bg-red-600">
                  <Shield className="w-3 h-3" />
                  <span className="font-semibold">Admin</span>
                </Badge>
              )}
              <Badge variant="secondary" className="flex items-center space-x-1">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">
                  {user.rating ? user.rating.toFixed(1) : '--'}
                </span>
              </Badge>
            </div>

            {/* Boutons d'action */}
            <div className="flex items-center space-x-2">
              {user.isAdmin && (
                <Button
                  asChild
                  variant={isActive('/admin') ? 'default' : 'ghost'}
                  size="sm"
                  className="hidden sm:flex"
                >
                  <Link to="/admin" className="flex items-center space-x-2">
                    <Shield className="w-4 h-4" />
                    <span>Admin</span>
                  </Link>
                </Button>
              )}

              <Button
                asChild
                variant={isActive('/profile') ? 'default' : 'ghost'}
                size="sm"
                className="hidden sm:flex"
              >
                <Link to="/profile" className="flex items-center space-x-2">
                  <User className="w-4 h-4" />
                  <span>Profil</span>
                </Link>
              </Button>

              {/* Toggle thème */}
              <ThemeToggle />

              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className="text-muted-foreground hover:text-destructive hidden sm:flex"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </Button>

              {/* Menu mobile */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Menu mobile (simplifié) */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t pt-3 pb-3">
            <div className="flex flex-col space-y-2">
              {user.isAdmin && (
                <Link
                  to="/admin"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/admin')
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Admin
                </Link>
              )}
              <Link
                to="/profile"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/profile')
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Profil
              </Link>
              <button
                onClick={() => {
                  onLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="px-3 py-2 rounded-md text-sm font-medium text-left text-destructive hover:bg-destructive/10 transition-colors"
              >
                Déconnexion
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}