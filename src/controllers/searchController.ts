import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import { listListings, suggestListings } from '../services/listingService';
import { SortDirection } from '../utils/pagination';
import { cacheRemember } from '../services/cacheService';
import { env } from '../config/env';

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

export const search = asyncHandler(async (req: Request, res: Response) => {
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

export const suggest = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query.q as string | undefined;
  if (!q) {
    throw new AppError(400, 'q parameter is required');
  }
  const limit = Math.min(Number.parseInt((req.query.limit as string) || '5', 10), 20);
  const cacheKey = `suggest:${q.toLowerCase()}:${limit}`;
  const suggestions = await cacheRemember(cacheKey, env.cacheTtlSeconds, () =>
    suggestListings(q, limit)
  );
  res.status(200).json(suggestions);
});
