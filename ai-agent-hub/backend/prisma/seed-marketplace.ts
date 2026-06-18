import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const img = (s: string) => `https://images.unsplash.com/${s}?auto=format&fit=crop&w=600&q=70`;

const STAY_IMAGES = [
  'photo-1502672260266-1c1ef2d93688',
  'photo-1522708323590-d24dbb6b0267',
  'photo-1564013799919-ab600027ffc6',
  'photo-1505693416388-ac5ce068fe85',
  'photo-1493809842364-78817add7ffb',
  'photo-1560448204-e02f11c3d0e2',
];
const FOOD_IMAGES = [
  'photo-1568901346375-23c9450c58cd',
  'photo-1551183053-bf91a1d81141',
  'photo-1414235077428-338989a2e8c0',
  'photo-1466978913421-dad2ebd01d17',
];
const DISH_IMAGES = [
  'photo-1568901346375-23c9450c58cd',
  'photo-1565299624946-b28f40a0ae38',
  'photo-1604908176997-125f25cc6f3d',
  'photo-1607330289024-1535c6b4e1c1',
];

const CITIES = ['Marrakech', 'Casablanca', 'Rabat', 'Tanger', 'Fès'];

const STAY_TYPES = [
  { t: 'Riad', area: 'Medina', price: 380, guests: 4, beds: 2, am: ['Rooftop terrace', 'Plunge pool', 'Breakfast'] },
  { t: 'Sea View Apartment', area: 'Corniche', price: 460, guests: 3, beds: 1, am: ['Sea view', 'Balcony', 'Wi-Fi'] },
  { t: 'Design Loft', area: 'Gueliz', price: 520, guests: 2, beds: 1, am: ['AC', 'Workspace', 'Smart TV'] },
  { t: 'Family Villa', area: 'Palmeraie', price: 690, guests: 6, beds: 3, am: ['Private pool', 'Garden', 'Parking'] },
  { t: 'Cozy Studio', area: 'Centre-ville', price: 290, guests: 2, beds: 1, am: ['Kitchenette', 'Wi-Fi', 'Free cancellation'] },
];

const VENDORS = [
  { n: 'Smashed & Co', cuisine: 'Burgers', fee: 0, eta: 25, items: [['Double Smash Combo', 72], ['Classic Cheeseburger', 55], ['Crispy Chicken', 60], ['Loaded Fries', 35]] },
  { n: 'Dar Tagine', cuisine: 'Moroccan', fee: 10, eta: 35, items: [['Lamb Tagine', 95], ['Chicken Couscous', 85], ['Pastilla', 70], ['Mint Tea', 15]] },
  { n: 'Sushi Bar Atlas', cuisine: 'Japanese', fee: 15, eta: 40, items: [['Salmon Set (12pc)', 140], ['Spicy Tuna Roll', 75], ['Edamame', 30], ['Miso Soup', 25]] },
  { n: 'Napoli Pizza', cuisine: 'Italian', fee: 0, eta: 30, items: [['Margherita', 65], ['Pepperoni', 80], ['Quattro Formaggi', 90], ['Tiramisu', 40]] },
];

async function main() {
  await prisma.foodMenuItem.deleteMany({});
  await prisma.foodVendor.deleteMany({});
  await prisma.stayListing.deleteMany({});

  let stayCount = 0;
  let vendorCount = 0;

  for (const city of CITIES) {
    // Stays
    for (let i = 0; i < STAY_TYPES.length; i++) {
      const s = STAY_TYPES[i];
      const jitter = (i * 13 + city.length * 7) % 60;
      await prisma.stayListing.create({
        data: {
          title: `${s.t} · ${city}`,
          city,
          country: 'Morocco',
          neighborhood: s.area,
          pricePerNight: s.price + jitter,
          maxGuests: s.guests,
          bedrooms: s.beds,
          rating: Math.round((4.3 + ((i * 7) % 6) / 10) * 10) / 10,
          amenities: s.am,
          image: img(STAY_IMAGES[i % STAY_IMAGES.length]),
          description: `A ${s.t.toLowerCase()} in ${s.area}, ${city}. Sleeps ${s.guests}.`,
        },
      });
      stayCount++;
    }

    // Food vendors + menus
    for (let v = 0; v < VENDORS.length; v++) {
      const ven = VENDORS[v];
      await prisma.foodVendor.create({
        data: {
          name: `${ven.n} — ${city}`,
          city,
          cuisine: ven.cuisine,
          rating: Math.round((4.4 + ((v * 5) % 5) / 10) * 10) / 10,
          deliveryFee: ven.fee,
          etaMinutes: ven.eta,
          image: img(FOOD_IMAGES[v % FOOD_IMAGES.length]),
          items: {
            create: ven.items.map(([name, price], idx) => ({
              name: name as string,
              price: price as number,
              image: img(DISH_IMAGES[idx % DISH_IMAGES.length]),
            })),
          },
        },
      });
      vendorCount++;
    }
  }

  console.log(`Seeded ${stayCount} stays and ${vendorCount} food vendors across ${CITIES.length} cities.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
