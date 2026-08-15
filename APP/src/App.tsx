import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';

// Public Pages
import Home from './pages/public/Home';
import Login from './pages/public/Login';
import Register from './pages/public/Register';
import ForgotPassword from './pages/public/ForgotPassword';

// Passenger Pages
import PassengerLayout from './pages/passenger/PassengerLayout';
import PassengerDashboard from './pages/passenger/Dashboard';
import BookBus from './pages/passenger/BookBus';
import MyTickets from './pages/passenger/MyTickets';
import Wallet from './pages/passenger/Wallet';
import RFIDManagement from './pages/passenger/RFIDManagement';
import TransactionHistory from './pages/passenger/TransactionHistory';
import Profile from './pages/passenger/Profile';

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import BusManagement from './pages/admin/BusManagement';
import RouteManagement from './pages/admin/RouteManagement';
import PassengerManagement from './pages/admin/PassengerManagement';
import AdminRFIDManagement from './pages/admin/AdminRFIDManagement';
import BookingManagement from './pages/admin/BookingManagement';
import TransactionMonitoring from './pages/admin/TransactionMonitoring';
import ESP32Devices from './pages/admin/ESP32Devices';
import SystemLogs from './pages/admin/SystemLogs';
import Settings from './pages/admin/Settings';

function ProtectedRoute({ children, requireAdmin }: { children: React.ReactNode; requireAdmin?: boolean }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-800 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requireAdmin && user?.role !== 'admin') return <Navigate to="/passenger/dashboard" replace />;
  if (!requireAdmin && user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;

  return <>{children}</>;
}

function AppRoutes() {
  const { user, isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to={user?.role === 'admin' ? '/admin/dashboard' : '/passenger/dashboard'} replace /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/passenger/dashboard" replace /> : <Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Passenger routes */}
      <Route path="/passenger" element={<ProtectedRoute><PassengerLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<PassengerDashboard />} />
        <Route path="book" element={<BookBus />} />
        <Route path="tickets" element={<MyTickets />} />
        <Route path="wallet" element={<Wallet />} />
        <Route path="rfid" element={<RFIDManagement />} />
        <Route path="transactions" element={<TransactionHistory />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* Admin routes */}
      <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="buses" element={<BusManagement />} />
        <Route path="routes" element={<RouteManagement />} />
        <Route path="passengers" element={<PassengerManagement />} />
        <Route path="rfid" element={<AdminRFIDManagement />} />
        <Route path="bookings" element={<BookingManagement />} />
        <Route path="transactions" element={<TransactionMonitoring />} />
        <Route path="devices" element={<ESP32Devices />} />
        <Route path="logs" element={<SystemLogs />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                borderRadius: '10px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              },
              success: {
                style: { background: '#f0fdf4', border: '1px solid #86efac', color: '#15803d' },
                iconTheme: { primary: '#16a34a', secondary: '#f0fdf4' },
              },
              error: {
                style: { background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626' },
                iconTheme: { primary: '#dc2626', secondary: '#fef2f2' },
              },
            }}
          />
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
}
