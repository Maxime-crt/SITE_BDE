import { useState } from 'react';
import { Save, MapPin, Edit2, X, Instagram, User, Phone, Mail, Home, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import AddressInput from '../components/AddressInput';
import type { User as UserType } from '../types';
import LandingNav from '../components/LandingNav';
import logoFLR from '../assets/Logo_FLR.png';

interface ProfileProps {
  user: UserType;
}

export default function Profile({ user }: ProfileProps) {
  const [isEditing, setIsEditing] = useState(false);

  const isAdmin = user?.isAdmin === true;

  // Edit states
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [phone, setPhone] = useState(user.phone);
  const [instagram, setInstagram] = useState(user.instagram || '');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_SAY'>(
    user.gender || 'PREFER_NOT_SAY'
  );
  const [homeAddress, setHomeAddress] = useState(user.homeAddress || '');
  const [addressCoords, setAddressCoords] = useState<{
    lat: number;
    lng: number;
    city: string;
    postcode: string;
  } | null>(
    user.homeLatitude && user.homeLongitude
      ? { lat: user.homeLatitude, lng: user.homeLongitude, city: user.homeCity || '', postcode: user.homePostcode || '' }
      : null
  );
  const [saving, setSaving] = useState(false);

  const getGenderLabel = (g: string | undefined) => {
    switch (g) {
      case 'MALE': return 'Homme';
      case 'FEMALE': return 'Femme';
      case 'OTHER': return 'Autre';
      case 'PREFER_NOT_SAY': return 'Non précisé';
      default: return 'Non renseigné';
    }
  };

  const handleSaveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Le prénom et le nom sont requis');
      return;
    }
    if (!phone.trim()) {
      toast.error('Le téléphone est requis');
      return;
    }

    setSaving(true);
    try {
      await api.put('/users/profile', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        gender,
        instagram: instagram.trim() || null,
        homeAddress,
        homeCity: addressCoords?.city || '',
        homePostcode: addressCoords?.postcode || '',
        homeLatitude: addressCoords?.lat,
        homeLongitude: addressCoords?.lng
      });

      toast.success('Profil mis à jour avec succès !');
      setIsEditing(false);
      setTimeout(() => { window.location.reload(); }, 1000);
    } catch (error: any) {
      console.error('Erreur sauvegarde profil:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la mise à jour du profil');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setPhone(user.phone);
    setGender(user.gender || 'PREFER_NOT_SAY');
    setInstagram(user.instagram || '');
    setHomeAddress(user.homeAddress || '');
    setAddressCoords(
      user.homeLatitude && user.homeLongitude
        ? { lat: user.homeLatitude, lng: user.homeLongitude, city: user.homeCity || '', postcode: user.homePostcode || '' }
        : null
    );
    setIsEditing(false);
  };

  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();

  return (
    <div className="min-h-screen bg-[#0a1128] font-dm-sans text-white flex flex-col">
      <LandingNav isAdmin={isAdmin} />

      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-indigo-500/6 rounded-full blur-[100px]" />
      </div>

      <div className="relative flex-1 pt-28 pb-12 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Profile header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/30 to-indigo-500/20 border-2 border-blue-400/30 flex items-center justify-center mx-auto mb-4">
              <span className="font-syne font-extrabold text-2xl text-blue-300">{initials}</span>
            </div>
            <h1 className="font-syne font-extrabold text-2xl sm:text-3xl text-white mb-1">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-white/40 text-sm">{user.email}</p>
          </div>

          <div className="space-y-6">
              {/* Edit button */}
              {!isEditing && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Modifier mon profil
                  </button>
                </div>
              )}

              {!isEditing ? (
                /* View mode */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 hover:border-blue-400/20 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-400" />
                      </div>
                      <span className="text-white/40 text-sm">Prénom</span>
                    </div>
                    <p className="text-white font-medium">{user.firstName}</p>
                  </div>

                  <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 hover:border-blue-400/20 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-400" />
                      </div>
                      <span className="text-white/40 text-sm">Nom</span>
                    </div>
                    <p className="text-white font-medium">{user.lastName}</p>
                  </div>

                  <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 hover:border-blue-400/20 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center">
                        <Mail className="w-4 h-4 text-indigo-400" />
                      </div>
                      <span className="text-white/40 text-sm">Email</span>
                    </div>
                    <p className="text-white font-medium">{user.email}</p>
                  </div>

                  <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 hover:border-blue-400/20 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center">
                        <Phone className="w-4 h-4 text-blue-400" />
                      </div>
                      <span className="text-white/40 text-sm">Téléphone</span>
                    </div>
                    <p className="text-white font-medium">{user.phone}</p>
                  </div>

                  <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 hover:border-blue-400/20 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center">
                        <Instagram className="w-4 h-4 text-indigo-400" />
                      </div>
                      <span className="text-white/40 text-sm">Instagram</span>
                    </div>
                    {user.instagram ? (
                      <a
                        href={`https://instagram.com/${user.instagram}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                      >
                        @{user.instagram}
                      </a>
                    ) : (
                      <p className="text-white/20">Non renseigné</p>
                    )}
                  </div>

                  <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 hover:border-blue-400/20 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-400" />
                      </div>
                      <span className="text-white/40 text-sm">Genre</span>
                    </div>
                    <p className="text-white font-medium">{getGenderLabel(user.gender)}</p>
                  </div>

                  <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 hover:border-blue-400/20 transition-colors sm:col-span-2">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center">
                        <Home className="w-4 h-4 text-indigo-400" />
                      </div>
                      <span className="text-white/40 text-sm">Adresse de domicile</span>
                    </div>
                    <p className="text-white font-medium">{user.homeAddress || 'Non renseignée'}</p>
                    {user.homeCity && user.homePostcode && (
                      <p className="text-white/30 text-sm mt-1">{user.homePostcode} {user.homeCity}</p>
                    )}
                  </div>
                </div>
              ) : (
                /* Edit mode */
                <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-6 sm:p-8 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-white/40 mb-2">Prénom *</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400/30"
                        placeholder="Prénom"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/40 mb-2">Nom *</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400/30"
                        placeholder="Nom"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/40 mb-2">Email</label>
                      <div className="px-4 py-3 bg-white/[0.02] border border-white/5 rounded-xl text-white/30">
                        {user.email}
                      </div>
                      <p className="mt-1 text-[10px] text-white/20">L'email ne peut pas être modifié</p>
                    </div>
                    <div>
                      <label className="block text-sm text-white/40 mb-2">Téléphone *</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400/30"
                        placeholder="Téléphone"
                      />
                    </div>
                  </div>

                  {/* Instagram */}
                  <div>
                    <label className="block text-sm text-white/40 mb-2 flex items-center gap-2">
                      <Instagram className="w-4 h-4" />
                      Instagram
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 text-sm">@</span>
                      <input
                        type="text"
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400/30"
                        placeholder="ton_pseudo"
                      />
                    </div>
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-sm text-white/40 mb-3">Genre (optionnel)</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {([
                        { value: 'MALE', label: 'Homme' },
                        { value: 'FEMALE', label: 'Femme' },
                        { value: 'OTHER', label: 'Autre' },
                        { value: 'PREFER_NOT_SAY', label: 'Ne pas préciser' },
                      ] as const).map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setGender(opt.value)}
                          className={`p-3 rounded-xl border text-sm transition-all ${
                            gender === opt.value
                              ? 'border-blue-400/40 bg-blue-500/10 text-blue-300'
                              : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-sm text-white/40 mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Adresse de domicile
                    </label>
                    <AddressInput
                      value={homeAddress}
                      onChange={(address, coords) => {
                        setHomeAddress(address);
                        setAddressCoords(coords || null);
                      }}
                      placeholder="Ex: 3 Rue de la Digue Verte, 59000 Lille"
                      initiallyValidated={!!addressCoords && !!homeAddress}
                    />
                    <p className="mt-2 text-[10px] text-white/20">
                      Cette adresse sera utilisée par défaut pour vos trajets de retour.
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="px-5 py-2.5 text-sm text-white/50 hover:text-white rounded-xl hover:bg-white/5 transition-all border border-white/10 flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Annuler
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="px-5 py-2.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {saving ? 'Sauvegarde...' : 'Enregistrer'}
                    </button>
                  </div>
                </div>
              )}
            </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative py-16 px-6 border-t border-white/10 bg-gradient-to-b from-[#0a1128] to-[#0d1530]">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-950/20 via-transparent to-indigo-950/20" />
        <div className="relative max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <img src={logoFLR} alt="Fuelers" className="w-10 h-10 rounded-full ring-2 ring-blue-400/30 shadow-lg shadow-blue-500/10" />
              <span className="font-syne font-bold text-xl bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Fuelers
              </span>
            </div>
            <div className="flex items-center gap-6">
              <a href="https://www.instagram.com/listebde.fuelers" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-blue-400 transition-colors duration-300" aria-label="Instagram">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
              <a href="https://www.tiktok.com/@listebde.fuelers" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors duration-300" aria-label="TikTok">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-.88-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/></svg>
              </a>
            </div>
            <p className="text-white/60 text-sm font-medium">&copy; {new Date().getFullYear()} Fuelers. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
