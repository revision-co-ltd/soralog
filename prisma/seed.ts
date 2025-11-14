import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 組織作成
  const org = await prisma.organization.upsert({
    where: { code: 'DEMO-ORG' },
    update: {},
    create: {
      code: 'DEMO-ORG',
      name: 'デモ組織',
      address: '東京都渋谷区',
      phone: '03-1234-5678',
    },
  });
  console.log('✅ Organization created:', org.name);

  // ユーザー作成
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      organizationId: org.id,
      email: 'admin@example.com',
      password: hashedPassword,
      name: '山田太郎',
      licenseNumber: '一等-123456',
      role: 'ADMIN',
    },
  });

  const operator1 = await prisma.user.upsert({
    where: { email: 'operator1@example.com' },
    update: {},
    create: {
      organizationId: org.id,
      email: 'operator1@example.com',
      password: hashedPassword,
      name: '田中花子',
      licenseNumber: '二等-789012',
      role: 'OPERATOR',
    },
  });

  const operator2 = await prisma.user.upsert({
    where: { email: 'operator2@example.com' },
    update: {},
    create: {
      organizationId: org.id,
      email: 'operator2@example.com',
      password: hashedPassword,
      name: '佐藤次郎',
      role: 'OPERATOR',
    },
  });

  console.log('✅ Users created: 3 users');

  // 機体作成
  const drone1 = await prisma.drone.create({
    data: {
      organizationId: org.id,
      registrationMark: 'JU-001234',
      name: 'メイン撮影機',
      manufacturer: 'DJI',
      model: 'Mavic 3 Pro',
      serialNumber: 'DJI-MV3P-001',
      totalFlightHours: 25.5,
      status: 'ACTIVE',
    },
  });

  const drone2 = await prisma.drone.create({
    data: {
      organizationId: org.id,
      registrationMark: 'JU-005678',
      name: '練習用機体',
      manufacturer: 'DJI',
      model: 'Mini 3 Pro',
      serialNumber: 'DJI-MINI3-002',
      totalFlightHours: 12.3,
      status: 'ACTIVE',
    },
  });

  console.log('✅ Drones created: 2 drones');

  // 場所作成
  const location1 = await prisma.location.create({
    data: {
      organizationId: org.id,
      name: '代々木公園',
      address: '東京都渋谷区代々木神園町2-1',
      latitude: 35.6732,
      longitude: 139.6964,
      isDid: true,
      requiresPermit: true,
    },
  });

  const location2 = await prisma.location.create({
    data: {
      organizationId: org.id,
      name: '多摩川河川敷',
      address: '東京都大田区田園調布',
      latitude: 35.6045,
      longitude: 139.6515,
      isDid: false,
      requiresPermit: false,
    },
  });

  console.log('✅ Locations created: 2 locations');

  // サンプル飛行記録
  const today = new Date();
  const retentionDate = new Date();
  retentionDate.setFullYear(retentionDate.getFullYear() + 3);

  const flightLog1 = await prisma.flightLog.create({
    data: {
      organizationId: org.id,
      droneId: drone1.id,
      operatorId: operator1.id,
      flightDate: today,
      purpose: '空撮・撮影',
      outline: '公園の風景撮影',
      isTokuteiFlight: true,
      flightPlanNotified: true,
      takeoffLocationId: location1.id,
      takeoffTime: '10:00',
      landingLocationId: location1.id,
      landingTime: '10:45',
      flightTimeMinutes: 45,
      totalTimeSinceManufactured: 26.25,
      retentionUntil: retentionDate,
    },
  });

  console.log('✅ Flight log created');

  // サンプル日常点検記録
  const inspection = await prisma.dailyInspection.create({
    data: {
      organizationId: org.id,
      droneId: drone1.id,
      inspectionType: 'PRE_FLIGHT',
      executionDate: today,
      executorId: operator1.id,
      resultAirframe: 'NORMAL',
      resultPropeller: 'NORMAL',
      resultFrame: 'NORMAL',
      resultCommunication: 'NORMAL',
      resultPropulsion: 'NORMAL',
      resultPower: 'NORMAL',
      resultControl: 'NORMAL',
      resultController: 'NORMAL',
      resultBattery: 'NORMAL',
      noteBattery: 'バッテリー残量98%',
      resultRemoteId: 'NORMAL',
      resultLights: 'NORMAL',
      resultCamera: 'NORMAL',
      overallResult: 'NORMAL',
      retentionUntil: retentionDate,
    },
  });

  console.log('✅ Daily inspection created');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📝 Test credentials:');
  console.log('  Email: admin@example.com');
  console.log('  Password: password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

