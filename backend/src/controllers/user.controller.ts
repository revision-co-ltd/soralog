import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../index';

export const userController = {
  async getAll(req: AuthRequest, res: Response) {
    const users = await prisma.user.findMany({
      where: { organizationId: req.organizationId, isActive: true },
      select: { id: true, name: true, email: true, licenseNumber: true, role: true },
    });
    res.json(users);
  },
};

