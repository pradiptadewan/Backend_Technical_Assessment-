import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { getFilterAttributesByCategory, getFiltersWithCounts } from '../services/filterService';
import { cacheRemember } from '../services/cacheService';
import { env } from '../config/env';
import { getDescendantCategoryIds } from '../services/categoryService';

export const getFilters = asyncHandler(async (req: Request, res: Response) => {
  const categoryId = req.query.categoryId as string | undefined;
  let categoryIds: string[] | undefined;
  if (categoryId) {
    categoryIds = await getDescendantCategoryIds(categoryId);
  }
  const cacheKey = `filters:${categoryId || 'all'}`;
  const data = await cacheRemember(cacheKey, env.cacheTtlSeconds, () =>
    getFiltersWithCounts(categoryIds)
  );
  res.status(200).json(data);
});

export const getFilterAttributes = asyncHandler(async (req: Request, res: Response) => {
  const includeInherited = req.query.includeInherited !== 'false';
  const categoryId = String(req.params.categoryId);
  const cacheKey = `filters:attributes:${categoryId}:${includeInherited}`;
  const data = await cacheRemember(cacheKey, env.cacheTtlSeconds, () =>
    getFilterAttributesByCategory(categoryId, includeInherited)
  );
  res.status(200).json(data);
});
