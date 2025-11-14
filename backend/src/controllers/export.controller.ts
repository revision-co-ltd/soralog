import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../index';
import { ExportService } from '../services/export.service';

export const exportController = {
  // ==================== CSV Export ====================
  
  async exportFlightLogsCSV(req: AuthRequest, res: Response) {
    try {
      const { droneId, from, to } = req.query;
      
      let data;
      try {
        const where: any = {
          organizationId: req.organizationId,
          deletedAt: null,
        };

        if (droneId) where.droneId = droneId;
        if (from || to) {
          where.flightDate = {};
          if (from) where.flightDate.gte = new Date(from as string);
          if (to) where.flightDate.lte = new Date(to as string);
        }

        data = await prisma.flightLog.findMany({
          where,
          include: {
            drone: true,
            operator: true,
            takeoffLocation: true,
            landingLocation: true,
            confirmer: true,
          },
          orderBy: { flightDate: 'asc' },
        });
      } catch (dbError) {
        // 開発環境: データベース接続失敗時はモックデータを使用
        console.warn('⚠️  Database connection failed, using mock data for development');
        data = [];
      }

      const csv = ExportService.generateFlightLogCSV(data);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="flight-logs-${Date.now()}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error('❌ Export error:', error);
      console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ 
        error: 'Failed to export CSV',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  async exportDailyInspectionsCSV(req: AuthRequest, res: Response) {
    try {
      const { droneId, from, to } = req.query;
      
      let data;
      try {
        const where: any = {
          organizationId: req.organizationId,
          deletedAt: null,
        };

        if (droneId) where.droneId = droneId;
        if (from || to) {
          where.executionDate = {};
          if (from) where.executionDate.gte = new Date(from as string);
          if (to) where.executionDate.lte = new Date(to as string);
        }

        data = await prisma.dailyInspection.findMany({
          where,
          include: {
            drone: true,
            executor: true,
            executionPlace: true,
          },
          orderBy: { executionDate: 'asc' },
        });
      } catch (dbError) {
        console.warn('⚠️  Database connection failed, using mock data for development');
        data = [];
      }

      const csv = ExportService.generateDailyInspectionCSV(data);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="daily-inspections-${Date.now()}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to export CSV' });
    }
  },

  async exportMaintenanceRecordsCSV(req: AuthRequest, res: Response) {
    try {
      const { droneId, from, to } = req.query;
      
      const where: any = {
        organizationId: req.organizationId,
        deletedAt: null,
      };

      if (droneId) where.droneId = droneId;
      if (from || to) {
        where.executionDate = {};
        if (from) where.executionDate.gte = new Date(from as string);
        if (to) where.executionDate.lte = new Date(to as string);
      }

      const data = await prisma.maintenanceRecord.findMany({
        where,
        include: {
          drone: true,
          executor: true,
          executionPlace: true,
        },
        orderBy: { executionDate: 'asc' },
      });

      const csv = ExportService.generateMaintenanceRecordCSV(data);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="maintenance-records-${Date.now()}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to export CSV' });
    }
  },

  // ==================== Excel Export ====================
  
  async exportFlightLogsExcel(req: AuthRequest, res: Response) {
    try {
      const { droneId, from, to } = req.query;
      let data;

      try {
        const where: any = {
          organizationId: req.organizationId,
          deletedAt: null,
        };

        if (droneId) where.droneId = droneId;
        if (from || to) {
          where.flightDate = {};
          if (from) where.flightDate.gte = new Date(from as string);
          if (to) where.flightDate.lte = new Date(to as string);
        }

        data = await prisma.flightLog.findMany({
          where,
          include: {
            drone: true,
            operator: true,
            takeoffLocation: true,
            landingLocation: true,
            confirmer: true,
          },
          orderBy: { flightDate: 'asc' },
        });
      } catch (dbError) {
        console.warn('⚠️ Database connection failed, using mock data for development (FlightLog Excel)');
        data = [];
      }

      const buffer = await ExportService.generateFlightLogExcel(data);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="flight-logs-${Date.now()}.xlsx"`);
      res.send(buffer);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to export Excel' });
    }
  },

  async exportDailyInspectionsExcel(req: AuthRequest, res: Response) {
    try {
      const { droneId, from, to } = req.query;
      let data;

      try {
        const where: any = {
          organizationId: req.organizationId,
          deletedAt: null,
        };

        if (droneId) where.droneId = droneId;
        if (from || to) {
          where.executionDate = {};
          if (from) where.executionDate.gte = new Date(from as string);
          if (to) where.executionDate.lte = new Date(to as string);
        }

        data = await prisma.dailyInspection.findMany({
          where,
          include: {
            drone: true,
            executor: true,
            executionPlace: true,
          },
          orderBy: { executionDate: 'asc' },
        });
      } catch (dbError) {
        console.warn('⚠️ Database connection failed, using mock data for development (DailyInspection Excel)');
        data = [];
      }

      const buffer = await ExportService.generateDailyInspectionExcel(data);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="daily-inspections-${Date.now()}.xlsx"`);
      res.send(buffer);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to export Excel' });
    }
  },

  async exportMaintenanceRecordsExcel(req: AuthRequest, res: Response) {
    try {
      const { droneId, from, to } = req.query;
      let data;

      try {
        const where: any = {
          organizationId: req.organizationId,
          deletedAt: null,
        };

        if (droneId) where.droneId = droneId;
        if (from || to) {
          where.executionDate = {};
          if (from) where.executionDate.gte = new Date(from as string);
          if (to) where.executionDate.lte = new Date(to as string);
        }

        data = await prisma.maintenanceRecord.findMany({
          where,
          include: {
            drone: true,
            executor: true,
            executionPlace: true,
          },
          orderBy: { executionDate: 'asc' },
        });
      } catch (dbError) {
        console.warn('⚠️ Database connection failed, using mock data for development (Maintenance Excel)');
        data = [];
      }

      const buffer = await ExportService.generateMaintenanceRecordExcel(data);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="maintenance-records-${Date.now()}.xlsx"`);
      res.send(buffer);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to export Excel' });
    }
  },

  // ==================== PDF Export ====================
  
  async exportFlightLogsPDF(req: AuthRequest, res: Response) {
    try {
      const { droneId, from, to } = req.query;
      let organizationName = 'デモ組織';
      let data;

      try {
        const where: any = {
          organizationId: req.organizationId,
          deletedAt: null,
        };

        if (droneId) where.droneId = droneId;
        if (from || to) {
          where.flightDate = {};
          if (from) where.flightDate.gte = new Date(from as string);
          if (to) where.flightDate.lte = new Date(to as string);
        }

        data = await prisma.flightLog.findMany({
          where,
          include: {
            drone: true,
            operator: true,
            takeoffLocation: true,
            landingLocation: true,
            confirmer: true,
          },
          orderBy: { flightDate: 'asc' },
        });

        const organization = await prisma.organization.findUnique({
          where: { id: req.organizationId },
        });
        if (organization?.name) {
          organizationName = organization.name;
        }
      } catch (dbError) {
        console.warn('⚠️ Database connection failed, using mock data for development (FlightLog PDF)');
        data = [];
      }

      const buffer = await ExportService.generateFlightLogPDF(data, organizationName);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="flight-logs-${Date.now()}.pdf"`);
      res.send(buffer);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to export PDF' });
    }
  },

  async exportDailyInspectionsPDF(req: AuthRequest, res: Response) {
    try {
      const { droneId, from, to } = req.query;
      let organizationName = 'デモ組織';
      let data;

      try {
        const where: any = {
          organizationId: req.organizationId,
          deletedAt: null,
        };

        if (droneId) where.droneId = droneId;
        if (from || to) {
          where.executionDate = {};
          if (from) where.executionDate.gte = new Date(from as string);
          if (to) where.executionDate.lte = new Date(to as string);
        }

        data = await prisma.dailyInspection.findMany({
          where,
          include: {
            drone: true,
            executor: true,
            executionPlace: true,
          },
          orderBy: { executionDate: 'asc' },
        });

        const organization = await prisma.organization.findUnique({
          where: { id: req.organizationId },
        });
        if (organization?.name) {
          organizationName = organization.name;
        }
      } catch (dbError) {
        console.warn('⚠️ Database connection failed, using mock data for development (DailyInspection PDF)');
        data = [];
      }

      const buffer = await ExportService.generateDailyInspectionPDF(data, organizationName);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="daily-inspections-${Date.now()}.pdf"`);
      res.send(buffer);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to export PDF' });
    }
  },

  async exportMaintenanceRecordsPDF(req: AuthRequest, res: Response) {
    try {
      const { droneId, from, to } = req.query;
      let organizationName = 'デモ組織';
      let data;

      try {
        const where: any = {
          organizationId: req.organizationId,
          deletedAt: null,
        };

        if (droneId) where.droneId = droneId;
        if (from || to) {
          where.executionDate = {};
          if (from) where.executionDate.gte = new Date(from as string);
          if (to) where.executionDate.lte = new Date(to as string);
        }

        data = await prisma.maintenanceRecord.findMany({
          where,
          include: {
            drone: true,
            executor: true,
            executionPlace: true,
          },
          orderBy: { executionDate: 'asc' },
        });

        const organization = await prisma.organization.findUnique({
          where: { id: req.organizationId },
        });
        if (organization?.name) {
          organizationName = organization.name;
        }
      } catch (dbError) {
        console.warn('⚠️ Database connection failed, using mock data for development (Maintenance PDF)');
        data = [];
      }

      const buffer = await ExportService.generateMaintenanceRecordPDF(data, organizationName);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="maintenance-records-${Date.now()}.pdf"`);
      res.send(buffer);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to export PDF' });
    }
  },
};
