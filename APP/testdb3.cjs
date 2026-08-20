const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_aInJFfi2SC9r@ep-polished-cloud-ay417se0-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require' });
async function run() {
  try {
    const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='Booking' ORDER BY ordinal_position");
    console.log('Booking columns:', cols.rows.map(r => r.column_name));
  } catch(e) { console.error(e.message); } finally { pool.end(); }
}
run();
