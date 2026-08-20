const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_aInJFfi2SC9r@ep-polished-cloud-ay417se0-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require' });

async function run() {
  try {
    const busRes = await pool.query('SELECT id FROM "Bus" WHERE "busNumber" = $1', ['NS893']);
    console.log('Bus:', busRes.rows);
    const cardRes = await pool.query('SELECT "passengerId", status FROM "RFIDCard" WHERE uid = $1', ['test']);
    console.log('Card:', cardRes.rows);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
