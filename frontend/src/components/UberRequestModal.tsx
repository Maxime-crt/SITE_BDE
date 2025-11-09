import { useState, useEffect } from 'react';
import { X, Car, Clock, MapPin, Users, AlertCircle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import AddressInput from './AddressInput';
import api from '../services/api';
import { Event } from '../types';

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
  // État pour la complétion du profil
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

  // Vérifier si le profil est complet à l'ouverture
  useEffect(() => {
    if (isOpen) {
      const needsGender = !userGender || userGender === 'PREFER_NOT_SAY';
      const needsAddress = !userHomeAddress || !userHomeLatitude || !userHomeLongitude;

      if (needsGender || needsAddress) {
        setShowProfileCompletion(true);
        if (userGender) setProfileGender(userGender);
      } else {
        setShowProfileCompletion(false);
      }
    }
  }, [isOpen, userGender, userHomeAddress, userHomeLatitude, userHomeLongitude]);

  // Fonction helper pour formater une date en string local YYYY-MM-DDTHH:mm
  const formatDateToLocalString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Générer les créneaux horaires (toutes les 15 minutes)
  const generateTimeSlots = () => {
    const slots = [];
    const eventStart = new Date(event.startDate);
    const eventEnd = new Date(event.endDate);
    const now = new Date();

    // RÈGLE ABSOLUE: Les trajets de retour commencent 15 min APRÈS le début de la soirée
    const earliestDeparture = new Date(eventStart.getTime() + 15 * 60 * 1000);

    // Ne pas proposer de créneaux passés de plus de 30 minutes
    const minTime = new Date(now.getTime() - 30 * 60 * 1000);

    // Terminer 1h après la fin de l'événement (max)
    const end = new Date(eventEnd.getTime() + 1 * 60 * 60 * 1000);

    // Commencer à générer à partir de earliestDeparture (arrondi au créneau de 15 min)
    const startMinutes = earliestDeparture.getMinutes();
    const roundedMinutes = Math.ceil(startMinutes / 15) * 15;
    let current = new Date(earliestDeparture);
    current.setMinutes(roundedMinutes, 0, 0);

    // Si l'arrondi nous fait passer à l'heure suivante, ajuster
    if (roundedMinutes >= 60) {
      current.setHours(current.getHours() + 1);
      current.setMinutes(0, 0, 0);
    }

    // Générer tous les créneaux de 15 minutes
    while (current <= end) {
      // FILTRER: N'ajouter que si le créneau est >= earliestDeparture ET >= minTime
      if (current >= earliestDeparture && current >= minTime) {
        slots.push(formatDateToLocalString(current));
      }
      current = new Date(current.getTime() + 15 * 60 * 1000);
    }

    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Initialiser l'heure par défaut
  useEffect(() => {
    if (timeSlots.length > 0 && !maxDepartureTime) {
      setMaxDepartureTime(timeSlots[0]);
    }
  }, [timeSlots, maxDepartureTime]);

  // Bloquer le scroll du body quand le modal est ouvert
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Fonction pour sauvegarder le profil (genre + adresse)
  const handleSaveProfile = async () => {
    // Validation
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

      // Recharger la page pour mettre à jour les props
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error('Erreur sauvegarde profil:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la mise à jour du profil');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Déterminer l'adresse à utiliser
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
        maxDepartureTime: departNow ? new Date().toISOString() : maxDepartureTime,
        femaleOnly,
        departNow
      });

      toast.success(response.data.message || 'Demande créée ! Nous recherchons des personnes allant dans votre direction...');
      onClose();

      // Rediriger vers mes trajets après 2 secondes
      setTimeout(() => {
        window.location.href = '/my-rides';
      }, 2000);
    } catch (error: any) {
      console.error('Erreur création demande:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la création de la demande');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    // Si le clic commence sur le backdrop
    if (e.target === e.currentTarget) {
      setIsDragging(true);
    }
  };

  const handleBackdropMouseUp = (e: React.MouseEvent) => {
    // Seulement fermer si le clic a commencé ET fini sur le backdrop
    if (e.target === e.currentTarget && isDragging) {
      onClose();
    }
    setIsDragging(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onMouseDown={handleBackdropMouseDown}
      onMouseUp={handleBackdropMouseUp}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <Car className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {showProfileCompletion ? 'Compléter mon profil' : 'Rentrer en Uber'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">{event.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Écran de complétion du profil */}
        {showProfileCompletion ? (
          <div className="p-6 space-y-6">
            {/* Message d'information */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Informations manquantes
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Pour utiliser le covoiturage, nous avons besoin de connaître votre genre et votre adresse de domicile.
                </p>
              </div>
            </div>

            {/* Genre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                <Users className="inline w-4 h-4 mr-1" />
                Genre
                <span className="text-red-500 dark:text-red-400 ml-1">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setProfileGender('MALE')}
                  className={`p-4 rounded-lg border-2 transition ${
                    profileGender === 'MALE'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Homme
                </button>
                <button
                  type="button"
                  onClick={() => setProfileGender('FEMALE')}
                  className={`p-4 rounded-lg border-2 transition ${
                    profileGender === 'FEMALE'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Femme
                </button>
                <button
                  type="button"
                  onClick={() => setProfileGender('OTHER')}
                  className={`p-4 rounded-lg border-2 transition ${
                    profileGender === 'OTHER'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Autre
                </button>
                <button
                  type="button"
                  onClick={() => setProfileGender('PREFER_NOT_SAY')}
                  className={`p-4 rounded-lg border-2 transition ${
                    profileGender === 'PREFER_NOT_SAY'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Ne pas préciser
                </button>
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
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Cette adresse sera proposée par défaut pour vos trajets de retour.
              </p>
            </div>

            {/* Boutons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <MapPin className="inline w-4 h-4 mr-1" />
              Où souhaitez-vous aller ?
            </label>

            <div className="space-y-3">
              {/* Option: Adresse domicile */}
              {userHomeAddress && (
                <label className="flex items-start gap-3 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  <input
                    type="radio"
                    name="addressChoice"
                    checked={useHomeAddress}
                    onChange={() => setUseHomeAddress(true)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">Mon adresse d&apos;inscription</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{userHomeAddress}</div>
                  </div>
                </label>
              )}

              {/* Option: Autre adresse */}
              <label className="flex items-start gap-3 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                <input
                  type="radio"
                  name="addressChoice"
                  checked={!useHomeAddress}
                  onChange={() => setUseHomeAddress(false)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">Autre adresse</div>
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <Clock className="inline w-4 h-4 mr-1" />
              Quand souhaitez-vous partir ?
            </label>

            <div className="space-y-3">
              {/* Option: Partir maintenant (pendant l'événement) */}
              <label className="flex items-center gap-3 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                <input
                  type="radio"
                  name="departureChoice"
                  checked={departNow}
                  onChange={() => setDepartNow(true)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Partir maintenant</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Trouver d&apos;autres personnes qui veulent partir tout de suite
                  </div>
                </div>
              </label>

              {/* Option: Heure précise */}
              <div className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="departureChoice"
                    checked={!departNow}
                    onChange={() => {
                      setDepartNow(false);
                      setIsTimeDropdownOpen(true);
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">Heure de départ souhaitée</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Vous partirez au plus tard à cette heure (ou 30 min avant si match trouvé)
                    </div>
                  </div>
                </label>

                {!departNow && (
                  <>
                    {/* Bouton pour afficher l'heure sélectionnée et ouvrir la liste */}
                    <button
                      type="button"
                      onClick={() => setIsTimeDropdownOpen(!isTimeDropdownOpen)}
                      className="mt-3 w-full px-4 py-2.5 text-left bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      {maxDepartureTime ? (
                        <span className="text-gray-900 dark:text-white font-medium">
                          {new Date(maxDepartureTime).toLocaleString('fr-FR', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">Sélectionner une heure</span>
                      )}
                    </button>

                    {/* Liste déroulante */}
                    {isTimeDropdownOpen && (
                      <div className="mt-2 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                        <div className="max-h-48 overflow-y-auto bg-white dark:bg-gray-800">
                          {timeSlots.map((slot) => {
                            const date = new Date(slot);
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
                                    : 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                              >
                                {date.toLocaleString('fr-FR', {
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

          {/* Préférence genre (uniquement pour les femmes) */}
          {userGender === 'FEMALE' && (
            <div className="bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-lg p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={femaleOnly}
                  onChange={(e) => setFemaleOnly(e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    <Users className="inline w-4 h-4 mr-1" />
                    Uniquement avec d&apos;autres femmes
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Vous ne serez mise en contact qu&apos;avec des femmes
                  </div>
                </div>
              </label>
            </div>
          )}

          {/* Info pratiques */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm">
            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Comment ça marche ?</h3>
            <ul className="space-y-1 text-blue-800 dark:text-blue-400">
              <li>• Nous recherchons des personnes allant dans votre direction</li>
              <li>• Maximum 4 personnes par trajet (type UberX)</li>
              <li>• Vous pourrez discuter via le chat du groupe</li>
              <li>• Le premier à créer le trajet appellera l&apos;Uber et paiera la course</li>
              <li>• Les autres paieront leur part via l&apos;application (divisée équitablement)</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
