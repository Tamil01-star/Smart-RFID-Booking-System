const { Pool } = require('pg'); 
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_aInJFfi2SC9r@ep-polished-cloud-ay417se0-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require' }); 
pool.query("SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name='WalletTransaction'").then(res => { console.log(res.rows); pool.end(); })
