import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { eventsApi, ridesApi } from '../services/api';
import type { User, Ride } from '../types';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { Edit, Trash2, MessageCircle } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import RideChat from '../components/RideChat';

interface EventDetailProps {
  user: User;
}

export default function EventDetail({ user }: EventDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingRide, setEditingRide] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [rideToDelete, setRideToDelete] = useState<string | null>(null);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [rideToLeave, setRideToLeave] = useState<{ id: string; destination: string; creatorName: string } | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatRideId, setChatRideId] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState(false);
  const [eventDeleteConfirmOpen, setEventDeleteConfirmOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    destination: '',
    description: '',
    departureDate: '',
    departureHour: '',
    maxParticipants: 4,
    cost: ''
  });

  const [eventEditForm, setEventEditForm] = useState({
    name: '',
    description: '',
    location: '',
    type: 'CB',
    customType: '',
    startDate: '',
    endDate: '',
    publishMode: 'current', // 'current' | 'now' | 'schedule' | 'draft'
    publishedAt: ''
  });

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

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsApi.getById(id!),
    enabled: !!id
  });

  const { data: rides, isLoading: ridesLoading } = useQuery({
    queryKey: ['rides', id],
    queryFn: () => ridesApi.getByEvent(id!),
    enabled: !!id
  });

  const handleJoinRide = async (rideId: string) => {
    try {
      await ridesApi.join(rideId);
      toast.success('Demande de participation envoyée !');
      // Reload rides data
      queryClient.invalidateQueries({ queryKey: ['rides', id] });
    } catch (error: any) {
      const errorData = error.response?.data;
      if (errorData?.code === 'EXISTING_RIDE_CREATED') {
        // L'utilisateur a déjà créé un trajet
        const participantText = errorData.hasParticipants
          ? `Attention : ${errorData.participantCount} personne(s) ont rejoint votre trajet. Elles seront notifiées de la suppression.`
          : 'Aucune personne n\'a encore rejoint votre trajet.';

        const shouldDelete = window.confirm(
          `Vous avez déjà créé un trajet pour cet événement.\n\n${participantText}\n\nVoulez-vous supprimer votre trajet pour pouvoir rejoindre celui-ci ?`
        );

        if (shouldDelete) {
          try {
            await ridesApi.delete(errorData.rideId);
            if (errorData.hasParticipants) {
              toast.success(`Votre trajet a été supprimé. ${errorData.participantCount} participant(s) ont été notifiés.`);
            } else {
              toast.success('Votre trajet a été supprimé.');
            }

            // Maintenant essayer de rejoindre le trajet
            await ridesApi.join(rideId);
            toast.success('Demande de participation envoyée !');

            // Reload rides data
            queryClient.invalidateQueries({ queryKey: ['rides', id] });
          } catch (deleteError: any) {
            toast.error(deleteError.response?.data?.error || 'Erreur lors de la suppression de votre trajet');
          }
        }
      } else {
        toast.error(errorData?.error || 'Erreur lors de la demande');
      }
    }
  };

  const handleManageParticipant = async (rideId: string, participantId: string, action: 'accept' | 'reject') => {
    try {
      const response = await ridesApi.manageParticipant(rideId, participantId, action);

      // Message de base
      toast.success(`Demande ${action === 'accept' ? 'acceptée' : 'refusée'} !`);

      // Si accepté et qu'il y a eu des demandes annulées, afficher une notification supplémentaire
      if (action === 'accept' && response.cancelledRequests && response.cancelledRequests.length > 0) {
        const count = response.cancelledRequests.length;
        const ridesText = response.cancelledRequests.map((req: any) =>
          `"${req.destination}" (${req.creatorName})`
        ).join(', ');

        setTimeout(() => {
          toast.info(
            `ℹ️ ${count} autre${count > 1 ? 's' : ''} demande${count > 1 ? 's' : ''} de ce participant ${count > 1 ? 'ont' : 'a'} été automatiquement annulée${count > 1 ? 's' : ''} : ${ridesText}`,
            { duration: 6000 }
          );
        }, 1000);
      }

      // Reload rides data pour l'événement actuel
      queryClient.invalidateQueries({ queryKey: ['rides', id] });
      // Si accepté, invalider aussi toutes les données d'événements pour rafraîchir les autres demandes annulées
      if (action === 'accept') {
        queryClient.invalidateQueries({ queryKey: ['rides'] });
        queryClient.invalidateQueries({ queryKey: ['my-rides'] });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur lors de la gestion de la demande');
    }
  };

  const handleLeaveRide = (rideId: string, destination: string, creatorName: string) => {
    setRideToLeave({ id: rideId, destination, creatorName });
    setLeaveConfirmOpen(true);
  };

  const confirmLeaveRide = async () => {
    if (!rideToLeave) return;

    try {
      await ridesApi.leave(rideToLeave.id);
      toast.success('Vous avez quitté le trajet avec succès');

      // Reload rides data
      queryClient.invalidateQueries({ queryKey: ['rides', id] });
      queryClient.invalidateQueries({ queryKey: ['my-rides'] });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur lors du retrait du trajet');
    } finally {
      setLeaveConfirmOpen(false);
      setRideToLeave(null);
    }
  };

  const handleEditRide = (ride: Ride) => {
    setEditingRide(ride.id);
    const rideDate = new Date(ride.departureTime);
    const dateString = rideDate.toISOString().split('T')[0];
    const timeString = `${rideDate.getHours().toString().padStart(2, '0')}:${rideDate.getMinutes().toString().padStart(2, '0')}`;

    setEditForm({
      destination: ride.destination,
      description: ride.description || '',
      departureDate: dateString,
      departureHour: timeString,
      maxParticipants: ride.maxParticipants,
      cost: ride.cost?.toString() || ''
    });
  };

  const handleUpdateRide = async (rideId: string) => {
    try {
      // Combiner la date et l'heure
      const departureDateTime = `${editForm.departureDate}T${editForm.departureHour}:00`;

      await ridesApi.update(rideId, {
        destination: editForm.destination,
        description: editForm.description || undefined,
        departureTime: departureDateTime,
        maxParticipants: editForm.maxParticipants,
        cost: editForm.cost ? parseFloat(editForm.cost) : undefined
      });
      toast.success('Trajet modifié avec succès !');
      setEditingRide(null);
      queryClient.invalidateQueries({ queryKey: ['rides', id] });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur lors de la modification');
    }
  };

  const handleDeleteRide = (rideId: string) => {
    setRideToDelete(rideId);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteRide = async () => {
    if (!rideToDelete) return;

    try {
      await ridesApi.delete(rideToDelete);
      toast.success('Trajet supprimé avec succès !');
      queryClient.invalidateQueries({ queryKey: ['rides', id] });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression');
    } finally {
      setDeleteConfirmOpen(false);
      setRideToDelete(null);
    }
  };

  const cancelDeleteRide = () => {
    setDeleteConfirmOpen(false);
    setRideToDelete(null);
  };

  const handleEditEvent = () => {
    if (!event) return;

    // Déterminer le mode de publication actuel
    let publishMode = 'current';
    if (!event.publishedAt) {
      publishMode = 'draft';
    } else if (new Date(event.publishedAt) > new Date()) {
      publishMode = 'schedule';
    }

    setEventEditForm({
      name: event.name,
      description: event.description || '',
      location: event.location,
      type: event.type,
      customType: event.customType || '',
      startDate: new Date(event.startDate).toISOString().slice(0, 16),
      endDate: new Date(event.endDate).toISOString().slice(0, 16),
      publishMode,
      publishedAt: event.publishedAt ? new Date(event.publishedAt).toISOString().slice(0, 16) : ''
    });
    setEditingEvent(true);
  };

  const handleUpdateEvent = async () => {
    if (!event) return;

    try {
      // Calculer la date de publication
      let publishedAt: string | null | undefined;
      if (eventEditForm.publishMode === 'now') {
        publishedAt = new Date().toISOString();
      } else if (eventEditForm.publishMode === 'schedule') {
        publishedAt = new Date(eventEditForm.publishedAt).toISOString();
      } else if (eventEditForm.publishMode === 'draft') {
        publishedAt = null; // Explicitement null pour supprimer la publication
      }
      // Si publishMode === 'current', on garde la valeur actuelle (pas de changement)

      const updateData: any = {
        name: eventEditForm.name,
        description: eventEditForm.description || undefined,
        location: eventEditForm.location,
        type: eventEditForm.type,
        customType: eventEditForm.type === 'Autre' ? eventEditForm.customType : undefined,
        startDate: new Date(eventEditForm.startDate).toISOString(),
        endDate: new Date(eventEditForm.endDate).toISOString()
      };

      if (eventEditForm.publishMode !== 'current') {
        updateData.publishedAt = publishedAt;
      }

      await eventsApi.update(event.id, updateData);

      toast.success('Événement modifié avec succès !');
      setEditingEvent(false);
      queryClient.invalidateQueries({ queryKey: ['event', id] });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur lors de la modification');
    }
  };

  const handleDeleteEvent = () => {
    setEventDeleteConfirmOpen(true);
  };

  const confirmDeleteEvent = async () => {
    if (!event) return;

    try {
      await eventsApi.delete(event.id);
      toast.success('Événement supprimé avec succès !');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression');
    } finally {
      setEventDeleteConfirmOpen(false);
    }
  };

  const cancelDeleteEvent = () => {
    setEventDeleteConfirmOpen(false);
  };

  const openChat = (rideId: string) => {
    setChatRideId(rideId);
    setChatOpen(true);
  };

  const closeChat = () => {
    setChatOpen(false);
    setChatRideId(null);
  };

  if (eventLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Événement introuvable</h2>
          <Link to="/dashboard" className="text-blue-600 hover:text-blue-500">
            Retour aux événements
          </Link>
        </div>
      </div>
    );
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'OPEN': return 'default';
      case 'FULL': return 'secondary';
      case 'IN_PROGRESS': return 'outline';
      case 'COMPLETED': return 'secondary';
      case 'CANCELLED': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'OPEN': return 'Ouvert';
      case 'FULL': return 'Complet';
      case 'IN_PROGRESS': return 'En cours';
      case 'COMPLETED': return 'Terminé';
      case 'CANCELLED': return 'Annulé';
      default: return status;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link
          to="/dashboard"
          className="inline-flex items-center text-blue-600 hover:text-blue-500 mb-6"
        >
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7.707 14.707a1 1 0 01-1.414 0L2.586 11l3.707-3.707a1 1 0 011.414 1.414L5.414 11l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Retour aux événements
        </Link>

        <div className="bg-card rounded-lg shadow-lg border border-border p-6">
          <div className="border-b border-gray-200 pb-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-foreground">{event.name}</h1>
                <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium border border-primary/20">
                  {event.type === 'Autre' ? event.customType || 'Autre' : event.type}
                </div>
              </div>

              {user.isAdmin && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    onClick={handleEditEvent}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-secondary text-sm"
                  >
                    <Edit className="w-4 h-4" />
                    <span className="hidden sm:inline">Modifier</span>
                  </button>
                  <button
                    onClick={handleDeleteEvent}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-destructive text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Supprimer</span>
                  </button>
                </div>
              )}
            </div>
            {event.description && !editingEvent && (
              <div className="mt-3 p-4 bg-muted/30 dark:bg-muted/50 rounded-lg border-l-4 border-primary dark:border-primary/80 border border-border/30 dark:border-border/50">
                <p className="text-muted-foreground dark:text-gray-200 leading-relaxed">{event.description}</p>
              </div>
            )}

            {editingEvent && (
              <div className="mt-4 p-4 bg-card rounded-lg border border-border shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Modifier l'événement</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Nom de l'événement
                    </label>
                    <input
                      type="text"
                      value={eventEditForm.name}
                      onChange={(e) => setEventEditForm({ ...eventEditForm, name: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={eventEditForm.description}
                      onChange={(e) => setEventEditForm({ ...eventEditForm, description: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Lieu
                    </label>
                    <input
                      type="text"
                      value={eventEditForm.location}
                      onChange={(e) => setEventEditForm({ ...eventEditForm, location: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Type d'événement
                    </label>
                    <select
                      value={eventEditForm.type}
                      onChange={(e) => setEventEditForm({ ...eventEditForm, type: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      <option value="CB">CB (Crazy Bar)</option>
                      <option value="Mini CB">Mini CB</option>
                      <option value="Afterwork">Afterwork</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>

                  {eventEditForm.type === 'Autre' && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Préciser le type
                      </label>
                      <input
                        type="text"
                        value={eventEditForm.customType}
                        onChange={(e) => setEventEditForm({ ...eventEditForm, customType: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        placeholder="Ex: Gala, Conférence, etc."
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Date de début
                      </label>
                      <input
                        type="datetime-local"
                        value={eventEditForm.startDate}
                        onChange={(e) => setEventEditForm({ ...eventEditForm, startDate: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        lang="fr"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Date de fin
                      </label>
                      <input
                        type="datetime-local"
                        value={eventEditForm.endDate}
                        onChange={(e) => setEventEditForm({ ...eventEditForm, endDate: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        lang="fr"
                      />
                    </div>
                  </div>

                  {/* Section Publication */}
                  <div className="space-y-4 border-t pt-6">
                    <h3 className="text-lg font-semibold">Publication</h3>

                    <div className="space-y-2">
                      <label className="text-sm font-medium leading-none text-foreground">
                        Statut de publication
                      </label>
                      <div className="space-y-3">
                        <label className="flex items-center space-x-3">
                          <input
                            type="radio"
                            name="publishMode"
                            value="current"
                            checked={eventEditForm.publishMode === 'current'}
                            onChange={(e) => setEventEditForm({ ...eventEditForm, publishMode: e.target.value })}
                            className="w-4 h-4 text-primary"
                          />
                          <span className="text-sm text-foreground">Garder le statut actuel</span>
                        </label>

                        <label className="flex items-center space-x-3">
                          <input
                            type="radio"
                            name="publishMode"
                            value="now"
                            checked={eventEditForm.publishMode === 'now'}
                            onChange={(e) => setEventEditForm({ ...eventEditForm, publishMode: e.target.value })}
                            className="w-4 h-4 text-primary"
                          />
                          <span className="text-sm text-foreground">Publier immédiatement</span>
                        </label>

                        <label className="flex items-center space-x-3">
                          <input
                            type="radio"
                            name="publishMode"
                            value="schedule"
                            checked={eventEditForm.publishMode === 'schedule'}
                            onChange={(e) => setEventEditForm({ ...eventEditForm, publishMode: e.target.value })}
                            className="w-4 h-4 text-primary"
                          />
                          <span className="text-sm text-foreground">Programmer la publication</span>
                        </label>

                        <label className="flex items-center space-x-3">
                          <input
                            type="radio"
                            name="publishMode"
                            value="draft"
                            checked={eventEditForm.publishMode === 'draft'}
                            onChange={(e) => setEventEditForm({ ...eventEditForm, publishMode: e.target.value })}
                            className="w-4 h-4 text-primary"
                          />
                          <span className="text-sm text-foreground">Sauvegarder comme brouillon</span>
                        </label>
                      </div>
                    </div>

                    {eventEditForm.publishMode === 'schedule' && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium leading-none text-foreground">
                          Date de publication *
                        </label>
                        <input
                          type="datetime-local"
                          value={eventEditForm.publishedAt}
                          onChange={(e) => setEventEditForm({ ...eventEditForm, publishedAt: e.target.value })}
                          required={eventEditForm.publishMode === 'schedule'}
                          className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                          min={new Date().toISOString().slice(0, 16)}
                          lang="fr"
                        />
                        <p className="text-xs text-muted-foreground">
                          L'événement sera visible par les utilisateurs à partir de cette date
                        </p>
                      </div>
                    )}

                    {eventEditForm.publishMode === 'draft' && (
                      <div className="p-3 bg-muted/30 border border-border rounded-md">
                        <p className="text-sm text-foreground">
                          <strong>Brouillon :</strong> L'événement ne sera pas visible par les utilisateurs.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleUpdateEvent}
                      className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      Sauvegarder
                    </button>
                    <button
                      onClick={() => setEditingEvent(false)}
                      className="flex-1 bg-muted text-muted-foreground px-4 py-2 rounded-md hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-muted"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center p-4 bg-card rounded-lg border border-border shadow-sm">
              <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full mr-3">
                <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Lieu</p>
                <p className="text-sm font-semibold text-foreground">{event.location}</p>
              </div>
            </div>

            <div className="flex items-center p-4 bg-card rounded-lg border border-border shadow-sm">
              <div className="flex items-center justify-center w-10 h-10 bg-green-500/10 rounded-full mr-3">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date et heure</p>
                <div className="text-sm font-semibold text-foreground">
                  <p>
                    Début : {new Date(event.startDate).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })} à {new Date(event.startDate).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <p className="text-muted-foreground mt-1">
                    Fin : {new Date(event.endDate).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })} à {new Date(event.endDate).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">Trajets disponibles</h2>
        <Link
          to={`/events/${id}/create-ride`}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          Proposer un trajet
        </Link>
      </div>

      {ridesLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : rides && rides.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <h3 className="text-lg font-medium text-foreground mb-2">
            Aucun trajet disponible
          </h3>
          <p className="text-muted-foreground mb-4">
            Soyez le premier à proposer un trajet pour cet événement !
          </p>
          <Link
            to={`/events/${id}/create-ride`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90"
          >
            Proposer un trajet
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rides?.map((ride: Ride) => {
            const isUber = ride.transportType === 'UBER';

            return (
              <div key={ride.id} className="bg-card border border-border rounded-lg p-4 hover:shadow-lg transition-all duration-200 shadow-sm">
                {/* En-tête avec destination et type de transport */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-foreground truncate">
                    {ride.destination}
                  </h3>
                  <div className={`flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                    isUber
                      ? 'bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:text-yellow-400 dark:border-yellow-400/30'
                      : 'bg-primary/10 text-primary border-primary/20'
                  }`}>
                    {isUber ? '🚕' : '🚗'}
                    <span className="ml-1">{isUber ? 'Uber' : 'Conduit'}</span>
                  </div>
                </div>

                {/* Informations essentielles */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Organisateur :</span>
                    <span className="font-medium">{ride.creator.firstName} {ride.creator.lastName}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Départ :</span>
                    <span className="font-medium">
                      {new Date(ride.departureTime).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  {/* Masquer le compteur de places si la liste des participants va s'afficher */}
                  {!((ride.creator.id === user.id || ride.participants.some((p: any) => p.userId === user.id && p.status === 'CONFIRMED')) && ride.participants.filter((p: any) => p.status === 'CONFIRMED').length > 0) && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Places :</span>
                      <span className="font-medium">{ride.participants.filter((p: any) => p.status === 'CONFIRMED').length + 1}/{ride.maxParticipants + 1}</span>
                    </div>
                  )}

                  {ride.cost && ride.transportType === 'DRIVE' && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Coût :</span>
                      <span className="font-medium">{ride.cost}€/pers</span>
                    </div>
                  )}
                </div>

                {/* Description si présente */}
                {ride.description && (
                  <div className="mt-3 p-2 bg-muted/20 rounded text-xs text-muted-foreground">
                    {ride.description}
                  </div>
                )}

                {/* Actions selon l'utilisateur */}
                <div className="mt-4 pt-3 border-t border-border">
                  {ride.creator.id !== user.id && (ride.status === 'OPEN' || ride.status === 'FULL') && (() => {
                    const userParticipation = ride.participants.find((p: any) => p.userId === user.id);

                    // Vérifier si l'utilisateur a déjà une participation confirmée pour cet événement
                    const hasConfirmedRideForEvent = rides?.some((r: any) =>
                      r.participants.some((p: any) => p.userId === user.id && p.status === 'CONFIRMED')
                    );

                    if (hasConfirmedRideForEvent && !userParticipation) {
                      // L'utilisateur participe déjà à un autre trajet pour cet événement
                      return (
                        <div className="space-y-2">
                          <button
                            disabled
                            className="w-full bg-gray-400 text-white px-4 py-2 rounded-md cursor-not-allowed text-sm font-medium opacity-90"
                          >
                            🚫 Déjà inscrit à un trajet
                          </button>
                          <p className="text-xs text-gray-600 text-center">
                            Vous participez déjà à un trajet pour cet événement
                          </p>
                        </div>
                      );
                    }

                    if (!userParticipation) {
                      // Utilisateur n'a pas encore fait de demande pour ce trajet spécifique
                      if (ride.status === 'OPEN') {
                        return (
                          <button
                            onClick={() => handleJoinRide(ride.id)}
                            className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary text-sm font-medium"
                          >
                            Demander à rejoindre
                          </button>
                        );
                      } else {
                        // Trajet complet, mais l'utilisateur ne participe pas
                        return (
                          <div className="space-y-2">
                            <button
                              disabled
                              className="w-full bg-gray-400 text-white px-4 py-2 rounded-md cursor-not-allowed text-sm font-medium"
                            >
                              🚫 Trajet complet
                            </button>
                            <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                              Ce trajet a atteint sa capacité maximum
                            </p>
                          </div>
                        );
                      }
                    } else if (userParticipation.status === 'PENDING') {
                      // Demande en attente
                      return (
                        <div className="space-y-2">
                          <button
                            disabled
                            className="w-full bg-orange-500 text-white px-4 py-2 rounded-md cursor-not-allowed text-sm font-medium opacity-90 dark:bg-orange-500/90"
                          >
                            ⏳ Demande en cours d'étude
                          </button>
                          <p className="text-xs text-orange-600 dark:text-orange-400 text-center">
                            Votre demande a été envoyée à l'organisateur
                          </p>
                        </div>
                      );
                    } else if (userParticipation.status === 'CONFIRMED') {
                      // Demande acceptée
                      return (
                        <div className="space-y-2">

                          {/* Liste des participants confirmés */}
                          {ride.participants.filter((p: any) => p.status === 'CONFIRMED').length > 0 && (
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 rounded-md p-3">
                              <h4 className="text-sm font-medium text-green-800 dark:text-green-400 mb-2">
                                👥 Participants ({ride.participants.filter((p: any) => p.status === 'CONFIRMED').length + 1}/{ride.maxParticipants + 1})
                              </h4>
                              <div className="space-y-1">
                                <div className="text-sm text-green-700 dark:text-green-300 font-medium">
                                  🚗 {ride.creator.firstName} {ride.creator.lastName} (organisateur)
                                  {ride.creator.phone && (
                                    <span className="text-xs text-green-600 dark:text-green-400 ml-2">
                                      📱 {ride.creator.phone}
                                    </span>
                                  )}
                                </div>
                                {ride.participants
                                  .filter((p: any) => p.status === 'CONFIRMED')
                                  .map((participant: any) => (
                                    <div key={participant.id} className="text-sm text-green-700 dark:text-green-300">
                                      👤 {participant.user.firstName} {participant.user.lastName}
                                      {participant.user.id === user.id && " (vous)"}
                                      {participant.user.phone && (
                                        <span className="text-xs text-green-600 dark:text-green-400 ml-2">
                                          📱 {participant.user.phone}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                              </div>
                              <button
                                onClick={() => openChat(ride.id)}
                                className="mt-2 w-full bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                              >
                                <MessageCircle className="w-4 h-4" />
                                💬 Chat
                              </button>
                            </div>
                          )}

                          <button
                            onClick={() => handleLeaveRide(
                              ride.id,
                              ride.destination,
                              `${ride.creator.firstName} ${ride.creator.lastName}`
                            )}
                            className="w-full bg-orange-500 dark:bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-600 dark:hover:bg-orange-700 text-sm font-medium transition-colors"
                          >
                            🚪 Se retirer du trajet
                          </button>
                          <p className="text-xs text-muted-foreground text-center">
                            Vous pouvez vous retirer si nécessaire
                          </p>
                        </div>
                      );
                    }

                    return null;
                  })()}

                  {ride.creator.id === user.id && (
                    <div className="space-y-3">
                      {/* Demandes en attente */}
                      {ride.participants.filter((p: any) => p.status === 'PENDING').length > 0 && (
                        <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-400/30 rounded-md p-3">
                          <h4 className="text-sm font-medium text-orange-800 dark:text-orange-400 mb-2">
                            Demandes en attente ({ride.participants.filter((p: any) => p.status === 'PENDING').length})
                          </h4>
                          <div className="space-y-2">
                            {ride.participants.filter((p: any) => p.status === 'PENDING').map((participant: any) => (
                              <div key={participant.id} className="flex items-center justify-between bg-card p-2 rounded border border-border">
                                <span className="text-sm font-medium text-foreground">
                                  {participant.user.firstName} {participant.user.lastName}
                                </span>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleManageParticipant(ride.id, participant.id, 'accept')}
                                    className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                                  >
                                    ✓
                                  </button>
                                  <button
                                    onClick={() => handleManageParticipant(ride.id, participant.id, 'reject')}
                                    className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                                  >
                                    ✗
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Liste des participants confirmés pour l'organisateur */}
                      {ride.participants.filter((p: any) => p.status === 'CONFIRMED').length > 0 && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 rounded-md p-3">
                          <h4 className="text-sm font-medium text-green-800 dark:text-green-400 mb-2">
                            👥 Participants confirmés ({ride.participants.filter((p: any) => p.status === 'CONFIRMED').length + 1}/{ride.maxParticipants + 1})
                          </h4>
                          <div className="space-y-1">
                            <div className="text-sm text-green-700 dark:text-green-300 font-medium">
                              🚗 Vous (organisateur)
                            </div>
                            {ride.participants
                              .filter((p: any) => p.status === 'CONFIRMED')
                              .map((participant: any) => (
                                <div key={participant.id} className="text-sm text-green-700 dark:text-green-300">
                                  👤 {participant.user.firstName} {participant.user.lastName}
                                  {participant.user.phone && (
                                    <span className="text-xs text-green-600 dark:text-green-400 ml-2">
                                      📱 {participant.user.phone}
                                    </span>
                                  )}
                                </div>
                              ))}
                          </div>
                          <button
                            onClick={() => openChat(ride.id)}
                            className="mt-2 w-full bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                          >
                            <MessageCircle className="w-4 h-4" />
                            💬 Chat
                          </button>
                        </div>
                      )}

                      {/* Boutons de gestion du trajet */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={() => handleEditRide(ride)}
                          className="flex-1 bg-secondary text-secondary-foreground px-3 py-2 rounded-md hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-secondary text-sm flex items-center justify-center gap-2"
                        >
                          <Edit className="w-4 h-4" />
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDeleteRide(ride.id)}
                          className="flex-1 bg-destructive text-destructive-foreground px-3 py-2 rounded-md hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-destructive text-sm flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Supprimer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal d'édition de trajet */}
      {editingRide && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-lg max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Modifier le trajet</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Destination
                </label>
                <input
                  type="text"
                  value={editForm.destination}
                  onChange={(e) => setEditForm({ ...editForm, destination: e.target.value })}
                  className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                  placeholder="Informations supplémentaires..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Date de départ
                  </label>
                  <input
                    type="date"
                    value={editForm.departureDate}
                    onChange={(e) => setEditForm({ ...editForm, departureDate: e.target.value })}
                    className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    lang="fr"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Heure (15min)
                  </label>
                  <select
                    value={editForm.departureHour}
                    onChange={(e) => setEditForm({ ...editForm, departureHour: e.target.value })}
                    className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Choisir</option>
                    {generateTimeSlots().map(time => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Nombre max de passagers
                </label>
                <select
                  value={editForm.maxParticipants}
                  onChange={(e) => setEditForm({ ...editForm, maxParticipants: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {[2, 3, 4, 5, 6, 7, 8].map(num => (
                    <option key={num} value={num}>{num} passager{num > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
              {rides?.find(r => r.id === editingRide)?.transportType === 'DRIVE' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Coût par passager (€)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.5"
                    value={editForm.cost}
                    onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })}
                    className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                    placeholder="Gratuit si vide (max 5€)"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Maximum 5€ par passager</p>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => handleUpdateRide(editingRide)}
                  className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  Sauvegarder
                </button>
                <button
                  onClick={() => setEditingRide(null)}
                  className="flex-1 bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-secondary"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popup de confirmation de suppression de trajet */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Supprimer le trajet"
        message="Êtes-vous sûr de vouloir supprimer ce trajet ? Cette action est irréversible et tous les participants seront automatiquement désinscrits."
        confirmText="Supprimer"
        cancelText="Annuler"
        onConfirm={confirmDeleteRide}
        onCancel={cancelDeleteRide}
        type="danger"
      />

      {/* Popup de confirmation de suppression d'événement */}
      <ConfirmDialog
        isOpen={eventDeleteConfirmOpen}
        title="Supprimer l'événement"
        message="Êtes-vous sûr de vouloir supprimer cet événement ? Tous les trajets associés seront également supprimés. Cette action est irréversible."
        confirmText="Supprimer l'événement"
        cancelText="Annuler"
        onConfirm={confirmDeleteEvent}
        onCancel={cancelDeleteEvent}
        type="danger"
      />

      <ConfirmDialog
        isOpen={leaveConfirmOpen}
        title="Se retirer du trajet"
        message={rideToLeave ? `Êtes-vous sûr de vouloir vous retirer du trajet vers "${rideToLeave.destination}" organisé par ${rideToLeave.creatorName} ?\n\nCette action est irréversible et vous devrez faire une nouvelle demande si vous changez d'avis.` : ''}
        confirmText="Se retirer"
        cancelText="Annuler"
        onConfirm={confirmLeaveRide}
        onCancel={() => {
          setLeaveConfirmOpen(false);
          setRideToLeave(null);
        }}
        type="warning"
      />

      {/* Composant RideChat */}
      {chatOpen && chatRideId && (
        <RideChat
          rideId={chatRideId}
          user={user}
          isOpen={chatOpen}
          onClose={closeChat}
        />
      )}
    </div>
  );
}