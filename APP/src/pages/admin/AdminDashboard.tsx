import React, { useEffect, useState } from 'react';
import { Users, Bus, Ticket, TrendingUp, CreditCard, AlertCircle, Cpu, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { busService, bookingService, transactionService, rfidService } from '../../services';
import { DEMO_USERS, DEMO_LOGS } from '../../data/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const revenueData = [
  { day: 'Mon', revenue: 1240, bookings: 10 },
  { day: 'Tue', revenue: 980, bookings: 8 },
  { day: 'Wed', revenue: 1650, bookings: 13 },
  { day: 'Thu', revenue: 2100, bookings: 17 },
  { day: 'Fri', revenue: 1890, bookings: 15 },
  { day: 'Sat', revenue: 2400, bookings: 20 },
  { day: 'Sun', revenue: 1700, bookings: 14 },
];

const COLORS = ['#1e3a8a', '#3b82f6', '#60a5fa', '#93c5fd'];

export default function AdminDashboard() {
  const [buses, setBuses] = useState<number>(0);
  const [bookings, setBookings] = useState<number>(0);
  const [txns, setTxns] = useState<number>(0);
  const [rfidCards, setRfidCards] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      busService.getBuses(),
      bookingService.getBookings(),
      transactionService.getTransactions(),
      rfidService.getRFIDCards(),
    ]).then(([b, bk, t, r]) => {
      setBuses(b.length);
      setBookings(bk.length);
      setTxns(t.length);
      setRfidCards(r.filter(c => c.status === 'active').length);
      setLoading(false);
    });
  }, []);

  const statCards = [
    { label: 'Total Passengers', value: DEMO_USERS.filter(u => u.role === 'passenger').length, icon: Users, color: 'blue', link: '/admin/passengers' },
    { label: 'Total Buses', value: buses, icon: Bus, color: 'indigo', link: '/admin/buses' },
    { label: 'Total Bookings', value: bookings, icon: Ticket, color: 'green', link: '/admin/bookings' },
    { label: 'Transactions', value: txns, icon: TrendingUp, color: 'purple', link: '/admin/transactions' },
    { label: 'Active RFID Cards', value: rfidCards, icon: CreditCard, color: 'teal', link: '/admin/rfid' },
    { label: 'ESP32 Devices', value: 1, icon: Cpu, color: 'amber', link: '/admin/devices' },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700', indigo: 'bg-indigo-50 text-indigo-700',
    green: 'bg-green-50 text-green-700', purple: 'bg-purple-50 text-purple-700',
    teal: 'bg-teal-50 text-teal-700', amber: 'bg-amber-50 text-amber-700',
  };

  const busStatusData = [
    { name: 'Active', value: 3 },
    { name: 'Full', value: 1 },
    { name: 'Scheduled', value: 1 },
    { name: 'Inactive', value: 0 },
  ];

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-800 border-t-transparent" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">System overview and statistics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <Link key={card.label} to={card.link} className="card-hover p-5 group">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[card.color]}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
              </div>
              <div className="text-3xl font-black text-gray-900">{card.value}</div>
              <div className="text-xs text-gray-500 mt-1">{card.label}</div>
            </Link>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-semibold text-gray-900 mb-4">Weekly Revenue (Demo Data)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 13 }}
                formatter={(value: number) => [`₹${value}`, 'Revenue']}
              />
              <Bar dataKey="revenue" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Bus Status Pie */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Bus Status</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={busStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" paddingAngle={3}>
                {busStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {busStatusData.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[i] }} />
                  {item.name}
                </div>
                <span className="font-semibold text-gray-700">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Logs */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Recent System Events</h3>
          <Link to="/admin/logs" className="text-xs text-primary-700 hover:underline font-medium">View all logs</Link>
        </div>
        <div className="divide-y divide-gray-50">
          {DEMO_LOGS.slice(0, 5).map(log => (
            <div key={log.id} className="flex items-start gap-3 px-5 py-3">
              <span className={`status-dot mt-1.5 flex-shrink-0 ${
                log.level === 'error' ? 'bg-red-400' :
                log.level === 'warning' ? 'bg-amber-400' :
                log.level === 'success' ? 'bg-green-500' : 'bg-blue-400'
              }`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-800">{log.message}</div>
                <div className="text-xs text-gray-400 mt-0.5">{log.source} • {new Date(log.timestamp).toLocaleString('en-IN')}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
