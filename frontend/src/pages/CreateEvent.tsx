import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Calendar, MapPin, Clock, ArrowLeft, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { eventsApi } from '../services/api';
import toast from 'react-hot-toast';

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

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    type: 'CB',
    customType: '',
    startDate: '',
    endDate: '',
    capacity: '100',
    ticketPrice: '0',
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
            startDate: new Date(event.startDate).toISOString().slice(0, 16),
            endDate: new Date(event.endDate).toISOString().slice(0, 16),
            capacity: event.capacity.toString(),
            ticketPrice: event.ticketPrice.toString(),
            publishMode,
            publishedAt: event.publishedAt ? new Date(event.publishedAt).toISOString().slice(0, 16) : ''
          });
          setAddressValid(true); // L'adresse est déjà validée
        } catch (error: any) {
          toast.error('Erreur lors du chargement de l\'événement');
          navigate('/dashboard');
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
      const API_BASE_URL = import.meta.env.PROD
        ? '/api'
        : 'http://localhost:3001/api';

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
        publishedAt = new Date(formData.publishedAt).toISOString();
      }
      // Si publishMode === 'draft', publishedAt reste undefined (brouillon)

      const eventData = {
        name: formData.name,
        description: formData.description || undefined,
        location: formData.location,
        type: formData.type,
        customType: formData.type === 'Autre' ? formData.customType : undefined,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        capacity: parseInt(formData.capacity),
        ticketPrice: parseFloat(formData.ticketPrice),
        publishedAt
      };

      if (isEditMode && id) {
        await eventsApi.update(id, eventData);
        toast.success('Événement modifié avec succès !');
      } else {
        await eventsApi.create(eventData);
        toast.success('Événement créé avec succès !');
      }
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.error || `Erreur lors de ${isEditMode ? 'la modification' : 'la création'}`);
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement de l'événement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              to="/dashboard"
              className="inline-flex items-center text-blue-600 hover:text-blue-500 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au tableau de bord
            </Link>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-6 shadow-lg">
                <Calendar className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight mb-4">
                {isEditMode ? 'Modifier l\'événement' : 'Créer un nouvel événement'}
              </h1>
              <p className="text-xl text-muted-foreground">
                {isEditMode ? 'Modifiez les informations de votre événement' : 'Organisez un événement avec billetterie pour la communauté IESEG'}
              </p>
            </div>
          </div>

          {/* Formulaire */}
          <Card className="shadow-2xl border border-border bg-card">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold text-center">
                Informations de l'événement
              </CardTitle>
              <CardDescription className="text-center">
                Remplissez les détails de votre événement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Nom de l'événement *
                  </label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Ex: Soirée d'intégration IESEG"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    placeholder="Décrivez votre événement..."
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2 relative">
                  <label htmlFor="location" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    Lieu (adresse en France) *
                  </label>
                  <div className="relative">
                    <Input
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
                      className={`h-11 pr-10 ${
                        addressValid === true ? 'border-green-500' :
                        addressValid === false ? 'border-red-500' : ''
                      }`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {addressValidating && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
                      {!addressValidating && addressValid === true && <CheckCircle className="w-4 h-4 text-green-500" />}
                      {!addressValidating && addressValid === false && <XCircle className="w-4 h-4 text-red-500" />}
                    </div>
                  </div>

                  {/* Suggestions d'adresses */}
                  {showSuggestions && addressSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {addressSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleAddressSelect(suggestion)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors"
                        >
                          <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{suggestion.label}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{suggestion.postcode} {suggestion.city}</div>
                        </button>
                      ))}
                    </div>
                  )}

                  {addressValid === false && (
                    <p className="text-xs text-red-500">
                      Aucune adresse trouvée. Vérifiez l'orthographe ou essayez une autre adresse.
                    </p>
                  )}
                  {addressValid === true && !showSuggestions && (
                    <p className="text-xs text-green-600">
                      ✓ Adresse valide
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="type" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Type d'événement *
                  </label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    required
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="CB">CB (Crazy Bar)</option>
                    <option value="Mini CB">Mini CB</option>
                    <option value="Afterwork">Afterwork</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>

                {formData.type === 'Autre' && (
                  <div className="space-y-2">
                    <label htmlFor="customType" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Préciser le type d'événement *
                    </label>
                    <Input
                      id="customType"
                      name="customType"
                      type="text"
                      placeholder="Ex: Gala, Conférence, etc."
                      value={formData.customType}
                      onChange={handleChange}
                      required={formData.type === 'Autre'}
                      className="h-11"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="capacity" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Capacité (places) *
                    </label>
                    <Input
                      id="capacity"
                      name="capacity"
                      type="number"
                      min="1"
                      placeholder="Ex: 100"
                      value={formData.capacity}
                      onChange={handleChange}
                      required
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="ticketPrice" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Prix du billet (€) *
                    </label>
                    <Input
                      id="ticketPrice"
                      name="ticketPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.ticketPrice}
                      onChange={handleChange}
                      required
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">
                      Gratuit si 0€. Non modifiable après publication.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="startDate" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      Date de début *
                    </label>
                    <Input
                      id="startDate"
                      name="startDate"
                      type="datetime-local"
                      value={formData.startDate}
                      onChange={handleChange}
                      required
                      className="h-11"
                      lang="fr"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="endDate" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      Date de fin *
                    </label>
                    <Input
                      id="endDate"
                      name="endDate"
                      type="datetime-local"
                      value={formData.endDate}
                      onChange={handleChange}
                      required
                      className="h-11"
                      lang="fr"
                    />
                  </div>
                </div>

                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-semibold">Publication</h3>

                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">
                      Quand publier cet événement ?
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="publishMode"
                          value="now"
                          checked={formData.publishMode === 'now'}
                          onChange={handleChange}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm">Publier immédiatement</span>
                      </label>

                      <label className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="publishMode"
                          value="schedule"
                          checked={formData.publishMode === 'schedule'}
                          onChange={handleChange}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm">Programmer la publication</span>
                      </label>

                      <label className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="publishMode"
                          value="draft"
                          checked={formData.publishMode === 'draft'}
                          onChange={handleChange}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm">Sauvegarder comme brouillon</span>
                      </label>
                    </div>
                  </div>

                  {formData.publishMode === 'schedule' && (
                    <div className="space-y-2">
                      <label htmlFor="publishedAt" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Date de publication *
                      </label>
                      <Input
                        id="publishedAt"
                        name="publishedAt"
                        type="datetime-local"
                        value={formData.publishedAt}
                        onChange={handleChange}
                        required={formData.publishMode === 'schedule'}
                        className="h-11"
                        min={new Date().toISOString().slice(0, 16)}
                        lang="fr"
                      />
                      <p className="text-xs text-gray-500">
                        L'événement sera visible par les utilisateurs à partir de cette date
                      </p>
                    </div>
                  )}

                  {formData.publishMode === 'draft' && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm text-yellow-800">
                        <strong>Brouillon :</strong> L'événement ne sera pas visible par les utilisateurs.
                        Vous pourrez le publier plus tard depuis la page d'édition.
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-4 space-y-3">
                  <Button
                    type="submit"
                    disabled={loading || addressValid !== true}
                    className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-lg"
                  >
                    {loading ? (isEditMode ? 'Modification en cours...' : 'Création en cours...') : (isEditMode ? 'Modifier l\'événement' : 'Créer l\'événement')}
                  </Button>
                  {isEditMode && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate(`/events/${id}`)}
                      disabled={loading}
                      className="w-full h-11"
                    >
                      Annuler les modifications
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
