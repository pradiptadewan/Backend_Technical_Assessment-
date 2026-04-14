import { Router } from 'express';
import { create, getListings, getOne, getTree, update } from '../controllers/categoryController';
import { authenticate, requireRole } from '../middlewares/auth';
import { validateObjectId } from '../middlewares/validateObjectId';

const router = Router();

router.get('/', getTree);
router.get('/:id/listings', validateObjectId('id'), getListings);
router.get('/:id', validateObjectId('id'), getOne);
router.post('/', authenticate, requireRole('admin'), create);
router.patch('/:id', authenticate, requireRole('admin'), validateObjectId('id'), update);

export default router;
