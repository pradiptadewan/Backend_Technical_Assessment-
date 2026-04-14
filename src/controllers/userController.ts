import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import { getUserProfile, updateUserProfile } from '../services/userService';
import { listListingsBySeller } from '../services/listingService';
import { SortDirection } from '../utils/pagination';

const ALLOWED_SORT_FIELDS = new Set(['createdAt', 'price', 'year', 'mileage', '_id']);

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

export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError(401, 'Unauthorized');
  const profile = await getUserProfile(req.user.id);
  res.status(200).json(profile);
});

export const updateMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError(401, 'Unauthorized');
  const { name, phone, city } = req.body as Record<string, string>;
  const profile = await updateUserProfile(req.user.id, { name, phone, city });
  res.status(200).json(profile);
});

export const getSellerListings = asyncHandler(async (req: Request, res: Response) => {
  const { sortField, sortDir } = parseSort(req.query.sort as string | undefined);
  const limit = Math.min(Number.parseInt((req.query.limit as string) || '20', 10), 100);
  const cursor = req.query.cursor as string | undefined;

  const result = await listListingsBySeller(String(req.params.id), { limit, cursor, sortField, sortDir });
  res.status(200).json(result);
});
