const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_aInJFfi2SC9r@ep-polished-cloud-ay417se0-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require' });
async function run() {
  try {
    const wallet = await pool.query('SELECT * FROM "Wallet" WHERE "passengerId" = ', ['SBP58861']);
    console.log('Wallet:', wallet.rows);
    const txCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='WalletTransaction' ORDER BY ordinal_position");
    console.log('WalletTransaction columns:', txCols.rows.map(function(r){ return r.column_name; }));
    const booking = await pool.query('SELECT fare, status, destination FROM "Booking" WHERE "passengerId" =  ORDER BY id DESC LIMIT 1', ['SBP58861']);
    console.log('Booking:', booking.rows);
  } catch(e) { console.error(e.message); } finally { pool.end(); }
}
run();
