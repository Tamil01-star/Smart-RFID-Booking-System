const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_aInJFfi2SC9r@ep-polished-cloud-ay417se0-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require' });

async function run() {
  try {
    // Check what bus numbers are in DB
    const buses = await pool.query('SELECT id, "busNumber" FROM "Bus" LIMIT 5');
    console.log('Buses in DB:', buses.rows);

    // Check RFID cards
    const cards = await pool.query('SELECT uid, "passengerId", status FROM "RFIDCard" LIMIT 5');
    console.log('RFID Cards in DB:', cards.rows);

    // Check bookings for today
    const bookings = await pool.query('SELECT "passengerId", "busId", "travelDate", status, "seatNumber" FROM "Booking" ORDER BY id DESC LIMIT 5');
    console.log('Recent Bookings:', bookings.rows);

  } catch(e) {
    console.error('DB Error:', e.message);
  } finally {
    pool.end();
  }
}
run();
