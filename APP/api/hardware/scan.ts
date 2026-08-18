import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../utils/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { uid, bus_number } = req.body;

  if (!uid || !bus_number) {
    return res.status(400).json({ error: 'Missing uid or bus_number' });
  }

  try {
    // Lookup bus_id from bus_number
    const busRes = await query(`SELECT id FROM buses WHERE bus_number = $1`, [bus_number]);
    if (busRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Bus not found in database' });
    }
    const bus_id = busRes.rows[0].id;
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

    // 2. Check for an existing valid booking for this passenger, on this bus, for today
    // We assume travel_date is stored without time, so CURRENT_DATE works for exact matches.
    const bookingRes = await query(`
      SELECT id, booking_id, seat_number, status 
      FROM bookings 
      WHERE passenger_id = $1 AND bus_id = $2 AND travel_date = CURRENT_DATE
      ORDER BY id DESC LIMIT 1
    `, [passengerId, bus_id]);

    if (bookingRes.rows.length === 0) {
       // Not booked early
       return res.status(404).json({ success: false, message: 'No valid booking found for today' });
    }

    const booking = bookingRes.rows[0];

    // 3. Prevent duplicate boarding
    if (booking.status === 'boarded') {
       return res.status(409).json({ success: false, message: 'Already Boarded' });
    }

    if (booking.status !== 'confirmed') {
       return res.status(400).json({ success: false, message: 'Booking is not confirmed' });
    }

    // 4. Update status to boarded
    await query(`UPDATE bookings SET status = 'boarded' WHERE id = $1`, [booking.id]);

    // 5. Update RFID last used
    await query(`UPDATE rfid_cards SET last_used_at = CURRENT_TIMESTAMP WHERE uid = $1`, [uid]);

    // 6. Return success with seat number
    return res.status(200).json({ 
      success: true, 
      message: 'Boarding Successful', 
      passengerId,
      bookingId: booking.booking_id,
      seatNumber: booking.seat_number || 'TBD'
    });

  } catch (error: any) {
    console.error('Scan Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
