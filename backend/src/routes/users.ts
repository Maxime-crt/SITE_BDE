import express from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../utils/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Noter un utilisateur après un trajet
router.post('/:id/rate', authenticateToken, [
  body('rideId').notEmpty().withMessage('ID trajet requis'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Note entre 1 et 5 requise'),
  body('comment').optional().trim().isLength({ max: 500 }).withMessage('Commentaire trop long')
], async (req: AuthRequest, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { rideId, rating, comment } = req.body;

    if (id === req.userId) {
      return res.status(400).json({ error: 'Vous ne pouvez pas vous noter vous-même' });
    }

    // Vérifier que les deux utilisateurs ont participé au même trajet
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        participants: true
      }
    });

    if (!ride) {
      return res.status(404).json({ error: 'Trajet non trouvé' });
    }

    const raterParticipated = ride.creatorId === req.userId ||
      ride.participants.some(p => p.userId === req.userId);
    const ratedParticipated = ride.creatorId === id ||
      ride.participants.some(p => p.userId === id);

    if (!raterParticipated || !ratedParticipated) {
      return res.status(400).json({ error: 'Vous ne pouvez noter que les personnes du même trajet' });
    }

    // Vérifier si déjà noté
    const existingRating = await prisma.rating.findUnique({
      where: {
        ratedId_raterId_rideId: {
          ratedId: id,
          raterId: req.userId!,
          rideId
        }
      }
    });

    if (existingRating) {
      return res.status(400).json({ error: 'Vous avez déjà noté cette personne pour ce trajet' });
    }

    // Créer la note
    const newRating = await prisma.rating.create({
      data: {
        ratedId: id,
        raterId: req.userId!,
        rideId,
        rating,
        comment
      }
    });

    // Mettre à jour la moyenne de l'utilisateur noté
    const userRatings = await prisma.rating.findMany({
      where: { ratedId: id }
    });

    const averageRating = userRatings.reduce((sum, r) => sum + r.rating, 0) / userRatings.length;

    await prisma.user.update({
      where: { id },
      data: {
        rating: averageRating,
        ratingCount: userRatings.length
      }
    });

    res.status(201).json(newRating);
  } catch (error) {
    console.error('Erreur notation utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer les trajets d'un utilisateur
router.get('/:id/rides', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Trajets créés
    const createdRides = await prisma.ride.findMany({
      where: { creatorId: id },
      include: {
        event: { select: { name: true, location: true } },
        participants: {
          include: {
            user: { select: { firstName: true, lastName: true, rating: true } }
          }
        }
      },
      orderBy: { departureTime: 'desc' }
    });

    // Trajets rejoints
    const joinedRides = await prisma.rideParticipant.findMany({
      where: { userId: id },
      include: {
        ride: {
          include: {
            event: { select: { name: true, location: true } },
            creator: { select: { firstName: true, lastName: true, rating: true } }
          }
        }
      },
      orderBy: { joinedAt: 'desc' }
    });

    res.json({
      created: createdRides,
      joined: joinedRides
    });
  } catch (error) {
    console.error('Erreur récupération trajets utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;