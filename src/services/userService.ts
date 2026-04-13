import { User } from '../models/User';
import { AppError } from '../utils/errors';

export async function getUserProfile(id: string) {
  const user = await User.findById(id).lean();
  if (!user) {
    throw new AppError(404, 'User not found');
  }
  return user;
}

export async function updateUserProfile(
  id: string,
  updates: { name?: string; phone?: string; city?: string }
) {
  const user = await User.findByIdAndUpdate(id, updates, { new: true });
  if (!user) {
    throw new AppError(404, 'User not found');
  }
  return user;
}
