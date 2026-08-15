import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, RotateCcw, Filter } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { transactionService } from '../../services';
import { WalletTransaction, TransactionType } from '../../types';

export default function TransactionHistory() {
  const { user } = useAuth();
  const [txns, setTxns] = useState<WalletTransaction[]>([]);
  const [filter, setFilter] = useState<'all' | TransactionType>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    transactionService.getTransactions(user.passengerId).then(data => {
      setTxns(data);
      setLoading(false);
    });
  }, [user]);

  const filtered = filter === 'all' ? txns : txns.filter(t => t.type === filter);

  const typeIcon = (type: TransactionType) => {
    if (type === 'ADD_DEMO_MONEY') return { icon: TrendingUp, bg: 'bg-green-50', color: 'text-green-600', label: 'Add Money', sign: '+' };
    if (type === 'REFUND') return { icon: RotateCcw, bg: 'bg-blue-50', color: 'text-blue-600', label: 'Refund', sign: '+' };
    return { icon: TrendingDown, bg: 'bg-red-50', color: 'text-red-500', label: 'Bus Fare', sign: '-' };
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-800 border-t-transparent" /></div>;

  const totalAdded = txns.filter(t => t.type === 'ADD_DEMO_MONEY').reduce((s, t) => s + t.amount, 0);
  const totalSpent = txns.filter(t => t.type === 'FARE_DEDUCTION' && t.status === 'success').reduce((s, t) => s + t.amount, 0);
  const totalRefunded = txns.filter(t => t.type === 'REFUND').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Transaction History</h1>
        <p className="page-subtitle">All your wallet transactions and fare deductions</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <div className="text-xl font-black text-green-600">+₹{totalAdded}</div>
          <div className="text-xs text-gray-500 mt-1">Total Added</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-xl font-black text-red-600">-₹{totalSpent}</div>
          <div className="text-xs text-gray-500 mt-1">Total Spent</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-xl font-black text-blue-600">+₹{totalRefunded}</div>
          <div className="text-xs text-gray-500 mt-1">Total Refunded</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {([
          { val: 'all', label: 'All' },
          { val: 'ADD_DEMO_MONEY', label: 'Add Money' },
          { val: 'FARE_DEDUCTION', label: 'Bus Fare' },
          { val: 'REFUND', label: 'Refunds' },
        ] as const).map(({ val, label }) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
              filter === val ? 'bg-primary-800 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Transactions Table */}
      <div className="card overflow-hidden">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Type</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400">No transactions found</td>
                </tr>
              ) : filtered.map(txn => {
                const meta = typeIcon(txn.type);
                const Icon = meta.icon;
                return (
                  <tr key={txn.id}>
                    <td className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(txn.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}<br />
                      {new Date(txn.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${meta.bg}`}>
                        <Icon className={`w-4 h-4 ${meta.color}`} />
                      </div>
                    </td>
                    <td className="max-w-[200px]">
                      <div className="text-sm font-medium text-gray-900 truncate">{txn.description}</div>
                      {txn.busNumber && <div className="text-xs text-gray-400 font-mono">{txn.busNumber}</div>}
                      {txn.rfidUid && <div className="text-xs text-gray-400 font-mono">RFID: {txn.rfidUid}</div>}
                    </td>
                    <td className={`font-bold whitespace-nowrap ${meta.sign === '+' ? 'text-green-600' : 'text-red-600'}`}>
                      {meta.sign}₹{txn.amount}
                    </td>
                    <td className="text-sm text-gray-600 font-mono whitespace-nowrap">₹{txn.balanceAfter}</td>
                    <td>
                      <span className={`badge ${
                        txn.status === 'success' ? 'badge-success' :
                        txn.status === 'failed' ? 'badge-error' : 'badge-warning'
                      }`}>{txn.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
