import React, { useState, useEffect } from 'react';
import { Bus, MapPin, Calendar, Search, Clock, Users, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { busService, bookingService, rfidService } from '../../services';
import { Bus as BusType, Booking } from '../../types';
import { CITIES } from '../../data/mockData';
import toast from 'react-hot-toast';

export default function BookBus() {
  const { user } = useAuth();
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [buses, setBuses] = useState<BusType[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<{ busId: string } | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [rfidUid, setRfidUid] = useState<string | undefined>();

  useEffect(() => {
    if (user) {
      rfidService.getCardByPassenger(user.passengerId).then(card => {
        if (card?.status === 'active') setRfidUid(card.uid);
      });
    }
  }, [user]);

  const handleSearch = async () => {
    if (!source || !destination) { toast.error('Please select source and destination'); return; }
    if (source === destination) { toast.error('Source and destination cannot be the same'); return; }
    setLoading(true);
    setSearched(true);
    const results = await busService.searchBuses(source, destination);
    setBuses(results);
    setLoading(false);
  };

  const getDynamicFare = (bus: BusType) => {
    if (source && destination && bus.stopsWithFares && Array.isArray(bus.stopsWithFares)) {
      const fromStop = bus.stopsWithFares.find(
        (s: any) => s.stopName.toLowerCase() === source.toLowerCase()
      );
      const toStop = bus.stopsWithFares.find(
        (s: any) => s.stopName.toLowerCase() === destination.toLowerCase()
      );
      if (fromStop && toStop && 
          fromStop.order !== undefined && toStop.order !== undefined && 
          fromStop.distance !== undefined && toStop.distance !== undefined && 
          toStop.order > fromStop.order) {
        const distanceKm = toStop.distance - fromStop.distance;
        let farePerKm = 2.00;
        
        const type = (bus.busName || '').toLowerCase();
        if (type.includes('ac')) {
          farePerKm = 4.00;
        } else if (type.includes('superfast') || type.includes('express')) {
          farePerKm = 2.75;
        } else {
          farePerKm = 2.00;
        }
        
        const calculatedFare = distanceKm * farePerKm;
        return Math.round(calculatedFare / 5) * 5;
      }
    }
    return bus.fare;
  };

  const getDynamicDistance = (bus: BusType) => {
    if (source && destination && bus.stopsWithFares && Array.isArray(bus.stopsWithFares)) {
      const fromStop = bus.stopsWithFares.find(
        (s: any) => s.stopName.toLowerCase() === source.toLowerCase()
      );
      const toStop = bus.stopsWithFares.find(
        (s: any) => s.stopName.toLowerCase() === destination.toLowerCase()
      );
      if (fromStop && toStop && 
          fromStop.order !== undefined && toStop.order !== undefined && 
          fromStop.distance !== undefined && toStop.distance !== undefined && 
          toStop.order > fromStop.order) {
        return toStop.distance - fromStop.distance;
      }
    }
    return null;
  };

  const handleBook = async (bus: BusType) => {
    if (!user) return;
    setBooking({ busId: bus.id });
    const fare = getDynamicFare(bus);
    const result = await bookingService.createBooking({
      passengerId: user.passengerId,
      passengerName: user.name,
      busId: bus.id,
      travelDate: date,
      rfidUid,
      source,
      destination
    });
    if (result.success && result.booking) {
      setConfirmedBooking(result.booking);
      toast.success('Booking confirmed! ₹' + fare + ' deducted from wallet');
    } else {
      toast.error(result.error || 'Booking failed');
    }
    setBooking(null);
  };

  if (confirmedBooking) {
    return (
      <div className="max-w-lg mx-auto animate-fade-in">
        <div className="card p-8 text-center print-ticket">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-9 h-9 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Booking Confirmed!</h2>
          <p className="text-gray-500 text-sm mb-6">Your digital ticket is ready</p>

          <div className="bg-primary-50 rounded-xl p-5 text-left space-y-3 mb-6">
            <div className="flex items-center justify-between border-b border-primary-100 pb-3">
              <span className="text-sm font-bold text-primary-900">SMARTBUS+</span>
              <span className="badge badge-success">CONFIRMED</span>
            </div>
            {[
              ['Booking ID', confirmedBooking.bookingId],
              ['Passenger', confirmedBooking.passengerName],
              ['Passenger ID', confirmedBooking.passengerId],
              ['Bus', confirmedBooking.busNumber],
              ['From', confirmedBooking.source],
              ['To', confirmedBooking.destination],
              ['Travel Date', new Date(confirmedBooking.travelDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })],
              ['Departure', confirmedBooking.departureTime],
              ['Fare Paid', `₹${confirmedBooking.fare}`],
              ['RFID', confirmedBooking.rfidLinked ? `Linked (${confirmedBooking.rfidUid})` : 'Not linked'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-semibold text-gray-900 text-right max-w-[60%]">{value}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => window.print()} className="btn-secondary flex-1">Download Ticket</button>
            <button onClick={() => setConfirmedBooking(null)} className="btn-primary flex-1">Book Another</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Book a Bus</h1>
        <p className="page-subtitle">Search for available buses and book your seat</p>
      </div>

      {/* Search Form */}
      <div className="card p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="input-label flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary-600" />
              From
            </label>
            <select value={source} onChange={e => setSource(e.target.value)} className="input">
              <option value="">Select source</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              To
            </label>
            <select value={destination} onChange={e => setDestination(e.target.value)} className="input">
              <option value="">Select destination</option>
              {CITIES.filter(c => c !== source).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-500" />
              Travel Date
            </label>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setDate(e.target.value)}
              className="input"
            />
          </div>
          <div className="flex items-end">
            <button onClick={handleSearch} className="btn-primary w-full justify-center">
              <Search className="w-4 h-4" />
              Search Buses
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-800 border-t-transparent" />
        </div>
      )}

      {searched && !loading && buses.length === 0 && (
        <div className="card p-12 text-center">
          <Bus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-700">No buses found</h3>
          <p className="text-gray-400 text-sm mt-1">No buses available for {source} → {destination} on {date}</p>
        </div>
      )}

      {buses.map(bus => (
        <div key={bus.id} className="card-hover p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                  <Bus className="w-5 h-5 text-primary-700" />
                </div>
                <div>
                  <div className="font-bold text-gray-900">{bus.busNumber}</div>
                  <div className="text-xs text-gray-500">{bus.busName}</div>
                </div>
                <span className={`badge ml-auto sm:ml-2 ${
                  bus.status === 'active' ? 'badge-success' :
                  bus.status === 'full' ? 'badge-error' : 'badge-warning'
                }`}>
                  {bus.status.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-700 mb-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="font-semibold">{source || bus.source}</span>
                </div>
                <div className="flex-1 border-t border-dashed border-gray-300" />
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="font-semibold">{destination || bus.destination}</span>
                </div>
              </div>

              {getDynamicDistance(bus) !== null && (
                <div className="text-xs text-gray-500 mb-3">
                  Distance: <span className="font-semibold text-gray-700">{getDynamicDistance(bus)} km</span>
                  {' • '}
                  Rate: <span className="font-semibold text-gray-700">₹{(bus.busName.toLowerCase().includes('ac') ? 4.00 : bus.busName.toLowerCase().includes('express') || bus.busName.toLowerCase().includes('superfast') ? 2.75 : 2.00).toFixed(2)}/km</span>
                </div>
              )}

              {bus.route && <div className="text-xs text-gray-400 mb-3">{bus.route}</div>}

              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Clock className="w-4 h-4 text-gray-400" />
                  {bus.departureTime} → {bus.arrivalTime}
                </div>
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Users className="w-4 h-4 text-gray-400" />
                  {bus.availableSeats} seats available
                </div>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end gap-4 sm:gap-3 sm:min-w-[130px]">
              <div className="text-3xl font-black text-primary-900">₹{getDynamicFare(bus)}</div>
              <button
                onClick={() => handleBook(bus)}
                disabled={bus.status === 'full' || bus.availableSeats === 0 || booking?.busId === bus.id}
                className="btn-primary sm:w-full justify-center"
              >
                {booking?.busId === bus.id ? (
                  <><span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Booking...</>
                ) : bus.status === 'full' ? 'Bus Full' : (
                  <>Book Ticket <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
              {rfidUid && (
                <div className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  RFID will be linked
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
