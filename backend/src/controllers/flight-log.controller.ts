import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../index';

export const flightLogController = {
  // GET /api/flight-logs
  async getAll(req: AuthRequest, res: Response) {
    try {
      const { droneId, operatorId, from, to, page = 1, limit = 20 } = req.query;
      
      const where: any = {
        organizationId: req.organizationId,
        deletedAt: null,
      };

      if (droneId) where.droneId = droneId;
      if (operatorId) where.operatorId = operatorId;
      if (from || to) {
        where.flightDate = {};
        if (from) where.flightDate.gte = new Date(from as string);
        if (to) where.flightDate.lte = new Date(to as string);
      }

      const [data, total] = await Promise.all([
        prisma.flightLog.findMany({
          where,
          include: {
            drone: true,
            operator: { select: { id: true, name: true } },
            takeoffLocation: true,
            landingLocation: true,
            confirmer: { select: { id: true, name: true } },
          },
          orderBy: [{ flightDate: 'desc' }, { takeoffTime: 'desc' }],
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit),
        }),
        prisma.flightLog.count({ where }),
      ]);

      res.json({
        data,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch flight logs' });
    }
  },

  // POST /api/flight-logs
  async create(req: AuthRequest, res: Response) {
    try {
      const data = req.body;
      
      // 保存期限を計算（飛行日から3年）
      const retentionUntil = new Date(data.flightDate);
      retentionUntil.setFullYear(retentionUntil.getFullYear() + 3);

      const flightLog = await prisma.flightLog.create({
        data: {
          ...data,
          organizationId: req.organizationId,
          retentionUntil,
        },
        include: {
          drone: true,
          operator: { select: { id: true, name: true } },
        },
      });

      res.status(201).json(flightLog);
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: 'Failed to create flight log' });
    }
  },

  // GET /api/flight-logs/:id
  async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const flightLog = await prisma.flightLog.findFirst({
        where: {
          id,
          organizationId: req.organizationId,
          deletedAt: null,
        },
        include: {
          drone: true,
          operator: true,
          takeoffLocation: true,
          landingLocation: true,
          confirmer: true,
        },
      });

      if (!flightLog) {
        return res.status(404).json({ error: 'Flight log not found' });
      }

      res.json(flightLog);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch flight log' });
    }
  },

  // PUT /api/flight-logs/:id
  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;

      const flightLog = await prisma.flightLog.updateMany({
        where: {
          id,
          organizationId: req.organizationId,
          deletedAt: null,
        },
        data,
      });

      if (flightLog.count === 0) {
        return res.status(404).json({ error: 'Flight log not found' });
      }

      res.json({ message: 'Updated successfully' });
    } catch (error) {
      res.status(400).json({ error: 'Failed to update flight log' });
    }
  },

  // DELETE /api/flight-logs/:id
  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      await prisma.flightLog.updateMany({
        where: {
          id,
          organizationId: req.organizationId,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete flight log' });
    }
  },
};

