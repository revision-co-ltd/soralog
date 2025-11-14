import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../index';

export const dailyInspectionController = {
  async getAll(req: AuthRequest, res: Response) {
    try {
      const { droneId, executorId, inspectionType, from, to } = req.query;
      
      const where: any = {
        organizationId: req.organizationId,
        deletedAt: null,
      };

      if (droneId) where.droneId = droneId;
      if (executorId) where.executorId = executorId;
      if (inspectionType) where.inspectionType = inspectionType;
      if (from || to) {
        where.executionDate = {};
        if (from) where.executionDate.gte = new Date(from as string);
        if (to) where.executionDate.lte = new Date(to as string);
      }

      const data = await prisma.dailyInspection.findMany({
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
      res.status(500).json({ error: 'Failed to fetch inspections' });
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const data = req.body;
      
      const retentionUntil = new Date(data.executionDate);
      retentionUntil.setFullYear(retentionUntil.getFullYear() + 3);

      // 総合判定
      const results = [
        data.resultAirframe, data.resultPropeller, data.resultFrame, data.resultMountedEquipment,
        data.resultCommunication, data.resultPropulsion, data.resultPower,
        data.resultControl, data.resultController, data.resultBattery,
        data.resultRemoteId, data.resultLights, data.resultCamera,
        data.resultPreFlightSnow, data.resultPreFlightAttachment, data.resultPreFlightDamage, data.resultPreFlightHeat,
      ];
      const overallResult = results.includes('ABNORMAL') ? 'ABNORMAL' : 'NORMAL';

      const inspection = await prisma.dailyInspection.create({
        data: {
          ...data,
          organizationId: req.organizationId,
          retentionUntil,
          overallResult,
        },
      });

      res.status(201).json(inspection);
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: 'Failed to create inspection' });
    }
  },

  async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const inspection = await prisma.dailyInspection.findFirst({
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

      if (!inspection) {
        return res.status(404).json({ error: 'Inspection not found' });
      }

      res.json(inspection);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch inspection' });
    }
  },
};

