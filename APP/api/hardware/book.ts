import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../utils/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { uid, bus_number, fare } = req.body;

  if (!uid || !bus_number || fare === undefined) {
    return res.status(400).json({ error: 'Missing uid, bus_number, or fare' });
  }

  try {
    // 1. Lookup bus_id from bus_number
    const busRes = await query(`SELECT id FROM buses WHERE bus_number = $1`, [bus_number]);
    if (busRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Bus not found in database' });
    }
    const bus_id = busRes.rows[0].id;

    // 2. Check if RFID exists and is linked
    const cardRes = await query(`SELECT passenger_id, status FROM rfid_cards WHERE uid = $1`, [uid]);
    if (cardRes.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Card not registered' });
    }
    
    const card = cardRes.rows[0];
    if (card.status !== 'active' || !card.passenger_id) {
      return res.status(403).json({ success: false, message: 'Card not active or unlinked' });
    }

    const passengerId = card.passenger_id;

    // 3. Check Wallet Balance
    const walletRes = await query(`SELECT balance FROM wallets WHERE passenger_id = $1`, [passengerId]);
    if (walletRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }
    
    const balance = parseFloat(walletRes.rows[0].balance);
    const fareAmount = parseFloat(fare);

    if (balance < fareAmount) {
      return res.status(402).json({ success: false, message: 'Not a valid balance', balance });
    }

    // 4. Deduct Fare
    const newBalance = balance - fareAmount;
    await query(`UPDATE wallets SET balance = $1, last_updated = CURRENT_TIMESTAMP WHERE passenger_id = $2`, [newBalance, passengerId]);

    // 5. Log Transaction
    await query(`
      INSERT INTO transactions (passenger_id, amount, type, description, balance_after, status, rfid_uid, bus_number)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [passengerId, fareAmount, 'FARE_DEDUCTION', `Walk-in Bus Fare (${bus_number})`, newBalance, 'success', uid, bus_number]);

    // 6. Create Booking (Automatically Marked as Boarded)
    const booking_id = 'W' + Date.now().toString().slice(-6); // Simple random Walk-in ID
    const seat_number = 'W' + Math.floor(Math.random() * 40 + 1); // Random seat 1-40

    await query(`
      INSERT INTO bookings (booking_id, passenger_id, bus_id, travel_date, seat_number, fare, rfid_linked, status)
      VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, TRUE, 'boarded')
    `, [booking_id, passengerId, bus_id, seat_number, fareAmount]);

    // 7. Update RFID last used
    await query(`UPDATE rfid_cards SET last_used_at = CURRENT_TIMESTAMP WHERE uid = $1`, [uid]);

    return res.status(200).json({ 
      success: true, 
      message: 'Walk-in Booking Successful', 
      passengerId,
      bookingId: booking_id,
      seatNumber: seat_number,
      deducted: fareAmount, 
      newBalance 
    });

  } catch (error: any) {
    console.error('Walk-in Book Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
