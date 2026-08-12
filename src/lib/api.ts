import type { Driver, Delivery, EarningsSummary, Earning } from './types';

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
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const isFormData = opts.body instanceof FormData;
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(opts.headers as Record<string, string> || {}),
  };
  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  console.log(`[API] ${opts.method ?? 'GET'} ${path}`, isFormData ? '(FormData)' : opts.body ?? '');

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  let data: any = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    console.error(`[API] ❌ ${res.status} ${path}`, data);
    let message = (data && (data.message || data.error)) || `HTTP ${res.status}`;
    if (res.status === 422 && data?.errors) {
      console.error(`[API] Validation errors:`, data.errors);
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

  console.log(`[API] ✓ ${res.status} ${path}`, data);
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
    form.append('_method', 'PUT');
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

  async getActiveDelivery(): Promise<Delivery | null> {
    try {
      const r = await request<{ data: Delivery | null }>('/driver/deliveries/active');
      return r.data;
    } catch { return null; }
  },

  async acceptDelivery(id: number): Promise<Delivery> {
    const r = await request<{ data: Delivery }>(`/driver/deliveries/${id}/accept`, { method: 'POST' });
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
};
