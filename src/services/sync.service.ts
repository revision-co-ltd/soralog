// 同期サービス - オンライン/オフライン自動切替
import { storageService, STORES } from './storage.service';
import * as apiService from './api.service';

type SyncStatus = 'online' | 'offline' | 'syncing';

class SyncService {
  private status: SyncStatus = 'offline';
  private syncInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(status: SyncStatus) => void> = new Set();

  async init() {
    await storageService.init();
    this.checkOnlineStatus();
    this.startNetworkMonitoring();
    this.startAutoSync();
  }

  // ==================== ネットワーク監視 ====================

  private async checkOnlineStatus() {
    const wasOnline = this.status === 'online';
    const apiAvailable = await this.checkApiConnection();
    const isOnline = navigator.onLine && apiAvailable;

    if (isOnline && !wasOnline) {
      this.setStatus('online');
      this.triggerSync();
    } else if (!isOnline && wasOnline) {
      this.setStatus('offline');
    }
  }

  private async checkApiConnection(): Promise<boolean> {
    try {
      const result = await apiService.checkApiHealth();
      return result;
    } catch {
      return false;
    }
  }

  private startNetworkMonitoring() {
    window.addEventListener('online', () => {
      console.log('📡 ネットワーク接続復旧');
      this.checkOnlineStatus();
    });

    window.addEventListener('offline', () => {
      console.log('📡 ネットワーク切断検出');
      this.setStatus('offline');
    });

    // 定期的に接続チェック（30秒ごと）
    setInterval(() => this.checkOnlineStatus(), 30000);
  }

  private startAutoSync() {
    // 5分ごとに自動同期
    this.syncInterval = setInterval(() => {
      if (this.status === 'online') {
        this.triggerSync();
      }
    }, 5 * 60 * 1000);
  }

  // ==================== 同期処理 ====================

  async triggerSync(): Promise<{ success: number; failed: number }> {
    if (this.status !== 'online') {
      console.log('⚠️ オフラインのため同期スキップ');
      return { success: 0, failed: 0 };
    }

    this.setStatus('syncing');
    console.log('🔄 同期開始...');

    try {
      const pendingItems = await storageService.getPendingSyncItems();
      let success = 0;
      let failed = 0;

      for (const item of pendingItems) {
        try {
          await this.syncItem(item);
          await storageService.updateSyncItemStatus(item.id, 'success');
          success++;
        } catch (error) {
          console.error('同期エラー:', error);
          await storageService.updateSyncItemStatus(
            item.id,
            'error',
            item.retryCount + 1
          );
          failed++;
        }
      }

      // 成功したアイテムをクリア
      await storageService.clearSuccessfulSyncItems();
      await storageService.setMetadata('lastSyncTime', Date.now());

      console.log(`✅ 同期完了: 成功 ${success}, 失敗 ${failed}`);
      this.setStatus('online');

      return { success, failed };
    } catch (error) {
      console.error('同期失敗:', error);
      this.setStatus('online');
      return { success: 0, failed: 0 };
    }
  }

  private async syncItem(item: any) {
    const { type, storeName, data } = item;

    switch (storeName) {
      case STORES.FLIGHT_LOGS:
        if (type === 'create') {
          await apiService.flightLogApi.create(data);
        } else if (type === 'update') {
          await apiService.flightLogApi.update(data.id, data);
        } else if (type === 'delete') {
          await apiService.flightLogApi.delete(data.id);
        }
        break;

      case STORES.DAILY_INSPECTIONS:
        if (type === 'create') {
          await apiService.dailyInspectionApi.create(data);
        } else if (type === 'update') {
          await apiService.dailyInspectionApi.update(data.id, data);
        }
        break;

      case STORES.MAINTENANCE_RECORDS:
        if (type === 'create') {
          await apiService.maintenanceRecordApi.create(data);
        } else if (type === 'update') {
          await apiService.maintenanceRecordApi.update(data.id, data);
        } else if (type === 'delete') {
          await apiService.maintenanceRecordApi.delete(data.id);
        }
        break;
    }
  }

  // ==================== データ操作（オフライン対応） ====================

  async saveFlightLog(data: any): Promise<void> {
    // ローカルに保存
    await storageService.save(STORES.FLIGHT_LOGS, {
      ...data,
      id: data.id || this.generateId(),
      syncStatus: 'pending',
    });

    // 同期キューに追加
    await storageService.addToSyncQueue({
      type: 'create',
      storeName: STORES.FLIGHT_LOGS,
      data,
    });

    // オンラインなら即同期
    if (this.status === 'online') {
      this.triggerSync();
    }
  }

  async saveDailyInspection(data: any): Promise<void> {
    await storageService.save(STORES.DAILY_INSPECTIONS, {
      ...data,
      id: data.id || this.generateId(),
      syncStatus: 'pending',
    });

    await storageService.addToSyncQueue({
      type: 'create',
      storeName: STORES.DAILY_INSPECTIONS,
      data,
    });

    if (this.status === 'online') {
      this.triggerSync();
    }
  }

  /**
   * 点検整備記録を保存
   */
  async saveMaintenanceRecord(data: any): Promise<string> {
    const id = data.id || this.generateId();
    
    // Date オブジェクトを文字列に変換
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

    console.log('📝 saveMaintenanceRecord:', { id, record });

    await storageService.save(STORES.MAINTENANCE_RECORDS, record);
    console.log('💾 点検整備記録をローカルに保存しました:', id);

    await storageService.addToSyncQueue({
      type: 'create',
      storeName: STORES.MAINTENANCE_RECORDS,
      data: record,
    });

    if (this.status === 'online') {
      this.triggerSync();
    }

    return id;
  }

  /**
   * 点検整備記録を取得
   */
  async getMaintenanceRecords(): Promise<any[]> {
    return storageService.getAll(STORES.MAINTENANCE_RECORDS);
  }

  async getFlightLogs(): Promise<any[]> {
    if (this.status === 'online') {
      try {
        // オンライン: APIから取得
        const response = await apiService.flightLogApi.getAll();
        return response.data;
      } catch (error) {
        console.warn('API取得失敗、ローカルデータを使用');
      }
    }

    // オフライン: ローカルから取得
    return storageService.getAll(STORES.FLIGHT_LOGS);
  }

  async getDailyInspections(): Promise<any[]> {
    if (this.status === 'online') {
      try {
        const response = await apiService.dailyInspectionApi.getAll();
        return response.data;
      } catch (error) {
        console.warn('API取得失敗、ローカルデータを使用');
      }
    }

    return storageService.getAll(STORES.DAILY_INSPECTIONS);
  }

  // ==================== ステータス管理 ====================

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
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    this.listeners.forEach((callback) => callback(this.status));
  }

  // ==================== ユーティリティ ====================

  private generateId(): string {
    return `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async getSyncStats() {
    return storageService.getSyncStats();
  }

  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

export const syncService = new SyncService();

