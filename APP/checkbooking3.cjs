const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_aInJFfi2SC9r@ep-polished-cloud-ay417se0-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require' });
async function run() {
  try {
    const b = await pool.query('SELECT id, "bookingId", "passengerId", "busId", "travelDate", fare, status, destination FROM "Booking" ORDER BY id DESC LIMIT 5');
    console.log('Bookings:', JSON.stringify(b.rows, null, 2));
    const w = await pool.query('SELECT "passengerId", balance FROM "Wallet"');
    console.log('Wallets:', w.rows);
  } catch(e) { console.error(e.message); } finally { pool.end(); }
}
run();
