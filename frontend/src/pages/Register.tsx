import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../services/api';
import logoFLR from '../assets/Logo_FLR.png';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    gender: 'PREFER_NOT_TO_SAY' as 'MALE' | 'FEMALE' | 'PREFER_NOT_TO_SAY',
    instagram: '',
    address: '',
    city: '',
    postcode: '',
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (touched[name as keyof typeof touched]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    if (name === 'phone') validatePhone(value);
    else if (name === 'password') validatePassword(value);
    else if (name === 'confirmPassword') validatePasswordMatch(formData.password, value);
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^0[1-9](\d{2}){4}$/;
    const cleanPhone = phone.replace(/\s/g, '');
    if (phone && !phoneRegex.test(cleanPhone)) {
      setErrors(prev => ({ ...prev, phone: 'Format invalide (ex: 0612345678)' }));
      return false;
    }
    setErrors(prev => ({ ...prev, phone: '' }));
    return true;
  };

  const validatePassword = (password: string) => {
    if (password && password.length < 6) {
      setErrors(prev => ({ ...prev, password: 'Minimum 6 caractères requis' }));
      return false;
    }
    setErrors(prev => ({ ...prev, password: '' }));
    return true;
  };

  const validatePasswordMatch = (password: string, confirmPassword: string) => {
    if (confirmPassword && password !== confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: 'Les mots de passe ne correspondent pas' }));
      return false;
    }
    setErrors(prev => ({ ...prev, confirmPassword: '' }));
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.firstName || !formData.lastName || !formData.phone || !formData.password) {
      toast.error('Veuillez remplir tous les champs', { duration: 2000 });
      return;
    }

    const isPhoneValid = validatePhone(formData.phone);
    const isPasswordValid = validatePassword(formData.password);
    const isPasswordMatch = validatePasswordMatch(formData.password, formData.confirmPassword);

    if (!isPhoneValid || !isPasswordValid || !isPasswordMatch) {
      toast.error('Veuillez corriger les erreurs du formulaire', { duration: 2000 });
      return;
    }

    const emailLower = formData.email.toLowerCase();
    if (!emailLower.endsWith('@ieseg.fr') && !emailLower.endsWith('@gmail.com')) {
      toast.error('Veuillez utiliser votre email IESEG (@ieseg.fr) ', { duration: 2000 });
      return;
    }

    setLoading(true);
    try {
      const { confirmPassword: _confirmPassword, ...registerData } = formData;
      const response = await authApi.register(registerData);

      if (response.requiresVerification) {
        localStorage.setItem('pendingVerificationEmail', formData.email);
        navigate('/verify-email', { state: { email: formData.email } });
      } else {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        toast.success('Inscription réussie !');
        window.location.href = '/';
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Erreur lors de l'inscription", { duration: 2000 });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full h-11 px-4 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-blue-400/40 focus:ring-1 focus:ring-blue-400/20 transition-all";
  const inputErrorClass = "border-red-500/50 focus:border-red-400/60 focus:ring-red-400/20";
  const labelClass = "text-sm font-medium text-white/60";
  const optionalClass = "text-white/30 text-xs";

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
            <h1 className="font-syne font-extrabold text-3xl text-white">Inscription</h1>
            <p className="text-white/40 mt-2">Créez votre compte Fuelers</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className={labelClass}>Email IESEG</label>
              <input
                id="email" name="email" type="email" autoComplete="username" required
                placeholder="prenom.nom@ieseg.fr"
                value={formData.email} onChange={handleChange}
                className={inputClass}
              />
            </div>

            {/* Mot de passe — juste après email pour que Chrome associe email+password correctement */}
            <div className="space-y-2">
              <label htmlFor="password" className={labelClass}>Mot de passe</label>
              <div className="relative">
                <input
                  id="password" name="password" required autoComplete="new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 6 caractères"
                  value={formData.password} onChange={handleChange} onBlur={handleBlur}
                  className={`${inputClass} pr-11 ${errors.password ? inputErrorClass : ''}`}
                />
                <button
                  type="button"
                  className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
            </div>

            {/* Confirmer mot de passe */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className={labelClass}>Confirmer le mot de passe</label>
              <div className="relative">
                <input
                  id="confirmPassword" name="confirmPassword" required autoComplete="new-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword} onChange={handleChange} onBlur={handleBlur}
                  className={`${inputClass} pr-11 ${errors.confirmPassword ? inputErrorClass : ''}`}
                />
                <button
                  type="button"
                  className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>}
            </div>

            {/* Prénom / Nom */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="firstName" className={labelClass}>Prénom</label>
                <input
                  id="firstName" name="firstName" type="text" required autoComplete="given-name"
                  value={formData.firstName} onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="lastName" className={labelClass}>Nom</label>
                <input
                  id="lastName" name="lastName" type="text" required autoComplete="family-name"
                  value={formData.lastName} onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Téléphone */}
            <div className="space-y-2">
              <label htmlFor="phone" className={labelClass}>Téléphone</label>
              <input
                id="phone" name="phone" type="tel" required autoComplete="tel"
                placeholder="0612345678"
                value={formData.phone} onChange={handleChange} onBlur={handleBlur}
                className={`${inputClass} ${errors.phone ? inputErrorClass : ''}`}
              />
              {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
            </div>

            {/* Instagram */}
            <div className="space-y-2">
              <label htmlFor="instagram" className={labelClass}>
                Instagram <span className={optionalClass}>(optionnel)</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm">@</span>
                <input
                  id="instagram" name="instagram" type="text" autoComplete="off"
                  placeholder="ton_pseudo"
                  value={formData.instagram} onChange={handleChange}
                  className={`${inputClass} pl-8`}
                />
              </div>
            </div>

            {/* Genre */}
            <div className="space-y-2">
              <label htmlFor="gender" className={labelClass}>Genre <span className={optionalClass}>(optionnel)</span></label>
              <select
                id="gender" name="gender"
                value={formData.gender} onChange={handleChange}
                className={`${inputClass} [&>option]:bg-[#0a1128] [&>option]:text-white`}
              >
                <option value="PREFER_NOT_TO_SAY">Préfère ne pas dire</option>
                <option value="MALE">Homme</option>
                <option value="FEMALE">Femme</option>
              </select>
            </div>

            {/* Adresse */}
            <div className="space-y-2">
              <label htmlFor="address" className={labelClass}>
                Adresse <span className={optionalClass}>(optionnel)</span>
              </label>
              <input
                id="address" name="address" type="text" autoComplete="street-address"
                placeholder="123 rue de la République"
                value={formData.address} onChange={handleChange}
                className={inputClass}
              />
            </div>

            {/* Ville / Code postal */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="city" className={labelClass}>
                  Ville <span className={optionalClass}>(opt.)</span>
                </label>
                <input
                  id="city" name="city" type="text" placeholder="Paris" autoComplete="address-level2"
                  value={formData.city} onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="postcode" className={labelClass}>
                  Code postal <span className={optionalClass}>(opt.)</span>
                </label>
                <input
                  id="postcode" name="postcode" type="text" placeholder="75001" autoComplete="postal-code"
                  value={formData.postcode} onChange={handleChange}
                  className={inputClass}
                />
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
                  Inscription...
                </>
              ) : (
                "S'inscrire"
              )}
            </button>

            <p className="text-center text-sm text-white/30 pt-2">
              Déjà un compte ?{' '}
              <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                Se connecter
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
