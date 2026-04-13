import mongoose from 'mongoose';
import { Category } from '../models/Category';
import { FilterAttribute } from '../models/FilterAttribute';
import { Listing } from '../models/Listing';
import { AppError } from '../utils/errors';

export async function getFiltersWithCounts(categoryIds?: string[]) {
  const match: Record<string, unknown> = { isRemoved: false, status: { $ne: 'removed' } };
  if (categoryIds && categoryIds.length > 0) {
    match.categoryId = { $in: categoryIds.map((id) => new mongoose.Types.ObjectId(id)) };
  }

  const facets = await Listing.aggregate([
    { $match: match },
    {
      $facet: {
        makes: [
          { $group: { _id: '$make', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        models: [
          { $group: { _id: '$model', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        transmissions: [
          { $group: { _id: '$transmission', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        fuelTypes: [
          { $group: { _id: '$fuelType', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        conditions: [
          { $group: { _id: '$condition', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        colors: [
          { $group: { _id: '$color', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        cities: [
          { $group: { _id: '$location.city', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        priceRange: [{ $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } }],
        yearRange: [{ $group: { _id: null, min: { $min: '$year' }, max: { $max: '$year' } } }],
        mileageRange: [
          { $group: { _id: null, min: { $min: '$mileage' }, max: { $max: '$mileage' } } },
        ],
        attributes: [
          { $unwind: '$attributes' },
          {
            $addFields: {
              attributeValue: {
                $ifNull: [
                  '$attributes.valueString',
                  { $ifNull: ['$attributes.valueNumber', '$attributes.valueBoolean'] },
                ],
              },
            },
          },
          {
            $group: {
              _id: { key: '$attributes.key', value: '$attributeValue' },
              count: { $sum: 1 },
            },
          },
          {
            $group: {
              _id: '$_id.key',
              values: { $push: { value: '$_id.value', count: '$count' } },
            },
          },
        ],
      },
    },
  ]);

  return facets[0] || {};
}

export async function getFilterAttributesByCategory(categoryId: string, includeInherited = true) {
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new AppError(404, 'Category not found');
  }

  const ids = includeInherited
    ? [category._id, ...category.ancestors]
    : [category._id];

  return FilterAttribute.find({ categoryId: { $in: ids } }).lean();
}
