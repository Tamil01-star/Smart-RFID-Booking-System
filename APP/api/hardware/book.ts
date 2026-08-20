import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../utils/db.js';

// Helper: strip colons from UID sent by ESP32
function normalizeUID(uid: string): string {
  return uid.replace(/:/g, '').toUpperCase();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { uid, bus_number, fare } = req.body;

  if (!uid || !bus_number || fare === undefined) {
    return res.status(400).json({ error: 'Missing uid, bus_number, or fare' });
  }

  const cleanUID = normalizeUID(uid);

  try {
    // 1. Lookup bus_id from bus_number
    const busRes = await query(`SELECT id FROM "Bus" WHERE "busNumber" = $1`, [bus_number]);
    if (busRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Bus not found' });
    }
    const bus_id = busRes.rows[0].id;

    // 2. Check if RFID card exists and is active
    const cardRes = await query(
      `SELECT "passengerId", status FROM "RFIDCard" WHERE UPPER(uid) = $1`,
      [cleanUID]
    );
    if (cardRes.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Card not registered' });
    }
    
    const card = cardRes.rows[0];
    if (card.status !== 'active' || !card.passengerId) {
      return res.status(403).json({ success: false, message: 'Card not active or unlinked' });
    }

    const passengerId = card.passengerId;

    // 3. Check Wallet Balance
    const walletRes = await query(`SELECT balance FROM "Wallet" WHERE "passengerId" = $1`, [passengerId]);
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
    await query(`UPDATE "Wallet" SET balance = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE "passengerId" = $2`, [newBalance, passengerId]);

    // 5. Log Transaction
    const tx_id = 'TX' + Date.now().toString().slice(-8);
    await query(
      `INSERT INTO "WalletTransaction" (id, "passengerId", amount, type, description, status, "balanceBefore", "balanceAfter", "busNumber", timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
      [tx_id, passengerId, fareAmount, 'DEBIT', `Walk-in Bus Fare (${bus_number})`, 'COMPLETED', balance, newBalance, bus_number]
    );

    // 6. Create Booking (Automatically Marked as Boarded)
    const booking_id = 'W' + Date.now().toString().slice(-6);
    const b_id = 'B' + Date.now().toString();

    await query(`
      INSERT INTO "Booking" (
        id, "bookingId", "passengerId", "passengerName", "busId", "busNumber", 
        source, destination, "travelDate", "departureTime", "arrivalTime", 
        fare, status, "rfidLinked", "createdAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE, $9, $10, $11, 'boarded', true, CURRENT_TIMESTAMP)
    `, [
      b_id, booking_id, passengerId, 'Walk-in Passenger', bus_id, bus_number, 
      'Current Stop', 'Walk-in Dest', '00:00', '23:59', fareAmount
    ]);

    // 7. Update RFID last used
    await query(`UPDATE "RFIDCard" SET "lastUsedAt" = CURRENT_TIMESTAMP WHERE UPPER(uid) = $1`, [cleanUID]);

    return res.status(200).json({ 
      success: true, 
      message: 'Walk-in Booking Successful', 
      passengerId,
      bookingId: booking_id,
      seatNumber: 'OK',
      deducted: fareAmount, 
      newBalance 
    });

  } catch (error: any) {
    console.error('Walk-in Book Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error', detail: error.message });
  }
}
