import React, { useEffect, useState } from 'react';
import { Bus, Calendar, Clock, X, Download, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { bookingService } from '../../services';
import { Booking } from '../../types';
import toast from 'react-hot-toast';

function TicketModal({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
      <div className="card w-full max-w-md shadow-2xl animate-slide-up print-ticket">
        <div className="bg-primary-800 text-white px-6 py-4 rounded-t-xl flex items-center justify-between">
          <div>
            <div className="font-black text-lg">SMARTBUS+</div>
            <div className="text-xs text-blue-200">Digital Ticket</div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white no-print">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className={`badge text-sm ${
              booking.status === 'confirmed' ? 'badge-success' :
              booking.status === 'completed' ? 'badge-info' : 'badge-error'
            }`}>
              {booking.status.toUpperCase()}
            </span>
            <span className="text-xs font-mono text-gray-400">{booking.bookingId}</span>
          </div>

          <div className="flex items-center justify-between text-lg font-black text-gray-900">
            <div className="text-center">
              <div>{booking.source}</div>
              <div className="text-xs font-normal text-gray-500">Origin</div>
            </div>
            <Bus className="w-6 h-6 text-primary-600 mx-4 flex-shrink-0" />
            <div className="text-center">
              <div>{booking.destination}</div>
              <div className="text-xs font-normal text-gray-500">Destination</div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
            {[
              ['Passenger', booking.passengerName],
              ['Passenger ID', booking.passengerId],
              ['Bus', booking.busNumber],
              ['Date', new Date(booking.travelDate).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })],
              ['Departure', booking.departureTime],
              ['Arrival', booking.arrivalTime],
              ['Fare', `₹${booking.fare}`],
              ['RFID', booking.rfidLinked ? `✓ Linked (${booking.rfidUid})` : 'Not linked'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-semibold text-gray-900">{value}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3 no-print">
            <button onClick={() => window.print()} className="btn-secondary flex-1 btn-sm">
              <Download className="w-4 h-4" />
              Print/Save
            </button>
            <button onClick={onClose} className="btn-primary flex-1 btn-sm">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MyTickets() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const load = async () => {
    if (!user) return;
    const data = await bookingService.getBookings(user.passengerId);
    setBookings(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const handleCancel = async (bookingId: string) => {
    if (!user || !confirm('Cancel this booking? Fare will be refunded to your wallet.')) return;
    const result = await bookingService.cancelBooking(bookingId, user.passengerId);
    if (result.success) {
      toast.success('Booking cancelled. Fare refunded to wallet.');
      load();
    } else {
      toast.error(result.error || 'Cannot cancel this booking');
    }
  };

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-800 border-t-transparent" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">My Tickets</h1>
        <p className="page-subtitle">All your bus bookings and tickets</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {(['all', 'confirmed', 'completed', 'cancelled'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              filter === f ? 'bg-primary-800 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${filter === f ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>
              {f === 'all' ? bookings.length : bookings.filter(b => b.status === f).length}
            </span>
          </button>
        ))}
      </div>

      {/* Bookings */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Bus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-700">No {filter !== 'all' ? filter : ''} bookings</h3>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(b => (
            <div key={b.id} className="card p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center">
                      <Bus className="w-4 h-4 text-primary-700" />
                    </div>
                    <div>
                      <span className="font-bold text-gray-900">{b.busNumber}</span>
                      <span className="ml-2 text-sm text-gray-500">{b.source} → {b.destination}</span>
                    </div>
                    <span className={`ml-auto badge ${
                      b.status === 'confirmed' ? 'badge-success' :
                      b.status === 'completed' ? 'badge-info' : 'badge-error'
                    }`}>{b.status.toUpperCase()}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500 ml-12">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(b.travelDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{b.departureTime}</span>
                    <span className="font-mono text-gray-400">{b.bookingId}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                  <div className="text-xl font-black text-gray-900">₹{b.fare}</div>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedBooking(b)} className="btn-secondary btn-sm">
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>
                    {b.status === 'confirmed' && (
                      <button onClick={() => handleCancel(b.id)} className="btn-danger btn-sm">
                        <X className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedBooking && <TicketModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />}
    </div>
  );
}
