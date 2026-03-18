import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Calendar, MapPin, Clock, ArrowLeft, CheckCircle, XCircle, Loader2, ImagePlus, X } from 'lucide-react';
import { eventsApi } from '../services/api';
import toast from 'react-hot-toast';
import { handleApiErrorWithLog } from '../utils/errorHandler';
import { parisLocalToUTC, utcToParisLocal } from '../utils/dateUtils';

interface AddressSuggestion {
  label: string;
  city: string;
  postcode: string;
}

export default function CreateEvent() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditMode);
  const [addressValidating, setAddressValidating] = useState(false);
  const [addressValid, setAddressValid] = useState<boolean | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addressTimer, setAddressTimer] = useState<NodeJS.Timeout | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    type: 'CB',
    customType: '',
    startDate: '',
    endDate: '',
    capacity: '100',
    association: 'Fuelers',
    publishMode: 'now', // 'now' | 'schedule' | 'draft'
    publishedAt: ''
  });

  // Charger les données de l'événement en mode édition
  useEffect(() => {
    if (isEditMode && id) {
      const loadEvent = async () => {
        try {
          const event = await eventsApi.getById(id);

          // Déterminer le mode de publication
          let publishMode = 'now';
          if (!event.publishedAt) {
            publishMode = 'draft';
          } else if (new Date(event.publishedAt) > new Date()) {
            publishMode = 'schedule';
          }

          setFormData({
            name: event.name,
            description: event.description || '',
            location: event.location,
            type: event.type || 'CB',
            customType: event.customType || '',
            startDate: utcToParisLocal(event.startDate),
            endDate: utcToParisLocal(event.endDate),
            capacity: event.capacity.toString(),
            association: event.association || 'Fuelers',
            publishMode,
            publishedAt: event.publishedAt ? utcToParisLocal(event.publishedAt) : ''
          });
          if (event.imageUrl) {
            setExistingImageUrl(`https://res.cloudinary.com/dk93ledz2/image/upload/w_600,q_auto,f_auto/${event.imageUrl}`);
          }
          setAddressValid(true); // L'adresse est déjà validée
        } catch (error: any) {
          handleApiErrorWithLog(error, 'Erreur lors du chargement de l\'événement', 'CreateEvent.loadEvent');
          navigate('/');
        } finally {
          setInitialLoading(false);
        }
      };
      loadEvent();
    }
  }, [id, isEditMode, navigate]);

  // Validation d'adresse via le backend (évite les problèmes de CSP)
  const validateAddress = async (address: string) => {
    if (!address || address.length < 5) {
      setAddressValid(null);
      setAddressSuggestions([]);
      return;
    }

    setAddressValidating(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

      const response = await fetch(
        `${API_BASE_URL}/address/validate?q=${encodeURIComponent(address)}`
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const suggestions = data.features.map((feature: any) => ({
          label: feature.properties.label,
          city: feature.properties.city,
          postcode: feature.properties.postcode
        }));
        setAddressSuggestions(suggestions);
        setAddressValid(true);
        setShowSuggestions(true);
      } else {
        setAddressSuggestions([]);
        setAddressValid(false);
      }
    } catch (error) {
      console.error('Erreur validation adresse:', error);
      setAddressValid(null);
    } finally {
      setAddressValidating(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Validation d'adresse avec debounce
    if (name === 'location') {
      setAddressValid(null);
      setShowSuggestions(false);

      if (addressTimer) {
        clearTimeout(addressTimer);
      }

      const timer = setTimeout(() => {
        validateAddress(value);
      }, 500);

      setAddressTimer(timer);
    }
  };

  const handleAddressSelect = (suggestion: AddressSuggestion) => {
    setFormData(prev => ({
      ...prev,
      location: suggestion.label
    }));
    setAddressValid(true);
    setShowSuggestions(false);
    setAddressSuggestions([]);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('L\'image ne doit pas dépasser 5 Mo');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setRemoveImage(false);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (existingImageUrl) {
      setRemoveImage(true);
      setExistingImageUrl(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.location || !formData.startDate || !formData.endDate) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Vérifier que l'adresse est valide
    if (addressValid !== true) {
      toast.error('Veuillez saisir une adresse valide en France');
      return;
    }

    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      toast.error('La date de fin doit être après la date de début');
      return;
    }

    setLoading(true);
    try {
      // Calculer la date de publication
      let publishedAt: string | undefined;
      if (formData.publishMode === 'now') {
        publishedAt = new Date().toISOString();
      } else if (formData.publishMode === 'schedule') {
        publishedAt = parisLocalToUTC(formData.publishedAt);
      }
      // Si publishMode === 'draft', publishedAt reste undefined (brouillon)

      const eventData = {
        name: formData.name,
        description: formData.description || undefined,
        location: formData.location,
        type: formData.type,
        customType: formData.type === 'Autre' ? formData.customType : undefined,
        startDate: parisLocalToUTC(formData.startDate),
        endDate: parisLocalToUTC(formData.endDate),
        capacity: parseInt(formData.capacity),
        association: formData.association,
        publishedAt
      };

      if (isEditMode && id) {
        await eventsApi.update(id, eventData, imageFile || undefined, removeImage);
        toast.success('Événement modifié avec succès !');
      } else {
        await eventsApi.create(eventData, imageFile || undefined);
        toast.success('Événement créé avec succès !');
      }
      navigate('/');
    } catch (error: any) {
      handleApiErrorWithLog(error, `Erreur lors de ${isEditMode ? 'la modification' : 'la création'}`, 'CreateEvent.handleSubmit');
    } finally {
      setLoading(false);
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (addressTimer) {
        clearTimeout(addressTimer);
      }
    };
  }, [addressTimer]);

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-[#0a1128] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-white/40">Chargement de l'événement...</p>
        </div>
      </div>
    );
  }

  const inputClass = "w-full h-11 px-4 rounded-xl border border-white/10 bg-white/[0.04] text-white placeholder:text-white/25 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all text-sm";
  const labelClass = "block text-sm font-medium text-white/60 mb-2";
  const selectClass = "w-full h-11 px-4 rounded-xl border border-white/10 bg-white/[0.04] text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all text-sm [&>option]:bg-[#0d1530] [&>option]:text-white";

  return (
    <div className="min-h-screen bg-[#0a1128] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center text-white/40 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au tableau de bord
          </Link>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-400/20 mb-6">
              <Calendar className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-3xl font-syne font-bold text-white mb-3">
              {isEditMode ? 'Modifier l\'événement' : 'Créer un événement'}
            </h1>
            <p className="text-white/40 font-dm-sans">
              {isEditMode ? 'Modifiez les informations de votre événement' : 'Organisez un événement pour la communauté Fuelers'}
            </p>
          </div>
        </div>

        {/* Formulaire */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className={labelClass}>
                Nom de l'événement <span className="text-red-400">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Ex: Soirée d'intégration Fuelers"
                value={formData.name}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="description" className={labelClass}>
                Description
              </label>
              <textarea
                id="description"
                name="description"
                placeholder="Décrivez votre événement..."
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full min-h-[80px] px-4 py-3 rounded-xl border border-white/10 bg-white/[0.04] text-white placeholder:text-white/25 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all text-sm resize-none"
              />
            </div>

            <div>
              <label className={labelClass + " flex items-center"}>
                <ImagePlus className="w-4 h-4 mr-2" />
                Image de l'événement
              </label>
              {(imagePreview || existingImageUrl) ? (
                <div className="relative rounded-xl overflow-hidden border border-white/10">
                  <img
                    src={imagePreview || existingImageUrl || ''}
                    alt="Aperçu"
                    className="w-full h-48 object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="image-upload"
                  className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-blue-500/30 hover:bg-white/[0.02] transition-colors"
                >
                  <ImagePlus className="w-8 h-8 text-white/20 mb-2" />
                  <span className="text-sm text-white/30">Cliquez pour ajouter une image</span>
                  <span className="text-xs text-white/15 mt-1">JPG, PNG, WebP — max 5 Mo</span>
                </label>
              )}
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>

            <div className="relative">
              <label htmlFor="location" className={labelClass + " flex items-center"}>
                <MapPin className="w-4 h-4 mr-2" />
                Lieu (adresse en France) <span className="text-red-400 ml-1">*</span>
              </label>
              <div className="relative">
                <input
                  id="location"
                  name="location"
                  type="text"
                  placeholder="Ex: 3 Rue de la Digue, Lille"
                  value={formData.location}
                  onChange={handleChange}
                  onFocus={() => {
                    if (addressSuggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  required
                  className={`${inputClass} pr-10 ${
                    addressValid === true ? 'border-green-500/50' :
                    addressValid === false ? 'border-red-500/50' : ''
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {addressValidating && <Loader2 className="w-4 h-4 text-white/30 animate-spin" />}
                  {!addressValidating && addressValid === true && <CheckCircle className="w-4 h-4 text-green-400" />}
                  {!addressValidating && addressValid === false && <XCircle className="w-4 h-4 text-red-400" />}
                </div>
              </div>

              {showSuggestions && addressSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-[#0d1530] border border-white/10 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                  {addressSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleAddressSelect(suggestion)}
                      className="w-full text-left px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-b-0 transition-colors"
                    >
                      <div className="font-medium text-sm text-white">{suggestion.label}</div>
                      <div className="text-xs text-white/30">{suggestion.postcode} {suggestion.city}</div>
                    </button>
                  ))}
                </div>
              )}

              {addressValid === false && (
                <p className="text-xs text-red-400 mt-1">
                  Aucune adresse trouvée. Vérifiez l'orthographe ou essayez une autre adresse.
                </p>
              )}
              {addressValid === true && !showSuggestions && (
                <p className="text-xs text-green-400 mt-1">
                  Adresse valide
                </p>
              )}
            </div>

            <div>
              <label htmlFor="type" className={labelClass}>
                Type d'événement <span className="text-red-400">*</span>
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
                className={selectClass}
              >
                <option value="CB">CB (Crazy Bar)</option>
                <option value="Mini CB">Mini CB</option>
                <option value="Afterwork">Afterwork</option>
                <option value="Autre">Autre</option>
              </select>
            </div>

            {formData.type === 'Autre' && (
              <div>
                <label htmlFor="customType" className={labelClass}>
                  Préciser le type d'événement <span className="text-red-400">*</span>
                </label>
                <input
                  id="customType"
                  name="customType"
                  type="text"
                  placeholder="Ex: Gala, Conférence, etc."
                  value={formData.customType}
                  onChange={handleChange}
                  required={formData.type === 'Autre'}
                  className={inputClass}
                />
              </div>
            )}

            <div>
              <label htmlFor="association" className={labelClass}>
                Association organisatrice <span className="text-red-400">*</span>
              </label>
              <select
                id="association"
                name="association"
                value={formData.association}
                onChange={handleChange}
                required
                className={selectClass}
              >
                <option value="Fuelers">Fuelers</option>
                <option value="Art Breakers">Art Breakers</option>
                <option value="Scare'pions">Scare'pions</option>
                <option value="Gold'n'Grizz">Gold'n'Grizz</option>
                <option value="Spotl'eye't">Spotl'eye't</option>
                <option value="Cash in S'eye'ght">Cash in S'eye'ght</option>
              </select>
            </div>

            <div>
              <label htmlFor="capacity" className={labelClass}>
                Capacité (places) <span className="text-red-400">*</span>
              </label>
              <input
                id="capacity"
                name="capacity"
                type="number"
                min="1"
                placeholder="Ex: 100"
                value={formData.capacity}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className={labelClass + " flex items-center"}>
                  <Clock className="w-4 h-4 mr-2" />
                  Date de début <span className="text-red-400 ml-1">*</span>
                </label>
                <input
                  id="startDate"
                  name="startDate"
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                  className={inputClass}
                  lang="fr"
                />
              </div>

              <div>
                <label htmlFor="endDate" className={labelClass + " flex items-center"}>
                  <Clock className="w-4 h-4 mr-2" />
                  Date de fin <span className="text-red-400 ml-1">*</span>
                </label>
                <input
                  id="endDate"
                  name="endDate"
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={handleChange}
                  required
                  className={inputClass}
                  lang="fr"
                />
              </div>
            </div>
            <p className="text-xs text-white/40">Les horaires sont en heure de Paris (Europe/Paris)</p>

            {/* Publication */}
            <div className="space-y-4 border-t border-white/5 pt-6">
              <h3 className="text-lg font-syne font-bold text-white">Publication</h3>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/[0.02] cursor-pointer hover:border-white/20 transition-all">
                  <input
                    type="radio"
                    name="publishMode"
                    value="now"
                    checked={formData.publishMode === 'now'}
                    onChange={handleChange}
                    className="accent-blue-500"
                  />
                  <span className="text-sm text-white">Publier immédiatement</span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/[0.02] cursor-pointer hover:border-white/20 transition-all">
                  <input
                    type="radio"
                    name="publishMode"
                    value="schedule"
                    checked={formData.publishMode === 'schedule'}
                    onChange={handleChange}
                    className="accent-blue-500"
                  />
                  <span className="text-sm text-white">Programmer la publication</span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/[0.02] cursor-pointer hover:border-white/20 transition-all">
                  <input
                    type="radio"
                    name="publishMode"
                    value="draft"
                    checked={formData.publishMode === 'draft'}
                    onChange={handleChange}
                    className="accent-blue-500"
                  />
                  <span className="text-sm text-white">Sauvegarder comme brouillon</span>
                </label>
              </div>

              {formData.publishMode === 'schedule' && (
                <div>
                  <label htmlFor="publishedAt" className={labelClass}>
                    Date de publication <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="publishedAt"
                    name="publishedAt"
                    type="datetime-local"
                    value={formData.publishedAt}
                    onChange={handleChange}
                    required={formData.publishMode === 'schedule'}
                    className={inputClass}
                    min={utcToParisLocal(new Date().toISOString())}
                    lang="fr"
                  />
                  <p className="text-xs text-white/20 mt-1">
                    L'événement sera visible par les utilisateurs à partir de cette date
                  </p>
                </div>
              )}

              {formData.publishMode === 'draft' && (
                <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-sm text-yellow-200/80">
                    <strong className="text-yellow-200">Brouillon :</strong> L'événement ne sera pas visible par les utilisateurs.
                    Vous pourrez le publier plus tard depuis la page d'édition.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 space-y-3">
              <button
                type="submit"
                disabled={loading || addressValid !== true}
                className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-syne font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (isEditMode ? 'Modification en cours...' : 'Création en cours...') : (isEditMode ? 'Modifier l\'événement' : 'Créer l\'événement')}
              </button>
              {isEditMode && (
                <button
                  type="button"
                  onClick={() => navigate(`/events/${id}`)}
                  disabled={loading}
                  className="w-full h-11 border border-white/10 bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.06] rounded-xl font-medium transition disabled:opacity-50"
                >
                  Annuler les modifications
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
