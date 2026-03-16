import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import logoFLR from '../assets/Logo_FLR.png';

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<any>;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!email || !password) {
      toast.error('Veuillez remplir tous les champs', { duration: 2000 });
      return;
    }

    setLoading(true);
    try {
      const response = await onLogin(email, password);
      toast.success(`Salut, ${response.user.firstName} 👋`, {
        position: 'top-center',
        duration: 2500,
      });
      navigate(from, { replace: true });
    } catch (error: any) {
      if (error.response?.data?.requiresVerification) {
        const userEmail = error.response.data.email;
        localStorage.setItem('pendingVerificationEmail', userEmail);
        navigate('/verify-email', { state: { email: userEmail }, replace: true });
      } else {
        toast.error(error.response?.data?.error || 'Erreur de connexion', {
          duration: 2000
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1128] flex items-center justify-center px-6 py-12 font-dm-sans">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-indigo-500/6 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md space-y-8">
        {/* Logo + titre */}
        <div className="text-center space-y-4">
          <img
            src={logoFLR}
            alt="Fuelers"
            className="w-20 h-20 rounded-full mx-auto shadow-2xl shadow-blue-500/20 ring-4 ring-blue-400/20"
          />
          <div>
            <h1 className="font-syne font-extrabold text-3xl text-white">Bienvenue</h1>
            <p className="text-white/40 mt-2">Connectez-vous à votre compte Fuelers</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-8">
          <div className="text-center mb-6">
            <h2 className="font-syne font-bold text-xl text-white">Connexion</h2>
            <p className="text-white/30 text-sm mt-1">Entrez vos identifiants IESEG</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-white/60">
                Email IESEG
              </label>
              <input
                id="email"
                type="email"
                placeholder="prenom.nom@ieseg.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-11 px-4 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-blue-400/40 focus:ring-1 focus:ring-blue-400/20 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-white/60">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Votre mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-11 px-4 pr-11 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-blue-400/40 focus:ring-1 focus:ring-blue-400/20 transition-all"
                />
                <button
                  type="button"
                  className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-xs text-blue-400/70 hover:text-blue-300 transition-colors">
                  Mot de passe oublié ?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-syne font-bold text-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                'Se connecter'
              )}
            </button>

            <p className="text-center text-sm text-white/30 pt-2">
              Pas encore de compte ?{' '}
              <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                S&apos;inscrire
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
