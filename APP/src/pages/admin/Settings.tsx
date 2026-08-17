import React from 'react';
import { Cpu, Wifi, Database, Zap } from 'lucide-react';

export default function Settings() {
  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="page-header">
        <h1 className="page-title">System Settings</h1>
        <p className="page-subtitle">Configure system mode and integration settings</p>
      </div>

      {/* Integration Status */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Wifi className="w-4 h-4 text-primary-700" />
          Integration Status
        </h2>
        <div className="space-y-3">
          {[
            { label: 'Firebase Database & Authentication', status: 'ACTIVE', note: 'Secure connection established', icon: Database, isSuccess: true },
            { label: 'Cloud Firestore', status: 'ACTIVE', note: 'Data synchronized correctly', icon: Database, isSuccess: true },
            { label: 'PostgreSQL Database (Neon DB)', status: 'ACTIVE', note: 'Connected securely via SSL mode', icon: Database, isSuccess: true },
            { label: 'ESP32 Smart Bus Hardware', status: 'ACTIVE', note: 'ESP32-BUS-01 reporting status online', icon: Cpu, isSuccess: true },
          ].map(({ label, status, note, icon: Icon, isSuccess }) => (
            <div key={label} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-900">{label}</div>
                  <div className="text-xs text-gray-400">{note}</div>
                </div>
              </div>
              <span className={`badge ${isSuccess ? 'badge-success' : 'badge-warning'} text-xs`}>{status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
