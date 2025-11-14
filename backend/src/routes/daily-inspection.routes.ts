import { Router } from 'express';
import { dailyInspectionController } from '../controllers/daily-inspection.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', dailyInspectionController.getAll);
router.post('/', dailyInspectionController.create);
router.get('/:id', dailyInspectionController.getById);

export default router;

