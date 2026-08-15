import React, { useEffect, useState } from 'react';
import { Wallet as WalletIcon, Plus, TrendingUp, TrendingDown, RotateCcw, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { walletService, transactionService } from '../../services';
import { Wallet as WalletType, WalletTransaction } from '../../types';
import { WALLET_PRESET_AMOUNTS } from '../../data/mockData';
import toast from 'react-hot-toast';

export default function Wallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [txns, setTxns] = useState<WalletTransaction[]>([]);
  const [customAmount, setCustomAmount] = useState('');
  const [adding, setAdding] = useState(false);

  const load = async () => {
    if (!user) return;
    const [w, t] = await Promise.all([
      walletService.getWallet(user.passengerId),
      transactionService.getTransactions(user.passengerId),
    ]);
    setWallet(w);
    setTxns(t);
  };

  useEffect(() => { load(); }, [user]);

  const handleAddMoney = async (amount: number) => {
    if (!user || amount <= 0) return;
    setAdding(true);
    const updated = await walletService.addDemoMoney(user.passengerId, amount);
    setWallet(updated);
    await load();
    toast.success(`₹${amount} added to your demo wallet!`);
    setCustomAmount('');
    setAdding(false);
  };

  const handleCustomAdd = () => {
    const amt = parseInt(customAmount);
    if (!amt || amt < 10 || amt > 10000) {
      toast.error('Enter an amount between ₹10 and ₹10,000');
      return;
    }
    handleAddMoney(amt);
  };

  const txnIcon = (type: string) => {
    if (type === 'ADD_DEMO_MONEY') return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (type === 'REFUND') return <RotateCcw className="w-4 h-4 text-blue-600" />;
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Wallet</h1>
        <p className="page-subtitle">Manage your demo wallet balance and view transaction history</p>
      </div>

      {/* Balance Card */}
      <div className="rounded-2xl bg-gradient-to-br from-primary-800 to-blue-700 text-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-blue-200 text-sm font-medium mb-1 flex items-center gap-2">
              <WalletIcon className="w-4 h-4" />
              DEMO WALLET BALANCE
            </div>
            <div className="text-5xl font-black mt-2">
              ₹{wallet?.balance.toFixed(2) ?? '0.00'}
            </div>
            <div className="text-blue-200 text-xs mt-2">INR • {user?.passengerId}</div>
          </div>
          <div className="bg-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-blue-100">
            DEMO MODE
          </div>
        </div>
      </div>

      {/* Demo Notice */}
      <div className="demo-banner">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>This is a <strong>demo wallet</strong>. No real money is involved. Use preset amounts or enter a custom amount to add virtual funds for testing.</span>
      </div>

      {/* Add Money */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary-700" />
          Add Demo Money
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-4">
          {WALLET_PRESET_AMOUNTS.map(amt => (
            <button
              key={amt}
              onClick={() => handleAddMoney(amt)}
              disabled={adding}
              className="py-3 border-2 border-primary-200 rounded-xl text-primary-800 font-bold hover:bg-primary-50 hover:border-primary-400 transition-all active:scale-95 disabled:opacity-60"
            >
              ₹{amt}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="number"
              value={customAmount}
              onChange={e => setCustomAmount(e.target.value)}
              placeholder="Custom amount (₹10 – ₹10,000)"
              className="input"
              min={10}
              max={10000}
            />
          </div>
          <button
            onClick={handleCustomAdd}
            disabled={adding || !customAmount}
            className="btn-success flex-shrink-0"
          >
            {adding ? <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : <Plus className="w-4 h-4" />}
            Add Demo Money
          </button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Transaction History</h2>
        </div>
        {txns.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <WalletIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No transactions yet. Add demo money to get started!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {txns.map(txn => (
              <div key={txn.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  txn.type === 'ADD_DEMO_MONEY' ? 'bg-green-50' :
                  txn.type === 'REFUND' ? 'bg-blue-50' : 'bg-red-50'
                }`}>
                  {txnIcon(txn.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{txn.description}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {new Date(txn.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {txn.busNumber && <span className="ml-2 font-mono">{txn.busNumber}</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={`font-bold text-sm ${
                    txn.type === 'ADD_DEMO_MONEY' || txn.type === 'REFUND' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {txn.type === 'FARE_DEDUCTION' ? '-' : '+'}₹{txn.amount}
                  </div>
                  <div className="text-xs text-gray-400">Bal: ₹{txn.balanceAfter}</div>
                  <span className={`badge text-xs mt-0.5 ${
                    txn.status === 'success' ? 'badge-success' :
                    txn.status === 'failed' ? 'badge-error' : 'badge-warning'
                  }`}>{txn.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
