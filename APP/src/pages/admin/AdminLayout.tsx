import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import {
  Bus, LayoutDashboard, Users, CreditCard, Ticket, History,
  Cpu, FileText, Settings, LogOut, Menu, X, MapPin, Zap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import toast from 'react-hot-toast';

const adminNavItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/buses', icon: Bus, label: 'Buses' },
  { to: '/admin/routes', icon: MapPin, label: 'Routes' },
  { to: '/admin/passengers', icon: Users, label: 'Passengers' },
  { to: '/admin/rfid', icon: CreditCard, label: 'RFID Cards' },
  { to: '/admin/bookings', icon: Ticket, label: 'Bookings' },
  { to: '/admin/transactions', icon: History, label: 'Transactions' },
  { to: '/admin/devices', icon: Cpu, label: 'ESP32 Devices' },
  { to: '/admin/logs', icon: FileText, label: 'System Logs' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { settings } = useApp();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    navigate('/');
  };

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-gray-100">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-primary-800 rounded-lg flex items-center justify-center">
            <Bus className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-black text-primary-900">SMARTBUS<span className="text-blue-500">+</span></span>
            <div className="text-xs text-red-600 font-semibold">ADMIN PANEL</div>
          </div>
        </Link>
        <div className="mt-3 flex items-center gap-2">
          <span className="status-dot status-dot-online" />
          <span className="text-xs text-gray-500 font-medium">ACTIVE</span>
        </div>
      </div>

      <div className="px-5 py-3 border-b border-gray-100 bg-red-50/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-red-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {user?.name.charAt(0)}
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-900">{user?.name}</div>
            <div className="text-xs text-red-700 font-semibold">System Administrator</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {adminNavItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive ? 'bg-primary-800 text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-100">
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 w-full transition-colors">
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden md:flex w-60 bg-white border-r border-gray-100 flex-col flex-shrink-0">
        <Sidebar />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="font-bold text-red-700">Admin Menu</span>
              <button onClick={() => setSidebarOpen(false)} className="btn-ghost p-1.5"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto h-full"><Sidebar /></div>
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <header className="md:hidden sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="btn-ghost p-1.5"><Menu className="w-5 h-5" /></button>
          <span className="font-black text-primary-900 text-sm">ADMIN PANEL</span>
          <div className="w-8 h-8 bg-red-700 rounded-full flex items-center justify-center text-white text-xs font-bold">{user?.name.charAt(0)}</div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
