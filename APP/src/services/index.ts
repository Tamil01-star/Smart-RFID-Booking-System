// ==================== Service Layer for SMARTBUS+ ====================
// All functions here are Firebase-ready stubs.
// In demo mode they use localStorage. In hardware mode they will connect to Firebase.

import {
  Bus, Booking, WalletTransaction, RFIDCard, Wallet,
  TransactionType, TransactionStatus, BookingStatus
} from '../types';
import {
  DEMO_BUSES, DEMO_BOOKINGS, DEMO_TRANSACTIONS, DEMO_RFID_CARDS,
  DEMO_WALLET
} from '../data/mockData';

// ==================== Storage helpers ====================
function getKey(key: string) {
  const data = localStorage.getItem(`smartbus_${key}`);
  return data ? JSON.parse(data) : null;
}
function setKey(key: string, data: unknown) {
  localStorage.setItem(`smartbus_${key}`, JSON.stringify(data));
}

// ==================== BUS SERVICE ====================
export const busService = {
  getBuses: async (): Promise<Bus[]> => {
    return getKey('buses') || DEMO_BUSES;
  },

  getBusById: async (id: string): Promise<Bus | null> => {
    const buses: Bus[] = getKey('buses') || DEMO_BUSES;
    return buses.find(b => b.id === id) || null;
  },

  searchBuses: async (source: string, destination: string): Promise<Bus[]> => {
    const buses: Bus[] = getKey('buses') || DEMO_BUSES;
    return buses.filter(
      b => b.source === source && b.destination === destination && b.status !== 'inactive'
    );
  },

  addBus: async (bus: Omit<Bus, 'id'>): Promise<Bus> => {
    const buses: Bus[] = getKey('buses') || DEMO_BUSES;
    const newBus = { ...bus, id: `bus-${Date.now()}` };
    setKey('buses', [...buses, newBus]);
    return newBus;
  },

  updateBus: async (id: string, updates: Partial<Bus>): Promise<void> => {
    const buses: Bus[] = getKey('buses') || DEMO_BUSES;
    const updated = buses.map(b => b.id === id ? { ...b, ...updates } : b);
    setKey('buses', updated);
  },

  deleteBus: async (id: string): Promise<void> => {
    const buses: Bus[] = getKey('buses') || DEMO_BUSES;
    setKey('buses', buses.filter(b => b.id !== id));
  },
};

// ==================== WALLET SERVICE ====================
export const walletService = {
  getWallet: async (passengerId: string): Promise<Wallet> => {
    const wallets = getKey('wallets') || {};
    return wallets[passengerId] || { ...DEMO_WALLET, passengerId, balance: 0 };
  },

  addDemoMoney: async (passengerId: string, amount: number): Promise<Wallet> => {
    const wallets = getKey('wallets') || {};
    const current: Wallet = wallets[passengerId] || { ...DEMO_WALLET, passengerId, balance: 0 };
    const updated = { ...current, balance: current.balance + amount, updatedAt: new Date().toISOString() };
    wallets[passengerId] = updated;
    setKey('wallets', wallets);

    // Record transaction
    await transactionService.addTransaction({
      passengerId,
      type: 'ADD_DEMO_MONEY',
      amount,
      description: `Demo money added to wallet`,
      balanceBefore: current.balance,
      balanceAfter: updated.balance,
      status: 'success',
    });

    return updated;
  },

  deductFare: async (passengerId: string, amount: number, busNumber: string, rfidUid?: string): Promise<{ success: boolean; error?: string; wallet?: Wallet }> => {
    const wallets = getKey('wallets') || {};
    const current: Wallet = wallets[passengerId] || { ...DEMO_WALLET, passengerId, balance: 0 };

    if (current.balance < amount) {
      await transactionService.addTransaction({
        passengerId,
        type: 'FARE_DEDUCTION',
        amount,
        description: `Bus fare — ${busNumber}`,
        balanceBefore: current.balance,
        balanceAfter: current.balance,
        status: 'failed',
        busNumber,
        rfidUid,
      });
      return { success: false, error: 'Insufficient wallet balance. Please add demo money.' };
    }

    const updated = { ...current, balance: current.balance - amount, updatedAt: new Date().toISOString() };
    wallets[passengerId] = updated;
    setKey('wallets', wallets);

    await transactionService.addTransaction({
      passengerId,
      type: 'FARE_DEDUCTION',
      amount,
      description: `Bus fare — ${busNumber}`,
      balanceBefore: current.balance,
      balanceAfter: updated.balance,
      status: 'success',
      busNumber,
      rfidUid,
    });

    return { success: true, wallet: updated };
  },

  refund: async (passengerId: string, amount: number, reason: string): Promise<Wallet> => {
    const wallets = getKey('wallets') || {};
    const current: Wallet = wallets[passengerId] || { ...DEMO_WALLET, passengerId, balance: 0 };
    const updated = { ...current, balance: current.balance + amount, updatedAt: new Date().toISOString() };
    wallets[passengerId] = updated;
    setKey('wallets', wallets);

    await transactionService.addTransaction({
      passengerId,
      type: 'REFUND',
      amount,
      description: reason,
      balanceBefore: current.balance,
      balanceAfter: updated.balance,
      status: 'success',
    });

    return updated;
  },
};

// ==================== TRANSACTION SERVICE ====================
export const transactionService = {
  addTransaction: async (data: {
    passengerId: string;
    type: TransactionType;
    amount: number;
    description: string;
    balanceBefore: number;
    balanceAfter: number;
    status: TransactionStatus;
    busNumber?: string;
    rfidUid?: string;
  }): Promise<WalletTransaction> => {
    const txns: WalletTransaction[] = getKey('transactions') || DEMO_TRANSACTIONS;
    const txn: WalletTransaction = {
      id: `txn-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...data,
    };
    setKey('transactions', [txn, ...txns]);
    return txn;
  },

  getTransactions: async (passengerId?: string): Promise<WalletTransaction[]> => {
    const txns: WalletTransaction[] = getKey('transactions') || DEMO_TRANSACTIONS;
    if (passengerId) return txns.filter(t => t.passengerId === passengerId);
    return txns;
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
    const buses: Bus[] = getKey('buses') || DEMO_BUSES;
    const bus = buses.find(b => b.id === data.busId);
    if (!bus) return { success: false, error: 'Bus not found.' };
    if (bus.availableSeats <= 0) return { success: false, error: 'Bus is full. No seats available.' };

    // Deduct fare
    const fareResult = await walletService.deductFare(
      data.passengerId, bus.fare, bus.busNumber, data.rfidUid
    );
    if (!fareResult.success) return { success: false, error: fareResult.error };

    // Reduce available seats
    await busService.updateBus(bus.id, {
      availableSeats: bus.availableSeats - 1,
      status: bus.availableSeats - 1 === 0 ? 'full' : bus.status,
    });

    const bookings: Booking[] = getKey('bookings') || DEMO_BOOKINGS;
    const booking: Booking = {
      id: `bk-${Date.now()}`,
      bookingId: `SBBK${Date.now().toString().slice(-8)}`,
      passengerId: data.passengerId,
      passengerName: data.passengerName,
      busId: bus.id,
      busNumber: bus.busNumber,
      source: bus.source,
      destination: bus.destination,
      travelDate: data.travelDate,
      departureTime: bus.departureTime,
      arrivalTime: bus.arrivalTime,
      fare: bus.fare,
      status: 'confirmed',
      rfidUid: data.rfidUid,
      rfidLinked: !!data.rfidUid,
      createdAt: new Date().toISOString(),
    };

    setKey('bookings', [booking, ...bookings]);
    return { success: true, booking };
  },

  getBookings: async (passengerId?: string): Promise<Booking[]> => {
    const bookings: Booking[] = getKey('bookings') || DEMO_BOOKINGS;
    if (passengerId) return bookings.filter(b => b.passengerId === passengerId);
    return bookings;
  },

  getBookingById: async (id: string): Promise<Booking | null> => {
    const bookings: Booking[] = getKey('bookings') || DEMO_BOOKINGS;
    return bookings.find(b => b.id === id || b.bookingId === id) || null;
  },

  cancelBooking: async (bookingId: string, passengerId: string): Promise<{ success: boolean; error?: string }> => {
    const bookings: Booking[] = getKey('bookings') || DEMO_BOOKINGS;
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return { success: false, error: 'Booking not found.' };
    if (booking.status !== 'confirmed') return { success: false, error: 'Only confirmed bookings can be cancelled.' };

    const updated = bookings.map(b =>
      b.id === bookingId ? { ...b, status: 'cancelled' as BookingStatus } : b
    );
    setKey('bookings', updated);

    // Refund
    await walletService.refund(passengerId, booking.fare, `Refund for cancelled booking (${booking.busNumber})`);

    // Restore seat
    await busService.updateBus(booking.busId, { availableSeats: 1 }); // approximate restore

    return { success: true };
  },

  updateBookingStatus: async (bookingId: string, status: BookingStatus): Promise<void> => {
    const bookings: Booking[] = getKey('bookings') || DEMO_BOOKINGS;
    setKey('bookings', bookings.map(b => b.id === bookingId ? { ...b, status } : b));
  },
};

// ==================== RFID SERVICE ====================
export const rfidService = {
  getRFIDCards: async (): Promise<RFIDCard[]> => {
    return getKey('rfid_cards') || DEMO_RFID_CARDS;
  },

  getCardByPassenger: async (passengerId: string): Promise<RFIDCard | null> => {
    const cards: RFIDCard[] = getKey('rfid_cards') || DEMO_RFID_CARDS;
    return cards.find(c => c.passengerId === passengerId) || null;
  },

  linkCard: async (uid: string, passengerId: string, passengerName: string): Promise<{ success: boolean; error?: string }> => {
    const cards: RFIDCard[] = getKey('rfid_cards') || DEMO_RFID_CARDS;

    // Check if UID already linked
    const existing = cards.find(c => c.uid === uid && c.passengerId && c.passengerId !== passengerId);
    if (existing) return { success: false, error: 'This RFID card is already linked to another passenger.' };

    // Check if passenger already has a card
    const passengerCard = cards.find(c => c.passengerId === passengerId);
    if (passengerCard && passengerCard.uid !== uid) {
      return { success: false, error: 'You already have an RFID card linked. Unlink it first.' };
    }

    const newCard: RFIDCard = {
      uid,
      passengerId,
      passengerName,
      status: 'active',
      linkedAt: new Date().toISOString(),
    };

    const updated = cards.filter(c => c.uid !== uid && c.passengerId !== passengerId);
    setKey('rfid_cards', [...updated, newCard]);
    return { success: true };
  },

  unlinkCard: async (passengerId: string): Promise<void> => {
    const cards: RFIDCard[] = getKey('rfid_cards') || DEMO_RFID_CARDS;
    setKey('rfid_cards', cards.map(c =>
      c.passengerId === passengerId
        ? { ...c, passengerId: '', passengerName: '', status: 'inactive' as const }
        : c
    ));
  },

  simulateRFIDScan: (currentDemoUid: string): { uid: string; passengerFound: boolean } => {
    return { uid: currentDemoUid, passengerFound: true };
  },
};

// ==================== ESP32 SERVICE ====================
// Abstraction layer for future ESP32 hardware integration
export const esp32Service = {
  // These return mock data in DEMO MODE.
  // In HARDWARE MODE, these will connect to Firebase realtime listeners.
  connectESP32: async () => ({ connected: false, mode: 'demo' }),
  getDeviceStatus: async (deviceId: string) => ({ deviceId, status: 'demo', lastSeen: new Date().toISOString() }),
  getRFIDEvent: async () => null, // Will return RFID scan events from Firebase
  getKeypadEvent: async () => null, // Will return keypad input events
  sendDisplayMessage: async (message: string) => ({ sent: false, mode: 'demo', message }),
  sendBuzzerCommand: async (type: 'success' | 'error') => ({ sent: false, mode: 'demo', type }),
  sendLEDCommand: async (color: 'green' | 'red', state: boolean) => ({ sent: false, mode: 'demo', color, state }),
  getLastTransaction: async () => null, // Will return last RFID transaction from Firebase
};
