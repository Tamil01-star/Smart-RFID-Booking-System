import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../utils/db.js';

// Helper: strip colons from UID sent by ESP32
function normalizeUID(uid: string): string {
  return uid.replace(/:/g, '').toUpperCase();
}

// Helper: Generate a seat number deterministically from booking ID
// Produces seats like A01, B05 ... D10 (40 seats total)
function allocateSeat(bookingId: string): string {
  let hash = 0;
  for (let i = 0; i < bookingId.length; i++) {
    hash = (hash * 31 + bookingId.charCodeAt(i)) & 0xffff;
  }
  const seatNum = (hash % 40) + 1;
  const row     = String.fromCharCode(65 + Math.floor((seatNum - 1) / 10)); // A, B, C, D
  const col     = ((seatNum - 1) % 10) + 1;
  return `${row}${col.toString().padStart(2, '0')}`;
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
    let fareAmount = parseFloat(fare);

    // 3.5 Apply Category Discount
    const userCatRes = await query(`SELECT category FROM "User" WHERE "passengerId" = $1`, [passengerId]);
    if (userCatRes.rows.length > 0 && userCatRes.rows[0].category) {
      const cat = userCatRes.rows[0].category.toLowerCase();
      if (cat === 'student') fareAmount = fareAmount * 0.50;
      else if (cat === 'senior_citizen') fareAmount = fareAmount * 0.60;
      else if (cat === 'disabled_person') fareAmount = fareAmount * 0.75;
      else if (cat === 'ex_serviceman') fareAmount = 0;
      
      fareAmount = Math.round(fareAmount);
    }

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

    // 8. Allocate a seat number from the booking ID
    const seatNumber = allocateSeat(booking_id);

    // 9. Send Email Ticket (Trigger Backend API)
    try {
      const userRes = await query(`SELECT email, name FROM "User" WHERE "passengerId" = $1`, [passengerId]);
      if (userRes.rows.length > 0 && userRes.rows[0].email) {
        const userEmail = userRes.rows[0].email;
        const userName = userRes.rows[0].name;
        
        // Ensure Vercel knows the backend URL
        const backendUrl = process.env.VITE_API_URL || 'https://backend-sigma-beige-36.vercel.app/api';
        
        await fetch(`${backendUrl}/bookings/send-ticket`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userEmail,
            name: userName,
            bookingId: booking_id,
            busNumber: bus_number,
            route: 'Walk-in Boarding',
            fare: fareAmount
          })
        });
      }
    } catch (emailErr) {
      console.error('Walk-in Email Trigger Error:', emailErr);
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Walk-in Booking Successful', 
      passengerId,
      bookingId: booking_id,
      seatNumber,
      deducted: fareAmount, 
      newBalance 
    });

  } catch (error: any) {
    console.error('Walk-in Book Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error', detail: error.message });
  }
}
