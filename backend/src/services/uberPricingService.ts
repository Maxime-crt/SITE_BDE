/**
 * Service d'estimation des prix Uber
 * Utilise une formule basée sur les tarifs moyens UberX en France
 */

// Formule de Haversine pour calculer la distance entre deux points GPS
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface RouteStop {
  lat: number;
  lng: number;
}

interface PriceEstimateParams {
  departurePoint: RouteStop;
  destinations: RouteStop[];
  numberOfPassengers: number;
}

interface PriceEstimate {
  totalDistance: number;        // Distance totale en km
  totalEstimate: number;         // Prix total estimé
  perPersonEstimate: number;     // Prix par personne
  currency: string;              // Devise (EUR)
  breakdown: {
    basePrice: number;           // Prix de base
    distancePrice: number;       // Coût lié à la distance
    timePrice: number;           // Coût lié au temps
  };
}

/**
 * Tarifs moyens UberX en France (2024)
 * Sources : tarifs publics Uber + moyennes observées
 */
const PRICING = {
  BASE_FARE: 2.50,              // Prix de départ
  PRICE_PER_KM: 1.20,           // Prix au kilomètre
  PRICE_PER_MINUTE: 0.25,       // Prix par minute
  MINIMUM_FARE: 7.00,           // Prix minimum d'une course
  AVERAGE_SPEED_KMH: 30,        // Vitesse moyenne en ville (km/h)

  // Multiplicateurs selon l'heure (surge pricing simplifié)
  PEAK_MULTIPLIER: 1.3,         // Heures de pointe (18h-20h, vendredi/samedi soir)
  NIGHT_MULTIPLIER: 1.5,        // Nuit (00h-06h)
};

/**
 * Calcule l'itinéraire optimal et la distance totale
 * Utilise l'algorithme du plus proche voisin
 */
function calculateOptimalRoute(
  departurePoint: RouteStop,
  destinations: RouteStop[]
): { orderedDestinations: RouteStop[]; totalDistance: number } {
  if (destinations.length === 0) {
    return { orderedDestinations: [], totalDistance: 0 };
  }

  const orderedDestinations: RouteStop[] = [];
  const remaining = [...destinations];
  let currentLat = departurePoint.lat;
  let currentLng = departurePoint.lng;
  let totalDistance = 0;

  // Algorithme du plus proche voisin
  while (remaining.length > 0) {
    let closestIndex = 0;
    let minDistance = calculateDistance(
      currentLat,
      currentLng,
      remaining[0].lat,
      remaining[0].lng
    );

    for (let i = 1; i < remaining.length; i++) {
      const distance = calculateDistance(
        currentLat,
        currentLng,
        remaining[i].lat,
        remaining[i].lng
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }

    const closest = remaining.splice(closestIndex, 1)[0];
    orderedDestinations.push(closest);
    totalDistance += minDistance;
    currentLat = closest.lat;
    currentLng = closest.lng;
  }

  return { orderedDestinations, totalDistance };
}

/**
 * Détermine le multiplicateur de prix selon l'heure
 */
function getSurgeMultiplier(date: Date = new Date()): number {
  const hour = date.getHours();
  const day = date.getDay();

  // Nuit (00h-06h)
  if (hour >= 0 && hour < 6) {
    return PRICING.NIGHT_MULTIPLIER;
  }

  // Heures de pointe en semaine (18h-20h)
  if (day >= 1 && day <= 5 && hour >= 18 && hour <= 20) {
    return PRICING.PEAK_MULTIPLIER;
  }

  // Vendredi et samedi soir (20h-02h)
  if ((day === 5 || day === 6) && (hour >= 20 || hour < 2)) {
    return PRICING.PEAK_MULTIPLIER;
  }

  return 1.0; // Prix normal
}

/**
 * Estime le prix d'un trajet Uber partagé
 */
export function estimateUberPrice(params: PriceEstimateParams): PriceEstimate {
  const { departurePoint, destinations, numberOfPassengers } = params;

  // Calculer l'itinéraire optimal et la distance totale
  const { totalDistance } = calculateOptimalRoute(departurePoint, destinations);

  // Calculer le temps estimé du trajet (en minutes)
  const estimatedTimeMinutes = (totalDistance / PRICING.AVERAGE_SPEED_KMH) * 60;

  // Calculer les composantes du prix
  const basePrice = PRICING.BASE_FARE;
  const distancePrice = totalDistance * PRICING.PRICE_PER_KM;
  const timePrice = estimatedTimeMinutes * PRICING.PRICE_PER_MINUTE;

  // Prix total avant multiplicateur
  let totalEstimate = basePrice + distancePrice + timePrice;

  // Appliquer le multiplicateur de surge pricing
  const surgeMultiplier = getSurgeMultiplier();
  totalEstimate *= surgeMultiplier;

  // Appliquer le prix minimum
  if (totalEstimate < PRICING.MINIMUM_FARE) {
    totalEstimate = PRICING.MINIMUM_FARE;
  }

  // Arrondir à 2 décimales
  totalEstimate = Math.round(totalEstimate * 100) / 100;

  // Calculer le prix par personne
  const perPersonEstimate = Math.round((totalEstimate / numberOfPassengers) * 100) / 100;

  return {
    totalDistance: Math.round(totalDistance * 100) / 100,
    totalEstimate,
    perPersonEstimate,
    currency: 'EUR',
    breakdown: {
      basePrice: Math.round(basePrice * 100) / 100,
      distancePrice: Math.round(distancePrice * 100) / 100,
      timePrice: Math.round(timePrice * 100) / 100
    }
  };
}

/**
 * Version simplifiée pour un trajet avec une seule destination
 */
export function estimateSimpleUberPrice(
  departureLat: number,
  departureLng: number,
  destinationLat: number,
  destinationLng: number,
  numberOfPassengers: number = 1
): PriceEstimate {
  return estimateUberPrice({
    departurePoint: { lat: departureLat, lng: departureLng },
    destinations: [{ lat: destinationLat, lng: destinationLng }],
    numberOfPassengers
  });
}
