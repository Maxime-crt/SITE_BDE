import axios from 'axios';

interface GeocodingResult {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  postcode: string;
}

/**
 * Géocoder une adresse française en utilisant l'API du gouvernement
 * https://adresse.data.gouv.fr/api-doc/adresse
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  try {
    const response = await axios.get('https://api-adresse.data.gouv.fr/search/', {
      params: {
        q: address,
        limit: 1
      }
    });

    if (response.data.features && response.data.features.length > 0) {
      const feature = response.data.features[0];
      const [longitude, latitude] = feature.geometry.coordinates;

      return {
        latitude,
        longitude,
        address: feature.properties.label,
        city: feature.properties.city || '',
        postcode: feature.properties.postcode || ''
      };
    }

    return null;
  } catch (error) {
    console.error('Erreur géocodage:', error);
    return null;
  }
}

/**
 * Calculer la distance euclidienne entre deux points GPS (en km)
 * Formule de Haversine
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Vérifier si deux destinations sont dans un rayon acceptable (par exemple 15km)
 */
export function areDestinationsClose(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  maxDistanceKm: number = 15
): boolean {
  const distance = calculateDistance(lat1, lon1, lat2, lon2);
  return distance <= maxDistanceKm;
}
