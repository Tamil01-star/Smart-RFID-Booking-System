import React, { useEffect, useState } from 'react';
import { 
  DollarSign, TrendingUp, Bus, MapPin, Ticket, Calendar, 
  ArrowUpRight, CreditCard, BarChart3, PieChart as PieIcon,
  Search, ArrowDownRight, Layers, ShieldCheck, Filter
} from 'lucide-react';
import { busService, bookingService, transactionService } from '../../services';
import { Bus as BusType, Booking, WalletTransaction } from '../../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';

const PIE_COLORS = ['#1e3a8a', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function CollectionManagement() {
  const [buses, setBuses] = useState<BusType[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBusId, setSelectedBusId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    Promise.all([
      busService.getBuses(),
      bookingService.getBookings(),
      transactionService.getTransactions()
    ]).then(([bList, bkList, txList]) => {
      setBuses(bList);
      setBookings(bkList);
      setTransactions(txList);
      setLoading(false);
    });
  }, []);

  // Filter bookings by bus if selected
  const filteredBookings = bookings.filter(b => {
    if (b.status === 'cancelled') return false;
    if (selectedBusId !== 'all') {
      const bus = buses.find(busItem => busItem.id === selectedBusId || busItem.busNumber === selectedBusId);
      if (bus && b.busId !== bus.id && b.busNumber !== bus.busNumber) {
        return false;
      }
    }
    return true;
  });

  // Overall Financial Metrics
  const totalCollections = filteredBookings.reduce((sum, b) => sum + (b.fare || 0), 0);
  const reservedCollections = filteredBookings
    .filter(b => b.bookingType === 'reserved')
    .reduce((sum, b) => sum + (b.fare || 0), 0);
  const unreservedCollections = filteredBookings
    .filter(b => b.bookingType !== 'reserved')
    .reduce((sum, b) => sum + (b.fare || 0), 0);
  const totalPassengers = filteredBookings.length;
  const avgCollectionPerPassenger = totalPassengers > 0 ? Math.round(totalCollections / totalPassengers) : 0;

  // Selected Bus object
  const activeBus = buses.find(b => b.id === selectedBusId || b.busNumber === selectedBusId);

  // Calculate Stop-by-Stop Collections & Amounts Received
  const stopCollectionMap: Record<string, { count: number; totalAmount: number; stopOrder?: number; baseFare?: number }> = {};

  // If a specific bus is selected with configured stops, initialize with its route stops
  if (activeBus && activeBus.stopsWithFares && activeBus.stopsWithFares.length > 0) {
    activeBus.stopsWithFares.forEach((s: any) => {
      if (s.stopName && !s.stopName.toLowerCase().includes('walk-in') && !s.stopName.toLowerCase().includes('current stop')) {
        stopCollectionMap[s.stopName] = {
          count: 0,
          totalAmount: 0,
          stopOrder: s.order,
          baseFare: s.fare
        };
      }
    });
  } else {
    // Collect all stops from all buses
    buses.forEach(b => {
      if (b.stopsWithFares) {
        b.stopsWithFares.forEach((s: any) => {
          if (s.stopName && !s.stopName.toLowerCase().includes('walk-in') && !s.stopName.toLowerCase().includes('current stop')) {
            if (!stopCollectionMap[s.stopName]) {
              stopCollectionMap[s.stopName] = {
                count: 0,
                totalAmount: 0,
                stopOrder: s.order,
                baseFare: s.fare
              };
            }
          }
        });
      }
    });
  }

  // Aggregate collections per destination stop
  filteredBookings.forEach(b => {
    if (!b.destination) return;
    const dest = b.destination.trim();
    if (dest.toLowerCase().includes('walk-in') || dest.toLowerCase().includes('current stop')) return;

    // Find case-insensitive match
    const matchingKey = Object.keys(stopCollectionMap).find(k => k.toLowerCase() === dest.toLowerCase());
    const targetKey = matchingKey || dest;

    if (!stopCollectionMap[targetKey]) {
      stopCollectionMap[targetKey] = { count: 0, totalAmount: 0 };
    }

    stopCollectionMap[targetKey].count += 1;
    stopCollectionMap[targetKey].totalAmount += (b.fare || 0);
  });

  // Convert to sorted array
  const stopCollectionsList = Object.entries(stopCollectionMap)
    .filter(([name]) => !name.toLowerCase().includes('walk-in') && !name.toLowerCase().includes('current stop'))
    .map(([stopName, data], idx) => ({
      stopName,
      count: data.count,
      totalAmount: data.totalAmount,
      order: data.stopOrder || idx + 1,
      baseFare: data.baseFare,
      percent: totalCollections > 0 ? Math.round((data.totalAmount / totalCollections) * 100) : 0
    }))
    .sort((a, b) => (a.order && b.order ? a.order - b.order : b.totalAmount - a.totalAmount));

  // Chart Data: Top Revenue Stops
  const chartStopRevenue = [...stopCollectionsList]
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 7)
    .map(s => ({
      stop: s.stopName,
      amount: s.totalAmount,
      passengers: s.count
    }));

  // Pie Data: Reserved vs Unreserved Revenue
  const pieRevenueData = [
    { name: 'Reserved (Online Paid)', value: reservedCollections },
    { name: 'Unreserved (Boarding Tap)', value: unreservedCollections }
  ].filter(d => d.value > 0);

  // Bus-wise collection summary
  const busRevenueList = buses.map(b => {
    const busBookings = bookings.filter(bk => 
      bk.status !== 'cancelled' && 
      (bk.busId === b.id || bk.busNumber === b.busNumber)
    );
    const busTotal = busBookings.reduce((sum, bk) => sum + (bk.fare || 0), 0);
    return {
      id: b.id,
      busNumber: b.busNumber,
      busName: b.busName,
      route: `${b.source} → ${b.destination}`,
      totalSeats: b.totalSeats,
      passengersCount: busBookings.length,
      revenue: busTotal
    };
  });

  // Filtered transactions for the ledger table
  const filteredLedger = filteredBookings.filter(b => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (b.passengerName && b.passengerName.toLowerCase().includes(term)) ||
      (b.passengerId && b.passengerId.toLowerCase().includes(term)) ||
      (b.destination && b.destination.toLowerCase().includes(term)) ||
      (b.bookingId && b.bookingId.toLowerCase().includes(term))
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-800 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-green-600" />
            Revenue & Collection Center
          </h1>
          <p className="page-subtitle">
            Comprehensive financial breakdown, stop-wise collections, and route revenues
          </p>
        </div>

        {/* Bus Filter Selector */}
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-bold text-gray-600 uppercase">Bus Route:</span>
          <select
            value={selectedBusId}
            onChange={e => setSelectedBusId(e.target.value)}
            className="text-xs font-semibold text-gray-900 bg-transparent border-none focus:ring-0 outline-none cursor-pointer"
          >
            <option value="all">All Buses (Entire Fleet)</option>
            {buses.map(b => (
              <option key={b.id} value={b.id}>
                {b.busNumber} ({b.source} → {b.destination})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 border-l-4 border-green-500">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Collection</span>
            <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-gray-900">₹{totalCollections.toLocaleString('en-IN')}</div>
          <div className="text-xs text-gray-500 mt-1">Across {totalPassengers} paid bookings</div>
        </div>

        <div className="card p-5 border-l-4 border-blue-500">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Reserved (Instant)</span>
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-gray-900">₹{reservedCollections.toLocaleString('en-IN')}</div>
          <div className="text-xs text-gray-500 mt-1">
            {totalCollections > 0 ? Math.round((reservedCollections / totalCollections) * 100) : 0}% of total revenue
          </div>
        </div>

        <div className="card p-5 border-l-4 border-amber-500">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Unreserved (Gate Tap)</span>
            <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-gray-900">₹{unreservedCollections.toLocaleString('en-IN')}</div>
          <div className="text-xs text-gray-500 mt-1">Collected at RFID bus turnstile</div>
        </div>

        <div className="card p-5 border-l-4 border-purple-500">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Fare / Passenger</span>
            <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-gray-900">₹{avgCollectionPerPassenger}</div>
          <div className="text-xs text-gray-500 mt-1">Mean ticket value</div>
        </div>
      </div>

      {/* PRIMARY SECTION: Stop-by-Stop Amount Received Table & Cards */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary-700" />
              Stop-by-Stop Amount Received
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Exact revenue collected for each specific stop on this route
            </p>
          </div>

          <div className="text-xs bg-green-50 text-green-800 font-bold px-3 py-1.5 rounded-lg border border-green-200">
            Total Stops Configured: {stopCollectionsList.length}
          </div>
        </div>

        {/* Detailed Grid of Stops with Amount Received */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stopCollectionsList.map(stop => (
            <div 
              key={stop.stopName}
              className={`p-5 rounded-2xl border transition-all ${
                stop.totalAmount > 0 
                  ? 'bg-gradient-to-br from-green-50/70 to-emerald-50/40 border-green-200 shadow-sm'
                  : 'bg-gray-50/60 border-gray-100'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Stop #{stop.order}
                </span>
                <span className={`badge ${stop.totalAmount > 0 ? 'badge-success text-xs font-bold' : 'badge-gray text-xs'}`}>
                  {stop.count} Passenger{stop.count === 1 ? '' : 's'}
                </span>
              </div>

              <div className="flex items-center justify-between mb-3">
                <div className="text-lg font-black text-gray-900 flex items-center gap-1.5">
                  <MapPin className={`w-4 h-4 ${stop.totalAmount > 0 ? 'text-green-600' : 'text-gray-400'}`} />
                  {stop.stopName}
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-green-700">
                    ₹{stop.totalAmount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-gray-400">Total Collected</div>
                </div>
              </div>

              {/* Progress Bar of Revenue */}
              <div className="space-y-1 pt-2 border-t border-gray-100">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Route Revenue Share</span>
                  <span className="font-bold text-gray-800">{stop.percent}%</span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-green-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(stop.totalAmount > 0 ? 8 : 0, stop.percent)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Visual Charts: Revenue Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart: Stop Revenues */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary-700" />
            <h3 className="font-semibold text-gray-900">Highest Revenue Stops (₹ Received)</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartStopRevenue} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="stop" tick={{ fontSize: 11, fill: '#4b5563' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }}
                formatter={(val: any) => [`₹${val}`, 'Amount Received']}
              />
              <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} barSize={28}>
                {chartStopRevenue.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={['#059669', '#10b981', '#34d399', '#6ee7b7'][index % 4]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart: Payment Channels */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieIcon className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Payment Channels</h3>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieRevenueData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" paddingAngle={4}>
                {pieRevenueData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} 
                formatter={(val: any) => [`₹${val}`, 'Revenue']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-3">
            {pieRevenueData.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: PIE_COLORS[i] }} />
                  <span className="text-gray-700 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-gray-900">₹{item.value.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fleet Revenue Breakdown Table */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">Bus Fleet Performance & Collection</h3>
            <p className="text-xs text-gray-500">Revenue per active vehicle</p>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Bus</th>
                <th>Route</th>
                <th>Capacity</th>
                <th>Bookings / Passengers</th>
                <th>Total Collection</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {busRevenueList.map(b => (
                <tr key={b.id}>
                  <td>
                    <div className="font-bold text-gray-900">{b.busNumber}</div>
                    <div className="text-xs text-gray-500">{b.busName}</div>
                  </td>
                  <td className="text-sm text-gray-700">{b.route}</td>
                  <td className="text-sm text-gray-600">{b.totalSeats} Seats</td>
                  <td>
                    <span className="badge badge-info text-xs font-bold">{b.passengersCount} Passengers</span>
                  </td>
                  <td>
                    <div className="text-base font-black text-green-700">₹{b.revenue.toLocaleString('en-IN')}</div>
                  </td>
                  <td>
                    <span className="badge badge-success text-xs">ONLINE & ACTIVE</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Collection Ledger */}
      <div className="card">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-gray-900">Collection Transactions Ledger</h3>
            <p className="text-xs text-gray-500">Itemized record of every ticket collection</p>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search passenger, stop, or ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input pl-9 text-xs"
            />
          </div>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Passenger</th>
                <th>Bus</th>
                <th>Destination Stop</th>
                <th>Date</th>
                <th>Type</th>
                <th>Fare Collected</th>
              </tr>
            </thead>
            <tbody>
              {filteredLedger.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400">
                    No collection records found
                  </td>
                </tr>
              ) : (
                filteredLedger.map(b => (
                  <tr key={b.id}>
                    <td className="font-mono text-xs font-bold text-primary-800">{b.bookingId}</td>
                    <td>
                      <div className="font-semibold text-gray-900">{b.passengerName}</div>
                      <div className="text-[11px] text-gray-400">{b.passengerId}</div>
                    </td>
                    <td className="text-sm font-medium text-gray-700">{b.busNumber}</td>
                    <td>
                      <span className="inline-flex items-center gap-1 font-bold text-gray-900">
                        <MapPin className="w-3.5 h-3.5 text-primary-600" />
                        {b.destination}
                      </span>
                    </td>
                    <td className="text-xs text-gray-500">
                      {new Date(b.travelDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <span className={`badge text-xs font-bold ${
                        b.bookingType === 'reserved' 
                          ? 'bg-blue-50 text-blue-700 border-blue-200' 
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {b.bookingType === 'reserved' ? 'RESERVED' : 'UNRESERVED'}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm font-black text-green-700">₹{b.fare}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
