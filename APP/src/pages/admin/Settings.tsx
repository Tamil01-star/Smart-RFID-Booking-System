import React, { useState } from 'react';
import { Settings2, Cpu, Wifi, Database, Zap, Save } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import toast from 'react-hot-toast';

export default function Settings() {
  const { settings, updateSettings, toggleSystemMode } = useApp();
  const [demoUID, setDemoUID] = useState(settings.demoRFIDUid);

  const handleSaveUID = () => {
    if (!/^[A-Fa-f0-9]{6,12}$/.test(demoUID)) {
      toast.error('Invalid UID format. Use hex characters (e.g. A1B2C3D4)');
      return;
    }
    updateSettings({ demoRFIDUid: demoUID.toUpperCase() });
    toast.success('Demo RFID UID updated');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="page-header">
        <h1 className="page-title">System Settings</h1>
        <p className="page-subtitle">Configure system mode and integration settings</p>
      </div>

      {/* System Mode */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-primary-700" />
          System Mode
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => { if (settings.systemMode !== 'demo') { toggleSystemMode(); toast.success('Switched to Demo Mode'); } }}
            className={`p-4 rounded-xl border-2 text-left transition-all ${settings.systemMode === 'demo' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${settings.systemMode === 'demo' ? 'border-primary-600' : 'border-gray-400'}`}>
                {settings.systemMode === 'demo' && <span className="w-2 h-2 rounded-full bg-primary-600" />}
              </span>
              <span className="font-semibold text-gray-900">Demo Mode</span>
              <span className="badge badge-warning ml-auto">DEFAULT</span>
            </div>
            <p className="text-xs text-gray-500">Works without any hardware. All data is stored locally. RFID and ESP32 are simulated.</p>
          </button>

          <button
            onClick={() => { if (settings.systemMode !== 'hardware') { toggleSystemMode(); toast.success('Switched to Hardware Mode (requires ESP32 + Firebase)'); } }}
            className={`p-4 rounded-xl border-2 text-left transition-all ${settings.systemMode === 'hardware' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${settings.systemMode === 'hardware' ? 'border-green-600' : 'border-gray-400'}`}>
                {settings.systemMode === 'hardware' && <span className="w-2 h-2 rounded-full bg-green-600" />}
              </span>
              <span className="font-semibold text-gray-900">Hardware Mode</span>
            </div>
            <p className="text-xs text-gray-500">Connects to real ESP32 + Firebase. Requires hardware setup to be complete.</p>
          </button>
        </div>
      </div>

      {/* Demo RFID UID */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-primary-700" />
          Demo RFID UID
        </h2>
        <p className="text-sm text-gray-500 mb-4">This UID is used when passengers click "Simulate RFID Scan" in the passenger portal.</p>
        <div className="flex gap-3">
          <input
            type="text"
            value={demoUID}
            onChange={e => setDemoUID(e.target.value.toUpperCase())}
            className="input font-mono"
            placeholder="A1B2C3D4"
            maxLength={12}
          />
          <button onClick={handleSaveUID} className="btn-primary flex-shrink-0">
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>

      {/* Integration Status */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Wifi className="w-4 h-4 text-primary-700" />
          Integration Status
        </h2>
        <div className="space-y-3">
          {[
            { label: 'Firebase Authentication', status: 'Ready to Connect', note: 'Set VITE_FIREBASE_* env variables', icon: Database },
            { label: 'Cloud Firestore', status: 'Ready to Connect', note: 'Collections structured and ready', icon: Database },
            { label: 'Firebase Realtime Database', status: 'Ready to Connect', note: 'For real-time ESP32 events', icon: Zap },
            { label: 'ESP32 Hardware', status: 'Prototype', note: 'Connect ESP32 and point to Firebase', icon: Cpu },
          ].map(({ label, status, note, icon: Icon }) => (
            <div key={label} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-900">{label}</div>
                  <div className="text-xs text-gray-400">{note}</div>
                </div>
              </div>
              <span className="badge badge-warning text-xs">{status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
