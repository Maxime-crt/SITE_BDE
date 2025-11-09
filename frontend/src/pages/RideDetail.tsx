import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Car, Calendar, MapPin, Users, Clock, Phone, ArrowLeft, Euro } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { Button } from '../components/ui/button';
import RideMap from '../components/RideMap';

interface RideMember {
  id: string;
  userId: string;
  status: string;
  destinationAddress: string;
  destinationCity: string;
  destinationPostcode: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    gender: string;
    phone: string;
  };
}

interface RideDetail {
  id: string;
  eventId: string;
  status: string;
  departureTime: string;
  departNow: boolean;
  maxPassengers: number;
  currentPassengers: number;
  departureAddress: string;
  departureLat: number;
  departureLng: number;
  estimatedCost: number | null;
  finalCost: number | null;
  route: any;
  routePolyline: string | null;
  event: {
    id: string;
    name: string;
    location: string;
    startDate: string;
    endDate: string;
  };
  requests: RideMember[];
}

export default function RideDetail() {
  const { rideId } = useParams<{ rideId: string }>();
  const navigate = useNavigate();
  const [ride, setRide] = useState<RideDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (rideId) {
      fetchRideDetail();
    }
  }, [rideId]);

  const fetchRideDetail = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/uber-rides/${rideId}`);
      setRide(response.data);
    } catch (error: any) {
      console.error('Erreur récupération détail ride:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la récupération du trajet');
      navigate('/my-rides');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!ride) {
    return null;
  }

  const acceptedMembers = ride.requests.filter(r => r.status === 'ACCEPTED');
  const estimatedCostPerPerson = ride.estimatedCost
    ? (ride.estimatedCost / acceptedMembers.length).toFixed(2)
    : null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/my-rides')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à mes trajets
        </Button>

        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Car className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Détails du trajet partagé
            </h1>
            <p className="text-muted-foreground">
              {ride.event.name}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informations du trajet */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Informations du trajet
            </h2>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {new Date(ride.event.startDate).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <div className="text-sm text-muted-foreground">Départ prévu</div>
                  <div className="text-sm font-medium text-foreground">
                    {new Date(ride.departureTime).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm text-muted-foreground">Point de départ</div>
                  <div className="text-sm font-medium text-foreground">
                    {ride.departureAddress}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <div className="text-sm text-muted-foreground">Passagers</div>
                  <div className="text-sm font-medium text-foreground">
                    {acceptedMembers.length} / {ride.maxPassengers}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Membres du groupe */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Membres du groupe ({acceptedMembers.length})
            </h2>

            <div className="space-y-3">
              {acceptedMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg"
                >
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-lg font-semibold text-primary">
                        {member.user.firstName.charAt(0)}{member.user.lastName.charAt(0)}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">
                        {member.user.firstName} {member.user.lastName}
                      </h3>
                      {member.user.gender === 'FEMALE' && (
                        <span className="text-xs px-2 py-0.5 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded">
                          F
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <MapPin className="w-4 h-4 flex-shrink-0 text-green-600 dark:text-green-400" />
                      <span className="truncate">
                        {member.destinationAddress}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4 flex-shrink-0" />
                      <a
                        href={`tel:${member.user.phone}`}
                        className="text-primary hover:underline"
                      >
                        {member.user.phone}
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Carte de l'itinéraire */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Itinéraire du trajet
            </h2>
            <RideMap
              departureAddress={ride.departureAddress}
              departureLat={ride.departureLat}
              departureLng={ride.departureLng}
              members={acceptedMembers}
              routePolyline={ride.routePolyline}
            />
            <p className="text-xs text-muted-foreground mt-3">
              <MapPin className="w-3 h-3 inline mr-1" />
              Bleu: Point de départ (soirée) • Vert: Destinations des membres
            </p>
          </div>
        </div>

        {/* Colonne latérale - Coût */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-lg p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Estimation du coût
            </h2>

            {ride.estimatedCost ? (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">
                    Coût total estimé
                  </div>
                  <div className="text-3xl font-bold text-foreground flex items-center gap-2">
                    {ride.estimatedCost.toFixed(2)}
                    <Euro className="w-6 h-6" />
                  </div>
                </div>

                {estimatedCostPerPerson && (
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-1">
                      Par personne
                    </div>
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300 flex items-center gap-2">
                      {estimatedCostPerPerson}
                      <Euro className="w-5 h-5" />
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Le coût réel sera calculé après la course et partagé équitablement entre tous les passagers.
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <Euro className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-sm text-muted-foreground">
                  Estimation du coût non disponible
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Le coût sera calculé après réservation de l'Uber
                </p>
              </div>
            )}

            {ride.finalCost && (
              <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-2 border-purple-200 dark:border-purple-800">
                <div className="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-1">
                  Coût final
                </div>
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-300 flex items-center gap-2">
                  {ride.finalCost.toFixed(2)}
                  <Euro className="w-5 h-5" />
                </div>
                <div className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                  {(ride.finalCost / acceptedMembers.length).toFixed(2)}€ / personne
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
