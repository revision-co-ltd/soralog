// Mock data for development without database
export const mockOrganization = {
  id: 'mock-org-1',
  code: 'DEMO',
  name: 'デモ組織',
};

export const mockUsers = [
  {
    id: 'mock-user-1',
    organizationId: 'mock-org-1',
    email: 'admin@demo.com',
    password: '$2b$10$abcdefghijklmnopqrstuvwxyz', // password123
    name: '山田太郎',
    role: 'ADMIN',
  },
];

export const mockDrones = [
  {
    id: 'mock-drone-1',
    organizationId: 'mock-org-1',
    registrationMark: 'JU-001234',
    name: 'メイン機体',
    manufacturer: 'DJI',
    model: 'Mavic 3',
    totalFlightHours: 25.5,
    status: 'ACTIVE',
  },
];

export const mockFlightLogs = [];
export const mockInspections = [];
export const mockLocations = [];

