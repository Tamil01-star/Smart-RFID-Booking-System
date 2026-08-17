import React, { useEffect, useState } from 'react';
import { Cpu, Wifi, Hash, Monitor, Speaker, Zap } from 'lucide-react';
import { esp32Service } from '../../services';

function ComponentStatus({ label, status }: { label: string; status: string }) {
  const isOk = status === 'ready' || status === 'connected' || status === 'online';
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-600">{label}</span>
      <span className={`badge text-xs ${isOk ? 'badge-success' : 'badge-gray'}`}>
        {status.toUpperCase()}
      </span>
    </div>
  );
}

export default function ESP32Devices() {
  const [device, setDevice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    esp32Service.getDeviceStatus('ESP32-BUS-01').then(res => {
      setDevice({
        deviceId: res.deviceId,
        deviceName: 'ESP32 Smart Bus Reader',
        status: res.status,
        busId: 'BUS-101',
        ipAddress: '192.168.1.15',
        rfidStatus: 'online',
        keypadStatus: 'online',
        lcdStatus: 'online',
        buzzerStatus: 'online',
        ledStatus: 'online',
        wifiStatus: 'online',
        lastSeen: res.lastSeen,
      });
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-800 border-t-transparent" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">ESP32 Devices</h1>
        <p className="page-subtitle">Hardware integration status dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {device && (
          <div className="card p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-green-50">
                  <Cpu className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <div className="font-bold text-gray-900">{device.deviceName}</div>
                  <div className="text-xs font-mono text-gray-500">{device.deviceId}</div>
                  {device.busId && <div className="text-xs text-primary-600 font-semibold">Linked Bus: {device.busId}</div>}
                </div>
              </div>
              <span className="badge badge-success">
                {device.status.toUpperCase()}
              </span>
            </div>

            {device.ipAddress && (
              <div className="text-xs text-gray-400 font-mono mb-3">IP Address: {device.ipAddress}</div>
            )}

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Component Status</div>
              <ComponentStatus label="RFID Reader (MFRC522)" status={device.rfidStatus} />
              <ComponentStatus label="16×2 LCD Display" status={device.lcdStatus} />
              <ComponentStatus label="Buzzer & Led Indicators" status={device.buzzerStatus} />
              <ComponentStatus label="Wi-Fi Connection" status={device.wifiStatus} />
            </div>

            <div className="text-xs text-gray-400 mt-3">
              Last Heartbeat: {new Date(device.lastSeen).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        )}
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-primary-700" />
          IoT Hardware Integration Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <div className="font-semibold text-gray-800 mb-2">Realtime Data Flow</div>
            <div className="space-y-1 text-xs font-mono bg-gray-50 rounded-lg p-3">
              <div>MFRC522 Scanner → ESP32 Microcontroller</div>
              <div>↓</div>
              <div>ESP32 → REST API Endpoint / Vercel Serverless</div>
              <div>↓</div>
              <div>PostgreSQL (Neon DB) / Updates Database</div>
              <div>↓</div>
              <div>Frontend / Shows Scan Logs Realtime</div>
            </div>
          </div>
          <div>
            <div className="font-semibold text-gray-800 mb-2">ESP32 Device Settings</div>
            <div className="text-xs space-y-1 bg-gray-50 rounded-lg p-3">
              <p><strong>Device ID:</strong> <code>ESP32-BUS-01</code></p>
              <p><strong>Wi-Fi Status:</strong> Connected</p>
              <p><strong>Database Connection:</strong> PostgreSQL via HTTPS Post Requests</p>
              <p><strong>Firmware Status:</strong> Running (Active)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
