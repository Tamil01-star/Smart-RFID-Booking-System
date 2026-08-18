import React, { useState, useEffect } from 'react';
import { User, CreditCard, Plus, X, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import RFIDInput from '../../components/RFIDInput';
import type { PassengerCategory } from '../../types';
import { API_URL } from '../../config';

export default function PassengerManagement() {
  const { adminCreatePassenger, deleteAccount } = useAuth();
  const [passengers, setPassengers] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState<PassengerCategory>('general');
  const [rfidUid, setRfidUid] = useState('');

  const loadPassengers = async () => {
    try {
      const res = await fetch(`${API_URL}/users`);
      if (res.ok) {
        const users = await res.json();
        setPassengers(users.filter((u: any) => u.role === 'passenger'));
      }
    } catch (err) {
      console.error('Failed to load passengers:', err);
    }
  };

  useEffect(() => {
    loadPassengers();
  }, []);

  const handleDeletePassenger = async (passenger: any) => {
    if (!confirm(`Are you sure you want to permanently delete passenger ${passenger.name} (${passenger.passengerId})?\nThis will also delete their RFID card, wallet, booking history, and transaction logs.`)) {
      return;
    }
    setLoading(true);
    const result = await deleteAccount(passenger.id);
    setLoading(false);
    if (result.success) {
      toast.success('Passenger deleted successfully');
      loadPassengers();
    } else {
      toast.error(result.error || 'Failed to delete passenger');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUid = rfidUid.replace(/\s/g, '');
    if (!cleanUid) {
      toast.error('RFID Card Number is mandatory');
      return;
    }
    if (cleanUid.length !== 8) {
      toast.error('RFID must be exactly 8 characters (4 bytes)');
      return;
    }

    setLoading(true);
    const result = await adminCreatePassenger({ name, email, phone, category, rfidUid });
    setLoading(false);

    if (result.success) {
      toast.success('Passenger created and RFID linked successfully!');
      setShowCreateModal(false);
      // Reset form
      setName(''); setEmail(''); setPhone(''); setRfidUid(''); setCategory('general');
      loadPassengers();
    } else {
      toast.error(result.error || 'Failed to create passenger');
    }
  };

  const getCategoryBadge = (cat?: string) => {
    switch (cat) {
      case 'student': return <span className="badge bg-blue-100 text-blue-800">Student</span>;
      case 'senior_citizen': return <span className="badge bg-purple-100 text-purple-800">Senior Citizen</span>;
      case 'disabled_person': return <span className="badge bg-orange-100 text-orange-800">Disabled Person</span>;
      case 'ex_serviceman': return <span className="badge bg-green-100 text-green-800">Ex-Serviceman</span>;
      default: return <span className="badge bg-gray-100 text-gray-800">General</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="page-header flex justify-between items-end">
        <div>
          <h1 className="page-title">Passenger Management</h1>
          <p className="page-subtitle">{passengers.length} registered passengers</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" /> Create Passenger
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Passenger ID</th>
                <th>Name & Category</th>
                <th>Email / Phone</th>
                <th>RFID</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {passengers.map(p => (
                <tr key={p.id}>
                  <td className="font-mono font-bold text-primary-700">{p.passengerId}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-xs font-bold">
                        {p.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{p.name}</div>
                        <div className="mt-1">{getCategoryBadge(p.category)}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">{p.email}</div>
                    <div className="text-xs text-gray-500 font-mono mt-0.5">{p.phone}</div>
                  </td>
                  <td>
                    {p.rfidUid ? (
                      <span className="badge badge-success font-mono">{p.rfidUid}</span>
                    ) : (
                      <span className="badge badge-gray">Not Linked</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${p.status === 'active' ? 'badge-success' : 'badge-error'}`}>
                      {p.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => handleDeletePassenger(p)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-900 transition-colors p-1"
                      title="Delete Passenger"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {passengers.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">No passengers found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl animate-scale-in">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Create RFID Passenger</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Full Name</label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)} className="input" placeholder="e.g. John Doe" />
                </div>
                <div>
                  <label className="input-label">Passenger Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value as PassengerCategory)} className="input cursor-pointer bg-white">
                    <option value="general">General</option>
                    <option value="student">Student</option>
                    <option value="senior_citizen">Senior Citizen</option>
                    <option value="disabled_person">Disabled Person</option>
                    <option value="ex_serviceman">Ex-Serviceman</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Email Address</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="user@example.com" />
                </div>
                <div>
                  <label className="input-label">Phone Number</label>
                  <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} className="input font-mono" placeholder="9876543210" />
                </div>
              </div>

              <div>
                <label className="input-label">RFID Card Number</label>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex justify-center">
                  <RFIDInput value={rfidUid} onChange={setRfidUid} />
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">Enter the 4-byte RFID UID. E.g., CO 53 F7 54</p>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary flex-1 py-2.5">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 py-2.5 justify-center">
                  {loading ? 'Creating...' : 'Create & Link RFID'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
