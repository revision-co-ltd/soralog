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
  supabaseMaintenanceRecords,
  supabaseFlightSession,
  isSupabaseConfigured,
  checkSupabaseConnection,
  type FlightLogInsert,
  type PilotInsert,
  type UAVInsert,
  type MaintenanceRecordInsert,
  type FlightSession,
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
        console.log('👤 用户登录，触发强制同步');
        // 登录后使用强制同步，会先检查在线状态
        this.forceSyncOnLogin().catch((error) => {
          console.error('❌ 登录后同步失败:', error);
        });
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

  /**
   * 强制同步（用于登录后）- 不检查当前状态，强制尝试连接
   */
  async forceSyncOnLogin(): Promise<{ success: number; failed: number }> {
    console.log('🔐 登录后强制同步...');
    
    // 获取当前用户
    try {
      const user = await supabaseAuth.getCurrentUser();
      if (user) {
        this.currentUserId = user.id;
        console.log('✅ 确认用户已登录:', user.id);
      } else {
        console.log('👤 未登录，无法同步');
        return { success: 0, failed: 0 };
      }
    } catch (error) {
      console.warn('⚠️ 获取用户信息失败:', error);
      return { success: 0, failed: 0 };
    }

    // 1. 强制检查在线状态
    await this.checkOnlineStatus();
    console.log(`📡 当前状态: ${this.status}`);
    
    // 2. 如果仍然离线，直接返回
    if (this.status === 'offline') {
      console.log('📴 确认离线，无法同步');
      return { success: 0, failed: 0 };
    }
    
    // 3. 在线，执行同步
    return this.triggerSync();
  }
  
  /**
   * 强制从云端拉取数据（登录后使用）
   */
  async forcePullFromCloud(): Promise<void> {
    console.log('📥 强制从云端拉取数据...');
    
    if (!this.currentUserId) {
      console.log('👤 未登录，无法拉取');
      return;
    }
    
    // 强制检查在线状态
    await this.checkOnlineStatus();
    
    if (this.status !== 'online') {
      console.log('📴 离线状态，无法拉取');
      return;
    }
    
    // 这个方法的目的是确保之后调用 getFlightLogs 等方法时能从云端获取数据
    // 状态已经是 online，getXxx 方法会自动从云端获取
    console.log('✅ 已确认在线状态，可以从云端拉取数据');
  }

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
          // 🔧 修复：update 也需要转换为 Supabase 格式
          const updateData = this.convertUpdateToSupabaseFormat(data, 'flight');
          await supabaseFlightLogs.update(data.id, updateData);
        } else if (type === 'delete') {
          await supabaseFlightLogs.delete(data.id);
        }
        break;

      case STORES.PILOTS:
        if (type === 'create') {
          await supabasePilots.create(this.convertToSupabaseFormat(data, 'pilot'));
        } else if (type === 'update') {
          const updateData = this.convertUpdateToSupabaseFormat(data, 'pilot');
          await supabasePilots.update(data.id, updateData);
        } else if (type === 'delete') {
          await supabasePilots.delete(data.id);
        }
        break;

      case STORES.UAVS:
        if (type === 'create') {
          await supabaseUAVs.create(this.convertToSupabaseFormat(data, 'uav'));
        } else if (type === 'update') {
          const updateData = this.convertUpdateToSupabaseFormat(data, 'uav');
          await supabaseUAVs.update(data.id, updateData);
        } else if (type === 'delete') {
          await supabaseUAVs.delete(data.id);
        }
        break;

      case STORES.MAINTENANCE_RECORDS:
        if (type === 'create') {
          await supabaseMaintenanceRecords.create(this.convertMaintenanceRecordToSupabaseFormat(data));
        } else if (type === 'update') {
          await supabaseMaintenanceRecords.update(data.id, this.convertMaintenanceRecordToSupabaseFormat(data));
        } else if (type === 'delete') {
          await supabaseMaintenanceRecords.delete(data.id);
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

    console.log('📝 saveFlightLog 开始:', { id, status: this.status });

    // 1. 立即保存到 IndexedDB
    await storageService.save(STORES.FLIGHT_LOGS, flightLog);
    console.log('💾 飞行记录已保存到本地:', id);

    // 2. 如果在线，立即同步到云端
    if (this.status === 'online' && this.currentUserId) {
      try {
        console.log('☁️ 立即同步到云端...');
        const supabaseData = this.convertToSupabaseFormat(flightLog, 'flight');
        const result = await supabaseFlightLogs.create(supabaseData);
        
        // 如果云端返回了新 ID，更新本地数据
        if (result?.id && result.id !== id) {
          await storageService.delete(STORES.FLIGHT_LOGS, id);
          await storageService.save(STORES.FLIGHT_LOGS, { 
            ...flightLog, 
            id: result.id, 
            syncStatus: 'synced' 
          });
          console.log('✅ 云端同步成功，新ID:', result.id);
          return result.id;
        }
        
        // 更新本地同步状态
        await storageService.save(STORES.FLIGHT_LOGS, { ...flightLog, syncStatus: 'synced' });
        console.log('✅ 云端同步成功');
      } catch (error) {
        console.error('❌ 云端同步失败，添加到队列:', error);
        await storageService.addToSyncQueue({
          type: 'create',
          storeName: STORES.FLIGHT_LOGS,
          data: flightLog,
        });
      }
    } else {
      // 离线状态，添加到同步队列
      console.log('📴 离线状态，添加到同步队列');
      await storageService.addToSyncQueue({
        type: 'create',
        storeName: STORES.FLIGHT_LOGS,
        data: flightLog,
      });
    }

    return id;
  }

  /**
   * 更新飞行记录（离线优先）
   */
  async updateFlightLog(id: string, updates: any): Promise<void> {
    console.log('📝 updateFlightLog 开始:', { id, updates, status: this.status });
    
    // 1. 更新本地数据
    const existing = await storageService.get(STORES.FLIGHT_LOGS, id);
    if (existing) {
      await storageService.save(STORES.FLIGHT_LOGS, {
        ...existing,
        ...updates,
        syncStatus: 'pending',
      });
      console.log('💾 本地数据已更新');
    }

    // 2. 如果在线，立即同步到云端
    if (this.status === 'online' && this.currentUserId) {
      try {
        console.log('☁️ 立即同步到云端...');
        const updateData = this.convertUpdateToSupabaseFormat(updates, 'flight');
        await supabaseFlightLogs.update(id, updateData);
        
        // 更新本地同步状态
        if (existing) {
          await storageService.save(STORES.FLIGHT_LOGS, {
            ...existing,
            ...updates,
            syncStatus: 'synced',
          });
        }
        console.log('✅ 云端同步成功');
      } catch (error) {
        console.error('❌ 云端同步失败，添加到队列:', error);
        // 同步失败，添加到同步队列稍后重试
        await storageService.addToSyncQueue({
          type: 'update',
          storeName: STORES.FLIGHT_LOGS,
          data: { id, ...updates },
        });
      }
    } else {
      // 离线状态，添加到同步队列
      console.log('📴 离线状态，添加到同步队列');
      await storageService.addToSyncQueue({
        type: 'update',
        storeName: STORES.FLIGHT_LOGS,
        data: { id, ...updates },
      });
    }
  }

  /**
   * 删除飞行记录（离线优先）
   */
  async deleteFlightLog(id: string): Promise<void> {
    console.log('🗑️ deleteFlightLog 开始:', { id, status: this.status });
    
    // 1. 从本地删除
    await storageService.delete(STORES.FLIGHT_LOGS, id);
    console.log('💾 本地数据已删除');

    // 2. 如果在线，立即同步到云端
    if (this.status === 'online' && this.currentUserId) {
      try {
        console.log('☁️ 立即从云端删除...');
        await supabaseFlightLogs.delete(id);
        console.log('✅ 云端删除成功');
      } catch (error) {
        console.error('❌ 云端删除失败，添加到队列:', error);
        await storageService.addToSyncQueue({
          type: 'delete',
          storeName: STORES.FLIGHT_LOGS,
          data: { id },
        });
      }
    } else {
      // 离线状态，添加到同步队列
      console.log('📴 离线状态，添加到同步队列');
      await storageService.addToSyncQueue({
        type: 'delete',
        storeName: STORES.FLIGHT_LOGS,
        data: { id },
      });
    }
  }

  /**
   * 获取飞行记录（离线优先）
   */
  async getFlightLogs(): Promise<any[]> {
    // 如果在线且已登录，尝试从云端获取最新数据
    if (this.status === 'online' && this.currentUserId) {
      try {
        const cloudData = await supabaseFlightLogs.getAll();
        console.log('📥 从云端获取了', cloudData.length, '条飞行记录');
        
        // 获取本地数据
        const localData = await storageService.getAll(STORES.FLIGHT_LOGS);
        
        // 找出本地未同步的数据（ID以local开头或syncStatus为pending）
        const localPendingData = localData.filter(item => 
          (item.syncStatus === 'pending' || item.id?.toString().startsWith('local')) &&
          // 排除已经在云端存在的数据（通过date+location+pilot判断）
          !cloudData.some(cloud => 
            cloud.date === item.date && 
            cloud.location === item.location && 
            cloud.pilot === item.pilot &&
            cloud.duration === item.duration
          )
        );
        
        // 清除本地已同步的旧数据，重新保存云端数据
        for (const item of localData) {
          if (item.syncStatus !== 'pending' && !item.id?.toString().startsWith('local')) {
            await storageService.delete(STORES.FLIGHT_LOGS, item.id);
          }
        }
        
        // 保存云端数据到本地缓存
        for (const item of cloudData) {
          await storageService.save(STORES.FLIGHT_LOGS, {
            ...item,
            syncStatus: 'synced',
          });
        }
        
        // 合并：云端数据 + 本地未同步数据（去重后）
        const result = [
          ...cloudData.map(this.convertFromSupabaseFormat),
          ...localPendingData.map(this.convertFromSupabaseFormat),
        ];
        
        console.log('📊 总计飞行记录:', result.length, '(云端:', cloudData.length, ', 本地待同步:', localPendingData.length, ')');
        return result;
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
   * 保存飞行员（创建）
   */
  async savePilot(data: any): Promise<string> {
    const id = data.id || this.generateId();
    const pilot = { ...data, id, syncStatus: 'pending' as const };
    
    console.log('📝 savePilot 开始:', { id, data, status: this.status });

    // 1. 保存到本地
    await storageService.save(STORES.PILOTS, pilot);
    console.log('💾 本地数据已保存');
    
    // 判断是创建还是更新
    const isUpdate = !!data.id && !data.id.toString().startsWith('local');

    // 2. 如果在线，立即同步到云端
    if (this.status === 'online' && this.currentUserId) {
      try {
        console.log('☁️ 立即同步到云端...');
        const supabaseData = this.convertToSupabaseFormat(pilot, 'pilot');
        
        if (isUpdate) {
          const updateData = this.convertUpdateToSupabaseFormat(data, 'pilot');
          await supabasePilots.update(id, updateData);
        } else {
          const result = await supabasePilots.create(supabaseData);
          // 如果云端返回了新 ID，更新本地数据
          if (result?.id && result.id !== id) {
            await storageService.delete(STORES.PILOTS, id);
            await storageService.save(STORES.PILOTS, { 
              ...pilot, 
              id: result.id, 
              syncStatus: 'synced' 
            });
            console.log('✅ 云端同步成功，新ID:', result.id);
            return result.id;
          }
        }
        
        // 更新本地同步状态
        await storageService.save(STORES.PILOTS, { ...pilot, syncStatus: 'synced' });
        console.log('✅ 云端同步成功');
      } catch (error) {
        console.error('❌ 云端同步失败，添加到队列:', error);
        await storageService.addToSyncQueue({
          type: isUpdate ? 'update' : 'create',
          storeName: STORES.PILOTS,
          data: pilot,
        });
      }
    } else {
      // 离线状态，添加到同步队列
      console.log('📴 离线状态，添加到同步队列');
      await storageService.addToSyncQueue({
        type: isUpdate ? 'update' : 'create',
        storeName: STORES.PILOTS,
        data: pilot,
      });
    }

    return id;
  }

  /**
   * 更新飞行员
   */
  async updatePilot(id: string, updates: any): Promise<void> {
    console.log('📝 updatePilot 开始:', { id, updates, status: this.status });
    
    // 1. 更新本地数据
    const existing = await storageService.get(STORES.PILOTS, id);
    if (existing) {
      await storageService.save(STORES.PILOTS, {
        ...existing,
        ...updates,
        syncStatus: 'pending',
      });
      console.log('💾 本地数据已更新');
    }

    // 2. 如果在线，立即同步到云端
    if (this.status === 'online' && this.currentUserId) {
      try {
        console.log('☁️ 立即同步到云端...');
        const updateData = this.convertUpdateToSupabaseFormat(updates, 'pilot');
        await supabasePilots.update(id, updateData);
        
        // 更新本地同步状态
        if (existing) {
          await storageService.save(STORES.PILOTS, {
            ...existing,
            ...updates,
            syncStatus: 'synced',
          });
        }
        console.log('✅ 云端同步成功');
      } catch (error) {
        console.error('❌ 云端同步失败，添加到队列:', error);
        await storageService.addToSyncQueue({
          type: 'update',
          storeName: STORES.PILOTS,
          data: { id, ...updates },
        });
      }
    } else {
      console.log('📴 离线状态，添加到同步队列');
      await storageService.addToSyncQueue({
        type: 'update',
        storeName: STORES.PILOTS,
        data: { id, ...updates },
      });
    }
  }

  /**
   * 获取飞行员（自动合并本地和云端）
   */
  async getPilots(): Promise<any[]> {
    // 1. 尝试从云端获取（在线且已登录）
    if (this.status === 'online' && this.currentUserId) {
      try {
        const cloudData = await supabasePilots.getAll();
        console.log('☁️ 从云端获取了', cloudData.length, '个飞行员');
        
        // 获取本地数据
        const localData = await storageService.getAll(STORES.PILOTS);
        
        // 找出本地未同步的数据（排除已在云端存在的）
        const localPendingData = localData.filter(item => 
          (item.syncStatus === 'pending' || item.id?.toString().startsWith('local')) &&
          !cloudData.some(cloud => cloud.name === item.name)
        );
        
        // 清除本地已同步的旧数据
        for (const item of localData) {
          if (item.syncStatus !== 'pending' && !item.id?.toString().startsWith('local')) {
            await storageService.delete(STORES.PILOTS, item.id);
          }
        }
        
        // 保存云端数据到本地
        for (const item of cloudData) {
          await storageService.save(STORES.PILOTS, { 
            ...item, 
            syncStatus: 'synced' 
          });
        }
        
        // 合并：云端数据 + 本地未同步数据
        const result = [
          ...cloudData.map(this.convertFromSupabaseFormat),
          ...localPendingData.map(this.convertFromSupabaseFormat),
        ];
        
        console.log('📊 总计飞行员:', result.length, '(云端:', cloudData.length, ', 本地待同步:', localPendingData.length, ')');
        return result;
      } catch (error) {
        console.warn('⚠️ 云端获取飞行员失败:', error);
      }
    }

    // 2. 离线时从本地获取
    const localData = await storageService.getAll(STORES.PILOTS);
    console.log('📦 从本地获取了', localData.length, '个飞行员');
    return localData.map(this.convertFromSupabaseFormat);
  }

  /**
   * 保存无人机（创建）
   */
  async saveUAV(data: any): Promise<string> {
    const id = data.id || this.generateId();
    const uav = { ...data, id, syncStatus: 'pending' as const };
    
    console.log('📝 saveUAV 开始:', { id, data, status: this.status });

    // 1. 保存到本地
    await storageService.save(STORES.UAVS, uav);
    console.log('💾 本地数据已保存');
    
    // 判断是创建还是更新
    const isUpdate = !!data.id && !data.id.toString().startsWith('local');

    // 2. 如果在线，立即同步到云端
    if (this.status === 'online' && this.currentUserId) {
      try {
        console.log('☁️ 立即同步到云端...');
        const supabaseData = this.convertToSupabaseFormat(uav, 'uav');
        
        if (isUpdate) {
          const updateData = this.convertUpdateToSupabaseFormat(data, 'uav');
          await supabaseUAVs.update(id, updateData);
        } else {
          const result = await supabaseUAVs.create(supabaseData);
          // 如果云端返回了新 ID，更新本地数据
          if (result?.id && result.id !== id) {
            await storageService.delete(STORES.UAVS, id);
            await storageService.save(STORES.UAVS, { 
              ...uav, 
              id: result.id, 
              syncStatus: 'synced' 
            });
            console.log('✅ 云端同步成功，新ID:', result.id);
            return result.id;
          }
        }
        
        // 更新本地同步状态
        await storageService.save(STORES.UAVS, { ...uav, syncStatus: 'synced' });
        console.log('✅ 云端同步成功');
      } catch (error) {
        console.error('❌ 云端同步失败，添加到队列:', error);
        await storageService.addToSyncQueue({
          type: isUpdate ? 'update' : 'create',
          storeName: STORES.UAVS,
          data: uav,
        });
      }
    } else {
      // 离线状态，添加到同步队列
      console.log('📴 离线状态，添加到同步队列');
      await storageService.addToSyncQueue({
        type: isUpdate ? 'update' : 'create',
        storeName: STORES.UAVS,
        data: uav,
      });
    }

    return id;
  }

  /**
   * 更新无人机
   */
  async updateUAV(id: string, updates: any): Promise<void> {
    console.log('📝 updateUAV 开始:', { id, updates, status: this.status });
    
    // 1. 更新本地数据
    const existing = await storageService.get(STORES.UAVS, id);
    if (existing) {
      await storageService.save(STORES.UAVS, {
        ...existing,
        ...updates,
        syncStatus: 'pending',
      });
      console.log('💾 本地数据已更新');
    }

    // 2. 如果在线，立即同步到云端
    if (this.status === 'online' && this.currentUserId) {
      try {
        console.log('☁️ 立即同步到云端...');
        const updateData = this.convertUpdateToSupabaseFormat(updates, 'uav');
        await supabaseUAVs.update(id, updateData);
        
        // 更新本地同步状态
        if (existing) {
          await storageService.save(STORES.UAVS, {
            ...existing,
            ...updates,
            syncStatus: 'synced',
          });
        }
        console.log('✅ 云端同步成功');
      } catch (error) {
        console.error('❌ 云端同步失败，添加到队列:', error);
        await storageService.addToSyncQueue({
          type: 'update',
          storeName: STORES.UAVS,
          data: { id, ...updates },
        });
      }
    } else {
      console.log('📴 离线状态，添加到同步队列');
      await storageService.addToSyncQueue({
        type: 'update',
        storeName: STORES.UAVS,
        data: { id, ...updates },
      });
    }
  }

  /**
   * 获取无人机（自动合并本地和云端）
   */
  async getUAVs(): Promise<any[]> {
    // 1. 尝试从云端获取（在线且已登录）
    if (this.status === 'online' && this.currentUserId) {
      try {
        const cloudData = await supabaseUAVs.getAll();
        console.log('☁️ 从云端获取了', cloudData.length, '个无人机');
        
        // 获取本地数据
        const localData = await storageService.getAll(STORES.UAVS);
        
        // 找出本地未同步的数据（排除已在云端存在的）
        const localPendingData = localData.filter(item => 
          (item.syncStatus === 'pending' || item.id?.toString().startsWith('local')) &&
          !cloudData.some(cloud => cloud.nickname === item.nickname)
        );
        
        // 清除本地已同步的旧数据
        for (const item of localData) {
          if (item.syncStatus !== 'pending' && !item.id?.toString().startsWith('local')) {
            await storageService.delete(STORES.UAVS, item.id);
          }
        }
        
        // 保存云端数据到本地
        for (const item of cloudData) {
          await storageService.save(STORES.UAVS, { 
            ...item, 
            syncStatus: 'synced' 
          });
        }
        
        // 合并：云端数据 + 本地未同步数据
        const result = [
          ...cloudData.map(this.convertFromSupabaseFormat),
          ...localPendingData.map(this.convertFromSupabaseFormat),
        ];
        
        console.log('📊 总计无人机:', result.length, '(云端:', cloudData.length, ', 本地待同步:', localPendingData.length, ')');
        return result;
      } catch (error) {
        console.warn('⚠️ 云端获取无人机失败:', error);
      }
    }

    // 2. 离线时从本地获取
    const localData = await storageService.getAll(STORES.UAVS);
    console.log('📦 从本地获取了', localData.length, '个无人机');
    return localData.map(this.convertFromSupabaseFormat);
  }

  // ==================== 点検整備記録 ====================

  /**
   * 保存点検整備記録（离线优先）
   */
  async saveMaintenanceRecord(data: any): Promise<string> {
    const id = data.id || this.generateId();
    
    // Date オブジェクトを文字列に変換（IndexedDB 保存用）
    const executionDateStr = data.executionDate instanceof Date 
      ? data.executionDate.toISOString().split('T')[0]
      : data.executionDate;
    
    const previousExecutionDateStr = data.previousExecutionDate instanceof Date 
      ? data.previousExecutionDate.toISOString().split('T')[0]
      : data.previousExecutionDate;
    
    const record = {
      ...data,
      id,
      executionDate: executionDateStr,
      previousExecutionDate: previousExecutionDateStr || null,
      createdAt: data.createdAt || new Date().toISOString(),
      syncStatus: 'pending' as const,
    };

    console.log('📝 saveMaintenanceRecord 开始:', { id, record, status: this.status });

    // 1. 立即保存到 IndexedDB
    try {
      await storageService.save(STORES.MAINTENANCE_RECORDS, record);
      console.log('💾 点検整備記録已保存到本地:', id);
    } catch (localError) {
      console.error('❌ ローカル保存失敗:', localError);
      throw new Error(`ローカル保存に失敗しました: ${localError}`);
    }

    // 2. 如果在线，立即同步到云端
    if (this.status === 'online' && this.currentUserId) {
      try {
        console.log('☁️ 立即同步到云端...');
        const supabaseData = this.convertMaintenanceRecordToSupabaseFormat(record);
        const result = await supabaseMaintenanceRecords.create(supabaseData);
        
        // 如果云端返回了新 ID，更新本地数据
        if (result?.id && result.id !== id) {
          await storageService.delete(STORES.MAINTENANCE_RECORDS, id);
          await storageService.save(STORES.MAINTENANCE_RECORDS, { 
            ...record, 
            id: result.id, 
            syncStatus: 'synced' 
          });
          console.log('✅ 云端同步成功，新ID:', result.id);
          return result.id;
        }
        
        // 更新本地同步状态
        await storageService.save(STORES.MAINTENANCE_RECORDS, { ...record, syncStatus: 'synced' });
        console.log('✅ 云端同步成功');
      } catch (error) {
        console.error('❌ 云端同步失败，添加到队列:', error);
        await storageService.addToSyncQueue({
          type: 'create',
          storeName: STORES.MAINTENANCE_RECORDS,
          data: record,
        });
      }
    } else {
      // 离线状态，添加到同步队列
      console.log('📴 离线状态，添加到同步队列');
      await storageService.addToSyncQueue({
        type: 'create',
        storeName: STORES.MAINTENANCE_RECORDS,
        data: record,
      });
    }

    return id;
  }

  /**
   * 获取点検整備記録（离线优先）
   */
  async getMaintenanceRecords(): Promise<any[]> {
    // 如果在线且已登录，尝试从云端获取最新数据
    if (this.status === 'online' && this.currentUserId) {
      try {
        const cloudData = await supabaseMaintenanceRecords.getAll();
        console.log('📥 从云端获取了', cloudData.length, '条点検整備記録');
        
        // 获取本地数据
        const localData = await storageService.getAll(STORES.MAINTENANCE_RECORDS);
        
        // 找出本地未同步的数据
        const localPendingData = localData.filter(item => 
          (item.syncStatus === 'pending' || item.id?.toString().startsWith('local')) &&
          !cloudData.some(cloud => 
            cloud.execution_date === item.executionDate && 
            cloud.drone_id === item.droneId &&
            cloud.executor_id === item.executorId
          )
        );
        
        // 清除本地已同步的旧数据，重新保存云端数据
        for (const item of localData) {
          if (item.syncStatus !== 'pending' && !item.id?.toString().startsWith('local')) {
            await storageService.delete(STORES.MAINTENANCE_RECORDS, item.id);
          }
        }
        
        // 保存云端数据到本地缓存
        for (const item of cloudData) {
          await storageService.save(STORES.MAINTENANCE_RECORDS, {
            ...this.convertMaintenanceRecordFromSupabaseFormat(item),
            syncStatus: 'synced',
          });
        }
        
        // 合并：云端数据 + 本地未同步数据
        const result = [
          ...cloudData.map(item => this.convertMaintenanceRecordFromSupabaseFormat(item)),
          ...localPendingData,
        ];
        
        console.log('📊 总计点検整備記録:', result.length, '(云端:', cloudData.length, ', 本地待同步:', localPendingData.length, ')');
        return result;
      } catch (error) {
        console.warn('⚠️ 云端获取失败，使用本地数据:', error);
      }
    }

    // 离线或获取失败，使用本地数据
    const localData = await storageService.getAll(STORES.MAINTENANCE_RECORDS);
    console.log('📦 从本地获取了', localData.length, '条点検整備記録');
    return localData;
  }

  /**
   * 将点検整備記録转换为 Supabase 格式
   */
  private convertMaintenanceRecordToSupabaseFormat(data: any): MaintenanceRecordInsert {
    if (!this.currentUserId) {
      throw new Error('用户未登录');
    }

    // 日付の変換（Date オブジェクトまたは文字列を処理）
    const formatDate = (date: any): string | undefined => {
      if (!date) return undefined;
      if (date instanceof Date) return date.toISOString().split('T')[0];
      if (typeof date === 'string') return date.split('T')[0]; // ISO文字列の場合
      return undefined;
    };

    return {
      user_id: this.currentUserId,
      execution_date: formatDate(data.executionDate) || new Date().toISOString().split('T')[0],
      total_flight_time_at_moment: data.totalFlightTimeAtMoment || undefined,
      previous_execution_date: formatDate(data.previousExecutionDate),
      executor_id: data.executorId || undefined,
      executor_name: data.executorName || undefined,
      drone_id: data.droneId || undefined,
      drone_name: data.droneName || undefined,
      drone_registration_mark: data.droneRegistrationMark || undefined,
      execution_place_id: data.executionPlaceId || undefined,
      execution_place_name: data.executionPlaceName || undefined,
      execution_place_address: data.executionPlaceAddress || undefined,
      remarks: data.remarks || undefined,
      reason: data.reason || undefined,
      content_equipment_replacement: data.contentEquipmentReplacement || undefined,
      content_regular_inspection: data.contentRegularInspection || undefined,
      content_installation_removal: data.contentInstallationRemoval || undefined,
      content_other: data.contentOther || data.workContent || undefined,
    };
  }

  /**
   * 将 Supabase 格式转换为应用格式
   */
  private convertMaintenanceRecordFromSupabaseFormat(data: any): any {
    return {
      id: data.id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      executionDate: data.execution_date,
      totalFlightTimeAtMoment: data.total_flight_time_at_moment,
      previousExecutionDate: data.previous_execution_date,
      executorId: data.executor_id,
      executorName: data.executor_name,
      droneId: data.drone_id,
      droneName: data.drone_name,
      droneRegistrationMark: data.drone_registration_mark,
      executionPlaceId: data.execution_place_id,
      executionPlaceName: data.execution_place_name,
      executionPlaceAddress: data.execution_place_address,
      remarks: data.remarks,
      reason: data.reason,
      contentEquipmentReplacement: data.content_equipment_replacement,
      contentRegularInspection: data.content_regular_inspection,
      contentInstallationRemoval: data.content_installation_removal,
      contentOther: data.content_other,
      workContent: data.content_other, // 后向兼容
    };
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
        // 🆕 添加缺失的字段
        takeoff_time: data.takeoffTime,
        landing_time: data.landingTime,
        outline: data.outline,
        is_tokutei_flight: data.isTokuteiFlight,
        tokutei_flight_categories: data.tokuteiFlightCategories,
        flight_plan_notified: data.flightPlanNotified,
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
   * 🆕 将更新数据转换为 Supabase 格式（仅转换提供的字段）
   */
  private convertUpdateToSupabaseFormat(data: any, type: 'flight' | 'pilot' | 'uav'): any {
    const result: any = {};
    
    // 字段映射表
    const fieldMappings: Record<string, Record<string, string>> = {
      flight: {
        date: 'date',
        time: 'time',
        duration: 'duration',
        location: 'location',
        locationAddressDetail: 'location_address_detail',
        locationLatitude: 'location_latitude',
        locationLongitude: 'location_longitude',
        droneModel: 'drone_model',
        weather: 'weather',
        windSpeed: 'wind_speed',
        altitude: 'altitude',
        purpose: 'purpose',
        notes: 'notes',
        pilot: 'pilot',
        clientName: 'client_name',
        takeoffTime: 'takeoff_time',
        landingTime: 'landing_time',
        outline: 'outline',
        isTokuteiFlight: 'is_tokutei_flight',
        tokuteiFlightCategories: 'tokutei_flight_categories',
        flightPlanNotified: 'flight_plan_notified',
      },
      pilot: {
        name: 'name',
        licenseNumber: 'license_number',
        licenseType: 'license_type',
        email: 'email',
        phone: 'phone',
        initialFlightHours: 'initial_flight_hours',
        totalFlightHours: 'total_flight_hours',
        isActive: 'is_active',
      },
      uav: {
        nickname: 'nickname',
        registrationId: 'registration_id',
        manufacturer: 'manufacturer',
        model: 'model',
        category: 'category',
        certificationNumber: 'certification_number',
        certificationDate: 'certification_date',
        totalFlightHours: 'total_flight_hours',
        hoursSinceLastMaintenance: 'hours_since_last_maintenance',
        isActive: 'is_active',
      },
    };

    const mapping = fieldMappings[type];
    
    // 只转换提供的字段（不包括 id 和元数据字段）
    for (const [localKey, supabaseKey] of Object.entries(mapping)) {
      if (localKey in data && data[localKey] !== undefined) {
        result[supabaseKey] = data[localKey];
      }
    }

    console.log('🔄 更新数据转换:', { input: data, output: result });
    return result;
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
      // 🆕 添加缺失的飞行字段
      takeoffTime: data.takeoff_time,
      landingTime: data.landing_time,
      outline: data.outline,
      isTokuteiFlight: data.is_tokutei_flight,
      tokuteiFlightCategories: data.tokutei_flight_categories,
      flightPlanNotified: data.flight_plan_notified,
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

  /**
   * 合并本地和云端数据（智能去重）
   */
  private mergeData(localData: any[], cloudData: any[], uniqueKey: string): any[] {
    const merged = new Map<string, any>();
    
    // 1. 先添加云端数据（优先级高）
    for (const item of cloudData) {
      const key = item[uniqueKey] || item.id;
      merged.set(key, { ...item, _source: 'cloud' });
    }
    
    // 2. 添加本地独有数据（未同步的）
    for (const item of localData) {
      const key = item[uniqueKey] || item.id;
      
      // 如果云端没有，且是待同步的本地数据，才添加
      if (!merged.has(key) || item.id?.toString().startsWith('local')) {
        // 检查是否有相同名称的云端数据
        const cloudItem = Array.from(merged.values()).find(
          (m) => m[uniqueKey] === item[uniqueKey] && m._source === 'cloud'
        );
        
        if (!cloudItem) {
          merged.set(item.id || key, { ...item, _source: 'local' });
        } else {
          // 合并本地更新到云端数据（保留云端ID）
          console.log(`🔄 合并数据: ${item[uniqueKey]}`);
          merged.set(cloudItem.id, { 
            ...cloudItem, 
            ...item, 
            id: cloudItem.id, // 保留云端ID
            _source: 'merged' 
          });
        }
      }
    }
    
    // 3. 移除辅助字段
    return Array.from(merged.values()).map(({ _source, ...item }) => item);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // ==================== 飞行会话同步 ====================

  /**
   * 保存飞行会话状态到云端
   */
  async saveFlightSession(session: {
    status: 'ready' | 'started' | 'finished';
    startTime: Date | null;
    endTime: Date | null;
    formData?: any;
  }): Promise<void> {
    console.log('📝 saveFlightSession:', session);
    
    // 1. 保存到本地 metadata
    await storageService.setMetadata('flightSession', {
      status: session.status,
      startTime: session.startTime?.toISOString() || null,
      endTime: session.endTime?.toISOString() || null,
      formData: session.formData || {},
      updatedAt: new Date().toISOString(),
    });
    console.log('💾 飞行会话已保存到本地');
    
    // 2. 如果在线，同步到云端
    if (this.status === 'online' && this.currentUserId) {
      try {
        console.log('☁️ 同步飞行会话到云端...');
        await supabaseFlightSession.save({
          status: session.status,
          start_time: session.startTime?.toISOString() || null,
          end_time: session.endTime?.toISOString() || null,
          form_data: session.formData || {},
        });
        console.log('✅ 飞行会话云端同步成功');
      } catch (error) {
        console.warn('⚠️ 飞行会话云端同步失败:', error);
        // 失败不影响本地状态
      }
    }
  }

  /**
   * 从云端获取飞行会话状态
   */
  async getFlightSession(): Promise<{
    status: 'ready' | 'started' | 'finished';
    startTime: Date | null;
    endTime: Date | null;
    formData?: any;
  } | null> {
    console.log('📥 getFlightSession...');
    
    // 1. 优先从云端获取（如果在线）
    if (this.status === 'online' && this.currentUserId) {
      try {
        const cloudSession = await supabaseFlightSession.get();
        if (cloudSession) {
          console.log('☁️ 从云端获取飞行会话:', cloudSession);
          
          // 保存到本地
          await storageService.setMetadata('flightSession', {
            status: cloudSession.status,
            startTime: cloudSession.start_time,
            endTime: cloudSession.end_time,
            formData: cloudSession.form_data || {},
            updatedAt: cloudSession.updated_at,
          });
          
          return {
            status: cloudSession.status as 'ready' | 'started' | 'finished',
            startTime: cloudSession.start_time ? new Date(cloudSession.start_time) : null,
            endTime: cloudSession.end_time ? new Date(cloudSession.end_time) : null,
            formData: cloudSession.form_data,
          };
        }
      } catch (error) {
        console.warn('⚠️ 从云端获取飞行会话失败:', error);
      }
    }
    
    // 2. 回退到本地
    const localSession = await storageService.getMetadata('flightSession');
    if (localSession) {
      console.log('📦 从本地获取飞行会话:', localSession);
      return {
        status: localSession.status || 'ready',
        startTime: localSession.startTime ? new Date(localSession.startTime) : null,
        endTime: localSession.endTime ? new Date(localSession.endTime) : null,
        formData: localSession.formData,
      };
    }
    
    console.log('📭 没有找到飞行会话');
    return null;
  }

  /**
   * 重置飞行会话
   */
  async resetFlightSession(): Promise<void> {
    console.log('🔄 resetFlightSession...');
    
    // 1. 重置本地
    await storageService.setMetadata('flightSession', {
      status: 'ready',
      startTime: null,
      endTime: null,
      formData: {},
      updatedAt: new Date().toISOString(),
    });
    
    // 2. 重置云端
    if (this.status === 'online' && this.currentUserId) {
      try {
        await supabaseFlightSession.reset();
        console.log('✅ 云端飞行会话已重置');
      } catch (error) {
        console.warn('⚠️ 云端飞行会话重置失败:', error);
      }
    }
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

