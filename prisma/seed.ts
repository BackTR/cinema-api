import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// UUID v4 valid
const CINEMA_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5';
const STUDIO_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-f1a2b3c4d5e6';

async function main(): Promise<void> {
  console.log('Seeding...');

  const cinema = await prisma.cinema.upsert({
    where: { id: CINEMA_ID },
    update: {},
    create: {
      id: CINEMA_ID,
      name: 'CGV Senayan City',
      address: 'Jl. Asia Afrika No.19, Senayan',
      city: 'Jakarta',
      phone: '021-72781537',
    },
  });

  const studio = await prisma.studio.upsert({
    where: { id: STUDIO_ID },
    update: {},
    create: {
      id: STUDIO_ID,
      cinemaId: cinema.id,
      name: 'Studio 1',
      capacity: 60,
      type: 'REGULAR',
    },
  });

  const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
  for (const row of rows) {
    for (let num = 1; num <= 10; num++) {
      await prisma.seat.upsert({
        where: {
          studioId_rowLabel_seatNumber: {
            studioId: studio.id,
            rowLabel: row,
            seatNumber: num,
          },
        },
        update: {},
        create: {
          studioId: studio.id,
          rowLabel: row,
          seatNumber: num,
          type: ['E', 'F'].includes(row) ? 'VIP' : 'REGULAR',
        },
      });
    }
  }

  console.log(`✅ Cinema ID : ${cinema.id}`);
  console.log(`✅ Studio ID : ${studio.id}`);
  console.log(`✅ Seats     : ${rows.length * 10} kursi dibuat`);
  console.log('Seeding selesai!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());