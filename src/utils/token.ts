import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';

export type UserRole = 'buyer' | 'seller' | 'admin';

export function parseTtlToMs(ttl: string): number {
  const match = ttl.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid TTL format: ${ttl}`);
  }
  const value = Number.parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * (multipliers[unit] ?? 1000);
}

export function signAccessToken(userId: string, role: UserRole): string {
  const options: SignOptions = {
    expiresIn: env.accessTokenTtl as SignOptions['expiresIn'],
  };
  return jwt.sign({ sub: userId, role }, env.accessTokenSecret as jwt.Secret, options);
}

export function signRefreshToken(userId: string): { token: string; jti: string; expiresAt: Date } {
  const jti = crypto.randomUUID();
  const options: SignOptions = {
    expiresIn: env.refreshTokenTtl as SignOptions['expiresIn'],
  };
  const token = jwt.sign({ sub: userId, jti }, env.refreshTokenSecret as jwt.Secret, options);
  const expiresAt = new Date(Date.now() + parseTtlToMs(env.refreshTokenTtl));
  return { token, jti, expiresAt };
}
