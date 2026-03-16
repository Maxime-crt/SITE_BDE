import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { eventsApi, eventRatingsApi } from '../services/api';
import type { User, Event, EventRating } from '../types';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { handleApiErrorWithLog } from '../utils/errorHandler';
import { formatParisDate } from '../utils/dateUtils';
import { Calendar, MapPin, Star, ArrowLeft, Edit, Trash2, ExternalLink, Car, Users, Shield, Clock } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import UberRequestModal from '../components/UberRequestModal';
import LandingNav from '../components/LandingNav';
import logoFLR from '../assets/Logo_FLR.png';
import api from '../services/api';

const CLOUD = 'dk93ledz2';
function cloudUrl(publicId: string, w: number, format?: string) {
  const f = format || 'auto';
  return `https://res.cloudinary.com/${CLOUD}/image/upload/f_${f},q_auto,w_${w}/v2/${publicId}`;
}

const ASSO_LOGOS: Record<string, string> = {
  'Fuelers': 'Logo-Assos/Logo_FLR_nuoqmd.jpg',
  'Art Breakers': 'Logo-Assos/LAB_n9b5sr.jpg',
  "Scare'pions": 'Logo-Assos/SP_nwoqtw.jpg',
  "Gold'n'Grizz": 'Logo-Assos/GNG_ugio23.jpg',
  "Spotl'eye't": 'Logo-Assos/SET_sfembi.jpg',
  "Cash in S'eye'ght": 'Logo-Assos/CIS_frfhly.jpg',
};

function eventStatus(startStr: string, endStr: string) {
  const now = Date.now();
  const start = new Date(startStr).getTime();
  const end = new Date(endStr).getTime();
  const msUntilStart = start - now;
  const hoursUntilStart = msUntilStart / (1000 * 60 * 60);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDay = new Date(startStr);
  startDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round((startDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (now > end + 60 * 60 * 1000) return null;
  if (now > end) return { label: 'Terminé', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' };
  if (now >= start) return { label: 'En cours', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' };
  if (hoursUntilStart <= 2) return { label: 'Commence bientôt', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' };
  if (diffDays === 0) return { label: "Aujourd'hui", color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-400/30' };
  if (diffDays === 1) return { label: 'Demain', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-400/30' };
  return { label: `Dans ${diffDays} jours`, color: 'text-blue-300', bg: 'bg-blue-500/10 border-blue-400/30' };
}

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

  const isAdmin = user?.isAdmin || false;

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

  useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const response = await api.get('/users/me/profile');
      setUserProfile(response.data);
      return response.data;
    },
    enabled: !!user
  });

  const { data: existingRideRequest } = useQuery({
    queryKey: ['existing-ride-request', id],
    queryFn: async () => {
      try {
        const response = await api.get('/uber-rides/my-rides');
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
    return formatParisDate(dateString, {
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

  const canRate = () => {
    if (!event || !user) return false;
    return new Date() > new Date(event.endDate);
  };

  const canRequestRide = () => {
    if (!event || !user) return false;
    const oneHourAfterEnd = new Date(event.endDate);
    oneHourAfterEnd.setHours(oneHourAfterEnd.getHours() + 1);
    return new Date() < oneHourAfterEnd;
  };

  const asso = event ? (event.association || 'Fuelers') : 'Fuelers';
  const assoLogo = ASSO_LOGOS[asso];

  if (eventLoading) {
    return (
      <div className="min-h-screen bg-[#0a1128] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
          <p className="mt-4 text-white/40 font-syne">Chargement de l'événement...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#0a1128] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-syne font-bold text-white mb-4">Événement introuvable</h2>
          <Link to="/" className="text-blue-400 hover:text-blue-300 transition-colors">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  const isEventFinished = new Date() > new Date(event.endDate);
  const status = eventStatus(event.startDate, event.endDate);

  return (
    <div className="min-h-screen bg-[#0a1128] font-dm-sans text-white">
      <LandingNav isAdmin={isAdmin} />

      {/* ── HERO BANNER ── */}
      <div className="relative pt-20">
        <div className="relative h-72 md:h-96 overflow-hidden">
          {event.imageUrl ? (
            <img
              src={cloudUrl(event.imageUrl, 1400)}
              alt={event.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-900/40 via-[#0a1128] to-indigo-900/30" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1128] via-[#0a1128]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a1128]/40 to-transparent" />

          {/* Top bar overlay */}
          <div className="absolute top-8 inset-x-0 px-6 md:px-10 mx-auto max-w-4xl flex items-center justify-between gap-2 flex-wrap">
            <button
              onClick={() => {
                navigate('/');
                setTimeout(() => {
                  document.getElementById('events')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600/80 backdrop-blur-sm rounded-full text-white hover:bg-blue-500 transition-all text-xs sm:text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Retour aux événements</span>
              <span className="sm:hidden">Retour</span>
            </button>

            {isAdmin && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/events/${event.id}/edit`)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600/80 backdrop-blur-sm rounded-full text-white hover:bg-blue-500 transition-all text-xs sm:text-sm"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Modifier</span>
                </button>
                <button
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-red-600 backdrop-blur-sm rounded-full text-white hover:bg-red-500 transition-all text-xs sm:text-sm border border-red-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Supprimer</span>
                </button>
              </div>
            )}
          </div>

          {/* Event title overlay */}
          <div className="absolute bottom-0 left-0 right-0 pb-4 md:pb-8">
            <div className="max-w-4xl mx-auto px-6 md:px-10">
              <div className="flex items-center gap-3 flex-wrap mb-3">
                <span className="px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-blue-300 text-xs font-bold tracking-wider uppercase">
                  {event.type === 'Autre' ? event.customType : event.type}
                </span>
                {assoLogo && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full border border-white/10">
                    <img
                      src={cloudUrl(assoLogo, 32, 'png')}
                      alt={asso}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                    <span className="text-sm font-medium text-white/90">{asso}</span>
                  </div>
                )}
                {status && (
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-sm ${status.bg} ${status.color}`}>
                    <Clock className="w-3.5 h-3.5" />
                    {status.label}
                  </div>
                )}
              </div>
              <h1 className="font-syne font-extrabold text-2xl sm:text-3xl md:text-5xl text-white drop-shadow-lg break-words">
                {event.name}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#080e20] to-[#0a1128]" />

        <div className="relative max-w-4xl mx-auto px-6 md:px-10 py-2 md:py-3">
          {/* Description */}
          {event.description && (
            <div className="mb-10">
              <p className="text-white/60 text-lg leading-relaxed max-w-2xl">
                {event.description}
              </p>
            </div>
          )}

          {/* Info cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 hover:border-blue-400/20 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-white/40 text-sm">Début</span>
              </div>
              <p className="font-medium text-white">{formatDate(event.startDate)}</p>
            </div>

            <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 hover:border-blue-400/20 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-indigo-400" />
                </div>
                <span className="text-white/40 text-sm">Fin</span>
              </div>
              <p className="font-medium text-white">{formatDate(event.endDate)}</p>
            </div>

            <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 hover:border-blue-400/20 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-white/40 text-sm">Lieu</span>
              </div>
              <p className="font-medium text-white mb-1">{event.location}</p>
              <a
                href={getGoogleMapsUrl(event.location)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-sm inline-flex items-center gap-1 transition-colors"
              >
                Google Maps
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 hover:border-blue-400/20 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-indigo-400" />
                </div>
                <span className="text-white/40 text-sm">Capacité</span>
              </div>
              <p className="font-medium text-white">{event.capacity} places</p>
            </div>
          </div>

          {/* ── COVOITURAGE ── */}
          {canRequestRide() && (
            <div className="mb-10">
              <div className="rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border border-blue-400/20 p-6 md:p-8">
                {existingRideRequest ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center flex-shrink-0">
                      <Car className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-syne font-bold text-white text-lg">Demande en cours</h3>
                      <p className="text-white/40 text-sm mt-1">Vous avez déjà une demande de trajet partagé pour cet événement</p>
                    </div>
                    <button
                      onClick={() => navigate('/my-rides')}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-syne font-bold text-sm rounded-xl transition-colors"
                    >
                      Voir mes trajets
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center flex-shrink-0">
                      <Car className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-syne font-bold text-white text-lg">Trajet retour partagé</h3>
                      <p className="text-white/40 text-sm mt-1">Trouvez des participants qui rentrent dans la même direction et partagez les frais</p>
                    </div>
                    <button
                      onClick={() => setUberModalOpen(true)}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-syne font-bold text-sm rounded-xl transition-colors flex items-center gap-2"
                    >
                      <Car className="w-4 h-4" />
                      Trouver des co-passagers
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── EVENT TERMINE ── */}
          {isEventFinished && !canRequestRide() && (
            <div className="mb-10">
              <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 text-center">
                <p className="text-white/40 font-syne font-bold">Cet événement est terminé</p>
              </div>
            </div>
          )}

          {/* ── NOTATION ── */}
          {canRate() && (
            <div className="mb-10">
              <div className="rounded-2xl bg-gradient-to-br from-yellow-500/5 to-orange-500/5 border border-yellow-500/20 p-6 md:p-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center flex-shrink-0">
                    <Star className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-syne font-bold text-white text-lg">Votre avis compte !</h3>
                    <p className="text-white/40 text-sm mt-1">Partagez votre expérience avec les autres étudiants</p>
                  </div>
                  <button
                    onClick={() => navigate(`/events/${event.id}/rate`)}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-syne font-bold text-sm rounded-xl transition-colors flex items-center gap-2"
                  >
                    <Star className="w-4 h-4" />
                    Noter cet événement
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── AVIS ── */}
          {event.ratingCount > 0 && (
            <div className="mb-10">
              <h3 className="font-syne font-bold text-xl text-white mb-6">
                Notes et avis
                <span className="text-white/30 ml-2">({event.ratingCount})</span>
              </h3>

              {/* Average rating */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-6 h-6 ${
                        star <= (event.rating || 0)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-white/10'
                      }`}
                    />
                  ))}
                </div>
                <span className="font-syne font-bold text-2xl text-white">
                  {event.rating?.toFixed(1)}
                </span>
                <span className="text-white/30">/  5</span>
              </div>

              {/* Individual ratings */}
              {ratings && ratings.length > 0 && (
                <div className="space-y-3">
                  {ratings.map((rating: EventRating) => (
                    <div key={rating.id} className="rounded-2xl bg-white/[0.03] border border-white/10 p-5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="font-syne font-bold text-white">
                            {rating.user?.firstName} {rating.user?.lastName}
                          </span>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= rating.rating
                                    ? 'text-yellow-400 fill-yellow-400'
                                    : 'text-white/10'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-white/30 text-sm">
                          {new Date(rating.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      {rating.comment && (
                        <p className="text-white/50 text-sm leading-relaxed">{rating.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="relative py-16 px-6 border-t border-white/10 bg-gradient-to-b from-[#0a1128] to-[#0d1530]">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-950/20 via-transparent to-indigo-950/20" />
        <div className="relative max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <img src={logoFLR} alt="Fuelers" className="w-10 h-10 rounded-full ring-2 ring-blue-400/30 shadow-lg shadow-blue-500/10" />
              <span className="font-syne font-bold text-xl bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Fuelers
              </span>
            </div>
            <div className="flex items-center gap-6">
              <a href="https://www.instagram.com/listebde.fuelers" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-blue-400 transition-colors duration-300" aria-label="Instagram">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
              <a href="https://www.tiktok.com/@listebde.fuelers" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors duration-300" aria-label="TikTok">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-.88-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/></svg>
              </a>
            </div>
            <p className="text-white/60 text-sm font-medium">&copy; {new Date().getFullYear()} Fuelers. Tous droits réservés.</p>
          </div>
        </div>
      </footer>

      {/* Dialogs */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onConfirm={handleDeleteEvent}
        onCancel={() => setDeleteConfirmOpen(false)}
        title="Supprimer l'événement"
        message="Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible."
        confirmText="Supprimer"
        type="danger"
      />

      {event && (
        <UberRequestModal
          isOpen={uberModalOpen}
          onClose={() => {
            setUberModalOpen(false);
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
