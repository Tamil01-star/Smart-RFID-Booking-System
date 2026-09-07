import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding (safe upsert mode)...');

  // Passwords
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const vertexPasswordHash = await bcrypt.hash('vertex@01', 10);
  const demoPasswordHash = await bcrypt.hash('demo123', 10);

  // 1. Ensure Admins
  await prisma.user.upsert({
    where: { email: 'admin@smartbus.com' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@smartbus.com',
      phone: '9876543210',
      passengerId: 'ADMIN001',
      role: 'admin',
      password: adminPasswordHash,
      status: 'active',
    }
  });

  await prisma.user.upsert({
    where: { email: 'vertex@smartbus.com' },
    update: {},
    create: {
      name: 'Vertex Operator',
      email: 'vertex@smartbus.com',
      phone: '9876543211',
      passengerId: 'VERTEX001',
      role: 'admin',
      password: vertexPasswordHash,
      status: 'active',
    }
  });

  // 2. Passengers
  const passengers = [
    {
      name: 'Tamil Kumar',
      email: 'passenger@smartbus.com',
      phone: '9876543210',
      passengerId: 'PASS001',
      role: 'passenger' as const,
      category: 'general' as const,
      rfidUid: 'CA53F754',
      balance: 1500.0,
      rfids: ['CA53F754', 'A1B2C3D4']
    },
    {
      name: 'Priya Sharma',
      email: 'priya@example.com',
      phone: '9876543211',
      passengerId: 'SBP10002',
      role: 'passenger' as const,
      category: 'student' as const,
      rfidUid: 'B2C3D4E5',
      balance: 1000.0,
      rfids: ['B2C3D4E5']
    },
    {
      name: 'Rajan Murugan',
      email: 'rajan@example.com',
      phone: '9876543212',
      passengerId: 'SBP10003',
      role: 'passenger' as const,
      category: 'senior_citizen' as const,
      rfidUid: 'D4E5F6A1',
      balance: 750.0,
      rfids: ['D4E5F6A1']
    },
    {
      name: 'Deepa Sundaram',
      email: 'deepa@example.com',
      phone: '9876543213',
      passengerId: 'SBP10004',
      role: 'passenger' as const,
      category: 'disabled_person' as const,
      rfidUid: 'E5F6A1B2',
      balance: 1200.0,
      rfids: ['E5F6A1B2']
    },
    {
      name: 'Karthik Raja',
      email: 'karthik@example.com',
      phone: '9876543214',
      passengerId: 'SBP10005',
      role: 'passenger' as const,
      category: 'ex_serviceman' as const,
      rfidUid: 'F6A1B2C3',
      balance: 500.0,
      rfids: ['F6A1B2C3']
    }
  ];

  for (const p of passengers) {
    await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        name: p.name,
        email: p.email,
        phone: p.phone,
        passengerId: p.passengerId,
        role: p.role,
        category: p.category,
        rfidUid: p.rfidUid,
        password: demoPasswordHash,
        status: 'active'
      }
    });

    await prisma.wallet.upsert({
      where: { passengerId: p.passengerId },
      update: {},
      create: {
        passengerId: p.passengerId,
        balance: p.balance,
        currency: 'INR'
      }
    });

    for (const uid of p.rfids) {
      await prisma.rFIDCard.upsert({
        where: { uid },
        update: {},
        create: {
          uid,
          passengerId: p.passengerId,
          passengerName: p.name,
          status: 'active'
        }
      });
    }
  }

  // 3. Buses
  const salemTvmStops = [
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

  const buses = [
    {
      busNumber: 'SB-101',
      busName: 'Salem-TVM Ordinary Express',
      source: 'Salem',
      destination: 'Thiruvananthapuram',
      departureTime: '06:00',
      arrivalTime: '19:00',
      fare: 1185,
      totalSeats: 52,
      availableSeats: 48,
      status: 'active',
      route: 'Salem - Namakkal - Karur - Dindigul - Madurai - Virudhunagar - Tirunelveli - Nagercoil - Thiruvananthapuram',
      stopsWithFares: salemTvmStops,
    },
    {
      busNumber: 'SB-202',
      busName: 'Salem-TVM Superfast Express',
      source: 'Salem',
      destination: 'Thiruvananthapuram',
      departureTime: '07:30',
      arrivalTime: '19:30',
      fare: 1630,
      totalSeats: 45,
      availableSeats: 40,
      status: 'active',
      route: 'Salem - Namakkal - Karur - Dindigul - Madurai - Virudhunagar - Tirunelveli - Nagercoil - Thiruvananthapuram',
      stopsWithFares: salemTvmStops,
    },
    {
      busNumber: 'SB-303',
      busName: 'Salem-TVM AC Multi-Axle',
      source: 'Salem',
      destination: 'Thiruvananthapuram',
      departureTime: '21:00',
      arrivalTime: '10:30',
      fare: 2370,
      totalSeats: 40,
      availableSeats: 35,
      status: 'active',
      route: 'Salem - Namakkal - Karur - Dindigul - Madurai - Virudhunagar - Tirunelveli - Nagercoil - Thiruvananthapuram',
      stopsWithFares: salemTvmStops,
    },
    {
      busNumber: 'BUS-101',
      busName: 'Salem Express',
      source: 'Salem',
      destination: 'Chennai',
      departureTime: '06:00',
      arrivalTime: '11:30',
      fare: 240,
      totalSeats: 40,
      availableSeats: 28,
      status: 'active',
      route: 'Salem - Dharmapuri - Krishnagiri - Vellore - Kanchipuram - Chennai',
      stopsWithFares: [
        { stopName: 'Salem', distance: 0, order: 1 },
        { stopName: 'Dharmapuri', distance: 65, order: 2 },
        { stopName: 'Krishnagiri', distance: 115, order: 3 },
        { stopName: 'Vellore', distance: 205, order: 4 },
        { stopName: 'Kanchipuram', distance: 275, order: 5 },
        { stopName: 'Chennai', distance: 345, order: 6 },
      ],
    },
    {
      busNumber: 'BUS-102',
      busName: 'Coimbatore Fast',
      source: 'Salem',
      destination: 'Coimbatore',
      departureTime: '07:30',
      arrivalTime: '10:30',
      fare: 130,
      totalSeats: 40,
      availableSeats: 15,
      status: 'active',
      route: 'Salem - Sankagiri - Erode - Tirupur - Coimbatore',
      stopsWithFares: [
        { stopName: 'Salem', distance: 0, order: 1 },
        { stopName: 'Sankagiri', distance: 38, order: 2 },
        { stopName: 'Erode', distance: 65, order: 3 },
        { stopName: 'Tirupur', distance: 115, order: 4 },
        { stopName: 'Coimbatore', distance: 165, order: 5 },
      ],
    },
    {
      busNumber: 'BUS-103',
      busName: 'Trichy Superfast',
      source: 'Salem',
      destination: 'Trichy',
      departureTime: '08:00',
      arrivalTime: '11:00',
      fare: 120,
      totalSeats: 40,
      availableSeats: 32,
      status: 'active',
      route: 'Salem - Rasipuram - Namakkal - Musiri - Trichy',
      stopsWithFares: [
        { stopName: 'Salem', distance: 0, order: 1 },
        { stopName: 'Rasipuram', distance: 28, order: 2 },
        { stopName: 'Namakkal', distance: 52, order: 3 },
        { stopName: 'Musiri', distance: 105, order: 4 },
        { stopName: 'Trichy', distance: 145, order: 5 },
      ],
    },
    {
      busNumber: 'BUS-104',
      busName: 'Madurai Express',
      source: 'Chennai',
      destination: 'Madurai',
      departureTime: '09:00',
      arrivalTime: '17:00',
      fare: 380,
      totalSeats: 50,
      availableSeats: 40,
      status: 'active',
      route: 'Chennai - Chengalpattu - Tindivanam - Villupuram - Trichy - Dindigul - Madurai',
      stopsWithFares: [
        { stopName: 'Chennai', distance: 0, order: 1 },
        { stopName: 'Chengalpattu', distance: 55, order: 2 },
        { stopName: 'Tindivanam', distance: 120, order: 3 },
        { stopName: 'Villupuram', distance: 160, order: 4 },
        { stopName: 'Trichy', distance: 320, order: 5 },
        { stopName: 'Dindigul', distance: 415, order: 6 },
        { stopName: 'Madurai', distance: 460, order: 7 },
      ],
    },
    {
      busNumber: 'BUS-105',
      busName: 'Bangalore Night Express',
      source: 'Chennai',
      destination: 'Bangalore',
      departureTime: '22:00',
      arrivalTime: '05:30',
      fare: 420,
      totalSeats: 45,
      availableSeats: 20,
      status: 'active',
      route: 'Chennai - Sriperumbudur - Vellore - Ambur - Krishnagiri - Hosur - Bangalore',
      stopsWithFares: [
        { stopName: 'Chennai', distance: 0, order: 1 },
        { stopName: 'Sriperumbudur', distance: 40, order: 2 },
        { stopName: 'Vellore', distance: 138, order: 3 },
        { stopName: 'Ambur', distance: 188, order: 4 },
        { stopName: 'Krishnagiri', distance: 255, order: 5 },
        { stopName: 'Hosur', distance: 305, order: 6 },
        { stopName: 'Bangalore', distance: 350, order: 7 },
      ],
    },
    {
      busNumber: 'BUS-106',
      busName: 'Pondicherry Shuttle',
      source: 'Chennai',
      destination: 'Pondicherry',
      departureTime: '10:00',
      arrivalTime: '13:00',
      fare: 140,
      totalSeats: 35,
      availableSeats: 18,
      status: 'active',
      route: 'Chennai - Mahabalipuram - Kalpakkam - Marakkanam - Pondicherry',
      stopsWithFares: [
        { stopName: 'Chennai', distance: 0, order: 1 },
        { stopName: 'Mahabalipuram', distance: 55, order: 2 },
        { stopName: 'Kalpakkam', distance: 70, order: 3 },
        { stopName: 'Marakkanam', distance: 120, order: 4 },
        { stopName: 'Pondicherry', distance: 155, order: 5 },
      ],
    },
  ];

  for (const b of buses) {
    await prisma.bus.upsert({
      where: { busNumber: b.busNumber },
      update: {},
      create: b
    });
  }

  console.log('✅ Safe seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
