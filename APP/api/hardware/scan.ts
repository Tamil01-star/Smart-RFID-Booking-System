import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../utils/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { uid, bus_id } = req.body;

  if (!uid || !bus_id) {
    return res.status(400).json({ error: 'Missing uid or bus_id' });
  }

  try {
    // 1. Check if RFID exists and is linked
    const cardRes = await query(`SELECT passenger_id, status FROM rfid_cards WHERE uid = $1`, [uid]);
    if (cardRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Card not registered' });
    }
    
    const card = cardRes.rows[0];
    if (card.status !== 'active' || !card.passenger_id) {
      return res.status(403).json({ success: false, message: 'Card not active or unlinked' });
    }

    const passengerId = card.passenger_id;

    // 2. Get Bus Fare
    const busRes = await query(`SELECT bus_number, fare FROM buses WHERE id = $1`, [bus_id]);
    if (busRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Bus not found' });
    }
    const { bus_number, fare } = busRes.rows[0];

    // 3. Get Wallet Balance
    const walletRes = await query(`SELECT balance FROM wallets WHERE passenger_id = $1`, [passengerId]);
    if (walletRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }
    
    const balance = parseFloat(walletRes.rows[0].balance);
    const fareAmount = parseFloat(fare);

    if (balance < fareAmount) {
      return res.status(402).json({ success: false, message: 'Insufficient balance', balance });
    }

    // 4. Deduct Fare
    const newBalance = balance - fareAmount;
    await query(`UPDATE wallets SET balance = $1, last_updated = CURRENT_TIMESTAMP WHERE passenger_id = $2`, [newBalance, passengerId]);

    // 5. Log Transaction
    await query(`
      INSERT INTO transactions (passenger_id, amount, type, description, balance_after, status, rfid_uid, bus_number)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [passengerId, fareAmount, 'FARE_DEDUCTION', `Bus Fare (${bus_number})`, newBalance, 'success', uid, bus_number]);

    // 6. Update RFID last used
    await query(`UPDATE rfid_cards SET last_used_at = CURRENT_TIMESTAMP WHERE uid = $1`, [uid]);

    return res.status(200).json({ 
      success: true, 
      message: 'Fare deducted', 
      passengerId,
      deducted: fareAmount, 
      newBalance 
    });

  } catch (error: any) {
    console.error('Scan Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
