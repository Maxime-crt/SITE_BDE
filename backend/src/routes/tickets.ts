import express from 'express';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import QRCode from 'qrcode';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-09-30.clover',
});

// Générer un QR code unique
async function generateQRCode(ticketId: string): Promise<{ text: string; image: string }> {
  const qrText = `TICKET-${ticketId}`;
  const qrImage = await QRCode.toDataURL(qrText);
  return { text: qrText, image: qrImage };
}

// POST /api/tickets/create-payment-intent - Créer une intention de paiement Stripe
router.post('/create-payment-intent', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const { eventId } = req.body;
    const userId = req.user.id;

    // Vérifier l'événement
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        tickets: {
          where: { status: { in: ['VALID', 'USED'] } }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ error: 'Événement non trouvé' });
    }

    if (!event.publishedAt) {
      return res.status(400).json({ error: 'Événement non publié' });
    }

    // Vérifier la disponibilité
    const ticketsSold = event.tickets.length;
    if (ticketsSold >= event.capacity) {
      return res.status(400).json({ error: 'Plus de places disponibles' });
    }

    // Vérifier si l'utilisateur a déjà un billet
    const existingTicket = await prisma.ticket.findFirst({
      where: {
        eventId,
        userId,
        status: { in: ['VALID', 'USED'] }
      }
    });

    if (existingTicket) {
      return res.status(400).json({ error: 'Vous avez déjà un billet pour cet événement' });
    }

    // Si le prix est 0, créer directement le billet
    if (event.ticketPrice === 0) {
      // Créer d'abord le billet pour obtenir son ID
      const ticket = await prisma.ticket.create({
        data: {
          eventId,
          userId,
          qrCode: 'TEMP', // Temporaire
          qrCodeImage: '',
          purchasePrice: 0,
          status: 'VALID'
        }
      });

      // Générer le QR code avec l'ID du billet
      const { text: qrCode, image: qrCodeImage } = await generateQRCode(ticket.id);

      // Mettre à jour le billet avec le vrai QR code
      const updatedTicket = await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          qrCode,
          qrCodeImage
        }
      });

      return res.json({
        success: true,
        isFree: true,
        ticket: updatedTicket
      });
    }

    // Créer une intention de paiement Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(event.ticketPrice * 100), // Stripe utilise les centimes
      currency: 'eur',
      metadata: {
        eventId,
        userId,
        eventName: event.name
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      amount: event.ticketPrice
    });
  } catch (error) {
    console.error('Erreur lors de la création du paiement:', error);
    res.status(500).json({ error: 'Erreur lors de la création du paiement' });
  }
});

// POST /api/tickets/confirm-payment - Confirmer le paiement et créer le billet
router.post('/confirm-payment', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const { paymentIntentId, eventId } = req.body;
    const userId = req.user.id;

    // Vérifier le paiement auprès de Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Paiement non confirmé' });
    }

    // Vérifier que le paiement correspond bien à cet événement et cet utilisateur
    if (paymentIntent.metadata.eventId !== eventId || paymentIntent.metadata.userId !== userId) {
      return res.status(400).json({ error: 'Paiement invalide' });
    }

    // Vérifier qu'un billet n'a pas déjà été créé avec ce paiement
    const existingTicket = await prisma.ticket.findFirst({
      where: { stripePaymentId: paymentIntentId }
    });

    if (existingTicket) {
      return res.json({ ticket: existingTicket });
    }

    // Récupérer l'événement
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      return res.status(404).json({ error: 'Événement non trouvé' });
    }

    // Créer d'abord le billet pour obtenir son ID
    const ticket = await prisma.ticket.create({
      data: {
        eventId,
        userId,
        qrCode: 'TEMP', // Temporaire
        qrCodeImage: '',
        purchasePrice: event.ticketPrice,
        stripePaymentId: paymentIntentId,
        status: 'VALID'
      },
      include: {
        event: true
      }
    });

    // Générer le QR code avec l'ID du billet
    const { text: qrCode, image: qrCodeImage } = await generateQRCode(ticket.id);

    // Mettre à jour le billet avec le vrai QR code
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        qrCode,
        qrCodeImage
      },
      include: {
        event: true
      }
    });

    res.json({ ticket: updatedTicket });
  } catch (error) {
    console.error('Erreur lors de la confirmation du paiement:', error);
    res.status(500).json({ error: 'Erreur lors de la confirmation du paiement' });
  }
});

// GET /api/tickets/my-tickets - Récupérer tous les billets de l'utilisateur
router.get('/my-tickets', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const userId = req.user.id;

    const tickets = await prisma.ticket.findMany({
      where: {
        userId,
        status: { in: ['VALID', 'USED'] }
      },
      include: {
        event: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        purchasedAt: 'desc'
      }
    });

    res.json(tickets);
  } catch (error) {
    console.error('Erreur lors de la récupération des billets:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des billets' });
  }
});

// GET /api/tickets/:id - Récupérer un billet spécifique
router.get('/:id', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const ticket = await prisma.ticket.findFirst({
      where: {
        id,
        userId
      },
      include: {
        event: true
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Billet non trouvé' });
    }

    res.json(ticket);
  } catch (error) {
    console.error('Erreur lors de la récupération du billet:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du billet' });
  }
});

// POST /api/tickets/scan-qr - Scanner un billet via QR code (Admin seulement)
router.post('/scan-qr', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const { qrCodeData } = req.body;

    console.log('🔍 Backend - QR Code reçu:', qrCodeData);

    // Vérifier que l'utilisateur est admin
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user?.isAdmin) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    // Trouver le billet par QR code
    console.log('🔍 Backend - Recherche du billet avec qrCode:', qrCodeData);

    // Debug: voir tous les QR codes dans la base
    const allTickets = await prisma.ticket.findMany({
      select: { id: true, qrCode: true }
    });
    console.log('📋 Tous les QR codes en base:', allTickets);

    const ticket = await prisma.ticket.findUnique({
      where: { qrCode: qrCodeData },
      include: {
        event: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      }
    });

    if (!ticket) {
      console.log('❌ Aucun billet trouvé avec ce QR code');
      return res.status(404).json({ error: 'Billet non trouvé' });
    }

    console.log('✅ Billet trouvé:', ticket.id);

    if (ticket.status === 'USED') {
      return res.status(400).json({
        error: 'Billet déjà utilisé',
        ticket: ticket,
        usedAt: ticket.usedAt
      });
    }

    if (ticket.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Billet annulé', ticket: ticket });
    }

    if (ticket.status !== 'VALID') {
      return res.status(400).json({ error: 'Billet invalide', ticket: ticket });
    }

    // Marquer le billet comme utilisé
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: 'USED',
        usedAt: new Date()
      },
      include: {
        event: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      }
    });

    res.json({
      success: true,
      ticket: updatedTicket
    });
  } catch (error) {
    console.error('Erreur lors du scan du billet:', error);
    res.status(500).json({ error: 'Erreur lors du scan du billet' });
  }
});

// POST /api/tickets/:id/scan - Scanner un billet (Admin seulement)
router.post('/:id/scan', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const { id } = req.params;

    // Vérifier que l'utilisateur est admin
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user?.isAdmin) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        event: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Billet non trouvé' });
    }

    if (ticket.status === 'USED') {
      return res.status(400).json({
        error: 'Billet déjà utilisé',
        usedAt: ticket.usedAt
      });
    }

    if (ticket.status !== 'VALID') {
      return res.status(400).json({ error: 'Billet invalide' });
    }

    // Marquer le billet comme utilisé
    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: {
        status: 'USED',
        usedAt: new Date()
      },
      include: {
        event: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    res.json({
      success: true,
      ticket: updatedTicket
    });
  } catch (error) {
    console.error('Erreur lors du scan du billet:', error);
    res.status(500).json({ error: 'Erreur lors du scan du billet' });
  }
});

// POST /api/tickets/:id/cancel - Annuler un billet
router.post('/:id/cancel', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const ticket = await prisma.ticket.findFirst({
      where: {
        id,
        userId
      },
      include: {
        event: true
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Billet non trouvé' });
    }

    if (ticket.status !== 'VALID') {
      return res.status(400).json({ error: 'Ce billet ne peut pas être annulé' });
    }

    // Vérifier que l'événement n'a pas encore commencé
    if (new Date() > new Date(ticket.event.startDate)) {
      return res.status(400).json({ error: 'Impossible d\'annuler un billet pour un événement déjà commencé' });
    }

    // Marquer le billet comme annulé
    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: {
        status: 'CANCELLED'
      }
    });

    // Si le billet était payant, créer un remboursement Stripe
    if (ticket.stripePaymentId) {
      try {
        await stripe.refunds.create({
          payment_intent: ticket.stripePaymentId
        });

        await prisma.ticket.update({
          where: { id },
          data: {
            status: 'REFUNDED'
          }
        });
      } catch (stripeError) {
        console.error('Erreur lors du remboursement Stripe:', stripeError);
        // Le billet reste annulé même si le remboursement échoue
      }
    }

    res.json({
      success: true,
      message: 'Billet annulé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'annulation du billet:', error);
    res.status(500).json({ error: 'Erreur lors de l\'annulation du billet' });
  }
});

export default router;
