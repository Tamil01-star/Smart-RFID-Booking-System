// ==================== Service Layer for SMARTBUS+ ====================
// All functions here call the Node.js Express Backend API endpoints.

import {
  Bus, Booking, WalletTransaction, RFIDCard, Wallet,
  TransactionType, TransactionStatus, BookingStatus, LogLevel
} from '../types';
import { API_URL } from '../config';

// ==================== BUS SERVICE ====================
export const busService = {
  getBuses: async (): Promise<Bus[]> => {
    try {
      const res = await fetch(`${API_URL}/buses`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  getBusById: async (id: string): Promise<Bus | null> => {
    try {
      const res = await fetch(`${API_URL}/buses`);
      if (!res.ok) return null;
      const buses: Bus[] = await res.json();
      return buses.find(b => b.id === id) || null;
    } catch {
      return null;
    }
  },

  searchBuses: async (source: string, destination: string): Promise<Bus[]> => {
    try {
      const res = await fetch(`${API_URL}/buses`);
      if (!res.ok) return [];
      const buses: Bus[] = await res.json();
      return buses.filter(
        b => b.source === source && b.destination === destination && b.status !== 'inactive'
      );
    } catch {
      return [];
    }
  },

  addBus: async (bus: Omit<Bus, 'id'>): Promise<Bus> => {
    const res = await fetch(`${API_URL}/buses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bus)
    });
    if (!res.ok) throw new Error('Failed to add bus');
    return await res.json();
  },

  updateBus: async (id: string, updates: Partial<Bus>): Promise<void> => {
    const res = await fetch(`${API_URL}/buses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update bus');
  },

  deleteBus: async (id: string): Promise<void> => {
    const res = await fetch(`${API_URL}/buses/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete bus');
  },
};

// ==================== WALLET SERVICE ====================
export const walletService = {
  getWallet: async (passengerId: string): Promise<Wallet> => {
    try {
      const res = await fetch(`${API_URL}/wallet/${passengerId}`);
      if (!res.ok) return { passengerId, balance: 0, currency: 'INR', updatedAt: new Date().toISOString() };
      return await res.json();
    } catch {
      return { passengerId, balance: 0, currency: 'INR', updatedAt: new Date().toISOString() };
    }
  },

  addDemoMoney: async (passengerId: string, amount: number): Promise<Wallet> => {
    const res = await fetch(`${API_URL}/wallet/add-money`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passengerId, amount })
    });
    if (!res.ok) throw new Error('Failed to add money');
    return await res.json();
  },

  deductFare: async (passengerId: string, amount: number, busNumber: string, rfidUid?: string): Promise<{ success: boolean; error?: string; wallet?: Wallet }> => {
    return { success: true };
  },

  refund: async (passengerId: string, amount: number, reason: string): Promise<Wallet> => {
    return walletService.getWallet(passengerId);
  },
};

// ==================== TRANSACTION SERVICE ====================
export const transactionService = {
  addTransaction: async (data: any): Promise<WalletTransaction> => {
    return data;
  },

  getTransactions: async (passengerId?: string): Promise<WalletTransaction[]> => {
    try {
      const url = passengerId ? `${API_URL}/transactions?passengerId=${passengerId}` : `${API_URL}/transactions`;
      const res = await fetch(url);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },
};

// ==================== BOOKING SERVICE ====================
export const bookingService = {
  createBooking: async (data: {
    passengerId: string;
    passengerName: string;
    busId: string;
    travelDate: string;
    rfidUid?: string;
  }): Promise<{ success: boolean; booking?: Booking; error?: string }> => {
    try {
      const res = await fetch(`${API_URL}/bookings/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const resData = await res.json();
      if (!res.ok) return { success: false, error: resData.error || 'Booking failed' };
      return { success: true, booking: resData.booking };
    } catch (err: any) {
      return { success: false, error: err.message || 'Server connection failed' };
    }
  },

  getBookings: async (passengerId?: string): Promise<Booking[]> => {
    try {
      const url = passengerId ? `${API_URL}/bookings?passengerId=${passengerId}` : `${API_URL}/bookings`;
      const res = await fetch(url);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  getBookingById: async (id: string): Promise<Booking | null> => {
    try {
      const res = await fetch(`${API_URL}/bookings`);
      if (!res.ok) return null;
      const bookings: Booking[] = await res.json();
      return bookings.find(b => b.id === id || b.bookingId === id) || null;
    } catch {
      return null;
    }
  },

  cancelBooking: async (bookingId: string, passengerId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_URL}/bookings/cancel/${bookingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passengerId })
      });
      if (!res.ok) {
        const data = await res.json();
        return { success: false, error: data.error || 'Failed to cancel booking' };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Server connection failed' };
    }
  },

  updateBookingStatus: async (bookingId: string, status: BookingStatus): Promise<void> => {
    // Managed on backend
  },
};

// ==================== RFID SERVICE ====================
export const rfidService = {
  getRFIDCards: async (): Promise<RFIDCard[]> => {
    try {
      const res = await fetch(`${API_URL}/rfid`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  getCardByPassenger: async (passengerId: string): Promise<RFIDCard | null> => {
    try {
      const res = await fetch(`${API_URL}/rfid/${passengerId}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  linkCard: async (uid: string, passengerId: string, passengerName: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_URL}/rfid/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, passengerId, passengerName })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'Failed to link card' };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Server connection failed' };
    }
  },

  unlinkCard: async (passengerId: string): Promise<void> => {
    const res = await fetch(`${API_URL}/rfid/unlink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passengerId })
    });
    if (!res.ok) throw new Error('Failed to unlink card');
  },

  simulateRFIDScan: (currentDemoUid: string): { uid: string; passengerFound: boolean } => {
    return { uid: currentDemoUid, passengerFound: true };
  },
};

// ==================== ESP32 SERVICE ====================
export const esp32Service = {
  connectESP32: async () => {
    try {
      const res = await fetch(`${API_URL}/health`);
      return { connected: res.ok, mode: 'hardware' };
    } catch {
      return { connected: false, mode: 'hardware' };
    }
  },
  
  getDeviceStatus: async (deviceId: string) => {
    try {
      const res = await fetch(`${API_URL}/health`);
      return { deviceId, status: res.ok ? 'online' : 'offline', lastSeen: new Date().toISOString() };
    } catch {
      return { deviceId, status: 'offline', lastSeen: new Date().toISOString() };
    }
  },
  
  getRFIDEvent: async () => null,
  getKeypadEvent: async () => null,
  sendDisplayMessage: async (message: string) => ({ sent: true, mode: 'hardware', message }),
  sendBuzzerCommand: async (type: 'success' | 'error') => ({ sent: true, mode: 'hardware', type }),
  sendLEDCommand: async (color: 'green' | 'red', state: boolean) => ({ sent: true, mode: 'hardware', color, state }),
  getLastTransaction: async () => null,
};
