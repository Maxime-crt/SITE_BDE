import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix pour les icônes Leaflet avec Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Fonction pour calculer la distance entre deux points (formule de Haversine)
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

interface RideMember {
  userId: string;
  destinationLat: number;
  destinationLng: number;
  destinationAddress: string;
  user: {
    firstName: string;
    lastName: string;
  };
}

interface RideMapProps {
  departureAddress: string;
  departureLat: number;
  departureLng: number;
  members: RideMember[];
  routePolyline?: string | null;
}

export default function RideMap({
  departureAddress,
  departureLat,
  departureLng,
  members,
  routePolyline
}: RideMapProps) {
  // Icône personnalisée pour le point de départ
  const startIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  // Icône pour les destinations
  const destinationIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  // Calculer l'ordre optimal des arrêts (algorithme du plus proche voisin)
  const getOptimalRoute = () => {
    if (members.length === 0) return [];

    const orderedMembers: RideMember[] = [];
    const remaining = [...members];
    let currentLat = departureLat;
    let currentLng = departureLng;

    // Algorithme du plus proche voisin
    while (remaining.length > 0) {
      let closestIndex = 0;
      let minDistance = calculateDistance(
        currentLat,
        currentLng,
        remaining[0].destinationLat,
        remaining[0].destinationLng
      );

      for (let i = 1; i < remaining.length; i++) {
        const distance = calculateDistance(
          currentLat,
          currentLng,
          remaining[i].destinationLat,
          remaining[i].destinationLng
        );
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = i;
        }
      }

      const closest = remaining.splice(closestIndex, 1)[0];
      orderedMembers.push(closest);
      currentLat = closest.destinationLat;
      currentLng = closest.destinationLng;
    }

    return orderedMembers;
  };

  const orderedMembers = getOptimalRoute();

  // Créer le chemin complet : départ -> arrêt 1 -> arrêt 2 -> ... -> arrêt N
  const routePath: [number, number][] = [
    [departureLat, departureLng],
    ...orderedMembers.map(m => [m.destinationLat, m.destinationLng] as [number, number])
  ];

  // Calculer le centre et le zoom pour afficher tous les points
  const allPoints = [
    [departureLat, departureLng],
    ...members.map(m => [m.destinationLat, m.destinationLng])
  ];

  const centerLat = allPoints.reduce((sum, point) => sum + (point[0] as number), 0) / allPoints.length;
  const centerLng = allPoints.reduce((sum, point) => sum + (point[1] as number), 0) / allPoints.length;

  // Calculer le zoom optimal basé sur la distance maximale entre les points
  const getOptimalZoom = () => {
    if (allPoints.length === 1) return 13;

    let maxDistance = 0;
    for (let i = 0; i < allPoints.length; i++) {
      for (let j = i + 1; j < allPoints.length; j++) {
        const distance = calculateDistance(
          allPoints[i][0] as number,
          allPoints[i][1] as number,
          allPoints[j][0] as number,
          allPoints[j][1] as number
        );
        if (distance > maxDistance) {
          maxDistance = distance;
        }
      }
    }

    // Ajuster le zoom en fonction de la distance maximale
    if (maxDistance < 1) return 15;      // < 1km : très proche
    if (maxDistance < 3) return 14;      // 1-3km : proche
    if (maxDistance < 5) return 13;      // 3-5km : moyen
    if (maxDistance < 10) return 12;     // 5-10km : éloigné
    if (maxDistance < 20) return 11;     // 10-20km : très éloigné
    return 10;                            // > 20km : très très éloigné
  };

  const optimalZoom = getOptimalZoom();

  return (
    <div className="w-full h-[400px] rounded-lg overflow-hidden border border-border">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={optimalZoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Marqueur de départ (soirée) */}
        <Marker position={[departureLat, departureLng]} icon={startIcon}>
          <Popup>
            <div className="text-sm">
              <strong className="font-semibold">Point de départ</strong>
              <p className="text-xs text-muted-foreground mt-1">{departureAddress}</p>
            </div>
          </Popup>
        </Marker>

        {/* Marqueurs de destination pour chaque membre avec numéro d'ordre */}
        {orderedMembers.map((member, index) => (
          <Marker
            key={member.userId}
            position={[member.destinationLat, member.destinationLng]}
            icon={destinationIcon}
          >
            <Popup>
              <div className="text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-600 text-white text-xs font-bold">
                    {index + 1}
                  </span>
                  <strong className="font-semibold">
                    {member.user.firstName} {member.user.lastName}
                  </strong>
                </div>
                <p className="text-xs text-muted-foreground">{member.destinationAddress}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Chemin optimal passant par tous les points */}
        {routePath.length > 1 && (
          <Polyline
            positions={routePath}
            color="#3b82f6"
            weight={4}
            opacity={0.7}
            dashArray="10, 5"
          />
        )}
      </MapContainer>
    </div>
  );
}
