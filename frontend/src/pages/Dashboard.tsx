import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Calendar, Users, ArrowRight, Clock, Loader2, Edit, Trash2, Star, ChevronDown, CalendarDays, LayoutGrid } from 'lucide-react';
import { eventsApi, eventRatingsApi } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import ConfirmDialog from '../components/ConfirmDialog';
import StarRating from '../components/StarRating';
import EventCalendar from '../components/EventCalendar';
import toast from 'react-hot-toast';
import type { Event, User } from '../types';
import { handleApiErrorWithLog } from '../utils/errorHandler';

type SortOption = 'publication-desc' | 'publication-asc' | 'rating-desc' | 'status-published' | 'status-draft' | 'status-scheduled' | 'time-upcoming' | 'time-ongoing' | 'time-finished';

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('time-upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [viewMode, setViewMode] = useState<'calendar' | 'grid'>('calendar');
  const [ratingEventId, setRatingEventId] = useState<string | null>(null);
  const [userRating, setUserRating] = useState(0);
  const eventsPerPage = 6;
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

  // Fonction pour obtenir le statut temporel d'un événement
  const getEventTimeStatus = (event: Event) => {
    const now = new Date();
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);

    if (now < startDate) {
      return {
        status: 'À venir',
        variant: 'default' as const,
        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800'
      };
    }

    if (now >= startDate && now <= endDate) {
      return {
        status: 'En cours',
        variant: 'default' as const,
        color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800'
      };
    }

    return {
      status: 'Terminé',
      variant: 'secondary' as const,
      color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800'
    };
  };

  // Fonction pour obtenir le temps écoulé depuis la publication
  const getTimeAgo = (publishedAt: string | null): string | null => {
    if (!publishedAt) return null;

    const now = new Date();
    const published = new Date(publishedAt);
    const diffMs = now.getTime() - published.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffSeconds < 60) return 'à l\'instant';
    if (diffMinutes < 60) return `il y a ${diffMinutes} min`;
    if (diffHours < 24) return `il y a ${diffHours}h`;
    if (diffDays < 7) return `il y a ${diffDays}j`;
    if (diffWeeks < 4) return `il y a ${diffWeeks} sem`;
    if (diffMonths < 12) return `il y a ${diffMonths} mois`;

    return `il y a ${Math.floor(diffMonths / 12)} an${Math.floor(diffMonths / 12) > 1 ? 's' : ''}`;
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
      handleApiErrorWithLog(error, 'Erreur lors de la suppression', 'Dashboard.confirmDeleteEvent');
    } finally {
      setDeleteConfirmOpen(false);
      setEventToDelete(null);
    }
  };

  const cancelDeleteEvent = () => {
    setDeleteConfirmOpen(false);
    setEventToDelete(null);
  };

  const handleRatingSubmit = async (eventId: string, rating: number) => {
    try {
      await eventRatingsApi.create({ eventId, rating, comment: '' });
      toast.success('Merci pour votre avis !', { duration: 2000 });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error('Vous devez avoir un billet pour noter cet événement', { duration: 2000 });
      } else {
        toast.error(error.response?.data?.error || 'Erreur lors de la notation', { duration: 2000 });
      }
    }
  };

  // Séparation événements à venir / passés
  const { upcomingEvents, pastEvents } = useMemo(() => {
    if (!events) return { upcomingEvents: [], pastEvents: [] };

    const now = new Date();
    // Garder les événements visibles 1 jour après leur fin (pour noter l'événement et finaliser les trajets)
    const gracePeriodDays = 1;
    const gracePeriodMs = gracePeriodDays * 24 * 60 * 60 * 1000;

    const upcoming: Event[] = [];
    const past: Event[] = [];

    events.forEach(event => {
      const eventEnd = new Date(event.endDate);
      const timeSinceEnd = now.getTime() - eventEnd.getTime();

      // Événement à venir si pas encore fini, ou fini depuis moins de 7 jours
      if (timeSinceEnd < gracePeriodMs) {
        upcoming.push(event);
      } else {
        past.push(event);
      }
    });

    // Trier les événements à venir par date de début (du plus proche au plus éloigné)
    upcoming.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    // Trier les événements passés par date de fin (du plus récent au plus ancien)
    past.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());

    return { upcomingEvents: upcoming, pastEvents: past };
  }, [events]);

  // Filtrage et tri des événements selon l'onglet actif
  const sortedEvents = useMemo(() => {
    let filtered = activeTab === 'upcoming' ? [...upcomingEvents] : [...pastEvents];

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

    // Tri et filtrage
    switch (sortBy) {
      case 'publication-desc':
        filtered.sort((a, b) => {
          const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
          const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
          return dateB - dateA;
        });
        break;
      case 'publication-asc':
        filtered.sort((a, b) => {
          const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
          const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
          return dateA - dateB;
        });
        break;
      case 'rating-desc':
        filtered.sort((a, b) => {
          const ratingA = a.rating || 0;
          const ratingB = b.rating || 0;
          return ratingB - ratingA;
        });
        break;
      case 'time-upcoming':
        // Trier : événements en cours en premier, puis à venir par date de début
        filtered.sort((a, b) => {
          const now = new Date();
          const startA = new Date(a.startDate);
          const endA = new Date(a.endDate);
          const startB = new Date(b.startDate);
          const endB = new Date(b.endDate);

          const aIsOngoing = now >= startA && now <= endA;
          const bIsOngoing = now >= startB && now <= endB;

          // Événements en cours en premier
          if (aIsOngoing && !bIsOngoing) return -1;
          if (!aIsOngoing && bIsOngoing) return 1;

          // Si les deux sont en cours ou les deux ne sont pas en cours, trier par date de début
          return startA.getTime() - startB.getTime();
        });
        break;
      case 'time-ongoing':
        filtered = filtered.filter(event => {
          const now = new Date();
          const startDate = new Date(event.startDate);
          const endDate = new Date(event.endDate);
          return now >= startDate && now <= endDate;
        });
        break;
      case 'time-finished':
        filtered = filtered.filter(event => {
          const now = new Date();
          const endDate = new Date(event.endDate);
          return now > endDate;
        });
        break;
      case 'status-published':
        if (user?.isAdmin) {
          filtered = filtered.filter(event => {
            if (!event.publishedAt) return false;
            return new Date(event.publishedAt) <= new Date();
          });
        }
        break;
      case 'status-draft':
        if (user?.isAdmin) {
          filtered = filtered.filter(event => !event.publishedAt);
        }
        break;
      case 'status-scheduled':
        if (user?.isAdmin) {
          filtered = filtered.filter(event => {
            if (!event.publishedAt) return false;
            return new Date(event.publishedAt) > new Date();
          });
        }
        break;
    }

    return filtered;
  }, [upcomingEvents, pastEvents, activeTab, sortBy, searchQuery, user]);

  // Pagination
  const totalPages = Math.ceil(sortedEvents.length / eventsPerPage);
  const indexOfLastEvent = currentPage * eventsPerPage;
  const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;
  const currentEvents = sortedEvents.slice(indexOfFirstEvent, indexOfLastEvent);

  // Reset to page 1 when filters or tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, searchQuery, activeTab]);

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
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Événements BDE 🎉
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
            Découvrez les prochains événements et trouvez un covoiturage pour rentrer
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

            {/* Onglets, Tri et compteur */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
              {/* Toggle vue Calendrier / Grille */}
              <div className="inline-flex rounded-lg border border-border bg-background p-1">
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                    viewMode === 'calendar'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <CalendarDays className="w-4 h-4" />
                  Calendrier
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                    viewMode === 'grid'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  Grille
                </button>
              </div>

              {/* Onglets À venir / Passés (seulement en vue grille) */}
              {viewMode === 'grid' && (
                <div className="inline-flex rounded-lg border border-border bg-background p-1">
                  <button
                    onClick={() => setActiveTab('upcoming')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      activeTab === 'upcoming'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    À venir ({upcomingEvents.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('past')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      activeTab === 'past'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Passés ({pastEvents.length})
                  </button>
                </div>
              )}
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
                    <option value="time-upcoming">🔵 À venir</option>
                    <option value="time-ongoing">🟢 En cours</option>
                    <option value="time-finished">🟣 Terminés</option>
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
        ) : viewMode === 'calendar' ? (
          /* Vue Calendrier */
          <EventCalendar
            events={events || []}
            onEventClick={(event) => navigate(`/events/${event.id}`)}
          />
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
          /* Vue Grille */
          <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {currentEvents.map((event: Event) => (
              <Card
                key={event.id}
                className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card border border-border shadow-md flex flex-col relative"
              >
                {/* Badge de statut en haut à droite */}
                <div className="absolute top-4 right-4 z-10">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border shadow-sm ${getEventTimeStatus(event).color}`}>
                    {getEventTimeStatus(event).status}
                  </span>
                </div>

                <CardHeader className="pb-4 flex-shrink-0 pr-24">
                  <div className="space-y-2">
                    <CardTitle className="text-xl sm:text-2xl line-clamp-2 group-hover:text-primary transition-colors">
                      {event.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
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
                  {event.description && (
                    <CardDescription className="line-clamp-2 mt-3 text-sm">
                      {event.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="flex flex-col flex-1 px-4 sm:px-6">
                  <div className="space-y-2.5 sm:space-y-3 flex-1">
                    <div className="flex items-start sm:items-center text-sm text-muted-foreground gap-3">
                      <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5 sm:mt-0" />
                      <span className="line-clamp-2 sm:truncate">{event.location}</span>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground gap-3">
                      <Calendar className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="truncate">
                        {new Date(event.startDate).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex items-start text-sm text-muted-foreground gap-3">
                      <Clock className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="truncate">
                          Début: {new Date(event.startDate).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground/70 truncate">
                          Fin: {new Date(event.endDate).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground gap-3">
                      <Users className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      <span>{event.capacity} places</span>
                    </div>
                    {/* Temps écoulé depuis la publication (pour les événements à venir) */}
                    {getEventTimeStatus(event).status === 'À venir' && event.publishedAt && getTimeAgo(event.publishedAt) && (
                      <div className="flex items-center text-sm gap-3">
                        <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        </div>
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                          Publié {getTimeAgo(event.publishedAt)}
                        </span>
                      </div>
                    )}
                    {event.rating && event.ratingCount > 0 && (
                      <div className="flex items-center text-sm text-muted-foreground gap-3">
                        <Star className="w-4 h-4 text-yellow-500 flex-shrink-0 fill-yellow-500" />
                        <span>
                          {event.rating.toFixed(1)}/5 ({event.ratingCount} avis)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Système de notation pour les événements passés */}
                  {activeTab === 'past' && (
                    <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border">
                      <div className="text-sm font-medium mb-2 text-center">Notez cet événement</div>
                      <div className="flex justify-center">
                        <StarRating
                          rating={0}
                          onRatingChange={(rating) => handleRatingSubmit(event.id, rating)}
                          size="lg"
                        />
                      </div>
                      {event.ratingCount > 0 && (
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                          Note actuelle: {event.rating?.toFixed(1)}/5 ({event.ratingCount} avis)
                        </p>
                      )}
                    </div>
                  )}

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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Précédent
              </Button>

              <span className="text-sm text-muted-foreground">
                Page {currentPage} sur {totalPages}
              </span>

              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Suivant
              </Button>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
}