// 用户菜单 - 显示用户信息和登出
import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback } from './ui/avatar';
import { User, LogOut, Settings, Database, Cloud, CloudOff, Wifi, WifiOff, RefreshCw, AlertCircle, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from './AuthModal';
import { supabaseSyncService } from '../services/supabase-sync.service';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';

interface UserMenuProps {
  syncStatus?: 'online' | 'offline' | 'syncing';
}

export function UserMenu({ syncStatus = 'offline' }: UserMenuProps) {
  const { user, isAuthenticated, signOut, setUser } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [status, setStatus] = useState<'online' | 'offline' | 'syncing'>(syncStatus);
  const [syncStats, setSyncStats] = useState<any>(null);
  const [showSyncDetails, setShowSyncDetails] = useState(false);

  useEffect(() => {
    // 🔧 使用 supabaseSyncService 获取状态
    setStatus(supabaseSyncService.getStatus());
    updateStats();

    // ステータス変更を監視
    const unsubscribe = supabaseSyncService.onStatusChange((newStatus) => {
      setStatus(newStatus);
      updateStats();
    });

    return () => unsubscribe();
  }, []);

  // 同步状态来自 props 时也更新
  useEffect(() => {
    if (syncStatus !== status) {
      setStatus(syncStatus);
    }
  }, [syncStatus]);

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
    setShowSyncDetails(false);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      // 可选：刷新页面
      // window.location.reload();
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  const handleLoginSuccess = (user: any) => {
    console.log('✅ ログイン成功、状態を更新中...');
    setUser({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    });
    setIsAuthModalOpen(false);
  };

  const getStatusIcon = () => {
    if (status === 'online') return <Wifi className="h-4 w-4 text-white" />;
    if (status === 'syncing') return <RefreshCw className="h-4 w-4 text-white animate-spin" />;
    return <WifiOff className="h-4 w-4 text-white" />;
  };

  const getStatusText = () => {
    if (status === 'online') return 'オンライン';
    if (status === 'syncing') return '同期中';
    return 'オフライン';
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

  // 获取用户首字母
  const getUserInitial = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  if (!isAuthenticated) {
    return (
      <>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setIsAuthModalOpen(true)}
          className="gap-2"
        >
          <User className="h-4 w-4" />
          ログイン
        </Button>
        <AuthModal 
          isOpen={isAuthModalOpen} 
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={handleLoginSuccess}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* 同步状态按钮（带详细信息弹窗） */}
        <Popover open={showSyncDetails} onOpenChange={setShowSyncDetails}>
          <PopoverTrigger asChild>
            <button
              className={`
                relative flex items-center justify-center
                w-9 h-9 sm:w-auto sm:h-auto
                sm:gap-1.5 sm:px-3 sm:py-1.5
                rounded-full text-xs font-medium
                ${getStatusColor()} text-white
                hover:opacity-90 transition-all shadow-md hover:shadow-lg
                active:scale-95
              `}
            >
              <div className="flex items-center sm:hidden">
                {getStatusIcon()}
              </div>
              <div className="hidden sm:flex sm:items-center sm:gap-1.5">
                {getStatusIcon()}
                <span className="whitespace-nowrap">{getStatusText()}</span>
              </div>
              {syncStats?.pendingSyncCount > 0 && (
                <span className="absolute -top-1 -right-1 sm:relative sm:top-0 sm:right-0 bg-red-500 text-white px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold min-w-[18px] sm:min-w-0 sm:bg-white/30">
                  {syncStats.pendingSyncCount}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">同期ステータス</h3>
                <button
                  onClick={() => setShowSyncDetails(false)}
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
          </PopoverContent>
        </Popover>

        {/* 用户菜单 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-blue-500 text-white">
                  {getUserInitial(user?.email || 'U')}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">マイアカウント</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem disabled>
              <Settings className="mr-2 h-4 w-4" />
              <span>設定</span>
              <span className="ml-auto text-xs text-gray-400">近日公開</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem disabled>
              <Database className="mr-2 h-4 w-4" />
              <span>データ管理</span>
              <span className="ml-auto text-xs text-gray-400">近日公開</span>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              className="text-red-600"
              onClick={() => setIsLogoutDialogOpen(true)}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>ログアウト</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ログアウト確認ダイアログ */}
      <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ログアウトしますか？</AlertDialogTitle>
            <AlertDialogDescription>
              ログアウト後も、データはローカルに保存されます。<br />
              次回ログイン時に自動的にクラウドに同期されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>
              ログアウト
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

