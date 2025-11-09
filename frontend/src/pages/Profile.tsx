import { useState } from 'react';
import { Save, MapPin, Users, Edit2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import AddressInput from '../components/AddressInput';
import type { User } from '../types';

interface ProfileProps {
  user: User;
}

export default function Profile({ user }: ProfileProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'ratings'>('info');
  const [isEditing, setIsEditing] = useState(false);

  // États pour l'édition - informations de compte
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [phone, setPhone] = useState(user.phone);

  // États pour l'édition - informations personnelles
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
      ? {
          lat: user.homeLatitude,
          lng: user.homeLongitude,
          city: user.homeCity || '',
          postcode: user.homePostcode || ''
        }
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
    // Validation
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
        homeAddress,
        homeCity: addressCoords?.city || '',
        homePostcode: addressCoords?.postcode || '',
        homeLatitude: addressCoords?.lat,
        homeLongitude: addressCoords?.lng
      });

      toast.success('Profil mis à jour avec succès !');
      setIsEditing(false);

      // Recharger la page pour mettre à jour les données
      setTimeout(() => {
        window.location.reload();
      }, 1000);
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
    setHomeAddress(user.homeAddress || '');
    setAddressCoords(
      user.homeLatitude && user.homeLongitude
        ? {
            lat: user.homeLatitude,
            lng: user.homeLongitude,
            city: user.homeCity || '',
            postcode: user.homePostcode || ''
          }
        : null
    );
    setIsEditing(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-card shadow rounded-lg border border-border">
        <div className="px-6 py-4 border-b border-border">
          <h1 className="text-2xl font-bold text-foreground">Mon Profil</h1>
        </div>

        {/* Navigation tabs */}
        <div className="border-b border-border">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('info')}
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'info'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}
            >
              Informations personnelles
            </button>
            <button
              onClick={() => setActiveTab('ratings')}
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'ratings'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}
            >
              Évaluations
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Bouton Modifier global */}
              {!isEditing && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 text-sm bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Modifier mon profil
                  </button>
                </div>
              )}

              {/* Informations personnelles */}
              <div>
                <h3 className="text-lg font-medium text-foreground mb-4">Informations personnelles</h3>
                {!isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Prénom
                      </label>
                      <div className="text-foreground">{user.firstName}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Nom
                      </label>
                      <div className="text-foreground">{user.lastName}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Email
                      </label>
                      <div className="text-foreground">{user.email}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Téléphone
                      </label>
                      <div className="text-foreground">{user.phone}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Genre
                      </label>
                      <div className="text-foreground">{getGenderLabel(user.gender)}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Adresse de domicile
                      </label>
                      <div className="text-foreground">
                        {user.homeAddress || 'Non renseignée'}
                      </div>
                      {user.homeCity && user.homePostcode && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {user.homePostcode} {user.homeCity}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                          Prénom *
                        </label>
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Prénom"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                          Nom *
                        </label>
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Nom"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                          Email
                        </label>
                        <div className="text-foreground bg-muted px-3 py-2 rounded-lg border border-border">
                          {user.email}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">L'email ne peut pas être modifié</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                          Téléphone *
                        </label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Téléphone"
                        />
                      </div>
                    </div>

                    {/* Genre */}
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-3">
                        Genre
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <button
                          type="button"
                          onClick={() => setGender('MALE')}
                          className={`p-3 rounded-lg border-2 transition text-sm ${
                            gender === 'MALE'
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border hover:bg-muted text-foreground'
                          }`}
                        >
                          Homme
                        </button>
                        <button
                          type="button"
                          onClick={() => setGender('FEMALE')}
                          className={`p-3 rounded-lg border-2 transition text-sm ${
                            gender === 'FEMALE'
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border hover:bg-muted text-foreground'
                          }`}
                        >
                          Femme
                        </button>
                        <button
                          type="button"
                          onClick={() => setGender('OTHER')}
                          className={`p-3 rounded-lg border-2 transition text-sm ${
                            gender === 'OTHER'
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border hover:bg-muted text-foreground'
                          }`}
                        >
                          Autre
                        </button>
                        <button
                          type="button"
                          onClick={() => setGender('PREFER_NOT_SAY')}
                          className={`p-3 rounded-lg border-2 transition text-sm ${
                            gender === 'PREFER_NOT_SAY'
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border hover:bg-muted text-foreground'
                          }`}
                        >
                          Ne pas préciser
                        </button>
                      </div>
                    </div>

                    {/* Adresse */}
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
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
                      <p className="mt-2 text-xs text-muted-foreground">
                        Cette adresse sera utilisée par défaut pour vos trajets de retour en covoiturage.
                      </p>
                    </div>

                    {/* Boutons Sauvegarder / Annuler */}
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={handleCancelEdit}
                        disabled={saving}
                        className="px-6 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Annuler
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        {saving ? 'Sauvegarde...' : 'Enregistrer'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {activeTab === 'ratings' && (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-foreground">Fonctionnalité à venir</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Les évaluations des événements apparaîtront ici.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}