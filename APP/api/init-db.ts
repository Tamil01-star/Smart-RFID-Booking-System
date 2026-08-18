import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from './utils/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        passenger_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        phone VARCHAR(20),
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'passenger',
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS wallets (
        passenger_id VARCHAR(50) PRIMARY KEY REFERENCES users(passenger_id),
        balance DECIMAL(10, 2) DEFAULT 0.00,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS rfid_cards (
        uid VARCHAR(50) PRIMARY KEY,
        passenger_id VARCHAR(50) REFERENCES users(passenger_id),
        status VARCHAR(20) DEFAULT 'active',
        linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_used_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS buses (
        id SERIAL PRIMARY KEY,
        bus_number VARCHAR(50) UNIQUE NOT NULL,
        bus_name VARCHAR(100) NOT NULL,
        source VARCHAR(100) NOT NULL,
        destination VARCHAR(100) NOT NULL,
        departure_time VARCHAR(10) NOT NULL,
        arrival_time VARCHAR(10) NOT NULL,
        fare DECIMAL(10, 2) NOT NULL,
        total_seats INT DEFAULT 40,
        available_seats INT DEFAULT 40,
        status VARCHAR(20) DEFAULT 'active',
        route TEXT
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        booking_id VARCHAR(50) UNIQUE NOT NULL,
        passenger_id VARCHAR(50) REFERENCES users(passenger_id),
        bus_id INT REFERENCES buses(id),
        travel_date DATE NOT NULL,
        seat_number VARCHAR(10),
        fare DECIMAL(10, 2) NOT NULL,
        rfid_linked BOOLEAN DEFAULT FALSE,
        status VARCHAR(20) DEFAULT 'confirmed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        passenger_id VARCHAR(50) REFERENCES users(passenger_id),
        amount DECIMAL(10, 2) NOT NULL,
        type VARCHAR(50) NOT NULL, -- 'ADD_DEMO_MONEY', 'FARE_DEDUCTION', 'REFUND'
        description TEXT,
        balance_after DECIMAL(10, 2),
        status VARCHAR(20) DEFAULT 'success',
        rfid_uid VARCHAR(50),
        bus_number VARCHAR(50),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert demo user and admin if not exists
    await query(`
      INSERT INTO users (passenger_id, name, email, password, role)
      VALUES 
        ('SBP10001', 'Demo Passenger', 'demo@smartbus.com', 'demo123', 'passenger'),
        ('SBA10001', 'System Admin', 'admin@smartbus.com', 'admin123', 'admin')
      ON CONFLICT (email) DO NOTHING;
    `);

    await query(`
      INSERT INTO wallets (passenger_id, balance)
      VALUES ('SBP10001', 500.00)
      ON CONFLICT (passenger_id) DO NOTHING;
    `);

    res.status(200).json({ success: true, message: 'Database initialized successfully' });
  } catch (error: any) {
    console.error('Init DB Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
