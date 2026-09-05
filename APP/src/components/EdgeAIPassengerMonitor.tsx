import React, { useEffect, useState } from 'react';
import { Cpu, Users, ArrowUpRight, ArrowDownRight, AlertTriangle, ShieldCheck, Activity, Zap, CheckCircle2, XCircle } from 'lucide-react';
import { edgeAIService } from '../services';
import { EdgeAIPassengerData } from '../types';

export default function EdgeAIPassengerMonitor() {
  const [data, setData] = useState<EdgeAIPassengerData>({
    totalEntries: 18,
    totalExits: 5,
    currentPassengers: 13,
    availableSeats: 27,
    eventType: 'ENTRY',
    confidence: 94.5,
    sensorSequence: 'IR1 -> IR2',
    movementDuration: 620,
    lastEventTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    abnormalCount: 1,
    unauthorizedEntryCount: 0,
    lastUnauthorizedEvent: 'None',
    authorizationStatus: 'AUTHORIZED',
    bookedPassengers: 13,
    actualPassengers: 13,
    occupancyMismatch: false,
    occupancyStatus: 'NORMAL',
    inferenceLocation: 'ESP32 Microcontroller (Local Hardware)',
    deviceStatus: 'ONLINE'
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchTelemetry = async () => {
    setIsRefreshing(true);
    const telemetry = await edgeAIService.getEdgeAITelemetry();
    setData(telemetry);
    setTimeout(() => setIsRefreshing(false), 300);
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 3000); // Auto refresh every 3s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="card p-6 bg-white shadow-sm border border-gray-100 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Cpu className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">EDGE AI PASSENGER MONITOR</h2>
              <p className="text-xs text-gray-500 font-mono">
                Real-Time Dual-IR Pattern Analysis & Anomaly Detection
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            <span>INFERENCE: ESP32 LOCAL HARDWARE</span>
          </div>
          <button
            onClick={fetchTelemetry}
            className={`p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
            title="Refresh Edge AI Telemetry"
          >
            <Activity className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Primary Passenger & AI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100">
          <div className="text-xs font-medium text-blue-600 mb-1 flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> CURRENT PASSENGERS
          </div>
          <div className="text-2xl font-black text-blue-900">{data.currentPassengers}</div>
          <div className="text-[11px] text-blue-700/80 mt-1 font-mono">
            Seats Left: {data.availableSeats} / 40
          </div>
        </div>

        <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-100">
          <div className="text-xs font-medium text-emerald-600 mb-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> TOTAL ENTRIES
          </div>
          <div className="text-2xl font-black text-emerald-900">{data.totalEntries}</div>
          <div className="text-[11px] text-emerald-700/80 mt-1 font-mono">
            Sequence: IR1 ➔ IR2
          </div>
        </div>

        <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-100">
          <div className="text-xs font-medium text-amber-600 mb-1 flex items-center gap-1">
            <ArrowDownRight className="w-3.5 h-3.5" /> TOTAL EXITS
          </div>
          <div className="text-2xl font-black text-amber-900">{data.totalExits}</div>
          <div className="text-[11px] text-amber-700/80 mt-1 font-mono">
            Sequence: IR2 ➔ IR1
          </div>
        </div>

        <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-100">
          <div className="text-xs font-medium text-purple-600 mb-1 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5" /> AI CONFIDENCE
          </div>
          <div className="text-2xl font-black text-purple-900">{data.confidence.toFixed(1)}%</div>
          <div className="text-[11px] text-purple-700/80 mt-1 font-mono">
            Last: {data.eventType}
          </div>
        </div>
      </div>

      {/* Edge AI Diagnostics & Security / Occupancy Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Security & Authentication Panel */}
        <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-primary-600" /> Security & Boarding Verification
            </div>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
              data.unauthorizedEntryCount === 0 
                ? 'bg-emerald-100 text-emerald-800' 
                : 'bg-rose-100 text-rose-800'
            }`}>
              {data.unauthorizedEntryCount === 0 ? 'SECURITY NORMAL' : 'ALERT DETECTED'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 bg-white rounded-lg border border-gray-100">
              <span className="text-gray-400 block text-[10px]">AUTHORIZED BOARDING</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> RFID VERIFIED
              </span>
            </div>

            <div className="p-2.5 bg-white rounded-lg border border-gray-100">
              <span className="text-gray-400 block text-[10px]">UNAUTHORIZED ENTRIES</span>
              <span className={`font-bold mt-0.5 flex items-center gap-1 ${
                data.unauthorizedEntryCount > 0 ? 'text-rose-600' : 'text-gray-700'
              }`}>
                {data.unauthorizedEntryCount > 0 && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
                {data.unauthorizedEntryCount} Incident(s)
              </span>
            </div>

            <div className="p-2.5 bg-white rounded-lg border border-gray-100">
              <span className="text-gray-400 block text-[10px]">ABNORMAL SENSOR EVENTS</span>
              <span className="font-bold text-amber-600 mt-0.5 block">
                {data.abnormalCount} Trigger(s)
              </span>
            </div>

            <div className="p-2.5 bg-white rounded-lg border border-gray-100">
              <span className="text-gray-400 block text-[10px]">LAST MOVEMENT TIME</span>
              <span className="font-bold text-gray-800 mt-0.5 block">
                {data.lastEventTime}
              </span>
            </div>
          </div>
        </div>

        {/* Seat Occupancy Validation Panel */}
        <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-600" /> Seat Occupancy Validation
            </div>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
              !data.occupancyMismatch 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-amber-100 text-amber-900'
            }`}>
              {data.occupancyStatus}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 bg-white rounded-lg border border-gray-100">
              <span className="text-gray-400 block text-[10px]">BOOKED PASSENGERS</span>
              <span className="font-bold text-indigo-900 text-sm mt-0.5 block">
                {data.bookedPassengers} Passenger(s)
              </span>
            </div>

            <div className="p-2.5 bg-white rounded-lg border border-gray-100">
              <span className="text-gray-400 block text-[10px]">ACTUAL PASSENGERS (AI)</span>
              <span className="font-bold text-blue-900 text-sm mt-0.5 block">
                {data.currentPassengers} Onboard
              </span>
            </div>

            <div className="col-span-2 p-2.5 bg-white rounded-lg border border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-gray-400 block text-[10px]">CLASSIFICATION SEQUENCE</span>
                <span className="font-bold text-gray-800 font-mono mt-0.5 block">
                  {data.sensorSequence}
                </span>
              </div>
              <div className="text-right">
                <span className="text-gray-400 block text-[10px]">DURATION</span>
                <span className="font-bold text-gray-800 font-mono mt-0.5 block">
                  {data.movementDuration} ms
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info Notice */}
      <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center gap-2 text-xs text-indigo-800">
        <Cpu className="w-4 h-4 text-indigo-600 flex-shrink-0" />
        <span>
          <strong>On-Device Microcontroller AI:</strong> Feature extraction, neural network matrix evaluation, sequence classification, and anomaly detection are executed locally on the ESP32 chip in real-time.
        </span>
      </div>
    </div>
  );
}
