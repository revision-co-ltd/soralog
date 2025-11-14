import { Router } from 'express';
import { droneController } from '../controllers/drone.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
router.use(authMiddleware);
router.get('/', droneController.getAll);
router.post('/', droneController.create);

export default router;

