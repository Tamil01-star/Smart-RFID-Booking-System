import React, { useEffect, useState } from 'react';
import { CreditCard, Link2, Unlink, CheckCircle, Cpu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { rfidService } from '../../services';
import { RFIDCard } from '../../types';
import toast from 'react-hot-toast';

export default function RFIDManagement() {
  const { user, updateUser } = useAuth();
  const [card, setCard] = useState<RFIDCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState('');
  const [linking, setLinking] = useState(false);

  const load = async () => {
    if (!user) return;
    const c = await rfidService.getCardByPassenger(user.passengerId);
    setCard(c);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const handleLink = async () => {
    if (!user || !uid.trim()) { toast.error('Please enter an RFID UID'); return; }
    if (!/^[A-Fa-f0-9]{8}$/.test(uid.replace(/\s/g, ''))) {
      toast.error('Invalid RFID UID format. Must be exactly 8 characters (e.g., CO53F754)');
      return;
    }
    setLinking(true);
    const result = await rfidService.linkCard(uid.trim().toUpperCase(), user.passengerId, user.name);
    setLinking(false);
    if (result.success) {
      updateUser({ rfidUid: uid.trim().toUpperCase() });
      await load();
      toast.success('RFID card linked successfully!');
      setUid('');
    } else {
      toast.error(result.error || 'Failed to link RFID card');
    }
  };

  const handleUnlink = async () => {
    if (!user || !confirm('Unlink your RFID card? Future bookings will not be RFID-linked.')) return;
    await rfidService.unlinkCard(user.passengerId);
    updateUser({ rfidUid: undefined });
    await load();
    toast.success('RFID card unlinked');
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-800 border-t-transparent" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">RFID Card</h1>
        <p className="page-subtitle">Link and manage your 13.56 MHz RFID card for automatic fare collection</p>
      </div>

      {/* Current Card Status */}
      <div className={`card p-6 border-l-4 ${card?.status === 'active' ? 'border-l-green-500' : 'border-l-amber-400'}`}>
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card?.status === 'active' ? 'bg-green-50' : 'bg-amber-50'}`}>
            <CreditCard className={`w-6 h-6 ${card?.status === 'active' ? 'text-green-600' : 'text-amber-600'}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="font-semibold text-gray-900">RFID Card Status</h2>
              <span className={`badge ${card?.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                {card?.status === 'active' ? 'LINKED' : 'NOT LINKED'}
              </span>
            </div>
            {card?.status === 'active' ? (
              <div className="mt-3 space-y-2">
                {[
                  ['RFID UID', card.uid],
                  ['Card Status', 'ACTIVE'],
                  ['Linked On', new Date(card.linkedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })],
                  ['Last Used', card.lastUsedAt ? new Date(card.lastUsedAt).toLocaleDateString('en-IN') : 'Never'],
                  ['Passenger ID', card.passengerId],
                  ['Standard', '13.56 MHz (MFRC522 Compatible)'],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-2 text-sm">
                    <span className="text-gray-500 w-28 flex-shrink-0">{label}:</span>
                    <span className="font-semibold text-gray-900 font-mono">{value}</span>
                  </div>
                ))}
                <button onClick={handleUnlink} className="btn-danger btn-sm mt-3">
                  <Unlink className="w-4 h-4" />
                  Unlink Card
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mt-1">No RFID card linked. Link a card below to enable automatic fare collection.</p>
            )}
          </div>
        </div>
      </div>

      {/* Link Card */}
      {(!card || card.status !== 'active') && (
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary-700" />
            Link RFID Card
          </h2>

          <div className="space-y-4">
            <div>
              <label className="input-label">RFID Card UID</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={uid}
                  onChange={e => setUid(e.target.value.toUpperCase())}
                  className="input font-mono"
                  placeholder="e.g. CA53F754"
                  maxLength={8}
                />
                <button onClick={handleLink} disabled={linking || !uid} className="btn-primary flex-shrink-0">
                  {linking ? <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : <Link2 className="w-4 h-4" />}
                  Link Card
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info card */}
      <div className="card p-5 bg-blue-50 border-blue-100">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <Cpu className="w-4 h-4" />
          How RFID Works in SMARTBUS+
        </h3>
        <div className="space-y-2 text-sm text-blue-800">
          {[
            'Your RFID card uses 13.56 MHz technology (compatible with MFRC522 reader)',
            'The UID (Unique Identifier) on your card is stored in the database against your passenger account',
            'When you tap your card on the bus, the ESP32 reads the UID and verifies your booking + wallet balance',
            'Fare is automatically deducted from your wallet upon successful verification',
            'Your card does NOT store the wallet balance — the balance is stored securely in the database',
          ].map((text, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              {text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
