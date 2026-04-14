import { Router } from 'express';
import { create, getOne, list, remove, update } from '../controllers/listingController';
import { authenticate, requireRole } from '../middlewares/auth';
import { validateObjectId } from '../middlewares/validateObjectId';

const router = Router();

router.get('/', list);
router.post('/', authenticate, requireRole('seller', 'admin'), create);
router.get('/:id', validateObjectId('id'), getOne);
router.patch('/:id', authenticate, requireRole('seller', 'admin'), validateObjectId('id'), update);
router.delete('/:id', authenticate, requireRole('seller', 'admin'), validateObjectId('id'), remove);

export default router;
