import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Updating bus NS893 route data and fares...');

  const stops = [
    { stopName: 'Salem', distance: 0, fare: 0, order: 1 },
    { stopName: 'Namakkal', distance: 52, fare: 105, order: 2 },
    { stopName: 'Karur', distance: 97, fare: 195, order: 3 },
    { stopName: 'Dindigul', distance: 202, fare: 405, order: 4 },
    { stopName: 'Madurai', distance: 267, fare: 535, order: 5 },
    { stopName: 'Virudhunagar', distance: 315, fare: 630, order: 6 },
    { stopName: 'Tirunelveli', distance: 440, fare: 880, order: 7 },
    { stopName: 'Nagercoil', distance: 523, fare: 1045, order: 8 },
    { stopName: 'Thiruvananthapuram', distance: 593, fare: 1185, order: 9 }
  ];

  // Update NS893 in database (or create if it doesn't exist)
  const bus = await prisma.bus.upsert({
    where: { busNumber: 'NS893' },
    update: {
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
      stopsWithFares: stops,
    },
    create: {
      busNumber: 'NS893',
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
      stopsWithFares: stops,
    }
  });

  console.log('✅ Bus NS893 updated successfully:', bus);
}

main()
  .catch((e) => {
    console.error('❌ Update failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
