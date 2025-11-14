import { Router } from 'express';
import { flightLogController } from '../controllers/flight-log.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createFlightLogSchema } from '../utils/validation';

const router = Router();

router.use(authMiddleware);

router.get('/', flightLogController.getAll);
router.post('/', validate(createFlightLogSchema), flightLogController.create);
router.get('/:id', flightLogController.getById);
router.put('/:id', flightLogController.update);
router.delete('/:id', flightLogController.delete);

export default router;

