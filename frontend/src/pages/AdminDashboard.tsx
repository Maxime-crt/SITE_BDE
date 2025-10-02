import { useState, useEffect } from 'react';
import { Shield, Users, Trash2, Star, Phone, Mail, Search, MessageCircle, QrCode } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { adminApi } from '../services/api';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
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

interface AdminRide {
  id: string;
  eventId: string;
  destination: string;
  departureTime: string;
  maxParticipants: number;
  cost: number | null;
  status: string;
  event: {
    id: string;
    name: string;
    location: string;
    startDate: string;
  };
  creator: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    rating: number | null;
    phone: string;
  };
  participants: Array<{
    id: string;
    status: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      rating: number | null;
      phone: string;
    };
  }>;
}

export default function AdminDashboard() {
  const [members, setMembers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Charger les données initiales
  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getAllMembers();
      setMembers(data);
    } catch (error: any) {
      console.error('Erreur lors du chargement des membres:', error);
      toast.error(error.response?.data?.error || 'Erreur lors du chargement des membres');
    } finally {
      setLoading(false);
    }
  };

  const removeUserFromRide = async (rideId: string, userId: string, userName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir retirer ${userName} de ce trajet ?`)) {
      return;
    }

    try {
      await adminApi.removeUserFromRide(rideId, userId);
      toast.success(`${userName} a été retiré du trajet`);
      fetchGroups(); // Refresh the data
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression');
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

  // Filtrer les membres selon le terme de recherche
  const filteredMembers = members.filter(member => {
    const searchLower = searchTerm.toLowerCase();
    return (
      member.firstName.toLowerCase().includes(searchLower) ||
      member.lastName.toLowerCase().includes(searchLower) ||
      member.email.toLowerCase().includes(searchLower) ||
      `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Shield className="w-8 h-8 text-red-500" />
            <h1 className="text-3xl font-bold">Administration</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button asChild variant="outline">
              <Link to="/admin/scan" className="flex items-center space-x-2">
                <QrCode className="w-4 h-4" />
                <span>Scanner billets</span>
              </Link>
            </Button>
            <Button asChild>
              <Link to="/admin/support" className="flex items-center space-x-2">
                <MessageCircle className="w-4 h-4" />
                <span>Conversations</span>
              </Link>
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground">
          Gérez les membres de la plateforme
        </p>
      </div>

      {/* Members Section */}
        <div className="space-y-4">
          {/* Barre de recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Rechercher un membre (nom, prénom, email)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {filteredMembers.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? 'Aucun membre ne correspond à votre recherche' : 'Aucun membre trouvé'}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm
                  ? `Aucun membre ne correspond au terme "${searchTerm}". Essayez un autre terme de recherche.`
                  : 'Il n\'y a actuellement aucun membre inscrit.'
                }
              </p>
            </Card>
          ) : (
            filteredMembers.map((member) => (
              <Card key={member.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold">{member.firstName} {member.lastName}</h3>
                      <div className="flex items-center space-x-2">
                        <Badge variant={member.isOnline ? "default" : "secondary"}>
                          {member.isOnline ? "En ligne" : "Hors ligne"}
                        </Badge>
                        {!member.isActive && (
                          <Badge variant="destructive">Compte désactivé</Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm">
                          <Mail className="w-4 h-4" />
                          <span>{member.email}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <Phone className="w-4 h-4" />
                          <span>{member.phone}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span>
                            {member.rating ? member.rating.toFixed(1) : '--'}
                            ({member.ratingCount} avis)
                          </span>
                        </div>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        <p>Inscrit le: {formatDate(member.createdAt)}</p>
                        {member.lastLoginAt && (
                          <p>Dernière connexion: {formatDate(member.lastLoginAt)}</p>
                        )}
                        {member.lastActivityAt && (
                          <p>Dernière activité: {formatDate(member.lastActivityAt)}</p>
                        )}
                        {member.detailedRatings && member.detailedRatings.length > 0 && (
                          <div className="mt-2">
                            <p className="font-medium">Derniers avis:</p>
                            <div className="space-y-1 mt-1">
                              {member.detailedRatings.slice(0, 3).map((rating) => (
                                <div key={rating.id} className="flex items-center space-x-2">
                                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                  <span>{rating.rating}/5</span>
                                  {rating.comment && <span className="truncate">- {rating.comment}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
    </div>
  );
}