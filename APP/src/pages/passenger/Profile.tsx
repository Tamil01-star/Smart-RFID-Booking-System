import React, { useState } from 'react';
import { User, Phone, Mail, Shield, Edit2, Save, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, updateUser, deleteAccount } = useAuth();
  const [editing, setEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');

  const handleSave = () => {
    if (!name.trim()) { toast.error('Name cannot be empty'); return; }
    updateUser({ name, phone });
    setEditing(false);
    toast.success('Profile updated successfully');
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    setIsDeleting(true);
    const result = await deleteAccount(user.id);
    if (!result.success) {
      toast.error(result.error || 'Failed to delete account');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl relative">
      <div className="page-header">
        <h1 className="page-title">Profile</h1>
        <p className="page-subtitle">Manage your account information</p>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary-800 rounded-2xl flex items-center justify-center text-white text-2xl font-black">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{user?.name}</h2>
              <p className="text-sm text-primary-700 font-mono font-semibold">{user?.passengerId}</p>
              <span className="badge badge-success mt-1">Active</span>
            </div>
          </div>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="btn-secondary btn-sm">
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => { setEditing(false); setName(user?.name || ''); setPhone(user?.phone || ''); }} className="btn-ghost btn-sm">
                <X className="w-4 h-4" />
              </button>
              <button onClick={handleSave} className="btn-success btn-sm">
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="input-label flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-gray-400" />
              Full Name
            </label>
            {editing ? (
              <input value={name} onChange={e => setName(e.target.value)} className="input" />
            ) : (
              <div className="input bg-gray-50 text-gray-700">{user?.name}</div>
            )}
          </div>

          <div>
            <label className="input-label flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-gray-400" />
              Email Address
            </label>
            <div className="input bg-gray-50 text-gray-500 cursor-not-allowed">{user?.email}</div>
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed in demo mode</p>
          </div>

          <div>
            <label className="input-label flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-gray-400" />
              Phone Number
            </label>
            {editing ? (
              <input value={phone} onChange={e => setPhone(e.target.value)} className="input" maxLength={10} />
            ) : (
              <div className="input bg-gray-50 text-gray-700">{user?.phone || 'Not set'}</div>
            )}
          </div>

          <div>
            <label className="input-label flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-gray-400" />
              Role
            </label>
            <div className="input bg-gray-50 text-gray-700 capitalize">{user?.role}</div>
          </div>
        </div>
      </div>

      <div className="card p-5 bg-gray-50">
        <h3 className="font-semibold text-gray-700 mb-3">Account Details</h3>
        <div className="space-y-2 text-sm">
          {[
            ['Passenger ID', user?.passengerId, 'font-mono text-primary-700 font-semibold'],
            ['Account Status', 'Active', 'text-green-600 font-semibold'],
            ['Member Since', user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A', ''],
            ['RFID Linked', user?.rfidUid ? `Yes (${user.rfidUid})` : 'No', user?.rfidUid ? 'text-green-600 font-mono' : 'text-amber-600'],
          ].map(([label, value, valueClass]) => (
            <div key={label as string} className="flex justify-between">
              <span className="text-gray-500">{label}</span>
              <span className={`font-medium ${valueClass}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card p-5 bg-red-50/50 border border-red-100">
        <h3 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Danger Zone
        </h3>
        <p className="text-sm text-red-600/80 mb-4">
          Permanently delete your account and all associated data including wallet balance and RFID links. This action cannot be undone.
        </p>
        <button onClick={() => setShowDeleteConfirm(true)} className="px-4 py-2 bg-white text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300 font-medium rounded-lg text-sm transition-colors shadow-sm">
          Delete Account
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-scale-in">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Account?</h3>
            <p className="text-gray-500 text-sm mb-6">
              Are you sure you want to permanently delete your account? You will lose all your wallet balance and booking history.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteConfirm(false)} 
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteAccount} 
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
              >
                {isDeleting ? <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
