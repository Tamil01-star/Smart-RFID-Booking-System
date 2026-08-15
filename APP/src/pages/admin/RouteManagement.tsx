import React from 'react';
import { MapPin, Clock, ArrowRight } from 'lucide-react';
import { DEMO_ROUTES } from '../../data/mockData';

export default function RouteManagement() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Route Management</h1>
        <p className="page-subtitle">{DEMO_ROUTES.length} routes configured</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {DEMO_ROUTES.map(route => (
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

      <div className="card p-5 bg-blue-50 border-blue-100">
        <p className="text-sm text-blue-700">
          <strong>Note:</strong> Route management with full CRUD will be available after Firebase integration.
          Routes shown above are the pre-configured demo routes for Tamil Nadu.
        </p>
      </div>
    </div>
  );
}
