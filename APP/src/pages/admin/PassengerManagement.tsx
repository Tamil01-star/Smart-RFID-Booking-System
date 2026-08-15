import React from 'react';
import { User, CreditCard, Wallet } from 'lucide-react';
import { DEMO_USERS } from '../../data/mockData';

export default function PassengerManagement() {
  const passengers = DEMO_USERS.filter(u => u.role === 'passenger');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Passenger Management</h1>
        <p className="page-subtitle">{passengers.length} registered passengers</p>
      </div>

      <div className="card overflow-hidden">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Passenger ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>RFID</th>
                <th>Status</th>
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
                      <span className="font-medium text-gray-900">{p.name}</span>
                    </div>
                  </td>
                  <td className="text-sm text-gray-600">{p.email}</td>
                  <td className="text-sm text-gray-600 font-mono">{p.phone}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
