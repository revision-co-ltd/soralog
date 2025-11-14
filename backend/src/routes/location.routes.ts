import { Router } from 'express';
import { locationController } from '../controllers/location.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
router.use(authMiddleware);
router.get('/', locationController.getAll);
router.post('/', locationController.create);

export default router;

