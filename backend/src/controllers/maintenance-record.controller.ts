import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../index';

export const maintenanceRecordController = {
  async getAll(req: AuthRequest, res: Response) {
    try {
      const { droneId, executorId, from, to } = req.query;
      
      const where: any = {
        organizationId: req.organizationId,
        deletedAt: null,
      };

      if (droneId) where.droneId = droneId;
      if (executorId) where.executorId = executorId;
      if (from || to) {
        where.executionDate = {};
        if (from) where.executionDate.gte = new Date(from as string);
        if (to) where.executionDate.lte = new Date(to as string);
      }

      const data = await prisma.maintenanceRecord.findMany({
        where,
        include: {
          drone: true,
          executor: { select: { id: true, name: true } },
          executionPlace: true,
        },
        orderBy: { executionDate: 'desc' },
      });

      res.json({ data });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch maintenance records' });
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const data = req.body;
      
      const retentionUntil = new Date(data.executionDate);
      retentionUntil.setFullYear(retentionUntil.getFullYear() + 3);

      const record = await prisma.maintenanceRecord.create({
        data: {
          ...data,
          organizationId: req.organizationId,
          retentionUntil,
        },
      });

      res.status(201).json(record);
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: 'Failed to create maintenance record' });
    }
  },

  async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const record = await prisma.maintenanceRecord.findFirst({
        where: {
          id,
          organizationId: req.organizationId,
          deletedAt: null,
        },
        include: {
          drone: true,
          executor: true,
          executionPlace: true,
        },
      });

      if (!record) {
        return res.status(404).json({ error: 'Maintenance record not found' });
      }

      res.json(record);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch maintenance record' });
    }
  },
};

