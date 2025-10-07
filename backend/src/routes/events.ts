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
        tickets: {
          where: { status: { in: ['VALID', 'USED'] } },
          select: { id: true }
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
  body('endDate').isISO8601().withMessage('Date de fin valide requise'),
  body('capacity').isInt({ min: 1 }).withMessage('Capacité requise (min 1)'),
  body('ticketPrice').isFloat({ min: 0 }).withMessage('Prix du billet requis (min 0)')
], async (req: AuthRequest, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, location, type, customType, startDate, endDate, publishedAt, capacity, ticketPrice } = req.body;

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
        ticketPrice: parseFloat(ticketPrice)
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
        tickets: {
          where: { status: { in: ['VALID', 'USED'] } },
          select: { id: true, userId: true }
        },
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

// Récupérer les billets disponibles pour un événement
router.get('/:id/tickets-available', async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        tickets: {
          where: { status: { in: ['VALID', 'USED'] } }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ error: 'Événement non trouvé' });
    }

    const availableTickets = event.capacity - event.tickets.length;

    res.json({
      capacity: event.capacity,
      sold: event.tickets.length,
      available: availableTickets
    });
  } catch (error) {
    console.error('Erreur récupération disponibilité:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Admin: Voir tous les billets vendus
router.get('/admin/all-tickets', authenticateToken, requireAdmin, async (req: AuthRequest, res: express.Response) => {
  try {
    const tickets = await prisma.ticket.findMany({
      include: {
        event: {
          select: { id: true, name: true, location: true, startDate: true }
        },
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true }
        }
      },
      orderBy: { purchasedAt: 'desc' }
    });

    res.json(tickets);
  } catch (error) {
    console.error('Erreur récupération billets admin:', error);
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
    const { name, description, location, type, customType, startDate, endDate, publishedAt, capacity, ticketPrice } = req.body;

    // Vérifier que l'événement existe
    const existingEvent = await prisma.event.findUnique({ where: { id } });
    if (!existingEvent) {
      return res.status(404).json({ error: 'Événement non trouvé' });
    }

    // Si l'événement est déjà publié, ne pas autoriser la modification du prix
    if (existingEvent.publishedAt && ticketPrice !== undefined && ticketPrice !== existingEvent.ticketPrice) {
      return res.status(400).json({ error: 'Impossible de modifier le prix d\'un événement déjà publié' });
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
        publishedAt: newPublishedAt,
        capacity: capacity !== undefined ? parseInt(capacity) : existingEvent.capacity,
        ticketPrice: ticketPrice !== undefined ? parseFloat(ticketPrice) : existingEvent.ticketPrice
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
        tickets: true,
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

      // Supprimer tous les billets de l'événement
      await tx.ticket.deleteMany({
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