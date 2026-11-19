export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type VehicleType = 'moto' | 'velo' | 'voiture';
export type DeliveryStatus =
  | 'pending' | 'assigned' | 'heading_to_restaurant'
  | 'picked_up' | 'delivering' | 'delivered' | 'cancelled';

export interface Driver {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  city: string;
  zone?: string | null;
  vehicle_type: VehicleType;
  vehicle_plate?: string | null;
  verification_status: VerificationStatus;
  is_active: boolean;
  is_available: boolean;
  rating: number;
  total_deliveries: number;
  total_earnings_xof: number;
  photo_url?: string | null;
}

export interface DeliveryOrder {
  id: number;
  reference: string;
  restaurant: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    phone?: string | null;
    logo_url?: string | null;
  };
  delivery_address: string;
  delivery_latitude: number;
  delivery_longitude: number;
  delivery_phone?: string | null;
  delivery_instructions?: string | null;
  total: number;
  payment_method: string;
  items: { name: string; quantity: number }[];
}

export type IssueTypeRestaurant = 'restaurant_closed' | 'order_not_ready' | 'items_missing' | 'order_cancelled_by_restaurant';
export type IssueTypeClient = 'client_absent' | 'address_not_found' | 'order_refused' | 'order_damaged' | 'accident';
export type IssueType = IssueTypeRestaurant | IssueTypeClient;

export type OrderStatus =
  | 'draft' | 'pending_payment' | 'paid' | 'confirmed'
  | 'preparing' | 'ready' | 'delivering' | 'completed'
  | 'cancelled' | 'refunded';

export interface DeliveryRestaurant {
  name: string;
  address: string;
  logo_url?: string | null;
  latitude?: number;
  longitude?: number;
  phone?: string | null;
}

export interface Delivery {
  id: number;
  status: DeliveryStatus;
  order_status?: OrderStatus;
  tracking_token?: string | null;
  order?: DeliveryOrder;
  // Champs plats retournés par l'endpoint history
  restaurant?: DeliveryRestaurant;
  order_ref?: string;
  earning?: { net_amount: number; gross_amount: number; status: string | null };
  customer?: { address?: string | null; phone?: string | null };
  created_at?: string;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  cancelled_by?: string | null;
  distance_km?: number;
  estimated_minutes?: number;
  driver_earning_estimate?: number;
  assigned_at?: string | null;
  picked_up_at?: string | null;
  delivered_at?: string | null;
}

export interface Earning {
  id: number;
  gross_amount: number;
  net_amount: number;
  platform_cut: number;
  status: 'pending' | 'available' | 'paid';
  paid_at?: string | null;
  created_at: string;
  order?: { reference: string } | null;
  /** Référence de la commande, ou du colis (`COL-…`) quand kind = 'parcel'. */
  order_ref?: string | null;
  kind?: 'meal' | 'parcel';
}

export interface EarningsSummary {
  balance_available: number;
  today: number;
  this_week: number;
  this_month: number;
  total_lifetime: number;
  deliveries_today: number;
  deliveries_total: number;
}

// ── Colis ─────────────────────────────────────────────────────────────────────

export type ParcelStatus =
  | 'pending_payment' | 'searching_driver' | 'assigned'
  | 'picked_up' | 'delivering' | 'delivered' | 'cancelled' | 'failed';

export type ParcelSize = 'small' | 'medium' | 'large';

/** Course colis côté livreur (`/driver/parcels/*`, `kind: "parcel"`). */
export interface Parcel {
  kind: 'parcel';
  reference: string;
  status: ParcelStatus;
  status_label?: string;
  city?: string | null;
  size: ParcelSize;
  size_label?: string | null;
  description?: string | null;
  note?: string | null;
  pickup: {
    address: string;
    latitude: number;
    longitude: number;
    /** Masqués (null) avant acceptation. */
    contact_name?: string | null;
    contact_phone?: string | null;
  };
  dropoff: {
    address: string;
    latitude: number;
    longitude: number;
    /** Prénom seulement avant acceptation. */
    recipient_name?: string | null;
    recipient_phone?: string | null;
  };
  distance_km?: number | null;
  distance_to_pickup_km?: number | null;
  price: number;
  driver_earning_estimate?: number | null;
  payment_method: 'cash' | 'jeko' | 'partner_billing' | string;
  /** Espèces : montant à encaisser auprès de l'expéditeur AU RAMASSAGE (0 sinon). */
  cash_to_collect: number;
  cash_collected?: boolean;
  handover_attempts_left?: number;
  handover_locked?: boolean;
  pickup_photo_url?: string | null;
  assigned_at?: string | null;
  picked_up_at?: string | null;
  delivering_at?: string | null;
  delivered_at?: string | null;
  created_at?: string | null;
}
