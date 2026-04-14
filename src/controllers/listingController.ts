import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middlewares/auth';
import { Category } from '../models/Category';
import { Listing } from '../models/Listing';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import { listListings, createListing, getListingById, updateListing, softDeleteListing } from '../services/listingService';
import { SortDirection } from '../utils/pagination';
import { cacheDelByPrefix } from '../services/cacheService';

const ALLOWED_SORT_FIELDS = new Set(['createdAt', 'price', 'year', 'mileage', '_id']);

function parseNumber(value: unknown): number | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const num = Number.parseFloat(value);
  return Number.isNaN(num) ? undefined : num;
}

function parseSort(sort?: string): { sortField: string; sortDir: SortDirection } {
  if (!sort) return { sortField: 'createdAt', sortDir: 'desc' };
  const [field, dirRaw] = sort.split(':');
  const sortField = field || 'createdAt';
  const sortDir = (dirRaw === 'asc' ? 'asc' : 'desc') as SortDirection;
  if (!ALLOWED_SORT_FIELDS.has(sortField)) {
    throw new AppError(400, `Invalid sort field: ${sortField}`);
  }
  return { sortField, sortDir };
}

function pickAttributes(queryAttr: unknown): Record<string, string> | undefined {
  if (!queryAttr || typeof queryAttr !== 'object' || Array.isArray(queryAttr)) return undefined;
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(queryAttr as Record<string, unknown>)) {
    if (typeof value === 'string') result[key] = value;
  }
  return Object.keys(result).length ? result : undefined;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { sortField, sortDir } = parseSort(req.query.sort as string | undefined);
  const limit = Math.min(Number.parseInt((req.query.limit as string) || '20', 10), 100);
  const cursor = req.query.cursor as string | undefined;

  const filters = {
    q: req.query.q as string | undefined,
    make: req.query.make as string | undefined,
    model: req.query.model as string | undefined,
    yearMin: parseNumber(req.query.yearMin),
    yearMax: parseNumber(req.query.yearMax),
    priceMin: parseNumber(req.query.priceMin),
    priceMax: parseNumber(req.query.priceMax),
    mileageMin: parseNumber(req.query.mileageMin),
    mileageMax: parseNumber(req.query.mileageMax),
    condition: req.query.condition as string | undefined,
    transmission: req.query.transmission as string | undefined,
    fuelType: req.query.fuelType as string | undefined,
    color: req.query.color as string | undefined,
    status: req.query.status as string | undefined,
    city: req.query.city as string | undefined,
    categoryIds: req.query.categoryId ? [String(req.query.categoryId)] : undefined,
    attributes: pickAttributes(req.query.attr),
  };

  const result = await listListings({ filters, limit, cursor, sortField, sortDir });
  res.status(200).json(result);
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const listing = await getListingById(String(req.params.id));
  res.status(200).json(listing);
});

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError(401, 'Unauthorized');
  const {
    categoryId,
    title,
    description,
    make,
    model,
    year,
    mileage,
    price,
    condition,
    transmission,
    fuelType,
    color,
    images,
    location,
    status,
    attributes,
  } = req.body as Record<string, any>;

  if (!categoryId || !make || !model || !year || !mileage || !price || !condition) {
    throw new AppError(400, 'categoryId, make, model, year, mileage, price, and condition are required');
  }
  if (!mongoose.isValidObjectId(categoryId)) {
    throw new AppError(400, 'Invalid categoryId');
  }
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new AppError(404, 'Category not found');
  }

  const payload = {
    sellerId: req.user.id,
    categoryId,
    title: title || `${make} ${model} ${year}`,
    description,
    make,
    model,
    year,
    mileage,
    price,
    condition,
    transmission,
    fuelType,
    color,
    images: Array.isArray(images) ? images : [],
    location: location || {},
    status,
    attributes: Array.isArray(attributes) ? attributes : [],
  };

  const listing = await createListing(payload);
  await cacheDelByPrefix('filters');
  await cacheDelByPrefix('suggest');
  res.status(201).json(listing);
});

export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError(401, 'Unauthorized');
  const listing = await Listing.findById(String(req.params.id));
  if (!listing || listing.isRemoved) {
    throw new AppError(404, 'Listing not found');
  }
  if (req.user.role !== 'admin' && String(listing.sellerId) !== req.user.id) {
    throw new AppError(403, 'Forbidden');
  }

  const allowedFields = [
    'title',
    'description',
    'make',
    'model',
    'year',
    'mileage',
    'price',
    'condition',
    'transmission',
    'fuelType',
    'color',
    'images',
    'location',
    'status',
    'attributes',
    'categoryId',
  ];

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  const updated = await updateListing(String(req.params.id), updates);
  await cacheDelByPrefix('filters');
  await cacheDelByPrefix('suggest');
  res.status(200).json(updated);
});

export const remove = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError(401, 'Unauthorized');
  const listing = await Listing.findById(String(req.params.id));
  if (!listing || listing.isRemoved) {
    throw new AppError(404, 'Listing not found');
  }
  if (req.user.role !== 'admin' && String(listing.sellerId) !== req.user.id) {
    throw new AppError(403, 'Forbidden');
  }
  const deleted = await softDeleteListing(String(req.params.id));
  await cacheDelByPrefix('filters');
  await cacheDelByPrefix('suggest');
  res.status(200).json(deleted);
});
