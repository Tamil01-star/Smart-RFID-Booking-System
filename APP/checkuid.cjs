const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_aInJFfi2SC9r@ep-polished-cloud-ay417se0-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require' });
async function run() {
  try {
    // Show all UIDs exactly as stored in DB
    const cards = await pool.query('SELECT uid, "passengerId", status FROM "RFIDCard"');
    console.log('All RFID cards:', cards.rows);
    
    // Try querying with the cleaned version
    const test1 = await pool.query('SELECT uid FROM "RFIDCard" WHERE UPPER(uid) = ', ['77A51D64']);
    console.log('Query with 77A51D64:', test1.rows);
    
    // Try with colon version
    const test2 = await pool.query('SELECT uid FROM "RFIDCard" WHERE uid = ', ['77A51D64']);
    console.log('Query exact match:', test2.rows);
  } catch(e) { console.error(e.message); } finally { pool.end(); }
}
run();
