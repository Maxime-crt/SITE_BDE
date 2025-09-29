import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { eventsApi, ridesApi } from '../services/api';
import type { User } from '../types';
import toast from 'react-hot-toast';

interface CreateRideProps {
  user: User;
}

export default function CreateRide({ user }: CreateRideProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    destination: '',
    description: '',
    departureDate: '',
    departureHour: '',
    maxParticipants: 4,
    cost: '',
    transportType: 'DRIVE' as 'DRIVE' | 'UBER'
  });
  const [loading, setLoading] = useState(false);

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsApi.getById(id!),
    enabled: !!id
  });

  // Préremplir les champs quand l'événement est chargé
  useEffect(() => {
    if (event && !formData.departureDate && !formData.departureHour) {
      const eventDate = new Date(event.startDate);
      const dateString = eventDate.toISOString().split('T')[0];

      // Calculer l'heure par défaut (1h après le début)
      const eventStart = new Date(event.startDate);
      let defaultHour = eventStart.getHours() + 1;
      let defaultMinute = eventStart.getMinutes();

      console.log('Event start hour:', eventStart.getHours());
      console.log('Default hour before adjustment:', defaultHour);

      // Gérer le passage à l'heure suivante
      if (defaultHour >= 24) {
        defaultHour -= 24;
      }

      console.log('Default hour after 24h adjustment:', defaultHour);

      // Arrondir aux 15 minutes supérieures
      defaultMinute = Math.ceil(defaultMinute / 15) * 15;
      if (defaultMinute >= 60) {
        defaultHour += 1;
        defaultMinute = 0;
        if (defaultHour >= 24) {
          defaultHour -= 24;
        }
      }

      const defaultTime = `${defaultHour.toString().padStart(2, '0')}:${defaultMinute.toString().padStart(2, '0')}`;
      console.log('Calculated default time:', defaultTime);

      const availableSlots = generateTimeSlots();
      console.log('Available slots:', availableSlots.slice(0, 10)); // Log first 10 slots

      // Chercher le créneau exact ou le suivant
      let defaultSlot = availableSlots.find(slot => slot === defaultTime);
      if (!defaultSlot) {
        defaultSlot = availableSlots.find(slot => slot > defaultTime) || availableSlots[0] || '';
      }

      console.log('Selected default slot:', defaultSlot);

      setFormData(prev => ({
        ...prev,
        departureDate: dateString,
        departureHour: defaultSlot
      }));
    }
  }, [event]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: name === 'maxParticipants' ? parseInt(value) : value
      };

      // Réinitialiser le coût si on passe à Uber
      if (name === 'transportType' && value === 'UBER') {
        newData.cost = '';
      }

      // Limiter le coût à 5€ maximum
      if (name === 'cost' && parseFloat(value) > 5) {
        newData.cost = '5';
      }

      return newData;
    });
  };

  // Générer les créneaux horaires par tranches de 15 minutes selon les heures de l'événement
  const generateTimeSlots = () => {
    if (!event) return [];

    const eventStart = new Date(event.startDate);
    const eventEnd = new Date(event.endDate);

    const startHour = eventStart.getHours();
    const endHour = eventEnd.getHours();
    const endMinute = eventEnd.getMinutes();

    const slots = [];

    // Calcul de l'heure de fin réelle (1h après la fin de l'événement)
    let finalEndHour = endHour + 1;
    let finalEndMinute = endMinute;

    // Gérer le passage à minuit
    if (finalEndHour >= 24) {
      finalEndHour -= 24;
    }

    // Début : depuis le début de l'événement (arrondi au quart d'heure supérieur)
    let currentHour = startHour;
    let currentMinute = Math.ceil(eventStart.getMinutes() / 15) * 15;

    if (currentMinute >= 60) {
      currentHour += 1;
      currentMinute = 0;
    }
    if (currentHour >= 24) {
      currentHour -= 24;
    }

    // Générer les créneaux
    let loopCount = 0; // Sécurité pour éviter les boucles infinies
    while (loopCount < 200) { // Max 200 créneaux (50h)
      const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
      slots.push(timeString);

      // Vérifier si on a atteint la fin
      if (currentHour === finalEndHour && currentMinute >= finalEndMinute) {
        break;
      }

      // Passer au créneau suivant
      currentMinute += 15;
      if (currentMinute >= 60) {
        currentHour += 1;
        currentMinute = 0;
      }
      if (currentHour >= 24) {
        currentHour = 0;
      }

      loopCount++;
    }

    return slots;
  };

  // Calculer l'heure de départ par défaut (1h après le début de l'événement)
  const getDefaultDepartureHour = () => {
    if (!event) return '';

    const eventStart = new Date(event.startDate);
    let defaultHour = eventStart.getHours() + 1;

    if (defaultHour >= 24) {
      defaultHour -= 24;
    }

    // Arrondir aux 15 minutes
    const defaultTime = `${defaultHour.toString().padStart(2, '0')}:00`;
    const availableSlots = generateTimeSlots();

    // Trouver le créneau le plus proche
    return availableSlots.find(slot => slot >= defaultTime) || availableSlots[0] || '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.destination || !formData.departureDate || !formData.departureHour) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      // Combiner la date et l'heure
      const departureDateTime = `${formData.departureDate}T${formData.departureHour}:00`;

      const rideData = {
        eventId: id!,
        destination: formData.destination,
        description: formData.description || undefined,
        departureTime: departureDateTime,
        maxParticipants: formData.maxParticipants,
        cost: formData.cost ? parseFloat(formData.cost) : undefined,
        transportType: formData.transportType
      };

      await ridesApi.create(rideData);
      toast.success('Trajet créé avec succès !');
      navigate(`/events/${id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur lors de la création du trajet');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Événement introuvable</h2>
          <Link to="/dashboard" className="text-primary hover:text-primary/80">
            Retour aux événements
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link
          to={`/events/${id}`}
          className="inline-flex items-center text-primary hover:text-primary/80 mb-4"
        >
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7.707 14.707a1 1 0 01-1.414 0L2.586 11l3.707-3.707a1 1 0 011.414 1.414L5.414 11l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Retour à l'événement
        </Link>

        <h1 className="text-3xl font-bold text-foreground">Proposer un trajet</h1>
        <p className="mt-2 text-muted-foreground">
          Créez un nouveau trajet pour <strong>{event.name}</strong>
        </p>
      </div>

      <div className="bg-card shadow rounded-lg p-6 border border-border">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="destination" className="block text-sm font-medium text-foreground">
              Destination *
            </label>
            <input
              type="text"
              id="destination"
              name="destination"
              required
              className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm"
              placeholder="Adresse de départ ou point de rendez-vous"
              value={formData.destination}
              onChange={handleChange}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Indiquez votre point de départ ou le lieu de rendez-vous
            </p>
          </div>

          <div>
            <label htmlFor="transportType" className="block text-sm font-medium text-foreground">
              Type de transport *
            </label>
            <select
              id="transportType"
              name="transportType"
              required
              className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm"
              value={formData.transportType}
              onChange={handleChange}
            >
              <option value="DRIVE">🚗 Je conduis (voiture personnelle)</option>
              <option value="UBER">🚕 Je commande un Uber/VTC</option>
            </select>
          </div>

          {formData.transportType === 'DRIVE' && (
            <div>
              <label htmlFor="cost" className="block text-sm font-medium text-foreground">
                Coût par passager (optionnel)
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="number"
                  id="cost"
                  name="cost"
                  min="0"
                  max="5"
                  step="0.5"
                  className="block w-full px-3 py-2 pr-12 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="0.00"
                  value={formData.cost}
                  onChange={handleChange}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-muted-foreground sm:text-sm">€</span>
                </div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Laissez vide si le trajet est gratuit. Maximum 5€ par passager.
              </p>
            </div>
          )}

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-foreground">
              Description (optionnel)
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm"
              placeholder="Informations supplémentaires pour les passagers (lieu de rendez-vous précis, consignes, etc.)"
              value={formData.description}
              onChange={handleChange}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Ajoutez des détails utiles pour vos passagers (point de rencontre précis, consignes spéciales, etc.)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="departureDate" className="block text-sm font-medium text-foreground">
                Date de départ *
              </label>
              <input
                type="date"
                id="departureDate"
                name="departureDate"
                required
                className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm"
                value={formData.departureDate}
                onChange={handleChange}
                min={event ? new Date(event.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                max={event ? new Date(event.endDate).toISOString().split('T')[0] : undefined}
                lang="fr"
              />
              {event && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Dates disponibles : du {new Date(event.startDate).toLocaleDateString('fr-FR')} au {new Date(event.endDate).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="departureHour" className="block text-sm font-medium text-foreground">
                Heure de départ *
              </label>
              <select
                id="departureHour"
                name="departureHour"
                required
                className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm"
                value={formData.departureHour}
                onChange={handleChange}
              >
                <option value="">Sélectionnez une heure</option>
                {generateTimeSlots().map(time => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                Créneaux disponibles toutes les 15 minutes
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="maxParticipants" className="block text-sm font-medium text-foreground">
              Nombre maximum de passagers
            </label>
            <select
              id="maxParticipants"
              name="maxParticipants"
              className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm"
              value={formData.maxParticipants}
              onChange={handleChange}
            >
              {[2, 3, 4, 5, 6, 7, 8].map(num => (
                <option key={num} value={num}>
                  {num} passager{num > 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </div>


          <div className="bg-muted/30 p-4 rounded-md border border-border">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-foreground">
                  Informations importantes
                </h3>
                <div className="mt-2 text-sm text-muted-foreground">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Assurez-vous d'avoir une assurance automobile valide</li>
                    <li>Respectez le code de la route et les limitations de vitesse</li>
                    <li>Communiquez avec vos passagers en cas de changement</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Link
              to={`/events/${id}`}
              className="px-4 py-2 border border-border rounded-md shadow-sm text-sm font-medium text-muted-foreground bg-background hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Annuler
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Création...' : 'Créer le trajet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}