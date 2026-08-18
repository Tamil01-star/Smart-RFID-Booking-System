// ==================== USER TYPES ====================
export type UserRole = 'passenger' | 'admin' | 'driver' | 'conductor';
export type PassengerCategory = 'general' | 'student' | 'senior_citizen' | 'disabled_person' | 'ex_serviceman';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  passengerId: string;
  role: UserRole;
  category?: PassengerCategory;
  rfidUid?: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
}

// ==================== BUS TYPES ====================
export type BusStatus = 'active' | 'inactive' | 'full' | 'scheduled';

export interface StopFare {
  stopName: string;
  fare?: number;
  distance?: number;
  order?: number;
}

export interface Bus {
  id: string;
  busNumber: string;
  busName: string;
  source: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  fare: number;
  totalSeats: number;
  availableSeats: number;
  status: BusStatus;
  route?: string;
  stopsWithFares?: StopFare[];
}

// ==================== BOOKING TYPES ====================
export type BookingStatus = 'confirmed' | 'completed' | 'cancelled' | 'pending';

export interface Booking {
  id: string;
  bookingId: string;
  passengerId: string;
  passengerName: string;
  busId: string;
  busNumber: string;
  source: string;
  destination: string;
  travelDate: string;
  departureTime: string;
  arrivalTime: string;
  fare: number;
  status: BookingStatus;
  rfidUid?: string;
  rfidLinked: boolean;
  createdAt: string;
}

// ==================== WALLET TYPES ====================
export interface Wallet {
  passengerId: string;
  balance: number;
  currency: string;
  updatedAt: string;
}

export type TransactionType = 'ADD_DEMO_MONEY' | 'FARE_DEDUCTION' | 'REFUND' | 'WALK_IN_FARE';
export type TransactionStatus = 'success' | 'failed' | 'pending';

export interface WalletTransaction {
  id: string;
  passengerId: string;
  type: TransactionType;
  amount: number;
  description: string;
  balanceBefore: number;
  balanceAfter: number;
  timestamp: string;
  status: TransactionStatus;
  busNumber?: string;
  rfidUid?: string;
}

// ==================== RFID TYPES ====================
export type RFIDStatus = 'active' | 'inactive' | 'blocked';

export interface RFIDCard {
  uid: string;
  passengerId: string;
  passengerName: string;
  status: RFIDStatus;
  linkedAt: string;
  lastUsedAt?: string;
}

// ==================== ESP32 TYPES ====================
export type DeviceStatus = 'online' | 'offline' | 'demo';
export type ComponentStatus = 'ready' | 'error' | 'demo' | 'disconnected';

export interface ESP32Device {
  deviceId: string;
  deviceName: string;
  busId?: string;
  status: DeviceStatus;
  lastSeen: string;
  rfidStatus: ComponentStatus;
  keypadStatus: ComponentStatus;
  lcdStatus: ComponentStatus;
  buzzerStatus: ComponentStatus;
  ledStatus: ComponentStatus;
  wifiStatus: ComponentStatus;
  ipAddress?: string;
}

// ==================== SYSTEM LOG TYPES ====================
export type LogLevel = 'info' | 'warning' | 'error' | 'success';

export interface SystemLog {
  id: string;
  level: LogLevel;
  message: string;
  source: string;
  timestamp: string;
  details?: string;
}

// ==================== ROUTE TYPES ====================
export interface Route {
  id: string;
  routeName: string;
  source: string;
  destination: string;
  stops: string[];
  distanceKm: number;
  estimatedTime: string;
}

// ==================== APP SETTINGS ====================
export type SystemMode = 'demo' | 'hardware';

export interface AppSettings {
  systemMode: SystemMode;
  esp32Connected: boolean;
  firebaseConnected: boolean;
  demoRFIDUid: string;
}

// ==================== DASHBOARD STATS ====================
export interface AdminStats {
  totalPassengers: number;
  totalBuses: number;
  todayBookings: number;
  todayRevenue: number;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  connectedDevices: number;
  totalWalletBalance: number;
}

export interface PassengerStats {
  walletBalance: number;
  activeBookings: number;
  totalTrips: number;
  rfidLinked: boolean;
  rfidUid?: string;
}
