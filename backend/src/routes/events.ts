import express from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';
import { sessionManager } from '../services/sessionManager';
import { geocodeAddress } from '../services/geocodingService';

const router = express.Router();

// Lister tous les événements actifs
router.get('/', async (req: express.Request, res: express.Response) => {
  try {
    // Déterminer si l'utilisateur est admin et récupérer son ID
    const token = req.headers.authorization?.replace('Bearer ', '');
    let isAdmin = false;
    let userId: string | null = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        isAdmin = user?.isAdmin || false;
        userId = decoded.userId;
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
      orderBy: { startDate: 'asc' }
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
  body('endDate').isISO8601().withMessage('Date de fin valide requise'),
  body('capacity').isInt({ min: 1 }).withMessage('Capacité requise (min 1)')
], async (req: AuthRequest, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, location, type, customType, startDate, endDate, publishedAt, capacity } = req.body;

    // Géocoder l'adresse pour obtenir les coordonnées GPS
    let latitude: number | null = null;
    let longitude: number | null = null;

    if (location) {
      const geocodeResult = await geocodeAddress(location);
      if (geocodeResult) {
        latitude = geocodeResult.latitude;
        longitude = geocodeResult.longitude;
        console.log(`Événement géocodé: ${location} -> ${latitude}, ${longitude}`);
      } else {
        console.warn(`Impossible de géocoder l'adresse: ${location}`);
      }
    }

    const event = await prisma.event.create({
      data: {
        name,
        description,
        location,
        type,
        customType: type === 'Autre' ? customType : null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        publishedAt: publishedAt ? new Date(publishedAt) : null,
        capacity: parseInt(capacity),
        latitude,
        longitude
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
        ratings: {
          include: {
            user: {
              select: { firstName: true, lastName: true }
            }
          },
          orderBy: { createdAt: 'desc' }
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

// Admin: Voir les profils de tous les membres
router.get('/admin/members', authenticateToken, requireAdmin, async (req: AuthRequest, res: express.Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        isAdmin: true,
        isActive: true,
        isOnline: true,
        lastLoginAt: true,
        lastActivityAt: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(users);
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
    const { name, description, location, type, customType, startDate, endDate, publishedAt, capacity } = req.body;

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

    // Géocoder l'adresse si elle a changé
    let latitude = existingEvent.latitude;
    let longitude = existingEvent.longitude;

    if (location && location !== existingEvent.location) {
      const geocodeResult = await geocodeAddress(location);
      if (geocodeResult) {
        latitude = geocodeResult.latitude;
        longitude = geocodeResult.longitude;
        console.log(`Événement mis à jour et géocodé: ${location} -> ${latitude}, ${longitude}`);
      } else {
        console.warn(`Impossible de géocoder l'adresse: ${location}`);
      }
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
        publishedAt: newPublishedAt,
        capacity: capacity !== undefined ? parseInt(capacity) : existingEvent.capacity,
        latitude,
        longitude
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

    // Vérifier que l'événement existe
    const existingEvent = await prisma.event.findUnique({
      where: { id },
      include: {
        ratings: true
      }
    });

    console.log('Événement trouvé:', existingEvent ? 'Oui' : 'Non');

    if (!existingEvent) {
      return res.status(404).json({ error: 'Événement non trouvé' });
    }

    // Utiliser une transaction pour garantir la cohérence
    await prisma.$transaction(async (tx) => {
      // Supprimer toutes les notes de l'événement
      await tx.eventRating.deleteMany({
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