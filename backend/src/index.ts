import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
import authRoutes from './routes/auth.routes';
import flightLogRoutes from './routes/flight-log.routes';
import dailyInspectionRoutes from './routes/daily-inspection.routes';
import maintenanceRecordRoutes from './routes/maintenance-record.routes';
import droneRoutes from './routes/drone.routes';
import userRoutes from './routes/user.routes';
import locationRoutes from './routes/location.routes';
import exportRoutes from './routes/export.routes';

app.use('/api/auth', authRoutes);
app.use('/api/flight-logs', flightLogRoutes);
app.use('/api/daily-inspections', dailyInspectionRoutes);
app.use('/api/maintenance-records', maintenanceRecordRoutes);
app.use('/api/drones', droneRoutes);
app.use('/api/users', userRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/export', exportRoutes);

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

export { prisma };

