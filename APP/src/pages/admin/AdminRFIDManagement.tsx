import React, { useEffect, useState } from 'react';
import { rfidService } from '../../services';
import { RFIDCard } from '../../types';

export default function AdminRFIDManagement() {
  const [cards, setCards] = useState<RFIDCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { rfidService.getRFIDCards().then(c => { setCards(c); setLoading(false); }); }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-800 border-t-transparent" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">RFID Card Management</h1>
        <p className="page-subtitle">{cards.filter(c => c.status === 'active').length} active RFID cards</p>
      </div>
      <div className="card overflow-hidden">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>RFID UID</th>
                <th>Passenger</th>
                <th>Passenger ID</th>
                <th>Status</th>
                <th>Linked On</th>
                <th>Last Used</th>
              </tr>
            </thead>
            <tbody>
              {cards.map(card => (
                <tr key={card.uid}>
                  <td className="font-mono font-bold text-primary-700">{card.uid}</td>
                  <td>{card.passengerName || <span className="text-gray-400">—</span>}</td>
                  <td className="font-mono text-sm">{card.passengerId || <span className="text-gray-400">—</span>}</td>
                  <td><span className={`badge ${card.status === 'active' ? 'badge-success' : 'badge-gray'}`}>{card.status.toUpperCase()}</span></td>
                  <td className="text-sm text-gray-500">
                    {card.linkedAt ? new Date(card.linkedAt).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td className="text-sm text-gray-500">
                    {card.lastUsedAt ? new Date(card.lastUsedAt).toLocaleDateString('en-IN') : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card p-4 bg-blue-50 border-blue-100 text-sm text-blue-700">
        <strong>Standard:</strong> 13.56 MHz MFRC522-compatible RFID cards. UID is the unique card identifier stored in Firebase.
        Wallet balance is NOT stored on the card — it's stored securely in the cloud database.
      </div>
    </div>
  );
}
