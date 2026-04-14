import mongoose from 'mongoose';
import { connectDB } from './config/db';
import { Category } from './models/Category';
import { FilterAttribute } from './models/FilterAttribute';
import { Listing } from './models/Listing';
import { User } from './models/User';
import { hashPassword } from './utils/hash';
import { createCategory } from './services/categoryService';

type CategoryNode = {
  name: string;
  slug: string;
  parentSlug?: string;
};

const categories: CategoryNode[] = [
  { name: 'Cars', slug: 'cars' },
  { name: 'SUV', slug: 'cars-suv', parentSlug: 'cars' },
  { name: 'Sedan', slug: 'cars-sedan', parentSlug: 'cars' },
  { name: 'MPV', slug: 'cars-mpv', parentSlug: 'cars' },
  { name: '7-Seater', slug: 'cars-7-seater', parentSlug: 'cars-suv' },
  { name: 'Motorcycles', slug: 'motorcycles' },
  { name: 'Scooter', slug: 'motorcycles-scooter', parentSlug: 'motorcycles' },
  { name: 'Sport Bike', slug: 'motorcycles-sport', parentSlug: 'motorcycles' },
];

const makes = ['Toyota', 'Honda', 'Suzuki', 'Nissan', 'Daihatsu', 'BMW', 'Mercedes'];
const models = ['Avanza', 'Civic', 'Ertiga', 'Xenia', 'Fortuner', 'HR-V', 'X-Trail', 'Ciaz'];
const motorcycleModels = ['Vario', 'NMAX', 'CBR', 'GSX', 'PCX', 'Scoopy'];
const colors = ['Black', 'White', 'Silver', 'Red', 'Blue', 'Grey'];
const cities = ['Jakarta', 'Bandung', 'Surabaya', 'Medan', 'Makassar', 'Denpasar', 'Yogyakarta'];

function randomFrom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function ensureCategory(node: CategoryNode, categoryMap: Map<string, string>) {
  const existing = await Category.findOne({ slug: node.slug });
  if (existing) {
    categoryMap.set(node.slug, String(existing._id));
    return existing;
  }
  const parentId = node.parentSlug ? categoryMap.get(node.parentSlug) : undefined;
  const created = await createCategory({ name: node.name, slug: node.slug, parentId });
  categoryMap.set(node.slug, String(created._id));
  return created;
}

async function ensureFilterAttributes(categoryMap: Map<string, string>) {
  const carCategoryId = categoryMap.get('cars');
  const motorcycleCategoryId = categoryMap.get('motorcycles');

  if (carCategoryId) {
    await FilterAttribute.updateOne(
      { categoryId: carCategoryId, key: 'driveType' },
      {
        $set: {
          label: 'Drive Type',
          type: 'enum',
          options: ['FWD', 'RWD', 'AWD'],
        },
      },
      { upsert: true }
    );
    await FilterAttribute.updateOne(
      { categoryId: carCategoryId, key: 'seats' },
      {
        $set: {
          label: 'Seats',
          type: 'range',
          range: { min: 2, max: 8 },
        },
      },
      { upsert: true }
    );
    await FilterAttribute.updateOne(
      { categoryId: carCategoryId, key: 'sunroof' },
      {
        $set: {
          label: 'Sunroof',
          type: 'boolean',
        },
      },
      { upsert: true }
    );
  }

  if (motorcycleCategoryId) {
    await FilterAttribute.updateOne(
      { categoryId: motorcycleCategoryId, key: 'engineCC' },
      {
        $set: {
          label: 'Engine CC',
          type: 'range',
          range: { min: 110, max: 1000 },
        },
      },
      { upsert: true }
    );
    await FilterAttribute.updateOne(
      { categoryId: motorcycleCategoryId, key: 'bikeType' },
      {
        $set: {
          label: 'Bike Type',
          type: 'enum',
          options: ['Scooter', 'Sport', 'Cruiser'],
        },
      },
      { upsert: true }
    );
  }
}

async function ensureUsers() {
  const adminEmail = 'admin@otomotif.local';
  const sellerEmail = 'seller@otomotif.local';
  const buyerEmail = 'buyer@otomotif.local';

  const admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    await User.create({
      name: 'Admin',
      email: adminEmail,
      passwordHash: await hashPassword('Admin123!'),
      role: 'admin',
    });
  }

  const seller = await User.findOne({ email: sellerEmail });
  if (!seller) {
    await User.create({
      name: 'Seller One',
      email: sellerEmail,
      passwordHash: await hashPassword('Seller123!'),
      role: 'seller',
      city: randomFrom(cities),
    });
  }

  const buyer = await User.findOne({ email: buyerEmail });
  if (!buyer) {
    await User.create({
      name: 'Buyer One',
      email: buyerEmail,
      passwordHash: await hashPassword('Buyer123!'),
      role: 'buyer',
      city: randomFrom(cities),
    });
  }

  const sellers = await User.find({ role: 'seller' });
  if (sellers.length < 5) {
    const newSellers = [];
    for (let i = sellers.length; i < 5; i += 1) {
      newSellers.push({
        name: `Seller ${i + 1}`,
        email: `seller${i + 1}@otomotif.local`,
        passwordHash: await hashPassword('Seller123!'),
        role: 'seller',
        city: randomFrom(cities),
      });
    }
    if (newSellers.length) {
      await User.insertMany(newSellers);
    }
  }
}

async function seedListings(categoryMap: Map<string, string>) {
  const sellers = await User.find({ role: 'seller' }).lean();
  if (sellers.length === 0) {
    throw new Error('No sellers found');
  }

  const categoryIds = Array.from(categoryMap.values());
  const listings: Record<string, unknown>[] = [];
  const total = 550;

  for (let i = 0; i < total; i += 1) {
    const isMotorcycle = Math.random() < 0.3;
    const make = randomFrom(makes);
    const model = isMotorcycle ? randomFrom(motorcycleModels) : randomFrom(models);
    const year = randomNumber(2005, 2024);
    const mileage = randomNumber(5000, 180000);
    const price = isMotorcycle ? randomNumber(8000000, 70000000) : randomNumber(70000000, 800000000);
    const condition = Math.random() < 0.8 ? 'used' : 'new';
    const transmission = Math.random() < 0.7 ? 'automatic' : 'manual';
    const fuelType = Math.random() < 0.2 ? 'diesel' : 'gasoline';
    const color = randomFrom(colors);
    const seller = randomFrom(sellers);
    const categoryId = randomFrom(categoryIds);

    const attributes = isMotorcycle
      ? [
          { key: 'engineCC', type: 'range', valueNumber: randomNumber(110, 1000) },
          { key: 'bikeType', type: 'enum', valueString: randomFrom(['Scooter', 'Sport', 'Cruiser']) },
        ]
      : [
          { key: 'driveType', type: 'enum', valueString: randomFrom(['FWD', 'RWD', 'AWD']) },
          { key: 'seats', type: 'range', valueNumber: randomNumber(2, 8) },
          { key: 'sunroof', type: 'boolean', valueBoolean: Math.random() > 0.7 },
        ];

    listings.push({
      sellerId: seller._id,
      categoryId,
      title: `${make} ${model} ${year}`,
      description: `Unit ${make} ${model} tahun ${year}, kondisi terawat.`,
      make,
      model,
      year,
      mileage,
      price,
      condition,
      transmission,
      fuelType,
      color,
      images: [],
      location: { city: randomFrom(cities), country: 'Indonesia' },
      status: Math.random() < 0.85 ? 'available' : 'pending',
      attributes,
    });
  }

  await Listing.insertMany(listings);
}

async function run() {
  await connectDB();

  if (process.argv.includes('--reset')) {
    await Promise.all([Listing.deleteMany({}), FilterAttribute.deleteMany({}), Category.deleteMany({})]);
  }

  const categoryMap = new Map<string, string>();
  for (const node of categories) {
    await ensureCategory(node, categoryMap);
  }

  await ensureFilterAttributes(categoryMap);
  await ensureUsers();

  const listingCount = await Listing.countDocuments();
  if (listingCount < 500) {
    await seedListings(categoryMap);
  }

  console.log('Seed completed');
  await mongoose.disconnect();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
