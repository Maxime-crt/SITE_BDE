import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { eventsApi, eventRatingsApi } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ArrowLeft, Star } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RateEvent() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsApi.getById(eventId!),
    enabled: !!eventId
  });

  const { data: existingRating } = useQuery({
    queryKey: ['my-rating', eventId],
    queryFn: () => eventRatingsApi.getMyRating(eventId!),
    enabled: !!eventId,
    retry: false
  });

  useEffect(() => {
    if (existingRating) {
      setRating(existingRating.rating);
      setComment(existingRating.comment || '');
    }
  }, [existingRating]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error('Veuillez sélectionner une note');
      return;
    }

    setSubmitting(true);
    try {
      await eventRatingsApi.create({
        eventId: eventId!,
        rating,
        comment: comment.trim() || undefined
      });
      toast.success(existingRating ? 'Note modifiée avec succès !' : 'Merci pour votre avis !');
      navigate(`/events/${eventId}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'envoi de la note');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer votre note ?')) {
      return;
    }

    setSubmitting(true);
    try {
      await eventRatingsApi.delete(eventId!);
      toast.success('Note supprimée avec succès');
      navigate(`/events/${eventId}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Événement introuvable</h2>
          <Link to="/dashboard" className="text-primary hover:underline">
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    );
  }

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
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-6 shadow-lg">
                <Star className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight mb-4">
                {existingRating ? 'Modifier votre note' : 'Noter l\'événement'}
              </h1>
              <p className="text-xl text-muted-foreground">
                {event.name}
              </p>
            </div>
          </div>

          {/* Formulaire de notation */}
          <Card className="shadow-2xl">
            <CardHeader>
              <CardTitle>Votre avis</CardTitle>
              <CardDescription>
                Aidez-nous à améliorer nos événements en partageant votre expérience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Sélection de la note */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Note *
                  </label>
                  <div className="flex items-center justify-center gap-2 py-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="transition-transform hover:scale-110 focus:outline-none"
                      >
                        <Star
                          className={`w-12 h-12 ${
                            star <= (hoverRating || rating)
                              ? 'text-yellow-500 fill-yellow-500'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    {rating === 0 && 'Cliquez pour noter'}
                    {rating === 1 && 'Très décevant'}
                    {rating === 2 && 'Décevant'}
                    {rating === 3 && 'Correct'}
                    {rating === 4 && 'Bien'}
                    {rating === 5 && 'Excellent'}
                  </p>
                </div>

                {/* Commentaire */}
                <div className="space-y-2">
                  <label htmlFor="comment" className="text-sm font-medium">
                    Commentaire (optionnel)
                  </label>
                  <textarea
                    id="comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Partagez votre expérience..."
                    rows={5}
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {comment.length}/500
                  </p>
                </div>

                {/* Boutons */}
                <div className="flex gap-3">
                  {existingRating && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={submitting}
                      className="flex-1"
                    >
                      Supprimer ma note
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(`/events/${eventId}`)}
                    disabled={submitting}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting || rating === 0}
                    className="flex-1"
                  >
                    {submitting ? 'Envoi...' : existingRating ? 'Modifier' : 'Envoyer'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
