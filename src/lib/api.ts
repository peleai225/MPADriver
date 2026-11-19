import type { Driver, Delivery, EarningsSummary, Earning, IssueType, Parcel } from './types';
import { markOffline, markOnline, isNetworkError } from './network';
import { setCachedActiveDelivery, getCachedActiveDelivery } from './activeDelivery';
import { setCachedActiveParcel, getCachedActiveParcel } from './activeParcel';
import { withPendingStatus, withPendingParcelStatus, clearOutbox } from './outboxStore';

export const API_BASE = (import.meta.env.VITE_API_BASE as string) || 'https://www.menupro.ci/api/v1';

const TOKEN_KEY = 'driver_token';
const DRIVER_KEY = 'driver_profile';

export function getToken(): string | null { return localStorage.getItem(TOKEN_KEY); }
export function getDriver(): Driver | null {
  try { const r = localStorage.getItem(DRIVER_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}
export function setAuth(token: string, driver: Driver) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(DRIVER_KEY, JSON.stringify(driver));
}
export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(DRIVER_KEY);
  // Données du livreur précédent : ne jamais les laisser à un autre compte sur le même téléphone.
  clearOutbox();
  setCachedActiveDelivery(null);
  setCachedActiveParcel(null);
}

/** Délai max d'un appel : sur un réseau faible, fetch peut rester bloqué plusieurs minutes sans erreur. */
const DEFAULT_TIMEOUT_MS = 20000;
const UPLOAD_TIMEOUT_MS = 90000;

type RequestOptions = RequestInit & { timeoutMs?: number };

function networkError(cause: unknown, timedOut: boolean): Error {
  const err: any = new Error(timedOut
    ? 'Le réseau ne répond pas. Réessayez.'
    : 'Pas de connexion Internet.');
  err.network = true;
  err.cause = cause;
  return err;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const token = getToken();
  const isFormData = opts.body instanceof FormData;
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(opts.headers as Record<string, string> || {}),
  };
  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  if (import.meta.env.DEV) console.log(`[API] ${opts.method ?? 'GET'} ${path}`, isFormData ? '(FormData)' : opts.body ?? '');

  const { timeoutMs = isFormData ? UPLOAD_TIMEOUT_MS : DEFAULT_TIMEOUT_MS, ...init } = opts;
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);

  let res: Response;
  let text: string;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers, signal: controller.signal });
    text = await res.text();
  } catch (e) {
    markOffline();
    throw networkError(e, timedOut);
  } finally {
    clearTimeout(timer);
  }
  markOnline();

  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    if (import.meta.env.DEV) console.error(`[API] ${res.status} ${path}`, data);
    let message = (data && (data.message || data.error)) || `HTTP ${res.status}`;
    if (res.status === 422 && data?.errors) {
      if (import.meta.env.DEV) console.error(`[API] Validation errors:`, data.errors);
      const firstField = Object.keys(data.errors)[0];
      if (firstField && data.errors[firstField]?.[0]) {
        message = data.errors[firstField][0];
      }
    }
    if (res.status === 401 && !path.includes('/auth/login') && token && token === getToken()) {
      clearAuth();
    }
    const err: any = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  if (import.meta.env.DEV) console.log(`[API] ${res.status} ${path}`, data);
  return data as T;
}

export const api = {
  // Auth
  async login(phone: string, password: string): Promise<Driver> {
    const data = await request<{ token: string; driver: Driver }>('/driver/auth/login', {
      method: 'POST', body: JSON.stringify({ phone, password }),
    });
    setAuth(data.token, data.driver);
    return data.driver;
  },

  async register(form: FormData): Promise<void> {
    await request('/driver/auth/register', { method: 'POST', body: form });
  },

  async me(): Promise<Driver> {
    const r = await request<any>('/driver/auth/me');
    return r.driver ?? r.data ?? r;
  },

  async logout(): Promise<void> {
    try { await request('/driver/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    clearAuth();
  },

  async updateProfile(form: FormData): Promise<Driver> {
    form.append('_method', 'PATCH');
    const r = await request<any>('/driver/auth/profile', { method: 'POST', body: form });
    return r.driver ?? r.data ?? r;
  },

  async registerFcmToken(token: string): Promise<void> {
    await request('/driver/auth/fcm-token', { method: 'PATCH', body: JSON.stringify({ fcm_token: token }) });
  },

  // Status & location
  async setOnline(online: boolean): Promise<void> {
    await request('/driver/status', { method: 'POST', body: JSON.stringify({ online }) });
  },

  async updateLocation(lat: number, lng: number, accuracy?: number, speed?: number, heading?: number): Promise<void> {
    await request('/driver/location', {
      method: 'PATCH',
      body: JSON.stringify({ latitude: lat, longitude: lng, accuracy, speed, heading }),
    });
  },

  // Deliveries
  async getPendingDeliveries(): Promise<Delivery[]> {
    const r = await request<{ data: Delivery[] }>('/driver/deliveries/pending');
    return r.data;
  },

  async getDeliveryHistory(page = 1): Promise<{ data: Delivery[]; meta: { current_page: number; last_page: number } }> {
    return request(`/driver/deliveries/history?page=${page}`);
  },

  /**
   * Course active. Hors ligne (ou délai dépassé), renvoie la dernière course connue sur le téléphone
   * au lieu de « aucune course » : le livreur garde l'adresse, le téléphone du client et ses actions.
   */
  async getActiveDelivery(): Promise<Delivery | null> {
    try {
      const r = await request<{ data: Delivery | null }>('/driver/deliveries/active');
      // Des étapes validées hors ligne peuvent ne pas être encore arrivées au serveur : on les garde.
      const d = r.data ? withPendingStatus(r.data) : null;
      setCachedActiveDelivery(d);
      return d;
    } catch (e) {
      if (isNetworkError(e)) return getCachedActiveDelivery();
      return null;
    }
  },

  async acceptDelivery(id: number): Promise<Delivery> {
    const r = await request<{ data: Delivery }>(`/driver/deliveries/${id}/accept`, { method: 'POST' });
    setCachedActiveDelivery(r.data);
    return r.data;
  },

  async declineDelivery(id: number): Promise<void> {
    await request(`/driver/deliveries/${id}/decline`, { method: 'POST' });
  },

  async updateDeliveryStatus(id: number, status: string): Promise<Delivery> {
    const r = await request<{ data: Delivery }>(`/driver/deliveries/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    setCachedActiveDelivery(withPendingStatus(r.data));
    return r.data;
  },

  // Earnings
  async getEarnings(): Promise<EarningsSummary> {
    return request<EarningsSummary>('/driver/earnings');
  },

  async getEarningsHistory(page = 1): Promise<{ data: Earning[]; meta: { current_page: number; last_page: number } }> {
    return request(`/driver/earnings/history?page=${page}`);
  },

  async requestPayout(amount: number, phone: string): Promise<void> {
    await request('/driver/earnings/payout', {
      method: 'POST',
      body: JSON.stringify({ amount, payment_method: 'wave', mobile: phone }),
    });
  },

  // Delivery verification
  async verifyDeliveryCode(deliveryId: number, code: string): Promise<{ valid: boolean; message: string }> {
    return await request(`/driver/deliveries/${deliveryId}/verify-code`, {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  async uploadDeliveryProof(deliveryId: number, photo: File): Promise<{ message: string }> {
    const form = new FormData();
    form.append('photo', photo);
    return await request(`/driver/deliveries/${deliveryId}/upload-proof`, {
      method: 'POST',
      body: form,
    });
  },

  async reportIssue(deliveryId: number, issueType: IssueType, details?: string): Promise<{ message: string }> {
    return await request(`/driver/deliveries/${deliveryId}/report-issue`, {
      method: 'POST',
      body: JSON.stringify({ issue_type: issueType, issue_details: details }),
    });
  },

  async cancelDelivery(deliveryId: number, reason: string): Promise<void> {
    await request(`/driver/deliveries/${deliveryId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  // Cash on delivery
  async confirmCashCollected(deliveryId: number, amountCollected: number): Promise<{ message: string; amount_owed: number; restaurant: string }> {
    return await request(`/driver/deliveries/${deliveryId}/cash-collected`, {
      method: 'POST',
      body: JSON.stringify({ amount_collected: amountCollected }),
    });
  },

  async getCashBalance(): Promise<{ total_owed_xof: number; debts: Array<{ id: number; restaurant_name: string; order_ref: string; amount_xof: number; created_at: string }> }> {
    return await request('/driver/cash-balance');
  },

  async declareCashRemittance(data: { debt_id: number; amount_xof: number; method: string; wave_reference?: string; note?: string }): Promise<{ message: string; remittance_id: number }> {
    return await request('/driver/cash-remittances', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getCashRemittances(): Promise<any> {
    return await request('/driver/cash-remittances');
  },

  // ── Colis (/driver/parcels/*) ──
  // Erreurs métier : { message, error_code, …extra } (ex. attempts_left) — disponibles dans err.data.

  async getAvailableParcels(): Promise<Parcel[]> {
    const r = await request<{ data: Parcel[] }>('/driver/parcels/available');
    return r.data ?? [];
  },

  /** Colis en cours. Hors ligne : dernier colis connu sur le téléphone (comme getActiveDelivery). */
  async getActiveParcel(): Promise<Parcel | null> {
    try {
      const r = await request<{ data: Parcel | null }>('/driver/parcels/active');
      const p = r.data ? withPendingParcelStatus(r.data) : null;
      setCachedActiveParcel(p);
      return p;
    } catch (e) {
      if (isNetworkError(e)) return getCachedActiveParcel();
      return null;
    }
  },

  async getParcelHistory(page = 1): Promise<{ data: Parcel[]; meta: { current_page: number; last_page: number; total?: number } }> {
    return request(`/driver/parcels/history?page=${page}`);
  },

  async getParcel(reference: string): Promise<Parcel> {
    const r = await request<{ data: Parcel }>(`/driver/parcels/${encodeURIComponent(reference)}`);
    return r.data;
  },

  async acceptParcel(reference: string): Promise<Parcel> {
    const r = await request<{ data: Parcel }>(`/driver/parcels/${encodeURIComponent(reference)}/accept`, { method: 'POST' });
    setCachedActiveParcel(r.data);
    return r.data;
  },

  /** Ramassage : photo obligatoire (multipart) ; en espèces, cash_received = 1 obligatoire. */
  async pickupParcel(reference: string, photo: File, cashReceived: boolean): Promise<Parcel> {
    const form = new FormData();
    form.append('photo', photo, photo.name || 'colis.jpg');
    if (cashReceived) form.append('cash_received', '1');
    const r = await request<{ data: Parcel }>(`/driver/parcels/${encodeURIComponent(reference)}/pickup`, { method: 'POST', body: form });
    setCachedActiveParcel(r.data);
    return r.data;
  },

  async startParcel(reference: string): Promise<Parcel> {
    const r = await request<{ data: Parcel }>(`/driver/parcels/${encodeURIComponent(reference)}/start`, { method: 'POST' });
    setCachedActiveParcel(withPendingParcelStatus(r.data));
    return r.data;
  },

  async deliverParcel(reference: string, code: string): Promise<{ data: Parcel; earning?: number; message?: string }> {
    const r = await request<{ data: Parcel; earning?: number; message?: string }>(`/driver/parcels/${encodeURIComponent(reference)}/deliver`, {
      method: 'POST', body: JSON.stringify({ code }),
    });
    setCachedActiveParcel(null);
    return r;
  },

  /** Avant ramassage : désistement (status searching_driver). Après : échec (status failed). */
  async failParcel(reference: string, reason: string): Promise<{ message: string; status: string }> {
    const r = await request<{ message: string; status: string }>(`/driver/parcels/${encodeURIComponent(reference)}/fail`, {
      method: 'POST', body: JSON.stringify({ reason }),
    });
    if (getCachedActiveParcel()?.reference === reference) setCachedActiveParcel(null);
    return r;
  },
};
