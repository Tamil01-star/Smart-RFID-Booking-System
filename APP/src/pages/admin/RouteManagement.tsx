import React, { useState, useEffect } from 'react';
import { MapPin, Clock, ArrowRight, AlertCircle, Plus } from 'lucide-react';

interface Route {
  id: string;
  routeName: string;
  stops: string[];
  distanceKm: number;
  estimatedTime: string;
}

export default function RouteManagement() {
  const [routes, setRoutes] = useState<Route[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('smartbus_routes');
      if (stored) {
        setRoutes(JSON.parse(stored));
      } else {
        // Initial setup with basic routes
        const initialRoutes: Route[] = [
          { id: 'R-01', routeName: 'Salem Express', stops: ['Salem', 'Erode', 'Coimbatore'], distanceKm: 160, estimatedTime: '3h 30m' },
          { id: 'R-02', routeName: 'Chennai Corridor', stops: ['Salem', 'Villupuram', 'Chennai'], distanceKm: 340, estimatedTime: '6h 00m' },
        ];
        localStorage.setItem('smartbus_routes', JSON.stringify(initialRoutes));
        setRoutes(initialRoutes);
      }
    } catch {}
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header flex justify-between items-end">
        <div>
          <h1 className="page-title">Route Management</h1>
          <p className="page-subtitle">{routes.length} active routes configured</p>
        </div>
      </div>

      {routes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {routes.map(route => (
            <div key={route.id} className="card-hover p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary-700" />
                </div>
                <div>
                  <div className="font-bold text-gray-900">{route.routeName}</div>
                  <div className="text-xs text-gray-500 font-mono">{route.id}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3 text-sm">
                {route.stops.map((stop, i) => (
                  <React.Fragment key={stop}>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${i === 0 ? 'bg-green-100 text-green-700' : i === route.stops.length - 1 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{stop}</span>
                    {i < route.stops.length - 1 && <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                  </React.Fragment>
                ))}
              </div>

              <div className="flex gap-4 text-xs text-gray-500">
                <span>📍 {route.distanceKm} km</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{route.estimatedTime}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-8 text-center text-sm text-gray-500 flex flex-col items-center justify-center gap-2">
          <AlertCircle className="w-8 h-8 text-gray-400" />
          No routes configured yet.
        </div>
      )}
    </div>
  );
}
