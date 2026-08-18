import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Clean existing records to avoid conflicts
  console.log('🧹 Cleaning old records...');
  await prisma.booking.deleteMany({});
  await prisma.walletTransaction.deleteMany({});
  await prisma.wallet.deleteMany({});
  await prisma.rFIDCard.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.bus.deleteMany({});

  // 2. Create Users
  console.log('👤 Seeding users...');
  
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const vertexPasswordHash = await bcrypt.hash('vertex@01', 10);
  const passengerPasswordHash = await bcrypt.hash('passenger123', 10);

  // Admin User
  const admin = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@smartbus.com',
      phone: '9876543210',
      passengerId: 'ADMIN001',
      role: 'admin',
      password: adminPasswordHash,
      status: 'active',
    },
  });

  // Vertex Admin User
  const vertex = await prisma.user.create({
    data: {
      name: 'Vertex Operator',
      email: 'vertex@smartbus.com',
      phone: '9876543211',
      passengerId: 'VERTEX001',
      role: 'admin',
      password: vertexPasswordHash,
      status: 'active',
    },
  });

  // Demo Passenger User
  const passenger = await prisma.user.create({
    data: {
      name: 'Tamil Kumar',
      email: 'passenger@smartbus.com',
      phone: '9876543212',
      passengerId: 'PASS001',
      role: 'passenger',
      password: passengerPasswordHash,
      status: 'active',
      rfidUid: 'CA53F754', // Preset linked card UID from LCD screen
    },
  });

  // Seed passenger wallet
  await prisma.wallet.create({
    data: {
      passengerId: 'PASS001',
      balance: 1500.0,
      currency: 'INR',
    },
  });

  // Seed rfid card
  await prisma.rFIDCard.create({
    data: {
      uid: 'CA53F754',
      passengerId: 'PASS001',
      passengerName: 'Tamil Kumar',
      status: 'active',
    },
  });

  // 3. Create Buses with dynamic stops and cumulative distances
  console.log('🚌 Seeding buses & routes data...');

  const stops = [
    { stopName: 'Salem', distance: 0, order: 1 },
    { stopName: 'Namakkal', distance: 52, order: 2 },
    { stopName: 'Karur', distance: 97, order: 3 },
    { stopName: 'Dindigul', distance: 202, order: 4 },
    { stopName: 'Madurai', distance: 267, order: 5 },
    { stopName: 'Virudhunagar', distance: 315, order: 6 },
    { stopName: 'Tirunelveli', distance: 440, order: 7 },
    { stopName: 'Nagercoil', distance: 523, order: 8 },
    { stopName: 'Thiruvananthapuram', distance: 593, order: 9 }
  ];

  // Ordinary Bus (₹2.00 / km)
  // Salem -> Thiruvananthapuram final fare: 593 * 2.00 = 1186 -> rounded to 1185
  await prisma.bus.create({
    data: {
      busNumber: 'SB-101',
      busName: 'Salem-TVM Ordinary Express',
      source: 'Salem',
      destination: 'Thiruvananthapuram',
      departureTime: '06:00',
      arrivalTime: '19:00',
      fare: 1185,
      totalSeats: 52,
      availableSeats: 52,
      status: 'active',
      route: 'Salem - Namakkal - Karur - Dindigul - Madurai - Virudhunagar - Tirunelveli - Nagercoil - Thiruvananthapuram',
      stopsWithFares: stops, // Store stop configurations directly as JSON
    },
  });

  // Express Bus (₹2.75 / km)
  // Salem -> Thiruvananthapuram final fare: 593 * 2.75 = 1630.75 -> rounded to 1630
  await prisma.bus.create({
    data: {
      busNumber: 'SB-202',
      busName: 'Salem-TVM Superfast Express',
      source: 'Salem',
      destination: 'Thiruvananthapuram',
      departureTime: '07:30',
      arrivalTime: '19:30',
      fare: 1630,
      totalSeats: 45,
      availableSeats: 45,
      status: 'active',
      route: 'Salem - Namakkal - Karur - Dindigul - Madurai - Virudhunagar - Tirunelveli - Nagercoil - Thiruvananthapuram',
      stopsWithFares: stops,
    },
  });

  // AC Bus (₹4.00 / km)
  // Salem -> Thiruvananthapuram final fare: 593 * 4.00 = 2372 -> rounded to 2370
  await prisma.bus.create({
    data: {
      busNumber: 'SB-303',
      busName: 'Salem-TVM AC Multi-Axle',
      source: 'Salem',
      destination: 'Thiruvananthapuram',
      departureTime: '21:00',
      arrivalTime: '10:30', // Next day
      fare: 2370,
      totalSeats: 40,
      availableSeats: 40,
      status: 'active',
      route: 'Salem - Namakkal - Karur - Dindigul - Madurai - Virudhunagar - Tirunelveli - Nagercoil - Thiruvananthapuram',
      stopsWithFares: stops,
    },
  });

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
