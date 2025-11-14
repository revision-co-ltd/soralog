// 离线存储服务 - IndexedDB
// 支持离线数据暂存和网络恢复后自动同步

const DB_NAME = 'DroneLogDB';
const DB_VERSION = 1;

// Store names
const STORES = {
  FLIGHT_LOGS: 'flightLogs',
  DAILY_INSPECTIONS: 'dailyInspections',
  MAINTENANCE_RECORDS: 'maintenanceRecords',
  SYNC_QUEUE: 'syncQueue',
  METADATA: 'metadata',
};

class StorageService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 飛行記録
        if (!db.objectStoreNames.contains(STORES.FLIGHT_LOGS)) {
          const store = db.createObjectStore(STORES.FLIGHT_LOGS, { keyPath: 'id' });
          store.createIndex('syncStatus', 'syncStatus', { unique: false });
          store.createIndex('flightDate', 'flightDate', { unique: false });
        }

        // 日常点検記録
        if (!db.objectStoreNames.contains(STORES.DAILY_INSPECTIONS)) {
          const store = db.createObjectStore(STORES.DAILY_INSPECTIONS, { keyPath: 'id' });
          store.createIndex('syncStatus', 'syncStatus', { unique: false });
        }

        // 点検整備記録
        if (!db.objectStoreNames.contains(STORES.MAINTENANCE_RECORDS)) {
          const store = db.createObjectStore(STORES.MAINTENANCE_RECORDS, { keyPath: 'id' });
          store.createIndex('syncStatus', 'syncStatus', { unique: false });
        }

        // 同期キュー
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const store = db.createObjectStore(STORES.SYNC_QUEUE, { 
            keyPath: 'id',
            autoIncrement: true 
          });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('status', 'status', { unique: false });
        }

        // メタデータ
        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
        }
      };
    });
  }

  // ==================== 汎用CRUD ====================

  async save<T extends { id: string }>(
    storeName: string,
    data: T & { syncStatus?: 'pending' | 'synced' | 'error' }
  ): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const dataWithStatus = {
        ...data,
        syncStatus: data.syncStatus || 'pending',
        localTimestamp: Date.now(),
      };

      const request = store.put(dataWithStatus);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(storeName: string, id: string): Promise<T | null> {
    if (!this.db) throw new Error('DB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    if (!this.db) throw new Error('DB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, id: string): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== 同期キュー管理 ====================

  async addToSyncQueue(action: {
    type: 'create' | 'update' | 'delete';
    storeName: string;
    data: any;
  }): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.SYNC_QUEUE], 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);

      const queueItem = {
        ...action,
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
      };

      const request = store.add(queueItem);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingSyncItems(): Promise<any[]> {
    if (!this.db) throw new Error('DB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.SYNC_QUEUE], 'readonly');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const index = store.index('status');
      const request = index.getAll('pending');

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateSyncItemStatus(id: number, status: 'success' | 'error', retryCount?: number): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.SYNC_QUEUE], 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.status = status;
          if (retryCount !== undefined) item.retryCount = retryCount;
          item.lastAttempt = Date.now();
          store.put(item);
        }
        resolve();
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async clearSuccessfulSyncItems(): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.SYNC_QUEUE], 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const index = store.index('status');
      const request = index.openCursor(IDBKeyRange.only('success'));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // ==================== メタデータ ====================

  async setMetadata(key: string, value: any): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.METADATA], 'readwrite');
      const store = transaction.objectStore(STORES.METADATA);
      const request = store.put({ key, value, timestamp: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getMetadata(key: string): Promise<any> {
    if (!this.db) throw new Error('DB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.METADATA], 'readonly');
      const store = transaction.objectStore(STORES.METADATA);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== 統計情報 ====================

  async getSyncStats() {
    const pending = await this.getPendingSyncItems();
    const flightLogs = await this.getAll(STORES.FLIGHT_LOGS);
    const inspections = await this.getAll(STORES.DAILY_INSPECTIONS);

    return {
      pendingSyncCount: pending.length,
      localFlightLogs: flightLogs.length,
      localInspections: inspections.length,
      lastSync: await this.getMetadata('lastSyncTime'),
    };
  }
}

export const storageService = new StorageService();
export { STORES };

