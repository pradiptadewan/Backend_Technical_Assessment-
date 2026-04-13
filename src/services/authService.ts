import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { RefreshToken } from '../models/RefreshToken';
import { User } from '../models/User';
import { AppError } from '../utils/errors';
import { comparePassword, hashPassword, hashToken } from '../utils/hash';
import { signAccessToken, signRefreshToken, UserRole } from '../utils/token';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

async function issueTokens(userId: string, role: UserRole, ip?: string): Promise<AuthTokens> {
  const accessToken = signAccessToken(userId, role);
  const refresh = signRefreshToken(userId);
  await RefreshToken.create({
    userId,
    jti: refresh.jti,
    tokenHash: hashToken(refresh.token),
    expiresAt: refresh.expiresAt,
    createdByIp: ip,
  });
  return { accessToken, refreshToken: refresh.token };
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  city?: string;
  ip?: string;
}): Promise<{ user: unknown; tokens: AuthTokens }> {
  const existing = await User.findOne({ email: input.email.toLowerCase() });
  if (existing) {
    throw new AppError(409, 'Email already registered');
  }
  const passwordHash = await hashPassword(input.password);
  const user = await User.create({
    name: input.name,
    email: input.email.toLowerCase(),
    passwordHash,
    role: input.role,
    phone: input.phone,
    city: input.city,
  });
  const tokens = await issueTokens(user.id, user.role, input.ip);
  return { user: user.toJSON(), tokens };
}

export async function loginUser(input: {
  email: string;
  password: string;
  ip?: string;
}): Promise<{ user: unknown; tokens: AuthTokens }> {
  const user = await User.findOne({ email: input.email.toLowerCase() }).select('+passwordHash');
  if (!user) {
    throw new AppError(401, 'Invalid email or password');
  }
  const valid = await comparePassword(input.password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, 'Invalid email or password');
  }
  const tokens = await issueTokens(user.id, user.role, input.ip);
  return { user: user.toJSON(), tokens };
}

export async function refreshTokens(refreshToken: string, ip?: string): Promise<AuthTokens> {
  let payload: { sub: string; jti: string };
  try {
    payload = jwt.verify(refreshToken, env.refreshTokenSecret) as { sub: string; jti: string };
  } catch {
    throw new AppError(401, 'Invalid refresh token');
  }

  const tokenRecord = await RefreshToken.findOne({
    userId: payload.sub,
    jti: payload.jti,
    revokedAt: { $exists: false },
  });

  if (!tokenRecord) {
    throw new AppError(401, 'Refresh token revoked');
  }
  if (tokenRecord.expiresAt.getTime() < Date.now()) {
    throw new AppError(401, 'Refresh token expired');
  }
  if (tokenRecord.tokenHash !== hashToken(refreshToken)) {
    throw new AppError(401, 'Refresh token mismatch');
  }

  tokenRecord.revokedAt = new Date();
  tokenRecord.revokedByIp = ip;

  const user = await User.findById(payload.sub);
  if (!user) {
    throw new AppError(401, 'User not found');
  }

  const newTokens = await issueTokens(user.id, user.role, ip);
  tokenRecord.replacedByToken = newTokens.refreshToken;
  await tokenRecord.save();

  return newTokens;
}

export async function logoutUser(refreshToken: string, ip?: string): Promise<void> {
  let payload: { sub: string; jti: string };
  try {
    payload = jwt.verify(refreshToken, env.refreshTokenSecret) as { sub: string; jti: string };
  } catch {
    throw new AppError(401, 'Invalid refresh token');
  }

  const tokenRecord = await RefreshToken.findOne({
    userId: payload.sub,
    jti: payload.jti,
    revokedAt: { $exists: false },
  });

  if (!tokenRecord) {
    return;
  }

  tokenRecord.revokedAt = new Date();
  tokenRecord.revokedByIp = ip;
  await tokenRecord.save();
}
