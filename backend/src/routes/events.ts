import express from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';
import { sessionManager } from '../services/sessionManager';

const router = express.Router();

// Lister tous les événements actifs
router.get('/', async (req: express.Request, res: express.Response) => {
  try {
    // Déterminer si l'utilisateur est admin
    const token = req.headers.authorization?.replace('Bearer ', '');
    let isAdmin = false;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        isAdmin = user?.isAdmin || false;
      } catch (error) {
        // Token invalide, continuer en tant qu'utilisateur non authentifié
      }
    }

    const whereClause: any = { isActive: true };

    // Si l'utilisateur n'est pas admin, filtrer les événements publiés
    if (!isAdmin) {
      whereClause.publishedAt = {
        not: null,
        lte: new Date() // Publié et date de publication passée
      };
    }

    const events = await prisma.event.findMany({
      where: whereClause,
      orderBy: { startDate: 'asc' },
      include: {
        rides: {
          include: {
            creator: {
              select: { firstName: true, lastName: true, rating: true }
            },
            participants: {
              where: { status: 'CONFIRMED' },
              select: { status: true }
            }
          }
        }
      }
    });

    res.json(events);
  } catch (error) {
    console.error('Erreur récupération événements:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer un nouvel événement (admin seulement)
router.post('/', authenticateToken, requireAdmin, [
  body('name').trim().isLength({ min: 3 }).withMessage('Nom requis (min 3 caractères)'),
  body('location').trim().isLength({ min: 3 }).withMessage('Lieu requis'),
  body('type').trim().isLength({ min: 1 }).withMessage('Type requis'),
  body('startDate').isISO8601().withMessage('Date de début valide requise'),
  body('endDate').isISO8601().withMessage('Date de fin valide requise')
], async (req: AuthRequest, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, location, type, customType, startDate, endDate, publishedAt } = req.body;

    const event = await prisma.event.create({
      data: {
        name,
        description,
        location,
        type,
        customType: type === 'Autre' ? customType : null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        publishedAt: publishedAt ? new Date(publishedAt) : null
      }
    });

    res.status(201).json(event);
  } catch (error) {
    console.error('Erreur création événement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer un événement spécifique avec ses trajets
router.get('/:id', async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        rides: {
          where: { status: { in: ['OPEN', 'FULL'] } },
          include: {
            creator: {
              select: { id: true, firstName: true, lastName: true, rating: true, phone: true }
            },
            participants: {
              include: {
                user: {
                  select: { id: true, firstName: true, lastName: true, rating: true, phone: true }
                }
              }
            }
          }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ error: 'Événement non trouvé' });
    }

    res.json(event);
  } catch (error) {
    console.error('Erreur récupération événement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer les trajets d'un événement
router.get('/:id/rides', async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;

    const rides = await prisma.ride.findMany({
      where: {
        eventId: id,
        status: { in: ['OPEN', 'FULL'] }
      },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, rating: true, phone: true }
        },
        participants: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, rating: true, phone: true }
            }
          }
        }
      },
      orderBy: { departureTime: 'asc' }
    });

    res.json(rides);
  } catch (error) {
    console.error('Erreur récupération trajets:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Admin: Voir tous les groupes formés (sans demande d'accès)
router.get('/admin/all-groups', authenticateToken, requireAdmin, async (req: AuthRequest, res: express.Response) => {
  try {
    const rides = await prisma.ride.findMany({
      include: {
        event: {
          select: { id: true, name: true, location: true, startDate: true }
        },
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true, rating: true, phone: true }
        },
        participants: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, rating: true, phone: true }
            }
          }
        }
      },
      orderBy: { departureTime: 'desc' }
    });

    res.json(rides);
  } catch (error) {
    console.error('Erreur récupération groupes admin:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Admin: Voir les profils de tous les membres avec leurs notes
router.get('/admin/members', authenticateToken, requireAdmin, async (req: AuthRequest, res: express.Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        rating: true,
        ratingCount: true,
        isActive: true,
        isOnline: true,
        lastLoginAt: true,
        lastActivityAt: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Récupérer les notes détaillées pour chaque utilisateur
    const usersWithDetailedRatings = await Promise.all(
      users.map(async (user) => {
        const ratings = await prisma.rating.findMany({
          where: { ratedId: user.id },
          include: {
            rated: {
              select: { firstName: true, lastName: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        });

        return {
          ...user,
          detailedRatings: ratings
        };
      })
    );

    res.json(usersWithDetailedRatings);
  } catch (error) {
    console.error('Erreur récupération membres admin:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Admin: Modifier un événement
router.put('/:id', authenticateToken, requireAdmin, [
  body('name').trim().isLength({ min: 3 }).withMessage('Nom requis (min 3 caractères)'),
  body('location').trim().isLength({ min: 3 }).withMessage('Lieu requis'),
  body('type').trim().isLength({ min: 1 }).withMessage('Type requis'),
  body('startDate').notEmpty().withMessage('Date de début requise'),
  body('endDate').notEmpty().withMessage('Date de fin requise')
], async (req: AuthRequest, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, description, location, type, customType, startDate, endDate, publishedAt } = req.body;

    // Vérifier que l'événement existe
    const existingEvent = await prisma.event.findUnique({ where: { id } });
    if (!existingEvent) {
      return res.status(404).json({ error: 'Événement non trouvé' });
    }

    // Gestion de publishedAt
    let newPublishedAt;
    if (publishedAt === null) {
      // Explicitement null pour dépublier
      newPublishedAt = null;
    } else if (publishedAt) {
      // Nouvelle date de publication
      newPublishedAt = new Date(publishedAt);
    } else {
      // Garder la valeur actuelle si publishedAt n'est pas fourni
      newPublishedAt = existingEvent.publishedAt;
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        name,
        description,
        location,
        type,
        customType: type === 'Autre' ? customType : null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        publishedAt: newPublishedAt
      }
    });

    res.json(updatedEvent);
  } catch (error) {
    console.error('Erreur modification événement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Admin: Supprimer un événement
router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: express.Response) => {
  try {
    const { id } = req.params;
    console.log('Tentative de suppression de l\'événement avec ID:', id);

    // Vérifier que l'événement existe (sans filtre de publication pour la suppression)
    const existingEvent = await prisma.event.findUnique({
      where: { id },
      include: { rides: { include: { participants: true } } }
    });

    console.log('Événement trouvé:', existingEvent ? 'Oui' : 'Non');

    if (!existingEvent) {
      return res.status(404).json({ error: 'Événement non trouvé' });
    }

    // Utiliser une transaction pour garantir la cohérence
    await prisma.$transaction(async (tx) => {
      // Supprimer d'abord toutes les notes liées aux trajets
      for (const ride of existingEvent.rides) {
        await tx.rating.deleteMany({
          where: { rideId: ride.id }
        });
      }

      // Supprimer tous les participants de tous les trajets
      for (const ride of existingEvent.rides) {
        await tx.rideParticipant.deleteMany({
          where: { rideId: ride.id }
        });
      }

      // Supprimer tous les trajets de l'événement
      await tx.ride.deleteMany({
        where: { eventId: id }
      });

      // Supprimer l'événement
      await tx.event.delete({
        where: { id }
      });
    });

    res.json({ message: 'Événement supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression événement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Admin: Obtenir les statistiques de connexion
router.get('/admin/connection-stats', authenticateToken, requireAdmin, async (req: AuthRequest, res: express.Response) => {
  try {
    const stats = await sessionManager.getConnectionStats();
    res.json(stats);
  } catch (error) {
    console.error('Erreur récupération stats connexion:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;