import { Router } from 'express';
import { exportController } from '../controllers/export.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// 開発環境では認証をオプショナルに
const optionalAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    return authMiddleware(req, res, next);
  }
  // 認証なしの場合はデフォルト値を設定
  req.organizationId = 'default-org-id';
  req.userId = 'default-user-id';
  next();
};

router.use(optionalAuth);

// CSV Export
router.get('/flight-logs/csv', exportController.exportFlightLogsCSV);
router.get('/daily-inspections/csv', exportController.exportDailyInspectionsCSV);
router.get('/maintenance-records/csv', exportController.exportMaintenanceRecordsCSV);

// Excel Export
router.get('/flight-logs/excel', exportController.exportFlightLogsExcel);
router.get('/daily-inspections/excel', exportController.exportDailyInspectionsExcel);
router.get('/maintenance-records/excel', exportController.exportMaintenanceRecordsExcel);

// PDF Export
router.get('/flight-logs/pdf', exportController.exportFlightLogsPDF);
router.get('/daily-inspections/pdf', exportController.exportDailyInspectionsPDF);
router.get('/maintenance-records/pdf', exportController.exportMaintenanceRecordsPDF);

export default router;
