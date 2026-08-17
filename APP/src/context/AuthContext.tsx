import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithRFID: (uid: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  adminCreatePassenger: (data: any) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: (userId: string) => Promise<{ success: boolean; error?: string }>;
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

const STORAGE_KEY = 'smartbus_auth_user';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'Login failed' };
      
      setUser(data.user);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Server connection failed' };
    }
  };

  const loginWithRFID = async (uid: string, password?: string) => {
    try {
      const res = await fetch(`${API_URL}/auth/login-rfid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, password })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'RFID Login failed' };

      setUser(data.user);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Server connection failed' };
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const resData = await res.json();
      if (!res.ok) return { success: false, error: resData.error || 'Registration failed' };

      setUser(resData.user);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(resData.user));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Server connection failed' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/users/update/${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (res.ok) {
        const updated = { ...user, ...updates };
        setUser(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
    } catch (err) {
      console.error('Failed to update user on server:', err);
    }
  };

  const adminCreatePassenger = async (data: any) => {
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          category: data.category
        })
      });
      const resData = await res.json();
      if (!res.ok) return { success: false, error: resData.error || 'Failed to create passenger' };

      // Link RFID card if UID is provided
      if (data.rfidUid && resData.user) {
        const linkRes = await fetch(`${API_URL}/rfid/link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: data.rfidUid,
            passengerId: resData.user.passengerId,
            passengerName: resData.user.name
          })
        });
        const linkData = await linkRes.json();
        if (!linkRes.ok) {
          return { success: true, error: `Passenger created, but RFID linking failed: ${linkData.error}` };
        }
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Server connection failed' };
    }
  };

  const deleteAccount = async (userId: string) => {
    try {
      const res = await fetch(`${API_URL}/users/delete/${userId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const data = await res.json();
        return { success: false, error: data.error || 'Account deletion failed' };
      }

      if (user?.id === userId) {
        logout();
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Server connection failed' };
    }
  };

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated: !!user, isLoading, login, loginWithRFID, register, adminCreatePassenger, deleteAccount, logout, updateUser
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
