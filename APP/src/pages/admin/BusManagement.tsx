import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Bus, X, Save, MapPin } from 'lucide-react';
import { busService } from '../../services';
import { Bus as BusType, BusStatus, StopFare } from '../../types';
import { CITIES } from '../../data/mockData';
import toast from 'react-hot-toast';

const emptyBus: Omit<BusType, 'id'> = {
  busNumber: '', busName: '', source: '', destination: '',
  departureTime: '', arrivalTime: '', fare: 0, totalSeats: 40,
  availableSeats: 40, status: 'active', route: '', stopsWithFares: []
};

export default function BusManagement() {
  const [buses, setBuses] = useState<BusType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editBus, setEditBus] = useState<BusType | null>(null);
  const [form, setForm] = useState<Omit<BusType, 'id'>>(emptyBus);

  // Stop Form State
  const [currentStopName, setCurrentStopName] = useState('');
  const [currentStopFare, setCurrentStopFare] = useState(0);

  const load = async () => {
    const data = await busService.getBuses();
    setBuses(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const setF = (field: keyof typeof emptyBus) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: field === 'fare' || field === 'totalSeats' || field === 'availableSeats' ? Number(e.target.value) : e.target.value }));

  const handleAdd = () => { setEditBus(null); setForm(emptyBus); setShowForm(true); setCurrentStopName(''); setCurrentStopFare(0); };
  
  const handleEdit = (bus: BusType) => { 
    setEditBus(bus); 
    setForm({ 
      busNumber: bus.busNumber, 
      busName: bus.busName, 
      source: bus.source, 
      destination: bus.destination, 
      departureTime: bus.departureTime, 
      arrivalTime: bus.arrivalTime, 
      fare: bus.fare, 
      totalSeats: bus.totalSeats, 
      availableSeats: bus.availableSeats, 
      status: bus.status, 
      route: bus.route || '',
      stopsWithFares: bus.stopsWithFares || []
    }); 
    setShowForm(true); 
    setCurrentStopName('');
    setCurrentStopFare(0);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this bus?')) return;
    await busService.deleteBus(id);
    toast.success('Bus deleted');
    load();
  };

  const handleAddStop = () => {
    if (!currentStopName) {
      toast.error('Please select a stop name');
      return;
    }
    if (form.stopsWithFares?.some(s => s.stopName === currentStopName)) {
      toast.error('This stop is already added');
      return;
    }

    const newStop: StopFare = {
      stopName: currentStopName,
      fare: Number(currentStopFare)
    };

    setForm(prev => ({
      ...prev,
      stopsWithFares: [...(prev.stopsWithFares || []), newStop]
    }));

    setCurrentStopName('');
    setCurrentStopFare(0);
  };

  const handleRemoveStop = (stopName: string) => {
    setForm(prev => ({
      ...prev,
      stopsWithFares: (prev.stopsWithFares || []).filter(s => s.stopName !== stopName)
    }));
  };

  const handleSave = async () => {
    if (!form.busNumber || !form.source || !form.destination || !form.fare) {
      toast.error('Please fill all required fields');
      return;
    }
    if (editBus) {
      await busService.updateBus(editBus.id, form);
      toast.success('Bus updated successfully');
    } else {
      await busService.addBus(form);
      toast.success('Bus added successfully');
    }
    setShowForm(false);
    load();
  };

  const statusColor = (s: BusStatus) => ({
    active: 'badge-success', inactive: 'badge-gray', full: 'badge-error', scheduled: 'badge-warning'
  }[s] || 'badge-gray');

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-800 border-t-transparent" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Bus Management</h1>
          <p className="page-subtitle">{buses.length} buses configured</p>
        </div>
        <button onClick={handleAdd} className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Bus
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="card p-6 border-2 border-primary-200 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-gray-900 text-lg">{editBus ? 'Edit Bus Config' : 'Add New Bus'}</h2>
            <button onClick={() => setShowForm(false)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'Bus Number *', field: 'busNumber', placeholder: 'BUS-101', type: 'text' },
              { label: 'Bus Name *', field: 'busName', placeholder: 'Salem Express', type: 'text' },
              { label: 'Departure Time *', field: 'departureTime', placeholder: '06:00', type: 'time' },
              { label: 'Arrival Time *', field: 'arrivalTime', placeholder: '10:30', type: 'time' },
              { label: 'Base Fare (₹) *', field: 'fare', placeholder: '120', type: 'number' },
              { label: 'Total Seats', field: 'totalSeats', placeholder: '40', type: 'number' },
              { label: 'Available Seats', field: 'availableSeats', placeholder: '40', type: 'number' },
              { label: 'Route Label', field: 'route', placeholder: 'Salem → Hosur → Chennai', type: 'text' },
            ].map(({ label, field, placeholder, type }) => (
              <div key={field}>
                <label className="input-label">{label}</label>
                <input type={type} value={String((form as any)[field])} onChange={setF(field as keyof typeof emptyBus)} className="input" placeholder={placeholder} />
              </div>
            ))}
            <div>
              <label className="input-label">Source *</label>
              <select value={form.source} onChange={setF('source')} className="input bg-white">
                <option value="">Select Source</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Destination *</label>
              <select value={form.destination} onChange={setF('destination')} className="input bg-white">
                <option value="">Select Destination</option>
                {CITIES.filter(c => c !== form.source).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Status</label>
              <select value={form.status} onChange={setF('status')} className="input bg-white">
                {(['active', 'inactive', 'full', 'scheduled'] as BusStatus[]).map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Stops with Fares section */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-primary-700" />
              Configure Route Stops & Fares
            </h3>
            
            <div className="bg-gray-50 rounded-xl p-4 space-y-4">
              {/* Add Stop inputs */}
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="input-label">Select Stop City</label>
                  <select 
                    value={currentStopName} 
                    onChange={e => setCurrentStopName(e.target.value)} 
                    className="input bg-white"
                  >
                    <option value="">Choose Stop</option>
                    {CITIES.filter(c => c !== form.source && c !== form.destination).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="w-32">
                  <label className="input-label">Fare amount (₹)</label>
                  <input 
                    type="number" 
                    value={currentStopFare} 
                    onChange={e => setCurrentStopFare(Number(e.target.value))} 
                    className="input" 
                    placeholder="50" 
                  />
                </div>
                <button 
                  type="button" 
                  onClick={handleAddStop} 
                  className="btn-secondary py-2.5 h-[42px]"
                >
                  Add Stop
                </button>
              </div>

              {/* Stops list display */}
              <div className="space-y-2">
                {form.stopsWithFares && form.stopsWithFares.length > 0 ? (
                  form.stopsWithFares.map((sf, index) => (
                    <div key={sf.stopName} className="flex items-center justify-between bg-white px-4 py-2 rounded-lg border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-primary-100 text-primary-700 font-bold w-5 h-5 rounded-full flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="font-semibold text-sm text-gray-900">{sf.stopName}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-bold text-gray-700">₹{sf.fare}</span>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveStop(sf.stopName)} 
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 italic">No intermediate stops configured yet. Only source & destination fares apply.</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} className="btn-primary">
              <Save className="w-4 h-4" />
              {editBus ? 'Update Bus Config' : 'Save Bus'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Bus Table */}
      <div className="card overflow-hidden">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Bus Number</th>
                <th>Name</th>
                <th>Source & Dest</th>
                <th>Intermediate Stops (Fares)</th>
                <th>Timing</th>
                <th>Base Fare</th>
                <th>Seats</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {buses.map(bus => (
                <tr key={bus.id}>
                  <td className="font-bold text-primary-800 font-mono">{bus.busNumber}</td>
                  <td>{bus.busName}</td>
                  <td className="text-sm font-medium">{bus.source} → {bus.destination}</td>
                  <td className="text-xs">
                    {bus.stopsWithFares && bus.stopsWithFares.length > 0 ? (
                      <div className="flex flex-col gap-1 max-w-[200px]">
                        {bus.stopsWithFares.map(sf => (
                          <div key={sf.stopName} className="flex items-center justify-between bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                            <span>{sf.stopName}</span>
                            <span className="font-bold text-gray-700">₹{sf.fare}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Direct route</span>
                    )}
                  </td>
                  <td className="text-sm whitespace-nowrap">{bus.departureTime} – {bus.arrivalTime}</td>
                  <td className="font-bold">₹{bus.fare}</td>
                  <td className="text-sm">{bus.availableSeats}/{bus.totalSeats}</td>
                  <td><span className={`badge ${statusColor(bus.status)}`}>{bus.status.toUpperCase()}</span></td>
                  <td>
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(bus)} className="btn-secondary btn-sm p-2">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(bus.id)} className="btn-danger btn-sm p-2">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {buses.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-gray-500">No buses configured yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
