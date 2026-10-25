import { useSyncExternalStore } from 'react';

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
}

/**
 * État de la localisation, affiché au livreur quand elle ne fonctionne pas :
 *  - denied      : permission refusée (le navigateur ne redemandera pas, il faut passer par les réglages) ;
 *  - unavailable : GPS / « Localisation » du téléphone désactivé, ou pas de signal ;
 *  - unsupported : navigateur sans géolocalisation.
 */
export type GeoState = 'unknown' | 'prompt' | 'granted' | 'denied' | 'unavailable' | 'unsupported';

let geoState: GeoState = typeof navigator !== 'undefined' && !navigator.geolocation ? 'unsupported' : 'unknown';
const listeners = new Set<() => void>();

function setGeoState(s: GeoState): void {
  if (geoState === s) return;
  geoState = s;
  listeners.forEach(l => { try { l(); } catch {} });
}

export function useGeoState(): GeoState {
  return useSyncExternalStore(
    l => { listeners.add(l); return () => { listeners.delete(l); }; },
    () => geoState,
    () => 'unknown' as GeoState,
  );
}

// Suit les changements de permission (le livreur l'autorise depuis les réglages puis revient).
let permissionWatched = false;
function watchPermission(): void {
  if (permissionWatched || typeof navigator === 'undefined' || !navigator.permissions?.query) return;
  permissionWatched = true;
  navigator.permissions.query({ name: 'geolocation' as PermissionName }).then(status => {
    const apply = () => {
      if (status.state === 'denied') {
        setGeoState('denied');
      } else if (status.state === 'prompt') {
        if (geoState === 'unknown' || geoState === 'denied') setGeoState('prompt');
      } else if (status.state === 'granted' && geoState === 'denied') {
        setGeoState('granted');
        restartTracking();
      }
    };
    apply();
    status.onchange = apply;
  }).catch(() => {});
}

let watchId: number | null = null;
let lastSent = 0;
let lastCallback: ((pos: GeoPosition) => void) | null = null;
const THROTTLE_MS = 5000;

export function startTracking(onLocation: (pos: GeoPosition) => void): void {
  lastCallback = onLocation;
  watchPermission();
  if (watchId !== null) return;
  if (!navigator.geolocation) { setGeoState('unsupported'); return; }

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      setGeoState('granted');
      const now = Date.now();
      if (now - lastSent < THROTTLE_MS) return;
      lastSent = now;
      const c = pos.coords;
      lastCallback?.({
        lat: c.latitude,
        lng: c.longitude,
        accuracy: c.accuracy ?? undefined,
        speed: c.speed != null && c.speed >= 0 ? c.speed : undefined,
        heading: c.heading != null && c.heading >= 0 ? c.heading : undefined,
      });
    },
    (err) => {
      if (err.code === err.PERMISSION_DENIED) setGeoState('denied');
      else if (err.code === err.POSITION_UNAVAILABLE) setGeoState('unavailable');
      // TIMEOUT : pas de signal pour l'instant, watchPosition continue d'essayer.
      if (import.meta.env.DEV) console.warn('GPS error:', err.message);
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
  );
}

export function stopTracking(): void {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

/** Relance la localisation (après activation du GPS ou de la permission). */
export function restartTracking(): void {
  if (!lastCallback) return;
  const cb = lastCallback;
  stopTracking();
  if (geoState === 'unavailable') setGeoState('unknown');
  startTracking(cb);
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
