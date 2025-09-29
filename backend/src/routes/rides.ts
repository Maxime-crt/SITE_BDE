import express from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../utils/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';

const router = express.Router();

// Créer un nouveau trajet
router.post('/', authenticateToken, [
  body('eventId').notEmpty().withMessage('ID événement requis'),
  body('destination').trim().isLength({ min: 3 }).withMessage('Destination requise'),
  body('departureTime').isISO8601().withMessage('Heure de départ valide requise'),
  body('maxParticipants').isInt({ min: 2, max: 8 }).withMessage('Nombre de participants entre 2 et 8'),
  body('cost').optional().isFloat({ min: 0, max: 5 }).withMessage('Le coût doit être entre 0 et 5€')
], async (req: AuthRequest, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { eventId, destination, description, departureTime, maxParticipants, cost, transportType } = req.body;

    // Vérifier que l'événement existe
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ error: 'Événement non trouvé' });
    }

    const ride = await prisma.ride.create({
      data: {
        eventId,
        creatorId: req.userId!,
        destination,
        description: description || null,
        departureTime: new Date(departureTime),
        maxParticipants,
        cost: cost || null,
        transportType: transportType || 'DRIVE'
      },
      include: {
        creator: {
          select: { firstName: true, lastName: true, rating: true, phone: true }
        },
        event: {
          select: { name: true, location: true }
        }
      }
    });

    res.status(201).json(ride);
  } catch (error) {
    console.error('Erreur création trajet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Rejoindre un trajet
router.post('/:id/join', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const { id } = req.params;

    // Vérifier que le trajet existe et est ouvert
    const ride = await prisma.ride.findUnique({
      where: { id },
      include: {
        participants: true
      }
    });

    if (!ride) {
      return res.status(404).json({ error: 'Trajet non trouvé' });
    }

    if (ride.status !== 'OPEN') {
      return res.status(400).json({ error: 'Ce trajet n\'est plus ouvert' });
    }

    if (ride.creatorId === req.userId) {
      return res.status(400).json({ error: 'Vous ne pouvez pas rejoindre votre propre trajet' });
    }

    // Vérifier si l'utilisateur a déjà créé un trajet pour cet événement
    const existingCreatedRide = await prisma.ride.findFirst({
      where: {
        creatorId: req.userId!,
        eventId: ride.eventId,
        status: 'OPEN'
      },
      include: {
        participants: {
          where: { status: 'CONFIRMED' }
        }
      }
    });

    if (existingCreatedRide) {
      const hasParticipants = existingCreatedRide.participants.length > 0;
      return res.status(400).json({
        error: 'Vous avez déjà créé un trajet pour cet événement',
        code: 'EXISTING_RIDE_CREATED',
        rideId: existingCreatedRide.id,
        hasParticipants,
        participantCount: existingCreatedRide.participants.length
      });
    }

    // Vérifier si l'utilisateur participe déjà à un trajet confirmé pour cet événement
    const existingConfirmedParticipation = await prisma.rideParticipant.findFirst({
      where: {
        userId: req.userId!,
        status: 'CONFIRMED',
        ride: {
          eventId: ride.eventId
        }
      }
    });

    if (existingConfirmedParticipation) {
      return res.status(400).json({ error: 'Vous participez déjà à un trajet pour cet événement' });
    }

    // Vérifier si déjà participant à ce trajet spécifique
    const existingParticipant = ride.participants.find(p => p.userId === req.userId);
    if (existingParticipant) {
      return res.status(400).json({ error: 'Vous participez déjà à ce trajet' });
    }

    // Vérifier la capacité (organisateur + participants)
    if (ride.participants.length + 1 >= ride.maxParticipants) {
      return res.status(400).json({ error: 'Ce trajet est complet' });
    }

    const participant = await prisma.rideParticipant.create({
      data: {
        rideId: id,
        userId: req.userId!,
        status: 'PENDING'
      },
      include: {
        user: {
          select: { firstName: true, lastName: true, rating: true }
        }
      }
    });

    // Mettre à jour le statut du trajet si complet (organisateur + participants)
    if (ride.participants.length + 1 >= ride.maxParticipants + 1) {
      await prisma.ride.update({
        where: { id },
        data: { status: 'FULL' }
      });
    }

    res.status(201).json(participant);
  } catch (error) {
    console.error('Erreur rejoindre trajet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Confirmer sa participation à un trajet
router.patch('/:id/confirm', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const { id } = req.params;

    const participant = await prisma.rideParticipant.findFirst({
      where: {
        rideId: id,
        userId: req.userId!
      }
    });

    if (!participant) {
      return res.status(404).json({ error: 'Participation non trouvée' });
    }

    const updatedParticipant = await prisma.rideParticipant.update({
      where: { id: participant.id },
      data: { status: 'CONFIRMED' }
    });

    res.json(updatedParticipant);
  } catch (error) {
    console.error('Erreur confirmation trajet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Se retirer d'un trajet
router.delete('/:id/leave', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const { id } = req.params;

    // Vérifier que l'utilisateur participe à ce trajet
    const participant = await prisma.rideParticipant.findFirst({
      where: {
        rideId: id,
        userId: req.userId!
      },
      include: {
        ride: {
          include: {
            creator: {
              select: { firstName: true, lastName: true }
            },
            event: {
              select: { name: true }
            }
          }
        },
        user: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    if (!participant) {
      return res.status(404).json({ error: 'Vous ne participez pas à ce trajet' });
    }

    // Empêcher le créateur de se retirer de son propre trajet avec cette route
    if (participant.ride.creatorId === req.userId) {
      return res.status(400).json({ error: 'Utilisez la suppression de trajet pour annuler votre propre trajet' });
    }

    // Supprimer la participation
    await prisma.rideParticipant.delete({
      where: { id: participant.id }
    });

    // Mettre à jour le statut du trajet si il était complet
    const ride = await prisma.ride.findUnique({
      where: { id },
      include: { participants: true }
    });

    if (ride && ride.status === 'FULL') {
      await prisma.ride.update({
        where: { id },
        data: { status: 'OPEN' }
      });
    }

    res.json({
      message: 'Vous avez quitté le trajet avec succès',
      rideInfo: {
        destination: participant.ride.destination,
        creatorName: `${participant.ride.creator.firstName} ${participant.ride.creator.lastName}`,
        eventName: participant.ride.event.name
      },
      participantName: `${participant.user.firstName} ${participant.user.lastName}`
    });
  } catch (error) {
    console.error('Erreur retrait du trajet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Enregistrer le coût du trajet (créateur seulement)
router.patch('/:id/cost', authenticateToken, [
  body('cost').isFloat({ min: 0, max: 5 }).withMessage('Le coût doit être entre 0 et 5€')
], async (req: AuthRequest, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { cost } = req.body;

    const ride = await prisma.ride.findUnique({
      where: { id },
      include: { participants: { where: { status: 'CONFIRMED' } } }
    });

    if (!ride) {
      return res.status(404).json({ error: 'Trajet non trouvé' });
    }

    if (ride.creatorId !== req.userId) {
      return res.status(403).json({ error: 'Seul le créateur peut enregistrer le coût' });
    }

    const updatedRide = await prisma.ride.update({
      where: { id },
      data: {
        cost,
        status: 'IN_PROGRESS'
      }
    });

    res.json(updatedRide);
  } catch (error) {
    console.error('Erreur enregistrement coût:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Marquer le remboursement comme effectué
router.patch('/:id/reimburse', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const { id } = req.params;

    const participant = await prisma.rideParticipant.findFirst({
      where: {
        rideId: id,
        userId: req.userId!
      }
    });

    if (!participant) {
      return res.status(404).json({ error: 'Participation non trouvée' });
    }

    const updatedParticipant = await prisma.rideParticipant.update({
      where: { id: participant.id },
      data: { hasReimbursed: true }
    });

    res.json(updatedParticipant);
  } catch (error) {
    console.error('Erreur remboursement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Modifier un trajet (créateur seulement)
router.put('/:id', authenticateToken, [
  body('destination').trim().isLength({ min: 3 }).withMessage('Destination requise'),
  body('departureTime').isISO8601().withMessage('Heure de départ valide requise'),
  body('maxParticipants').isInt({ min: 2, max: 8 }).withMessage('Nombre de participants entre 2 et 8'),
  body('cost').optional().isFloat({ min: 0, max: 5 }).withMessage('Le coût doit être entre 0 et 5€')
], async (req: AuthRequest, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { destination, description, departureTime, maxParticipants, cost } = req.body;

    // Vérifier que le trajet existe et appartient à l'utilisateur
    const existingRide = await prisma.ride.findUnique({
      where: { id },
      include: { participants: true }
    });

    if (!existingRide) {
      return res.status(404).json({ error: 'Trajet non trouvé' });
    }

    if (existingRide.creatorId !== req.userId) {
      return res.status(403).json({ error: 'Vous ne pouvez modifier que vos propres trajets' });
    }

    // Vérifier que la nouvelle capacité peut accommoder les participants existants
    if (existingRide.participants.length > maxParticipants) {
      return res.status(400).json({
        error: `Impossible de réduire la capacité en dessous de ${existingRide.participants.length} (participants actuels)`
      });
    }

    const updatedRide = await prisma.ride.update({
      where: { id },
      data: {
        destination,
        description: description || null,
        departureTime: new Date(departureTime),
        maxParticipants,
        cost: cost || null
      },
      include: {
        creator: {
          select: { firstName: true, lastName: true, rating: true, phone: true }
        },
        participants: {
          include: {
            user: {
              select: { firstName: true, lastName: true, rating: true }
            }
          }
        }
      }
    });

    res.json(updatedRide);
  } catch (error) {
    console.error('Erreur modification trajet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un trajet (créateur seulement)
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const { id } = req.params;

    // Vérifier que le trajet existe et appartient à l'utilisateur
    const existingRide = await prisma.ride.findUnique({
      where: { id },
      include: { participants: true }
    });

    if (!existingRide) {
      return res.status(404).json({ error: 'Trajet non trouvé' });
    }

    if (existingRide.creatorId !== req.userId) {
      return res.status(403).json({ error: 'Vous ne pouvez supprimer que vos propres trajets' });
    }

    // Supprimer d'abord les participants, puis le trajet
    await prisma.rideParticipant.deleteMany({
      where: { rideId: id }
    });

    await prisma.ride.delete({
      where: { id }
    });

    res.json({ message: 'Trajet supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression trajet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer les détails d'un trajet spécifique
router.get('/:id', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const ride = await prisma.ride.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, rating: true, phone: true }
        },
        participants: {
          where: { status: 'CONFIRMED' },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, rating: true }
            }
          }
        },
        event: {
          select: { id: true, name: true, location: true, startDate: true, endDate: true }
        }
      }
    });

    if (!ride) {
      return res.status(404).json({ error: 'Trajet non trouvé' });
    }

    // Vérifier que l'utilisateur a accès à ce trajet (créateur ou participant confirmé)
    const isCreator = ride.creatorId === userId;
    const isParticipant = ride.participants.some(p => p.userId === userId);

    if (!isCreator && !isParticipant) {
      return res.status(403).json({ error: 'Non autorisé à voir ce trajet' });
    }

    res.json(ride);
  } catch (error) {
    console.error('Erreur récupération trajet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer les trajets de l'utilisateur connecté
router.get('/my-rides', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const userId = req.userId!;

    // Trajets créés par l'utilisateur
    const createdRides = await prisma.ride.findMany({
      where: { creatorId: userId },
      include: {
        event: {
          select: { id: true, name: true, startDate: true }
        },
        participants: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, rating: true, phone: true }
            }
          }
        }
      },
      orderBy: { departureTime: 'desc' }
    });

    // Trajets où l'utilisateur participe
    const participatingRides = await prisma.rideParticipant.findMany({
      where: { userId },
      include: {
        ride: {
          include: {
            event: {
              select: { id: true, name: true, startDate: true }
            },
            creator: {
              select: { firstName: true, lastName: true, rating: true }
            }
          }
        }
      }
    });

    res.json({
      created: createdRides,
      participating: participatingRides
    });
  } catch (error) {
    console.error('Erreur récupération mes trajets:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Accepter/refuser une demande de participation (créateur seulement)
router.patch('/:id/participants/:participantId', authenticateToken, [
  body('action').isIn(['accept', 'reject']).withMessage('Action doit être accept ou reject')
], async (req: AuthRequest, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id: rideId, participantId } = req.params;
    const { action } = req.body;

    // Vérifier que le trajet appartient à l'utilisateur
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: { participants: true }
    });

    if (!ride) {
      return res.status(404).json({ error: 'Trajet non trouvé' });
    }

    if (ride.creatorId !== req.userId) {
      return res.status(403).json({ error: 'Seul le créateur peut gérer les demandes' });
    }

    // Vérifier que la demande existe
    const participant = await prisma.rideParticipant.findUnique({
      where: { id: participantId }
    });

    if (!participant) {
      return res.status(404).json({ error: 'Demande non trouvée' });
    }

    let otherPendingRequests: any[] = [];

    if (action === 'accept') {
      // Vérifier s'il reste de la place (organisateur + participants confirmés)
      const confirmedParticipants = ride.participants.filter(p => p.status === 'CONFIRMED').length;
      if (confirmedParticipants + 1 >= ride.maxParticipants) {
        return res.status(400).json({ error: 'Trajet complet' });
      }

      // Récupérer l'événement du trajet pour gérer l'exclusivité
      const rideWithEvent = await prisma.ride.findUnique({
        where: { id: rideId },
        include: { event: true }
      });

      if (!rideWithEvent) {
        return res.status(404).json({ error: 'Trajet non trouvé' });
      }

      // Récupérer les autres demandes à annuler pour informer l'utilisateur
      otherPendingRequests = await prisma.rideParticipant.findMany({
        where: {
          userId: participant.userId,
          rideId: { not: rideId },
          ride: {
            eventId: rideWithEvent.eventId
          },
          status: 'PENDING'
        },
        include: {
          ride: {
            select: {
              id: true,
              destination: true,
              creator: {
                select: { firstName: true, lastName: true }
              }
            }
          }
        }
      });

      // Accepter la demande
      await prisma.rideParticipant.update({
        where: { id: participantId },
        data: { status: 'CONFIRMED' }
      });

      // Annuler toutes les autres demandes de ce participant pour le même événement
      await prisma.rideParticipant.deleteMany({
        where: {
          userId: participant.userId,
          rideId: { not: rideId },
          ride: {
            eventId: rideWithEvent.eventId
          },
          status: 'PENDING'
        }
      });

      // Mettre à jour le statut du trajet si complet (organisateur + participants)
      if (confirmedParticipants + 1 >= ride.maxParticipants + 1) {
        await prisma.ride.update({
          where: { id: rideId },
          data: { status: 'FULL' }
        });
      }
    } else {
      await prisma.rideParticipant.delete({
        where: { id: participantId }
      });
    }

    const response: any = {
      message: `Demande ${action === 'accept' ? 'acceptée' : 'refusée'}`
    };

    // Si accepté et qu'il y avait d'autres demandes annulées, les inclure dans la réponse
    if (action === 'accept' && otherPendingRequests && otherPendingRequests.length > 0) {
      response.cancelledRequests = otherPendingRequests.map(req => ({
        rideId: req.ride.id,
        destination: req.ride.destination,
        creatorName: `${req.ride.creator.firstName} ${req.ride.creator.lastName}`
      }));
      response.participantUserId = participant.userId;
    }

    res.json(response);
  } catch (error) {
    console.error('Erreur gestion demande:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Admin: Supprimer un utilisateur d'une course
router.delete('/admin/:rideId/participants/:userId', authenticateToken, requireAdmin, async (req: AuthRequest, res: express.Response) => {
  try {
    const { rideId, userId } = req.params;

    // Vérifier que le trajet existe
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: { participants: true }
    });

    if (!ride) {
      return res.status(404).json({ error: 'Trajet non trouvé' });
    }

    // Si c'est le créateur du trajet
    if (ride.creatorId === userId) {
      // Supprimer tous les participants d'abord
      await prisma.rideParticipant.deleteMany({
        where: { rideId }
      });

      // Puis supprimer le trajet
      await prisma.ride.delete({
        where: { id: rideId }
      });

      return res.json({ message: 'Trajet supprimé (créateur retiré)' });
    }

    // Si c'est un participant
    const participant = await prisma.rideParticipant.findFirst({
      where: {
        rideId,
        userId
      }
    });

    if (!participant) {
      return res.status(404).json({ error: 'Participation non trouvée' });
    }

    // Supprimer le participant
    await prisma.rideParticipant.delete({
      where: { id: participant.id }
    });

    // Mettre à jour le statut du trajet si il était complet
    if (ride.status === 'FULL') {
      await prisma.ride.update({
        where: { id: rideId },
        data: { status: 'OPEN' }
      });
    }

    res.json({ message: 'Utilisateur retiré du trajet' });
  } catch (error) {
    console.error('Erreur suppression utilisateur du trajet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer son propre trajet
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const { id } = req.params;

    // Vérifier que le trajet existe et appartient à l'utilisateur
    const ride = await prisma.ride.findUnique({
      where: { id },
      include: {
        participants: {
          where: { status: 'CONFIRMED' }
        }
      }
    });

    if (!ride) {
      return res.status(404).json({ error: 'Trajet non trouvé' });
    }

    if (ride.creatorId !== req.userId) {
      return res.status(403).json({ error: 'Vous ne pouvez supprimer que vos propres trajets' });
    }

    // Supprimer tous les participants d'abord
    await prisma.rideParticipant.deleteMany({
      where: { rideId: id }
    });

    // Puis supprimer le trajet
    await prisma.ride.delete({
      where: { id }
    });

    res.json({
      message: 'Trajet supprimé avec succès',
      participantCount: ride.participants.length
    });
  } catch (error) {
    console.error('Erreur suppression trajet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;