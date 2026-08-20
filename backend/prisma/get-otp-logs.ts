import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Querying latest System Logs for OTP codes...');

  const logs = await prisma.systemLog.findMany({
    where: {
      message: {
        contains: 'OTP code generated'
      }
    },
    orderBy: {
      timestamp: 'desc'
    },
    take: 5
  });

  if (logs.length === 0) {
    console.log('No OTP logs found.');
  } else {
    logs.forEach(log => {
      console.log(`[${log.timestamp.toLocaleString('en-IN')}] ${log.message}`);
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
