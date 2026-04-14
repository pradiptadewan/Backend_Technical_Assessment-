import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import { loginUser, logoutUser, refreshTokens, registerUser } from '../services/authService';
import { UserRole } from '../utils/token';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role, phone, city } = req.body as Record<string, string>;
  if (!name || !email || !password) {
    throw new AppError(400, 'Name, email, and password are required');
  }
  const normalizedRole = (role || 'buyer') as UserRole;
  if (!['buyer', 'seller'].includes(normalizedRole)) {
    throw new AppError(400, 'Role must be buyer or seller');
  }
  const result = await registerUser({
    name,
    email,
    password,
    role: normalizedRole,
    phone,
    city,
    ip: req.ip,
  });
  res.status(201).json(result);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as Record<string, string>;
  if (!email || !password) {
    throw new AppError(400, 'Email and password are required');
  }
  const result = await loginUser({ email, password, ip: req.ip });
  res.status(200).json(result);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body as Record<string, string>;
  if (!refreshToken) {
    throw new AppError(400, 'Refresh token is required');
  }
  const tokens = await refreshTokens(refreshToken, req.ip);
  res.status(200).json(tokens);
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body as Record<string, string>;
  if (!refreshToken) {
    throw new AppError(400, 'Refresh token is required');
  }
  await logoutUser(refreshToken, req.ip);
  res.status(200).json({ message: 'Logged out' });
});
