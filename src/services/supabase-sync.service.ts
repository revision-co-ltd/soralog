// 离线优先同步服务
// 结合 IndexedDB（离线存储）+ Supabase（云同步）
// 策略：先保存本地，后台自动同步到云端

import { storageService, STORES } from './storage.service';
import {
  supabase,
  supabaseAuth,
  supabaseFlightLogs,
  supabasePilots,
  supabaseUAVs,
  isSupabaseConfigured,
  checkSupabaseConnection,
  type FlightLogInsert,
  type PilotInsert,
  type UAVInsert,
} from './supabase.service';

type SyncStatus = 'online' | 'offline' | 'syncing';

// =====================================
// 同步服务类
// =====================================

class SupabaseSyncService {
  private status: SyncStatus = 'offline';
  private syncInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(status: SyncStatus) => void> = new Set();
  private isInitialized = false;
  private currentUserId: string | null = null;

  // ==================== 初始化 ====================

  async init() {
    if (this.isInitialized) {
      console.log('🔄 同步服务已初始化');
      return;
    }

    console.log('🚀 初始化离线优先同步服务...');

    // 初始化 IndexedDB
    await storageService.init();
    console.log('✅ IndexedDB 初始化完成');

    // 检查 Supabase 配置
    if (!isSupabaseConfigured()) {
      console.log('📴 Supabase 未配置，使用纯离线模式');
      this.setStatus('offline');
      this.isInitialized = true;
      return;
    }

    // 检查用户登录状态（不自动匿名登录）
    try {
      const user = await supabaseAuth.getCurrentUser();
      if (user) {
        this.currentUserId = user.id;
        console.log('✅ 已登录用户:', user.id, user.email);
      } else {
        console.log('👤 未登录，将使用离线模式');
        console.log('💡 提示：登录后可实现多设备数据同步');
        this.setStatus('offline');
        this.isInitialized = true;
        return;
      }
    } catch (error) {
      console.warn('⚠️ 认证检查失败，使用离线模式:', error);
      this.setStatus('offline');
      this.isInitialized = true;
      return;
    }

    // 检查在线状态
    await this.checkOnlineStatus();

    // 开始网络监控
    this.startNetworkMonitoring();

    // 开始自动同步
    this.startAutoSync();

    // 监听认证状态
    supabaseAuth.onAuthStateChange((user) => {
      this.currentUserId = user?.id || null;
      if (user) {
        console.log('👤 用户登录，触发同步');
        this.triggerSync();
      }
    });

    this.isInitialized = true;
    console.log('✅ 同步服务初始化完成');
  }

  // ==================== 网络监控 ====================

  private async checkOnlineStatus() {
    if (!navigator.onLine) {
      this.setStatus('offline');
      return;
    }

    const isConnected = await checkSupabaseConnection();
    this.setStatus(isConnected ? 'online' : 'offline');
  }

  private startNetworkMonitoring() {
    window.addEventListener('online', () => {
      console.log('📡 网络连接恢复');
      this.checkOnlineStatus().then(() => {
        if (this.status === 'online') {
          this.triggerSync();
        }
      });
    });

    window.addEventListener('offline', () => {
      console.log('📡 网络断开');
      this.setStatus('offline');
    });

    // 定期检查连接（每30秒）
    setInterval(() => this.checkOnlineStatus(), 30000);
  }

  private startAutoSync() {
    // 每5分钟自动同步一次
    this.syncInterval = setInterval(() => {
      if (this.status === 'online') {
        console.log('⏰ 定时自动同步');
        this.triggerSync();
      }
    }, 5 * 60 * 1000);
  }

  // ==================== 同步逻辑 ====================

  async triggerSync(): Promise<{ success: number; failed: number }> {
    if (this.status !== 'online') {
      console.log('📴 离线状态，跳过同步');
      return { success: 0, failed: 0 };
    }

    if (!this.currentUserId) {
      console.log('👤 未登录，跳过同步');
      return { success: 0, failed: 0 };
    }

    this.setStatus('syncing');
    console.log('🔄 开始同步到 Supabase...');

    let success = 0;
    let failed = 0;

    try {
      // 获取待同步的项目
      const pendingItems = await storageService.getPendingSyncItems();
      console.log(`📦 找到 ${pendingItems.length} 个待同步项目`);

      for (const item of pendingItems) {
        try {
          await this.syncItem(item);
          await storageService.updateSyncItemStatus(item.id, 'success');
          success++;
        } catch (error) {
          console.error('❌ 同步失败:', error);
          await storageService.updateSyncItemStatus(
            item.id,
            'error',
            item.retryCount + 1
          );
          failed++;
        }
      }

      // 清除成功的同步项目
      await storageService.clearSuccessfulSyncItems();
      await storageService.setMetadata('lastSyncTime', Date.now());

      console.log(`✅ 同步完成: 成功 ${success}, 失败 ${failed}`);
      this.setStatus('online');

      return { success, failed };
    } catch (error) {
      console.error('❌ 同步过程出错:', error);
      this.setStatus('online');
      return { success, failed };
    }
  }

  private async syncItem(item: any) {
    const { type, storeName, data } = item;

    console.log(`📤 同步: ${type} ${storeName} ${data.id}`);

    switch (storeName) {
      case STORES.FLIGHT_LOGS:
        if (type === 'create') {
          await supabaseFlightLogs.create(this.convertToSupabaseFormat(data, 'flight'));
        } else if (type === 'update') {
          await supabaseFlightLogs.update(data.id, data);
        } else if (type === 'delete') {
          await supabaseFlightLogs.delete(data.id);
        }
        break;

      case STORES.PILOTS:
        if (type === 'create') {
          await supabasePilots.create(this.convertToSupabaseFormat(data, 'pilot'));
        } else if (type === 'update') {
          await supabasePilots.update(data.id, data);
        } else if (type === 'delete') {
          await supabasePilots.delete(data.id);
        }
        break;

      case STORES.UAVS:
        if (type === 'create') {
          await supabaseUAVs.create(this.convertToSupabaseFormat(data, 'uav'));
        } else if (type === 'update') {
          await supabaseUAVs.update(data.id, data);
        } else if (type === 'delete') {
          await supabaseUAVs.delete(data.id);
        }
        break;
    }
  }

  // ==================== 数据操作（离线优先） ====================

  /**
   * 保存飞行记录（离线优先）
   */
  async saveFlightLog(data: any): Promise<string> {
    const id = data.id || this.generateId();
    const flightLog = {
      ...data,
      id,
      syncStatus: 'pending' as const,
    };

    // 1. 立即保存到 IndexedDB
    await storageService.save(STORES.FLIGHT_LOGS, flightLog);
    console.log('💾 飞行记录已保存到本地:', id);

    // 2. 添加到同步队列
    await storageService.addToSyncQueue({
      type: 'create',
      storeName: STORES.FLIGHT_LOGS,
      data: flightLog,
    });

    // 3. 如果在线，立即尝试同步
    if (this.status === 'online') {
      this.triggerSync().catch(console.error);
    }

    return id;
  }

  /**
   * 更新飞行记录（离线优先）
   */
  async updateFlightLog(id: string, updates: any): Promise<void> {
    // 1. 更新本地数据
    const existing = await storageService.get(STORES.FLIGHT_LOGS, id);
    if (existing) {
      await storageService.save(STORES.FLIGHT_LOGS, {
        ...existing,
        ...updates,
        syncStatus: 'pending',
      });
    }

    // 2. 添加到同步队列
    await storageService.addToSyncQueue({
      type: 'update',
      storeName: STORES.FLIGHT_LOGS,
      data: { id, ...updates },
    });

    // 3. 尝试同步
    if (this.status === 'online') {
      this.triggerSync().catch(console.error);
    }
  }

  /**
   * 删除飞行记录（离线优先）
   */
  async deleteFlightLog(id: string): Promise<void> {
    // 1. 从本地删除
    await storageService.delete(STORES.FLIGHT_LOGS, id);

    // 2. 添加到同步队列
    await storageService.addToSyncQueue({
      type: 'delete',
      storeName: STORES.FLIGHT_LOGS,
      data: { id },
    });

    // 3. 尝试同步
    if (this.status === 'online') {
      this.triggerSync().catch(console.error);
    }
  }

  /**
   * 获取飞行记录（离线优先）
   */
  async getFlightLogs(): Promise<any[]> {
    // 如果在线，尝试从云端获取最新数据
    if (this.status === 'online') {
      try {
        const cloudData = await supabaseFlightLogs.getAll();
        // 更新本地缓存
        for (const item of cloudData) {
          await storageService.save(STORES.FLIGHT_LOGS, {
            ...item,
            syncStatus: 'synced',
          });
        }
        console.log('📥 从云端获取了', cloudData.length, '条飞行记录');
        return cloudData.map(this.convertFromSupabaseFormat);
      } catch (error) {
        console.warn('⚠️ 云端获取失败，使用本地数据:', error);
      }
    }

    // 离线或获取失败，使用本地数据
    const localData = await storageService.getAll(STORES.FLIGHT_LOGS);
    console.log('📦 从本地获取了', localData.length, '条飞行记录');
    return localData.map(this.convertFromSupabaseFormat);
  }

  /**
   * 保存飞行员
   */
  async savePilot(data: any): Promise<string> {
    const id = data.id || this.generateId();
    const pilot = { ...data, id, syncStatus: 'pending' as const };

    await storageService.save(STORES.PILOTS, pilot);
    await storageService.addToSyncQueue({
      type: 'create',
      storeName: STORES.PILOTS,
      data: pilot,
    });

    if (this.status === 'online') {
      this.triggerSync().catch(console.error);
    }

    return id;
  }

  /**
   * 获取飞行员
   */
  async getPilots(): Promise<any[]> {
    if (this.status === 'online') {
      try {
        const cloudData = await supabasePilots.getAll();
        for (const item of cloudData) {
          await storageService.save(STORES.PILOTS, { ...item, syncStatus: 'synced' });
        }
        return cloudData.map(this.convertFromSupabaseFormat);
      } catch (error) {
        console.warn('⚠️ 云端获取飞行员失败:', error);
      }
    }

    const localData = await storageService.getAll(STORES.PILOTS);
    return localData.map(this.convertFromSupabaseFormat);
  }

  /**
   * 保存无人机
   */
  async saveUAV(data: any): Promise<string> {
    const id = data.id || this.generateId();
    const uav = { ...data, id, syncStatus: 'pending' as const };

    await storageService.save(STORES.UAVS, uav);
    await storageService.addToSyncQueue({
      type: 'create',
      storeName: STORES.UAVS,
      data: uav,
    });

    if (this.status === 'online') {
      this.triggerSync().catch(console.error);
    }

    return id;
  }

  /**
   * 获取无人机
   */
  async getUAVs(): Promise<any[]> {
    if (this.status === 'online') {
      try {
        const cloudData = await supabaseUAVs.getAll();
        for (const item of cloudData) {
          await storageService.save(STORES.UAVS, { ...item, syncStatus: 'synced' });
        }
        return cloudData.map(this.convertFromSupabaseFormat);
      } catch (error) {
        console.warn('⚠️ 云端获取无人机失败:', error);
      }
    }

    const localData = await storageService.getAll(STORES.UAVS);
    return localData.map(this.convertFromSupabaseFormat);
  }

  // ==================== 数据格式转换 ====================

  /**
   * 将本地格式转换为 Supabase 格式（蛇形命名）
   */
  private convertToSupabaseFormat(data: any, type: 'flight' | 'pilot' | 'uav'): any {
    if (!this.currentUserId) {
      throw new Error('用户未登录');
    }

    const base = {
      user_id: this.currentUserId,
    };

    if (type === 'flight') {
      return {
        ...base,
        date: data.date,
        time: data.time,
        duration: data.duration,
        location: data.location,
        location_address_detail: data.locationAddressDetail,
        location_latitude: data.locationLatitude,
        location_longitude: data.locationLongitude,
        drone_model: data.droneModel,
        weather: data.weather,
        wind_speed: data.windSpeed,
        altitude: data.altitude,
        purpose: data.purpose,
        notes: data.notes,
        pilot: data.pilot,
        client_name: data.clientName,
      };
    }

    if (type === 'pilot') {
      return {
        ...base,
        name: data.name,
        license_number: data.licenseNumber,
        license_type: data.licenseType,
        email: data.email,
        phone: data.phone,
        initial_flight_hours: data.initialFlightHours || 0,
        total_flight_hours: data.totalFlightHours || 0,
        is_active: data.isActive !== false,
      };
    }

    if (type === 'uav') {
      return {
        ...base,
        nickname: data.nickname,
        registration_id: data.registrationId,
        manufacturer: data.manufacturer,
        model: data.model,
        category: data.category || 'uncertified',
        certification_number: data.certificationNumber,
        certification_date: data.certificationDate,
        total_flight_hours: data.totalFlightHours || 0,
        hours_since_last_maintenance: data.hoursSinceLastMaintenance || 0,
        is_active: data.isActive !== false,
      };
    }

    return data;
  }

  /**
   * 将 Supabase 格式转换为应用格式（驼峰命名）
   */
  private convertFromSupabaseFormat(data: any): any {
    return {
      id: data.id,
      date: data.date,
      time: data.time,
      duration: data.duration,
      location: data.location,
      locationAddressDetail: data.location_address_detail,
      locationLatitude: data.location_latitude,
      locationLongitude: data.location_longitude,
      droneModel: data.drone_model || data.model,
      weather: data.weather,
      windSpeed: data.wind_speed,
      altitude: data.altitude,
      purpose: data.purpose,
      notes: data.notes,
      pilot: data.pilot || data.name,
      clientName: data.client_name,
      // 飞行员字段
      name: data.name,
      licenseNumber: data.license_number,
      licenseType: data.license_type,
      email: data.email,
      phone: data.phone,
      initialFlightHours: data.initial_flight_hours,
      totalFlightHours: data.total_flight_hours,
      // 无人机字段
      nickname: data.nickname,
      registrationId: data.registration_id,
      manufacturer: data.manufacturer,
      model: data.model,
      category: data.category,
      certificationNumber: data.certification_number,
      certificationDate: data.certification_date,
      hoursSinceLastMaintenance: data.hours_since_last_maintenance,
      isActive: data.is_active,
    };
  }

  // ==================== 状态管理 ====================

  private setStatus(status: SyncStatus) {
    if (this.status !== status) {
      this.status = status;
      this.notifyListeners();
    }
  }

  getStatus(): SyncStatus {
    return this.status;
  }

  isOnline(): boolean {
    return this.status === 'online';
  }

  onStatusChange(callback: (status: SyncStatus) => void) {
    this.listeners.add(callback);
    callback(this.status); // 立即调用一次
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    this.listeners.forEach((callback) => callback(this.status));
  }

  // ==================== 工具方法 ====================

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async getSyncStats() {
    const stats = await storageService.getSyncStats();
    return {
      ...stats,
      status: this.status,
      isConfigured: isSupabaseConfigured(),
      userId: this.currentUserId,
    };
  }

  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

// =====================================
// 导出单例
// =====================================

export const supabaseSyncService = new SupabaseSyncService();
export default supabaseSyncService;

