import express from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../utils/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';

const router = express.Router();

// GET /api/support/messages - Récupérer tous les messages de support de l'utilisateur
router.get('/messages', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const userId = req.user!.id;

    const messages = await prisma.supportMessage.findMany({
      where: { userId },
      include: {
        replyTo: {
          include: {
            user: {
              select: { firstName: true, lastName: true, isAdmin: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Marquer tous les messages du BDE comme lus
    await prisma.supportMessage.updateMany({
      where: {
        userId,
        isFromBDE: true,
        isRead: false
      },
      data: {
        isRead: true
      }
    });

    res.json(messages);
  } catch (error) {
    console.error('Erreur lors de la récupération des messages:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/support/messages - Envoyer un message au support
router.post('/messages', authenticateToken, [
  body('message').trim().isLength({ min: 1 }).withMessage('Message requis'),
  body('replyToId').optional()
], async (req: AuthRequest, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { message, replyToId } = req.body;
    const userId = req.user!.id;

    const supportMessage = await prisma.supportMessage.create({
      data: {
        userId,
        message,
        replyToId: replyToId || null,
        isFromBDE: false
      },
      include: {
        user: {
          select: { firstName: true, lastName: true, isAdmin: true }
        },
        replyTo: {
          include: {
            user: {
              select: { firstName: true, lastName: true, isAdmin: true }
            }
          }
        }
      }
    });

    res.status(201).json(supportMessage);
  } catch (error) {
    console.error('Erreur lors de l\'envoi du message:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/support/messages/:id - Modifier un message
router.put('/messages/:id', authenticateToken, [
  body('message').trim().isLength({ min: 1 }).withMessage('Message requis')
], async (req: AuthRequest, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { message } = req.body;
    const userId = req.user!.id;

    // Vérifier que le message appartient à l'utilisateur
    const existingMessage = await prisma.supportMessage.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!existingMessage) {
      return res.status(404).json({ error: 'Message non trouvé' });
    }

    // Vérifier que le message n'a pas été modifié plus de 2 fois
    if (existingMessage.editCount >= 2) {
      return res.status(400).json({ error: 'Vous avez atteint la limite de 2 modifications pour ce message' });
    }

    const updatedMessage = await prisma.supportMessage.update({
      where: { id },
      data: {
        message,
        isEdited: true,
        editCount: existingMessage.editCount + 1
      },
      include: {
        user: {
          select: { firstName: true, lastName: true, isAdmin: true }
        }
      }
    });

    res.json(updatedMessage);
  } catch (error) {
    console.error('Erreur lors de la modification du message:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/support/messages/:id - Supprimer un message
router.delete('/messages/:id', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Vérifier que le message appartient à l'utilisateur
    const existingMessage = await prisma.supportMessage.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!existingMessage) {
      return res.status(404).json({ error: 'Message non trouvé' });
    }

    await prisma.supportMessage.delete({
      where: { id }
    });

    res.json({ message: 'Message supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du message:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Admin routes

// GET /api/support/admin/all-conversations - Récupérer toutes les conversations (admin)
router.get('/admin/all-conversations', authenticateToken, requireAdmin, async (req: AuthRequest, res: express.Response) => {
  try {
    // Récupérer tous les utilisateurs qui ont envoyé des messages
    const usersWithMessages = await prisma.user.findMany({
      where: {
        supportMessages: {
          some: {}
        }
      },
      include: {
        supportMessages: {
          include: {
            replyTo: {
              include: {
                user: {
                  select: { firstName: true, lastName: true, isAdmin: true }
                }
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    res.json(usersWithMessages);
  } catch (error) {
    console.error('Erreur lors de la récupération des conversations:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/support/admin/user/:userId/messages - Récupérer les messages d'un utilisateur (admin)
router.get('/admin/user/:userId/messages', authenticateToken, requireAdmin, async (req: AuthRequest, res: express.Response) => {
  try {
    const { userId } = req.params;

    const messages = await prisma.supportMessage.findMany({
      where: { userId },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true, isAdmin: true }
        },
        replyTo: {
          include: {
            user: {
              select: { firstName: true, lastName: true, isAdmin: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Marquer tous les messages de l'utilisateur (non-BDE) comme lus
    await prisma.supportMessage.updateMany({
      where: {
        userId,
        isFromBDE: false,
        isRead: false
      },
      data: {
        isRead: true
      }
    });

    res.json(messages);
  } catch (error) {
    console.error('Erreur lors de la récupération des messages:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/support/admin/reply - Répondre à un utilisateur (admin)
router.post('/admin/reply', authenticateToken, requireAdmin, [
  body('userId').notEmpty().withMessage('ID utilisateur requis'),
  body('message').trim().isLength({ min: 1 }).withMessage('Message requis'),
  body('replyToId').optional()
], async (req: AuthRequest, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId, message, replyToId } = req.body;

    const supportMessage = await prisma.supportMessage.create({
      data: {
        userId,
        message,
        replyToId: replyToId || null,
        isFromBDE: true
      },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true, isAdmin: true }
        },
        replyTo: {
          include: {
            user: {
              select: { firstName: true, lastName: true, isAdmin: true }
            }
          }
        }
      }
    });

    res.status(201).json(supportMessage);
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la réponse:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
