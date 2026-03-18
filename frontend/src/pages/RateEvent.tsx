import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { eventsApi, eventRatingsApi } from '../services/api';
import { ArrowLeft, Star, MessageSquare, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { handleApiErrorWithLog } from '../utils/errorHandler';
import LandingNav from '../components/LandingNav';
import ConfirmDialog from '../components/ConfirmDialog';

export default function RateEvent() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

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
      handleApiErrorWithLog(error, 'Erreur lors de l\'envoi de la note', 'RateEvent.handleSubmit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await eventRatingsApi.delete(eventId!);
      toast.success('Note supprimée avec succès');
      navigate(`/events/${eventId}`);
    } catch (error: any) {
      handleApiErrorWithLog(error, 'Erreur lors de la suppression', 'RateEvent.handleDelete');
    } finally {
      setSubmitting(false);
    }
  };

  const ratingLabels = ['', 'Très décevant', 'Décevant', 'Correct', 'Bien', 'Excellent'];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a1128] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-400 border-t-transparent" />
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

  return (
    <div className="min-h-screen bg-[#0a1128] font-dm-sans text-white">
      <LandingNav />

      <div className="pt-28 pb-16 max-w-2xl mx-auto px-6 md:px-10">
        {/* Back link */}
        <button
          onClick={() => navigate(`/events/${eventId}`)}
          className="flex items-center gap-2 text-white/40 hover:text-blue-400 transition-colors text-sm mb-10"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à l'événement
        </button>

        {/* Header */}
        <div className="mb-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-400/20 flex items-center justify-center mx-auto mb-6">
            <Star className="w-8 h-8 text-yellow-400" />
          </div>
          <h1 className="font-syne font-bold text-3xl md:text-4xl mb-3">
            {existingRating ? 'Modifier votre note' : 'Noter l\'événement'}
          </h1>
          <p className="text-white/40 text-lg">{event.name}</p>
        </div>

        {/* Rating form card */}
        <form onSubmit={handleSubmit}>
          <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-8">
            {/* Section title */}
            <div className="mb-8">
              <h2 className="font-syne font-bold text-lg mb-1">Votre avis</h2>
              <p className="text-white/30 text-sm">Aidez-nous à améliorer nos événements en partageant votre expérience</p>
            </div>

            {/* Star rating */}
            <div className="mb-8">
              <label className="text-sm font-medium text-white/60 mb-3 block">Note *</label>
              <div className="flex items-center justify-center gap-3 py-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-all hover:scale-125 focus:outline-none"
                  >
                    <Star
                      className={`w-10 h-10 md:w-12 md:h-12 transition-colors ${
                        star <= (hoverRating || rating)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-white/10'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-center text-sm text-white/40 mt-2">
                {rating === 0
                  ? 'Cliquez pour noter'
                  : ratingLabels[rating]}
              </p>
            </div>

            {/* Separator */}
            <div className="border-t border-white/5 my-8" />

            {/* Comment */}
            <div className="mb-8">
              <label htmlFor="comment" className="flex items-center gap-2 text-sm font-medium text-white/60 mb-3">
                <MessageSquare className="w-4 h-4" />
                Commentaire (optionnel)
              </label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Partagez votre expérience..."
                rows={4}
                className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-400/50 focus:bg-white/[0.06] transition-all resize-none"
                maxLength={500}
              />
              <p className="text-xs text-white/20 text-right mt-2">
                {comment.length}/500
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              {existingRating && (
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-sm font-bold disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate(`/events/${eventId}`)}
                disabled={submitting}
                className="flex-1 px-5 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white/50 hover:text-white hover:bg-white/[0.08] transition-all text-sm font-bold font-syne disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting || rating === 0}
                className="flex-1 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-syne font-bold text-sm transition-all disabled:opacity-50 disabled:hover:bg-blue-600"
              >
                {submitting ? 'Envoi...' : existingRating ? 'Modifier' : 'Envoyer'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Supprimer votre note"
        message="Êtes-vous sûr de vouloir supprimer votre note ?"
        confirmText="Supprimer"
        cancelText="Annuler"
        type="danger"
      />
    </div>
  );
}
