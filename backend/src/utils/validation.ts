import { z } from 'zod';

// 飛行記録バリデーション
export const createFlightLogSchema = z.object({
  droneId: z.string().uuid(),
  operatorId: z.string().uuid(),
  flightDate: z.string().or(z.date()),
  purpose: z.string().min(1),
  outline: z.string().optional(),
  isTokuteiFlight: z.boolean().default(false),
  flightPlanNotified: z.boolean().optional(),
  takeoffLocationId: z.string().uuid().optional(),
  takeoffTime: z.string().regex(/^\d{2}:\d{2}$/),
  landingLocationId: z.string().uuid().optional(),
  landingTime: z.string().regex(/^\d{2}:\d{2}$/),
  flightTimeMinutes: z.number().optional(),
  totalTimeSinceManufactured: z.number().optional(),
  safetyImpactNote: z.string().optional(),
  faultDate: z.string().or(z.date()).optional(),
  faultDetail: z.string().optional(),
  fixDate: z.string().or(z.date()).optional(),
  fixDetail: z.string().optional(),
  confirmerId: z.string().uuid().optional(),
});

// 日常点検バリデーション
export const createDailyInspectionSchema = z
  .object({
    droneId: z.string().uuid(),
    inspectionType: z.enum(['PRE_FLIGHT', 'POST_FLIGHT']),
    executionDate: z.string().or(z.date()),
    executionPlaceId: z.string().uuid().optional(),
    executorId: z.string().uuid(),
    // 各点検項目（詳細は動的に許可）
    resultAirframe: z.enum(['NORMAL', 'ABNORMAL', 'NOT_SELECTED']).optional(),
    noteAirframe: z.string().optional(),
    resultPropeller: z.enum(['NORMAL', 'ABNORMAL', 'NOT_SELECTED']).optional(),
    notePropeller: z.string().optional(),
    specialNote: z.string().optional(),
  })
  .passthrough();

// ログインバリデーション
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// ユーザー登録バリデーション
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  organizationId: z.string().uuid(),
  licenseNumber: z.string().optional(),
});

