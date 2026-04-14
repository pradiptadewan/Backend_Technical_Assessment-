import { Router } from 'express';
import { getMe, getSellerListings, updateMe } from '../controllers/userController';
import { authenticate } from '../middlewares/auth';
import { validateObjectId } from '../middlewares/validateObjectId';

const router = Router();

router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, updateMe);
router.get('/:id/listings', validateObjectId('id'), getSellerListings);

export default router;
