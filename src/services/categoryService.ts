import mongoose from 'mongoose';
import { Category } from '../models/Category';
import { AppError } from '../utils/errors';
import { slugify } from '../utils/slug';

export async function createCategory(input: {
  name: string;
  slug?: string;
  parentId?: string | null;
}) {
  const slug = input.slug ? slugify(input.slug) : slugify(input.name);
  const existing = await Category.findOne({ slug });
  if (existing) {
    throw new AppError(409, 'Category slug already exists');
  }

  let ancestors: mongoose.Types.ObjectId[] = [];
  let depth = 0;
  let parentId: mongoose.Types.ObjectId | null = null;

  if (input.parentId) {
    const parent = await Category.findById(input.parentId);
    if (!parent) {
      throw new AppError(404, 'Parent category not found');
    }
    parentId = parent._id;
    ancestors = [...parent.ancestors, parent._id];
    depth = parent.depth + 1;
  }

  return Category.create({
    name: input.name,
    slug,
    parentId,
    ancestors,
    depth,
  });
}

export async function updateCategory(
  id: string,
  input: { name?: string; slug?: string }
) {
  const updates: { name?: string; slug?: string } = {};
  if (input.name) updates.name = input.name;
  if (input.slug) updates.slug = slugify(input.slug);
  const category = await Category.findByIdAndUpdate(id, updates, { new: true });
  if (!category) {
    throw new AppError(404, 'Category not found');
  }
  return category;
}

export async function getCategoryTree() {
  const categories = await Category.find().lean();
  const map = new Map<string, any>();
  const roots: any[] = [];

  categories.forEach((cat) => {
    map.set(String(cat._id), { ...cat, id: cat._id, children: [] });
  });

  categories.forEach((cat) => {
    const node = map.get(String(cat._id));
    if (cat.parentId) {
      const parent = map.get(String(cat.parentId));
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  });

  return roots;
}

export async function getCategoryWithChildren(id: string) {
  const category = await Category.findById(id).lean();
  if (!category) {
    throw new AppError(404, 'Category not found');
  }
  const children = await Category.find({ parentId: id }).lean();
  return {
    ...category,
    id: category._id,
    children,
  };
}

export async function getDescendantCategoryIds(id: string): Promise<string[]> {
  const descendants = await Category.find({ ancestors: id }, { _id: 1 }).lean();
  return [id, ...descendants.map((item) => String(item._id))];
}
