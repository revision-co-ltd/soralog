// API サービス層
// バックエンドAPIとの通信を一元管理

import type {
  FlightLog,
  CreateFlightLogDTO,
  UpdateFlightLogDTO,
  DailyInspection,
  CreateDailyInspectionDTO,
  MaintenanceRecord,
  CreateMaintenanceRecordDTO,
  Drone,
  User,
  Location,
  AuthResponse,
  PaginatedResponse,
  ApiError,
} from '../types';

// =====================================
// 設定
// =====================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// 認証トークンの管理
let authToken: string | null = localStorage.getItem('auth_token');

export const setAuthToken = (token: string) => {
  authToken = token;
  localStorage.setItem('auth_token', token);
};

export const clearAuthToken = () => {
  authToken = null;
  localStorage.removeItem('auth_token');
};

export const getAuthToken = (): string | null => {
  return authToken;
};

// =====================================
// 共通 Fetch 関数
// =====================================

interface FetchOptions extends RequestInit {
  params?: Record<string, any>;
}

const fetchWithAuth = async <T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> => {
  const { params, ...fetchOptions } = options;

  // クエリパラメータの構築
  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  // ヘッダーの構築
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    // 401 エラー: 認証切れ
    if (response.status === 401) {
      clearAuthToken();
      throw new Error('認証エラー: ログインしてください');
    }

    // 404 エラー
    if (response.status === 404) {
      throw new Error('リソースが見つかりません');
    }

    // その他のエラー
    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: 'Unknown error',
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(error.message || error.error);
    }

    // 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('ネットワークエラーが発生しました');
  }
};

// =====================================
// 認証 API
// =====================================

export const authApi = {
  /**
   * ログイン
   */
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(error.message || error.error);
    }

    const data: AuthResponse = await response.json();
    setAuthToken(data.token);
    return data;
  },

  /**
   * ユーザー登録
   */
  register: async (data: {
    email: string;
    password: string;
    name: string;
    organizationId: string;
  }): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Registration failed' }));
      throw new Error(error.message || error.error);
    }

    const result: AuthResponse = await response.json();
    setAuthToken(result.token);
    return result;
  },

  /**
   * 現在のユーザー情報取得
   */
  me: async (): Promise<User> => {
    return fetchWithAuth<User>('/auth/me');
  },

  /**
   * ログアウト
   */
  logout: async (): Promise<void> => {
    clearAuthToken();
  },
};

// =====================================
// 飛行記録 API（様式1）
// =====================================

export const flightLogApi = {
  /**
   * 飛行記録一覧取得
   */
  getAll: async (params?: {
    droneId?: string;
    operatorId?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<FlightLog>> => {
    return fetchWithAuth<PaginatedResponse<FlightLog>>('/flight-logs', { params });
  },

  /**
   * 飛行記録詳細取得
   */
  getById: async (id: string): Promise<FlightLog> => {
    return fetchWithAuth<FlightLog>(`/flight-logs/${id}`);
  },

  /**
   * 飛行記録作成
   */
  create: async (data: CreateFlightLogDTO): Promise<FlightLog> => {
    return fetchWithAuth<FlightLog>('/flight-logs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * 飛行記録更新
   */
  update: async (id: string, data: Partial<CreateFlightLogDTO>): Promise<FlightLog> => {
    return fetchWithAuth<FlightLog>(`/flight-logs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * 飛行記録削除（論理削除）
   */
  delete: async (id: string): Promise<void> => {
    return fetchWithAuth<void>(`/flight-logs/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * CSV エクスポート
   */
  exportCsv: async (params?: any): Promise<Blob> => {
    const url = `${API_BASE_URL}/flight-logs/export/csv${params ? '?' + new URLSearchParams(params) : ''}`;
    const response = await fetch(url, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });

    if (!response.ok) {
      throw new Error('CSV エクスポートに失敗しました');
    }

    return response.blob();
  },

  /**
   * Excel エクスポート（様式1）
   */
  exportExcel: async (params?: any): Promise<Blob> => {
    const url = `${API_BASE_URL}/flight-logs/export/excel${params ? '?' + new URLSearchParams(params) : ''}`;
    const response = await fetch(url, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });

    if (!response.ok) {
      throw new Error('Excel エクスポートに失敗しました');
    }

    return response.blob();
  },

  /**
   * PDF エクスポート
   */
  exportPdf: async (params?: any): Promise<Blob> => {
    const url = `${API_BASE_URL}/flight-logs/export/pdf${params ? '?' + new URLSearchParams(params) : ''}`;
    const response = await fetch(url, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });

    if (!response.ok) {
      throw new Error('PDF エクスポートに失敗しました');
    }

    return response.blob();
  },
};

// =====================================
// 日常点検記録 API（様式2）
// =====================================

export const dailyInspectionApi = {
  /**
   * 日常点検記録一覧取得
   */
  getAll: async (params?: {
    droneId?: string;
    executorId?: string;
    inspectionType?: 'pre-flight' | 'post-flight';
    from?: string;
    to?: string;
  }): Promise<PaginatedResponse<DailyInspection>> => {
    return fetchWithAuth<PaginatedResponse<DailyInspection>>('/daily-inspections', { params });
  },

  /**
   * 日常点検記録詳細取得
   */
  getById: async (id: string): Promise<DailyInspection> => {
    return fetchWithAuth<DailyInspection>(`/daily-inspections/${id}`);
  },

  /**
   * 日常点検記録作成
   */
  create: async (data: CreateDailyInspectionDTO): Promise<DailyInspection> => {
    return fetchWithAuth<DailyInspection>('/daily-inspections', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * 日常点検記録更新
   */
  update: async (id: string, data: Partial<CreateDailyInspectionDTO>): Promise<DailyInspection> => {
    return fetchWithAuth<DailyInspection>(`/daily-inspections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * 日常点検記録削除
   */
  delete: async (id: string): Promise<void> => {
    return fetchWithAuth<void>(`/daily-inspections/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * CSV エクスポート
   */
  exportCsv: async (params?: any): Promise<Blob> => {
    const url = `${API_BASE_URL}/daily-inspections/export/csv${params ? '?' + new URLSearchParams(params) : ''}`;
    const response = await fetch(url, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });

    if (!response.ok) {
      throw new Error('CSV エクスポートに失敗しました');
    }

    return response.blob();
  },
};

// =====================================
// 点検整備記録 API（様式3）
// =====================================

export const maintenanceRecordApi = {
  /**
   * 点検整備記録一覧取得
   */
  getAll: async (params?: {
    droneId?: string;
    executorId?: string;
    from?: string;
    to?: string;
  }): Promise<PaginatedResponse<MaintenanceRecord>> => {
    return fetchWithAuth<PaginatedResponse<MaintenanceRecord>>('/maintenance-records', { params });
  },

  /**
   * 点検整備記録詳細取得
   */
  getById: async (id: string): Promise<MaintenanceRecord> => {
    return fetchWithAuth<MaintenanceRecord>(`/maintenance-records/${id}`);
  },

  /**
   * 点検整備記録作成
   */
  create: async (data: CreateMaintenanceRecordDTO): Promise<MaintenanceRecord> => {
    return fetchWithAuth<MaintenanceRecord>('/maintenance-records', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * 点検整備記録更新
   */
  update: async (id: string, data: Partial<CreateMaintenanceRecordDTO>): Promise<MaintenanceRecord> => {
    return fetchWithAuth<MaintenanceRecord>(`/maintenance-records/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * 点検整備記録削除
   */
  delete: async (id: string): Promise<void> => {
    return fetchWithAuth<void>(`/maintenance-records/${id}`, {
      method: 'DELETE',
    });
  },
};

// =====================================
// 機体 API
// =====================================

export const droneApi = {
  /**
   * 機体一覧取得
   */
  getAll: async (): Promise<Drone[]> => {
    return fetchWithAuth<Drone[]>('/drones');
  },

  /**
   * 機体詳細取得
   */
  getById: async (id: string): Promise<Drone> => {
    return fetchWithAuth<Drone>(`/drones/${id}`);
  },

  /**
   * 機体作成
   */
  create: async (data: Omit<Drone, 'id' | 'createdAt' | 'updatedAt'>): Promise<Drone> => {
    return fetchWithAuth<Drone>('/drones', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * 機体更新
   */
  update: async (id: string, data: Partial<Drone>): Promise<Drone> => {
    return fetchWithAuth<Drone>(`/drones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * 機体削除
   */
  delete: async (id: string): Promise<void> => {
    return fetchWithAuth<void>(`/drones/${id}`, {
      method: 'DELETE',
    });
  },
};

// =====================================
// ユーザー API
// =====================================

export const userApi = {
  /**
   * ユーザー一覧取得
   */
  getAll: async (): Promise<User[]> => {
    return fetchWithAuth<User[]>('/users');
  },

  /**
   * ユーザー詳細取得
   */
  getById: async (id: string): Promise<User> => {
    return fetchWithAuth<User>(`/users/${id}`);
  },

  /**
   * ユーザー作成
   */
  create: async (data: Partial<User>): Promise<User> => {
    return fetchWithAuth<User>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * ユーザー更新
   */
  update: async (id: string, data: Partial<User>): Promise<User> => {
    return fetchWithAuth<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * ユーザー削除
   */
  delete: async (id: string): Promise<void> => {
    return fetchWithAuth<void>(`/users/${id}`, {
      method: 'DELETE',
    });
  },
};

// =====================================
// 場所 API
// =====================================

export const locationApi = {
  /**
   * 場所一覧取得
   */
  getAll: async (): Promise<Location[]> => {
    return fetchWithAuth<Location[]>('/locations');
  },

  /**
   * 場所詳細取得
   */
  getById: async (id: string): Promise<Location> => {
    return fetchWithAuth<Location>(`/locations/${id}`);
  },

  /**
   * 場所作成
   */
  create: async (data: Partial<Location>): Promise<Location> => {
    return fetchWithAuth<Location>('/locations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * 場所更新
   */
  update: async (id: string, data: Partial<Location>): Promise<Location> => {
    return fetchWithAuth<Location>(`/locations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * 場所削除
   */
  delete: async (id: string): Promise<void> => {
    return fetchWithAuth<void>(`/locations/${id}`, {
      method: 'DELETE',
    });
  },
};

// =====================================
// 一括エクスポート API
// =====================================

export const exportApi = {
  /**
   * 一括エクスポート（ZIP）
   */
  bulk: async (params: {
    droneId?: string;
    from?: string;
    to?: string;
    formats: ('csv' | 'excel' | 'pdf')[];
  }): Promise<Blob> => {
    const url = `${API_BASE_URL}/export/bulk`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error('一括エクスポートに失敗しました');
    }

    return response.blob();
  },
};

// =====================================
// ヘルパー関数
// =====================================

/**
 * Blob をダウンロード
 */
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

/**
 * API が利用可能かチェック
 */
export const checkApiHealth = async (): Promise<boolean> => {
  // 環境変数で API ベースURL が設定されていない場合は
  // 「バックエンド未使用」とみなし、実際の HTTP リクエストを飛ばさない
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

  if (!configuredBaseUrl) {
    // バックエンド無しモード: 常にオフライン扱い
    return false;
  }

  // `/api` or `/api/` を取り除いてヘルスチェック用のルートURLを計算
  const apiRoot = configuredBaseUrl.replace(/\/api\/?$/, '');

  try {
    const response = await fetch(`${apiRoot}/health`);
    return response.ok;
  } catch {
    return false;
  }
};

