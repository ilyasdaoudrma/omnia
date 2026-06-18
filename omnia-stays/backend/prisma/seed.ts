import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const img = (s: string) => `https://images.unsplash.com/${s}?auto=format&fit=crop&w=900&q=70`;

const PHOTO_SETS = [
  ['photo-1502672260266-1c1ef2d93688', 'photo-1560448204-e02f11c3d0e2', 'photo-1505693416388-ac5ce068fe85'],
  ['photo-1522708323590-d24dbb6b0267', 'photo-1493809842364-78817add7ffb', 'photo-1484154218962-a197022b5858'],
  ['photo-1564013799919-ab600027ffc6', 'photo-1554995207-c18c203602cb', 'photo-1556912172-45b7abe8b7e1'],
  ['photo-1505691938895-1758d7feb511', 'photo-1502005229762-cf1b2da7c5d6', 'photo-1560185007-cde436f6a4d0'],
];

const CITIES: Record<string, string[]> = {
  Rabat: ['Kasbah des Oudayas', 'Agdal', 'Hassan', 'Souissi'],
  Casablanca: ['Ain Diab', 'Gauthier', 'Maarif', 'Corniche'],
  Oujda: ['Centre-ville', 'Al Qods', 'Sidi Yahya', 'Boudir'],
  Tanger: ['Marshan', 'Malabata', 'Medina', 'Iberia'],
  Marrakech: ['Medina', 'Gueliz', 'Palmeraie', 'Hivernage'],
  Agadir: ['Founty', 'Marina', 'Talborjt', 'Sonaba'],
};

const TYPES = [
  { type: 'Riad', base: 380, guests: 4, beds: 2, baths: 2, beds2: 3, am: ['Rooftop terrace', 'Plunge pool', 'Breakfast', 'AC', 'Wi-Fi'] },
  { type: 'Sea View Apartment', base: 460, guests: 3, beds: 1, baths: 1, beds2: 2, am: ['Sea view', 'Balcony', 'Wi-Fi', 'Kitchen'] },
  { type: 'Design Loft', base: 520, guests: 2, beds: 1, baths: 1, beds2: 1, am: ['AC', 'Workspace', 'Smart TV', 'Wi-Fi', 'Elevator'] },
  { type: 'Family Villa', base: 690, guests: 6, beds: 3, baths: 3, beds2: 4, am: ['Private pool', 'Garden', 'Parking', 'BBQ', 'AC'] },
  { type: 'Cozy Studio', base: 290, guests: 2, beds: 1, baths: 1, beds2: 1, am: ['Kitchenette', 'Wi-Fi', 'Free cancellation', 'Self check-in'] },
  { type: 'Medina Guesthouse', base: 340, guests: 4, beds: 2, baths: 2, beds2: 2, am: ['Patio', 'Breakfast', 'Wi-Fi', 'Terrace'] },
];

const HOSTS = ['Yasmine', 'Omar', 'Lina', 'Reda', 'Salma', 'Karim'];

async function main() {
  await prisma.booking.deleteMany({});
  await prisma.listing.deleteMany({});

  let count = 0;
  const cityNames = Object.keys(CITIES);
  for (let c = 0; c < cityNames.length; c++) {
    const city = cityNames[c];
    const areas = CITIES[city];
    for (let i = 0; i < TYPES.length; i++) {
      const t = TYPES[i];
      const jitter = ((i + 1) * 17 + c * 23) % 90;
      const photos = PHOTO_SETS[(i + c) % PHOTO_SETS.length];
      await prisma.listing.create({
        data: {
          title: `${t.type} in ${areas[i % areas.length]}`,
          city,
          neighborhood: areas[i % areas.length],
          type: t.type,
          pricePerNight: t.base + jitter,
          maxGuests: t.guests,
          bedrooms: t.beds,
          beds: t.beds2,
          baths: t.baths,
          rating: Math.round((4.3 + (((i * 7 + c * 3) % 6) / 10)) * 10) / 10,
          reviews: 12 + ((i * 13 + c * 7) % 180),
          amenities: t.am,
          images: photos.map(img),
          description: `A beautiful ${t.type.toLowerCase()} in ${areas[i % areas.length]}, ${city}. Sleeps up to ${t.guests} guests across ${t.beds} bedroom(s). Thoughtfully designed, walkable to the best of the neighborhood.`,
          host: HOSTS[(i + c) % HOSTS.length],
        },
      });
      count++;
    }
  }
  console.log(`Seeded ${count} stay listings across ${cityNames.length} cities.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
