import React, { useState, useEffect } from 'react';
import { 
  MapPin, Clock, ArrowRight, Bus, Navigation, 
  ChevronRight, Calendar, Info, CheckCircle2, DollarSign,
  Layers, ArrowDown, ChevronDown, ChevronUp
} from 'lucide-react';
import { busService } from '../../services';
import { Bus as BusType, StopFare } from '../../types';

// Helper: Format 24h string into 12h AM/PM
function formatTimeAMPM(time24: string): string {
  if (!time24) return '--:--';
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr || '0', 10);
  if (isNaN(h)) return time24;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
}

// Helper: Calculate arrival time at intermediate stops based on proportional distance
function calculateStopTime(
  departureTimeStr: string, 
  arrivalTimeStr: string, 
  stopDistance: number, 
  totalDistance: number
): { time12: string; time24: string } {
  if (!departureTimeStr) return { time12: '--:--', time24: '--:--' };
  if (stopDistance <= 0) {
    return { time12: formatTimeAMPM(departureTimeStr), time24: departureTimeStr };
  }
  if (stopDistance >= totalDistance && totalDistance > 0) {
    return { time12: formatTimeAMPM(arrivalTimeStr), time24: arrivalTimeStr };
  }

  const [depH, depM] = departureTimeStr.split(':').map(Number);
  const [arrH, arrM] = (arrivalTimeStr || '23:59').split(':').map(Number);

  let depTotalMins = (depH || 0) * 60 + (depM || 0);
  let arrTotalMins = (arrH || 0) * 60 + (arrM || 0);
  if (arrTotalMins < depTotalMins) {
    arrTotalMins += 24 * 60; // Next day arrival
  }

  const totalTripDuration = arrTotalMins - depTotalMins;
  const fraction = totalDistance > 0 ? (stopDistance / totalDistance) : 0;
  const stopMinutes = Math.round(depTotalMins + (totalTripDuration * fraction));

  const finalHour = Math.floor(stopMinutes / 60) % 24;
  const finalMin = stopMinutes % 60;
  const time24 = `${finalHour.toString().padStart(2, '0')}:${finalMin.toString().padStart(2, '0')}`;
  return { time12: formatTimeAMPM(time24), time24 };
}

// Calculate total duration in hours & minutes string
function calculateDuration(depTime: string, arrTime: string): string {
  if (!depTime || !arrTime) return 'Estimated';
  const [depH, depM] = depTime.split(':').map(Number);
  const [arrH, arrM] = arrTime.split(':').map(Number);
  let depTotal = (depH || 0) * 60 + (depM || 0);
  let arrTotal = (arrH || 0) * 60 + (arrM || 0);
  if (arrTotal < depTotal) arrTotal += 24 * 60;
  const diffMins = arrTotal - depTotal;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours}h ${mins > 0 ? `${mins}m` : '00m'}`;
}

export default function RouteManagement() {
  const [buses, setBuses] = useState<BusType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);

  useEffect(() => {
    busService.getBuses().then(bList => {
      setBuses(bList);
      if (bList.length > 0) {
        setSelectedBusId(bList[0].id);
      }
      setLoading(false);
    });
  }, []);

  const selectedBus = buses.find(b => b.id === selectedBusId) || buses[0];

  // Derive intermediate stops with estimated arrival times
  const getProcessedStops = (bus: BusType) => {
    if (!bus.stopsWithFares || bus.stopsWithFares.length === 0) {
      return [
        {
          order: 1,
          stopName: bus.source,
          distance: 0,
          fare: 0,
          time: formatTimeAMPM(bus.departureTime),
          isOrigin: true,
          isDestination: false
        },
        {
          order: 2,
          stopName: bus.destination,
          distance: 100,
          fare: bus.fare,
          time: formatTimeAMPM(bus.arrivalTime),
          isOrigin: false,
          isDestination: true
        }
      ];
    }

    const sortedStops = [...bus.stopsWithFares].sort((a, b) => (a.order || 0) - (b.order || 0));
    const totalDistance = sortedStops[sortedStops.length - 1]?.distance || 500;

    return sortedStops.map((stop, idx) => {
      const isOrigin = idx === 0;
      const isDestination = idx === sortedStops.length - 1;
      const stopDistance = stop.distance || 0;
      const { time12 } = calculateStopTime(bus.departureTime, bus.arrivalTime, stopDistance, totalDistance);

      return {
        order: stop.order || idx + 1,
        stopName: stop.stopName,
        distance: stopDistance,
        fare: stop.fare ?? 0,
        time: isOrigin ? formatTimeAMPM(bus.departureTime) : isDestination ? formatTimeAMPM(bus.arrivalTime) : time12,
        isOrigin,
        isDestination
      };
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-800 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <Navigation className="w-7 h-7 text-primary-700" />
          Route & Schedule Management
        </h1>
        <p className="page-subtitle">
          End-to-end bus journeys and intermediate stops with scheduled arrival times
        </p>
      </div>

      {/* Bus End-to-End Route Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
            Configured Bus Routes ({buses.length})
          </h2>
          <span className="text-xs text-gray-400">Click a route to view all intermediate stops with timings</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {buses.map(bus => {
            const isSelected = bus.id === selectedBusId;
            const stops = bus.stopsWithFares || [];
            const totalKm = stops[stops.length - 1]?.distance || '—';
            const duration = calculateDuration(bus.departureTime, bus.arrivalTime);

            return (
              <div 
                key={bus.id} 
                onClick={() => setSelectedBusId(bus.id)}
                className={`card p-5 cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-2 border-primary-700 bg-primary-50/20 shadow-md ring-2 ring-primary-500/10' 
                    : 'card-hover border border-gray-100 hover:border-gray-200'
                }`}
              >
                {/* Top Info */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? 'bg-primary-800 text-white' : 'bg-primary-50 text-primary-700'}`}>
                      <Bus className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-base">{bus.busNumber}</div>
                      <div className="text-xs text-gray-500">{bus.busName}</div>
                    </div>
                  </div>
                  <span className={`badge ${bus.status === 'active' ? 'badge-success' : 'badge-warning'} text-xs font-bold`}>
                    {bus.status.toUpperCase()}
                  </span>
                </div>

                {/* End-to-End Journey Badges */}
                <div className="bg-gray-50 rounded-xl p-3 mb-3 border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="bg-green-100 text-green-800 font-bold px-2.5 py-1 rounded-md text-xs">
                      {bus.source}
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                    <span className="bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-md text-xs">
                      {bus.destination}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-gray-700">
                    {stops.length > 0 ? `${stops.length} Total Stops` : 'Direct Route'}
                  </div>
                </div>

                {/* Distance & Time Specs */}
                <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 font-medium text-gray-700">
                    <MapPin className="w-3.5 h-3.5 text-primary-600" />
                    <span>{totalKm} km</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium text-gray-700">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>{formatTimeAMPM(bus.departureTime)} → {formatTimeAMPM(bus.arrivalTime)} ({duration})</span>
                  </div>
                  <div className="text-primary-800 font-black text-sm">
                    ₹{bus.fare}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DETAILED INTERMEDIATE ROUTE SCHEDULE SECTION */}
      {selectedBus && (
        <div className="card p-6 border-t-4 border-t-primary-800 shadow-sm animate-fade-in">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="badge badge-primary font-bold text-xs">{selectedBus.busNumber}</span>
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedBus.source} ➔ {selectedBus.destination}
                </h2>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Full stop sequence with proportional scheduled timings and stage fares
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <div className="bg-gray-100 px-3 py-1.5 rounded-lg text-gray-700 font-medium">
                ⏱ Departure: <span className="font-bold text-gray-900">{formatTimeAMPM(selectedBus.departureTime)}</span>
              </div>
              <div className="bg-gray-100 px-3 py-1.5 rounded-lg text-gray-700 font-medium">
                🏁 Destination: <span className="font-bold text-gray-900">{formatTimeAMPM(selectedBus.arrivalTime)}</span>
              </div>
              <div className="bg-primary-50 text-primary-900 px-3 py-1.5 rounded-lg font-bold border border-primary-200">
                ⏳ Duration: {calculateDuration(selectedBus.departureTime, selectedBus.arrivalTime)}
              </div>
            </div>
          </div>

          {/* Detailed Stops Timeline */}
          <div className="relative">
            {/* Connecting Vertical Line */}
            <div className="absolute left-[19px] sm:left-[23px] top-6 bottom-6 w-0.5 bg-gray-200 z-0" />

            <div className="space-y-4 relative z-10">
              {getProcessedStops(selectedBus).map((stop, index, arr) => {
                const isFirst = stop.isOrigin;
                const isLast = stop.isDestination;
                const prevDistance = index > 0 ? arr[index - 1].distance : 0;
                const legDistance = stop.distance - prevDistance;

                return (
                  <div 
                    key={stop.order} 
                    className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                      isFirst 
                        ? 'bg-green-50/70 border-green-200 shadow-sm'
                        : isLast
                        ? 'bg-blue-50/70 border-blue-200 shadow-sm'
                        : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50/50'
                    }`}
                  >
                    {/* Node Dot / Order Circle */}
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm ${
                      isFirst
                        ? 'bg-green-600 text-white ring-4 ring-green-100'
                        : isLast
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                        : 'bg-white text-gray-700 border-2 border-primary-600'
                    }`}>
                      {stop.order}
                    </div>

                    {/* Main Stop Information */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-gray-900">
                            {stop.stopName}
                          </span>
                          {isFirst && (
                            <span className="badge bg-green-100 text-green-800 text-[10px] font-bold">
                              ORIGIN / START
                            </span>
                          )}
                          {isLast && (
                            <span className="badge bg-blue-100 text-blue-800 text-[10px] font-bold">
                              FINAL DESTINATION
                            </span>
                          )}
                          {!isFirst && !isLast && (
                            <span className="badge badge-gray text-[10px]">
                              INTERMEDIATE STOP
                            </span>
                          )}
                        </div>

                        {/* Scheduled Timing */}
                        <div className="flex items-center gap-1 text-sm font-bold text-primary-900 bg-primary-50 px-2.5 py-1 rounded-md border border-primary-100 self-start sm:self-auto">
                          <Clock className="w-3.5 h-3.5 text-primary-700" />
                          <span>{stop.time}</span>
                        </div>
                      </div>

                      {/* Distance & Stage Fare */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mt-1.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          Cumulative: <strong className="text-gray-700 font-semibold">{stop.distance} km</strong>
                        </span>

                        {!isFirst && (
                          <span className="text-gray-400">
                            (+{legDistance} km from previous stop)
                          </span>
                        )}

                        <span className="flex items-center gap-1 ml-auto font-bold text-gray-900">
                          <DollarSign className="w-3.5 h-3.5 text-green-600" />
                          Fare from Origin: ₹{stop.fare}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
