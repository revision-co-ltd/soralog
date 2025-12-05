// Supabase 客户端服务
// 提供数据库、认证、实时订阅等功能

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// =====================================
// 类型定义
// =====================================

export interface Database {
  public: {
    Tables: {
      flight_logs: {
        Row: FlightLogRow;
        Insert: FlightLogInsert;
        Update: FlightLogUpdate;
      };
      pilots: {
        Row: PilotRow;
        Insert: PilotInsert;
        Update: PilotUpdate;
      };
      uavs: {
        Row: UAVRow;
        Insert: UAVInsert;
        Update: UAVUpdate;
      };
      maintenance_records: {
        Row: MaintenanceRecordRow;
        Insert: MaintenanceRecordInsert;
        Update: MaintenanceRecordUpdate;
      };
    };
  };
}

export interface FlightLogRow {
  id: string;
  user_id: string;
  date: string;
  time: string;
  duration: number;
  location: string;
  location_address_detail?: string;
  location_latitude?: number;
  location_longitude?: number;
  drone_model: string;
  weather?: string;
  wind_speed?: number;
  altitude?: number;
  purpose: string;
  notes?: string;
  pilot: string;
  client_name?: string;
  created_at: string;
  updated_at: string;
  sync_status?: 'pending' | 'synced';
}

export type FlightLogInsert = Omit<FlightLogRow, 'id' | 'created_at' | 'updated_at'>;
export type FlightLogUpdate = Partial<FlightLogInsert>;

export interface PilotRow {
  id: string;
  user_id: string;
  name: string;
  license_number?: string;
  license_type?: string;
  email?: string;
  phone?: string;
  initial_flight_hours: number;
  total_flight_hours: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type PilotInsert = Omit<PilotRow, 'id' | 'created_at' | 'updated_at'>;
export type PilotUpdate = Partial<PilotInsert>;

export interface UAVRow {
  id: string;
  user_id: string;
  nickname: string;
  registration_id?: string;
  manufacturer?: string;
  model: string;
  category: 'certified' | 'uncertified';
  certification_number?: string;
  certification_date?: string;
  total_flight_hours: number;
  hours_since_last_maintenance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type UAVInsert = Omit<UAVRow, 'id' | 'created_at' | 'updated_at'>;
export type UAVUpdate = Partial<UAVInsert>;

// 点検整備記録（様式3）
export interface MaintenanceRecordRow {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  execution_date: string;                    // 実施年月日
  total_flight_time_at_moment?: string;      // 点検整備総時間
  previous_execution_date?: string;          // 前回実施年月日
  executor_id?: string;                      // 実施者ID
  executor_name?: string;                    // 実施者名
  drone_id?: string;                         // ドローンID
  drone_name?: string;                       // ドローン名
  drone_registration_mark?: string;          // ドローン登録記号
  execution_place_id?: string;               // 実施場所ID
  execution_place_name?: string;             // 実施場所名
  execution_place_address?: string;          // 実施場所地番
  remarks?: string;                          // 備考
  reason?: string;                           // 実施理由
  content_equipment_replacement?: string;    // 装備品等の交換
  content_regular_inspection?: string;       // 定期点検の実施
  content_installation_removal?: string;     // 装置等の取付け・取卸し記録
  content_other?: string;                    // その他点検整備等
  sync_status?: 'pending' | 'synced';
  deleted_at?: string;
}

export type MaintenanceRecordInsert = Omit<MaintenanceRecordRow, 'id' | 'created_at' | 'updated_at'>;
export type MaintenanceRecordUpdate = Partial<MaintenanceRecordInsert>;

// =====================================
// Supabase 客户端初始化
// =====================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase 环境变量未配置，将使用离线模式');
}

export const supabase: SupabaseClient<Database> = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

// =====================================
// 配置检查
// =====================================

export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey && 
    supabaseUrl !== 'https://placeholder.supabase.co' &&
    supabaseAnonKey !== 'placeholder-key');
};

// =====================================
// 认证相关
// =====================================

export const supabaseAuth = {
  /**
   * 获取当前用户
   */
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  /**
   * 匿名登录（用于测试和演示）
   */
  signInAnonymously: async () => {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    return data;
  },

  /**
   * 邮箱登录
   */
  signInWithEmail: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  /**
   * 邮箱注册（暂时不需要邮箱验证）
   */
  signUpWithEmail: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined,
        data: {
          email_confirmed: true, // 标记为已确认（需要后端配合）
        },
      },
    });
    if (error) throw error;
    return data;
  },

  /**
   * 登出
   */
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * 监听认证状态变化
   */
  onAuthStateChange: (callback: (user: any) => void) => {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user || null);
    });
  },
};

// =====================================
// 数据库操作 - 飞行记录
// =====================================

export const supabaseFlightLogs = {
  /**
   * 获取所有飞行记录
   */
  getAll: async () => {
    const { data, error } = await supabase
      .from('flight_logs')
      .select('*')
      .order('date', { ascending: false })
      .order('time', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  /**
   * 根据ID获取飞行记录
   */
  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('flight_logs')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * 创建飞行记录
   */
  create: async (flightLog: FlightLogInsert) => {
    const { data, error } = await supabase
      .from('flight_logs')
      .insert(flightLog)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * 更新飞行记录
   */
  update: async (id: string, updates: FlightLogUpdate) => {
    const { data, error } = await supabase
      .from('flight_logs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * 删除飞行记录
   */
  delete: async (id: string) => {
    const { error } = await supabase
      .from('flight_logs')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  /**
   * 订阅实时更新
   */
  subscribe: (callback: (payload: any) => void) => {
    return supabase
      .channel('flight_logs_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'flight_logs' },
        callback
      )
      .subscribe();
  },
};

// =====================================
// 数据库操作 - 飞行员
// =====================================

export const supabasePilots = {
  /**
   * 获取所有飞行员
   */
  getAll: async () => {
    const { data, error } = await supabase
      .from('pilots')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  /**
   * 创建飞行员
   */
  create: async (pilot: PilotInsert) => {
    const { data, error } = await supabase
      .from('pilots')
      .insert(pilot)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * 更新飞行员
   */
  update: async (id: string, updates: PilotUpdate) => {
    const { data, error } = await supabase
      .from('pilots')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * 删除飞行员
   */
  delete: async (id: string) => {
    const { error } = await supabase
      .from('pilots')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// =====================================
// 数据库操作 - 无人机
// =====================================

export const supabaseUAVs = {
  /**
   * 获取所有无人机
   */
  getAll: async () => {
    const { data, error } = await supabase
      .from('uavs')
      .select('*')
      .order('nickname');
    
    if (error) throw error;
    return data || [];
  },

  /**
   * 创建无人机
   */
  create: async (uav: UAVInsert) => {
    const { data, error } = await supabase
      .from('uavs')
      .insert(uav)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * 更新无人机
   */
  update: async (id: string, updates: UAVUpdate) => {
    const { data, error } = await supabase
      .from('uavs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * 删除无人机
   */
  delete: async (id: string) => {
    const { error } = await supabase
      .from('uavs')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// =====================================
// 数据库操作 - 点検整備記録（様式3）
// =====================================

export const supabaseMaintenanceRecords = {
  /**
   * 获取所有点検整備記録
   */
  getAll: async () => {
    const { data, error } = await supabase
      .from('maintenance_records')
      .select('*')
      .is('deleted_at', null)
      .order('execution_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  /**
   * 根据ドローン登録記号获取
   */
  getByDroneRegistrationMark: async (registrationMark: string) => {
    const { data, error } = await supabase
      .from('maintenance_records')
      .select('*')
      .eq('drone_registration_mark', registrationMark)
      .is('deleted_at', null)
      .order('execution_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  /**
   * 根据ID获取
   */
  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('maintenance_records')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * 创建点検整備記録
   */
  create: async (record: MaintenanceRecordInsert) => {
    const { data, error } = await supabase
      .from('maintenance_records')
      .insert(record)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * 更新点検整備記録
   */
  update: async (id: string, updates: MaintenanceRecordUpdate) => {
    const { data, error } = await supabase
      .from('maintenance_records')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * 删除点検整備記録（软删除）
   */
  delete: async (id: string) => {
    const { error } = await supabase
      .from('maintenance_records')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) throw error;
  },

  /**
   * 订阅实时更新
   */
  subscribe: (callback: (payload: any) => void) => {
    return supabase
      .channel('maintenance_records_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'maintenance_records' },
        callback
      )
      .subscribe();
  },
};

// =====================================
// 连接状态检查
// =====================================

export const checkSupabaseConnection = async (): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    console.log('📴 Supabase 未配置，使用离线模式');
    return false;
  }

  try {
    const { error } = await supabase.from('flight_logs').select('count').limit(1);
    if (error) {
      console.warn('⚠️ Supabase 连接失败:', error.message);
      return false;
    }
    console.log('✅ Supabase 连接成功');
    return true;
  } catch (error) {
    console.warn('⚠️ Supabase 连接检查失败:', error);
    return false;
  }
};

// =====================================
// 飞行会话 API（用于同步进行中的飞行状态）
// =====================================

export interface FlightSession {
  id?: string;
  user_id?: string;
  status: 'ready' | 'started' | 'finished';
  start_time?: string | null;
  end_time?: string | null;
  form_data?: any;
  created_at?: string;
  updated_at?: string;
}

export const supabaseFlightSession = {
  /**
   * 获取当前用户的飞行会话
   */
  get: async (): Promise<FlightSession | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('flight_sessions')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      // 如果是"没有找到"错误，返回 null 而不是抛出
      if (error.code === 'PGRST116') return null;
      console.warn('获取飞行会话失败:', error.message);
      return null;
    }
    return data;
  },

  /**
   * 保存/更新飞行会话（upsert）
   */
  save: async (session: Partial<FlightSession>): Promise<FlightSession | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('flight_sessions')
      .upsert({
        user_id: user.id,
        status: session.status || 'ready',
        start_time: session.start_time,
        end_time: session.end_time,
        form_data: session.form_data || {},
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();
    
    if (error) {
      console.error('保存飞行会话失败:', error.message);
      throw error;
    }
    return data;
  },

  /**
   * 重置飞行会话（开始新飞行）
   */
  reset: async (): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('flight_sessions')
      .upsert({
        user_id: user.id,
        status: 'ready',
        start_time: null,
        end_time: null,
        form_data: {},
      }, {
        onConflict: 'user_id',
      });
    
    if (error) {
      console.error('重置飞行会话失败:', error.message);
    }
  },

  /**
   * 删除飞行会话
   */
  delete: async (): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('flight_sessions')
      .delete()
      .eq('user_id', user.id);
    
    if (error) {
      console.error('删除飞行会话失败:', error.message);
    }
  },
};

// =====================================
// 导出默认客户端
// =====================================

export default supabase;

