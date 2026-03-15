import { useState, useEffect } from 'react';
import { X, Car, Clock, MapPin, Users, AlertCircle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import AddressInput from './AddressInput';
import api from '../services/api';
import { Event } from '../types';
import { formatParisDate, parisLocalToUTC } from '../utils/dateUtils';

interface UberRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  userHomeAddress?: string;
  userHomeCity?: string;
  userHomePostcode?: string;
  userHomeLatitude?: number;
  userHomeLongitude?: number;
  userGender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_SAY';
}

export default function UberRequestModal({
  isOpen,
  onClose,
  event,
  userHomeAddress,
  userHomeCity,
  userHomePostcode,
  userHomeLatitude,
  userHomeLongitude,
  userGender
}: UberRequestModalProps) {
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);
  const [profileGender, setProfileGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_SAY'>('PREFER_NOT_SAY');
  const [profileAddress, setProfileAddress] = useState('');
  const [profileAddressCoords, setProfileAddressCoords] = useState<{
    lat: number;
    lng: number;
    city: string;
    postcode: string;
  } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [useHomeAddress, setUseHomeAddress] = useState(true);
  const [customAddress, setCustomAddress] = useState('');
  const [addressCoordinates, setAddressCoordinates] = useState<{
    lat: number;
    lng: number;
    city: string;
    postcode: string;
  } | null>(null);
  const [isAddressValidated, setIsAddressValidated] = useState(false);

  const [departNow, setDepartNow] = useState(false);
  const [maxDepartureTime, setMaxDepartureTime] = useState('');
  const [femaleOnly, setFemaleOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const needsGender = !userGender || userGender === 'PREFER_NOT_SAY';
      const needsAddress = !userHomeAddress || !userHomeLatitude || !userHomeLongitude;

      if (needsGender || needsAddress) {
        setShowProfileCompletion(true);
        if (userGender) setProfileGender(userGender);
        if (userHomeAddress) {
          const fullAddress = [userHomeAddress, userHomePostcode, userHomeCity]
            .filter(Boolean)
            .join(', ');
          setProfileAddress(fullAddress);
          if (userHomeLatitude && userHomeLongitude) {
            setProfileAddressCoords({
              lat: userHomeLatitude,
              lng: userHomeLongitude,
              city: userHomeCity || '',
              postcode: userHomePostcode || ''
            });
          }
        }
      } else {
        setShowProfileCompletion(false);
      }
    }
  }, [isOpen, userGender, userHomeAddress, userHomeLatitude, userHomeLongitude]);

  const formatDateToLocalString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const generateTimeSlots = () => {
    const slots = [];
    const eventStart = new Date(event.startDate);
    const eventEnd = new Date(event.endDate);
    const now = new Date();
    const earliestDeparture = new Date(eventStart.getTime() + 15 * 60 * 1000);
    const minTime = new Date(now.getTime() - 30 * 60 * 1000);
    const end = new Date(eventEnd.getTime() + 1 * 60 * 60 * 1000);
    const startMinutes = earliestDeparture.getMinutes();
    const roundedMinutes = Math.ceil(startMinutes / 15) * 15;
    let current = new Date(earliestDeparture);
    current.setMinutes(roundedMinutes, 0, 0);
    if (roundedMinutes >= 60) {
      current.setHours(current.getHours() + 1);
      current.setMinutes(0, 0, 0);
    }
    while (current <= end) {
      if (current >= earliestDeparture && current >= minTime) {
        slots.push(formatDateToLocalString(current));
      }
      current = new Date(current.getTime() + 15 * 60 * 1000);
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();
  const eventHasStarted = new Date() >= new Date(event.startDate);

  useEffect(() => {
    if (timeSlots.length > 0 && !maxDepartureTime) {
      setMaxDepartureTime(timeSlots[0]);
    }
  }, [timeSlots, maxDepartureTime]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const handleSaveProfile = async () => {
    if (!profileGender || profileGender === 'PREFER_NOT_SAY') {
      toast.error('Veuillez sélectionner votre genre');
      return;
    }
    if (!profileAddress || !profileAddressCoords) {
      toast.error('Veuillez renseigner une adresse valide');
      return;
    }
    setSavingProfile(true);
    try {
      await api.put('/users/profile', {
        gender: profileGender,
        homeAddress: profileAddress,
        homeCity: profileAddressCoords.city,
        homePostcode: profileAddressCoords.postcode,
        homeLatitude: profileAddressCoords.lat,
        homeLongitude: profileAddressCoords.lng
      });
      toast.success('Profil mis à jour avec succès !');
      setTimeout(() => { window.location.reload(); }, 1000);
    } catch (error: any) {
      console.error('Erreur sauvegarde profil:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la mise à jour du profil');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let destinationAddress = '';
    let destinationCity = '';
    let destinationPostcode = '';
    let destinationLat = 0;
    let destinationLng = 0;

    if (useHomeAddress) {
      if (!userHomeAddress || !userHomeLatitude || !userHomeLongitude) {
        toast.error('Vous devez d\'abord configurer votre adresse dans votre profil');
        return;
      }
      destinationAddress = userHomeAddress;
      destinationCity = userHomeCity || '';
      destinationPostcode = userHomePostcode || '';
      destinationLat = userHomeLatitude;
      destinationLng = userHomeLongitude;
    } else {
      if (!customAddress || !addressCoordinates) {
        toast.error('Veuillez saisir une adresse valide');
        return;
      }
      destinationAddress = customAddress;
      destinationCity = addressCoordinates.city;
      destinationPostcode = addressCoordinates.postcode;
      destinationLat = addressCoordinates.lat;
      destinationLng = addressCoordinates.lng;
    }

    if (!departNow && !maxDepartureTime) {
      toast.error('Veuillez sélectionner une heure de départ');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/uber-rides/request', {
        eventId: event.id,
        destinationAddress,
        destinationCity,
        destinationPostcode,
        destinationLat,
        destinationLng,
        maxDepartureTime: departNow ? new Date().toISOString() : parisLocalToUTC(maxDepartureTime),
        femaleOnly,
        departNow
      });
      toast.success(response.data.message || 'Demande créée ! Nous recherchons des personnes allant dans votre direction...');
      onClose();
      setTimeout(() => { window.location.href = '/my-rides'; }, 2000);
    } catch (error: any) {
      console.error('Erreur création demande:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la création de la demande');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) setIsDragging(true);
  };

  const handleBackdropMouseUp = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && isDragging) onClose();
    setIsDragging(false);
  };

  const genderBtn = (value: typeof profileGender, label: string) => (
    <button
      type="button"
      onClick={() => setProfileGender(value)}
      className={`p-4 rounded-xl border transition-all font-medium ${
        profileGender === value
          ? 'border-blue-500 bg-blue-500/10 text-blue-300'
          : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:text-white/80'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
      onMouseDown={handleBackdropMouseDown}
      onMouseUp={handleBackdropMouseUp}
    >
      <div
        className="bg-[#0d1530] border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto my-8 shadow-2xl shadow-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center">
              <Car className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-syne font-bold text-white">
                {showProfileCompletion ? 'Compléter mon profil' : 'Rentrer en Uber'}
              </h2>
              <p className="text-sm text-white/40">{event.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/5 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Écran de complétion du profil */}
        {showProfileCompletion ? (
          <div className="p-6 space-y-6">
            <div className="rounded-xl bg-blue-500/10 border border-blue-400/20 p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-white mb-1">Informations manquantes</h3>
                <p className="text-sm text-white/50">
                  Pour utiliser le covoiturage, nous avons besoin de connaître votre genre et votre adresse de domicile.
                </p>
              </div>
            </div>

            {/* Genre */}
            <div>
              <label className="block text-sm font-medium text-white/60 mb-3">
                <Users className="inline w-4 h-4 mr-1" />
                Genre
                <span className="text-red-400 ml-1">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {genderBtn('MALE', 'Homme')}
                {genderBtn('FEMALE', 'Femme')}
                {genderBtn('OTHER', 'Autre')}
                {genderBtn('PREFER_NOT_SAY', 'Ne pas préciser')}
              </div>
            </div>

            {/* Adresse */}
            <div>
              <AddressInput
                label="Adresse de domicile"
                value={profileAddress}
                onChange={(address, coords) => {
                  setProfileAddress(address);
                  setProfileAddressCoords(coords || null);
                }}
                placeholder="Ex: 3 Rue de la Digue Verte, 59000 Lille"
                required
                initiallyValidated={!!profileAddressCoords}
              />
              <p className="mt-2 text-xs text-white/30">
                Cette adresse sera proposée par défaut pour vos trajets de retour.
              </p>
            </div>

            {/* Bouton */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-syne font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {savingProfile ? (
                  <>Sauvegarde en cours...</>
                ) : (
                  <>
                    Enregistrer et continuer
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Form de demande de trajet */
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Choix adresse */}
            <div>
              <label className="block text-sm font-medium text-white/60 mb-3">
                <MapPin className="inline w-4 h-4 mr-1" />
                Où souhaitez-vous aller ?
              </label>

              <div className="space-y-3">
                {userHomeAddress && (
                  <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    useHomeAddress
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                  }`}>
                    <input
                      type="radio"
                      name="addressChoice"
                      checked={useHomeAddress}
                      onChange={() => setUseHomeAddress(true)}
                      className="mt-1 accent-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-white">Mon adresse d&apos;inscription</div>
                      <div className="text-sm text-white/40 mt-1">{userHomeAddress}</div>
                    </div>
                  </label>
                )}

                <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                  !useHomeAddress
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                }`}>
                  <input
                    type="radio"
                    name="addressChoice"
                    checked={!useHomeAddress}
                    onChange={() => setUseHomeAddress(false)}
                    className="mt-1 accent-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-white">Autre adresse</div>
                    {!useHomeAddress && (
                      <div className="mt-3">
                        <AddressInput
                          value={customAddress}
                          onChange={(address, coords) => {
                            setCustomAddress(address);
                            if (coords) {
                              setAddressCoordinates(coords);
                              setIsAddressValidated(true);
                            } else {
                              setAddressCoordinates(null);
                              setIsAddressValidated(false);
                            }
                          }}
                          placeholder="Saisissez une adresse en France"
                          required
                          initiallyValidated={isAddressValidated && !!addressCoordinates}
                        />
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* Horaire de départ */}
            <div>
              <label className="block text-sm font-medium text-white/60 mb-3">
                <Clock className="inline w-4 h-4 mr-1" />
                Quand souhaitez-vous partir ?
              </label>

              <div className="space-y-3">
                <label className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                  eventHasStarted
                    ? departNow
                      ? 'border-blue-500 bg-blue-500/10 cursor-pointer'
                      : 'border-white/10 bg-white/[0.03] cursor-pointer hover:border-white/20'
                    : 'border-white/5 bg-white/[0.01] cursor-not-allowed opacity-40'
                }`}>
                  <input
                    type="radio"
                    name="departureChoice"
                    checked={departNow}
                    onChange={() => eventHasStarted && setDepartNow(true)}
                    disabled={!eventHasStarted}
                    className="mt-1 accent-blue-500"
                  />
                  <div>
                    <div className="font-medium text-white">Partir maintenant</div>
                    <div className="text-sm text-white/40">
                      {eventHasStarted
                        ? "Trouver d'autres personnes qui veulent partir tout de suite"
                        : "Disponible uniquement pendant la soirée"
                      }
                    </div>
                  </div>
                </label>

                <div className={`p-4 rounded-xl border transition-all ${
                  !departNow
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-white/10 bg-white/[0.03]'
                }`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="departureChoice"
                      checked={!departNow}
                      onChange={() => {
                        setDepartNow(false);
                        setIsTimeDropdownOpen(true);
                      }}
                      className="mt-1 accent-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-white">Heure de départ souhaitée</div>
                      <div className="text-sm text-white/40 mb-3">
                        Vous partirez au plus tard à cette heure (ou 30 min avant si match trouvé)
                      </div>
                    </div>
                  </label>

                  {!departNow && (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsTimeDropdownOpen(!isTimeDropdownOpen)}
                        className="mt-1 w-full px-4 py-2.5 text-left bg-white/[0.05] border border-white/10 rounded-xl hover:border-white/20 transition-colors"
                      >
                        {maxDepartureTime ? (
                          <span className="text-white font-medium">
                            {formatParisDate(maxDepartureTime, {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        ) : (
                          <span className="text-white/30">Sélectionner une heure</span>
                        )}
                      </button>

                      {isTimeDropdownOpen && (
                        <div className="mt-2 border border-white/10 rounded-xl overflow-hidden">
                          <div className="max-h-48 overflow-y-auto bg-[#0a1128]">
                            {timeSlots.map((slot) => {
                              const isSelected = maxDepartureTime === slot;
                              return (
                                <button
                                  key={slot}
                                  type="button"
                                  onClick={() => {
                                    setMaxDepartureTime(slot);
                                    setIsTimeDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                                    isSelected
                                      ? 'bg-blue-600 text-white font-medium'
                                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                                  }`}
                                >
                                  {formatParisDate(slot, {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Préférence genre */}
            {userGender === 'FEMALE' && (
              <div className="rounded-xl bg-pink-500/10 border border-pink-500/20 p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={femaleOnly}
                    onChange={(e) => setFemaleOnly(e.target.checked)}
                    className="mt-1 accent-pink-500"
                  />
                  <div>
                    <div className="font-medium text-white">
                      <Users className="inline w-4 h-4 mr-1" />
                      Uniquement avec d&apos;autres femmes
                    </div>
                    <div className="text-sm text-white/40 mt-1">
                      Vous ne serez mise en contact qu&apos;avec des femmes
                    </div>
                  </div>
                </label>
              </div>
            )}

            {/* Info pratiques */}
            <div className="rounded-xl bg-blue-500/5 border border-blue-400/10 p-4 text-sm">
              <h3 className="font-syne font-bold text-white mb-2">Comment ça marche ?</h3>
              <ul className="space-y-1.5 text-white/40">
                <li>• Nous recherchons des personnes allant dans votre direction</li>
                <li>• Maximum 4 personnes par trajet (type UberX)</li>
                <li>• Vous pourrez discuter via le chat du groupe</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-white/10 rounded-xl font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-syne font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Recherche en cours...' : 'Rechercher un trajet'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
