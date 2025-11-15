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
// 导出默认客户端
// =====================================

export default supabase;

