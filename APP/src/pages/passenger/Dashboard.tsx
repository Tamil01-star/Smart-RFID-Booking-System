import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, Bus, Ticket, CreditCard, ArrowRight, TrendingUp, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { walletService, bookingService, rfidService, transactionService } from '../../services';
import { Wallet as WalletType, Booking, WalletTransaction } from '../../types';

export default function PassengerDashboard() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [recentTxns, setRecentTxns] = useState<WalletTransaction[]>([]);
  const [rfidLinked, setRfidLinked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      walletService.getWallet(user.passengerId),
      bookingService.getBookings(user.passengerId),
      rfidService.getCardByPassenger(user.passengerId),
      transactionService.getTransactions(user.passengerId),
    ]).then(([w, b, rfid, txns]) => {
      setWallet(w);
      setBookings(b);
      setRfidLinked(!!rfid && rfid.status === 'active');
      setRecentTxns(txns.slice(0, 5));
      setLoading(false);
    });
  }, [user]);

  const activeBookings = bookings.filter(b => b.status === 'confirmed').length;
  const totalTrips = bookings.filter(b => b.status === 'completed').length;

  const statCards = [
    {
      label: 'Wallet Balance',
      value: wallet ? `₹${wallet.balance.toFixed(2)}` : '₹0.00',
      icon: Wallet,
      color: 'blue',
      link: '/passenger/wallet',
      badge: 'DEMO WALLET',
    },
    {
      label: 'Active Bookings',
      value: String(activeBookings),
      icon: Ticket,
      color: 'green',
      link: '/passenger/tickets',
    },
    {
      label: 'Total Trips',
      value: String(totalTrips),
      icon: TrendingUp,
      color: 'purple',
      link: '/passenger/tickets',
    },
    {
      label: 'RFID Status',
      value: rfidLinked ? 'Linked' : 'Not Linked',
      icon: CreditCard,
      color: rfidLinked ? 'green' : 'amber',
      link: '/passenger/rfid',
      badge: rfidLinked ? 'ACTIVE' : 'LINK NOW',
    },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
    amber: 'bg-amber-50 text-amber-700',
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-800 border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="page-title">Welcome back, {user?.name.split(' ')[0]}! 👋</h1>
        <p className="page-subtitle">Passenger ID: <span className="font-mono font-semibold text-primary-700">{user?.passengerId}</span></p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <Link key={card.label} to={card.link} className="card-hover p-5 block group">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[card.color]}`}>
                  <Icon className="w-5 h-5" />
                </div>
                {card.badge && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colorMap[card.color]}`}>
                    {card.badge}
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold text-gray-900">{card.value}</div>
              <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                {card.label}
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick actions + Recent Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <Link to="/passenger/book" className="flex items-center justify-between p-3 rounded-lg hover:bg-primary-50 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Bus className="w-4 h-4 text-primary-700" />
                </div>
                <span className="text-sm font-medium text-gray-700">Book a Bus</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary-600 transition-colors" />
            </Link>
            <Link to="/passenger/wallet" className="flex items-center justify-between p-3 rounded-lg hover:bg-green-50 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-green-700" />
                </div>
                <span className="text-sm font-medium text-gray-700">Add Demo Money</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-green-600 transition-colors" />
            </Link>
            {!rfidLinked && (
              <Link to="/passenger/rfid" className="flex items-center justify-between p-3 rounded-lg hover:bg-amber-50 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-amber-700" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Link RFID Card</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-amber-600 transition-colors" />
              </Link>
            )}
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Bookings</h2>
            <Link to="/passenger/tickets" className="text-xs text-primary-700 hover:underline font-medium">View all</Link>
          </div>
          {bookings.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Bus className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No bookings yet. <Link to="/passenger/book" className="text-primary-700 hover:underline">Book your first bus!</Link></p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.slice(0, 4).map(b => (
                <div key={b.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Bus className="w-4 h-4 text-primary-700" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{b.busNumber}</div>
                      <div className="text-xs text-gray-500">{b.source} → {b.destination}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">₹{b.fare}</div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      b.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                      b.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {b.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Walk-in Booking Info */}
      <div className="card p-5 border-l-4 border-l-primary-800">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Bus className="w-5 h-5 text-primary-700" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Walk-In Booking (Physical)</h3>
            <p className="text-sm text-gray-500 mt-1">
              Walk-in passengers can select their destination using the <strong>onboard 4×4 keypad</strong> and
              authenticate using <strong>RFID card</strong>. The actual keypad will be connected to ESP32 hardware later.
              Fare deduction happens automatically through Firebase.
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-primary-700">
              <CheckCircle className="w-3.5 h-3.5" />
              Physical boarding supported via ESP32 + MFRC522 integration (planned)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
