import { Router } from 'express';
import { maintenanceRecordController } from '../controllers/maintenance-record.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', maintenanceRecordController.getAll);
router.post('/', maintenanceRecordController.create);
router.get('/:id', maintenanceRecordController.getById);

export default router;

