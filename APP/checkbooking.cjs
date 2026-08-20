const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_aInJFfi2SC9r@ep-polished-cloud-ay417se0-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require' });
async function run() {
  try {
    // Check the wallet columns
    const walletCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='Wallet' ORDER BY ordinal_position");
    console.log('Wallet columns:', walletCols.rows.map(r => r.column_name));

    // Check wallet of our test passenger
    const wallet = await pool.query('SELECT * FROM "Wallet" WHERE "userId" = ', ['SBP58861']);
    console.log('Wallet:', wallet.rows);

    // Check WalletTransaction columns
    const txCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='WalletTransaction' ORDER BY ordinal_position");
    console.log('WalletTransaction columns:', txCols.rows.map(r => r.column_name));

    // Check existing booking fare
    const booking = await pool.query('SELECT "passengerId", fare, status, destination FROM "Booking" WHERE "passengerId" =  ORDER BY id DESC LIMIT 1', ['SBP58861']);
    console.log('Booking:', booking.rows);
  } catch(e) { console.error(e.message); } finally { pool.end(); }
}
run();
