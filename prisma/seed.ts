import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const CINEMA_ID  = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5';
const STUDIO_ID  = 'b2c3d4e5-f6a7-4b8c-9d0e-f1a2b3c4d5e6';
const ADMIN_ID   = 'c3d4e5f6-a7b8-4c9d-0e1f-a2b3c4d5e6f7';

async function main(): Promise<void> {
  console.log('🌱 Seeding...');

  // Admin user
  const adminPassword = await bcrypt.hash('Admin123!', 12);
  await prisma.user.upsert({
    where: { id: ADMIN_ID },
    update: {},
    create: {
      id: ADMIN_ID,
      name: 'Admin Cinema',
      email: 'admin@cinema.com',
      passwordHash: adminPassword,
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log('✅ Admin: admin@cinema.com / Admin123!');

  // Cinema
  const cinema = await prisma.cinema.upsert({
    where: { id: CINEMA_ID },
    update: {},
    create: {
      id: CINEMA_ID,
      name: 'CGV Senayan City',
      address: 'Jl. Asia Afrika No.19, Senayan',
      city: 'Jakarta',
      phone: '021-72781537',
      latitude: -6.2293,
      longitude: 106.7997,
    },
  });

  // Studio — tanpa capacity
  const studio = await prisma.studio.upsert({
    where: { id: STUDIO_ID },
    update: {},
    create: {
      id: STUDIO_ID,
      cinemaId: cinema.id,
      name: 'Studio 1',
      type: 'REGULAR',
    },
  });

  // Seats — baris A-F, 10 kursi per baris
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

  const seatCount = await prisma.seat.count({ where: { studioId: STUDIO_ID } });
  console.log(`✅ Cinema : ${cinema.name}`);
  console.log(`✅ Studio : ${studio.name}`);
  console.log(`✅ Seats  : ${seatCount} kursi`);
  console.log('🎉 Seeding selesai!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());