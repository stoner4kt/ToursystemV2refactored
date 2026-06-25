import { createClient } from '@supabase/supabase-js';

// Define TypeScript interfaces for our INYATHI Database Schema
export interface Profile {
  driver_id: string; // DRV-XXXXXX
  name: string;
  phone: string;
  email: string;
  role: 'admin' | 'driver';
  is_active: boolean;
  location: 'Cape Town' | 'Joburg';
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  registration_no: string; // Unique primary key
  make: string;
  model: string;
  year: number;
  current_mileage: number;
  next_service_km: number;
  status: 'active' | 'maintenance' | 'decommissioned';
  color: string; // Hex color code for calendar visual bars
  location: 'Cape Town' | 'Joburg';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RentedVehicle {
  id: string;
  supplier: string;
  reg_no: string;
  make: string;
  model: string;
  start_date: string;
  end_date: string;
  daily_rate: number;
  supplier_ref: string;
  status: 'active' | 'returned' | 'cancelled';
  notes?: string;
  assigned_booking_id?: string;
  assigned_driver_id?: string;
  created_at: string;
}

export interface Booking {
  invoice_no: string; // Unique primary key
  client_name: string;
  route: string;
  tour_reference: string;
  start_date: string; // ISO string
  end_date: string; // ISO string
  assigned_driver_id: string; // profiles.driver_id
  assigned_vehicle_reg: string; // vehicles.registration_no (empty if rented)
  status: 'pending' | 'confirmed' | 'invoiced' | 'completed' | 'cancelled';
  payment_status: 'paid' | 'unpaid';
  receipt_number?: string;
  booking_documents: Array<{
    id: string;
    url: string;
    filename: string;
    size: number;
    uploaded_at: string;
  }>;
  itinerary_url?: string;
  itinerary_filename?: string;
  itinerary_uploaded_at?: string;
  maintenance_alert_sent: boolean;
  maintenance_alert_sent_at?: string;
  last_modified_at?: string;
  modification_reason?: string;
  is_rented_vehicle: boolean;
  rented_vehicle_id?: string;
  rented_vehicle_reg?: string;
  rented_vehicle_model?: string;
  location: 'Cape Town' | 'Joburg';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Inspection {
  id: string;
  invoice_no: string;
  vehicle_reg: string;
  driver_id: string;
  inspection_type: 'pre-trip' | 'post-trip';
  checklist_json: Record<string, 'pass' | 'fail' | 'flag'>;
  faults_json: Record<string, string>; // item -> description of fault
  media_urls: Record<string, string>; // item -> Cloudinary URL
  mileage_at_inspection: number;
  notes?: string;
  has_critical_fault: boolean;
  alert_sent: boolean;
  is_rented_vehicle: boolean;
  rented_vehicle_model?: string;
  signature_url?: string; // base64 or Cloudinary URL
  created_at: string;
}

export interface ReconCostLine {
  id: string;
  description: string;
  amount: number;
}

export interface ReconSheet {
  id: string;
  driver_id: string;
  week_start: string; // YYYY-MM-DD
  week_end: string; // YYYY-MM-DD
  tour_reference: string;
  vehicle_reg: string;
  start_km: number;
  end_km: number;
  total_distance_km: number;
  trips_completed: number;
  total_hours: number;
  cost_lines: ReconCostLine[];
  trip_budget: number;
  driver_food: number;
  flights_to_from: number;
  driver_rate: number;
  accommodation: number;
  total_profit_loss: number;
  director_sign_off: boolean;
  
  // Wellness / Condition metrics (1 - 10 scale for numericals)
  vehicle_issues: string;
  accidents_incidents: string;
  traffic_violations: string;
  safety_concerns: string;
  maintenance_needed: string;
  fuel_consumption: string;
  tires_condition: string;
  fatigue_level: number; // 1-10
  stress_level: number; // 1-10
  health_issues: string;
  driver_notes?: string;

  slip_image_urls: string[]; // List of receipts
  admin_review_notes?: string;
  
  // Edit Request State
  edit_request_status: 'none' | 'pending' | 'approved' | 'rejected';
  edit_request_reason?: string;
  edit_request_rejection_reason?: string;

  status: 'draft' | 'submitted' | 'reviewed';
  submitted_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TransferRow {
  id: string;
  date: string;
  passenger_name: string;
  pickup_location: string;
  dropoff_location: string;
  amount: number;
  invoice_or_tour_ref: string;
}

export interface TransferReconSheet {
  id: string;
  driver_id: string;
  week_start: string;
  week_end: string;
  transfers: TransferRow[];
  status: 'draft' | 'submitted' | 'reviewed';
  
  // Edit Request State
  edit_request_status: 'none' | 'pending' | 'approved' | 'rejected';
  edit_request_reason?: string;
  edit_request_rejection_reason?: string;

  submitted_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DriverInvite {
  email: string;
  full_name: string;
  location: 'Cape Town' | 'Joburg';
  invited_by: string;
  invited_at: string;
  used_at?: string;
}

export interface OtpVerification {
  id: string;
  admin_id: string;
  resource_type: 'recon_edit' | 'booking_edit' | 'booking_delete' | 'expense_approval';
  resource_id: string;
  otp_hash: string;
  created_at: string;
  expires_at: string;
  verified_at?: string;
  attempts: number;
}

export interface BookingEditLog {
  id: string;
  booking_id: string;
  admin_id: string;
  action: 'edit' | 'delete';
  reason: string;
  old_values?: any;
  new_values?: any;
  approved_at?: string;
  created_at: string;
}

export interface BookingDeleteRequest {
  id: string;
  booking_id: string;
  requested_by: string;
  reason: string;
  cancellation_type: 'mistake' | 'client_cancelled';
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface VehicleExpense {
  id: string;
  vehicle_reg: string;
  driver_id?: string;
  logged_by_admin_id?: string;
  expense_type: 'Tyres' | 'Service' | 'Damage' | 'Repair' | 'Accident' | 'Other';
  description: string;
  amount: number;
  expense_date: string;
  document_urls: string[];
  photo_urls: string[];
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  submitted_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  alert_sent: boolean;
  driver_notified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TrafficFine {
  id: string;
  booking_id: string;
  vehicle_reg: string;
  driver_id: string;
  fine_timestamp: string; // ISO DateTime
  fine_reference: string;
  location: string;
  description: string;
  amount: number;
  notification_email: string;
  email_sent: boolean;
  email_sent_at?: string;
  notification_error?: string;
  status: 'paid' | 'pending';
  logged_by_admin_id: string;
  created_at: string;
  updated_at: string;
}

export interface IncidentReport {
  id: string;
  booking_id?: string;
  driver_id: string;
  vehicle_reg: string;
  incident_type: string;
  description: string;
  location: string;
  injuries: boolean;
  photo_urls: string[];
  document_urls: string[];
  status: 'reported' | 'reviewed' | 'closed';
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface VehicleChecklist {
  id: string;
  driver_id: string;
  week_start: string;
  week_end: string;
  status: 'draft' | 'submitted';
  checklist_data: {
    engine_oil: 'ok' | 'low' | 'action';
    coolant: 'ok' | 'low' | 'action';
    brake_fluid: 'ok' | 'low' | 'action';
    windshield_washer: 'ok' | 'low' | 'action';
    tyres_pressure: 'ok' | 'action';
    tyres_tread: 'ok' | 'action';
    lights_headlights: 'ok' | 'action';
    lights_indicators: 'ok' | 'action';
    lights_brake: 'ok' | 'action';
    wipers: 'ok' | 'action';
    horn: 'ok' | 'action';
    bodywork: 'ok' | 'action';
  };
  mileage: number;
  notes?: string;
  submitted_at?: string;
  created_at: string;
}

// Check for Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Initial Seed Data for local storage fallback
const SEED_PROFILES: Profile[] = [
  {
    driver_id: 'DRV-ADM001',
    name: 'Chief Admin',
    phone: '+27 82 123 4567',
    email: 'admin@inyathi.co.za',
    role: 'admin',
    is_active: true,
    location: 'Cape Town',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  },
  {
    driver_id: 'DRV-9F3E21',
    name: 'Thabo Ndlovu',
    phone: '+27 73 987 6543',
    email: 'thabo@inyathi.co.za',
    role: 'driver',
    is_active: true,
    location: 'Cape Town',
    created_at: '2026-01-10T08:00:00Z',
    updated_at: '2026-01-10T08:00:00Z'
  },
  {
    driver_id: 'DRV-2D8C9A',
    name: 'Sipho Zulu',
    phone: '+27 84 555 1234',
    email: 'sipho@inyathi.co.za',
    role: 'driver',
    is_active: true,
    location: 'Joburg',
    created_at: '2026-02-15T09:00:00Z',
    updated_at: '2026-02-15T09:00:00Z'
  },
  {
    driver_id: 'DRV-7A5F4B',
    name: 'Liam Botha',
    phone: '+27 82 345 6789',
    email: 'liam@inyathi.co.za',
    role: 'driver',
    is_active: true,
    location: 'Cape Town',
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-01T10:00:00Z'
  }
];

const SEED_VEHICLES: Vehicle[] = [
  {
    registration_no: 'CA 234-890',
    make: 'Toyota',
    model: 'Quantum GL 14-Seater',
    year: 2022,
    current_mileage: 124500,
    next_service_km: 130000,
    status: 'active',
    color: '#0D9488', // Teal-600
    location: 'Cape Town',
    notes: 'Primary long-distance tour vehicle. Excellent condition.',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  },
  {
    registration_no: 'CA 765-432',
    make: 'Mercedes-Benz',
    model: 'Sprinter 519 CDI 22-Seater',
    year: 2021,
    current_mileage: 185200,
    next_service_km: 190000,
    status: 'active',
    color: '#4F46E5', // Indigo-600
    location: 'Cape Town',
    notes: 'Luxury large coach. Aircon and USB chargers operational.',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  },
  {
    registration_no: 'GP 889-LP',
    make: 'Toyota',
    model: 'Quantum GL 14-Seater',
    year: 2023,
    current_mileage: 48900,
    next_service_km: 50000,
    status: 'active',
    color: '#0891B2', // Cyan-600
    location: 'Joburg',
    notes: 'Low mileage. Spotless interior.',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  },
  {
    registration_no: 'GP 112-RT',
    make: 'Volkswagen',
    model: 'Crafter 50 22-Seater',
    year: 2020,
    current_mileage: 215400,
    next_service_km: 216000,
    status: 'maintenance',
    color: '#EA580C', // Orange-600
    location: 'Joburg',
    notes: 'In for scheduled front brake disc replacements.',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  }
];

const SEED_RENTED_VEHICLES: RentedVehicle[] = [
  {
    id: 'rv-01',
    supplier: 'AVIS Safari Fleet',
    reg_no: 'CA 998-112',
    make: 'Toyota',
    model: 'Land Cruiser Double Cab',
    start_date: '2026-06-20',
    end_date: '2026-07-05',
    daily_rate: 2200,
    supplier_ref: 'AVS-908273',
    status: 'active',
    notes: 'Rented for safari package overflow in Cape Town region.',
    created_at: '2026-06-20T08:00:00Z'
  }
];

const SEED_BOOKINGS: Booking[] = [
  {
    invoice_no: 'INV-2026-001',
    client_name: 'Go2Africa Safari Group',
    route: 'Cape Town - Stellenbosch - Franschhoek - Cape Town',
    tour_reference: 'WINELANDS-77A',
    start_date: '2026-06-24T08:00:00Z',
    end_date: '2026-06-26T18:00:00Z',
    assigned_driver_id: 'DRV-9F3E21', // Thabo
    assigned_vehicle_reg: 'CA 234-890', // Quantum
    status: 'confirmed',
    payment_status: 'paid',
    receipt_number: 'REC-90821-CT',
    booking_documents: [],
    itinerary_url: '',
    maintenance_alert_sent: false,
    is_rented_vehicle: false,
    location: 'Cape Town',
    notes: 'Premium group. Driver food allowance included.',
    created_at: '2026-06-15T09:30:00Z',
    updated_at: '2026-06-15T09:30:00Z'
  },
  {
    invoice_no: 'INV-2026-002',
    client_name: 'German Tour Union',
    route: 'OR Tambo - Pilanesberg National Park - OR Tambo',
    tour_reference: 'PILANES-88',
    start_date: '2026-06-28T06:00:00Z',
    end_date: '2026-07-02T19:00:00Z',
    assigned_driver_id: 'DRV-2D8C9A', // Sipho
    assigned_vehicle_reg: 'GP 889-LP', // Joburg Quantum
    status: 'pending',
    payment_status: 'unpaid',
    booking_documents: [],
    itinerary_url: '',
    maintenance_alert_sent: false,
    is_rented_vehicle: false,
    location: 'Joburg',
    notes: 'Awaiting balance payment. Critical to check vehicle AC.',
    created_at: '2026-06-20T11:00:00Z',
    updated_at: '2026-06-20T11:00:00Z'
  },
  {
    invoice_no: 'INV-2026-003',
    client_name: 'Inbound Luxury Safari',
    route: 'Cape Town - Aquila Game Reserve - Cape Town',
    tour_reference: 'AQUILA-23',
    start_date: '2026-06-25T07:00:00Z',
    end_date: '2026-06-27T17:00:00Z',
    assigned_driver_id: 'DRV-7A5F4B', // Liam
    assigned_vehicle_reg: 'CA 998-112', // Rented land cruiser
    status: 'confirmed',
    payment_status: 'paid',
    receipt_number: 'REC-LUX99-A',
    booking_documents: [],
    itinerary_url: '',
    maintenance_alert_sent: false,
    is_rented_vehicle: true,
    rented_vehicle_id: 'rv-01',
    rented_vehicle_reg: 'CA 998-112',
    rented_vehicle_model: 'Toyota Land Cruiser',
    location: 'Cape Town',
    notes: 'Using rented Land Cruiser for offroad access at Aquila.',
    created_at: '2026-06-21T14:20:00Z',
    updated_at: '2026-06-21T14:20:00Z'
  }
];

// LocalStorage Helper functions
function getLocalStorageItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn(`Error reading localStorage key "${key}":`, error);
    return defaultValue;
  }
}

function setLocalStorageItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting localStorage key "${key}":`, error);
  }
}

// Global variable storage in memory/local storage fallback mode
const STORAGE_KEYS = {
  PROFILES: 'inyathi_profiles',
  VEHICLES: 'inyathi_vehicles',
  RENTED_VEHICLES: 'inyathi_rented_vehicles',
  BOOKINGS: 'inyathi_bookings',
  INSPECTIONS: 'inyathi_inspections',
  RECON_SHEETS: 'inyathi_recons',
  TRANSFER_RECON_SHEETS: 'inyathi_transfer_recons',
  INVITES: 'inyathi_invites',
  LOGS: 'inyathi_logs',
  DELETES: 'inyathi_deletes',
  EXPENSES: 'inyathi_expenses',
  FINES: 'inyathi_fines',
  INCIDENTS: 'inyathi_incidents',
  CHECKLISTS: 'inyathi_checklists',
  AUTH_USER: 'inyathi_auth_user',
  REGION: 'inyathi_region',
  OTP_ENABLED: 'inyathi_otp_enabled'
};

// Initialize fallback local storage if needed
export function initializeStorage() {
  if (typeof window === 'undefined') return;

  if (!window.localStorage.getItem(STORAGE_KEYS.PROFILES)) {
    setLocalStorageItem(STORAGE_KEYS.PROFILES, SEED_PROFILES);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.VEHICLES)) {
    setLocalStorageItem(STORAGE_KEYS.VEHICLES, SEED_VEHICLES);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.RENTED_VEHICLES)) {
    setLocalStorageItem(STORAGE_KEYS.RENTED_VEHICLES, SEED_RENTED_VEHICLES);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.BOOKINGS)) {
    setLocalStorageItem(STORAGE_KEYS.BOOKINGS, SEED_BOOKINGS);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.INSPECTIONS)) {
    setLocalStorageItem(STORAGE_KEYS.INSPECTIONS, []);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.RECON_SHEETS)) {
    setLocalStorageItem(STORAGE_KEYS.RECON_SHEETS, []);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.TRANSFER_RECON_SHEETS)) {
    setLocalStorageItem(STORAGE_KEYS.TRANSFER_RECON_SHEETS, []);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.INVITES)) {
    setLocalStorageItem(STORAGE_KEYS.INVITES, [
      {
        email: 'invitee@inyathi.co.za',
        full_name: 'Invited Driver',
        location: 'Cape Town',
        invited_by: 'DRV-ADM001',
        invited_at: new Date().toISOString()
      }
    ]);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.LOGS)) {
    setLocalStorageItem(STORAGE_KEYS.LOGS, []);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.DELETES)) {
    setLocalStorageItem(STORAGE_KEYS.DELETES, []);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.EXPENSES)) {
    setLocalStorageItem(STORAGE_KEYS.EXPENSES, [
      {
        id: 'exp-01',
        vehicle_reg: 'CA 234-890',
        driver_id: 'DRV-9F3E21',
        expense_type: 'Tyres',
        description: 'Puncture repair in Stellenbosch',
        amount: 250,
        expense_date: '2026-06-24',
        document_urls: [],
        photo_urls: [],
        status: 'approved',
        submitted_at: '2026-06-24T12:00:00Z',
        reviewed_by: 'Chief Admin',
        reviewed_at: '2026-06-24T14:00:00Z',
        alert_sent: false,
        created_at: '2026-06-24T12:00:00Z',
        updated_at: '2026-06-24T14:00:00Z'
      }
    ]);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.FINES)) {
    setLocalStorageItem(STORAGE_KEYS.FINES, [
      {
        id: 'fine-ct101',
        booking_id: 'INV-2026-001',
        vehicle_reg: 'CA 234-890',
        driver_id: 'DRV-9F3E21', // Thabo Ndlovu
        fine_timestamp: '2026-06-24T10:15:00Z',
        fine_reference: 'TF-990812-CT',
        location: 'M3 Highway Cape Town',
        description: 'Speeding violation 72km/h in 60km/h zone',
        amount: 500,
        notification_email: 'thabo@inyathi.co.za',
        email_sent: true,
        email_sent_at: '2026-06-24T12:30:00Z',
        status: 'pending',
        logged_by_admin_id: 'DRV-ADM001',
        created_at: '2026-06-24T12:30:00Z',
        updated_at: '2026-06-24T12:30:00Z'
      },
      {
        id: 'fine-jb202',
        booking_id: 'INV-2026-002',
        vehicle_reg: 'GP 889-LP',
        driver_id: 'DRV-2D8C9A', // Sipho Zulu
        fine_timestamp: '2026-06-18T14:45:00Z',
        fine_reference: 'TF-110293-GP',
        location: 'N1 North Midrand',
        description: 'Failed to signal lane change',
        amount: 250,
        notification_email: 'sipho@inyathi.co.za',
        email_sent: true,
        email_sent_at: '2026-06-19T09:00:00Z',
        status: 'paid',
        logged_by_admin_id: 'DRV-ADM001',
        created_at: '2026-06-19T09:00:00Z',
        updated_at: '2026-06-19T09:00:00Z'
      }
    ]);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.INCIDENTS)) {
    setLocalStorageItem(STORAGE_KEYS.INCIDENTS, []);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.CHECKLISTS)) {
    setLocalStorageItem(STORAGE_KEYS.CHECKLISTS, []);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.REGION)) {
    window.localStorage.setItem(STORAGE_KEYS.REGION, 'Cape Town');
  }
  if (window.localStorage.getItem(STORAGE_KEYS.OTP_ENABLED) === null) {
    window.localStorage.setItem(STORAGE_KEYS.OTP_ENABLED, 'false'); // Default flag is false
  }
}

// Authentication API Layer
export const authApi = {
  getOtpEnabled: (): boolean => {
    return getLocalStorageItem(STORAGE_KEYS.OTP_ENABLED, false);
  },
  setOtpEnabled: (enabled: boolean) => {
    setLocalStorageItem(STORAGE_KEYS.OTP_ENABLED, enabled);
  },
  getCurrentUser: (): Profile | null => {
    return getLocalStorageItem<Profile | null>(STORAGE_KEYS.AUTH_USER, null);
  },
  login: async (email: string, role: 'admin' | 'driver'): Promise<Profile> => {
    initializeStorage();
    const profiles = getLocalStorageItem<Profile[]>(STORAGE_KEYS.PROFILES, []);
    let user = profiles.find(p => p.email.toLowerCase() === email.toLowerCase() && p.role === role);
    
    if (!user) {
      // Auto create mock if not exists for testing purposes
      const shortId = Math.random().toString(36).substring(2, 8).toUpperCase();
      user = {
        driver_id: role === 'admin' ? `ADM-${shortId}` : `DRV-${shortId}`,
        name: email.split('@')[0].toUpperCase(),
        phone: '+27 82 555 1234',
        email: email.toLowerCase(),
        role: role,
        is_active: true,
        location: 'Cape Town',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      profiles.push(user);
      setLocalStorageItem(STORAGE_KEYS.PROFILES, profiles);
    }
    
    setLocalStorageItem(STORAGE_KEYS.AUTH_USER, user);
    return user;
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    }
  },
  signUpWithInvite: async (email: string, name: string, phone: string): Promise<Profile> => {
    initializeStorage();
    const invites = getLocalStorageItem<DriverInvite[]>(STORAGE_KEYS.INVITES, []);
    const inviteIdx = invites.findIndex(i => i.email.toLowerCase() === email.toLowerCase() && !i.used_at);
    
    if (inviteIdx === -1) {
      throw new Error('No unused driver invite found for this email address.');
    }
    
    const invite = invites[inviteIdx];
    const profiles = getLocalStorageItem<Profile[]>(STORAGE_KEYS.PROFILES, []);
    const shortId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newProfile: Profile = {
      driver_id: `DRV-${shortId}`,
      name: name,
      phone: phone,
      email: email.toLowerCase(),
      role: 'driver',
      is_active: true,
      location: invite.location,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    profiles.push(newProfile);
    setLocalStorageItem(STORAGE_KEYS.PROFILES, profiles);
    
    invite.used_at = new Date().toISOString();
    invites[inviteIdx] = invite;
    setLocalStorageItem(STORAGE_KEYS.INVITES, invites);
    
    setLocalStorageItem(STORAGE_KEYS.AUTH_USER, newProfile);
    return newProfile;
  }
};

// Region API Layer
export const regionApi = {
  getRegion: (): 'Cape Town' | 'Joburg' => {
    if (typeof window === 'undefined') return 'Cape Town';
    return (window.localStorage.getItem(STORAGE_KEYS.REGION) as 'Cape Town' | 'Joburg') || 'Cape Town';
  },
  setRegion: (region: 'Cape Town' | 'Joburg') => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEYS.REGION, region);
    // Dispatch a custom event to update subscribers
    window.dispatchEvent(new Event('region-changed'));
  }
};

// Fleet API Layer
export const fleetApi = {
  getVehicles: (region?: 'Cape Town' | 'Joburg'): Vehicle[] => {
    initializeStorage();
    const list = getLocalStorageItem<Vehicle[]>(STORAGE_KEYS.VEHICLES, []);
    return region ? list.filter(v => v.location === region) : list;
  },
  saveVehicle: (vehicle: Vehicle): Vehicle => {
    const list = getLocalStorageItem<Vehicle[]>(STORAGE_KEYS.VEHICLES, []);
    const idx = list.findIndex(v => v.registration_no === vehicle.registration_no);
    if (idx !== -1) {
      list[idx] = { ...vehicle, updated_at: new Date().toISOString() };
    } else {
      list.push({ ...vehicle, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
    setLocalStorageItem(STORAGE_KEYS.VEHICLES, list);
    return vehicle;
  },
  deleteVehicle: (regNo: string) => {
    const list = getLocalStorageItem<Vehicle[]>(STORAGE_KEYS.VEHICLES, []);
    const filtered = list.filter(v => v.registration_no !== regNo);
    setLocalStorageItem(STORAGE_KEYS.VEHICLES, filtered);
  },

  // Rented Vehicles
  getRentedVehicles: (): RentedVehicle[] => {
    initializeStorage();
    return getLocalStorageItem<RentedVehicle[]>(STORAGE_KEYS.RENTED_VEHICLES, []);
  },
  saveRentedVehicle: (rv: RentedVehicle): RentedVehicle => {
    const list = getLocalStorageItem<RentedVehicle[]>(STORAGE_KEYS.RENTED_VEHICLES, []);
    const idx = list.findIndex(item => item.id === rv.id);
    if (idx !== -1) {
      list[idx] = rv;
    } else {
      list.push(rv);
    }
    setLocalStorageItem(STORAGE_KEYS.RENTED_VEHICLES, list);
    return rv;
  },
  deleteRentedVehicle: (id: string) => {
    const list = getLocalStorageItem<RentedVehicle[]>(STORAGE_KEYS.RENTED_VEHICLES, []);
    const filtered = list.filter(item => item.id !== id);
    setLocalStorageItem(STORAGE_KEYS.RENTED_VEHICLES, filtered);
  }
};

// Drivers Management API Layer
export const driversApi = {
  getDrivers: (region?: 'Cape Town' | 'Joburg'): Profile[] => {
    initializeStorage();
    const list = getLocalStorageItem<Profile[]>(STORAGE_KEYS.PROFILES, []).filter(p => p.role === 'driver');
    return region ? list.filter(p => p.location === region) : list;
  },
  saveDriver: (driver: Profile): Profile => {
    const list = getLocalStorageItem<Profile[]>(STORAGE_KEYS.PROFILES, []);
    const idx = list.findIndex(p => p.driver_id === driver.driver_id);
    if (idx !== -1) {
      list[idx] = { ...driver, updated_at: new Date().toISOString() };
    } else {
      list.push({ ...driver, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
    setLocalStorageItem(STORAGE_KEYS.PROFILES, list);
    return driver;
  },
  // Invite a driver
  getInvites: (): DriverInvite[] => {
    initializeStorage();
    return getLocalStorageItem<DriverInvite[]>(STORAGE_KEYS.INVITES, []);
  },
  createInvite: (invite: DriverInvite): DriverInvite => {
    const list = getLocalStorageItem<DriverInvite[]>(STORAGE_KEYS.INVITES, []);
    const idx = list.findIndex(i => i.email.toLowerCase() === invite.email.toLowerCase());
    if (idx !== -1) {
      list[idx] = invite;
    } else {
      list.push(invite);
    }
    setLocalStorageItem(STORAGE_KEYS.INVITES, list);
    return invite;
  }
};

// Bookings & Calendar API Layer
export const bookingsApi = {
  getBookings: (region?: 'Cape Town' | 'Joburg'): Booking[] => {
    initializeStorage();
    const list = getLocalStorageItem<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
    return region ? list.filter(b => b.location === region) : list;
  },
  saveBooking: (booking: Booking, adminId: string, reason?: string): Booking => {
    const list = getLocalStorageItem<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
    const idx = list.findIndex(b => b.invoice_no === booking.invoice_no);
    const now = new Date().toISOString();
    
    if (idx !== -1) {
      const oldVal = list[idx];
      // Log edit
      const editLogs = getLocalStorageItem<BookingEditLog[]>(STORAGE_KEYS.LOGS, []);
      editLogs.push({
        id: `log-${Math.random().toString(36).substring(2, 9)}`,
        booking_id: booking.invoice_no,
        admin_id: adminId,
        action: 'edit',
        reason: reason || 'Details update',
        old_values: oldVal,
        new_values: booking,
        approved_at: now,
        created_at: now
      });
      setLocalStorageItem(STORAGE_KEYS.LOGS, editLogs);

      list[idx] = {
        ...booking,
        last_modified_at: now,
        modification_reason: reason,
        updated_at: now
      };
    } else {
      list.push({
        ...booking,
        maintenance_alert_sent: false,
        created_at: now,
        updated_at: now
      });
    }
    setLocalStorageItem(STORAGE_KEYS.BOOKINGS, list);
    return booking;
  },
  
  // Pending delete request flow
  requestDelete: (bookingId: string, requestedBy: string, reason: string, cancellationType: 'mistake' | 'client_cancelled') => {
    const deletes = getLocalStorageItem<BookingDeleteRequest[]>(STORAGE_KEYS.DELETES, []);
    const newRequest: BookingDeleteRequest = {
      id: `del-${Math.random().toString(36).substring(2, 9)}`,
      booking_id: bookingId,
      requested_by: requestedBy,
      reason,
      cancellation_type: cancellationType,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    deletes.push(newRequest);
    setLocalStorageItem(STORAGE_KEYS.DELETES, deletes);
    return newRequest;
  },
  getDeleteRequests: (): BookingDeleteRequest[] => {
    initializeStorage();
    return getLocalStorageItem<BookingDeleteRequest[]>(STORAGE_KEYS.DELETES, []);
  },
  reviewDeleteRequest: (requestId: string, adminId: string, action: 'approved' | 'rejected', rejectionReason?: string) => {
    const deletes = getLocalStorageItem<BookingDeleteRequest[]>(STORAGE_KEYS.DELETES, []);
    const reqIdx = deletes.findIndex(d => d.id === requestId);
    if (reqIdx === -1) return;

    const request = deletes[reqIdx];
    request.status = action;
    request.rejection_reason = rejectionReason;
    request.reviewed_by = adminId;
    request.reviewed_at = new Date().toISOString();
    deletes[reqIdx] = request;
    setLocalStorageItem(STORAGE_KEYS.DELETES, deletes);

    if (action === 'approved') {
      const bookings = getLocalStorageItem<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
      const bIdx = bookings.findIndex(b => b.invoice_no === request.booking_id);
      if (bIdx !== -1) {
        // Log deletion
        const editLogs = getLocalStorageItem<BookingEditLog[]>(STORAGE_KEYS.LOGS, []);
        editLogs.push({
          id: `log-${Math.random().toString(36).substring(2, 9)}`,
          booking_id: request.booking_id,
          admin_id: adminId,
          action: 'delete',
          reason: request.reason,
          old_values: bookings[bIdx],
          approved_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });
        setLocalStorageItem(STORAGE_KEYS.LOGS, editLogs);

        // Remove booking from bookings
        bookings.splice(bIdx, 1);
        setLocalStorageItem(STORAGE_KEYS.BOOKINGS, bookings);
      }
    }
  },
  getEditLogs: (bookingId?: string): BookingEditLog[] => {
    initializeStorage();
    const logs = getLocalStorageItem<BookingEditLog[]>(STORAGE_KEYS.LOGS, []);
    return bookingId ? logs.filter(l => l.booking_id === bookingId) : logs;
  }
};

// Driver Inspections API Layer
export const inspectionsApi = {
  getInspections: (region?: 'Cape Town' | 'Joburg'): Inspection[] => {
    initializeStorage();
    const list = getLocalStorageItem<Inspection[]>(STORAGE_KEYS.INSPECTIONS, []);
    if (!region) return list;
    
    // Join with vehicle or booking region to filter
    const bookings = getLocalStorageItem<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
    return list.filter(ins => {
      const b = bookings.find(item => item.invoice_no === ins.invoice_no);
      return b ? b.location === region : true;
    });
  },
  saveInspection: (inspection: Inspection): Inspection => {
    const list = getLocalStorageItem<Inspection[]>(STORAGE_KEYS.INSPECTIONS, []);
    const idx = list.findIndex(ins => ins.id === inspection.id);
    if (idx !== -1) {
      list[idx] = inspection;
    } else {
      list.push(inspection);
    }
    setLocalStorageItem(STORAGE_KEYS.INSPECTIONS, list);
    
    // Update vehicle mileage
    const vehicles = getLocalStorageItem<Vehicle[]>(STORAGE_KEYS.VEHICLES, []);
    const vIdx = vehicles.findIndex(v => v.registration_no === inspection.vehicle_reg);
    if (vIdx !== -1 && inspection.mileage_at_inspection > vehicles[vIdx].current_mileage) {
      vehicles[vIdx].current_mileage = inspection.mileage_at_inspection;
      setLocalStorageItem(STORAGE_KEYS.VEHICLES, vehicles);
    }
    
    return inspection;
  }
};

// Weekly Recon Sheets API Layer
export const reconApi = {
  getRecons: (driverId?: string): ReconSheet[] => {
    initializeStorage();
    const list = getLocalStorageItem<ReconSheet[]>(STORAGE_KEYS.RECON_SHEETS, []);
    return driverId ? list.filter(r => r.driver_id === driverId) : list;
  },
  saveRecon: (recon: ReconSheet): ReconSheet => {
    const list = getLocalStorageItem<ReconSheet[]>(STORAGE_KEYS.RECON_SHEETS, []);
    const idx = list.findIndex(r => r.id === recon.id);
    const now = new Date().toISOString();
    
    const preparedRecon = {
      ...recon,
      updated_at: now
    };
    
    if (idx !== -1) {
      list[idx] = preparedRecon;
    } else {
      list.push({
        ...preparedRecon,
        created_at: now
      });
    }
    setLocalStorageItem(STORAGE_KEYS.RECON_SHEETS, list);
    return preparedRecon;
  },
  requestEdit: (reconId: string, reason: string) => {
    const list = getLocalStorageItem<ReconSheet[]>(STORAGE_KEYS.RECON_SHEETS, []);
    const idx = list.findIndex(r => r.id === reconId);
    if (idx !== -1) {
      list[idx].edit_request_status = 'pending';
      list[idx].edit_request_reason = reason;
      list[idx].updated_at = new Date().toISOString();
      setLocalStorageItem(STORAGE_KEYS.RECON_SHEETS, list);
    }
  },
  reviewEditRequest: (reconId: string, action: 'approved' | 'rejected', adminNotes?: string) => {
    const list = getLocalStorageItem<ReconSheet[]>(STORAGE_KEYS.RECON_SHEETS, []);
    const idx = list.findIndex(r => r.id === reconId);
    if (idx !== -1) {
      const recon = list[idx];
      recon.edit_request_status = action;
      if (action === 'approved') {
        recon.status = 'draft'; // Put back into draft for editing
      } else {
        recon.edit_request_rejection_reason = adminNotes;
      }
      recon.updated_at = new Date().toISOString();
      list[idx] = recon;
      setLocalStorageItem(STORAGE_KEYS.RECON_SHEETS, list);
    }
  }
};

// Transfer Recon Sheets API Layer
export const transferReconApi = {
  getRecons: (driverId?: string): TransferReconSheet[] => {
    initializeStorage();
    const list = getLocalStorageItem<TransferReconSheet[]>(STORAGE_KEYS.TRANSFER_RECON_SHEETS, []);
    return driverId ? list.filter(r => r.driver_id === driverId) : list;
  },
  saveRecon: (recon: TransferReconSheet): TransferReconSheet => {
    const list = getLocalStorageItem<TransferReconSheet[]>(STORAGE_KEYS.TRANSFER_RECON_SHEETS, []);
    const idx = list.findIndex(r => r.id === recon.id);
    const now = new Date().toISOString();
    
    const preparedRecon = {
      ...recon,
      updated_at: now
    };
    
    if (idx !== -1) {
      list[idx] = preparedRecon;
    } else {
      list.push({
        ...preparedRecon,
        created_at: now
      });
    }
    setLocalStorageItem(STORAGE_KEYS.TRANSFER_RECON_SHEETS, list);
    return preparedRecon;
  },
  requestEdit: (reconId: string, reason: string) => {
    const list = getLocalStorageItem<TransferReconSheet[]>(STORAGE_KEYS.TRANSFER_RECON_SHEETS, []);
    const idx = list.findIndex(r => r.id === reconId);
    if (idx !== -1) {
      list[idx].edit_request_status = 'pending';
      list[idx].edit_request_reason = reason;
      list[idx].updated_at = new Date().toISOString();
      setLocalStorageItem(STORAGE_KEYS.TRANSFER_RECON_SHEETS, list);
    }
  },
  reviewEditRequest: (reconId: string, action: 'approved' | 'rejected', adminNotes?: string) => {
    const list = getLocalStorageItem<TransferReconSheet[]>(STORAGE_KEYS.TRANSFER_RECON_SHEETS, []);
    const idx = list.findIndex(r => r.id === reconId);
    if (idx !== -1) {
      const recon = list[idx];
      recon.edit_request_status = action;
      if (action === 'approved') {
        recon.status = 'draft'; // Put back into draft for editing
      } else {
        recon.edit_request_rejection_reason = adminNotes;
      }
      recon.updated_at = new Date().toISOString();
      list[idx] = recon;
      setLocalStorageItem(STORAGE_KEYS.TRANSFER_RECON_SHEETS, list);
    }
  }
};

// Vehicle Expenses API Layer
export const expensesApi = {
  getExpenses: (vehicleReg?: string): VehicleExpense[] => {
    initializeStorage();
    const list = getLocalStorageItem<VehicleExpense[]>(STORAGE_KEYS.EXPENSES, []);
    return vehicleReg ? list.filter(e => e.vehicle_reg === vehicleReg) : list;
  },
  saveExpense: (expense: VehicleExpense): VehicleExpense => {
    const list = getLocalStorageItem<VehicleExpense[]>(STORAGE_KEYS.EXPENSES, []);
    const idx = list.findIndex(e => e.id === expense.id);
    const now = new Date().toISOString();
    
    const prepared = {
      ...expense,
      updated_at: now
    };
    
    if (idx !== -1) {
      list[idx] = prepared;
    } else {
      list.push({
        ...prepared,
        id: expense.id || `exp-${Math.random().toString(36).substring(2, 9)}`,
        created_at: now
      });
    }
    setLocalStorageItem(STORAGE_KEYS.EXPENSES, list);
    return prepared;
  },
  deleteExpense: (id: string) => {
    const list = getLocalStorageItem<VehicleExpense[]>(STORAGE_KEYS.EXPENSES, []);
    const filtered = list.filter(e => e.id !== id);
    setLocalStorageItem(STORAGE_KEYS.EXPENSES, filtered);
  }
};

// Traffic Fines API Layer
export const trafficFinesApi = {
  getFines: (): TrafficFine[] => {
    initializeStorage();
    return getLocalStorageItem<TrafficFine[]>(STORAGE_KEYS.FINES, []);
  },
  saveFine: (fine: TrafficFine): TrafficFine => {
    const list = getLocalStorageItem<TrafficFine[]>(STORAGE_KEYS.FINES, []);
    const idx = list.findIndex(f => f.id === fine.id);
    const now = new Date().toISOString();
    
    const prepared = {
      ...fine,
      updated_at: now
    };
    
    if (idx !== -1) {
      list[idx] = prepared;
    } else {
      list.push({
        ...prepared,
        id: fine.id || `fine-${Math.random().toString(36).substring(2, 9)}`,
        created_at: now
      });
    }
    setLocalStorageItem(STORAGE_KEYS.FINES, list);
    return prepared;
  },
  // Lookup driver active at fine_timestamp with vehicle_reg
  lookupDriverForFine: (vehicleReg: string, fineTimestamp: string): { driverId: string; driverName: string; bookingId: string } | null => {
    const bookings = getLocalStorageItem<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
    const profiles = getLocalStorageItem<Profile[]>(STORAGE_KEYS.PROFILES, []);
    
    const targetTime = new Date(fineTimestamp).getTime();
    
    // Find booking for that vehicle where targetTime is between start_date and end_date
    const activeBooking = bookings.find(b => {
      if (b.assigned_vehicle_reg !== vehicleReg) return false;
      const start = new Date(b.start_date).getTime();
      const end = new Date(b.end_date).getTime();
      return targetTime >= start && targetTime <= end;
    });

    if (activeBooking) {
      const driver = profiles.find(p => p.driver_id === activeBooking.assigned_driver_id);
      return {
        driverId: activeBooking.assigned_driver_id,
        driverName: driver ? driver.name : 'Unknown Driver',
        bookingId: activeBooking.invoice_no
      };
    }
    
    return null;
  }
};

// Incident Reports API Layer
export const incidentsApi = {
  getIncidents: (driverId?: string): IncidentReport[] => {
    initializeStorage();
    const list = getLocalStorageItem<IncidentReport[]>(STORAGE_KEYS.INCIDENTS, []);
    return driverId ? list.filter(i => i.driver_id === driverId) : list;
  },
  saveIncident: (incident: IncidentReport): IncidentReport => {
    const list = getLocalStorageItem<IncidentReport[]>(STORAGE_KEYS.INCIDENTS, []);
    const idx = list.findIndex(i => i.id === incident.id);
    const now = new Date().toISOString();
    
    const prepared = {
      ...incident,
      updated_at: now
    };
    
    if (idx !== -1) {
      list[idx] = prepared;
    } else {
      list.push({
        ...prepared,
        id: incident.id || `inc-${Math.random().toString(36).substring(2, 9)}`,
        created_at: now
      });
    }
    setLocalStorageItem(STORAGE_KEYS.INCIDENTS, list);
    return prepared;
  }
};

// Vehicle Checklists API Layer
export const checklistsApi = {
  getChecklists: (driverId?: string): VehicleChecklist[] => {
    initializeStorage();
    const list = getLocalStorageItem<VehicleChecklist[]>(STORAGE_KEYS.CHECKLISTS, []);
    return driverId ? list.filter(c => c.driver_id === driverId) : list;
  },
  saveChecklist: (checklist: VehicleChecklist): VehicleChecklist => {
    const list = getLocalStorageItem<VehicleChecklist[]>(STORAGE_KEYS.CHECKLISTS, []);
    const idx = list.findIndex(c => c.id === checklist.id);
    const now = new Date().toISOString();
    
    const prepared = {
      ...checklist,
      created_at: checklist.created_at || now
    };
    
    if (idx !== -1) {
      list[idx] = prepared;
    } else {
      list.push(prepared);
    }
    setLocalStorageItem(STORAGE_KEYS.CHECKLISTS, list);
    return prepared;
  }
};

// Cloudinary Normalizer Helper
export function getDocumentUrl(doc: any): string {
  if (!doc) return '';
  if (typeof doc === 'string') return doc;
  
  // Normalizes objects that look like stringified values or custom models
  if (doc.url && typeof doc.url === 'string') return doc.url;
  if (doc.secure_url && typeof doc.secure_url === 'string') return doc.secure_url;

  // Handle spread objects, i.e., {"0":"h","1":"t", ...}
  if (typeof doc === 'object') {
    const keys = Object.keys(doc).sort((a, b) => Number(a) - Number(b));
    if (keys.length > 0 && keys.every(k => !isNaN(Number(k)))) {
      return keys.map(k => doc[k]).join('');
    }
  }
  return '';
}
