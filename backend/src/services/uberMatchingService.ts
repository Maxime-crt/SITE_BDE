import { prisma } from '../utils/prisma';
import { areDestinationsClose } from './geocodingService';
import { isDetourAcceptable, optimizeWaypoints } from './routingService';
import { notifyUberMatch } from './notificationService';
import { estimateUberPrice } from './uberPricingService';

interface MatchResult {
  matched: boolean;
  rideId?: string;
  message?: string;
}

/**
 * Algorithme principal de matching pour trouver des trajets compatibles
 * Critères:
 * 1. Même événement
 * 2. Horaires compatibles (max 30 min d'écart)
 * 3. Direction similaire (détour acceptable)
 * 4. Préférences genre respectées
 * 5. Places disponibles (max 4 passagers)
 */
export async function findMatches(requestId: string): Promise<MatchResult> {
  try {
    const request = await prisma.uberRideRequest.findUnique({
      where: { id: requestId },
      include: {
        user: true,
        event: true,
        ride: true
      }
    });

    if (!request) {
      return { matched: false, message: 'Demande non trouvée' };
    }

    console.log(`= Recherche de matches pour ${request.user.firstName}...`);

    // 1. Récupérer toutes les demandes ACCEPTED (actives) pour le même événement
    const otherRequests = await prisma.uberRideRequest.findMany({
      where: {
        eventId: request.eventId,
        status: 'ACCEPTED', // Chercher les demandes déjà acceptées (créées)
        id: { not: requestId },
        // Horaires compatibles (max 30 min d'écart)
        maxDepartureTime: {
          gte: new Date(request.maxDepartureTime.getTime() - 30 * 60 * 1000), // 30 min avant
          lte: new Date(request.maxDepartureTime.getTime() + 30 * 60 * 1000)  // 30 min après
        }
      },
      include: {
        user: true,
        ride: {
          include: {
            requests: {
              where: { status: { in: ['PENDING', 'ACCEPTED'] } }
            }
          }
        }
      }
    });

    console.log(`✅ ${otherRequests.length} demande(s) trouvée(s) avec horaires compatibles`);

    if (otherRequests.length === 0) {
      return {
        matched: false,
        message: 'Aucun trajet compatible pour le moment. Nous vous notifierons dès qu\'un match est trouvé.'
      };
    }

    // 2. Filtrer par préférence genre
    let filtered = otherRequests;

    // Si l'utilisateur veut femmes uniquement, filtrer
    if (request.femaleOnly) {
      filtered = filtered.filter(r => r.user.gender === 'FEMALE');
    }

    // Si d'autres demandent femmes uniquement et que l'utilisateur n'est pas femme, les exclure
    filtered = filtered.filter(r => {
      if (r.femaleOnly && request.user.gender !== 'FEMALE') {
        return false;
      }
      return true;
    });

    console.log(`✅ ${filtered.length} demande(s) après filtre genre`);

    if (filtered.length === 0) {
      return {
        matched: false,
        message: 'Aucun trajet compatible avec vos préférences pour le moment.'
      };
    }

    // 3. Filtrer par direction similaire (distance euclidienne d'abord pour optimiser)
    const nearbyRequests = filtered.filter(r => {
      const isClose = areDestinationsClose(
        request.destinationLat,
        request.destinationLng,
        r.destinationLat,
        r.destinationLng,
        15 // Max 15km de différence
      );
      return isClose;
    });

    console.log(`✅ ${nearbyRequests.length} demande(s) dans un rayon de 15km`);

    if (nearbyRequests.length === 0) {
      return {
        matched: false,
        message: 'Aucune personne ne va dans votre direction pour le moment.'
      };
    }

    // 4. Vérifier le détour via routing (plus précis mais plus lent)
    const compatibleRequests = [];
    for (const otherReq of nearbyRequests) {
      const acceptable = await isDetourAcceptable(
        {
          latitude: request.event.latitude!,
          longitude: request.event.longitude!
        },
        {
          latitude: request.destinationLat,
          longitude: request.destinationLng
        },
        {
          latitude: otherReq.destinationLat,
          longitude: otherReq.destinationLng
        },
        0.25, // Max 25% d'augmentation
        10000 // Max 10km de détour
      );

      if (acceptable) {
        compatibleRequests.push(otherReq);
      }
    }

    console.log(` ${compatibleRequests.length} demande(s) compatibles après vérification routing`);

    if (compatibleRequests.length === 0) {
      return {
        matched: false,
        message: 'Les trajets trouvés allongent trop votre route. Nous continuons à chercher...'
      };
    }

    // 5. Essayer de joindre un ride existant ou créer un nouveau
    for (const otherReq of compatibleRequests) {
      const existingRide = otherReq.ride;

      // Vérifier si le ride a encore de la place
      if (existingRide.currentPassengers < existingRide.maxPassengers) {
        // Ajouter l'utilisateur à ce ride
        await prisma.uberRideRequest.update({
          where: { id: requestId },
          data: {
            rideId: existingRide.id,
            status: 'ACCEPTED' // Match trouvé et accepté automatiquement
          }
        });

        await prisma.uberRide.update({
          where: { id: existingRide.id },
          data: {
            currentPassengers: { increment: 1 }
          }
        });

        // Notifier tous les membres du ride
        const allMembers = await prisma.uberRideRequest.findMany({
          where: {
            rideId: existingRide.id,
            status: { in: ['PENDING', 'ACCEPTED'] }
          }
        });

        for (const member of allMembers) {
          if (member.userId !== request.userId) {
            await notifyUberMatch(
              member.userId,
              existingRide.id,
              allMembers.length
            );
          }
        }

        // Optimiser l'itinéraire
        await optimizeRideRoute(existingRide.id);

        return {
          matched: true,
          rideId: existingRide.id,
          message: `Match trouvé ! Vous avez été ajouté à un groupe de ${allMembers.length} personne(s).`
        };
      }
    }

    // Si aucun ride existant n'a de place, essayer de créer un nouveau ride avec le meilleur match
    const bestMatch = compatibleRequests[0];

    // Fusionner les deux rides (si le bestMatch a déjà un ride)
    if (bestMatch.ride.requests.length === 1) {
      // Le bestMatch est seul dans son ride, on peut le joindre
      await prisma.uberRideRequest.update({
        where: { id: requestId },
        data: {
          rideId: bestMatch.rideId,
          status: 'ACCEPTED' // Match trouvé et accepté automatiquement
        }
      });

      await prisma.uberRide.update({
        where: { id: bestMatch.rideId },
        data: {
          currentPassengers: { increment: 1 },
          // Prendre l'heure de départ la plus tôt
          departureTime: request.maxDepartureTime < bestMatch.maxDepartureTime
            ? request.maxDepartureTime
            : bestMatch.maxDepartureTime
        }
      });

      // Notifier
      await notifyUberMatch(bestMatch.userId, bestMatch.rideId, 2);
      await notifyUberMatch(request.userId, bestMatch.rideId, 2);

      // Optimiser l'itinéraire
      await optimizeRideRoute(bestMatch.rideId);

      return {
        matched: true,
        rideId: bestMatch.rideId,
        message: 'Match trouvé ! Vous avez été mis en contact avec une personne.'
      };
    }

    return {
      matched: false,
      message: 'Tous les trajets compatibles sont pleins. Nous vous notifierons dès qu\'une place se libère.'
    };
  } catch (error) {
    console.error('Erreur matching:', error);
    return {
      matched: false,
      message: 'Erreur lors de la recherche de trajets compatibles.'
    };
  }
}

/**
 * Met à jour l'estimation de prix pour un ride
 */
async function updateRidePriceEstimate(rideId: string) {
  try {
    const ride = await prisma.uberRide.findUnique({
      where: { id: rideId },
      include: {
        requests: {
          where: { status: { in: ['PENDING', 'ACCEPTED'] } }
        }
      }
    });

    if (!ride || ride.requests.length === 0) {
      console.log('❌ Ride invalide pour estimation prix');
      return;
    }

    // Récupérer toutes les destinations
    const destinations = ride.requests.map(req => ({
      lat: req.destinationLat,
      lng: req.destinationLng
    }));

    // Calculer le prix estimé
    const priceEstimate = estimateUberPrice({
      departurePoint: {
        lat: ride.departureLat,
        lng: ride.departureLng
      },
      destinations,
      numberOfPassengers: ride.currentPassengers
    });

    // Mettre à jour dans la base de données
    await prisma.uberRide.update({
      where: { id: rideId },
      data: {
        estimatedCost: priceEstimate.perPersonEstimate
      }
    });

    console.log(`💰 Prix estimé mis à jour: ${priceEstimate.perPersonEstimate}€/personne (${priceEstimate.totalEstimate}€ total, ${priceEstimate.totalDistance}km)`);

    return priceEstimate;
  } catch (error) {
    console.error('Erreur mise à jour prix:', error);
    return null;
  }
}

/**
 * Optimiser l'itinéraire d'un ride pour minimiser la distance
 */
export async function optimizeRideRoute(rideId: string) {
  try {
    const ride = await prisma.uberRide.findUnique({
      where: { id: rideId },
      include: {
        requests: {
          where: { status: { in: ['PENDING', 'ACCEPTED'] } },
          include: { user: true }
        }
      }
    });

    if (!ride || ride.requests.length < 2) {
      console.log('Pas assez de passagers pour optimiser');
      // Mettre à jour le prix même avec 1 passager
      await updateRidePriceEstimate(rideId);
      return;
    }

    const origin = {
      latitude: ride.departureLat,
      longitude: ride.departureLng
    };

    const destinations = ride.requests.map(req => ({
      userId: req.userId,
      address: req.destinationAddress,
      latitude: req.destinationLat,
      longitude: req.destinationLng
    }));

    const optimized = await optimizeWaypoints(origin, destinations);

    if (optimized) {
      // Sauvegarder l'itinéraire optimisé
      await prisma.uberRide.update({
        where: { id: rideId },
        data: {
          route: optimized.waypoints,
          routePolyline: optimized.polyline
        }
      });

      console.log(` Itinéraire optimisé pour ride ${rideId}: ${optimized.totalDistance}m, ${Math.round(optimized.totalDuration / 60)} min`);
    }

    // Mettre à jour le prix estimé après optimisation
    await updateRidePriceEstimate(rideId);
  } catch (error) {
    console.error('Erreur optimisation route:', error);
  }
}

/**
 * Relancer le matching pour tous les rides en MATCHING
 * À exécuter périodiquement (ex: toutes les 5 minutes)
 */
export async function runPeriodicMatching() {
  try {
    console.log('= Lancement du matching périodique...');

    const pendingRequests = await prisma.uberRideRequest.findMany({
      where: {
        status: 'PENDING',
        ride: {
          status: 'MATCHING',
          currentPassengers: { lt: 4 }
        }
      }
    });

    console.log(`✅ ${pendingRequests.length} demande(s) en attente`);

    for (const request of pendingRequests) {
      await findMatches(request.id);
    }

    console.log(' Matching périodique terminé');
  } catch (error) {
    console.error('Erreur matching périodique:', error);
  }
}
