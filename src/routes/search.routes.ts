import { Router } from 'express';
import { search, suggest } from '../controllers/searchController';

const router = Router();

router.get('/search', search);
router.get('/search/suggest', suggest);

export default router;
