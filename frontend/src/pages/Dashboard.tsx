import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Calendar, Users, ArrowRight, Car, Clock, Loader2, Edit, Trash2 } from 'lucide-react';
import { eventsApi } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import ConfirmDialog from '../components/ConfirmDialog';
import toast from 'react-hot-toast';
import type { Event, User } from '../types';

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fonction pour obtenir le statut de publication d'un événement
  const getPublicationStatus = (event: Event) => {
    if (!event.publishedAt) {
      return { status: 'Brouillon', variant: 'secondary' as const };
    }

    const publishDate = new Date(event.publishedAt);
    const now = new Date();

    if (publishDate > now) {
      return { status: 'Programmé', variant: 'outline' as const };
    }

    return { status: 'Publié', variant: 'default' as const };
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

  const { data: events, isLoading, error } = useQuery({
    queryKey: ['events'],
    queryFn: eventsApi.getAll
  });

  const handleDeleteEvent = (eventId: string) => {
    setEventToDelete(eventId);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return;

    try {
      await eventsApi.delete(eventToDelete);
      toast.success('Événement supprimé avec succès !');
      queryClient.invalidateQueries({ queryKey: ['events'] });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression');
    } finally {
      setDeleteConfirmOpen(false);
      setEventToDelete(null);
    }
  };

  const cancelDeleteEvent = () => {
    setDeleteConfirmOpen(false);
    setEventToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Chargement des événements...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Erreur</CardTitle>
            <CardDescription>
              Impossible de charger les événements
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-6 shadow-lg">
            <Car className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Événements BDE 🎉
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
            Découvrez les prochains événements et partagez vos trajets avec la communauté IESEG
          </p>
          {user?.isAdmin && (
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
              <Link to="/create-event" className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                Créer un événement
              </Link>
            </Button>
          )}
        </div>

        {events && events.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-muted-foreground" />
              </div>
              <CardTitle>Aucun événement disponible</CardTitle>
              <CardDescription>
                Les prochains événements du BDE apparaîtront ici. Restez connecté pour ne rien manquer !
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events?.map((event: Event) => (
              <Card
                key={event.id}
                className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card border border-border shadow-md"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-xl line-clamp-2 group-hover:text-primary transition-colors">
                          {event.name}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {event.type === 'Autre' ? event.customType || 'Autre' : event.type}
                        </Badge>
                        {user?.isAdmin && (
                          <Badge variant={getPublicationStatus(event).variant} className="text-xs">
                            {getPublicationStatus(event).status}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className="ml-2 flex-shrink-0">
                      {event.rides?.length || 0} trajets
                    </Badge>
                  </div>
                  {event.description && (
                    <CardDescription className="line-clamp-2">
                      {event.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 mr-3 text-blue-500" />
                      <span className="truncate">{event.location}</span>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4 mr-3 text-green-500" />
                      <span>
                        {new Date(event.startDate).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 mr-3 text-orange-500" />
                      <div>
                        <div>
                          Début: {new Date(event.startDate).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <div className="text-xs text-gray-400">
                          Fin: {new Date(event.endDate).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="w-4 h-4 mr-3 text-purple-500" />
                      <span>{event.rides?.length || 0} trajet(s) disponible(s)</span>
                    </div>
                  </div>

                  <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
                    <Link to={`/events/${event.id}`} className="flex items-center justify-center">
                      Voir le détail
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}