import React, { useEffect, useState } from 'react';
import { Users, Bus, Ticket, TrendingUp, CreditCard, Cpu, ArrowUpRight, AlertCircle, MapPin, DollarSign, ArrowDownCircle, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { busService, bookingService, transactionService, rfidService } from '../../services';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#1e3a8a', '#3b82f6', '#60a5fa', '#93c5fd'];

export default function AdminDashboard() {
  const [buses, setBuses] = useState<number>(0);
  const [busesList, setBusesList] = useState<any[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<string>('all');
  const [bookings, setBookings] = useState<number>(0);
  const [txns, setTxns] = useState<number>(0);
  const [rfidCards, setRfidCards] = useState<number>(0);
  const [passengers, setPassengers] = useState<number>(0);
  const [logs, setLogs] = useState<any[]>([]);
  const [bookingsData, setBookingsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Simple localStorage helpers for layout stats
  const getLocalStorageData = () => {
    try {
      const storedUsers = localStorage.getItem('smartbus_users');
      if (storedUsers) {
        const users = JSON.parse(storedUsers);
        setPassengers(users.filter((u: any) => u.role === 'passenger').length);
      } else {
        setPassengers(0);
      }

      const storedLogs = localStorage.getItem('smartbus_logs');
      if (storedLogs) {
        setLogs(JSON.parse(storedLogs));
      } else {
        setLogs([]);
      }
    } catch {
      setPassengers(0);
      setLogs([]);
    }
  };

  useEffect(() => {
    getLocalStorageData();
    Promise.all([
      busService.getBuses(),
      bookingService.getBookings(),
      transactionService.getTransactions(),
      rfidService.getRFIDCards(),
    ]).then(([b, bk, t, r]) => {
      setBuses(b.length);
      setBusesList(b);
      setBookings(bk.length);
      setTxns(t.length);
      setRfidCards(r.filter(c => c.status === 'active').length);
      setBookingsData(bk);
      setLoading(false);
    });
  }, []);

  const statCards = [
    { label: 'Total Passengers', value: passengers, icon: Users, color: 'blue', link: '/admin/passengers' },
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

  // Generate dynamic chart data based on buses/bookings
  const busStatusData = [
    { name: 'Active', value: buses },
    { name: 'Scheduled', value: bookings },
    { name: 'Inactive', value: 0 },
  ];

  // Calculate Drop-off Counts by Stop
  const dropOffMap: Record<string, number> = {};
  const collectionMap: Record<string, number> = {};
  
  bookingsData.forEach(b => {
    if (b.status !== 'cancelled') {
      // Drop-off counting
      if (b.destination) {
        dropOffMap[b.destination] = (dropOffMap[b.destination] || 0) + 1;
      }
      // Total collection by bus
      if (b.busNumber && (b.status === 'completed' || b.status === 'boarded' || b.status === 'confirmed')) {
        collectionMap[b.busNumber] = (collectionMap[b.busNumber] || 0) + (b.fare || 0);
      }
    }
  });

  const dropOffData = Object.entries(dropOffMap)
    .map(([stop, count]) => ({ stop, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const collectionData = Object.entries(collectionMap)
    .map(([bus, collection]) => ({ bus, collection }))
    .sort((a, b) => b.collection - a.collection)
    .slice(0, 6);

  // Find selected bus (if any) for detailed stop-by-stop passenger breakdown
  const selectedBus = busesList.find(b => b.id === selectedBusId || b.busNumber === selectedBusId);

  // Detailed stop-by-stop drop-off list
  let detailedStopsList: { name: string; count: number; order?: number; fare?: number }[] = [];

  if (selectedBus && selectedBus.stopsWithFares && selectedBus.stopsWithFares.length > 0) {
    // Show all stops of this bus in route order
    detailedStopsList = selectedBus.stopsWithFares.map((s: any) => {
      const count = bookingsData.filter(bk => 
        bk.status !== 'cancelled' &&
        (bk.busId === selectedBus.id || bk.busNumber === selectedBus.busNumber) &&
        bk.destination && bk.destination.trim().toLowerCase() === s.stopName.trim().toLowerCase()
      ).length;
      return {
        name: s.stopName,
        count,
        order: s.order,
        fare: s.fare
      };
    });
  } else {
    // Show all stops across all buses
    const allKnownStops = new Set<string>();
    busesList.forEach(b => {
      if (b.stopsWithFares) {
        b.stopsWithFares.forEach((sf: any) => allKnownStops.add(sf.stopName));
      }
    });
    Object.keys(dropOffMap).forEach(s => allKnownStops.add(s));

    detailedStopsList = Array.from(allKnownStops).map((stopName, idx) => ({
      name: stopName,
      count: dropOffMap[stopName] || 0,
      order: idx + 1
    })).sort((a, b) => b.count - a.count);
  }

  const totalDropOffs = detailedStopsList.reduce((sum, s) => sum + s.count, 0);

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

      {/* Stop-by-Stop Passenger Drop-off Board (Getting Down Count) */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <ArrowDownCircle className="w-5 h-5 text-primary-700" />
              <h2 className="text-lg font-bold text-gray-900">Passenger Drop-Offs by Stop</h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Exact count of passengers getting down at each stop in the route
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">Filter Bus:</span>
            <select
              value={selectedBusId}
              onChange={e => setSelectedBusId(e.target.value)}
              className="input text-xs py-1.5 px-3 bg-gray-50 border-gray-200"
            >
              <option value="all">All Buses ({busesList.length})</option>
              {busesList.map(b => (
                <option key={b.id} value={b.id}>
                  {b.busNumber} ({b.source} → {b.destination})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Detailed One-by-One Stop Cards */}
        {detailedStopsList.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            No stops configured for the selected bus.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {detailedStopsList.map((stop, idx) => (
              <div
                key={stop.name}
                className={`p-4 rounded-xl border transition-all ${
                  stop.count > 0
                    ? 'bg-blue-50/60 border-blue-200 shadow-sm'
                    : 'bg-gray-50/70 border-gray-100 opacity-80'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Stop #{stop.order || idx + 1}
                  </span>
                  <span className={`badge ${stop.count > 0 ? 'badge-success font-bold text-xs' : 'badge-gray text-xs'}`}>
                    {stop.count > 0 ? `${stop.count} Getting Down` : '0 Getting Down'}
                  </span>
                </div>
                <div className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary-600 flex-shrink-0" />
                  <span>{stop.name}</span>
                </div>
                {stop.count > 0 && totalDropOffs > 0 && (
                  <div className="mt-3">
                    <div className="w-full bg-blue-200/60 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-primary-600 h-full rounded-full transition-all"
                        style={{ width: `${Math.max(10, Math.round((stop.count / totalDropOffs) * 100))}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1 text-right">
                      {Math.round((stop.count / totalDropOffs) * 100)}% of passengers
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Drop-off Chart */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-primary-700" />
            <h3 className="font-semibold text-gray-900">Passenger Drop-offs by Stop</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dropOffData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={true} vertical={false} />
              <XAxis type="number" tick={{ fontSize: 12, fill: '#9ca3af' }} />
              <YAxis dataKey="stop" type="category" tick={{ fontSize: 12, fill: '#4b5563' }} width={80} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 13 }}
                formatter={(value: any) => [value, 'Passengers Down']}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Bus Collection Chart */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">Total Collection by Bus</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={collectionData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="bus" tick={{ fontSize: 12, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 13 }}
                formatter={(value: any) => [`₹${value}`, 'Collection']}
              />
              <Bar dataKey="collection" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32}>
                {collectionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['#10b981', '#059669', '#34d399', '#047857'][index % 4]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

        {/* Recent Logs */}
        <div className="card lg:col-span-2">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Recent System Events</h3>
            <Link to="/admin/logs" className="text-xs text-primary-700 hover:underline font-medium">View all logs</Link>
          </div>
          <div className="divide-y divide-gray-50 h-[200px] overflow-y-auto">
            {logs.length > 0 ? (
              logs.slice(0, 5).map(log => (
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
              ))
            ) : (
              <div className="p-5 text-center text-sm text-gray-500 flex items-center justify-center gap-2 h-full">
                <AlertCircle className="w-4 h-4 text-gray-400" />
                No system events recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

