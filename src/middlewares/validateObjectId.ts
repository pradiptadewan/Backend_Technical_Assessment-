import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../utils/errors';

export function validateObjectId(paramName: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const value = req.params[paramName];
    if (!mongoose.isValidObjectId(value)) {
      next(new AppError(400, `Invalid ObjectId for ${paramName}`));
      return;
    }
    next();
  };
}
