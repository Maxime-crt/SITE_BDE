import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Calendar, Users, ArrowRight, Car, Clock, Loader2, Edit, Trash2, Star, ChevronDown } from 'lucide-react';
import { eventsApi } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import ConfirmDialog from '../components/ConfirmDialog';
import toast from 'react-hot-toast';
import type { Event, User } from '../types';

type SortOption = 'publication-desc' | 'publication-asc' | 'rating-desc' | 'status-published' | 'status-draft' | 'status-scheduled';

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('publication-desc');
  const [searchQuery, setSearchQuery] = useState('');
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

  // Filtrage et tri des événements
  const sortedEvents = useMemo(() => {
    if (!events) return [];

    let filtered = [...events];

    // Filtrage par recherche (titre, description, adresse)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event => {
        const matchName = event.name.toLowerCase().includes(query);
        const matchDescription = event.description?.toLowerCase().includes(query);
        const matchLocation = event.location.toLowerCase().includes(query);
        return matchName || matchDescription || matchLocation;
      });
    }

    // Tri
    switch (sortBy) {
      case 'publication-desc':
        // Plus récent d'abord
        filtered.sort((a, b) => {
          const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
          const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
          return dateB - dateA;
        });
        break;
      case 'publication-asc':
        // Plus ancien d'abord
        filtered.sort((a, b) => {
          const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
          const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
          return dateA - dateB;
        });
        break;
      case 'rating-desc':
        // Mieux noté d'abord
        filtered.sort((a, b) => {
          const ratingA = a.rating || 0;
          const ratingB = b.rating || 0;
          return ratingB - ratingA;
        });
        break;
      case 'status-published':
        // Uniquement les publiés
        filtered = filtered.filter(event => {
          if (!event.publishedAt) return false;
          return new Date(event.publishedAt) <= new Date();
        });
        break;
      case 'status-draft':
        // Uniquement les brouillons
        filtered = filtered.filter(event => !event.publishedAt);
        break;
      case 'status-scheduled':
        // Uniquement les programmés
        filtered = filtered.filter(event => {
          if (!event.publishedAt) return false;
          return new Date(event.publishedAt) > new Date();
        });
        break;
    }

    return filtered;
  }, [events, sortBy, searchQuery]);

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
            Découvrez les prochains événements et réservez vos billets pour la communauté IESEG
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {user?.isAdmin && (
              <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
                <Link to="/create-event" className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Créer un événement
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Recherche et filtres */}
        {events && events.length > 0 && (
          <div className="mb-8 space-y-4">
            {/* Barre de recherche */}
            <div className="flex justify-center">
              <div className="w-full max-w-2xl">
                <input
                  type="text"
                  placeholder="Rechercher par titre, description ou adresse..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 border border-input bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Tri et compteur */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
              <div className="flex items-center gap-3">
                <label htmlFor="sort" className="text-sm font-medium">
                  Trier par:
                </label>
                <div className="relative">
                  <select
                    id="sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="appearance-none pl-4 pr-10 py-2.5 border border-input bg-background rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer hover:border-primary/50 transition-colors min-w-[200px]"
                  >
                    <option value="publication-desc">📅 Plus récents</option>
                    <option value="publication-asc">📅 Plus anciens</option>
                    <option value="rating-desc">⭐ Mieux notés</option>
                    {user?.isAdmin && (
                      <>
                        <option value="status-published">✅ Publiés</option>
                        <option value="status-draft">📝 Brouillons</option>
                        <option value="status-scheduled">⏰ Programmés</option>
                      </>
                    )}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
                <span className="text-sm font-semibold text-foreground">
                  {sortedEvents.length}
                </span>
                <span className="text-sm text-muted-foreground">
                  événement{sortedEvents.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        )}

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
        ) : sortedEvents.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-muted-foreground" />
              </div>
              <CardTitle>Aucun événement dans cette catégorie</CardTitle>
              <CardDescription>
                Changez de filtre pour voir d'autres événements
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sortedEvents.map((event: Event) => (
              <Card
                key={event.id}
                className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card border border-border shadow-md flex flex-col"
              >
                <CardHeader className="pb-4 flex-shrink-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-xl line-clamp-1 group-hover:text-primary transition-colors">
                          {event.name}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {event.type === 'Autre' ? event.customType || 'Autre' : event.type}
                        </Badge>
                        {user?.isAdmin && (
                          <Badge variant={getPublicationStatus(event).variant} className="text-xs flex-shrink-0">
                            {getPublicationStatus(event).status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {event.description && (
                    <CardDescription className="line-clamp-2">
                      {event.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="flex flex-col flex-1">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 mr-3 text-blue-500 flex-shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4 mr-3 text-green-500 flex-shrink-0" />
                      <span>
                        {new Date(event.startDate).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 mr-3 text-orange-500 flex-shrink-0" />
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
                      <Users className="w-4 h-4 mr-3 text-purple-500 flex-shrink-0" />
                      <span>Capacité: {event.capacity} places</span>
                    </div>
                    {event.publishedAt && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 mr-3 text-pink-500 flex-shrink-0" />
                        <span>
                          Publié le {new Date(event.publishedAt).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })} à {new Date(event.publishedAt).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                    {event.rating && event.ratingCount > 0 && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Star className="w-4 h-4 mr-3 text-yellow-500 flex-shrink-0 fill-yellow-500" />
                        <span>
                          {event.rating.toFixed(1)}/5 ({event.ratingCount} avis)
                        </span>
                      </div>
                    )}
                  </div>

                  <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg mt-4 flex-shrink-0">
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