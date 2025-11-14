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
import { SyncStatusBar } from './components/SyncStatusBar';
import { Plane, BarChart3, History, Plus, Users, Settings, Home, Menu, ClipboardCheck, Wrench } from 'lucide-react';
import type { CreateDailyInspectionDTO } from './types';
import { syncService } from './services/sync.service';
import { generateDevToken, showDevAuthInfo } from './utils/devAuth';

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
}

interface Pilot {
  id: string;
  name: string;
  licenseNumber?: string;
  licenseType?: string;
  email?: string;
  phone?: string;
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

// Mock data for demonstration
const mockFlights: FlightLog[] = [
  {
    id: '1',
    date: '2024-09-24',
    duration: 45,
    location: '東京都渋谷区代々木公園',
    droneModel: 'DJI Mini 3',
    weather: '晴れ',
    windSpeed: 2.5,
    altitude: 120,
    purpose: '撮影・映像制作',
    notes: '企業プロモーションビデオの撮影。桜の撮影。風が穏やかで絶好の飛行日和でした。',
    pilot: '山田太郎',
    clientName: '株式会社Aマーケティング'
  },
  {
    id: '2',
    date: '2024-09-22',
    duration: 30,
    location: '千葉県千葉市幕張海浜公園',
    droneModel: 'DJI Air 2S',
    weather: '曇り',
    windSpeed: 4.2,
    altitude: 100,
    purpose: '撮影・映像制作',
    notes: '海岸線の空撮。少し風が強かったが問題なく飛行できました。',
    pilot: '田中花子',
    clientName: 'B不動産開発'
  },
  {
    id: '3',
    date: '2024-09-20',
    duration: 60,
    location: '神奈川県鎌倉市七里ヶ浜',
    droneModel: 'DJI Mavic 3',
    weather: '晴れ',
    windSpeed: 1.8,
    altitude: 150,
    purpose: '練習・訓練',
    notes: '新しい操縦技術の練習。江ノ島を背景にした撮影も行いました。',
    pilot: '佐藤次郎'
  },
  {
    id: '4',
    date: '2024-09-18',
    duration: 90,
    location: '大阪府大阪市大阪城公園',
    droneModel: 'DJI Mavic 3',
    weather: '晴れ',
    windSpeed: 3.1,
    altitude: 130,
    purpose: '点検・調査',
    notes: '建設現場の進捗確認のための空撮。',
    pilot: '山田太郎',
    clientName: 'C建設株式会社'
  },
  {
    id: '5',
    date: '2024-09-15',
    duration: 25,
    location: '愛知県名古屋市名城公園',
    droneModel: 'DJI Air 2S',
    weather: '曇り',
    windSpeed: 2.8,
    altitude: 80,
    purpose: '趣味・娯楽',
    notes: '個人的な撮影練習。',
    pilot: '田中花子'
  }
];

const mockPilots: Pilot[] = [
  {
    id: '1',
    name: '山田太郎',
    licenseNumber: '123456789',
    licenseType: '一等無人航空機操縦士',
    email: 'yamada@example.com',
    phone: '090-1234-5678',
    isActive: true
  },
  {
    id: '2',
    name: '田中花子',
    licenseNumber: '987654321',
    licenseType: '二等無人航空機操縦士',
    email: 'tanaka@example.com',
    phone: '090-9876-5432',
    isActive: true
  },
  {
    id: '3',
    name: '佐藤次郎',
    licenseType: '二等無人航空機操縦士',
    isActive: true
  }
];

const mockUAVs: UAV[] = [
  {
    id: '1',
    nickname: 'メイン機体',
    registrationId: 'JA001D',
    manufacturer: 'DJI',
    model: 'Mini 3',
    category: 'uncertified',
    totalFlightHours: 15.5,
    hoursSinceLastMaintenance: 8.2,
    isActive: true
  },
  {
    id: '2',
    nickname: '撮影用機体',
    registrationId: 'JA002D',
    manufacturer: 'DJI',
    model: 'Air 2S',
    category: 'certified',
    certificationNumber: 'TC-001',
    certificationDate: '2023-01-15',
    totalFlightHours: 32.1,
    hoursSinceLastMaintenance: 18.7,
    isActive: true
  },
  {
    id: '3',
    nickname: '練習機体',
    manufacturer: 'DJI',
    model: 'Mavic 3',
    category: 'certified',
    certificationNumber: 'TC-002',
    totalFlightHours: 45.3,
    hoursSinceLastMaintenance: 22.1,
    isActive: true
  }
];

export default function App() {
  const [flights, setFlights] = useState<FlightLog[]>(mockFlights);
  const [pilots, setPilots] = useState<Pilot[]>(mockPilots);
  const [uavs, setUAVs] = useState<UAV[]>(mockUAVs);
  const [selectedFlight, setSelectedFlight] = useState<FlightLog | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // 🆕 記録種別（様式1〜3）の管理
  const [recordType, setRecordType] = useState<'style1' | 'style2' | 'style3'>('style1');

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

  const handleAddFlight = (newFlight: Omit<FlightLog, 'id'>) => {
    const flight: FlightLog = {
      ...newFlight,
      id: Date.now().toString()
    };
    setFlights(prev => [flight, ...prev]);
    
    // Update UAV flight hours
    const uav = uavs.find(u => 
      u.model === newFlight.droneModel || 
      u.nickname === newFlight.droneModel
    );
    if (uav) {
      const flightHours = newFlight.duration / 60;
      setUAVs(prev => prev.map(u => 
        u.id === uav.id 
          ? { 
              ...u, 
              totalFlightHours: u.totalFlightHours + flightHours,
              hoursSinceLastMaintenance: u.hoursSinceLastMaintenance + flightHours
            }
          : u
      ));
    }
    
    setActiveTab('history');
  };

  const handleAddPilot = (newPilot: Omit<Pilot, 'id'>) => {
    const pilot: Pilot = {
      ...newPilot,
      id: Date.now().toString()
    };
    setPilots(prev => [...prev, pilot]);
  };

  const handleUpdatePilot = (id: string, updates: Partial<Pilot>) => {
    setPilots(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const handleDeletePilot = (id: string) => {
    setPilots(prev => prev.map(p => p.id === id ? { ...p, isActive: false } : p));
  };

  const handleAddUAV = (newUAV: Omit<UAV, 'id'>) => {
    const uav: UAV = {
      ...newUAV,
      id: Date.now().toString()
    };
    setUAVs(prev => [...prev, uav]);
  };

  const handleUpdateUAV = (id: string, updates: Partial<UAV>) => {
    setUAVs(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
  };

  const handleDeleteUAV = (id: string) => {
    setUAVs(prev => prev.map(u => u.id === id ? { ...u, isActive: false } : u));
  };

  const handleViewFlight = (flight: FlightLog) => {
    setSelectedFlight(flight);
    setIsDetailModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsDetailModalOpen(false);
    setSelectedFlight(null);
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
      await syncService.saveMaintenanceRecord(data);
      const isOnline = syncService.isOnline();
      
      if (isOnline) {
        alert('✅ 点検整備記録を保存しました！');
      } else {
        alert('✅ 点検整備記録をローカルに保存しました！\nネットワーク復旧後に自動同期されます。');
      }
      
      setActiveTab('history');
    } catch (error) {
      console.error('保存エラー:', error);
      alert('❌ 保存に失敗しました');
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* 🆕 同期ステータスバー */}
      <SyncStatusBar />
      
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
            <div className="flex items-center gap-2 text-xs px-3 py-1.5 bg-gradient-to-br from-blue-100 to-blue-50 text-blue-800 rounded-full border border-blue-200/50">
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">総フライト:</span>
              <span>{flights.length}回</span>
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
                onAddPilot={handleAddPilot}
                onUpdatePilot={handleUpdatePilot}
                onDeletePilot={handleDeletePilot}
              />
              <UAVManagement 
                uavs={uavs}
                onAddUAV={handleAddUAV}
                onUpdateUAV={handleUpdateUAV}
                onDeleteUAV={handleDeleteUAV}
              />
            </div>
          </TabsContent>

          <TabsContent value="export">
            <ExportPanel 
              drones={uavs}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-blue-200/50 shadow-2xl z-50">
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
            
            {/* Statistics Button */}
            <button
              onClick={() => setActiveTab('statistics')}
              className={`relative flex flex-col items-center justify-center gap-1 py-2 rounded-2xl transition-all duration-200 touch-manipulation ${
                activeTab === 'statistics' 
                  ? 'bg-blue-50' 
                  : 'hover:bg-blue-50/50'
              }`}
            >
              <BarChart3 className={`h-6 w-6 transition-colors ${activeTab === 'statistics' ? 'text-blue-700' : 'text-gray-400'}`} />
              <span className={`text-xs transition-colors ${activeTab === 'statistics' ? 'text-blue-800' : 'text-gray-500'}`}>統計</span>
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

            {/* Floating Add Button (FAB) - Centered */}
            <div className="absolute left-1/2 -translate-x-1/2 -top-10 md:-top-8">
              <button
                onClick={() => setActiveTab('add')}
                className="bg-gradient-to-br from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 text-white p-5 rounded-full shadow-2xl hover:shadow-blue-600/50 transition-all duration-200 touch-manipulation transform hover:scale-105 active:scale-95 md:p-4"
              >
                <Plus className="h-10 w-10 md:h-8 md:w-8" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Flight Detail Modal */}
      <FlightDetailModal
        flight={selectedFlight}
        isOpen={isDetailModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}