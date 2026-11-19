import { useEffect, useRef } from 'react';

/**
 * Carte du trajet (point orange = départ : restaurant ou ramassage du colis ; point vert = arrivée).
 * Partagée par les écrans « course en cours » repas et colis.
 */
export function DeliveryMap({ restaurantLat, restaurantLng, clientLat, clientLng }: {
  restaurantLat: number; restaurantLng: number; clientLat: number; clientLng: number;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    let active = true;
    import('leaflet').then(L => {
      if (!active || !mapRef.current || mapInstance.current) return;
      import('leaflet/dist/leaflet.css');
      const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false });
      mapInstance.current = map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { crossOrigin: true }).addTo(map);
      const rIcon = L.divIcon({ html: '<div style="background:hsl(24.6,95%,53.1%);width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>', iconSize: [14, 14] });
      const cIcon = L.divIcon({ html: '<div style="background:#22C55E;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>', iconSize: [14, 14] });
      L.marker([restaurantLat, restaurantLng], { icon: rIcon }).addTo(map);
      L.marker([clientLat, clientLng], { icon: cIcon }).addTo(map);
      map.fitBounds(L.latLngBounds([[restaurantLat, restaurantLng], [clientLat, clientLng]]), { padding: [40, 40] });
    });
    return () => { active = false; mapInstance.current?.remove(); mapInstance.current = null; };
  }, []);
  return <div ref={mapRef} className="w-full h-full" />;
}
