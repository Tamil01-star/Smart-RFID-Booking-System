import React from 'react';
import { Cpu, Wifi, Hash, Monitor, Speaker, Zap } from 'lucide-react';
import { DEMO_ESP32_DEVICES } from '../../data/mockData';

function ComponentStatus({ label, status }: { label: string; status: string }) {
  const isOk = status === 'ready' || status === 'connected';
  const isDemo = status === 'demo';
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-600">{label}</span>
      <span className={`badge text-xs ${isOk ? 'badge-success' : isDemo ? 'badge-warning' : 'badge-gray'}`}>
        {status.toUpperCase()}
      </span>
    </div>
  );
}

export default function ESP32Devices() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">ESP32 Devices</h1>
        <p className="page-subtitle">Hardware integration status dashboard</p>
      </div>

      <div className="demo-banner">
        <Zap className="w-4 h-4 flex-shrink-0" />
        <span><strong>Demo Mode:</strong> Showing simulated device status. Real status will be received from Firebase when ESP32 is connected and sends heartbeat data.</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {DEMO_ESP32_DEVICES.map(device => (
          <div key={device.deviceId} className="card p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  device.status === 'online' ? 'bg-green-50' : device.status === 'demo' ? 'bg-amber-50' : 'bg-gray-50'
                }`}>
                  <Cpu className={`w-6 h-6 ${device.status === 'online' ? 'text-green-600' : device.status === 'demo' ? 'text-amber-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <div className="font-bold text-gray-900">{device.deviceName}</div>
                  <div className="text-xs font-mono text-gray-500">{device.deviceId}</div>
                  {device.busId && <div className="text-xs text-primary-600">Bus: {device.busId}</div>}
                </div>
              </div>
              <span className={`badge ${device.status === 'online' ? 'badge-success' : device.status === 'demo' ? 'badge-warning' : 'badge-error'}`}>
                {device.status === 'demo' ? 'DEMO' : device.status.toUpperCase()}
              </span>
            </div>

            {device.ipAddress && (
              <div className="text-xs text-gray-400 font-mono mb-3">IP: {device.ipAddress}</div>
            )}

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Component Status</div>
              <ComponentStatus label="RFID Reader (MFRC522)" status={device.rfidStatus} />
              <ComponentStatus label="4×4 Matrix Keypad" status={device.keypadStatus} />
              <ComponentStatus label="16×2 LCD Display" status={device.lcdStatus} />
              <ComponentStatus label="Buzzer" status={device.buzzerStatus} />
              <ComponentStatus label="LED (Green/Red)" status={device.ledStatus} />
              <ComponentStatus label="Wi-Fi" status={device.wifiStatus} />
            </div>

            <div className="text-xs text-gray-400 mt-3">
              Last seen: {new Date(device.lastSeen).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-primary-700" />
          Future Hardware Integration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <div className="font-semibold text-gray-800 mb-2">Data Flow (Planned)</div>
            <div className="space-y-1 text-xs font-mono bg-gray-50 rounded-lg p-3">
              <div>MFRC522 → ESP32</div>
              <div>↓</div>
              <div>ESP32 → Firebase (via Wi-Fi)</div>
              <div>↓</div>
              <div>Firebase → SMARTBUS+ Website</div>
              <div>↓</div>
              <div>Result → ESP32 → LCD + LED + Buzzer</div>
            </div>
          </div>
          <div>
            <div className="font-semibold text-gray-800 mb-2">ESP32 Service Functions (Ready)</div>
            <div className="space-y-1 text-xs font-mono bg-gray-50 rounded-lg p-3">
              <div>connectESP32()</div>
              <div>getDeviceStatus()</div>
              <div>getRFIDEvent()</div>
              <div>getKeypadEvent()</div>
              <div>sendDisplayMessage()</div>
              <div>sendBuzzerCommand()</div>
              <div>sendLEDCommand()</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
