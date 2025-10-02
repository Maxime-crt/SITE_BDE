import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Camera, CheckCircle, XCircle, User, Calendar, MapPin, Clock, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ticketsApi } from '../services/api';
import toast from 'react-hot-toast';

interface ScannedTicket {
  id: string;
  status: string;
  purchasePrice: number;
  purchasedAt: string;
  usedAt?: string;
  event: {
    id: string;
    name: string;
    location: string;
    startDate: string;
  };
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}

export default function ScanTicket() {
  const [scanning, setScanning] = useState(true);
  const [lastScanData, setLastScanData] = useState('');
  const [currentTicket, setCurrentTicket] = useState<ScannedTicket | null>(null);
  const [scanResult, setScanResult] = useState<'success' | 'error' | 'already-used' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleScan = async (qrText: string) => {
    // Éviter les scans en double
    if (!qrText || qrText === lastScanData || !scanning) return;

    console.log('📱 QR Code scanné:', qrText);

    setLastScanData(qrText);
    setScanning(false);

    // Annuler le timeout précédent s'il existe
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }

    try {
      console.log('🔍 Envoi de la requête scan avec:', qrText);
      const response = await ticketsApi.scanQRCode(qrText);

      setCurrentTicket(response.ticket);
      setScanResult('success');
      toast.success(`Billet validé pour ${response.ticket.user.firstName} ${response.ticket.user.lastName}`);

      // Son de succès (optionnel)
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiDYIGGS36+eXSAwNS6Tn7rVdGgU2jdXxxnMoBS1+zPLaizsKFmS46+mYTw0NTqzn7bheFwU7k9f0yXEmBSl7yvLbiTsLF2O56+aXSwwLSKXh8LVhGQc5kdj0yXAmBSh5yPLbiToKFWG36+aVSAwKRqPe8bJgGQU2i9Xzx3ElBSl6yPLbjDwLGGe86+aVRwsJQ5/d8K9dGAU0iNLzx3ElBSh4x/LbjDsKFmS56+aVSQwLSabl7rdgGQU5k9j0y3MnBSp7y/Pajz0MGWq+7OebSQwMSqfm77dhGgU7ldr0zHQoBSx+zfLbkD8NHG7B7uicSw0NTKHR8blkGwU9md30z3YpBjCBzvHhjz8OH3PG7+meTQwMSqfj7rdiGQU6lNr0zHQoBSx+zfLbkD8NHG7B7uicSw0NTKHR8blkGwU9md30z3YpBjCBzvHhjz8OH3PG7+meTQwMSqfj7rdiGQU6lNr0zHQoBSx+zfLbkD8NHG7B7uicSw0NTKHR8blkGwU9md30z3YpBjCBzvHhjz8OH3PG7+meTQwMSqfj7rdiGQU6lNr0zHQoBSx+zfLbkD8NHG7B7uicSw0NTKHR8blkGwU9md30z3YpBjCBzvHhjz8OH3PG7+meTQwMSqfj7rdiGQU6lNr0zHQoBSx+zfLbkD8NHG7B7uicSw0NTKHR8blkGwU9md30z3YpBjCBzvHhjz8OH3PG7+meTQwMSqfj7rdiGQU6lNr0zHQoBSx+zfLbkD8NHG7B7uicSw0NTKHR8blkGwU9md30z3YpBjCBzvHhjz8OH3PG7+meTQwMSqfj7rdiGQU6lNr0zHQoBSx+zfLbkD8NHG7B7uicSw0NTKHR8blkGwU9md30z3YpBjCBzvHhjz8OH3PG7+meTQwMSqfj7g==');
      audio.play().catch(() => {});

    } catch (error: any) {
      console.error('Erreur lors du scan:', error);

      if (error.response?.data?.error === 'Billet déjà utilisé') {
        setScanResult('already-used');
        setCurrentTicket(error.response.data.ticket);
        setErrorMessage(`Billet déjà scanné le ${new Date(error.response.data.ticket.usedAt).toLocaleString('fr-FR')}`);
        toast.error('Ce billet a déjà été scanné !');
      } else if (error.response?.data?.error === 'Billet annulé') {
        setScanResult('error');
        setCurrentTicket(error.response.data.ticket);
        setErrorMessage('Ce billet a été annulé');
        toast.error('Billet annulé');
      } else {
        setScanResult('error');
        setErrorMessage(error.response?.data?.error || 'Erreur lors du scan');
        toast.error(errorMessage);
      }
    }

    // Réactiver le scan après 3 secondes
    scanTimeoutRef.current = setTimeout(() => {
      setScanning(true);
      setCurrentTicket(null);
      setScanResult(null);
      setLastScanData('');
    }, 3000);
  };

  const handleError = (error: Error) => {
    console.error('Erreur du scanner:', error);
    toast.error('Erreur lors de l\'accès à la caméra');
  };

  const resetScanner = () => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
    setScanning(true);
    setCurrentTicket(null);
    setScanResult(null);
    setLastScanData('');
  };

  const formatPrice = (price: number) => {
    return price === 0 ? 'Gratuit' : `${price.toFixed(2)} €`;
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              to="/admin"
              className="inline-flex items-center text-blue-600 hover:text-blue-500 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au tableau de bord admin
            </Link>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-6 shadow-lg">
                <Camera className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight mb-4">
                Scanner les billets
              </h1>
              <p className="text-xl text-muted-foreground">
                Pointez la caméra vers le QR code du billet
              </p>
            </div>
          </div>

          {/* Scanner */}
          <Card className="shadow-2xl mb-6">
            <CardContent className="p-6">
              <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
                {scanning ? (
                  <Scanner
                    onScan={(result) => {
                      if (result && result.length > 0) {
                        handleScan(result[0].rawValue);
                      }
                    }}
                    onError={handleError}
                    constraints={{
                      facingMode: 'environment'
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-black">
                    <div className="text-white text-center">
                      <div className="animate-pulse">Traitement...</div>
                    </div>
                  </div>
                )}

                {/* Overlay de guidage */}
                {scanning && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 border-8 border-white/20"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-4 border-primary rounded-lg"></div>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800 dark:text-blue-300">
                    <p className="font-medium mb-1">Instructions :</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Assurez-vous que le QR code est bien visible</li>
                      <li>Maintenez le téléphone stable</li>
                      <li>Le scan se fait automatiquement</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Résultat du scan */}
          {scanResult && currentTicket && (
            <Card className={`shadow-xl border-2 ${
              scanResult === 'success'
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                : 'border-red-500 bg-red-50 dark:bg-red-900/20'
            }`}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  {scanResult === 'success' ? (
                    <>
                      <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                      <span className="text-green-800 dark:text-green-300">Billet validé !</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                      <span className="text-red-800 dark:text-red-300">
                        {scanResult === 'already-used' ? 'Billet déjà utilisé' : 'Billet invalide'}
                      </span>
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Informations participant */}
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                    <div className="flex items-center space-x-3 mb-3">
                      <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <div>
                        <p className="font-semibold text-lg">
                          {currentTicket.user.firstName} {currentTicket.user.lastName}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{currentTicket.user.email}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{currentTicket.user.phone}</p>
                      </div>
                    </div>
                  </div>

                  {/* Informations événement */}
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg space-y-2">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <span className="text-sm font-medium">{currentTicket.event.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">{currentTicket.event.location}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(currentTicket.event.startDate)}
                      </span>
                    </div>
                  </div>

                  {/* Prix */}
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Prix payé</p>
                    <p className="text-xl font-bold">{formatPrice(currentTicket.purchasePrice)}</p>
                  </div>

                  {/* Message d'erreur */}
                  {scanResult !== 'success' && errorMessage && (
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border-l-4 border-red-500">
                      <p className="text-red-800 dark:text-red-300 font-medium">{errorMessage}</p>
                    </div>
                  )}

                  {/* Bouton de nouveau scan */}
                  <Button
                    onClick={resetScanner}
                    className="w-full"
                    variant={scanResult === 'success' ? 'default' : 'destructive'}
                  >
                    Scanner un autre billet
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
