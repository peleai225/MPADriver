let watchId: number | null = null;
let lastSent = 0;
const THROTTLE_MS = 5000;

export function startTracking(onLocation: (lat: number, lng: number) => void): void {
  if (watchId !== null) return;
  if (!navigator.geolocation) return;

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const now = Date.now();
      if (now - lastSent < THROTTLE_MS) return;
      lastSent = now;
      onLocation(pos.coords.latitude, pos.coords.longitude);
    },
    (err) => console.warn('GPS error:', err.message),
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
  );
}

export function stopTracking(): void {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

export function isTracking(): boolean { return watchId !== null; }

export function openInMaps(lat: number, lng: number, label?: string): void {
  const query = label ? encodeURIComponent(label) : `${lat},${lng}`;
  const url = `https://maps.google.com/?q=${query}&ll=${lat},${lng}&navigate=yes`;
  window.open(url, '_blank');
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
