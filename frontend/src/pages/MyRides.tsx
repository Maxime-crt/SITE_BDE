import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Car, Calendar, MapPin, Users, Clock, Check, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { Button } from '../components/ui/button';
import ConfirmDialog from '../components/ConfirmDialog';

interface UberRide {
  id: string;
  eventId: string;
  userId: string;
  rideId: string; // ID du ride partagé
  status: 'PENDING' | 'MATCHED' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
  departureTime: string;
  femaleOnly: boolean;
  homeAddress: string;
  homeCity: string;
  homePostcode: string;
  homeLatitude: number;
  homeLongitude: number;
  groupId: string | null;
  createdAt: string;
  event?: {
    id: string;
    name: string;
    location: string;
    startDate: string;
    endDate: string;
  };
  group?: {
    id: string;
    estimatedCost: number;
    memberCount: number;
  };
}

export default function MyRides() {
  const [rides, setRides] = useState<UberRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [rideToCancel, setRideToCancel] = useState<string | null>(null);

  useEffect(() => {
    fetchRides();

    // Polling automatique toutes les 10 secondes pour actualiser les données
    const intervalId = setInterval(() => {
      fetchRides();
    }, 10000); // 10 secondes

    // Nettoyer l'intervalle quand le composant est démonté
    return () => clearInterval(intervalId);
  }, []);

  const fetchRides = async (showLoading = true) => {
    console.log('🔵 [FRONTEND] fetchRides appelé');
    try {
      if (showLoading) {
        setLoading(true);
      }
      console.log('🔵 [FRONTEND] Appel API GET /uber-rides/my-rides');
      const response = await api.get('/uber-rides/my-rides');
      console.log('🔵 [FRONTEND] Réponse reçue:', response.data);
      console.log('🔵 [FRONTEND] Nombre de trajets:', response.data?.length);
      if (response.data?.length > 0) {
        console.log('🔵 [FRONTEND] Premier trajet:', response.data[0]);
        console.log('🔵 [FRONTEND] Premier trajet - event:', response.data[0].event);
      }
      setRides(response.data);
    } catch (error: any) {
      console.error('🔴 [FRONTEND] Erreur récupération trajets:', error);
      if (showLoading) {
        toast.error('Erreur lors du chargement des trajets');
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const openCancelDialog = (requestId: string) => {
    setRideToCancel(requestId);
    setConfirmDialogOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!rideToCancel) return;

    try {
      await api.delete(`/uber-rides/request/${rideToCancel}`);
      toast.success('Demande annulée avec succès. Vous pouvez maintenant faire une nouvelle demande.');
      setConfirmDialogOpen(false);
      setRideToCancel(null);
      fetchRides();
    } catch (error: any) {
      console.error('Erreur annulation demande:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de l\'annulation');
      setConfirmDialogOpen(false);
      setRideToCancel(null);
    }
  };

  const handleCancelCancel = () => {
    setConfirmDialogOpen(false);
    setRideToCancel(null);
  };

  const getStatusBadge = (status: string, memberCount: number) => {
    const badges = {
      PENDING: { text: 'En attente de match', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
      MATCHED: { text: 'Match trouvé', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
      ACCEPTED: {
        text: memberCount === 1 ? 'Recherche en cours' : 'Groupe formé',
        color: memberCount === 1
          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        showSpinner: memberCount === 1
      },
      REJECTED: { text: 'Refusé', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
      CANCELLED: { text: 'Annulé', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' },
      COMPLETED: { text: 'Terminé', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' }
    };

    const badge = badges[status as keyof typeof badges] || badges.PENDING;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.showSpinner && (
          <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {badge.text}
      </span>
    );
  };

  const activeRides = rides.filter(r =>
    ['PENDING', 'MATCHED', 'ACCEPTED'].includes(r.status)
  );

  const pastRides = rides.filter(r =>
    ['REJECTED', 'CANCELLED', 'COMPLETED'].includes(r.status)
  );

  const displayRides = activeTab === 'active' ? activeRides : pastRides;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Car className="w-8 h-8" />
          Mes trajets Uber
        </h1>
        <p className="mt-2 text-muted-foreground">
          Gérez vos demandes de trajets partagés pour vos événements
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-6">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab('active')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
              activeTab === 'active'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
            }`}
          >
            Trajets actifs
            {activeRides.length > 0 && (
              <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                {activeRides.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
              activeTab === 'past'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
            }`}
          >
            Historique
          </button>
        </nav>
      </div>

      {/* Liste des trajets */}
      {displayRides.length === 0 ? (
        <div className="text-center py-12">
          <Car className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium text-foreground">
            {activeTab === 'active' ? 'Aucun trajet actif' : 'Aucun trajet passé'}
          </h3>
          <p className="mt-2 text-muted-foreground">
            {activeTab === 'active'
              ? 'Réservez un billet pour un événement et demandez un trajet partagé !'
              : 'Vos trajets terminés apparaîtront ici'}
          </p>
          {activeTab === 'active' && (
            <Link
              to="/"
              className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-foreground bg-primary hover:bg-primary/90"
            >
              Voir les événements
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {displayRides.map((ride) => (
            <div
              key={ride.id}
              className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* En-tête */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      {ride.event ? (
                        <Link
                          to={`/events/${ride.event.id}`}
                          className="text-lg font-semibold text-foreground hover:text-primary"
                        >
                          {ride.event.name}
                        </Link>
                      ) : (
                        <div className="text-lg font-semibold text-muted-foreground">
                          Événement non trouvé
                        </div>
                      )}
                    </div>
                    {getStatusBadge(ride.status, ride.group?.memberCount || 1)}
                  </div>

                  {/* Détails du trajet */}
                  <div className="space-y-3 mb-4">
                    {ride.event && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <span>
                          {new Date(ride.event.startDate).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 flex-shrink-0" />
                      <span>
                        Départ à {new Date(ride.departureTime).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                      <div>
                        <div className="font-medium text-foreground">Départ de la soirée</div>
                        <div className="text-muted-foreground">{ride.event?.location || 'Adresse non disponible'}</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-600 dark:text-green-400" />
                      <div>
                        <div className="font-medium text-foreground">Destination</div>
                        <div className="text-muted-foreground">{ride.homeAddress}</div>
                      </div>
                    </div>

                    {ride.femaleOnly && (
                      <div className="flex items-center gap-2 text-sm text-pink-600 dark:text-pink-400">
                        <Users className="w-4 h-4" />
                        <span>Groupe femmes uniquement</span>
                      </div>
                    )}
                  </div>

                  {/* Info groupe */}
                  {ride.group && (
                    <div className="bg-muted rounded-lg p-3 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <Users className="w-4 h-4" />
                          <span className="font-medium">
                            {ride.group.memberCount === 1
                              ? (ride.status === 'CANCELLED' || ride.status === 'COMPLETED'
                                ? 'Aucune personne trouvée pour partager le trajet'
                                : 'Vous êtes seul pour le moment')
                              : `${ride.group.memberCount} personnes dans le groupe`}
                          </span>
                        </div>
                        {ride.group.estimatedCost !== null && ride.group.estimatedCost !== undefined && (
                          <div className="text-sm font-semibold text-foreground">
                            ~{ride.group.estimatedCost.toFixed(2)}€ par personne
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {ride.status === 'PENDING' && (
                    <div className="flex gap-3">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openCancelDialog(ride.id)}
                      >
                        Annuler la demande
                      </Button>
                    </div>
                  )}

                  {ride.status === 'MATCHED' && (
                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            Un groupe a été trouvé !
                          </p>
                          <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                            Vous recevrez une notification quand le groupe sera confirmé.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {ride.status === 'ACCEPTED' && (
                    <>
                      {ride.group && ride.group.memberCount === 1 ? (
                        <>
                          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-3">
                            <div className="flex items-start gap-3">
                              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                  Demande enregistrée
                                </p>
                                <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                                  Nous recherchons des personnes avec des trajets similaires. Vous recevrez une notification dès qu'un groupe sera formé.
                                </p>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="w-full"
                            onClick={() => openCancelDialog(ride.id)}
                          >
                            Annuler la demande
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-3">
                            <div className="flex items-start gap-3">
                              <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                                  Groupe formé !
                                </p>
                                <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                                  Rendez-vous avec votre groupe à la fin de l'événement.
                                </p>
                              </div>
                            </div>
                          </div>
                          <Link to={`/ride/${ride.rideId}`}>
                            <Button
                              variant="default"
                              size="sm"
                              className="w-full"
                            >
                              Voir les détails du groupe
                            </Button>
                          </Link>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog de confirmation d'annulation */}
      <ConfirmDialog
        isOpen={confirmDialogOpen}
        title="Annuler la demande de trajet"
        message="Êtes-vous sûr de vouloir annuler cette demande de trajet ? Vous pourrez en refaire une nouvelle après l'annulation."
        confirmText="Oui, annuler"
        cancelText="Non, garder"
        type="danger"
        onConfirm={handleCancelConfirm}
        onCancel={handleCancelCancel}
      />
    </div>
  );
}
