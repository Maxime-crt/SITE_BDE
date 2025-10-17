import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { eventsApi, ticketsApi, eventRatingsApi } from '../services/api';
import type { User, Event, EventRating } from '../types';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { handleApiErrorWithLog } from '../utils/errorHandler';
import { Calendar, MapPin, Users, Euro, Star, ArrowLeft, Edit, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import ConfirmDialog from '../components/ConfirmDialog';

interface EventDetailProps {
  user: User | null;
}

export default function EventDetail({ user }: EventDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsApi.getById(id!),
    enabled: !!id
  });

  const { data: availability } = useQuery({
    queryKey: ['event-availability', id],
    queryFn: () => eventsApi.getTicketsAvailable(id!),
    enabled: !!id,
    refetchInterval: 10000 // Rafraîchir toutes les 10 secondes
  });

  const { data: myTicket } = useQuery({
    queryKey: ['my-ticket', id],
    queryFn: async () => {
      const tickets = await ticketsApi.getMyTickets();
      return tickets.find((t: any) => t.eventId === id && ['VALID', 'USED'].includes(t.status)) || null;
    },
    enabled: !!id && !!user
  });

  const { data: ratings } = useQuery({
    queryKey: ['event-ratings', id],
    queryFn: () => eventRatingsApi.getByEvent(id!),
    enabled: !!id
  });

  const handlePurchaseTicket = async () => {
    if (!event) return;

    setPurchasing(true);
    try {
      const result = await ticketsApi.createPaymentIntent(event.id);

      if (result.isFree) {
        toast.success('Billet gratuit obtenu !');
        queryClient.invalidateQueries({ queryKey: ['my-ticket', id] });
        queryClient.invalidateQueries({ queryKey: ['event-availability', id] });
        navigate('/my-tickets');
      } else if (result.clientSecret) {
        // Vérifier si Stripe est configuré
        const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
        if (!stripeKey || stripeKey === 'pk_test_placeholder_add_your_stripe_public_key_here') {
          toast.error('Les paiements ne sont pas encore configurés. Veuillez contacter l\'administrateur.');
          setPurchasing(false);
          return;
        }

        // Rediriger vers la page de paiement Stripe
        navigate(`/purchase-ticket/${event.id}`, {
          state: { clientSecret: result.clientSecret, event }
        });
      }
    } catch (error: any) {
      handleApiErrorWithLog(error, 'Erreur lors de l\'achat du billet', 'EventDetail.handlePurchaseTicket');
    } finally {
      setPurchasing(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!event) return;

    try {
      await eventsApi.delete(event.id);
      toast.success('Événement supprimé avec succès');
      navigate('/');
    } catch (error: any) {
      handleApiErrorWithLog(error, 'Erreur lors de la suppression', 'EventDetail.handleDeleteEvent');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price: number) => {
    return price === 0 ? 'Gratuit' : `${price.toFixed(2)} €`;
  };

  const getGoogleMapsUrl = (location: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  };

  const canRate = () => {
    if (!event || !myTicket) return false;
    // L'événement doit être terminé
    return new Date() > new Date(event.endDate);
  };

  if (eventLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement de l'événement...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Événement introuvable</h2>
          <Link to="/" className="text-primary hover:underline">
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    );
  }

  const isEventStarted = new Date() > new Date(event.startDate);
  const isEventFinished = new Date() > new Date(event.endDate);
  const isSoldOut = availability && availability.available <= 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              to="/"
              className="inline-flex items-center text-blue-600 hover:text-blue-500 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux événements
            </Link>

            {/* Actions Admin */}
            {user?.isAdmin && (
              <div className="flex gap-2 mb-4">
                <Button
                  onClick={() => navigate(`/events/${event.id}/edit`)}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Modifier
                </Button>
                <Button
                  onClick={() => setDeleteConfirmOpen(true)}
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </Button>
              </div>
            )}
          </div>

          {/* Événement */}
          <Card className="shadow-2xl mb-8">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium mb-3">
                    {event.type === 'Autre' ? event.customType : event.type}
                  </div>
                  <CardTitle className="text-3xl mb-4">{event.name}</CardTitle>
                  {event.description && (
                    <CardDescription className="text-base">
                      {event.description}
                    </CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Informations principales */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Début</p>
                      <p className="font-medium">{formatDate(event.startDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Fin</p>
                      <p className="font-medium">{formatDate(event.endDate)}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Lieu</p>
                      <p className="font-medium mb-1">{event.location}</p>
                      <a
                        href={getGoogleMapsUrl(event.location)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Voir sur Google Maps
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Billetterie */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Billetterie</h3>
                <div className={`grid ${
                  availability && (availability.available <= 10 || (availability.available / event.capacity) <= 0.7)
                    ? 'md:grid-cols-3'
                    : 'md:grid-cols-2'
                } gap-4 mb-6`}>
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                    <Euro className="w-8 h-8 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Prix</p>
                      <p className="text-xl font-bold">{formatPrice(event.ticketPrice)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                    <Users className="w-8 h-8 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Capacité</p>
                      <p className="text-xl font-bold">{event.capacity}</p>
                    </div>
                  </div>
                  {/* Afficher les places restantes seulement si <= 70% ou <= 10 places */}
                  {availability && (availability.available <= 10 || (availability.available / event.capacity) <= 0.7) && (
                    <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                      <Users className="w-8 h-8 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Places restantes</p>
                        <p className={`text-xl font-bold ${
                          availability.available <= 10 ? 'text-red-600' : 'text-orange-600'
                        }`}>
                          {availability.available}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bouton d'achat */}
                {myTicket ? (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <p className="text-green-800 dark:text-green-300 font-medium mb-2">
                      ✓ Vous avez déjà un billet pour cet événement
                    </p>
                    <Button
                      onClick={() => navigate('/my-tickets')}
                      className="w-full"
                    >
                      Voir mon billet
                    </Button>
                  </div>
                ) : isSoldOut ? (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
                    <p className="text-red-800 dark:text-red-300 font-medium">
                      Complet - Plus de places disponibles
                    </p>
                  </div>
                ) : isEventFinished ? (
                  <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg p-4 text-center">
                    <p className="text-gray-800 dark:text-gray-300 font-medium">
                      Cet événement est terminé
                    </p>
                  </div>
                ) : (
                  <Button
                    onClick={handlePurchaseTicket}
                    disabled={purchasing}
                    className="w-full h-12 text-lg"
                  >
                    {purchasing ? 'Chargement...' : `Obtenir un billet ${event.ticketPrice > 0 ? `- ${formatPrice(event.ticketPrice)}` : ''}`}
                  </Button>
                )}
              </div>

              {/* Notation */}
              {canRate() && (
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Votre avis compte !</h3>
                    <Button
                      onClick={() => navigate(`/events/${event.id}/rate`)}
                      variant="outline"
                      className="gap-2"
                    >
                      <Star className="w-4 h-4" />
                      Noter cet événement
                    </Button>
                  </div>
                </div>
              )}

              {/* Affichage des notes */}
              {event.ratingCount > 0 && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Notes et avis ({event.ratingCount})
                  </h3>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-5 h-5 ${
                            star <= (event.rating || 0)
                              ? 'text-yellow-500 fill-yellow-500'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-lg font-semibold">
                      {event.rating?.toFixed(1)} / 5
                    </span>
                  </div>
                  {ratings && ratings.length > 0 && (
                    <div className="space-y-3">
                      {ratings.map((rating: EventRating) => (
                        <div key={rating.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {rating.user?.firstName} {rating.user?.lastName}
                              </span>
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-4 h-4 ${
                                      star <= rating.rating
                                        ? 'text-yellow-500 fill-yellow-500'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {new Date(rating.createdAt).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                          {rating.comment && (
                            <p className="text-sm text-muted-foreground">{rating.comment}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog de confirmation de suppression */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onConfirm={handleDeleteEvent}
        onCancel={() => setDeleteConfirmOpen(false)}
        title="Supprimer l'événement"
        message="Êtes-vous sûr de vouloir supprimer cet événement ? Tous les billets associés seront également supprimés. Cette action est irréversible."
        confirmText="Supprimer"
        type="danger"
      />
    </div>
  );
}
