import React, { useEffect, useState } from 'react';
import { transactionService } from '../../services';
import { WalletTransaction } from '../../types';

export default function TransactionMonitoring() {
  const [txns, setTxns] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed' | 'pending'>('all');

  useEffect(() => { transactionService.getTransactions().then(t => { setTxns(t); setLoading(false); }); }, []);

  const filtered = filter === 'all' ? txns : txns.filter(t => t.status === filter);
  const totalRevenue = txns.filter(t => t.type === 'FARE_DEDUCTION' && t.status === 'success').reduce((s, t) => s + t.amount, 0);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-800 border-t-transparent" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Transaction Monitoring</h1>
        <p className="page-subtitle">All wallet and fare transactions • Total Revenue: <span className="font-bold text-green-600">₹{totalRevenue}</span></p>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {(['all', 'success', 'failed', 'pending'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${filter === f ? 'bg-primary-800 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Passenger</th>
                <th>Type</th>
                <th>Description</th>
                <th>RFID / Bus</th>
                <th>Amount</th>
                <th>Balance After</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">No transactions found</td></tr>
              ) : filtered.map(txn => (
                <tr key={txn.id}>
                  <td className="text-xs text-gray-500 whitespace-nowrap">
                    {new Date(txn.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}{' '}
                    {new Date(txn.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="font-mono text-xs text-primary-700">{txn.passengerId}</td>
                  <td>
                    <span className={`badge text-xs ${txn.type === 'ADD_DEMO_MONEY' ? 'badge-success' : txn.type === 'REFUND' ? 'badge-info' : 'badge-error'}`}>
                      {txn.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="text-sm max-w-[150px] truncate">{txn.description}</td>
                  <td className="font-mono text-xs text-gray-500">{txn.rfidUid || txn.busNumber || '—'}</td>
                  <td className={`font-bold whitespace-nowrap ${txn.type === 'FARE_DEDUCTION' ? 'text-red-600' : 'text-green-600'}`}>
                    {txn.type === 'FARE_DEDUCTION' ? '-' : '+'}₹{txn.amount}
                  </td>
                  <td className="font-mono text-sm">₹{txn.balanceAfter}</td>
                  <td>
                    <span className={`badge ${txn.status === 'success' ? 'badge-success' : txn.status === 'failed' ? 'badge-error' : 'badge-warning'}`}>
                      {txn.status.toUpperCase()}
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
