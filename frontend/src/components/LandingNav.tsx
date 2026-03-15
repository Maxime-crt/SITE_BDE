import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Car, Shield, User, LogOut, MessageCircle, Menu, X } from 'lucide-react';
import { authApi } from '../services/api';
import logoFLR from '../assets/Logo_FLR.png';

interface LandingNavProps {
  isAdmin: boolean;
}

export default function LandingNav({ isAdmin }: LandingNavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled
        ? 'bg-[#0a1128]/95 backdrop-blur-xl shadow-lg shadow-black/20'
        : 'bg-gradient-to-b from-[#0a1128]/80 via-[#0a1128]/40 to-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between h-20">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <img src={logoFLR} alt="Fuelers" className="w-10 h-10 rounded-full ring-2 ring-blue-400/20 group-hover:ring-blue-400/40 transition-all" />
          <span className="font-syne font-bold text-xl bg-gradient-to-r from-blue-300 to-indigo-400 bg-clip-text text-transparent hidden sm:inline">
            Fuelers
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          <Link to="/#events" onClick={() => document.getElementById('events')?.scrollIntoView({ behavior: 'smooth' })} className="px-4 py-2 text-base text-white/50 hover:text-white font-medium rounded-xl hover:bg-white/5 transition-all">
            Événements
          </Link>
          <Link to="/my-rides" className="px-4 py-2 text-base text-white/50 hover:text-white font-medium rounded-xl hover:bg-white/5 transition-all flex items-center gap-1.5">
            <Car className="w-4 h-4" />
            Trajets
          </Link>
          <Link to="/support" className="px-4 py-2 text-base text-white/50 hover:text-white font-medium rounded-xl hover:bg-white/5 transition-all flex items-center gap-1.5">
            <MessageCircle className="w-4 h-4" />
            Support
          </Link>
          {isAdmin && (
            <Link to="/admin" className="px-4 py-2 text-base text-white/50 hover:text-white font-medium rounded-xl hover:bg-white/5 transition-all flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              Admin
            </Link>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Link
            to="/profile"
            className="hidden md:flex items-center gap-1.5 px-3 py-2 text-base text-white/50 hover:text-white rounded-xl hover:bg-white/5 transition-all"
          >
            <User className="w-4 h-4" />
            Profil
          </Link>
          <button
            onClick={handleLogout}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 text-base text-white/30 hover:text-red-400 rounded-xl hover:bg-red-500/5 transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>

          {/* Mobile burger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-white/60 hover:text-white rounded-xl hover:bg-white/5 transition-all"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#0a1128]/95 backdrop-blur-xl border-t border-white/5 px-6 py-4 space-y-1">
          <Link to="/" onClick={() => setMobileOpen(false)} className="block w-full text-left px-4 py-3 text-sm text-white/60 hover:text-white rounded-xl hover:bg-white/5 transition-all">
            Événements
          </Link>
          <Link to="/my-rides" onClick={() => setMobileOpen(false)} className="block px-4 py-3 text-sm text-white/60 hover:text-white rounded-xl hover:bg-white/5 transition-all">
            Mes trajets
          </Link>
          <Link to="/support" onClick={() => setMobileOpen(false)} className="block px-4 py-3 text-sm text-white/60 hover:text-white rounded-xl hover:bg-white/5 transition-all">
            Support
          </Link>
          {isAdmin && (
            <Link to="/admin" onClick={() => setMobileOpen(false)} className="block px-4 py-3 text-sm text-white/60 hover:text-white rounded-xl hover:bg-white/5 transition-all">
              Admin
            </Link>
          )}
          <Link to="/profile" onClick={() => setMobileOpen(false)} className="block px-4 py-3 text-sm text-white/60 hover:text-white rounded-xl hover:bg-white/5 transition-all">
            Profil
          </Link>
          <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm text-red-400/60 hover:text-red-400 rounded-xl hover:bg-red-500/5 transition-all">
            Déconnexion
          </button>
        </div>
      )}
    </nav>
  );
}
