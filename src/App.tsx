import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { FlightLogForm } from './components/FlightLogForm';
import { DailyInspectionForm } from './components/DailyInspectionForm';
import { MaintenanceRecordForm } from './components/MaintenanceRecordForm';
import { FlightHistory } from './components/FlightHistory';
import { FlightStatistics } from './components/FlightStatistics';
import { FlightDetailModal } from './components/FlightDetailModal';
import { PilotManagement } from './components/PilotManagement';
import { UAVManagement } from './components/UAVManagement';
import { ExportPanel } from './components/ExportPanel';
import { OnboardingFlow } from './components/OnboardingFlow';
import { Plane, BarChart3, History, Plus, Users, Settings, Home, Menu, ClipboardCheck, Wrench, Clock } from 'lucide-react';
import type { CreateDailyInspectionDTO } from './types';
import { syncService } from './services/sync.service';
import { supabaseSyncService } from './services/supabase-sync.service';
import { generateDevToken, showDevAuthInfo } from './utils/devAuth';
import { UserMenu } from './components/UserMenu';
import { useAuth } from './contexts/AuthContext';

interface FlightLog {
  id: string;
  date: string;
  duration: number;
  location: string;
  droneModel: string;
  weather: string;
  windSpeed: number;
  altitude: number;
  purpose: string;
  notes: string;
  pilot: string;
  clientName?: string; // 案件名・クライアント名
  takeoffTime?: string; // 離陸時刻 HH:mm
  landingTime?: string; // 着陸時刻 HH:mm
  outline?: string; // 飛行概要
  tokuteiFlightCategories?: string[]; // 特定飛行カテゴリ
  flightPlanNotified?: boolean; // 飛行計画の通報
  isTokuteiFlight?: boolean; // 特定飛行フラグ
}

interface Pilot {
  id: string;
  name: string;
  licenseNumber?: string;
  licenseType?: string;
  email?: string;
  phone?: string;
  initialFlightHours: number; // 登録時の総飛行時間（分）
  totalFlightHours: number; // 総飛行時間（分）= 初期飛行時間 + アプリ内累計時間
  isActive: boolean;
}

interface UAV {
  id: string;
  nickname: string;
  registrationId?: string;
  manufacturer: string;
  model: string;
  category: 'certified' | 'uncertified';
  certificationNumber?: string;
  certificationDate?: string;
  totalFlightHours: number;
  hoursSinceLastMaintenance: number;
  isActive: boolean;
}

// Mock data removed - 新規ユーザーには示例データを表示しない

export default function App() {
  // 🔐 认证状态
  const { user, isAuthenticated } = useAuth();
  
  // 🔄 Supabase + 离线优先数据加载
  const [flights, setFlights] = useState<FlightLog[]>([]);
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [uavs, setUAVs] = useState<UAV[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'online' | 'offline' | 'syncing'>('offline');
  
  const [selectedFlight, setSelectedFlight] = useState<FlightLog | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // 🆕 首次使用引导流程
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // 🆕 記録種別（様式1〜3）の管理
  const [recordType, setRecordType] = useState<'style1' | 'style2' | 'style3'>('style1');
  
  // 🆕 飛行ステータス管理（localStorage に保存して刷新後も維持）
  const [globalFlightStatus, setGlobalFlightStatus] = useState<'ready' | 'started' | 'finished'>(() => {
    const saved = localStorage.getItem('flightTimerStatus');
    const status = saved ? JSON.parse(saved) : 'ready';
    console.log('🔄 App初期化: flightTimerStatus復元', status);
    return status;
  });
  
  const [globalStartTime, setGlobalStartTime] = useState<Date | null>(() => {
    const saved = localStorage.getItem('flightTimerStartTime');
    if (saved) {
      const timeStr = JSON.parse(saved);
      const date = timeStr ? new Date(timeStr) : null;
      console.log('🔄 App初期化: startTime復元', date);
      return date;
    }
    console.log('🔄 App初期化: startTime復元', null);
    return null;
  });
  
  const [globalEndTime, setGlobalEndTime] = useState<Date | null>(() => {
    const saved = localStorage.getItem('flightTimerEndTime');
    if (saved) {
      const timeStr = JSON.parse(saved);
      const date = timeStr ? new Date(timeStr) : null;
      console.log('🔄 App初期化: endTime復元', date);
      return date;
    }
    console.log('🔄 App初期化: endTime復元', null);
    return null;
  });
  
  const [menuBarElapsedTime, setMenuBarElapsedTime] = useState(0);

  // 🆕 経過時間のフォーマット関数
  const formatElapsedTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 🆕 飛行タイマー更新ハンドラー（云端同步）
  const handleFlightTimerUpdate = async (status: 'ready' | 'started' | 'finished', startTime: Date | null, endTime: Date | null) => {
    console.log('⏱️ handleFlightTimerUpdate:', { status, startTime, endTime });
    setGlobalFlightStatus(status);
    setGlobalStartTime(startTime);
    setGlobalEndTime(endTime);
    
    // 🆕 同步到云端（在线时立即同步）
    try {
      await supabaseSyncService.saveFlightSession({
        status,
        startTime,
        endTime,
      });
    } catch (error) {
      console.warn('⚠️ 飞行会话同步失败:', error);
    }
  };

  // 🆕 飛行中の経過時間を更新するuseEffect
  useEffect(() => {
    if (globalFlightStatus === 'started' && globalStartTime) {
      const updateElapsedTime = () => {
        const elapsed = Math.floor((Date.now() - globalStartTime.getTime()) / 1000);
        setMenuBarElapsedTime(elapsed);
      };
      
      updateElapsedTime();
      const interval = setInterval(updateElapsedTime, 1000);
      
      return () => clearInterval(interval);
    } else if (globalFlightStatus === 'finished' && globalStartTime && globalEndTime) {
      const elapsed = Math.floor((globalEndTime.getTime() - globalStartTime.getTime()) / 1000);
      setMenuBarElapsedTime(elapsed);
    } else {
      setMenuBarElapsedTime(0);
    }
  }, [globalFlightStatus, globalStartTime, globalEndTime]);

  // 🚀 初始化 Supabase 同步服务
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 初始化应用...');
        
        // 初始化同步服务
        await supabaseSyncService.init();
        console.log('✅ 同步服务初始化完成');
        
        // 监听同步状态变化
        const unsubscribe = supabaseSyncService.onStatusChange((status) => {
          console.log('📡 同步状态:', status);
          setSyncStatus(status);
        });
        
        // 加载数据（离线优先）
        await loadData();
        
        return () => {
          unsubscribe();
        };
      } catch (error) {
        console.error('❌ 应用初始化失败:', error);
        // 降级到本地存储
        loadFromLocalStorage();
      }
    };
    
    initializeApp();
  }, []);

  // 🔄 监听用户登录状态变化，处理数据融合
  useEffect(() => {
    if (isAuthenticated && user && isDataLoaded) {
      handleDataMergeOnLogin();
    }
  }, [isAuthenticated, user, isDataLoaded]);
  
  // 📥 从 Supabase/IndexedDB 加载数据
  const loadData = async () => {
    try {
      console.log('📥 加载数据...');
      
      const [flightsData, pilotsData, uavsData] = await Promise.all([
        supabaseSyncService.getFlightLogs(),
        supabaseSyncService.getPilots(),
        supabaseSyncService.getUAVs(),
      ]);
      
      // 直接使用实际数据，不使用示例数据
      setFlights(flightsData);
      setPilots(pilotsData);
      setUAVs(uavsData);
      
      setIsDataLoaded(true);
      console.log('✅ 数据加载完成:', {
        flights: flightsData.length,
        pilots: pilotsData.length,
        uavs: uavsData.length,
      });
      
      // 🆕 恢复飞行会话状态（从云端或本地）
      try {
        const session = await supabaseSyncService.getFlightSession();
        if (session) {
          console.log('✈️ 恢复飞行会话状态:', session);
          setGlobalFlightStatus(session.status);
          setGlobalStartTime(session.startTime);
          setGlobalEndTime(session.endTime);
          
          // 同步到 localStorage（用于即时恢复）
          localStorage.setItem('flightTimerStatus', JSON.stringify(session.status));
          localStorage.setItem('flightTimerStartTime', JSON.stringify(session.startTime?.toISOString() || null));
          localStorage.setItem('flightTimerEndTime', JSON.stringify(session.endTime?.toISOString() || null));
        }
      } catch (error) {
        console.warn('⚠️ 恢复飞行会话状态失败:', error);
      }
      
      // 检查是否需要显示首次使用引导（只在未跳过时显示）
      const hasSkippedOnboarding = localStorage.getItem('onboarding_skipped') === 'true';
      const needsOnboarding = pilotsData.length === 0 && uavsData.length === 0 && !hasSkippedOnboarding;
      if (needsOnboarding) {
        console.log('🎯 首次使用，显示引导流程');
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('❌ 数据加载失败:', error);
      loadFromLocalStorage();
    }
  };
  
  // 📦 降级：从 LocalStorage 加载（向后兼容）
  const loadFromLocalStorage = () => {
    console.log('📦 从 localStorage 加载数据（降级模式）');
    const savedFlights = localStorage.getItem('flightLogs');
    const savedPilots = localStorage.getItem('pilots');
    const savedUAVs = localStorage.getItem('uavs');
    
    // 直接使用实际数据，不使用示例数据
    const pilotsData = savedPilots ? JSON.parse(savedPilots) : [];
    const uavsData = savedUAVs ? JSON.parse(savedUAVs) : [];
    
    setFlights(savedFlights ? JSON.parse(savedFlights) : []);
    setPilots(pilotsData);
    setUAVs(uavsData);
    setIsDataLoaded(true);
    
    // 检查是否需要显示首次使用引导（只在未跳过时显示）
    const hasSkippedOnboarding = localStorage.getItem('onboarding_skipped') === 'true';
    const needsOnboarding = pilotsData.length === 0 && uavsData.length === 0 && !hasSkippedOnboarding;
    if (needsOnboarding) {
      console.log('🎯 首次使用，显示引导流程');
      setShowOnboarding(true);
    }
  };

  // 💾 飛行タイマー状態を localStorage に保存（即時復元用）
  useEffect(() => {
    console.log('💾 localStorage保存: flightTimerStatus =', globalFlightStatus);
    localStorage.setItem('flightTimerStatus', JSON.stringify(globalFlightStatus));
  }, [globalFlightStatus]);

  useEffect(() => {
    const value = globalStartTime ? globalStartTime.toISOString() : null;
    console.log('💾 localStorage保存: flightTimerStartTime =', value);
    localStorage.setItem('flightTimerStartTime', JSON.stringify(value));
  }, [globalStartTime]);

  useEffect(() => {
    const value = globalEndTime ? globalEndTime.toISOString() : null;
    console.log('💾 localStorage保存: flightTimerEndTime =', value);
    localStorage.setItem('flightTimerEndTime', JSON.stringify(value));
  }, [globalEndTime]);

  // 🆕 飛行タイマー状態変更時に云端に同期（デバウンス付き）
  useEffect(() => {
    // 初期化時はスキップ（loadData での復元と重複しないように）
    if (!isDataLoaded) return;
    
    const syncTimer = setTimeout(async () => {
      try {
        await supabaseSyncService.saveFlightSession({
          status: globalFlightStatus,
          startTime: globalStartTime,
          endTime: globalEndTime,
        });
      } catch (error) {
        // 同期失敗は静かに無視（次回の同期で再試行）
      }
    }, 500); // 500ms デバウンス
    
    return () => clearTimeout(syncTimer);
  }, [globalFlightStatus, globalStartTime, globalEndTime, isDataLoaded]);

  // 🔧 開発環境用: 認証トークンを自動設定
  useEffect(() => {
    if (import.meta.env.MODE === 'development') {
      if (!localStorage.getItem('auth_token')) {
        generateDevToken();
        console.log('🔧 開発用認証トークンを自動生成しました');
      }
      showDevAuthInfo();
    }
  }, []);

  const handleAddFlight = async (newFlight: Omit<FlightLog, 'id'>) => {
    try {
      // 🔄 使用 Supabase 同步服务保存（离线优先）
      const flightId = await supabaseSyncService.saveFlightLog(newFlight);
      console.log('✅ 飞行记录已保存:', flightId);
      
      const flight: FlightLog = {
        ...newFlight,
        id: flightId
      };
      
      // 更新本地状态（立即显示）
      setFlights(prev => [flight, ...prev]);
      
      // Update UAV flight hours
      const uav = uavs.find(u => 
        u.model === newFlight.droneModel || 
        u.nickname === newFlight.droneModel
      );
      if (uav) {
        const flightHours = newFlight.duration / 60;
        const updates = {
          totalFlightHours: uav.totalFlightHours + flightHours,
          hoursSinceLastMaintenance: uav.hoursSinceLastMaintenance + flightHours
        };
        setUAVs(prev => prev.map(u => u.id === uav.id ? { ...u, ...updates } : u));
        // 使用updateUAV同步到云端
        await supabaseSyncService.updateUAV(uav.id, updates);
      }
      
      // 🆕 Update Pilot flight hours
      const pilot = pilots.find(p => p.name === newFlight.pilot && p.isActive);
      if (pilot) {
        const flightMinutes = newFlight.duration; // 分単位
        const updates = {
          totalFlightHours: pilot.totalFlightHours + flightMinutes
        };
        setPilots(prev => prev.map(p => p.id === pilot.id ? { ...p, ...updates } : p));
        // 使用updatePilot同步到云端
        await supabaseSyncService.updatePilot(pilot.id, updates);
      }
      
      // 🔄 飛行記録提出後、タイマーをリセット
      setGlobalFlightStatus('ready');
      setGlobalStartTime(null);
      setGlobalEndTime(null);
      
      setActiveTab('history');
    } catch (error) {
      console.error('❌ 保存飞行记录失败:', error);
      // 显示错误提示（可选）
      alert('保存失败，请检查网络连接');
    }
  };

  const handleAddPilot = async (newPilot: Omit<Pilot, 'id'>) => {
    try {
      const pilotId = await supabaseSyncService.savePilot(newPilot);
      const pilot: Pilot = { ...newPilot, id: pilotId };
      setPilots(prev => [...prev, pilot]);
      console.log('✅ 飞行员已保存:', pilotId);
    } catch (error) {
      console.error('❌ 保存飞行员失败:', error);
    }
  };

  const handleUpdatePilot = async (id: string, updates: Partial<Pilot>) => {
    try {
      // 1. 立即更新本地状态
      setPilots(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      
      // 2. 使用updatePilot方法同步到云端
      await supabaseSyncService.updatePilot(id, updates);
      console.log('✅ 飞行员已更新:', id);
    } catch (error) {
      console.error('❌ 更新飞行员失败:', error);
      // 回滚本地状态
      await loadData();
    }
  };

  const handleDeletePilot = async (id: string) => {
    try {
      // 1. 立即更新本地状态（软删除）
      setPilots(prev => prev.map(p => p.id === id ? { ...p, isActive: false } : p));
      
      // 2. 使用updatePilot方法同步到云端
      await supabaseSyncService.updatePilot(id, { isActive: false });
      console.log('✅ 飞行员已删除:', id);
    } catch (error) {
      console.error('❌ 删除飞行员失败:', error);
      // 回滚本地状态
      await loadData();
    }
  };

  const handleAddUAV = async (newUAV: Omit<UAV, 'id'>) => {
    try {
      const uavId = await supabaseSyncService.saveUAV(newUAV);
      const uav: UAV = { ...newUAV, id: uavId };
      setUAVs(prev => [...prev, uav]);
      console.log('✅ 无人机已保存:', uavId);
    } catch (error) {
      console.error('❌ 保存无人机失败:', error);
    }
  };

  const handleUpdateUAV = async (id: string, updates: Partial<UAV>) => {
    try {
      // 1. 立即更新本地状态
      setUAVs(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
      
      // 2. 使用updateUAV方法同步到云端
      await supabaseSyncService.updateUAV(id, updates);
      console.log('✅ 无人机已更新:', id);
    } catch (error) {
      console.error('❌ 更新无人机失败:', error);
      // 回滚本地状态
      await loadData();
    }
  };

  const handleDeleteUAV = async (id: string) => {
    try {
      // 1. 立即更新本地状态（软删除）
      setUAVs(prev => prev.map(u => u.id === id ? { ...u, isActive: false } : u));
      
      // 2. 使用updateUAV方法同步到云端
      await supabaseSyncService.updateUAV(id, { isActive: false });
      console.log('✅ 无人机已删除:', id);
    } catch (error) {
      console.error('❌ 删除无人机失败:', error);
      // 回滚本地状态
      await loadData();
    }
  };

  const handleViewFlight = (flight: FlightLog) => {
    setSelectedFlight(flight);
    setIsDetailModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsDetailModalOpen(false);
    setSelectedFlight(null);
  };

  // 🆕 飛行記録の更新処理
  const handleUpdateFlight = async (id: string, updates: Partial<FlightLog>) => {
    try {
      console.log('📝 飛行記録を更新:', id, updates);
      
      // 1. 立即更新本地状态
      setFlights(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
      
      // 2. 更新選択中の飛行記録
      if (selectedFlight && selectedFlight.id === id) {
        setSelectedFlight({ ...selectedFlight, ...updates });
      }
      
      // 3. 使用 supabaseSyncService 同步到云端
      await supabaseSyncService.updateFlightLog(id, updates);
      console.log('✅ 飛行記録の更新完了:', id);
    } catch (error) {
      console.error('❌ 飛行記録の更新失敗:', error);
      // 回滚本地状态
      await loadData();
      alert('更新に失敗しました。もう一度お試しください。');
    }
  };

  // 🆕 日常点検記録の処理（オフライン対応）
  const handleAddDailyInspection = async (data: CreateDailyInspectionDTO) => {
    try {
      await syncService.saveDailyInspection(data);
      const isOnline = syncService.isOnline();
      
      if (isOnline) {
        alert('✅ 日常点検記録を保存しました！');
      } else {
        alert('✅ 日常点検記録をローカルに保存しました！\nネットワーク復旧後に自動同期されます。');
      }
      
      setActiveTab('history');
    } catch (error) {
      console.error('保存エラー:', error);
      alert('❌ 保存に失敗しました');
    }
  };

  // 🆕 点検整備記録の処理（オフライン対応）
  const handleAddMaintenanceRecord = async (data: any) => {
    try {
      console.log('📝 点検整備記録を保存中...', data);
      await syncService.saveMaintenanceRecord(data);
      const isOnline = syncService.isOnline();
      
      if (isOnline) {
        alert('✅ 点検整備記録を保存しました！');
      } else {
        alert('✅ 点検整備記録をローカルに保存しました！\nネットワーク復旧後に自動同期されます。');
      }
      
      setActiveTab('history');
    } catch (error: any) {
      console.error('保存エラー:', error);
      const errorMessage = error?.message || '不明なエラー';
      alert(`❌ 保存に失敗しました\n\nエラー: ${errorMessage}\n\n※ Supabaseのmaintenance_recordsテーブルが作成されていない可能性があります。`);
    }
  };

  // 🆕 首次使用引导完成处理
  const handleOnboardingComplete = async (pilot: Omit<Pilot, 'id'>, uav: Omit<UAV, 'id'>) => {
    try {
      console.log('📝 保存首次设置数据...', { pilot, uav });
      
      // 保存操纵士
      const pilotId = await supabaseSyncService.savePilot(pilot);
      const newPilot: Pilot = { ...pilot, id: pilotId };
      setPilots([newPilot]);
      
      // 保存飞机
      const uavId = await supabaseSyncService.saveUAV(uav);
      const newUAV: UAV = { ...uav, id: uavId };
      setUAVs([newUAV]);
      
      // 关闭引导流程
      setShowOnboarding(false);
      localStorage.setItem('onboarding_skipped', 'true');
      
      console.log('✅ 首次设置完成！');
    } catch (error) {
      console.error('❌ 首次设置失败:', error);
      alert('❌ 保存に失敗しました。もう一度お試しください。');
    }
  };

  // 🆕 跳过首次使用引导
  const handleOnboardingSkip = () => {
    console.log('⏭️ 引导流程已跳过');
    setShowOnboarding(false);
    localStorage.setItem('onboarding_skipped', 'true');
  };

  // 🔄 登录时数据融合处理
  const handleDataMergeOnLogin = async () => {
    try {
      console.log('🔄 登录后同步数据...');
      
      // 1. 先尝试将本地待同步数据上传到云端
      const result = await supabaseSyncService.forceSyncOnLogin();
      
      if (result.success > 0) {
        console.log(`✅ 本地数据上传成功: ${result.success} 条`);
      }
      if (result.failed > 0) {
        console.log(`⚠️ 部分数据上传失败: ${result.failed} 条`);
      }

      // 2. 🔑 确保在线状态，准备从云端拉取
      await supabaseSyncService.forcePullFromCloud();

      // 3. 从云端拉取最新数据
      console.log('📥 从云端拉取最新数据...');
      await loadData();
      console.log('✅ 云端数据同步完成！');
      
    } catch (error) {
      console.error('❌ 数据同步失败:', error);
      // 即使同步失败，也尝试加载本地数据
      await loadData();
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-lg shadow-sm border-b border-blue-200/30 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-700 to-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-600/30">
                <Plane className="h-5 w-5 sm:h-6 sm:w-6 text-white flex-shrink-0" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl text-gray-800 truncate">ソラログ</h1>
                <p className="text-xs text-blue-700 hidden sm:block">SoraLog - 無人航空機日誌</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden md:flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-gradient-to-br from-blue-100 to-blue-50 text-blue-800 rounded-full border border-blue-200/50">
                <BarChart3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">総フライト:</span>
                <span className="font-medium">{flights.length}回</span>
              </div>
              {/* 用户菜单（包含同步状态） */}
              <UserMenu syncStatus={syncStatus} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">

          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="lg:col-span-2">
                <FlightStatistics flights={flights} />
              </div>
              <div className="space-y-4 sm:space-y-6">
                <div className="bg-white/90 backdrop-blur-sm p-5 sm:p-6 rounded-3xl shadow-xl border border-blue-200/30">
                  <h3 className="mb-5 text-gray-800 flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-blue-700"></div>
                    クイックアクション
                  </h3>
                  <div className="space-y-3">
                    <button 
                      onClick={() => setActiveTab('add')}
                      className="group w-full p-5 text-left bg-gradient-to-br from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 text-white rounded-2xl transition-all shadow-lg hover:shadow-xl hover:shadow-blue-600/30 touch-manipulation transform hover:scale-[1.02] active:scale-[0.98] md:p-4"
                    >
                      <div className="flex items-center gap-4 md:gap-3">
                        <div className="bg-white/20 p-3 rounded-xl group-hover:bg-white/30 transition-colors md:p-2">
                          <Plus className="h-6 w-6 flex-shrink-0 md:h-5 md:w-5" />
                        </div>
                        <span className="text-base font-medium sm:text-base md:text-sm">新しいフライトを記録</span>
                      </div>
                    </button>
                    <button 
                      onClick={() => setActiveTab('history')}
                      className="group w-full p-5 text-left bg-blue-50/80 hover:bg-blue-100 rounded-2xl transition-all touch-manipulation border border-blue-200/50 hover:border-blue-300/50 hover:shadow-md md:p-4"
                    >
                      <div className="flex items-center gap-4 md:gap-3">
                        <div className="bg-blue-100 p-3 rounded-xl group-hover:bg-blue-200 transition-colors md:p-2">
                          <History className="h-6 w-6 text-blue-700 flex-shrink-0 md:h-5 md:w-5" />
                        </div>
                        <span className="text-base font-medium text-gray-700 md:text-sm">フライト履歴を確認</span>
                      </div>
                    </button>
                    <button 
                      onClick={() => setActiveTab('management')}
                      className="group w-full p-5 text-left bg-blue-50/80 hover:bg-blue-100 rounded-2xl transition-all touch-manipulation border border-blue-200/50 hover:border-blue-300/50 hover:shadow-md md:p-4"
                    >
                      <div className="flex items-center gap-4 md:gap-3">
                        <div className="bg-blue-100 p-3 rounded-xl group-hover:bg-blue-200 transition-colors md:p-2">
                          <Users className="h-6 w-6 text-blue-700 flex-shrink-0 md:h-5 md:w-5" />
                        </div>
                        <span className="text-base font-medium text-gray-700 md:text-sm">操縦者・機体管理</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Maintenance Alerts */}
                {uavs.filter(u => u.isActive && u.hoursSinceLastMaintenance >= 15).length > 0 && (
                  <div className="bg-white/90 backdrop-blur-sm p-5 sm:p-6 rounded-3xl shadow-xl border border-yellow-300/30">
                    <h3 className="mb-5 text-yellow-800 flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-yellow-500"></div>
                      点検・整備アラート
                    </h3>
                    <div className="space-y-3">
                      {uavs.filter(u => u.isActive && u.hoursSinceLastMaintenance >= 15).map((uav) => (
                        <div 
                          key={uav.id}
                          className={`p-4 rounded-2xl ${
                            uav.hoursSinceLastMaintenance >= 20 
                              ? 'bg-red-50 border border-red-300/50 shadow-sm' 
                              : 'bg-yellow-50 border border-yellow-300/50 shadow-sm'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm truncate">{uav.nickname}</p>
                              <p className="text-xs text-gray-600">
                                {uav.hoursSinceLastMaintenance.toFixed(1)}時間経過
                              </p>
                            </div>
                            <span className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap ml-2 ${
                              uav.hoursSinceLastMaintenance >= 20 
                                ? 'bg-red-500 text-white shadow-sm' 
                                : 'bg-yellow-500 text-white shadow-sm'
                            }`}>
                              {uav.hoursSinceLastMaintenance >= 20 ? '点検必要' : '点検近い'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Flights */}
                <div className="bg-white/90 backdrop-blur-sm p-5 sm:p-6 rounded-3xl shadow-xl border border-blue-200/30">
                  <h3 className="mb-5 text-gray-800 flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-blue-700"></div>
                    最近のフライト
                  </h3>
                  <div className="space-y-3">
                    {flights.slice(0, 3).map((flight) => (
                      <div 
                        key={flight.id}
                        className="group p-4 bg-gradient-to-br from-blue-50/80 to-blue-50/40 rounded-2xl cursor-pointer hover:from-blue-100/80 hover:to-blue-100/40 transition-all touch-manipulation border border-blue-200/30 hover:border-blue-300/50 hover:shadow-md"
                        onClick={() => handleViewFlight(flight)}
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm truncate text-gray-800 group-hover:text-blue-800 transition-colors">{flight.location}</p>
                            <p className="text-xs text-blue-700">
                              {new Date(flight.date).toLocaleDateString('ja-JP')}
                            </p>
                          </div>
                          <span className="text-xs bg-gradient-to-br from-blue-700 to-blue-600 text-white px-3 py-1.5 rounded-full whitespace-nowrap shadow-md">
                            {flight.duration}分
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="add" className="space-y-6 md:space-y-4">
            {/* 🆕 様式切り替えタブ */}
            <div className="bg-white/90 backdrop-blur-sm p-4 rounded-3xl shadow-xl border border-blue-200/30">
              <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-600" />
                記録を追加
              </h2>
              <div className="grid grid-cols-3 gap-3 md:gap-2">
                <button
                  onClick={() => setRecordType('style1')}
                  className={`p-4 rounded-2xl transition-all border-2 ${
                    recordType === 'style1'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <Plane className={`h-6 w-6 mx-auto mb-2 ${recordType === 'style1' ? 'text-white' : 'text-blue-600'}`} />
                  <div className="text-sm font-medium">様式1</div>
                  <div className="text-xs mt-1 opacity-80">飛行記録</div>
                </button>
                <button
                  onClick={() => setRecordType('style2')}
                  className={`p-4 rounded-2xl transition-all border-2 ${
                    recordType === 'style2'
                      ? 'bg-green-600 text-white border-green-600 shadow-lg'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-green-300'
                  }`}
                >
                  <ClipboardCheck className={`h-6 w-6 mx-auto mb-2 ${recordType === 'style2' ? 'text-white' : 'text-green-600'}`} />
                  <div className="text-sm font-medium">様式2</div>
                  <div className="text-xs mt-1 opacity-80">日常点検</div>
                </button>
                <button
                  onClick={() => setRecordType('style3')}
                  className={`p-4 rounded-2xl transition-all border-2 ${
                    recordType === 'style3'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-lg'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-amber-300'
                  }`}
                >
                  <Wrench className={`h-6 w-6 mx-auto mb-2 ${recordType === 'style3' ? 'text-white' : 'text-amber-600'}`} />
                  <div className="text-sm font-medium">様式3</div>
                  <div className="text-xs mt-1 opacity-80">点検整備</div>
                </button>
              </div>
            </div>

            {/* 様式1: 飛行記録フォーム */}
            {recordType === 'style1' && (
              <FlightLogForm 
                onAddFlight={handleAddFlight} 
                pilots={pilots}
                uavs={uavs}
                flights={flights}
                onAddPilot={handleAddPilot}
                onAddUAV={handleAddUAV}
                globalFlightStatus={globalFlightStatus}
                globalStartTime={globalStartTime}
                globalEndTime={globalEndTime}
                onFlightTimerUpdate={handleFlightTimerUpdate}
              />
            )}

            {/* 様式2: 日常点検記録フォーム */}
            {recordType === 'style2' && (
              <DailyInspectionForm
                onSubmit={handleAddDailyInspection}
                drones={uavs.filter(u => u.isActive).map(u => ({
                  id: u.id,
                  name: u.nickname,
                  registrationMark: u.registrationId || 'N/A'
                }))}
                operators={pilots.filter(p => p.isActive).map(p => ({
                  id: p.id,
                  name: p.name
                }))}
                locations={[]}
              />
            )}

            {/* 様式3: 点検整備記録フォーム */}
            {recordType === 'style3' && (
              <MaintenanceRecordForm
                onSubmit={handleAddMaintenanceRecord}
                drones={uavs.filter(u => u.isActive).map(u => ({
                  id: u.id,
                  name: u.nickname,
                  registrationMark: u.registrationId || 'N/A',
                  totalFlightHours: u.totalFlightHours,
                }))}
                operators={pilots.filter(p => p.isActive).map(p => ({
                  id: p.id,
                  name: p.name
                }))}
                locations={[]}
              />
            )}
          </TabsContent>

          <TabsContent value="history">
            <FlightHistory flights={flights} onViewFlight={handleViewFlight} />
          </TabsContent>

          <TabsContent value="more" className="space-y-4 sm:space-y-6">
            <div className="bg-white/90 backdrop-blur-sm p-5 sm:p-6 rounded-3xl shadow-xl border border-blue-200/30">
              <h3 className="mb-6 text-gray-800 flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-blue-700"></div>
                その他の機能
              </h3>
              <div className="space-y-3">
                <button 
                  onClick={() => setActiveTab('statistics')}
                  className="group w-full p-4 text-left bg-blue-50/80 hover:bg-blue-100 rounded-2xl transition-all touch-manipulation border border-blue-200/50 hover:border-blue-300/50 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-2 rounded-xl group-hover:bg-blue-200 transition-colors">
                        <BarChart3 className="h-5 w-5 text-blue-700 flex-shrink-0" />
                      </div>
                      <span className="text-sm sm:text-base text-gray-700">統計・分析</span>
                    </div>
                    <div className="text-blue-400 group-hover:translate-x-1 transition-transform">→</div>
                  </div>
                </button>
                <button 
                  onClick={() => setActiveTab('management')}
                  className="group w-full p-4 text-left bg-blue-50/80 hover:bg-blue-100 rounded-2xl transition-all touch-manipulation border border-blue-200/50 hover:border-blue-300/50 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-2 rounded-xl group-hover:bg-blue-200 transition-colors">
                        <Users className="h-5 w-5 text-blue-700 flex-shrink-0" />
                      </div>
                      <span className="text-sm sm:text-base text-gray-700">操縦者・機体管理</span>
                    </div>
                    <div className="text-blue-400 group-hover:translate-x-1 transition-transform">→</div>
                  </div>
                </button>
                <button 
                  onClick={() => setActiveTab('export')}
                  className="group w-full p-4 text-left bg-blue-50/80 hover:bg-blue-100 rounded-2xl transition-all touch-manipulation border border-blue-200/50 hover:border-blue-300/50 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-2 rounded-xl group-hover:bg-blue-200 transition-colors">
                        <Settings className="h-5 w-5 text-blue-700 flex-shrink-0" />
                      </div>
                      <span className="text-sm sm:text-base text-gray-700">エクスポート・設定</span>
                    </div>
                    <div className="text-blue-400 group-hover:translate-x-1 transition-transform">→</div>
                  </div>
                </button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="statistics">
            <FlightStatistics flights={flights} />
          </TabsContent>

          <TabsContent value="management" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
              <PilotManagement 
                pilots={pilots}
                flights={flights}
                onAddPilot={handleAddPilot}
                onUpdatePilot={handleUpdatePilot}
                onDeletePilot={handleDeletePilot}
              />
              <UAVManagement 
                uavs={uavs}
                flights={flights}
                onAddUAV={handleAddUAV}
                onUpdateUAV={handleUpdateUAV}
                onDeleteUAV={handleDeleteUAV}
              />
            </div>
          </TabsContent>

          <TabsContent value="export">
            <ExportPanel 
              flights={flights}
              uavs={uavs}
              pilots={pilots}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-blue-200/50 shadow-2xl z-50">
        {/* 🆕 飞行状态提醒条 */}
        {globalFlightStatus === 'started' && (
          <button
            onClick={() => {
              setActiveTab('add');
              setRecordType('style1'); // 🆕 同时切换到飞行记录页面
            }}
            className="w-full bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 text-white px-4 py-2.5 flex items-center justify-center gap-3 hover:from-green-600 hover:via-emerald-600 hover:to-green-700 transition-all cursor-pointer active:scale-[0.99] border-b-2 border-green-700"
          >
            <div className="flex items-center gap-2">
              <div className="relative flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full animate-ping absolute"></div>
                <div className="w-2 h-2 bg-white rounded-full relative"></div>
              </div>
              <span className="font-bold text-sm sm:text-base">🚁 飛行中</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
              <Clock className="h-4 w-4" />
              <span className="font-mono font-bold text-base sm:text-lg tabular-nums">
                {formatElapsedTime(menuBarElapsedTime)}
              </span>
            </div>
            <span className="text-xs opacity-90 hidden sm:inline">タップして飛行記録を確認</span>
          </button>
        )}
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-4 gap-2 h-16 relative px-4">
            {/* Home Button */}
            <button
              onClick={() => setActiveTab('overview')}
              className={`relative flex flex-col items-center justify-center gap-1 py-2 rounded-2xl transition-all duration-200 touch-manipulation ${
                activeTab === 'overview' 
                  ? 'bg-blue-50' 
                  : 'hover:bg-blue-50/50'
              }`}
            >
              <Home className={`h-6 w-6 transition-colors ${activeTab === 'overview' ? 'text-blue-700' : 'text-gray-400'}`} />
              <span className={`text-xs transition-colors ${activeTab === 'overview' ? 'text-blue-800' : 'text-gray-500'}`}>ホーム</span>
            </button>
            
            {/* Flight Log Button */}
            <button
              onClick={() => setActiveTab('add')}
              className={`relative flex flex-col items-center justify-center gap-1 py-2 rounded-2xl transition-all duration-200 touch-manipulation ${
                activeTab === 'add' 
                  ? 'bg-blue-50' 
                  : 'hover:bg-blue-50/50'
              }`}
            >
              <Plane className={`h-6 w-6 transition-colors ${activeTab === 'add' ? 'text-blue-700' : 'text-gray-400'}`} />
              <span className={`text-xs transition-colors ${activeTab === 'add' ? 'text-blue-800' : 'text-gray-500'}`}>飛行日誌</span>
            </button>
            
            {/* History Button */}
            <button
              onClick={() => setActiveTab('history')}
              className={`relative flex flex-col items-center justify-center gap-1 py-2 rounded-2xl transition-all duration-200 touch-manipulation ${
                activeTab === 'history' 
                  ? 'bg-blue-50' 
                  : 'hover:bg-blue-50/50'
              }`}
            >
              <History className={`h-6 w-6 transition-colors ${activeTab === 'history' ? 'text-blue-700' : 'text-gray-400'}`} />
              <span className={`text-xs transition-colors ${activeTab === 'history' ? 'text-blue-800' : 'text-gray-500'}`}>履歴</span>
            </button>
            
            {/* More Button */}
            <button
              onClick={() => setActiveTab('more')}
              className={`relative flex flex-col items-center justify-center gap-1 py-2 rounded-2xl transition-all duration-200 touch-manipulation ${
                activeTab === 'more' || activeTab === 'management' || activeTab === 'export'
                  ? 'bg-blue-50' 
                  : 'hover:bg-blue-50/50'
              }`}
            >
              <Menu className={`h-6 w-6 transition-colors ${(activeTab === 'more' || activeTab === 'management' || activeTab === 'export') ? 'text-blue-700' : 'text-gray-400'}`} />
              <span className={`text-xs transition-colors ${(activeTab === 'more' || activeTab === 'management' || activeTab === 'export') ? 'text-blue-800' : 'text-gray-500'}`}>その他</span>
            </button>

          </div>
        </div>
      </nav>

      {/* Flight Detail Modal */}
      <FlightDetailModal
        flight={selectedFlight}
        isOpen={isDetailModalOpen}
        onClose={handleCloseModal}
        onUpdate={handleUpdateFlight}
        pilots={pilots}
        uavs={uavs}
      />

      {/* 🆕 首次使用引导流程 */}
      <OnboardingFlow
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    </div>
  );
}