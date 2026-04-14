import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import {
  createCategory,
  getCategoryTree,
  getCategoryWithChildren,
  getDescendantCategoryIds,
  updateCategory,
} from '../services/categoryService';
import { listListings } from '../services/listingService';
import { SortDirection } from '../utils/pagination';
import { cacheDelByPrefix, cacheRemember } from '../services/cacheService';
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

export const getTree = asyncHandler(async (_req: Request, res: Response) => {
  const tree = await cacheRemember('categories:tree', env.cacheTtlSeconds, () => getCategoryTree());
  res.status(200).json(tree);
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const category = await getCategoryWithChildren(String(req.params.id));
  res.status(200).json(category);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const { name, slug, parentId } = req.body as Record<string, string | null>;
  if (!name) {
    throw new AppError(400, 'name is required');
  }
  const category = await createCategory({ name, slug: slug || undefined, parentId: parentId || null });
  await cacheDelByPrefix('categories');
  await cacheDelByPrefix('filters');
  res.status(201).json(category);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const { name, slug } = req.body as Record<string, string>;
  const category = await updateCategory(String(req.params.id), { name, slug });
  await cacheDelByPrefix('categories');
  await cacheDelByPrefix('filters');
  res.status(200).json(category);
});

export const getListings = asyncHandler(async (req: Request, res: Response) => {
  const { sortField, sortDir } = parseSort(req.query.sort as string | undefined);
  const limit = Math.min(Number.parseInt((req.query.limit as string) || '20', 10), 100);
  const cursor = req.query.cursor as string | undefined;
  const categoryIds = await getDescendantCategoryIds(String(req.params.id));

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
    categoryIds,
    attributes: pickAttributes(req.query.attr),
  };

  const result = await listListings({ filters, limit, cursor, sortField, sortDir });
  res.status(200).json(result);
});
