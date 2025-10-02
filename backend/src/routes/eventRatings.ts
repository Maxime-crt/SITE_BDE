import express from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../utils/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// POST /api/event-ratings - Créer ou mettre à jour une note pour un événement
router.post('/', authenticateToken, [
  body('eventId').notEmpty().withMessage('ID de l\'événement requis'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Note entre 1 et 5 requise'),
  body('comment').optional().trim()
], async (req: AuthRequest, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { eventId, rating, comment } = req.body;
    const userId = req.user!.id;

    // Vérifier que l'événement existe et qu'il est terminé
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      return res.status(404).json({ error: 'Événement non trouvé' });
    }

    // Vérifier que l'événement est terminé
    if (new Date() < new Date(event.endDate)) {
      return res.status(400).json({ error: 'Vous ne pouvez noter que les événements terminés' });
    }

    // Vérifier que l'utilisateur a un billet pour cet événement
    const ticket = await prisma.ticket.findFirst({
      where: {
        eventId,
        userId,
        status: { in: ['VALID', 'USED'] }
      }
    });

    if (!ticket) {
      return res.status(403).json({ error: 'Vous devez avoir un billet pour noter cet événement' });
    }

    // Vérifier si une note existe déjà
    const existingRating = await prisma.eventRating.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId
        }
      }
    });

    let eventRating;
    if (existingRating) {
      // Mettre à jour la note existante
      eventRating = await prisma.eventRating.update({
        where: {
          eventId_userId: {
            eventId,
            userId
          }
        },
        data: {
          rating,
          comment
        }
      });
    } else {
      // Créer une nouvelle note
      eventRating = await prisma.eventRating.create({
        data: {
          eventId,
          userId,
          rating,
          comment
        }
      });
    }

    // Recalculer la note moyenne de l'événement
    const allRatings = await prisma.eventRating.findMany({
      where: { eventId }
    });

    const averageRating = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;

    await prisma.event.update({
      where: { id: eventId },
      data: {
        rating: averageRating,
        ratingCount: allRatings.length
      }
    });

    res.json(eventRating);
  } catch (error) {
    console.error('Erreur lors de la création de la note:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/event-ratings/:eventId - Récupérer toutes les notes d'un événement
router.get('/:eventId', async (req: express.Request, res: express.Response) => {
  try {
    const { eventId } = req.params;

    const ratings = await prisma.eventRating.findMany({
      where: { eventId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(ratings);
  } catch (error) {
    console.error('Erreur lors de la récupération des notes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/event-ratings/:eventId/my-rating - Récupérer la note de l'utilisateur connecté
router.get('/:eventId/my-rating', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const { eventId } = req.params;
    const userId = req.user!.id;

    const rating = await prisma.eventRating.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId
        }
      }
    });

    if (!rating) {
      return res.status(404).json({ error: 'Aucune note trouvée' });
    }

    res.json(rating);
  } catch (error) {
    console.error('Erreur lors de la récupération de la note:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/event-ratings/:eventId - Supprimer sa note
router.delete('/:eventId', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const { eventId } = req.params;
    const userId = req.user!.id;

    await prisma.eventRating.delete({
      where: {
        eventId_userId: {
          eventId,
          userId
        }
      }
    });

    // Recalculer la note moyenne de l'événement
    const allRatings = await prisma.eventRating.findMany({
      where: { eventId }
    });

    const averageRating = allRatings.length > 0
      ? allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length
      : null;

    await prisma.event.update({
      where: { id: eventId },
      data: {
        rating: averageRating,
        ratingCount: allRatings.length
      }
    });

    res.json({ message: 'Note supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la note:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
