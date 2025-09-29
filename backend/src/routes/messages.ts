import express from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../utils/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Récupérer les messages d'un trajet
router.get('/ride/:rideId', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const { rideId } = req.params;
    const userId = req.userId;

    // Vérifier que l'utilisateur participe au trajet ou en est le créateur
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        participants: {
          where: { status: 'CONFIRMED' }
        }
      }
    });

    if (!ride) {
      return res.status(404).json({ error: 'Trajet non trouvé' });
    }

    // Vérifier l'autorisation
    const isCreator = ride.creatorId === userId;
    const isParticipant = ride.participants.some(p => p.userId === userId);

    if (!isCreator && !isParticipant) {
      return res.status(403).json({ error: 'Non autorisé à voir ce chat' });
    }

    // Récupérer les messages
    const messages = await prisma.rideMessage.findMany({
      where: { rideId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true }
        },
        replyTo: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json(messages);
  } catch (error) {
    console.error('Erreur récupération messages:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Envoyer un message dans un trajet
router.post('/ride/:rideId', authenticateToken, [
  body('message').trim().isLength({ min: 1, max: 1000 }).withMessage('Message requis (max 1000 caractères)'),
  body('replyToId').optional().isString().withMessage('ID de réponse invalide')
], async (req: AuthRequest, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { rideId } = req.params;
    const { message, replyToId } = req.body;
    const userId = req.userId;

    // Vérifier que l'utilisateur participe au trajet ou en est le créateur
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        participants: {
          where: { status: 'CONFIRMED' }
        }
      }
    });

    if (!ride) {
      return res.status(404).json({ error: 'Trajet non trouvé' });
    }

    // Vérifier l'autorisation
    const isCreator = ride.creatorId === userId;
    const isParticipant = ride.participants.some(p => p.userId === userId);

    if (!isCreator && !isParticipant) {
      return res.status(403).json({ error: 'Non autorisé à écrire dans ce chat' });
    }

    // Vérifier que le message à répondre existe et appartient au même trajet
    if (replyToId) {
      const replyToMessage = await prisma.rideMessage.findUnique({
        where: { id: replyToId }
      });

      if (!replyToMessage || replyToMessage.rideId !== rideId) {
        return res.status(400).json({ error: 'Message de réponse invalide' });
      }
    }

    // Créer le message
    const newMessage = await prisma.rideMessage.create({
      data: {
        rideId,
        userId: userId!,
        message,
        replyToId: replyToId || null
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true }
        },
        replyTo: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true }
            }
          }
        }
      }
    });

    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Erreur création message:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Modifier un message
router.put('/:messageId', authenticateToken, [
  body('message').trim().isLength({ min: 1, max: 1000 }).withMessage('Message requis (max 1000 caractères)')
], async (req: AuthRequest, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { messageId } = req.params;
    const { message } = req.body;
    const userId = req.userId;

    // Vérifier que le message existe et appartient à l'utilisateur
    const existingMessage = await prisma.rideMessage.findUnique({
      where: { id: messageId },
      include: {
        ride: {
          include: {
            participants: {
              where: { status: 'CONFIRMED' }
            }
          }
        }
      }
    });

    if (!existingMessage) {
      return res.status(404).json({ error: 'Message non trouvé' });
    }

    if (existingMessage.userId !== userId) {
      return res.status(403).json({ error: 'Non autorisé à modifier ce message' });
    }

    // Vérifier que l'utilisateur participe toujours au trajet
    const isCreator = existingMessage.ride.creatorId === userId;
    const isParticipant = existingMessage.ride.participants.some(p => p.userId === userId);

    if (!isCreator && !isParticipant) {
      return res.status(403).json({ error: 'Non autorisé à modifier ce message' });
    }

    // Mettre à jour le message
    const updatedMessage = await prisma.rideMessage.update({
      where: { id: messageId },
      data: {
        message,
        isEdited: true
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    res.json(updatedMessage);
  } catch (error) {
    console.error('Erreur modification message:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un message
router.delete('/:messageId', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const { messageId } = req.params;
    const userId = req.userId;

    // Vérifier que le message existe et appartient à l'utilisateur
    const existingMessage = await prisma.rideMessage.findUnique({
      where: { id: messageId },
      include: {
        ride: {
          include: {
            participants: {
              where: { status: 'CONFIRMED' }
            }
          }
        }
      }
    });

    if (!existingMessage) {
      return res.status(404).json({ error: 'Message non trouvé' });
    }

    if (existingMessage.userId !== userId) {
      return res.status(403).json({ error: 'Non autorisé à supprimer ce message' });
    }

    // Vérifier que l'utilisateur participe toujours au trajet
    const isCreator = existingMessage.ride.creatorId === userId;
    const isParticipant = existingMessage.ride.participants.some(p => p.userId === userId);

    if (!isCreator && !isParticipant) {
      return res.status(403).json({ error: 'Non autorisé à supprimer ce message' });
    }

    // Supprimer le message
    await prisma.rideMessage.delete({
      where: { id: messageId }
    });

    res.json({ message: 'Message supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression message:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;