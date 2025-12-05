// 同期ステータスバー - オンライン/オフライン表示
import React, { useEffect, useState } from 'react';
import { supabaseSyncService } from '../services/supabase-sync.service';
import { Wifi, WifiOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';

export function SyncStatusBar() {
  const [status, setStatus] = useState<'online' | 'offline' | 'syncing'>('offline');
  const [syncStats, setSyncStats] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // 🔧 使用 supabaseSyncService 而不是旧的 syncService
    // 获取当前状态
    setStatus(supabaseSyncService.getStatus());
    updateStats();

    // ステータス変更を監視
    const unsubscribe = supabaseSyncService.onStatusChange((newStatus) => {
      setStatus(newStatus);
      updateStats();
    });

    return () => unsubscribe();
  }, []);

  const updateStats = async () => {
    const stats = await supabaseSyncService.getSyncStats();
    setSyncStats(stats);
  };

  const handleManualSync = async () => {
    const result = await supabaseSyncService.triggerSync();
    updateStats();
    
    if (result.success > 0) {
      alert(`✅ ${result.success}件のデータを同期しました`);
    }
    if (result.failed > 0) {
      alert(`⚠️ ${result.failed}件の同期に失敗しました`);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'offline':
        return 'bg-gray-400';
      case 'syncing':
        return 'bg-blue-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'online':
        return 'オンライン';
      case 'offline':
        return 'オフライン';
      case 'syncing':
        return '同期中...';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'online':
        return <Wifi className="h-4 w-4" />;
      case 'offline':
        return <WifiOff className="h-4 w-4" />;
      case 'syncing':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
    }
  };

  return (
    <div className="fixed top-16 right-4 z-40">
      {/* コンパクト表示 */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg
          ${getStatusColor()} text-white text-sm font-medium
          hover:opacity-90 transition-all
        `}
      >
        {getStatusIcon()}
        <span className="hidden md:inline">{getStatusText()}</span>
        {syncStats?.pendingSyncCount > 0 && (
          <span className="bg-white/30 px-2 py-0.5 rounded-full text-xs">
            {syncStats.pendingSyncCount}
          </span>
        )}
      </button>

      {/* 詳細パネル */}
      {showDetails && (
        <div className="mt-2 bg-white rounded-lg shadow-xl p-4 min-w-[280px] border">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">同期ステータス</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">接続状態</span>
                <span className="font-medium">{getStatusText()}</span>
              </div>

              {syncStats && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">未同期</span>
                    <span className={`font-medium ${syncStats.pendingSyncCount > 0 ? 'text-amber-600' : ''}`}>
                      {syncStats.pendingSyncCount}件
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">ローカル記録</span>
                    <span className="font-medium">
                      {syncStats.localFlightLogs + syncStats.localInspections}件
                    </span>
                  </div>

                  {syncStats.lastSync && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">最終同期</span>
                      <span className="text-xs text-gray-500">
                        {new Date(syncStats.lastSync).toLocaleString('ja-JP', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {status === 'online' && syncStats?.pendingSyncCount > 0 && (
              <Button
                onClick={handleManualSync}
                size="sm"
                className="w-full"
                disabled={status === 'syncing'}
              >
                <RefreshCw className="h-3 w-3 mr-2" />
                今すぐ同期
              </Button>
            )}

            {status === 'offline' && syncStats?.pendingSyncCount > 0 && (
              <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>
                  オフラインです。ネットワーク復旧後に自動同期されます。
                </p>
              </div>
            )}

            {status === 'online' && syncStats?.pendingSyncCount === 0 && (
              <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800">
                <Check className="h-4 w-4" />
                <p>すべて同期済み</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

