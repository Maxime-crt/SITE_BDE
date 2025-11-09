import axios from 'axios';

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface RouteResult {
  distance: number; // en mètres
  duration: number; // en secondes
  polyline?: string; // Encoded polyline pour affichage sur carte
}

interface OptimizedRoute {
  waypoints: Array<{
    userId: string;
    address: string;
    latitude: number;
    longitude: number;
    order: number; // Ordre de visite
  }>;
  totalDistance: number; // en mètres
  totalDuration: number; // en secondes
  polyline?: string;
}

/**
 * Calculer un itinéraire entre plusieurs points en utilisant OSRM (Open Source Routing Machine)
 * API publique gratuite : http://router.project-osrm.org/
 */
export async function calculateRoute(
  origin: Coordinates,
  destination: Coordinates
): Promise<RouteResult | null> {
  try {
    const url = `http://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;

    const response = await axios.get(url, {
      params: {
        overview: 'full', // Retourner la géométrie complète
        geometries: 'polyline' // Format polyline
      },
      timeout: 5000
    });

    if (response.data.code !== 'Ok' || !response.data.routes || response.data.routes.length === 0) {
      console.error('OSRM: Aucune route trouvée');
      return null;
    }

    const route = response.data.routes[0];

    return {
      distance: route.distance, // mètres
      duration: route.duration, // secondes
      polyline: route.geometry
    };
  } catch (error) {
    console.error('Erreur calcul route OSRM:', error);
    return null;
  }
}

/**
 * Vérifier si ajouter un détour est acceptable
 * Compare le trajet direct (origin ’ destA) avec le trajet avec détour (origin ’ destA ’ destB)
 *
 * @param maxDetourPercentage - Augmentation maximale acceptable (ex: 0.25 = 25%)
 * @param maxDetourMeters - Augmentation maximale en mètres (ex: 10000 = 10km)
 */
export async function isDetourAcceptable(
  origin: Coordinates,
  destA: Coordinates,
  destB: Coordinates,
  maxDetourPercentage: number = 0.25,
  maxDetourMeters: number = 10000
): Promise<boolean> {
  try {
    // Calculer le trajet direct: origin ’ destA
    const directRoute = await calculateRoute(origin, destA);
    if (!directRoute) return false;

    // Calculer le trajet avec détour: origin ’ destB ’ destA (ou origin ’ destA ’ destB)
    // On teste les deux ordres et on prend le plus court
    const route1 = await calculateMultiPointRoute([origin, destB, destA]);
    const route2 = await calculateMultiPointRoute([origin, destA, destB]);

    if (!route1 && !route2) return false;

    const detourRoute = !route1 ? route2! :
                        !route2 ? route1! :
                        route1.totalDistance < route2.totalDistance ? route1 : route2;

    const detourDistance = detourRoute.totalDistance;
    const directDistance = directRoute.distance;

    const increasePercent = (detourDistance - directDistance) / directDistance;
    const increaseMeters = detourDistance - directDistance;

    console.log(`Détour: ${directDistance}m ’ ${detourDistance}m (+${(increasePercent * 100).toFixed(1)}%, +${increaseMeters}m)`);

    // Accepter si l'augmentation est dans les limites
    return increasePercent <= maxDetourPercentage && increaseMeters <= maxDetourMeters;
  } catch (error) {
    console.error('Erreur vérification détour:', error);
    return false;
  }
}

/**
 * Calculer un itinéraire multi-points (avec plusieurs arrêts)
 */
export async function calculateMultiPointRoute(
  waypoints: Coordinates[]
): Promise<OptimizedRoute | null> {
  try {
    if (waypoints.length < 2) {
      console.error('Au moins 2 points requis pour un itinéraire');
      return null;
    }

    // Construire l'URL avec tous les waypoints
    const coords = waypoints
      .map(w => `${w.longitude},${w.latitude}`)
      .join(';');

    const url = `http://router.project-osrm.org/route/v1/driving/${coords}`;

    const response = await axios.get(url, {
      params: {
        overview: 'full',
        geometries: 'polyline'
      },
      timeout: 10000
    });

    if (response.data.code !== 'Ok' || !response.data.routes || response.data.routes.length === 0) {
      console.error('OSRM: Aucune route trouvée');
      return null;
    }

    const route = response.data.routes[0];

    return {
      waypoints: [], // À remplir par l'appelant
      totalDistance: route.distance,
      totalDuration: route.duration,
      polyline: route.geometry
    };
  } catch (error) {
    console.error('Erreur calcul route multi-points:', error);
    return null;
  }
}

/**
 * Optimiser l'ordre des arrêts pour minimiser la distance totale
 * Utilise l'API Trip de OSRM qui résout le problème du voyageur de commerce (TSP)
 */
export async function optimizeWaypoints(
  origin: Coordinates,
  destinations: Array<Coordinates & { userId: string; address: string }>
): Promise<OptimizedRoute | null> {
  try {
    // Construire la liste de tous les points (origin + destinations)
    const allPoints = [origin, ...destinations];
    const coords = allPoints
      .map(p => `${p.longitude},${p.latitude}`)
      .join(';');

    const url = `http://router.project-osrm.org/trip/v1/driving/${coords}`;

    const response = await axios.get(url, {
      params: {
        source: 'first', // Commencer par le premier point (origin)
        destination: 'any', // Terminer n'importe où
        roundtrip: false, // Pas de retour au point de départ
        overview: 'full',
        geometries: 'polyline'
      },
      timeout: 10000
    });

    if (response.data.code !== 'Ok' || !response.data.trips || response.data.trips.length === 0) {
      console.error('OSRM Trip: Aucun itinéraire trouvé');
      return null;
    }

    const trip = response.data.trips[0];
    const waypointIndices = trip.waypoints.map((wp: any) => wp.waypoint_index);

    // Construire les waypoints dans l'ordre optimisé (sans le point d'origine)
    const optimizedWaypoints = waypointIndices
      .slice(1) // Ignorer le premier (origin)
      .map((index: number, order: number) => {
        const dest = destinations[index - 1]; // -1 car on a skip origin
        return {
          userId: dest.userId,
          address: dest.address,
          latitude: dest.latitude,
          longitude: dest.longitude,
          order: order + 1
        };
      });

    return {
      waypoints: optimizedWaypoints,
      totalDistance: trip.distance,
      totalDuration: trip.duration,
      polyline: trip.geometry
    };
  } catch (error) {
    console.error('Erreur optimisation waypoints:', error);
    return null;
  }
}
