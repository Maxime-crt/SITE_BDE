import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, Calendar, MapPin, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { ticketsApi } from '../services/api';
import toast from 'react-hot-toast';

interface TicketData {
  id: string;
  qrCode: string;
  status: string;
  purchasePrice: number;
  purchasedAt: string;
  usedAt?: string;
  event: {
    id: string;
    name: string;
    location: string;
    startDate: string;
    endDate: string;
  };
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function MyTickets() {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
  const [brightness, setBrightness] = useState(false);

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    if (brightness && selectedTicket) {
      // Augmenter la luminosité de l'écran au maximum (via CSS)
      document.body.style.filter = 'brightness(1.5)';
    } else {
      document.body.style.filter = '';
    }

    return () => {
      document.body.style.filter = '';
    };
  }, [brightness, selectedTicket]);

  const loadTickets = async () => {
    try {
      const data = await ticketsApi.getMyTickets();
      setTickets(data);
    } catch (error: any) {
      toast.error('Erreur lors du chargement des billets');
    } finally {
      setLoading(false);
    }
  };

  const handleTicketClick = (ticket: TicketData) => {
    setSelectedTicket(ticket);
    setBrightness(true);
  };

  const closeQRCode = () => {
    setSelectedTicket(null);
    setBrightness(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price: number) => {
    return price === 0 ? 'Gratuit' : `${price.toFixed(2)} €`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement de vos billets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              to="/dashboard"
              className="inline-flex items-center text-blue-600 hover:text-blue-500 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au tableau de bord
            </Link>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-6 shadow-lg">
                <Ticket className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight mb-4">
                Mes billets
              </h1>
              <p className="text-xl text-muted-foreground">
                Tous vos billets pour les événements du BDE
              </p>
            </div>
          </div>

          {/* Liste des billets */}
          {tickets.length === 0 ? (
            <Card className="shadow-lg">
              <CardContent className="pt-6 text-center py-12">
                <Ticket className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg text-muted-foreground mb-4">
                  Vous n'avez aucun billet pour le moment
                </p>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Découvrir les événements
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <Card
                  key={ticket.id}
                  className="shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => handleTicketClick(ticket)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">
                          {ticket.event.name}
                        </CardTitle>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            {formatDate(ticket.event.startDate)}
                          </div>
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-2" />
                            {ticket.event.location}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="space-y-2">
                          <div className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                            ticket.status === 'VALID' ? 'bg-green-100 text-green-800' :
                            ticket.status === 'USED' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {ticket.status === 'VALID' ? 'Valide' :
                             ticket.status === 'USED' ? 'Utilisé' :
                             'Annulé'}
                          </div>
                          {ticket.status === 'USED' && ticket.usedAt && (
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              Scanné le {formatDate(ticket.usedAt)}
                            </div>
                          )}
                        </div>
                        <p className="mt-2 text-sm font-medium">
                          {formatPrice(ticket.purchasePrice)}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Acheté le {formatDate(ticket.purchasedAt)}
                      </p>
                      <button
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTicketClick(ticket);
                        }}
                      >
                        Afficher le QR Code
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal QR Code - Toujours en mode clair pour une meilleure lisibilité du QR code */}
      {selectedTicket && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={closeQRCode}
        >
          <div
            className="bg-white text-gray-900 rounded-lg p-8 max-w-md w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedTicket.event.name}</h2>
            <p className="text-sm text-gray-600 mb-2">
              Présentez ce QR code à l'entrée
            </p>
            <p className="text-lg font-semibold text-gray-900 mb-6">
              {selectedTicket.user.firstName} {selectedTicket.user.lastName}
            </p>

            <div className="bg-white p-4 rounded-lg inline-block mb-6 border-2 border-gray-200">
              <img
                src={(selectedTicket as any).qrCodeImage}
                alt="QR Code du billet"
                className="w-64 h-64"
              />
            </div>

            <div className="space-y-2 text-sm text-left mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Statut:</span>
                <span className={`font-medium ${
                  selectedTicket.status === 'VALID' ? 'text-green-600' :
                  selectedTicket.status === 'USED' ? 'text-gray-600' :
                  'text-red-600'
                }`}>
                  {selectedTicket.status === 'VALID' ? 'Valide' :
                   selectedTicket.status === 'USED' ? 'Utilisé' :
                   'Annulé'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Prix payé:</span>
                <span className="font-medium text-gray-900">{formatPrice(selectedTicket.purchasePrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date d'achat:</span>
                <span className="font-medium text-gray-900">{formatDate(selectedTicket.purchasedAt)}</span>
              </div>
              {selectedTicket.usedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Utilisé le:</span>
                  <span className="font-medium text-gray-900">{formatDate(selectedTicket.usedAt)}</span>
                </div>
              )}
            </div>

            <button
              onClick={closeQRCode}
              className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
