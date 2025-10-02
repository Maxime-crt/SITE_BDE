import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Ticket, User, LogOut, Menu, Calendar, X, Shield, MessageCircle } from 'lucide-react';
import { Button } from './ui/button';
import { ThemeToggle } from './ThemeToggle';
import type { User as UserType } from '../types';

interface NavbarProps {
  user: UserType | null;
  onLogout: () => void;
}

export default function Navbar({ user, onLogout }: NavbarProps) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // Fermer le menu si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMobileMenuOpen &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  return (
    <nav ref={mobileMenuRef} className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo et navigation principale */}
          <div className="flex items-center space-x-8">
            <Link to="/dashboard" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                BDE Events
              </span>
            </Link>

          </div>

          {/* Actions utilisateur */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {/* Boutons d'action - Tout dans le menu hamburger à partir de 900px */}
                <div className="flex items-center space-x-2">
                  <ThemeToggle />

                  {/* Menu hamburger */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  >
                    {isMobileMenuOpen ? (
                      <X className="w-5 h-5" />
                    ) : (
                      <Menu className="w-5 h-5" />
                    )}
                  </Button>

                  {/* Menu desktop - visible seulement au-dessus de 900px */}
                  <div className="hidden lg:flex items-center space-x-2">
                    <Button
                      asChild
                      variant={isActive('/my-tickets') ? 'default' : 'ghost'}
                      size="sm"
                    >
                      <Link to="/my-tickets" className="flex items-center space-x-2">
                        <Ticket className="w-4 h-4" />
                        <span>Mes billets</span>
                      </Link>
                    </Button>

                    <Button
                      asChild
                      variant={isActive('/support') ? 'default' : 'ghost'}
                      size="sm"
                    >
                      <Link to="/support" className="flex items-center space-x-2">
                        <MessageCircle className="w-4 h-4" />
                        <span>Support</span>
                      </Link>
                    </Button>

                    {user?.isAdmin && (
                      <Button
                        asChild
                        variant={isActive('/admin') ? 'default' : 'ghost'}
                        size="sm"
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
                    >
                      <Link to="/profile" className="flex items-center space-x-2">
                        <User className="w-4 h-4" />
                        <span>Profil</span>
                      </Link>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onLogout}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Déconnexion
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Boutons pour utilisateurs non connectés */}
                <div className="flex items-center space-x-2">
                  <ThemeToggle />

                  {/* Menu hamburger */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  >
                    {isMobileMenuOpen ? (
                      <X className="w-5 h-5" />
                    ) : (
                      <Menu className="w-5 h-5" />
                    )}
                  </Button>

                  {/* Menu desktop - visible seulement au-dessus de 900px */}
                  <div className="hidden lg:flex items-center space-x-2">
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                    >
                      <Link to="/login">Se connecter</Link>
                    </Button>

                    <Button
                      asChild
                      size="sm"
                    >
                      <Link to="/register">S'inscrire</Link>
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Menu mobile/tablette - visible en dessous de 900px */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t pt-3 pb-3">
            <div className="flex flex-col space-y-2">
              {user ? (
                <>
                  <Link
                    to="/my-tickets"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive('/my-tickets')
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Mes billets
                  </Link>
                  <Link
                    to="/support"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive('/support')
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Support
                  </Link>
                  {user?.isAdmin && (
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
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive('/login')
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Se connecter
                  </Link>
                  <Link
                    to="/register"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive('/register')
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    S'inscrire
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}