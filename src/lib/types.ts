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

export interface Delivery {
  id: number;
  status: DeliveryStatus;
  order: DeliveryOrder;
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
