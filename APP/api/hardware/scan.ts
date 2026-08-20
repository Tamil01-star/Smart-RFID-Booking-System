import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../utils/db.js';

// Helper: strip colons from UID sent by ESP32
// ESP32 sends "77:A5:1D:64" but DB stores "77A51D64"
function normalizeUID(uid: string): string {
  return uid.replace(/:/g, '').toUpperCase();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { uid, bus_number } = req.body;

  if (!uid || !bus_number) {
    return res.status(400).json({ error: 'Missing uid or bus_number' });
  }

  // Normalize the UID to match DB format (no colons, uppercase)
  const cleanUID = normalizeUID(uid);

  try {
    // 1. Lookup bus_id from bus_number
    const busRes = await query(`SELECT id FROM "Bus" WHERE "busNumber" = $1`, [bus_number]);
    if (busRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Bus not found in database' });
    }
    const bus_id = busRes.rows[0].id;

    // 2. Check if RFID card exists and is active
    const cardRes = await query(
      `SELECT "passengerId", status FROM "RFIDCard" WHERE UPPER(uid) = $1`,
      [cleanUID]
    );
    if (cardRes.rows.length === 0) {
      // Card not registered in the system at all
      return res.status(401).json({ success: false, message: 'Card not registered' });
    }

    const card = cardRes.rows[0];
    if (card.status !== 'active' || !card.passengerId) {
      return res.status(403).json({ success: false, message: 'Card not active or unlinked' });
    }

    const passengerId = card.passengerId;

    // 3. Check for a valid booking for today on this bus
    const bookingRes = await query(`
      SELECT id, "bookingId", destination, fare, status
      FROM "Booking"
      WHERE "passengerId" = $1 AND "busId" = $2 AND DATE("travelDate") >= CURRENT_DATE
      ORDER BY id DESC LIMIT 1
    `, [passengerId, bus_id]);

    if (bookingRes.rows.length === 0) {
      // Registered card, but no ticket booked for today
      return res.status(404).json({ success: false, message: 'No valid booking found for today' });
    }

    const booking = bookingRes.rows[0];

    // 4. Prevent duplicate boarding
    if (booking.status === 'boarded') {
      return res.status(409).json({ success: false, message: 'Already Boarded' });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: 'Booking not confirmed' });
    }

    // =====================================================
    // 5. DEDUCT WALLET - Fare is only deducted HERE when
    //    the passenger physically taps their RFID card.
    //    Online booking only reserves the seat (confirmed),
    //    payment happens at the device gate.
    // =====================================================
    const fareAmount = parseFloat(booking.fare) || 0;

    if (fareAmount > 0) {
      // Check current wallet balance
      const walletRes = await query(
        `SELECT balance FROM "Wallet" WHERE "passengerId" = $1`,
        [passengerId]
      );

      if (walletRes.rows.length === 0) {
        return res.status(402).json({ success: false, message: 'Wallet not found. Please top up.' });
      }

      const currentBalance = parseFloat(walletRes.rows[0].balance);

      if (currentBalance < fareAmount) {
        // Not enough balance - inform the ESP32 (402 = Payment Required)
        return res.status(402).json({
          success: false,
          message: 'Not a valid balance',
          balance: currentBalance,
          required: fareAmount
        });
      }

      // Deduct fare from wallet
      const newBalance = currentBalance - fareAmount;
      await query(
        `UPDATE "Wallet" SET balance = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE "passengerId" = $2`,
        [newBalance, passengerId]
      );

      // Log transaction in WalletTransaction
      const walletTxCols = await query(
        `SELECT column_name FROM information_schema.columns WHERE table_name='WalletTransaction'`
      );
      const colNames = walletTxCols.rows.map((r: any) => r.column_name);

      // Build insert based on actual columns present
      if (colNames.includes('passengerId') && colNames.includes('amount') && colNames.includes('type')) {
        await query(
          `INSERT INTO "WalletTransaction" ("passengerId", amount, type, description, "createdAt")
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
          [passengerId, fareAmount, 'DEBIT', `Bus Fare - ${bus_number} to ${booking.destination}`]
        );
      }
    }

    // 6. Mark booking as boarded
    await query(`UPDATE "Booking" SET status = 'boarded' WHERE id = $1`, [booking.id]);

    // 7. Update RFID last used timestamp
    await query(
      `UPDATE "RFIDCard" SET "lastUsedAt" = CURRENT_TIMESTAMP WHERE UPPER(uid) = $1`,
      [cleanUID]
    );

    // 8. Return success with destination as display info
    return res.status(200).json({
      success: true,
      message: 'Boarding Successful',
      passengerId,
      bookingId: booking.bookingId,
      seatNumber: booking.destination || 'OK', // LCD shows destination city
      fareDeducted: fareAmount
    });

  } catch (error: any) {
    console.error('Scan Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error', detail: error.message });
  }
}
