import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
// Car photos served by the OMNIA Rides backend itself (public/cars), so they
// don't depend on the frontend being up. The stored origin is rewritten at
// response time by resolveAssetUrl, so PUBLIC_BASE_URL here is only a sensible
// default for fresh seeds; deployed hosts override it via env at request time.
const ASSET_BASE = (process.env.PUBLIC_BASE_URL || 'http://localhost:3003').replace(/\/+$/, '');
const img = (file: string) => `${ASSET_BASE}/cars/${file}`;

const CITIES = ['Rabat', 'Casablanca', 'Oujda', 'Tanger', 'Marrakech', 'Agadir'];

// Ride tiers offered in every city, cheapest → priciest.
// Fare = baseFare + perKm·km + perMin·min.
const CLASSES = [
  { name: 'OMNIA Economy', vehicle: 'Dacia Sandero', base: 7, perKm: 2.2, perMin: 0.3, eta: 4, seats: 4, img: 'sandero.webp', desc: 'Affordable everyday rides, door to door.' },
  { name: 'OMNIA City', vehicle: 'Peugeot 208', base: 10, perKm: 2.8, perMin: 0.4, eta: 4, seats: 4, img: 'peugeot-208.avif', desc: 'Zippy and comfortable for city hops.' },
  { name: 'OMNIA SUV', vehicle: 'Hyundai Tucson', base: 15, perKm: 3.5, perMin: 0.5, eta: 5, seats: 5, img: 'tucson.jpg', desc: 'Spacious SUV — room for the group and the luggage.' },
  { name: 'OMNIA Prestige', vehicle: 'Mercedes GLC', base: 22, perKm: 4.5, perMin: 0.6, eta: 5, seats: 5, img: 'mercedes-glc.avif', desc: 'Premium SUV comfort with a professional chauffeur.' },
  { name: 'OMNIA Luxury', vehicle: 'BMW X6', base: 30, perKm: 5.5, perMin: 0.7, eta: 6, seats: 5, img: 'bmw-x6.webp', desc: 'Luxury coupé-SUV — arrive in style.' },
  { name: 'OMNIA Elite', vehicle: 'Porsche Cayenne', base: 40, perKm: 7.0, perMin: 0.9, eta: 7, seats: 4, img: 'porsche-cayenne.webp', desc: 'Our flagship Porsche — the ultimate ride.' },
];

async function main() {
  await prisma.ride.deleteMany({});
  await prisma.rideClass.deleteMany({});

  let n = 0;
  for (let c = 0; c < CITIES.length; c++) {
    const city = CITIES[c];
    for (let i = 0; i < CLASSES.length; i++) {
      const k = CLASSES[i];
      await prisma.rideClass.create({
        data: {
          city,
          name: `${k.name} · ${city}`,
          vehicle: k.vehicle,
          baseFare: k.base,
          perKm: k.perKm,
          perMin: k.perMin,
          etaMinutes: k.eta + ((c * 1) % 4),
          seats: k.seats,
          rating: Math.round((4.4 + (((i * 4 + c * 3) % 6) / 10)) * 10) / 10,
          image: img(k.img),
          description: k.desc,
        },
      });
      n++;
    }
  }
  console.log(`Seeded ${n} ride classes across ${CITIES.length} cities.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
