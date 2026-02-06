import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { eventsApi, eventRatingsApi } from '../services/api';
import type { User, Event, EventRating } from '../types';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { handleApiErrorWithLog } from '../utils/errorHandler';
import { Calendar, MapPin, Star, ArrowLeft, Edit, Trash2, ExternalLink, Car, Users } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import ConfirmDialog from '../components/ConfirmDialog';
import UberRequestModal from '../components/UberRequestModal';
import api from '../services/api';

interface EventDetailProps {
  user: User | null;
}

export default function EventDetail({ user }: EventDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [uberModalOpen, setUberModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<User | null>(null);

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsApi.getById(id!),
    enabled: !!id
  });

  const { data: ratings } = useQuery({
    queryKey: ['event-ratings', id],
    queryFn: () => eventRatingsApi.getByEvent(id!),
    enabled: !!id
  });

  // Récupérer le profil complet de l'utilisateur (pour Uber Sharing)
  useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const response = await api.get('/users/me/profile');
      setUserProfile(response.data);
      return response.data;
    },
    enabled: !!user
  });

  // Vérifier si l'utilisateur a déjà une demande de trajet pour cet événement
  const { data: existingRideRequest } = useQuery({
    queryKey: ['existing-ride-request', id],
    queryFn: async () => {
      try {
        const response = await api.get('/uber-rides/my-rides');
        // Filtrer pour trouver une demande active pour cet événement
        const activeRequest = response.data.find((ride: any) =>
          ride.eventId === id &&
          ['PENDING', 'MATCHED', 'ACCEPTED'].includes(ride.status)
        );
        return activeRequest || null;
      } catch (error: any) {
        console.error('Erreur vérification demande trajet:', error);
        return null;
      }
    },
    enabled: !!id && !!user
  });

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

  const getGoogleMapsUrl = (location: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  };

  // Permettre à tous les utilisateurs de noter après la fin de l'événement
  const canRate = () => {
    if (!event || !user) return false;
    return new Date() > new Date(event.endDate);
  };

  // Vérifier si l'événement est en cours ou à venir (pour afficher la section Uber)
  const canRequestRide = () => {
    if (!event || !user) return false;
    // L'événement ne doit pas être terminé depuis plus d'1h
    const oneHourAfterEnd = new Date(event.endDate);
    oneHourAfterEnd.setHours(oneHourAfterEnd.getHours() + 1);
    return new Date() < oneHourAfterEnd;
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

  const isEventFinished = new Date() > new Date(event.endDate);

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
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Capacité</p>
                      <p className="font-medium">{event.capacity} places</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section Covoiturage */}
              {canRequestRide() && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Covoiturage retour</h3>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    {existingRideRequest ? (
                      <>
                        <p className="text-blue-800 dark:text-blue-300 font-medium mb-3 flex items-center gap-2">
                          <Car className="w-4 h-4" />
                          Demande de trajet partagé en cours
                        </p>
                        <Button
                          onClick={() => navigate('/my-rides')}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                          Voir mes trajets
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex items-start gap-3 mb-3">
                          <Car className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                          <div>
                            <p className="text-blue-900 dark:text-blue-300 font-medium">
                              Rentrer en Uber partagé
                            </p>
                            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                              Partagez votre trajet retour avec d'autres participants et divisez le prix
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() => setUberModalOpen(true)}
                          className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
                        >
                          <Car className="w-4 h-4" />
                          Rechercher un trajet partagé
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Message événement terminé */}
              {isEventFinished && !canRequestRide() && (
                <div className="border-t pt-6">
                  <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg p-4 text-center">
                    <p className="text-gray-800 dark:text-gray-300 font-medium">
                      Cet événement est terminé
                    </p>
                  </div>
                </div>
              )}

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
        message="Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible."
        confirmText="Supprimer"
        type="danger"
      />

      {/* Modal Uber Sharing */}
      {event && (
        <UberRequestModal
          isOpen={uberModalOpen}
          onClose={() => {
            setUberModalOpen(false);
            // Invalider le cache pour recharger les données de demande de trajet
            queryClient.invalidateQueries({ queryKey: ['existing-ride-request', id] });
          }}
          event={event}
          userHomeAddress={userProfile?.homeAddress}
          userHomeCity={userProfile?.homeCity}
          userHomePostcode={userProfile?.homePostcode}
          userHomeLatitude={userProfile?.homeLatitude}
          userHomeLongitude={userProfile?.homeLongitude}
          userGender={userProfile?.gender}
        />
      )}
    </div>
  );
}
