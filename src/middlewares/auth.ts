import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/errors';
import { UserRole } from '../utils/token';

export interface AuthRequest extends Request {
  user?: { id: string; role: UserRole };
}

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header) {
    next(new AppError(401, 'Missing Authorization header'));
    return;
  }
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    next(new AppError(401, 'Invalid Authorization header format'));
    return;
  }
  try {
    const payload = jwt.verify(token, env.accessTokenSecret) as { sub: string; role: UserRole };
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (error) {
    next(new AppError(401, 'Invalid or expired access token'));
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new AppError(401, 'Unauthorized'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError(403, 'Forbidden'));
      return;
    }
    next();
  };
}
