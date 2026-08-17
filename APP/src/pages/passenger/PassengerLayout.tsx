import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import {
  Bus, LayoutDashboard, Ticket, Wallet, CreditCard, History,
  User, LogOut, Menu, X, ChevronRight, Zap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/passenger/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/passenger/book', icon: Bus, label: 'Book Bus' },
  { to: '/passenger/tickets', icon: Ticket, label: 'My Tickets' },
  { to: '/passenger/wallet', icon: Wallet, label: 'Wallet' },
  { to: '/passenger/rfid', icon: CreditCard, label: 'RFID Card' },
  { to: '/passenger/transactions', icon: History, label: 'Transactions' },
  { to: '/passenger/profile', icon: User, label: 'Profile' },
];

export default function PassengerLayout() {
  const { user, logout } = useAuth();
  const { settings } = useApp();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const Sidebar = ({ mobile = false }) => (
    <div className={`flex flex-col h-full ${mobile ? '' : 'sticky top-0 h-screen'}`}>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-primary-800 rounded-lg flex items-center justify-center">
            <Bus className="w-5 h-5 text-white" />
          </div>
          <span className="font-black text-primary-900">SMARTBUS<span className="text-blue-500">+</span></span>
        </Link>
        <div className="mt-3 flex items-center gap-2">
          <span className="status-dot status-dot-online" />
          <span className="text-xs text-gray-500 font-medium">ACTIVE</span>
        </div>
      </div>

      {/* User Info */}
      <div className="px-5 py-4 border-b border-gray-100 bg-primary-50/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-800 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900 truncate">{user?.name}</div>
            <div className="text-xs text-primary-700 font-mono">{user?.passengerId}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary-800 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 w-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 bg-white border-r border-gray-100 flex-col flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl animate-slide-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="font-bold text-primary-900">Menu</span>
              <button onClick={() => setSidebarOpen(false)} className="btn-ghost p-1.5 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Mobile Top Bar */}
        <header className="md:hidden sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
          <button onClick={() => setSidebarOpen(true)} className="btn-ghost p-1.5">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-black text-primary-900">SMARTBUS<span className="text-blue-500">+</span></span>
          <div className="w-9 h-9 bg-primary-800 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {user?.name.charAt(0).toUpperCase()}
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
