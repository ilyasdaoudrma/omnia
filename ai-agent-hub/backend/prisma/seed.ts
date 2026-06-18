import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seeds a demo user with sample trips, bookings, and notifications so the
 * /dashboard endpoint returns rich data out of the box. Replace DEMO_CLERK_ID
 * with your own Clerk user id to see it on your real account.
 */
const DEMO_CLERK_ID = process.env.DEMO_CLERK_ID ?? 'user_demo_seed';

async function main() {
  const user = await prisma.user.upsert({
    where: { clerkId: DEMO_CLERK_ID },
    create: { clerkId: DEMO_CLERK_ID, email: 'demo@agenthub.ai', firstName: 'Demo', lastName: 'User' },
    update: {},
  });

  // Clear prior demo data for idempotency.
  await prisma.itinerary.deleteMany({ where: { userId: user.id } });
  await prisma.booking.deleteMany({ where: { userId: user.id } });
  await prisma.notification.deleteMany({ where: { userId: user.id } });

  const rabat = await prisma.itinerary.create({
    data: {
      userId: user.id,
      title: 'Weekend in Rabat',
      location: 'Rabat, Morocco',
      startDate: new Date('2026-06-12'),
      endDate: new Date('2026-06-15'),
      budget: 3000,
      items: {
        create: [
          { day: 1, time: '14:00', title: 'Hotel check-in', detail: 'Oudayas Sea View Apartment', tool: 'travel', cost: 420, order: 0 },
          { day: 1, time: '15:30', title: 'Lunch', detail: 'Dar Naji', tool: 'restaurant', cost: 120, order: 1 },
          { day: 1, time: '17:00', title: 'Beach time', detail: 'Rabat beach', tool: 'maps', order: 2 },
          { day: 2, time: '09:30', title: 'Kasbah des Oudayas', detail: 'Walking tour', tool: 'maps', order: 3 },
        ],
      },
    },
  });

  await prisma.booking.createMany({
    data: [
      { userId: user.id, tool: 'travel', title: 'Oudayas Sea View', vendor: 'Medina Stays', total: 1260, status: 'confirmed' },
      { userId: user.id, tool: 'shopping', title: 'Beach Day Bundle', vendor: 'Casa Cart', total: 214, status: 'pending' },
    ],
  });

  await prisma.notification.createMany({
    data: [
      { userId: user.id, title: 'Stay confirmed', body: 'Oudayas Sea View booked for Jun 12–15.', tone: 'success' },
      { userId: user.id, title: 'Price drop', body: 'Your Casablanca ride dropped to 540 MAD.', tone: 'accent' },
      { userId: user.id, title: 'Confirm needed', body: 'Approve the Chefchaouen itinerary.', tone: 'warn' },
    ],
  });

  console.log(`Seeded demo user ${user.id} with itinerary ${rabat.id}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
