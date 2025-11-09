import { useEffect } from 'react';
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

  // Calculer le centre et le zoom pour afficher tous les points
  const allPoints = [
    [departureLat, departureLng],
    ...members.map(m => [m.destinationLat, m.destinationLng])
  ];

  const centerLat = allPoints.reduce((sum, point) => sum + (point[0] as number), 0) / allPoints.length;
  const centerLng = allPoints.reduce((sum, point) => sum + (point[1] as number), 0) / allPoints.length;

  return (
    <div className="w-full h-[400px] rounded-lg overflow-hidden border border-border">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={12}
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

        {/* Marqueurs de destination pour chaque membre */}
        {members.map((member) => (
          <Marker
            key={member.userId}
            position={[member.destinationLat, member.destinationLng]}
            icon={destinationIcon}
          >
            <Popup>
              <div className="text-sm">
                <strong className="font-semibold">
                  {member.user.firstName} {member.user.lastName}
                </strong>
                <p className="text-xs text-muted-foreground mt-1">{member.destinationAddress}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Lignes reliant le départ aux destinations */}
        {members.map((member) => (
          <Polyline
            key={`line-${member.userId}`}
            positions={[
              [departureLat, departureLng],
              [member.destinationLat, member.destinationLng]
            ]}
            color="#3b82f6"
            weight={3}
            opacity={0.6}
          />
        ))}
      </MapContainer>
    </div>
  );
}
