import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';
import logoFLR from '../assets/Logo_FLR.png';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setLoading(true);
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'envoi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1128] font-dm-sans text-white flex flex-col">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl" />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/login" className="inline-block">
              <img src={logoFLR} alt="Fuelers" className="w-16 h-16 rounded-full ring-2 ring-blue-400/20 mx-auto mb-4" />
            </Link>
            <h1 className="font-syne font-bold text-2xl text-white">Mot de passe oublié</h1>
            <p className="text-white/40 text-sm mt-2">
              {sent
                ? 'Un email avec un lien de réinitialisation a été envoyé si un compte existe avec cette adresse.'
                : 'Entrez votre email pour recevoir un lien de réinitialisation'
              }
            </p>
          </div>

          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-6 md:p-8 backdrop-blur-sm">
            {sent ? (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto">
                  <Mail className="w-8 h-8 text-blue-400" />
                </div>
                <p className="text-white/60 text-sm">Vérifiez votre boîte mail (et les spams). Le lien est valable 15 minutes.</p>
                <button
                  onClick={() => { setSent(false); setLoading(false); }}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Renvoyer un email
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-2">Email IESEG</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="prenom.nom@ieseg.fr"
                      className="w-full pl-10 pr-4 py-3 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Envoyer le lien'
                  )}
                </button>
              </form>
            )}
          </div>

          <div className="text-center mt-6">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
