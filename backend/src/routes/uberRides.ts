import express from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../utils/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Créer une demande de trajet Uber
router.post('/request', authenticateToken, [
  body('eventId').isString().notEmpty().withMessage('ID événement requis'),
  body('destinationAddress').isString().isLength({ min: 5 }).withMessage('Adresse destination requise'),
  body('destinationCity').isString().notEmpty().withMessage('Ville requise'),
  body('destinationPostcode').isString().notEmpty().withMessage('Code postal requis'),
  body('destinationLat').isFloat().withMessage('Latitude requise'),
  body('destinationLng').isFloat().withMessage('Longitude requise'),
  body('maxDepartureTime').isISO8601().withMessage('Heure de départ requise'),
  body('femaleOnly').optional().isBoolean(),
  body('departNow').optional().isBoolean()
], async (req: AuthRequest, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.userId!;
    const {
      eventId,
      destinationAddress,
      destinationCity,
      destinationPostcode,
      destinationLat,
      destinationLng,
      maxDepartureTime,
      femaleOnly = false,
      departNow = false
    } = req.body;

    // Vérifier que l'utilisateur a un billet valide pour cet événement
    const ticket = await prisma.ticket.findFirst({
      where: {
        userId,
        eventId,
        status: 'VALID'
      }
    });

    if (!ticket) {
      return res.status(403).json({
        error: 'Vous devez avoir un billet valide pour cet événement pour demander un trajet partagé'
      });
    }

    // Récupérer l'événement avec coordonnées
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        location: true,
        latitude: true,
        longitude: true,
        startDate: true,
        endDate: true
      }
    });

    if (!event) {
      return res.status(404).json({ error: 'Événement non trouvé' });
    }

    // Vérifier que l'événement a des coordonnées (nécessaire pour le routing)
    if (!event.latitude || !event.longitude) {
      return res.status(400).json({
        error: 'Cet événement n\'a pas de coordonnées GPS configurées. Contactez le support.'
      });
    }

    // Vérifier que l'heure de départ est valide
    const departureTime = new Date(maxDepartureTime);
    const now = new Date();
    const eventStartTime = new Date(event.startDate);
    const eventEndTime = new Date(event.endDate);

    // Vérifier que l'heure de départ n'est pas déjà passée (+ 30 min de marge)
    const timeDifference = departureTime.getTime() - now.getTime();
    const minutesDifference = timeDifference / (1000 * 60);

    if (minutesDifference < -30) {
      return res.status(400).json({
        error: 'Vous ne pouvez pas créer de demande pour un horaire déjà passé (plus de 30 minutes).'
      });
    }

    // Vérifier que l'heure de départ est au moins 15 min après le début de la soirée
    const earliestDeparture = new Date(eventStartTime.getTime() + 15 * 60 * 1000);
    if (departureTime < earliestDeparture) {
      return res.status(400).json({
        error: 'Vous ne pouvez rechercher un trajet qu\'à partir de 15 minutes après le début de la soirée.'
      });
    }

    // Vérifier que l'heure de départ n'est pas trop tardive (max 1h après la fin)
    const latestDeparture = new Date(eventEndTime.getTime() + 1 * 60 * 60 * 1000);
    if (departureTime > latestDeparture) {
      return res.status(400).json({
        error: 'Vous ne pouvez rechercher un trajet que jusqu\'à 1 heure après la fin de la soirée.'
      });
    }

    // Vérifier qu'il n'y a pas déjà une demande active pour cet utilisateur et cet événement
    const existingRequest = await prisma.uberRideRequest.findFirst({
      where: {
        userId,
        eventId,
        status: { in: ['PENDING', 'ACCEPTED'] }
      }
    });

    if (existingRequest) {
      return res.status(400).json({
        error: 'Vous avez déjà une demande active pour cet événement'
      });
    }

    // Créer un nouveau ride (l'utilisateur est l'initiateur)
    const ride = await prisma.uberRide.create({
      data: {
        eventId,
        departureTime: new Date(maxDepartureTime),
        departNow,
        departureAddress: event.location,
        departureLat: event.latitude,
        departureLng: event.longitude,
        currentPassengers: 1,
        status: 'MATCHING'
      }
    });

    // Créer la demande de trajet
    const request = await prisma.uberRideRequest.create({
      data: {
        rideId: ride.id,
        userId,
        eventId,
        maxDepartureTime: new Date(maxDepartureTime),
        destinationAddress,
        destinationCity,
        destinationPostcode,
        destinationLat,
        destinationLng,
        femaleOnly,
        isInitiator: true, // Première personne = initiateur
        status: 'ACCEPTED' // Auto-accepté car c'est le créateur
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            gender: true
          }
        },
        event: {
          select: {
            name: true,
            location: true
          }
        }
      }
    });

    // Lancer l'algorithme de matching pour trouver d'autres passagers
    const { findMatches } = await import('../services/uberMatchingService');
    const matchResult = await findMatches(request.id);

    res.status(201).json({
      message: matchResult.matched
        ? matchResult.message
        : 'Demande de trajet créée ! Nous recherchons des personnes allant dans la même direction...',
      request,
      ride,
      matchResult
    });
  } catch (error) {
    console.error('Erreur création demande trajet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer les trajets disponibles pour un événement
router.get('/event/:eventId', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const { eventId } = req.params;
    const userId = req.userId!;

    // Vérifier que l'utilisateur a un billet
    const ticket = await prisma.ticket.findFirst({
      where: { userId, eventId, status: 'VALID' }
    });

    if (!ticket) {
      return res.status(403).json({
        error: 'Vous devez avoir un billet pour voir les trajets de cet événement'
      });
    }

    const rides = await prisma.uberRide.findMany({
      where: {
        eventId,
        status: { in: ['MATCHING', 'CONFIRMED'] },
        currentPassengers: { lt: 4 } // Places disponibles
      },
      include: {
        requests: {
          where: { status: { in: ['PENDING', 'ACCEPTED'] } },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                gender: true
              }
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

// Récupérer tous les trajets de l'utilisateur connecté
router.get('/my-rides', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  console.log('🟢 [BACKEND] Route /my-rides appelée');
  try {
    const userId = req.userId!;
    console.log('🟢 [BACKEND] userId:', userId);

    console.log('🟢 [BACKEND] Appel Prisma findMany...');
    const requests = await prisma.uberRideRequest.findMany({
      where: { userId },
      include: {
        ride: {
          include: {
            event: {
              select: {
                id: true,
                name: true,
                location: true,
                startDate: true,
                endDate: true
              }
            },
            _count: {
              select: { requests: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Log pour debug
    console.log('===== DEBUG MY-RIDES =====');
    console.log('Nombre de requêtes trouvées:', requests.length);
    if (requests.length > 0) {
      console.log('Première requête BRUTE:', JSON.stringify(requests[0], null, 2));
      console.log('Type de req.ride:', typeof requests[0].ride);
      console.log('req.ride existe?', !!requests[0].ride);
      if (requests[0].ride) {
        console.log('req.ride.event existe?', !!(requests[0].ride as any).event);
        console.log('Contenu de req.ride:', JSON.stringify(requests[0].ride, null, 2));
      }
    }

    // Formater les données pour le frontend
    const formattedRequests = requests.map((req, index) => {
      console.log(`\n----- Formatage requête ${index} -----`);
      const ride = req.ride as any; // Type assertion pour contourner les limitations TypeScript
      console.log('ride:', ride);
      console.log('ride.event:', ride?.event);

      const formatted = {
        id: req.id,
        eventId: req.eventId,
        userId: req.userId,
        rideId: req.rideId, // ID du ride pour le lien vers les détails
        status: req.status,
        departureTime: req.maxDepartureTime,
        femaleOnly: req.femaleOnly,
        homeAddress: req.destinationAddress,
        homeCity: req.destinationCity,
        homePostcode: req.destinationPostcode,
        homeLatitude: req.destinationLat,
        homeLongitude: req.destinationLng,
        groupId: req.rideId, // Alias pour compatibilité
        createdAt: req.createdAt,
        event: ride?.event || null,
        group: ride ? {
          id: ride.id,
          estimatedCost: ride.estimatedCost,
          memberCount: ride._count.requests
        } : undefined
      };

      console.log('formatted.event:', formatted.event);
      return formatted;
    });

    console.log('\n===== RÉSULTAT FINAL =====');
    console.log('Requêtes formatées:', JSON.stringify(formattedRequests, null, 2));
    res.json(formattedRequests);
  } catch (error) {
    console.error('Erreur récupération trajets utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer le détail d'un trajet
router.get('/:rideId', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const { rideId } = req.params;
    const userId = req.userId!;

    const ride = await prisma.uberRide.findUnique({
      where: { id: rideId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            location: true,
            startDate: true,
            endDate: true
          }
        },
        requests: {
          where: { status: { in: ['PENDING', 'ACCEPTED'] } },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                gender: true,
                phone: true
              }
            }
          }
        },
        messages: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!ride) {
      return res.status(404).json({ error: 'Trajet non trouvé' });
    }

    // Vérifier que l'utilisateur fait partie de ce trajet
    const userRequest = ride.requests.find(r => r.userId === userId);
    if (!userRequest) {
      return res.status(403).json({
        error: 'Vous ne faites pas partie de ce trajet'
      });
    }

    console.log('🔍 [DEBUG] Ride details:');
    console.log('  - Ride ID:', ride.id);
    console.log('  - Current passengers:', ride.currentPassengers);
    console.log('  - Requests found:', ride.requests.length);
    console.log('  - Requests details:', ride.requests.map(r => ({
      id: r.id,
      userId: r.userId,
      status: r.status,
      userName: `${r.user.firstName} ${r.user.lastName}`
    })));

    res.json(ride);
  } catch (error) {
    console.error('Erreur récupération détail trajet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Annuler ma demande de trajet
router.delete('/request/:requestId', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const { requestId } = req.params;
    const userId = req.userId!;

    const request = await prisma.uberRideRequest.findUnique({
      where: { id: requestId },
      include: { ride: true }
    });

    if (!request) {
      return res.status(404).json({ error: 'Demande non trouvée' });
    }

    if (request.userId !== userId) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    // Vérifier que le trajet n'a pas déjà commencé
    if (request.ride.status === 'IN_PROGRESS' || request.ride.status === 'COMPLETED') {
      return res.status(400).json({
        error: 'Le trajet a déjà commencé ou est terminé'
      });
    }

    // Vérifier qu'on est avant l'heure de départ
    if (new Date() > request.ride.departureTime) {
      return res.status(400).json({
        error: 'Impossible d\'annuler après l\'heure de départ prévue'
      });
    }

    // Marquer comme annulé
    await prisma.uberRideRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELLED' }
    });

    // Décrémenter le nombre de passagers
    await prisma.uberRide.update({
      where: { id: request.rideId },
      data: {
        currentPassengers: { decrement: 1 }
      }
    });

    // Si c'était le dernier passager, annuler le ride
    const updatedRide = await prisma.uberRide.findUnique({
      where: { id: request.rideId },
      include: {
        requests: {
          where: { status: { in: ['PENDING', 'ACCEPTED'] } }
        }
      }
    });

    if (updatedRide && updatedRide.requests.length === 0) {
      await prisma.uberRide.update({
        where: { id: request.rideId },
        data: { status: 'CANCELLED' }
      });
    }

    // TODO: Notifier les autres passagers
    // TODO: Recalculer l'itinéraire si nécessaire

    res.json({ message: 'Demande annulée avec succès' });
  } catch (error) {
    console.error('Erreur annulation demande:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer les messages d'un trajet
router.get('/:rideId/messages', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const { rideId } = req.params;
    const userId = req.userId!;

    // Vérifier que l'utilisateur fait partie du trajet
    const userRequest = await prisma.uberRideRequest.findFirst({
      where: {
        rideId,
        userId,
        status: { in: ['PENDING', 'ACCEPTED'] }
      }
    });

    if (!userRequest) {
      return res.status(403).json({
        error: 'Vous ne faites pas partie de ce trajet'
      });
    }

    const messages = await prisma.uberRideMessage.findMany({
      where: { rideId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true
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

// Envoyer un message dans le chat du trajet
router.post('/:rideId/messages', authenticateToken, [
  body('message').isString().isLength({ min: 1, max: 1000 }).withMessage('Message requis (max 1000 caractères)')
], async (req: AuthRequest, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { rideId } = req.params;
    const userId = req.userId!;
    const { message } = req.body;

    // Vérifier que l'utilisateur fait partie du trajet
    const userRequest = await prisma.uberRideRequest.findFirst({
      where: {
        rideId,
        userId,
        status: { in: ['PENDING', 'ACCEPTED'] }
      }
    });

    if (!userRequest) {
      return res.status(403).json({
        error: 'Vous ne faites pas partie de ce trajet'
      });
    }

    const newMessage = await prisma.uberRideMessage.create({
      data: {
        rideId,
        userId,
        message
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // TODO: Émettre via WebSocket aux autres membres du trajet

    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Erreur envoi message:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Finaliser le paiement (après la course) - pour l'initiateur
router.post('/:rideId/finalize-payment', authenticateToken, [
  body('finalCost').isFloat({ min: 0 }).withMessage('Coût final requis')
], async (req: AuthRequest, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { rideId } = req.params;
    const userId = req.userId!;
    const { finalCost } = req.body;

    // Vérifier que l'utilisateur est l'initiateur
    const initiatorRequest = await prisma.uberRideRequest.findFirst({
      where: {
        rideId,
        userId,
        isInitiator: true
      },
      include: {
        ride: {
          include: {
            requests: {
              where: { status: 'ACCEPTED' }
            }
          }
        }
      }
    });

    if (!initiatorRequest) {
      return res.status(403).json({
        error: 'Seul l\'organisateur du trajet peut finaliser le paiement'
      });
    }

    const ride = initiatorRequest.ride;

    // Vérifier que le ride n'a pas déjà été finalisé
    if (ride.finalCost) {
      return res.status(400).json({
        error: 'Le paiement a déjà été finalisé'
      });
    }

    // Calculer la part de chaque passager (sauf l'initiateur)
    const otherPassengers = ride.requests.filter(r => !r.isInitiator);
    const nbTotalPassengers = ride.requests.length;
    const sharePerPerson = finalCost / nbTotalPassengers;

    // Mettre à jour le ride
    await prisma.uberRide.update({
      where: { id: rideId },
      data: {
        finalCost,
        status: 'COMPLETED'
      }
    });

    // Créer les paiements pour chaque passager (sauf initiateur)
    for (const passenger of otherPassengers) {
      await prisma.uberRidePayment.create({
        data: {
          rideId,
          userId: passenger.userId,
          amount: sharePerPerson,
          status: 'PENDING'
        }
      });
    }

    // TODO: Envoyer notifications aux passagers pour qu'ils paient leur part
    // TODO: Implémenter le système de pré-autorisation Stripe

    res.json({
      message: 'Paiement finalisé. Les autres passagers vont être notifiés.',
      sharePerPerson,
      totalCollected: sharePerPerson * otherPassengers.length
    });
  } catch (error) {
    console.error('Erreur finalisation paiement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Annuler une demande de trajet
router.post('/:requestId/cancel', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const { requestId } = req.params;
    const userId = req.userId!;

    // Vérifier que la demande appartient à l'utilisateur
    const request = await prisma.uberRideRequest.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      return res.status(404).json({ error: 'Demande non trouvée' });
    }

    if (request.userId !== userId) {
      return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à annuler cette demande' });
    }

    if (!['PENDING', 'MATCHED'].includes(request.status)) {
      return res.status(400).json({
        error: 'Impossible d\'annuler une demande qui n\'est pas en attente'
      });
    }

    // Mettre à jour le statut
    await prisma.uberRideRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELLED' }
    });

    // Si la demande était dans un ride, vérifier si le ride est toujours valide
    if (request.rideId) {
      // Compter les membres restants actifs dans le ride
      const remainingActiveRequests = await prisma.uberRideRequest.count({
        where: {
          rideId: request.rideId,
          status: { in: ['PENDING', 'MATCHED', 'ACCEPTED'] }
        }
      });

      // Si moins de 2 personnes actives, annuler le ride et toutes les demandes associées
      if (remainingActiveRequests < 2) {
        await prisma.uberRide.update({
          where: { id: request.rideId },
          data: { status: 'CANCELLED' }
        });

        // Remettre les autres demandes en PENDING
        await prisma.uberRideRequest.updateMany({
          where: {
            rideId: request.rideId,
            status: { in: ['MATCHED', 'ACCEPTED'] }
          },
          data: { status: 'PENDING' }
        });
      }
    }

    res.json({ message: 'Demande annulée avec succès' });
  } catch (error) {
    console.error('Erreur annulation demande:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
