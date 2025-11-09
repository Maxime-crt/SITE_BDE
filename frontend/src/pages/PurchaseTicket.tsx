import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ArrowLeft, Loader2, Calendar, MapPin, Clock } from 'lucide-react';
import { ticketsApi } from '../services/api';
import toast from 'react-hot-toast';
import type { Event } from '../types';
import { handleApiErrorWithLog } from '../utils/errorHandler';

// Initialiser Stripe uniquement si la clé est valide
const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
const stripePromise = stripeKey && stripeKey !== 'pk_test_placeholder_add_your_stripe_public_key_here'
  ? loadStripe(stripeKey)
  : null;

interface CheckoutFormProps {
  event: Event;
  clientSecret: string;
}

function CheckoutForm({ event, clientSecret }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setErrorMessage(null);

    try {
      // Confirmer le paiement
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/purchase-success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'Une erreur est survenue lors du paiement');
        setProcessing(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Paiement réussi, créer le billet
        try {
          await ticketsApi.confirmPayment(paymentIntent.id, event.id);
          toast.success('Billet acheté avec succès !');
          navigate(`/events/${event.id}`);
        } catch (apiError: any) {
          const errorMsg = apiError.response?.data?.error || 'Erreur lors de la création du billet';
          setErrorMessage(errorMsg);
          handleApiErrorWithLog(apiError, errorMsg, 'PurchaseTicket.handleSubmit');
          setProcessing(false);
        }
      }
    } catch (err: any) {
      setErrorMessage('Une erreur inattendue est survenue');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">{errorMessage}</p>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(-1)}
          disabled={processing}
          className="flex-1"
        >
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1"
        >
          {processing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Traitement...
            </>
          ) : (
            `Payer ${event.ticketPrice.toFixed(2)} €`
          )}
        </Button>
      </div>
    </form>
  );
}

export default function PurchaseTicket() {
  const { eventId } = useParams<{ eventId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { clientSecret, event } = location.state || {};

  // Vérifier si Stripe est configuré
  if (!stripePromise) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Configuration manquante</CardTitle>
            <CardDescription>
              Les paiements Stripe ne sont pas encore configurés. Veuillez contacter l'administrateur.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link to="/" className="text-primary hover:underline inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Retour au tableau de bord
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  useEffect(() => {
    if (!clientSecret || !event) {
      toast.error('Informations de paiement manquantes');
      navigate('/');
    }
  }, [clientSecret, event, navigate]);

  if (!clientSecret || !event) {
    return null;
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'flat' as const,
      variables: {
        colorPrimary: '#3b82f6',
        colorBackground: '#ffffff',
        colorText: '#0a0a0a',
        colorDanger: '#ef4444',
        fontFamily: 'system-ui, sans-serif',
        borderRadius: '0.5rem',
        focusBoxShadow: '0 0 0 1px #3b82f6',
        focusOutline: 'none',
      },
      rules: {
        // TOUS les inputs - Force couleur solide visible
        '.Input, .Input--invalid, .Input--complete': {
          backgroundColor: '#ffffff !important',
          border: '2px solid #e5e7eb !important',
          color: '#0a0a0a !important',
          padding: '12px',
          fontSize: '16px',
          boxShadow: 'none !important',
        },
        '.Input:hover': {
          borderColor: '#d1d5db !important',
        },
        '.Input:focus, .Input--focus': {
          borderColor: '#3b82f6 !important',
          outline: 'none !important',
          boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1) !important',
        },
        '.Input--invalid:focus': {
          borderColor: '#ef4444 !important',
          boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.1) !important',
        },

        // Tous les champs de texte à l'intérieur
        '.Input input, .Input--invalid input, .Input--complete input': {
          backgroundColor: '#ffffff !important',
          color: '#0a0a0a !important',
        },

        // Placeholder
        '.Input::placeholder, .Input input::placeholder': {
          color: '#9ca3af !important',
          opacity: '1 !important',
        },

        // Labels
        '.Label, .Label--resting, .Label--floating': {
          color: '#374151 !important',
          fontWeight: '600 !important',
          fontSize: '14px !important',
          marginBottom: '6px !important',
        },

        // Tous les variantes d'input Stripe
        'input, input[type="text"], input[type="tel"], input[type="email"]': {
          backgroundColor: '#ffffff !important',
          color: '#0a0a0a !important',
          border: 'none !important',
        },

        // Conteneur de champ
        '.FormFieldInput, .FormFieldInput--resting': {
          backgroundColor: '#ffffff !important',
          border: '2px solid #e5e7eb !important',
          borderRadius: '0.5rem !important',
        },

        // Tous les éléments p-*
        '.p-Input, .p-Input--invalid, .p-Input--complete': {
          backgroundColor: '#ffffff !important',
          border: '2px solid #e5e7eb !important',
          color: '#0a0a0a !important',
        },
        '.p-Input:focus': {
          borderColor: '#3b82f6 !important',
          boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1) !important',
        },
        '.p-Input-input, .p-Input input': {
          backgroundColor: '#ffffff !important',
          color: '#0a0a0a !important',
        },

        // Champs carte, CVC, expiration
        '.p-CardNumberInput, .p-CardNumberInput-input': {
          backgroundColor: '#ffffff !important',
          color: '#0a0a0a !important',
        },
        '.p-CardCvcInput, .p-CardCvcInput-input': {
          backgroundColor: '#ffffff !important',
          color: '#0a0a0a !important',
        },
        '.p-CardExpiryInput, .p-CardExpiryInput-input': {
          backgroundColor: '#ffffff !important',
          color: '#0a0a0a !important',
        },

        // Fieldset
        '.p-Fieldset, .p-Fieldset-input': {
          backgroundColor: '#ffffff !important',
          color: '#0a0a0a !important',
        },

        // Field générique
        '.p-Field': {
          marginBottom: '16px',
        },

        // Onglets
        '.Tab, .Tab--resting': {
          backgroundColor: '#f9fafb !important',
          border: '2px solid #e5e7eb !important',
          color: '#6b7280 !important',
        },
        '.Tab:hover': {
          backgroundColor: '#f3f4f6 !important',
          color: '#374151 !important',
        },
        '.Tab--selected, .Tab--selected:hover': {
          backgroundColor: '#3b82f6 !important',
          color: '#ffffff !important',
          borderColor: '#3b82f6 !important',
        },

        // Select
        '.p-Select, select': {
          backgroundColor: '#ffffff !important',
          border: '2px solid #e5e7eb !important',
          color: '#0a0a0a !important',
          padding: '12px !important',
        },
        '.p-Select:focus, select:focus': {
          borderColor: '#3b82f6 !important',
          outline: 'none !important',
        },
        '.p-Select option, select option': {
          backgroundColor: '#ffffff !important',
          color: '#0a0a0a !important',
        },

        // Messages d'erreur
        '.Error, .Error--resting': {
          color: '#ef4444 !important',
          fontSize: '13px !important',
        },

        // Tout le reste - force en blanc
        '*': {
          fontFamily: 'system-ui, sans-serif !important',
        },
      },
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              to={`/events/${eventId}`}
              className="inline-flex items-center text-blue-600 hover:text-blue-500 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à l'événement
            </Link>

            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight mb-4">
                Paiement du billet
              </h1>
              <p className="text-xl text-muted-foreground">
                {event.name}
              </p>
            </div>
          </div>

          {/* Résumé de la commande */}
          <Card className="shadow-lg mb-6">
            <CardHeader>
              <CardTitle>Résumé de la commande</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Nom de l'événement */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">{event.name}</h3>
                </div>

                {/* Détails de l'événement */}
                <div className="space-y-2 pb-4 border-b">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Date et heure</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(event.startDate).toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Horaires</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(event.startDate).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })} - {new Date(event.endDate).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Lieu</p>
                      <p className="text-sm text-muted-foreground">{event.location}</p>
                    </div>
                  </div>
                </div>

                {/* Prix */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Prix du billet</span>
                    <span className="font-medium">{event.ticketPrice.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Frais de service</span>
                    <span className="font-medium">0,00 €</span>
                  </div>
                  <div className="border-t pt-3 mt-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total à payer</span>
                      <span className="text-primary">{event.ticketPrice.toFixed(2)} €</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Formulaire de paiement */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Informations de paiement</CardTitle>
              <CardDescription>
                Paiement sécurisé par Stripe. Aucune information de carte n'est stockée sur nos serveurs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Elements stripe={stripePromise} options={options}>
                <CheckoutForm event={event} clientSecret={clientSecret} />
              </Elements>
            </CardContent>
          </Card>

          {/* Informations de sécurité */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>🔒 Paiement sécurisé et crypté</p>
            <p className="mt-1">Vos informations bancaires ne sont jamais stockées sur nos serveurs</p>
          </div>
        </div>
      </div>
    </div>
  );
}
