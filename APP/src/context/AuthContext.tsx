import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { DEMO_USERS } from '../data/mockData';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithRFID: (uid: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Simple localStorage-based auth for demo
const STORAGE_KEY = 'smartbus_auth_user';
const USERS_KEY = 'smartbus_users';

function getStoredUsers(): User[] {
  try {
    const stored = localStorage.getItem(USERS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [...DEMO_USERS];
}

function saveUsers(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function generatePassengerId(users: User[]): string {
  const maxId = users
    .filter(u => u.role === 'passenger')
    .map(u => parseInt(u.passengerId.replace('SBP', '') || '10000'))
    .reduce((a, b) => Math.max(a, b), 10000);
  return `SBP${maxId + 1}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore session
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {}
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const users = getStoredUsers();
    
    // Demo credentials
    const demoCredentials: Record<string, { password: string; userId: string }> = {
      'demo@smartbus.com': { password: 'demo123', userId: 'user-001' },
      'admin@smartbus.com': { password: 'admin123', userId: 'admin-001' },
      'priya@example.com': { password: 'demo123', userId: 'user-002' },
    };

    const cred = demoCredentials[email.toLowerCase()];
    if (cred && cred.password === password) {
      const foundUser = users.find(u => u.id === cred.userId);
      if (foundUser) {
        setUser(foundUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(foundUser));
        return { success: true };
      }
    }

    // Check registered users
    const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (foundUser) {
      // In demo mode, accept any password for registered users
      const storedPasswords: Record<string, string> = JSON.parse(
        localStorage.getItem('smartbus_passwords') || '{}'
      );
      if (storedPasswords[foundUser.id] === password) {
        setUser(foundUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(foundUser));
        return { success: true };
      }
      return { success: false, error: 'Invalid password' };
    }

    return { success: false, error: 'No account found with this email. Please register first.' };
  };

  const loginWithRFID = async (uid: string) => {
    const rfidCards = JSON.parse(localStorage.getItem('smartbus_rfid_cards') || '[]');
    // also add demo card support
    if (uid === 'A1B2C3D4') {
      rfidCards.push({ uid: 'A1B2C3D4', passengerId: 'SBP10001', status: 'active' });
    }
    const card = rfidCards.find((c: any) => c.uid === uid && c.status === 'active');
    
    if (!card || !card.passengerId) {
      return { success: false, error: 'Invalid or unregistered RFID card.' };
    }
    
    const users = getStoredUsers();
    const foundUser = users.find(u => u.passengerId === card.passengerId);
    
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(foundUser));
      return { success: true };
    }
    
    return { success: false, error: 'User associated with this card not found.' };
  };

  const register = async (data: RegisterData) => {
    const users = getStoredUsers();
    
    if (users.find(u => u.email.toLowerCase() === data.email.toLowerCase())) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      name: data.name,
      email: data.email,
      phone: data.phone,
      passengerId: generatePassengerId(users),
      role: 'passenger',
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    const updatedUsers = [...users, newUser];
    saveUsers(updatedUsers);

    // Save password
    const passwords = JSON.parse(localStorage.getItem('smartbus_passwords') || '{}');
    passwords[newUser.id] = data.password;
    localStorage.setItem('smartbus_passwords', JSON.stringify(passwords));

    // Auto login
    setUser(newUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));

    // Initialize wallet
    const wallets = JSON.parse(localStorage.getItem('smartbus_wallets') || '{}');
    wallets[newUser.passengerId] = { balance: 0, currency: 'INR', updatedAt: new Date().toISOString() };
    localStorage.setItem('smartbus_wallets', JSON.stringify(wallets));

    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const updateUser = (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    
    const users = getStoredUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      users[idx] = updated;
      saveUsers(users);
    }
  };

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated: !!user, isLoading, login, loginWithRFID, register, logout, updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
