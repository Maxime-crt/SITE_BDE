import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Loader2, CheckCircle } from 'lucide-react';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';
import logoFLR from '../assets/Logo_FLR.png';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const email = location.state?.email || localStorage.getItem('pendingVerificationEmail') || '';

  useEffect(() => {
    if (!email) {
      toast.error('Email manquant');
      navigate('/register');
    }
  }, [email, navigate]);

  const handleCodeChange = (index: number, value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');

    if (numericValue.length <= 1) {
      const newCode = [...code];
      newCode[index] = numericValue;
      setCode(newCode);

      if (numericValue && index < 5) {
        const nextInput = document.getElementById(`code-${index + 1}`);
        nextInput?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    const newCode = [...code];

    for (let i = 0; i < pastedData.length; i++) {
      newCode[i] = pastedData[i];
    }

    setCode(newCode);

    const lastFilledIndex = Math.min(pastedData.length, 5);
    const lastInput = document.getElementById(`code-${lastFilledIndex}`);
    lastInput?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const verificationCode = code.join('');
    if (verificationCode.length !== 6) {
      toast.error('Veuillez entrer le code complet');
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.verifyEmail(email, verificationCode);

      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.removeItem('pendingVerificationEmail');

      toast.success('Email verifie avec succes !');

      if (response.user.charterAcceptedAt) {
        window.location.href = '/';
      } else {
        window.location.href = '/accept-charter';
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Code invalide ou expire';
      toast.error(errorMessage, { duration: 2000 });
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);

    try {
      await authApi.resendVerificationCode(email);
      toast.success('Code renvoye avec succes');
      setCode(['', '', '', '', '', '']);
      document.getElementById('code-0')?.focus();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Erreur lors du renvoi du code';
      toast.error(errorMessage, { duration: 3000 });
    } finally {
      setResending(false);
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
            <h1 className="font-syne font-extrabold text-3xl text-white">Verifiez votre email</h1>
            <p className="text-white/40 mt-2">
              Nous avons envoye un code de verification a<br />
              <span className="text-white/70 font-medium">{email}</span>
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-400/20 mb-4">
              <Mail className="w-7 h-7 text-blue-400" />
            </div>
            <h2 className="font-syne font-bold text-xl text-white">Code de verification</h2>
            <p className="text-white/30 text-sm mt-1">Entrez le code a 6 chiffres</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Champs de code */}
            <div className="flex justify-center gap-2 sm:gap-3">
              {code.map((digit, index) => (
                <input
                  key={index}
                  id={`code-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className="w-12 h-14 text-center text-2xl font-bold rounded-xl bg-white/[0.06] border border-white/10 text-white focus:outline-none focus:border-blue-400/40 focus:ring-1 focus:ring-blue-400/20 transition-all disabled:opacity-30"
                  disabled={loading}
                />
              ))}
            </div>

            {/* Bouton de soumission */}
            <button
              type="submit"
              disabled={loading || code.join('').length !== 6}
              className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-syne font-bold text-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verification...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Verifier l'email
                </>
              )}
            </button>

            {/* Renvoyer le code */}
            <div className="text-center space-y-3">
              <p className="text-sm text-white/30">
                Vous n'avez pas recu le code ?
              </p>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resending}
                className="w-full h-11 rounded-xl bg-white/[0.04] border border-white/10 text-white/60 hover:text-white hover:bg-white/[0.08] text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {resending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  'Renvoyer le code'
                )}
              </button>
            </div>
          </form>

          {/* Info box */}
          <div className="mt-6 p-4 rounded-xl bg-blue-500/5 border border-blue-400/10">
            <p className="text-sm text-blue-300/60">
              Verifiez vos <strong className="text-blue-300/80">spams/courrier indesirable</strong> si vous ne trouvez pas l'email. Le code expire dans 15 minutes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
