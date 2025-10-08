import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Mail, Loader2, CheckCircle } from 'lucide-react';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // Récupérer l'email depuis le state de navigation OU depuis localStorage
  const email = location.state?.email || localStorage.getItem('pendingVerificationEmail') || '';

  useEffect(() => {
    if (!email) {
      toast.error('Email manquant');
      navigate('/register');
    }
  }, [email, navigate]);

  const handleCodeChange = (index: number, value: string) => {
    // Ne garder que les chiffres
    const numericValue = value.replace(/[^0-9]/g, '');

    if (numericValue.length <= 1) {
      const newCode = [...code];
      newCode[index] = numericValue;
      setCode(newCode);

      // Passer au champ suivant si un chiffre a été entré
      if (numericValue && index < 5) {
        const nextInput = document.getElementById(`code-${index + 1}`);
        nextInput?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Retour arrière: revenir au champ précédent si vide
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

    // Focus sur le dernier champ rempli
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

      // Sauvegarder le token et les données utilisateur
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));

      // Supprimer l'email en attente de vérification
      localStorage.removeItem('pendingVerificationEmail');

      toast.success('Email vérifié avec succès !');

      // Forcer un rechargement pour que App.tsx lise le localStorage
      window.location.href = '/';
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Code invalide ou expiré';
      toast.error(errorMessage, { duration: 2000 });
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);

    try {
      await authApi.resendVerificationCode(email);
      toast.success('Code renvoyé avec succès');
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mx-auto mb-6 shadow-lg">
            <Mail className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl mb-2">Vérifiez votre email</CardTitle>
          <CardDescription className="text-base">
            Nous avons envoyé un code de vérification à<br />
            <strong className="text-foreground">{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Champs de code */}
            <div>
              <label className="block text-sm font-medium mb-3 text-center">
                Entrez le code à 6 chiffres
              </label>
              <div className="flex justify-center gap-2">
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
                    className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary outline-none transition-all"
                    disabled={loading}
                  />
                ))}
              </div>
            </div>

            {/* Bouton de soumission */}
            <Button
              type="submit"
              disabled={loading || code.join('').length !== 6}
              className="w-full h-12 text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Vérification...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Vérifier l'email
                </>
              )}
            </Button>

            {/* Renvoyer le code */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Vous n'avez pas reçu le code ?
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={handleResendCode}
                disabled={resending}
                className="w-full"
              >
                {resending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  'Renvoyer le code'
                )}
              </Button>
            </div>
          </form>

          {/* Informations */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>💡 Astuce :</strong> Vérifiez vos <strong>spams/courrier indésirable</strong> si vous ne trouvez pas l'email. Le code expire dans 15 minutes.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
