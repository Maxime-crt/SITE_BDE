import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi, ridesApi } from '../services/api';
import type { User } from '../types';
import toast from 'react-hot-toast';
import { Calendar, MapPin, Clock, Users, CheckCircle, XCircle } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';

interface ProfileProps {
  user: User;
}

export default function Profile({ user }: ProfileProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'rides' | 'ratings'>('info');
  const queryClient = useQueryClient();
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [rideToLeave, setRideToLeave] = useState<{ id: string; destination: string; creatorName: string } | null>(null);

  const { data: myRides, isLoading: ridesLoading } = useQuery({
    queryKey: ['my-rides'],
    queryFn: ridesApi.getMyRides,
    enabled: activeTab === 'rides'
  });

  const handleParticipantAction = async (rideId: string, participantId: string, action: 'accept' | 'reject') => {
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

      queryClient.invalidateQueries({ queryKey: ['my-rides'] });
      // Si accepté, invalider aussi toutes les données d'événements pour rafraîchir les autres demandes annulées
      if (action === 'accept') {
        queryClient.invalidateQueries({ queryKey: ['rides'] });
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
      queryClient.invalidateQueries({ queryKey: ['my-rides'] });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur lors du retrait du trajet');
    } finally {
      setLeaveConfirmOpen(false);
      setRideToLeave(null);
    }
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
              onClick={() => setActiveTab('rides')}
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'rides'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}
            >
              Mes trajets
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
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex items-center space-x-4">
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      {user.rating ? user.rating.toFixed(1) : '--'}
                    </div>
                    <div className="text-sm text-muted-foreground">Note moyenne</div>
                  </div>
                  {user.rating ? (
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`w-5 h-5 ${
                            star <= Math.round(user.rating!)
                              ? 'text-yellow-400'
                              : 'text-muted-foreground/30'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">
                      Aucune évaluation reçue
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    ({user.ratingCount} évaluation{user.ratingCount !== 1 ? 's' : ''})
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rides' && (
            <div className="space-y-6">
              {ridesLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Chargement...</p>
                </div>
              ) : myRides && (myRides.created.length > 0 || myRides.participating.length > 0) ? (
                <>
                  {/* Trajets créés */}
                  {myRides.created.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-foreground mb-4">Mes trajets créés</h3>
                      <div className="space-y-4">
                        {myRides.created.map((ride: any) => (
                          <div key={ride.id} className="bg-muted/30 rounded-lg p-4 border border-border">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium text-foreground">{ride.destination}</h4>
                              <span className="text-sm text-muted-foreground">{ride.event.name}</span>
                            </div>

                            <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                {new Date(ride.departureTime).toLocaleDateString('fr-FR')}
                              </div>
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                {new Date(ride.departureTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <div className="flex items-center">
                                <Users className="w-4 h-4 mr-1" />
                                {ride.participants.filter((p: any) => p.status === 'CONFIRMED').length + 1}/{ride.maxParticipants + 1}
                              </div>
                            </div>

                            {/* Demandes en attente */}
                            {ride.participants.some((p: any) => p.status === 'PENDING') && (
                              <div className="mt-3 border-t border-border pt-3">
                                <h5 className="text-sm font-medium text-foreground mb-2">Demandes en attente :</h5>
                                <div className="space-y-2">
                                  {ride.participants
                                    .filter((p: any) => p.status === 'PENDING')
                                    .map((participant: any) => (
                                      <div key={participant.id} className="flex items-center justify-between bg-background rounded p-2 border border-border">
                                        <span className="text-sm text-foreground">
                                          {participant.user.firstName} {participant.user.lastName}
                                        </span>
                                        <div className="flex space-x-2">
                                          <button
                                            onClick={() => handleParticipantAction(ride.id, participant.id, 'accept')}
                                            className="flex items-center px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs hover:bg-green-200 dark:hover:bg-green-900/50"
                                          >
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                            Accepter
                                          </button>
                                          <button
                                            onClick={() => handleParticipantAction(ride.id, participant.id, 'reject')}
                                            className="flex items-center px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-xs hover:bg-red-200 dark:hover:bg-red-900/50"
                                          >
                                            <XCircle className="w-3 h-3 mr-1" />
                                            Refuser
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}

                            {/* Participants confirmés */}
                            {ride.participants.some((p: any) => p.status === 'CONFIRMED') && (
                              <div className="mt-3 border-t border-border pt-3">
                                <h5 className="text-sm font-medium text-foreground mb-2">Participants confirmés :</h5>
                                <div className="space-y-1">
                                  {ride.participants
                                    .filter((p: any) => p.status === 'CONFIRMED')
                                    .map((participant: any) => (
                                      <div key={participant.id} className="text-sm text-muted-foreground">
                                        {participant.user.firstName} {participant.user.lastName}
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trajets où je participe */}
                  {myRides.participating.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-foreground mb-4">Trajets auxquels je participe</h3>
                      <div className="space-y-4">
                        {myRides.participating.map((participation: any) => (
                          <div key={participation.id} className="bg-muted/30 rounded-lg p-4 border border-border">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium text-foreground">{participation.ride.destination}</h4>
                              <span className={`text-xs px-2 py-1 rounded ${
                                participation.status === 'CONFIRMED'
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                                  : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                              }`}>
                                {participation.status === 'CONFIRMED' ? 'Confirmé' : 'En attente'}
                              </span>
                            </div>

                            <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                {new Date(participation.ride.departureTime).toLocaleDateString('fr-FR')}
                              </div>
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                {new Date(participation.ride.departureTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>

                            <p className="text-sm text-muted-foreground">
                              Organisé par {participation.ride.creator.firstName} {participation.ride.creator.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Pour l'événement : {participation.ride.event.name}
                            </p>

                            {/* Bouton de retrait pour les participations confirmées */}
                            {participation.status === 'CONFIRMED' && (
                              <div className="mt-3 pt-3 border-t border-border">
                                <button
                                  onClick={() => handleLeaveRide(
                                    participation.ride.id,
                                    participation.ride.destination,
                                    `${participation.ride.creator.firstName} ${participation.ride.creator.lastName}`
                                  )}
                                  className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
                                >
                                  Se retirer du trajet
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-medium text-foreground">Aucun trajet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Vos trajets créés et rejoints apparaîtront ici.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'ratings' && (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-foreground">Aucune évaluation</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Les évaluations que vous avez reçues apparaîtront ici.
              </p>
            </div>
          )}
        </div>
      </div>

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
    </div>
  );
}