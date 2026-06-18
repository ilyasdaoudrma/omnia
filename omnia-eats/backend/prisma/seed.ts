import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const img = (s: string) => `https://images.unsplash.com/${s}?auto=format&fit=crop&w=800&q=70`;

const VENDOR_IMG: Record<string, string> = {
  Burgers: 'photo-1568901346375-23c9450c58cd',
  Moroccan: 'photo-1414235077428-338989a2e8c0',
  Japanese: 'photo-1579871494447-9811cf80d66c',
  Italian: 'photo-1513104890138-7c749659a591',
  Healthy: 'photo-1512621776951-a57141f2eefd',
};
const DISH_IMG = ['photo-1568901346375-23c9450c58cd', 'photo-1565299624946-b28f40a0ae38', 'photo-1604908176997-125f25cc6f3d', 'photo-1551183053-bf91a1d81141', 'photo-1546069901-ba9599a7e63c'];

const CITIES = ['Rabat', 'Casablanca', 'Oujda', 'Tanger', 'Marrakech', 'Agadir'];

const VENDORS = [
  { n: 'Smashed & Co', cuisine: 'Burgers', fee: 0, eta: 25, items: [['Double Smash Combo', 72], ['Classic Cheeseburger', 55], ['Crispy Chicken Burger', 60], ['Loaded Fries', 35], ['Milkshake', 30]] },
  { n: 'Dar Tagine', cuisine: 'Moroccan', fee: 10, eta: 35, items: [['Lamb Tagine', 95], ['Chicken Couscous', 85], ['Pastilla', 70], ['Harira Soup', 25], ['Mint Tea', 15]] },
  { n: 'Sakura', cuisine: 'Japanese', fee: 15, eta: 40, items: [['Salmon Set (12pc)', 140], ['Spicy Tuna Roll', 75], ['Chicken Teriyaki', 90], ['Edamame', 30], ['Miso Soup', 25]] },
  { n: 'Napoli', cuisine: 'Italian', fee: 0, eta: 30, items: [['Margherita', 65], ['Pepperoni', 80], ['Quattro Formaggi', 90], ['Pasta Alfredo', 75], ['Tiramisu', 40]] },
  { n: 'Green Bowl', cuisine: 'Healthy', fee: 12, eta: 28, items: [['Poke Bowl', 85], ['Caesar Salad', 60], ['Avocado Toast', 45], ['Fresh Juice', 28], ['Acai Bowl', 55]] },
];

// Supplements every kitchen carries — sides, sodas, water, juices + a few fancy
// drinks. Lets a customer (and the agent) add a Coke, fries, an orange juice, etc.
// to any order. [name, price, category]
const SUPPLEMENTS: [string, number, string][] = [
  ['Fries', 22, 'Sides'],
  ['Onion Rings', 28, 'Sides'],
  ['Garlic Bread', 26, 'Sides'],
  ['Coca-Cola', 12, 'Drinks'],
  ['Coca-Cola Zero', 12, 'Drinks'],
  ['Sprite', 12, 'Drinks'],
  ['Fanta Orange', 12, 'Drinks'],
  ['Hawai', 14, 'Drinks'],
  ['Still Water', 8, 'Drinks'],
  ['Sparkling Water', 12, 'Drinks'],
  ['Fresh Orange Juice', 24, 'Drinks'],
  ['Mint Lemonade', 20, 'Drinks'],
  ['Virgin Mojito', 34, 'Drinks'],
  ['Iced Latte', 26, 'Drinks'],
  ['Avocado Smoothie', 36, 'Drinks'],
];

async function main() {
  await prisma.order.deleteMany({});
  await prisma.menuItem.deleteMany({});
  await prisma.vendor.deleteMany({});

  let v = 0;
  for (let c = 0; c < CITIES.length; c++) {
    const city = CITIES[c];
    for (let i = 0; i < VENDORS.length; i++) {
      const ven = VENDORS[i];
      await prisma.vendor.create({
        data: {
          name: `${ven.n} · ${city}`,
          city,
          cuisine: ven.cuisine,
          rating: Math.round((4.3 + (((i * 5 + c * 3) % 6) / 10)) * 10) / 10,
          deliveryFee: ven.fee,
          etaMinutes: ven.eta + ((c * 2) % 10),
          image: img(VENDOR_IMG[ven.cuisine]),
          description: `${ven.cuisine} favourites, freshly prepared in ${city}.`,
          items: {
            create: [
              ...ven.items.map(([name, price], idx) => ({
                name: name as string,
                price: price as number,
                category: ven.cuisine,
                image: img(DISH_IMG[idx % DISH_IMG.length]),
              })),
              // Sides + drinks available at every kitchen.
              ...SUPPLEMENTS.map(([name, price, category]) => ({
                name: name as string,
                price: price as number,
                category: category as string,
              })),
            ],
          },
        },
      });
      v++;
    }
  }
  console.log(`Seeded ${v} vendors across ${CITIES.length} cities.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
