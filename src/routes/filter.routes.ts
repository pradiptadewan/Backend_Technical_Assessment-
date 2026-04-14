import { Router } from 'express';
import { getFilterAttributes, getFilters } from '../controllers/filterController';
import { validateObjectId } from '../middlewares/validateObjectId';

const router = Router();

router.get('/', getFilters);
router.get('/:categoryId', validateObjectId('categoryId'), getFilterAttributes);

export default router;
