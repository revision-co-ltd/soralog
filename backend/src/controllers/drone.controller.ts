import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../index';

export const droneController = {
  async getAll(req: AuthRequest, res: Response) {
    const drones = await prisma.drone.findMany({
      where: { organizationId: req.organizationId, deletedAt: null },
    });
    res.json(drones);
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const drone = await prisma.drone.create({
        data: { ...req.body, organizationId: req.organizationId },
      });
      res.status(201).json(drone);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create drone' });
    }
  },
};

