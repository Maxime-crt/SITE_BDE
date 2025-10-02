import express from 'express';
import { prisma } from '../utils/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Récupérer le profil d'un utilisateur
router.get('/:id', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isAdmin: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json(user);
  } catch (error) {
    console.error('Erreur récupération utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer les billets d'un utilisateur (pour les admins)
router.get('/:id/tickets', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    // Vérifier que l'utilisateur est admin
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const { id } = req.params;

    const tickets = await prisma.ticket.findMany({
      where: { userId: id },
      include: {
        event: {
          select: {
            name: true,
            location: true,
            startDate: true,
            endDate: true
          }
        }
      },
      orderBy: { purchasedAt: 'desc' }
    });

    res.json(tickets);
  } catch (error) {
    console.error('Erreur récupération billets utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
