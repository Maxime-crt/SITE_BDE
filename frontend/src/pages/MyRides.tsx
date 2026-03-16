import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Car, Calendar, MapPin, Users, Clock, Check, AlertCircle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { socketService } from '../services/socket';
import ConfirmDialog from '../components/ConfirmDialog';
import { formatParisDate } from '../utils/dateUtils';
import RideMap from '../components/RideMap';
import LandingNav from '../components/LandingNav';
import logoFLR from '../assets/Logo_FLR.png';

interface UberRide {
  id: string;
  eventId: string;
  userId: string;
  rideId: string;
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
    latitude: number | null;
    longitude: number | null;
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
  const [cancelIsLeave, setCancelIsLeave] = useState(false);

  const navigate = useNavigate();

  const isAdmin = (() => {
    const saved = localStorage.getItem('user');
    if (!saved) return false;
    try { return JSON.parse(saved).isAdmin === true; } catch { return false; }
  })();

  const handleRideUpdated = useCallback(() => {
    fetchRides(false);
  }, []);

  useEffect(() => {
    fetchRides();

    const token = localStorage.getItem('token') || undefined;
    const savedUser = localStorage.getItem('user');
    const userId = savedUser ? JSON.parse(savedUser).id : null;

    socketService.init(token);
    if (userId) {
      socketService.joinUserNotifications(userId);
    }
    socketService.onRideUpdated(handleRideUpdated);

    return () => {
      socketService.offRideUpdated(handleRideUpdated);
      if (userId) {
        socketService.leaveUserNotifications(userId);
      }
    };
  }, [handleRideUpdated]);

  const fetchRides = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const response = await api.get('/uber-rides/my-rides');
      setRides(response.data);
    } catch (error: any) {
      console.error('Erreur récupération trajets:', error);
      if (showLoading) toast.error('Erreur lors du chargement des trajets');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const openCancelDialog = (requestId: string, isLeave = false) => {
    setRideToCancel(requestId);
    setCancelIsLeave(isLeave);
    setConfirmDialogOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!rideToCancel) return;
    try {
      await api.delete(`/uber-rides/request/${rideToCancel}`);
      toast.success('Demande annulée avec succès.');
      setConfirmDialogOpen(false);
      setRideToCancel(null);
      fetchRides();
    } catch (error: any) {
      console.error('Erreur annulation demande:', error);
      toast.error(error.response?.data?.error || "Erreur lors de l'annulation");
      setConfirmDialogOpen(false);
      setRideToCancel(null);
    }
  };

  const handleCancelCancel = () => {
    setConfirmDialogOpen(false);
    setRideToCancel(null);
  };

  const getStatusBadge = (status: string, memberCount: number) => {
    const badges: Record<string, { text: string; color: string; showSpinner?: boolean }> = {
      PENDING: { text: 'En attente', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
      MATCHED: { text: 'Match trouvé', color: 'bg-blue-500/10 text-blue-400 border-blue-400/30' },
      ACCEPTED: memberCount === 1
        ? { text: 'Recherche en cours', color: 'bg-blue-500/10 text-blue-400 border-blue-400/30', showSpinner: true }
        : { text: 'Groupe formé', color: 'bg-green-500/10 text-green-400 border-green-500/30' },
      REJECTED: { text: 'Refusé', color: 'bg-red-500/10 text-red-400 border-red-500/30' },
      CANCELLED: { text: 'Annulé', color: 'bg-white/5 text-white/40 border-white/10' },
      COMPLETED: { text: 'Terminé', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-400/30' },
    };

    const badge = badges[status] || badges.PENDING;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.color}`}>
        {badge.showSpinner && (
          <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {badge.text}
      </span>
    );
  };

  const activeRides = rides.filter(r => ['PENDING', 'MATCHED', 'ACCEPTED'].includes(r.status));
  const pastRides = rides.filter(r => ['REJECTED', 'CANCELLED', 'COMPLETED'].includes(r.status));
  const displayRides = activeTab === 'active' ? activeRides : pastRides;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1128] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1128] font-dm-sans text-white flex flex-col">
      <LandingNav isAdmin={isAdmin} />

      <div className="flex-1 pt-28 pb-16 max-w-4xl mx-auto px-6 md:px-10 w-full">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center">
              <Car className="w-6 h-6 text-blue-400" />
            </div>
            <h1 className="font-syne font-bold text-3xl md:text-4xl">Mes trajets</h1>
          </div>
          <p className="text-white/40 mt-2">Gérez vos demandes de trajets retour partagés</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-5 py-2.5 rounded-xl font-syne font-bold text-sm transition-all ${
              activeTab === 'active'
                ? 'bg-blue-600 text-white'
                : 'bg-white/[0.04] text-white/50 hover:text-white hover:bg-white/[0.08] border border-white/5'
            }`}
          >
            Actifs
            {activeRides.length > 0 && (
              <span className="ml-2 bg-white/20 rounded-full px-2 py-0.5 text-xs">
                {activeRides.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`px-5 py-2.5 rounded-xl font-syne font-bold text-sm transition-all ${
              activeTab === 'past'
                ? 'bg-blue-600 text-white'
                : 'bg-white/[0.04] text-white/50 hover:text-white hover:bg-white/[0.08] border border-white/5'
            }`}
          >
            Historique
          </button>
        </div>

        {/* Empty state */}
        {displayRides.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto mb-4">
              <Car className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="font-syne font-bold text-lg text-white/60 mb-2">
              {activeTab === 'active' ? 'Aucun trajet actif' : 'Aucun trajet passé'}
            </h3>
            <p className="text-white/30 text-sm mb-6">
              {activeTab === 'active'
                ? 'Rendez-vous sur un événement pour demander un trajet retour partagé'
                : 'Vos trajets terminés apparaîtront ici'}
            </p>
            {activeTab === 'active' && (
              <button
                onClick={() => {
                  navigate('/');
                  setTimeout(() => {
                    document.getElementById('events')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 100);
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-syne font-bold text-sm rounded-xl transition-colors"
              >
                Voir les événements
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {displayRides.map((ride) => (
              <div
                key={ride.id}
                className="rounded-2xl bg-white/[0.03] border border-white/5 hover:border-blue-400/20 transition-all p-6"
              >
                {/* Header: event name + badge */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    {ride.event ? (
                      <Link
                        to={`/events/${ride.event.id}`}
                        className="font-syne font-bold text-lg text-white hover:text-blue-300 transition-colors"
                      >
                        {ride.event.name}
                      </Link>
                    ) : (
                      <span className="font-syne font-bold text-lg text-white/40">Événement non trouvé</span>
                    )}
                  </div>
                  {getStatusBadge(ride.status, ride.group?.memberCount || 1)}
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {ride.event && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="text-white/50">
                        {formatParisDate(ride.event.startDate, { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 text-sm">
                    <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="text-white/50">
                      Départ à {formatParisDate(ride.departureTime, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm">
                    <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="text-white/50 truncate">{ride.event?.location || 'Adresse non disponible'}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm">
                    <MapPin className="w-4 h-4 text-green-400 shrink-0" />
                    <span className="text-white/50 truncate">{ride.homeAddress}</span>
                  </div>
                </div>

                {ride.femaleOnly && (
                  <div className="flex items-center gap-2 text-sm text-pink-400 mb-4">
                    <Users className="w-4 h-4" />
                    <span>Groupe femmes uniquement</span>
                  </div>
                )}

                {/* Map */}
                {['PENDING', 'MATCHED', 'ACCEPTED'].includes(ride.status) && ride.event?.latitude && ride.event?.longitude && (
                  <div className="mb-4 rounded-xl overflow-hidden border border-white/5">
                    <RideMap
                      departureAddress={ride.event.location}
                      departureLat={ride.event.latitude}
                      departureLng={ride.event.longitude}
                      destinations={[{ lat: ride.homeLatitude, lng: ride.homeLongitude, address: ride.homeAddress }]}
                      height="250px"
                    />
                  </div>
                )}

                {/* Group info */}
                {ride.group && (
                  <div className="rounded-xl bg-white/[0.04] border border-white/10 p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-blue-400" />
                        <span className="text-white/60 font-medium">
                          {ride.group.memberCount === 1
                            ? (ride.status === 'CANCELLED' || ride.status === 'COMPLETED'
                              ? 'Aucune personne trouvée'
                              : 'Vous êtes seul pour le moment')
                            : `${ride.group.memberCount} personnes dans le groupe`}
                        </span>
                      </div>
                      {ride.group.estimatedCost !== null && ride.group.estimatedCost !== undefined && (
                        <span className="text-sm font-bold text-white/70">
                          ~{ride.group.estimatedCost.toFixed(2)}€/pers.
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {ride.status === 'PENDING' && (
                  <button
                    onClick={() => openCancelDialog(ride.id)}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-syne font-bold text-sm rounded-xl transition-colors"
                  >
                    Annuler la demande
                  </button>
                )}

                {ride.status === 'MATCHED' && (
                  <div className="space-y-3">
                    <div className="rounded-xl bg-blue-500/10 border border-blue-400/20 p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-white">Un groupe a été trouvé !</p>
                          <p className="text-sm text-white/40 mt-1">Vous recevrez une notification quand le groupe sera confirmé.</p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => openCancelDialog(ride.id)}
                      className="w-full px-5 py-2.5 bg-white/[0.04] hover:bg-red-600/20 border border-white/10 hover:border-red-500/30 text-white/60 hover:text-red-400 font-syne font-bold text-sm rounded-xl transition-all"
                    >
                      Annuler la demande
                    </button>
                  </div>
                )}

                {ride.status === 'ACCEPTED' && (
                  <>
                    {ride.group && ride.group.memberCount === 1 ? (
                      <div className="space-y-3">
                        <div className="rounded-xl bg-blue-500/10 border border-blue-400/20 p-4">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-bold text-white">Demande enregistrée</p>
                              <p className="text-sm text-white/40 mt-1">
                                Nous recherchons des personnes avec des trajets similaires. Vous recevrez une notification dès qu&apos;un groupe sera formé.
                              </p>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => openCancelDialog(ride.id)}
                          className="w-full px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-syne font-bold text-sm rounded-xl transition-colors"
                        >
                          Annuler la demande
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4">
                          <div className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-bold text-white">Groupe formé !</p>
                              <p className="text-sm text-white/40 mt-1">Rendez-vous avec votre groupe à la fin de l&apos;événement.</p>
                            </div>
                          </div>
                        </div>
                        <Link
                          to={`/ride/${ride.rideId}`}
                          className="block w-full text-center px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-syne font-bold text-sm rounded-xl transition-colors"
                        >
                          Voir les détails du groupe
                        </Link>
                        <button
                          onClick={() => openCancelDialog(ride.id, true)}
                          className="w-full px-5 py-2.5 bg-white/[0.04] hover:bg-red-600/20 border border-white/10 hover:border-red-500/30 text-white/60 hover:text-red-400 font-syne font-bold text-sm rounded-xl transition-all"
                        >
                          Quitter le groupe
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
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

      <ConfirmDialog
        isOpen={confirmDialogOpen}
        title={cancelIsLeave ? "Quitter le groupe" : "Annuler la demande de trajet"}
        message={cancelIsLeave
          ? "Êtes-vous sûr de vouloir quitter ce groupe ?"
          : "Êtes-vous sûr de vouloir annuler cette demande ? Vous pourrez en refaire une nouvelle après."
        }
        confirmText={cancelIsLeave ? "Oui, quitter" : "Oui, annuler"}
        cancelText="Non, garder"
        type="danger"
        onConfirm={handleCancelConfirm}
        onCancel={handleCancelCancel}
      />
    </div>
  );
}
