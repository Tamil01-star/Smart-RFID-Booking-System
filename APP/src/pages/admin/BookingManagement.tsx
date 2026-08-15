import React, { useEffect, useState } from 'react';
import { bookingService } from '../../services';
import { Booking, BookingStatus } from '../../types';

export default function BookingManagement() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | BookingStatus>('all');

  useEffect(() => { bookingService.getBookings().then(b => { setBookings(b); setLoading(false); }); }, []);

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-800 border-t-transparent" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Booking Management</h1>
        <p className="page-subtitle">{bookings.length} total bookings</p>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {(['all', 'confirmed', 'completed', 'cancelled'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${filter === f ? 'bg-primary-800 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)} ({f === 'all' ? bookings.length : bookings.filter(b => b.status === f).length})
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Passenger</th>
                <th>Bus</th>
                <th>Route</th>
                <th>Date</th>
                <th>Fare</th>
                <th>RFID</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">No bookings found</td></tr>
              ) : filtered.map(b => (
                <tr key={b.id}>
                  <td className="font-mono text-xs text-gray-500">{b.bookingId}</td>
                  <td>
                    <div className="font-medium text-gray-900">{b.passengerName}</div>
                    <div className="text-xs text-gray-400 font-mono">{b.passengerId}</div>
                  </td>
                  <td className="font-bold text-primary-700">{b.busNumber}</td>
                  <td className="text-sm">{b.source} → {b.destination}</td>
                  <td className="text-sm text-gray-600">{new Date(b.travelDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                  <td className="font-bold">₹{b.fare}</td>
                  <td>
                    {b.rfidLinked ? (
                      <span className="badge badge-success font-mono text-xs">{b.rfidUid}</span>
                    ) : (
                      <span className="badge badge-gray">None</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${b.status === 'confirmed' ? 'badge-success' : b.status === 'completed' ? 'badge-info' : 'badge-error'}`}>
                      {b.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
