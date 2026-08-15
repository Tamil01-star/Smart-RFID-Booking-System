import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Bus, X, Save } from 'lucide-react';
import { busService } from '../../services';
import { Bus as BusType, BusStatus } from '../../types';
import { CITIES } from '../../data/mockData';
import toast from 'react-hot-toast';

const emptyBus: Omit<BusType, 'id'> = {
  busNumber: '', busName: '', source: '', destination: '',
  departureTime: '', arrivalTime: '', fare: 0, totalSeats: 40,
  availableSeats: 40, status: 'active', route: '',
};

export default function BusManagement() {
  const [buses, setBuses] = useState<BusType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editBus, setEditBus] = useState<BusType | null>(null);
  const [form, setForm] = useState<Omit<BusType, 'id'>>(emptyBus);

  const load = async () => {
    const data = await busService.getBuses();
    setBuses(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const setF = (field: keyof typeof emptyBus) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: field === 'fare' || field === 'totalSeats' || field === 'availableSeats' ? Number(e.target.value) : e.target.value }));

  const handleAdd = () => { setEditBus(null); setForm(emptyBus); setShowForm(true); };
  const handleEdit = (bus: BusType) => { setEditBus(bus); setForm({ busNumber: bus.busNumber, busName: bus.busName, source: bus.source, destination: bus.destination, departureTime: bus.departureTime, arrivalTime: bus.arrivalTime, fare: bus.fare, totalSeats: bus.totalSeats, availableSeats: bus.availableSeats, status: bus.status, route: bus.route || '' }); setShowForm(true); };
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this bus?')) return;
    await busService.deleteBus(id);
    toast.success('Bus deleted');
    load();
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
        <div className="card p-6 border-2 border-primary-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">{editBus ? 'Edit Bus' : 'Add New Bus'}</h2>
            <button onClick={() => setShowForm(false)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'Bus Number *', field: 'busNumber', placeholder: 'BUS-101', type: 'text' },
              { label: 'Bus Name *', field: 'busName', placeholder: 'Salem Express', type: 'text' },
              { label: 'Departure Time *', field: 'departureTime', placeholder: '06:00', type: 'time' },
              { label: 'Arrival Time *', field: 'arrivalTime', placeholder: '10:30', type: 'time' },
              { label: 'Fare (₹) *', field: 'fare', placeholder: '120', type: 'number' },
              { label: 'Total Seats', field: 'totalSeats', placeholder: '40', type: 'number' },
              { label: 'Available Seats', field: 'availableSeats', placeholder: '40', type: 'number' },
              { label: 'Route', field: 'route', placeholder: 'Salem → Hosur → Chennai', type: 'text' },
            ].map(({ label, field, placeholder, type }) => (
              <div key={field}>
                <label className="input-label">{label}</label>
                <input type={type} value={String((form as any)[field])} onChange={setF(field as keyof typeof emptyBus)} className="input" placeholder={placeholder} />
              </div>
            ))}
            <div>
              <label className="input-label">Source *</label>
              <select value={form.source} onChange={setF('source')} className="input">
                <option value="">Select</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Destination *</label>
              <select value={form.destination} onChange={setF('destination')} className="input">
                <option value="">Select</option>
                {CITIES.filter(c => c !== form.source).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Status</label>
              <select value={form.status} onChange={setF('status')} className="input">
                {(['active', 'inactive', 'full', 'scheduled'] as BusStatus[]).map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} className="btn-primary">
              <Save className="w-4 h-4" />
              {editBus ? 'Update Bus' : 'Add Bus'}
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
                <th>Route</th>
                <th>Timing</th>
                <th>Fare</th>
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
                  <td className="text-sm">{bus.source} → {bus.destination}</td>
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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
