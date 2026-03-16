import { useState, useEffect } from 'react';
import { Shield, Users, Phone, Mail, Search, MessageCircle, Star, Activity, UserX, Inbox, X, Instagram } from 'lucide-react';
import { adminApi } from '../services/api';
import { Link, useSearchParams } from 'react-router-dom';
import { handleApiErrorWithLog } from '../utils/errorHandler';
import LandingNav from '../components/LandingNav';
import logoFLR from '../assets/Logo_FLR.png';

interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  instagram: string | null;
  isAdmin: boolean;
  rating: number | null;
  ratingCount: number;
  isActive: boolean;
  isOnline: boolean;
  lastLoginAt: string | null;
  lastActivityAt: string | null;
  createdAt: string;
  detailedRatings: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
  }>;
}

export default function AdminDashboard() {
  const [members, setMembers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchMembers();
    fetchUnreadCount();
  }, []);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getAllMembers();
      setMembers(data);
    } catch (error: any) {
      handleApiErrorWithLog(error, 'Erreur lors du chargement des membres', 'AdminDashboard.fetchMembers');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const conversations = await adminApi.getAllConversations();
      const count = conversations.reduce((total: number, user: any) =>
        total + user.supportMessages.filter((msg: any) => !msg.isFromBDE && !msg.isRead).length, 0
      );
      setUnreadCount(count);
    } catch {
      // silently fail
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredMembers = members.filter(member => {
    const searchLower = searchTerm.toLowerCase();
    return (
      member.firstName.toLowerCase().includes(searchLower) ||
      member.lastName.toLowerCase().includes(searchLower) ||
      member.email.toLowerCase().includes(searchLower) ||
      `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchLower)
    );
  });

  const onlineCount = members.filter(m => m.isOnline).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1128] font-dm-sans text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-2 border-blue-400/20 border-t-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1128] font-dm-sans text-white">
      <LandingNav />

      <div className="pt-28 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-red-400" />
                </div>
                <h1 className="font-syne font-bold text-3xl text-white">Administration</h1>
              </div>
              <p className="text-white/40">Gérez les membres de la plateforme</p>
            </div>
            <Link
              to="/admin/support"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Conversations
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-400/20 flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-white/40 text-sm">Total membres</span>
              </div>
              <p className="font-syne font-bold text-2xl text-white">{members.length}</p>
            </div>
            <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-green-500/10 border border-green-400/20 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-white/40 text-sm">En ligne</span>
              </div>
              <p className="font-syne font-bold text-2xl text-green-400">{onlineCount}</p>
            </div>
            <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-400/20 flex items-center justify-center">
                  <Inbox className="w-4 h-4 text-orange-400" />
                </div>
                <span className="text-white/40 text-sm">Messages non lus</span>
              </div>
              <p className={`font-syne font-bold text-2xl ${unreadCount > 0 ? 'text-orange-400' : 'text-white'}`}>{unreadCount}</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/30 w-4 h-4" />
            <input
              type="text"
              placeholder="Rechercher un membre (nom, prénom, email)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-10 py-3 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/30 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Members list */}
          {filteredMembers.length === 0 ? (
            <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-12 text-center">
              <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <h3 className="font-syne font-bold text-lg text-white mb-2">
                {searchTerm ? 'Aucun résultat' : 'Aucun membre'}
              </h3>
              <p className="text-white/40">
                {searchTerm
                  ? `Aucun membre ne correspond à "${searchTerm}".`
                  : "Il n'y a actuellement aucun membre inscrit."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 hover:border-blue-400/20 hover:bg-blue-500/[0.02] transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Avatar + Name */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-400/20 flex items-center justify-center flex-shrink-0">
                        <span className="font-syne font-bold text-sm text-blue-300">
                          {member.firstName[0]}{member.lastName[0]}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-syne font-bold text-white truncate">
                            {member.firstName} {member.lastName}
                          </h3>
                          {member.isAdmin && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/20">
                              <Shield className="w-3 h-3" />
                              Admin
                            </span>
                          )}
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            member.isOnline
                              ? 'bg-green-500/20 text-green-300 border border-green-500/20'
                              : 'bg-white/5 text-white/30 border border-white/5'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${member.isOnline ? 'bg-green-400' : 'bg-white/30'}`} />
                            {member.isOnline ? 'En ligne' : 'Hors ligne'}
                          </span>
                          {!member.isActive && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/20">
                              <UserX className="w-3 h-3" />
                              Désactivé
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pl-0 sm:pl-14">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-3.5 h-3.5 text-white/30" />
                        <span className="text-white/60">{member.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-3.5 h-3.5 text-white/30" />
                        <span className="text-white/60">{member.phone}</span>
                      </div>
                      {member.instagram && (
                        <div className="flex items-center gap-2 text-sm">
                          <Instagram className="w-3.5 h-3.5 text-white/30" />
                          <a
                            href={`https://instagram.com/${member.instagram}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400/70 hover:text-blue-300 transition-colors"
                          >
                            @{member.instagram}
                          </a>
                        </div>
                      )}
                      {member.rating && (
                        <div className="flex items-center gap-2 text-sm">
                          <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                          <span className="text-white/60">
                            {member.rating.toFixed(1)} ({member.ratingCount} avis)
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="text-sm text-white/30 space-y-1">
                      <p>Inscrit le {formatDate(member.createdAt)}</p>
                      {member.lastLoginAt && (
                        <p>Dernière connexion : {formatDate(member.lastLoginAt)}</p>
                      )}
                      {member.lastActivityAt && (
                        <p>Dernière activité : {formatDate(member.lastActivityAt)}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
    </div>
  );
}
