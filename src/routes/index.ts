import { Router } from 'express';
import authRoutes from './auth.routes';
import listingRoutes from './listing.routes';
import searchRoutes from './search.routes';
import filterRoutes from './filter.routes';
import categoryRoutes from './category.routes';
import userRoutes from './user.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/listings', searchRoutes);
router.use('/listings', listingRoutes);
router.use('/filters', filterRoutes);
router.use('/categories', categoryRoutes);
router.use('/users', userRoutes);

export default router;
