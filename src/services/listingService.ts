import mongoose from 'mongoose';
import { Listing } from '../models/Listing';
import { AppError } from '../utils/errors';
import { buildCursorFilter, decodeCursor, encodeCursor, SortDirection } from '../utils/pagination';

export interface ListingFilters {
  q?: string;
  make?: string;
  model?: string;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  mileageMin?: number;
  mileageMax?: number;
  condition?: string;
  transmission?: string;
  fuelType?: string;
  color?: string;
  status?: string;
  city?: string;
  sellerId?: string;
  categoryIds?: string[];
  attributes?: Record<string, string>;
}

export interface ListingListOptions {
  filters: ListingFilters;
  limit: number;
  cursor?: string;
  sortField: string;
  sortDir: SortDirection;
}

function parseAttributeValue(raw: string) {
  const trimmed = raw.trim();
  if (trimmed.includes('-')) {
    const [minRaw, maxRaw] = trimmed.split('-', 2);
    const min = Number.parseFloat(minRaw);
    const max = Number.parseFloat(maxRaw);
    if (!Number.isNaN(min) && !Number.isNaN(max)) {
      return { type: 'range' as const, min, max };
    }
  }
  if (trimmed === 'true' || trimmed === 'false') {
    return { type: 'boolean' as const, value: trimmed === 'true' };
  }
  const asNumber = Number.parseFloat(trimmed);
  if (!Number.isNaN(asNumber) && Number.isFinite(asNumber)) {
    return { type: 'number' as const, value: asNumber };
  }
  return { type: 'string' as const, value: trimmed };
}

function buildListingQuery(filters: ListingFilters): Record<string, unknown> {
  const query: Record<string, unknown> = {
    isRemoved: false,
    status: { $ne: 'removed' },
  };

  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.sellerId) {
    query.sellerId = new mongoose.Types.ObjectId(filters.sellerId);
  }
  if (filters.categoryIds && filters.categoryIds.length > 0) {
    query.categoryId = { $in: filters.categoryIds.map((id) => new mongoose.Types.ObjectId(id)) };
  }
  if (filters.make) query.make = filters.make;
  if (filters.model) query.model = filters.model;
  if (filters.condition) query.condition = filters.condition;
  if (filters.transmission) query.transmission = filters.transmission;
  if (filters.fuelType) query.fuelType = filters.fuelType;
  if (filters.color) query.color = filters.color;
  if (filters.city) query['location.city'] = filters.city;

  if (filters.yearMin || filters.yearMax) {
    query.year = {};
    if (filters.yearMin) (query.year as Record<string, number>).$gte = filters.yearMin;
    if (filters.yearMax) (query.year as Record<string, number>).$lte = filters.yearMax;
  }
  if (filters.priceMin || filters.priceMax) {
    query.price = {};
    if (filters.priceMin) (query.price as Record<string, number>).$gte = filters.priceMin;
    if (filters.priceMax) (query.price as Record<string, number>).$lte = filters.priceMax;
  }
  if (filters.mileageMin || filters.mileageMax) {
    query.mileage = {};
    if (filters.mileageMin) (query.mileage as Record<string, number>).$gte = filters.mileageMin;
    if (filters.mileageMax) (query.mileage as Record<string, number>).$lte = filters.mileageMax;
  }

  if (filters.q) {
    query.$text = { $search: filters.q };
  }

  const attributeFilters: Record<string, unknown>[] = [];
  if (filters.attributes) {
    for (const [key, rawValue] of Object.entries(filters.attributes)) {
      const parsed = parseAttributeValue(String(rawValue));
      if (parsed.type === 'range') {
        attributeFilters.push({
          attributes: {
            $elemMatch: {
              key,
              valueNumber: { $gte: parsed.min, $lte: parsed.max },
            },
          },
        });
      } else if (parsed.type === 'boolean') {
        attributeFilters.push({
          attributes: {
            $elemMatch: {
              key,
              valueBoolean: parsed.value,
            },
          },
        });
      } else if (parsed.type === 'number') {
        attributeFilters.push({
          attributes: {
            $elemMatch: {
              key,
              valueNumber: parsed.value,
            },
          },
        });
      } else {
        attributeFilters.push({
          attributes: {
            $elemMatch: {
              key,
              valueString: parsed.value,
            },
          },
        });
      }
    }
  }

  if (attributeFilters.length > 0) {
    query.$and = attributeFilters;
  }

  return query;
}

export async function listListings(options: ListingListOptions) {
  const query = buildListingQuery(options.filters);
  let finalQuery: Record<string, unknown> = { ...query };

  if (options.cursor) {
    const decoded = decodeCursor(options.cursor);
    if (!decoded) {
      throw new AppError(400, 'Invalid cursor');
    }
    const cursorFilter = buildCursorFilter(options.sortField, options.sortDir, decoded);
    finalQuery = { $and: [query, cursorFilter] };
  }

  const sortDirValue = options.sortDir === 'asc' ? 1 : -1;
  const sort: Record<string, 1 | -1> = { [options.sortField]: sortDirValue, _id: sortDirValue };
  const docs = await Listing.find(finalQuery).sort(sort as any).limit(options.limit + 1).lean();

  const hasNext = docs.length > options.limit;
  const items = hasNext ? docs.slice(0, options.limit) : docs;
  const nextCursor = hasNext
    ? encodeCursor((items[items.length - 1] as any)[options.sortField], String(items[items.length - 1]._id))
    : null;

  return { items, nextCursor };
}

export async function getListingById(id: string) {
  const listing = await Listing.findById(id).lean();
  if (!listing || listing.isRemoved) {
    throw new AppError(404, 'Listing not found');
  }
  return listing;
}

export async function createListing(payload: Record<string, unknown>) {
  return Listing.create(payload);
}

export async function updateListing(id: string, payload: Record<string, unknown>) {
  const listing = await Listing.findByIdAndUpdate(id, payload, { new: true });
  if (!listing) {
    throw new AppError(404, 'Listing not found');
  }
  return listing;
}

export async function softDeleteListing(id: string) {
  const listing = await Listing.findByIdAndUpdate(
    id,
    { status: 'removed', isRemoved: true },
    { new: true }
  );
  if (!listing) {
    throw new AppError(404, 'Listing not found');
  }
  return listing;
}

export async function listListingsBySeller(sellerId: string, options: Omit<ListingListOptions, 'filters'>) {
  return listListings({ ...options, filters: { sellerId } });
}

export async function listListingsByCategory(
  categoryIds: string[],
  options: Omit<ListingListOptions, 'filters'>
) {
  return listListings({ ...options, filters: { categoryIds } });
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function suggestListings(query: string, limit = 5) {
  const regex = new RegExp(`^${escapeRegex(query)}`, 'i');
  const baseFilter = { isRemoved: false, status: { $ne: 'removed' } };
  const [makes, models, cities] = await Promise.all([
    Listing.aggregate([
      { $match: { ...baseFilter, make: regex } },
      { $group: { _id: '$make' } },
      { $sort: { _id: 1 } },
      { $limit: limit },
    ]),
    Listing.aggregate([
      { $match: { ...baseFilter, model: regex } },
      { $group: { _id: '$model' } },
      { $sort: { _id: 1 } },
      { $limit: limit },
    ]),
    Listing.aggregate([
      { $match: { ...baseFilter, 'location.city': regex } },
      { $group: { _id: '$location.city' } },
      { $sort: { _id: 1 } },
      { $limit: limit },
    ]),
  ]);

  return {
    makes: makes.map((item) => item._id).filter(Boolean),
    models: models.map((item) => item._id).filter(Boolean),
    cities: cities.map((item) => item._id).filter(Boolean),
  };
}
