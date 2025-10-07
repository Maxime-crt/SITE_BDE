import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { authApi } from '../services/api';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [touched, setTouched] = useState({
    phone: false,
    password: false,
    confirmPassword: false
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Effacer l'erreur quand l'utilisateur tape (si le champ a déjà été touché)
    if (touched[name as keyof typeof touched]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setTouched(prev => ({ ...prev, [name]: true }));

    // Validation au blur
    if (name === 'phone') {
      validatePhone(value);
    } else if (name === 'password') {
      validatePassword(value);
    } else if (name === 'confirmPassword') {
      validatePasswordMatch(formData.password, value);
    }
  };

  const validatePhone = (phone: string) => {
    // Format français : 10 chiffres, commence par 0
    const phoneRegex = /^0[1-9](\d{2}){4}$/;
    const cleanPhone = phone.replace(/\s/g, '');

    if (phone && !phoneRegex.test(cleanPhone)) {
      setErrors(prev => ({ ...prev, phone: 'Format invalide (ex: 0612345678)' }));
      return false;
    } else {
      setErrors(prev => ({ ...prev, phone: '' }));
      return true;
    }
  };

  const validatePassword = (password: string) => {
    if (password && password.length < 6) {
      setErrors(prev => ({ ...prev, password: 'Minimum 6 caractères requis' }));
      return false;
    } else {
      setErrors(prev => ({ ...prev, password: '' }));
      return true;
    }
  };

  const validatePasswordMatch = (password: string, confirmPassword: string) => {
    if (confirmPassword && password !== confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: 'Les mots de passe ne correspondent pas' }));
      return false;
    } else {
      setErrors(prev => ({ ...prev, confirmPassword: '' }));
      return true;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.firstName || !formData.lastName || !formData.phone || !formData.password) {
      toast.error('Veuillez remplir tous les champs', { duration: 2000 });
      return;
    }

    // Valider tous les champs
    const isPhoneValid = validatePhone(formData.phone);
    const isPasswordValid = validatePassword(formData.password);
    const isPasswordMatch = validatePasswordMatch(formData.password, formData.confirmPassword);

    if (!isPhoneValid || !isPasswordValid || !isPasswordMatch) {
      toast.error('Veuillez corriger les erreurs du formulaire', { duration: 2000 });
      return;
    }

    const emailLower = formData.email.toLowerCase();
    if (!emailLower.endsWith('@ieseg.fr') && !emailLower.endsWith('@gmail.com')) {
      toast.error('Veuillez utiliser votre email IESEG (@ieseg.fr) ou Gmail (@gmail.com)', { duration: 2000 });
      return;
    }

    setLoading(true);
    try {
      const { confirmPassword: _confirmPassword, ...registerData } = formData;
      const response = await authApi.register(registerData);

      // Vérifier si l'email nécessite une vérification
      if (response.requiresVerification) {
        // Sauvegarder l'email en attente de vérification dans localStorage
        localStorage.setItem('pendingVerificationEmail', formData.email);
        navigate('/verify-email', { state: { email: formData.email } });
      } else {
        // Sauvegarder uniquement si pas de vérification requise
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        toast.success('Inscription réussie !');
        window.location.href = '/dashboard';
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'inscription', {
        duration: 2000
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold">
            Inscription
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Créez votre compte BDE IESEG
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium">
                Email IESEG
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="prenom.nom@ieseg.fr"
                value={formData.email}
                onChange={handleChange}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium">
                  Prénom
                </label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  className="mt-1"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium">
                  Nom
                </label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium">
                Téléphone
              </label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                required
                placeholder="06 12 34 56 78"
                value={formData.phone}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`mt-1 ${errors.phone ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              />
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium">
                Mot de passe
              </label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Minimum 6 caractères"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`pr-10 ${errors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-10 w-10 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium">
                Confirmer le mot de passe
              </label>
              <div className="relative mt-1">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`pr-10 ${errors.confirmPassword ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-10 w-10 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          <div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Inscription...' : 'S\'inscrire'}
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Déjà un compte ?{' '}
              <Link
                to="/login"
                className="font-medium text-primary hover:text-primary/80"
              >
                Se connecter
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}