import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../index';

export const locationController = {
  async getAll(req: AuthRequest, res: Response) {
    const locations = await prisma.location.findMany({
      where: { organizationId: req.organizationId },
    });
    res.json(locations);
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const location = await prisma.location.create({
        data: { ...req.body, organizationId: req.organizationId },
      });
      res.status(201).json(location);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create location' });
    }
  },
};

