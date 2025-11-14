import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { LocationInput } from './LocationInput';
import { DatePicker } from './ui/date-picker';
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { PlusCircle, CheckCircle2, RotateCcw, Play, Square, Clock, Building2, Mountain, Users, Moon, Eye, AlertTriangle, PartyPopper, Package, ChevronDown, X as XIcon, Edit } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Badge } from './ui/badge';

interface LocationSelection {
  displayName: string;
  address: string;
  latitude?: number;
  longitude?: number;
  source: 'history' | 'geocode' | 'manual';
}

export interface FlightLog {
  id: string;
  date: string;
  time?: string;
  duration: number;
  location: string | LocationSelection;
  locationAddressDetail?: string;
  locationLatitude?: number;
  locationLongitude?: number;
  droneModel: string;
  weather: string;
  windSpeed?: number;
  altitude?: number;
  purpose: string;
  notes: string;
  pilot: string;
  summary?: string;
  tokuteiFlightCategories?: TokuteiFlightCategory[];
  isTokuteiFlight?: boolean;
  flightPlanNotified?: boolean;
  clientName?: string;
}

interface Pilot {
  id: string;
  name: string;
  licenseNumber?: string;
  licenseType?: string;
  initialFlightHours: number; // 登录时的总飞行时间（分钟）
  totalFlightHours: number; // 总飞行时间（分钟）= 初始飞行时间 + アプリ内累计时间
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

interface FlightLogFormProps {
  onAddFlight: (flight: Omit<FlightLog, 'id'>) => void;
  pilots?: Pilot[];
  uavs?: UAV[];
  flights?: FlightLog[];
  onAddPilot?: (pilot: Omit<Pilot, 'id'>) => void;
  onAddUAV?: (uav: Omit<UAV, 'id'>) => void;
  // 🆕 全局飛行タイマー状態（切替タブ後も維持）
  globalFlightStatus?: 'ready' | 'started' | 'finished';
  globalStartTime?: Date | null;
  globalEndTime?: Date | null;
  onFlightTimerUpdate?: (status: 'ready' | 'started' | 'finished', startTime: Date | null, endTime: Date | null) => void;
}

// 現在時刻を HH:mm 形式で取得
const getCurrentTime = () => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

// 🆕 formDataの初期値を取得する関数
const getInitialFormData = () => {
  const saved = localStorage.getItem('flightFormData');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Date オブジェクトの復元
      if (parsed.date && typeof parsed.date === 'string') {
        parsed.date = new Date(parsed.date);
      }
      if (parsed.faultDate && typeof parsed.faultDate === 'string') {
        parsed.faultDate = new Date(parsed.faultDate);
      }
      if (parsed.fixDate && typeof parsed.fixDate === 'string') {
        parsed.fixDate = new Date(parsed.fixDate);
      }
      console.log('💾 localStorage から formData を復元:', parsed);
      return parsed;
    } catch (error) {
      console.error('formData の復元に失敗:', error);
    }
  }
  
  return {
    date: new Date(),
    time: getCurrentTime(),
    duration: '',
    location: '',
    locationAddressDetail: '',
    locationLatitude: null,
    locationLongitude: null,
    droneModel: '',
    weather: '',
    purpose: '',
    notes: '',
    pilot: '',
    operatorId: '',
    outline: '',
    tokuteiFlightCategories: [] as TokuteiFlightCategory[],
    flightPlanNotified: false,
    takeoffLocationId: '',
    takeoffTime: '',
    landingLocationId: '',
    landingTime: '',
    flightTimeMinutes: 0,
    safetyImpactNote: '',
    faultDate: null as Date | null,
    faultDetail: '',
    fixDate: null as Date | null,
    fixDetail: '',
    confirmerId: ''
  };
};

const TOKUTEI_FLIGHT_OPTIONS = [
  { value: 'airport_surroundings', label: '空港等周辺', icon: Building2, group: '空域制限' },
  { value: 'above_150m', label: '地表又は水面から150m以上', icon: Mountain, group: '空域制限' },
  { value: 'did_area', label: '人口集中地区（DID）上空', icon: Users, group: '空域制限' },
  { value: 'night', label: '夜間', icon: Moon, group: '時間制限' },
  { value: 'beyond_visual_line', label: '目視外', icon: Eye, group: '飛行方法' },
  { value: 'within_30m', label: '人又は物件から30m未満', icon: AlertTriangle, group: '距離制限' },
  { value: 'event_site', label: '催し場所上空', icon: PartyPopper, group: '特殊空域' },
  { value: 'dangerous_goods', label: '危険物輸送', icon: Package, group: '特殊飛行' },
  { value: 'object_drop', label: '物件投下の飛行', icon: Package, group: '特殊飛行' },
] as const;

type TokuteiFlightCategory = typeof TOKUTEI_FLIGHT_OPTIONS[number]['value'];

export function FlightLogForm({ 
  onAddFlight, 
  pilots = [], 
  uavs = [], 
  flights = [], 
  onAddPilot, 
  onAddUAV,
  globalFlightStatus = 'ready',
  globalStartTime = null,
  globalEndTime = null,
  onFlightTimerUpdate
}: FlightLogFormProps) {
  // 🆕 formData を localStorage から復元
  const [formData, setFormData] = useState(getInitialFormData);

  // 🆕 currentStep も localStorage に保存して切替後も維持
  // globalFlightStatus に基づいて自動的に正しいステップを復元
  const [currentStep, setCurrentStep] = useState(() => {
    const saved = localStorage.getItem('flightFormCurrentStep');
    const savedStep = saved ? parseInt(saved, 10) : 1;
    
    console.log('🔍 FlightLogForm初期化:', { 
      savedStep, 
      globalFlightStatus, 
      willUseStep: (globalFlightStatus === 'started' || globalFlightStatus === 'finished') ? 3 : savedStep 
    });
    
    // 飛行中または完了している場合は、必ずステップ3にする
    if (globalFlightStatus === 'started' || globalFlightStatus === 'finished') {
      return 3;
    }
    
    return savedStep;
  });
  
  // タイマー機能のためのstate（全局状態を使用）
  const flightStatus = globalFlightStatus;
  const startTime = globalStartTime;
  const endTime = globalEndTime;
  
  // ローカル状態（UIのみ）
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isConfirmEndOpen, setIsConfirmEndOpen] = useState(false);
  const [isDurationEditable, setIsDurationEditable] = useState(false);
  
  // 🆕 コンポーネントマウント時またはflightStatus/startTime変更時に初期経過時間を設定
  useEffect(() => {
    if (flightStatus === 'started' && startTime) {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      console.log('⏱️ 初期経過時間を設定:', elapsed, 'startTime:', startTime);
      setElapsedTime(elapsed);
    } else {
      console.log('⏱️ タイマーリセット:', { flightStatus, startTime });
      setElapsedTime(0);
    }
  }, [flightStatus, startTime]);
  
  // 点検項目表示制御のstate
  const [isChecklistVisible, setIsChecklistVisible] = useState(false);
  
  // 特記事項の入力（点検ページに直接表示）
  const [specialNotesValue, setSpecialNotesValue] = useState('');
  
  // 操縦者リストの表示制御
  const [showAllPilots, setShowAllPilots] = useState(false);
  const [isAddPilotDialogOpen, setIsAddPilotDialogOpen] = useState(false);
  const [newPilotName, setNewPilotName] = useState('');
  
  // 機体リストの表示制御
  const [showAllUAVs, setShowAllUAVs] = useState(false);
  const [isAddUAVDialogOpen, setIsAddUAVDialogOpen] = useState(false);
  const [newUAVData, setNewUAVData] = useState({
    nickname: '',
    manufacturer: '',
    model: ''
  });
  const [isTokuteiPopoverOpen, setIsTokuteiPopoverOpen] = useState(false);
  
  // 🚨 赤坂エリア警察署連絡リマインダー
  const [isAkasakaReminderOpen, setIsAkasakaReminderOpen] = useState(false);
  const selectedTokuteiLabels = TOKUTEI_FLIGHT_OPTIONS
    .filter(option => formData.tokuteiFlightCategories.includes(option.value))
    .map(option => option.label);
  const isTokuteiFlight = selectedTokuteiLabels.length > 0;
  const tokuteiSummary =
    selectedTokuteiLabels.length === 0
      ? '該当する特定飛行を選択'
      : selectedTokuteiLabels.length <= 2
        ? selectedTokuteiLabels.join('／')
        : `${selectedTokuteiLabels[0]} ほか${selectedTokuteiLabels.length - 1}件`;

  // 💾 currentStep を localStorage に保存
  useEffect(() => {
    localStorage.setItem('flightFormCurrentStep', currentStep.toString());
  }, [currentStep]);

  // 🆕 💾 formData を localStorage に保存
  useEffect(() => {
    localStorage.setItem('flightFormData', JSON.stringify(formData));
    console.log('💾 formData を保存:', {
      location: formData.location,
      pilot: formData.pilot,
      droneModel: formData.droneModel,
      purpose: formData.purpose
    });
  }, [formData]);

  // 🆕 globalFlightStatus が変更されたら自動的にステップを同期
  useEffect(() => {
    // 飛行が開始または完了したら、必ずステップ3に移動
    if ((globalFlightStatus === 'started' || globalFlightStatus === 'finished') && currentStep !== 3) {
      console.log('🔄 飛行状態に基づいてステップを自動修正:', { 
        globalFlightStatus, 
        currentStep, 
        willChangeTo: 3 
      });
      setCurrentStep(3);
      localStorage.setItem('flightFormCurrentStep', '3');
    }
  }, [globalFlightStatus, currentStep]);

  // 🆕 飛行時間の自動計算
  useEffect(() => {
    if (formData.takeoffTime && formData.landingTime) {
      try {
        const takeoff = new Date(`2000-01-01T${formData.takeoffTime}:00`);
        const landing = new Date(`2000-01-01T${formData.landingTime}:00`);
        const diffMs = landing.getTime() - takeoff.getTime();
        const diffMinutes = Math.round(diffMs / 60000);
        
        if (diffMinutes > 0) {
          setFormData(prev => ({ ...prev, flightTimeMinutes: diffMinutes }));
        } else if (diffMinutes < 0) {
          // 日をまたぐ場合
          const landing2 = new Date(`2000-01-02T${formData.landingTime}:00`);
          const diffMs2 = landing2.getTime() - takeoff.getTime();
          const diffMinutes2 = Math.round(diffMs2 / 60000);
          if (diffMinutes2 > 0) {
            setFormData(prev => ({ ...prev, flightTimeMinutes: diffMinutes2 }));
          }
        }
      } catch (error) {
        console.error('飛行時間の計算エラー:', error);
      }
    }
  }, [formData.takeoffTime, formData.landingTime]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 🔍 调试：打印提交数据
    console.log('📝 提交飞行记录:', {
      date: formData.date,
      duration: formData.duration,
      location: formData.location,
      droneModel: formData.droneModel,
      weather: formData.weather,
      purpose: formData.purpose,
      pilot: formData.pilot,
      notes: formData.notes
    });
    
    const flightData = {
      date: formData.date instanceof Date 
        ? formData.date.toISOString().split('T')[0]
        : formData.date,
      time: formData.time,
      duration: parseInt(formData.duration) || 0,
      location: formData.location,
      locationAddressDetail: formData.locationAddressDetail || formData.location,
      locationLatitude: formData.locationLatitude ?? undefined,
      locationLongitude: formData.locationLongitude ?? undefined,
      droneModel: formData.droneModel,
      weather: formData.weather,
      purpose: formData.purpose,
      outline: formData.outline, // 🆕 飛行概要
      notes: formData.notes,
      pilot: formData.pilot,
      tokuteiFlightCategories: formData.tokuteiFlightCategories,
      isTokuteiFlight: formData.tokuteiFlightCategories.length > 0,
      flightPlanNotified: formData.tokuteiFlightCategories.length > 0 ? formData.flightPlanNotified : false,
      // 🆕 追加フィールド
      takeoffTime: formData.takeoffTime,
      landingTime: formData.landingTime,
      flightTimeMinutes: formData.flightTimeMinutes
    };
    
    console.log('✅ 处理后的飞行数据:', flightData);
    
    onAddFlight(flightData);

    // 🆕 Reset form with initial data
    const resetData = {
      date: new Date(),
      time: getCurrentTime(),
      duration: '',
      location: '',
      locationAddressDetail: '',
      locationLatitude: null,
      locationLongitude: null,
      droneModel: '',
      weather: '',
      purpose: '',
      notes: '',
      pilot: '',
      operatorId: '',
      outline: '',
      tokuteiFlightCategories: [] as TokuteiFlightCategory[],
      flightPlanNotified: false,
      takeoffLocationId: '',
      takeoffTime: '',
      landingLocationId: '',
      landingTime: '',
      flightTimeMinutes: 0,
      safetyImpactNote: '',
      faultDate: null,
      faultDetail: '',
      fixDate: null,
      fixDetail: '',
      confirmerId: ''
    };
    setFormData(resetData);
    
    // Reset to first step
    setCurrentStep(1);
    
    // 🆕 Clear localStorage
    localStorage.removeItem('flightFormCurrentStep');
    localStorage.removeItem('flightFormData');
    console.log('🧹 localStorage をクリアしました');
    
    // Reset checklist - 恢复默认全部勾选
    const resetChecklist: { [key: string]: { checked: boolean; status: CheckStatus } } = {};
    checklistItems.forEach(item => {
      resetChecklist[item.id] = { checked: true, status: null };
    });
    setChecklist(resetChecklist);
    
    // Reset timer state
    if (onFlightTimerUpdate) {
      onFlightTimerUpdate('ready', null, null);
    }
    setElapsedTime(0);
    setIsConfirmEndOpen(false);
    
    // Reset checklist visibility and special notes
    setIsChecklistVisible(false);
    setSpecialNotesValue('');
    
    // Reset pilot list display
    setShowAllPilots(false);
    
    // Reset UAV list display
    setShowAllUAVs(false);

    setIsTokuteiPopoverOpen(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleTokuteiCategory = (value: TokuteiFlightCategory) => {
    setFormData(prev => {
      const exists = prev.tokuteiFlightCategories.includes(value);
      const updated = exists
        ? prev.tokuteiFlightCategories.filter(item => item !== value)
        : [...prev.tokuteiFlightCategories, value];
      return {
        ...prev,
        tokuteiFlightCategories: updated,
        flightPlanNotified: updated.length === 0 ? false : prev.flightPlanNotified
      };
    });
  };

  const handleLocationChange = (selection: LocationSelection) => {
    setFormData(prev => ({
      ...prev,
      location: selection.address, // 主输入框显示详细地址
      locationAddressDetail: selection.address, // 保存详细地址
      locationLatitude: selection.latitude ?? null,
      locationLongitude: selection.longitude ?? null,
    }));
    
    // 🚨 赤坂エリアの警察署連絡リマインダー
    if (selection.address.includes('赤坂')) {
      setTimeout(() => {
        setIsAkasakaReminderOpen(true);
      }, 300);
    }
  };

  const handleNextStep = () => {
    setCurrentStep(prev => {
      const next = prev + 1;
      // 🆕 即座に localStorage に保存
      localStorage.setItem('flightFormCurrentStep', next.toString());
      console.log('➡️ 次のステップへ:', next);
      console.log('📋 現在のformData:', {
        date: formData.date,
        location: formData.location,
        pilot: formData.pilot,
        droneModel: formData.droneModel,
        purpose: formData.purpose
      });
      return next;
    });
  };
  
  const handleNextStepWithFaultCheck = () => {
    // 检查是否有不具合
    if (hasFaults) {
      const faultItems = checklistItems.filter(item => checklist[item.id]?.status === 'fault');
      const faultNames = faultItems.map(item => item.title).join('、');
      
      if (window.confirm(`以下の項目に不具合があります:\n\n${faultNames}\n\n不具合の部分を確認しましたか？\n\n「OK」で次へ進む、「キャンセル」で点検に戻る`)) {
        setCurrentStep(prev => {
          const next = prev + 1;
          localStorage.setItem('flightFormCurrentStep', next.toString());
          console.log('➡️ 次のステップへ（不具合確認後）:', next);
          return next;
        });
      }
    } else {
      setCurrentStep(prev => {
        const next = prev + 1;
        localStorage.setItem('flightFormCurrentStep', next.toString());
        console.log('➡️ 次のステップへ:', next);
        return next;
      });
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => {
      const next = prev - 1;
      localStorage.setItem('flightFormCurrentStep', next.toString());
      console.log('⬅️ 前のステップへ:', next);
      return next;
    });
  };

  const handleChecklistChange = (id: string, checked: boolean) => {
    setChecklist(prev => ({ 
      ...prev, 
      [id]: { checked, status: prev[id]?.status || null } 
    }));
  };
  
  const handleStatusChange = (id: string, status: CheckStatus) => {
    setChecklist(prev => ({ 
      ...prev, 
      [id]: { ...prev[id], status } 
    }));
  };

  const handleCheckAllItems = () => {
    // 最初のクリック時は項目を表示
    if (!isChecklistVisible) {
      setIsChecklistVisible(true);
      return;
    }
    
    // 2回目以降は全チェック/解除
    const allChecked = checklistItems.every(item => checklist[item.id]?.checked);
    const newChecklistState: { [key: string]: { checked: boolean; status: CheckStatus } } = {};
    
    checklistItems.forEach(item => {
      newChecklistState[item.id] = { 
        checked: !allChecked, 
        status: checklist[item.id]?.status || null 
      };
    });
    
    setChecklist(newChecklistState);
  };
  
  // 一键设为"異常なし"
  const handleSetAllNormal = () => {
    const newChecklistState: { [key: string]: { checked: boolean; status: CheckStatus } } = {};
    
    checklistItems.forEach(item => {
      newChecklistState[item.id] = { 
        checked: true, 
        status: 'normal' 
      };
    });
    
    setChecklist(newChecklistState);
  };

  // タイマー機能の関数
  const handleStartFlight = () => {
    const now = new Date();
    console.log('🚁 飛行開始:', { currentStep, now });
    if (onFlightTimerUpdate) {
      onFlightTimerUpdate('started', now, null);
    }
    setElapsedTime(0);
  };

  const handleEndFlight = () => {
    const now = new Date();
    if (onFlightTimerUpdate) {
      onFlightTimerUpdate('finished', startTime, now);
    }
    
    if (startTime) {
      // 🆕 不足1分も1分として計算（向上取整）
      const durationMinutes = Math.max(1, Math.ceil((now.getTime() - startTime.getTime()) / (1000 * 60)));
      setFormData(prev => ({ ...prev, duration: durationMinutes.toString(), takeoffTime: startTime.toTimeString().slice(0, 5), landingTime: now.toTimeString().slice(0, 5) }));
    } else {
      // Fallback: 如果没有 startTime，使用经过的时间作为估算
      const estimatedMinutes = Math.max(1, Math.ceil(elapsedTime / 60));
      const now = new Date();
      const estimatedStart = new Date(now.getTime() - estimatedMinutes * 60000);
      setFormData(prev => ({ 
        ...prev, 
        duration: estimatedMinutes.toString(),
        takeoffTime: estimatedStart.toTimeString().slice(0, 5), 
        landingTime: now.toTimeString().slice(0, 5)
      }));
    }
    
    setIsDurationEditable(false); // 飛行終了時に編集モードをリセット
    setIsConfirmEndOpen(false);
    
    // 🚨 赤坂エリアの場合、飛行後の警察署連絡リマインダーを表示
    if (formData.location && formData.location.includes('赤坂')) {
      setTimeout(() => {
        setIsAkasakaReminderOpen(true);
      }, 500);
    }
  };

  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // タイマーの更新
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (flightStatus === 'started' && startTime) {
      console.log('⏱️ FlightLogForm: タイマー開始', { startTime, type: typeof startTime });
      
      // 即座に初期値を設定
      const now = new Date();
      const initialElapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setElapsedTime(initialElapsed);
      console.log('⏱️ 初期経過時間:', initialElapsed);
      
      // 1秒ごとに更新
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setElapsedTime(elapsed);
        console.log('⏱️ 経過時間更新:', elapsed);
      }, 1000);
    } else {
      console.log('⏱️ FlightLogForm: タイマー停止', { flightStatus, startTime });
    }
    
    return () => {
      if (interval) {
        console.log('⏱️ タイマークリーンアップ');
        clearInterval(interval);
      }
    };
  }, [flightStatus, startTime]);

  const checklistItems = [
    { id: 'aircraft_general', title: '機体全般', description: '機体に損傷・汚れ・異物がないか、外観を確認してください' },
    { id: 'propellers', title: 'プロペラ', description: 'プロペラが損傷なく、しっかりと固定されているか確認してください' },
    { id: 'frame', title: 'フレーム', description: 'フレームにクラックや変形がないか確認してください' },
    { id: 'communication', title: '通信系統', description: '送信機と機体の通信が正常に行えるか確認してください' },
    { id: 'propulsion', title: '推進系統', description: 'モーターが正常に動作するか確認してください' },
    { id: 'power', title: '電源系統', description: 'バッテリーが十分に充電され、正常に装着されているか確認してください' },
    { id: 'auto_control', title: '自動制御系統', description: 'GPS・ジャイロ等の自動制御システムが正常に動作するか確認してください' },
    { id: 'controller', title: '操縦装置', description: '送信機の操縦スティック・スイッチが正常に動作するか確認してください' },
    { id: 'battery', title: 'バッテリー', description: 'バッテリー残量・温度・膨張がないか確認してください' },
    { id: 'identification', title: '機体識別表示', description: '登録記号等の識別表示が適切に貼付されているか確認してください' },
    { id: 'remote_id', title: 'リモートID機能', description: 'リモートID機器が正常に動作するか確認してください' },
    { id: 'lights', title: '灯火', description: 'ナビゲーションライト等が正常に点灯するか確認してください' },
    { id: 'camera', title: 'カメラ', description: 'カメラ・ジンバルが正常に動作するか確認してください' }
  ];

  // 点検状態: 'normal'=異常なし, 'fault'=不具合, 'not_applicable'=非該当
  type CheckStatus = 'normal' | 'fault' | 'not_applicable' | null;
  const [checklist, setChecklist] = useState<{ [key: string]: { checked: boolean; status: CheckStatus } }>(() => {
    // 默认全部勾选，但状态为null
    const initial: { [key: string]: { checked: boolean; status: CheckStatus } } = {};
    checklistItems.forEach(item => {
      initial[item.id] = { checked: true, status: null };
    });
    return initial;
  });

  const allChecklistCompleted = Object.values(checklist).every(value => value.checked);
  
  // 检查是否有不具合
  const hasFaults = Object.values(checklist).some(value => value.status === 'fault');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlusCircle className="h-5 w-5" />
          飛行前チェック・記録
        </CardTitle>
      </CardHeader>
      <CardContent>
        {currentStep === 1 && (
          <div className="space-y-6 md:space-y-4">
            <div className="text-center py-4 md:py-2">
              <h3 className="text-xl font-medium mb-2 md:text-lg">飛行前準備</h3>
              <p className="text-base text-muted-foreground md:text-sm">点検・離陸場所と日時を確認してください</p>
            </div>

            <div className="space-y-6 md:space-y-4">
              <div className="flex gap-3 items-end flex-nowrap">
                <div className="flex-1 space-y-3 md:space-y-2">
                  <Label htmlFor="date">飛行日</Label>
                  <DatePicker
                    value={formData.date instanceof Date ? formData.date : new Date(formData.date)}
                    onChange={(date) => {
                      if (date) {
                        setFormData(prev => ({ ...prev, date }));
                      }
                    }}
                    placeholder="日付を選択"
                  />
                </div>
                <div className="flex flex-col space-y-2 w-32 sm:w-40">
                  <Label htmlFor="time">時刻</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => handleInputChange('time', e.target.value)}
                    placeholder="時刻"
                    className="text-base"
                  />
                </div>
              </div>

              <div className="space-y-3 md:space-y-2">
                <Label htmlFor="location">点検・離陸場所</Label>
                <LocationInput
                  value={
                    formData.location && formData.location.trim()
                      ? {
                          displayName: formData.location,
                          address: formData.location, // 主输入框显示location（详细地址）
                          latitude: formData.locationLatitude ?? undefined,
                          longitude: formData.locationLongitude ?? undefined,
                          source: 'manual' as const,
                        }
                      : null
                  }
                  onChange={handleLocationChange}
                  flightHistory={flights}
                />
              </div>

              <div className="space-y-3 md:space-y-2">
                <Label htmlFor="pilot">操縦者名</Label>
                {pilots.filter(p => p.isActive).length > 0 ? (
                  <div className="space-y-2">
                    <Select 
                      onValueChange={(value) => {
                        if (value === '__show_more__') {
                          setShowAllPilots(true);
                          // 不改变当前选中的值
                          return;
                        }
                        if (value === '__add_pilot__') {
                          setIsAddPilotDialogOpen(true);
                          // 不改变当前选中的值
                          return;
                        }
                        handleInputChange('pilot', value);
                      }} 
                      value={formData.pilot && !formData.pilot.startsWith('__') ? formData.pilot : undefined}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="操縦者を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {(showAllPilots 
                          ? pilots.filter(p => p.isActive)
                          : pilots.filter(p => p.isActive).slice(0, 5)
                        ).map((pilot) => (
                          <SelectItem key={pilot.id} value={pilot.name}>
                            {pilot.name} {pilot.licenseType && `(${pilot.licenseType})`}
                          </SelectItem>
                        ))}
                        {pilots.filter(p => p.isActive).length > 5 && !showAllPilots && (
                          <SelectItem value="__show_more__" className="text-blue-600 font-medium">
                            <span className="flex items-center">
                              <span className="mr-1">更多...</span>
                            </span>
                          </SelectItem>
                        )}
                        {onAddPilot && (
                          <>
                            <div className="h-px bg-border my-1" />
                            <SelectItem value="__add_pilot__" className="text-green-600 font-medium">
                              <span className="flex items-center">
                                <PlusCircle className="h-4 w-4 mr-2" />
                                追加操縦者
                              </span>
                            </SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      id="pilot"
                      placeholder="山田太郎"
                      value={formData.pilot}
                      onChange={(e) => handleInputChange('pilot', e.target.value)}
                      required
                    />
                    {onAddPilot && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full text-sm"
                        onClick={() => setIsAddPilotDialogOpen(true)}
                      >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        追加操縦者
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3 md:space-y-2">
                <Label htmlFor="droneModel">使用機体</Label>
                {uavs.filter(u => u.isActive).length > 0 ? (
                  <Select 
                    onValueChange={(value) => {
                      if (value === '__show_more__') {
                        setShowAllUAVs(true);
                        return;
                      }
                      if (value === '__add_uav__') {
                        setIsAddUAVDialogOpen(true);
                        return;
                      }
                      handleInputChange('droneModel', value);
                    }} 
                    value={formData.droneModel && !formData.droneModel.startsWith('__') ? formData.droneModel : undefined}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="機体を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {(showAllUAVs
                        ? uavs.filter(u => u.isActive)
                        : uavs.filter(u => u.isActive).slice(0, 5)
                      ).map((uav) => (
                        <SelectItem key={uav.id} value={`${uav.nickname} (${uav.manufacturer} ${uav.model})`}>
                          {uav.nickname} ({uav.manufacturer} {uav.model})
                        </SelectItem>
                      ))}
                      {uavs.filter(u => u.isActive).length > 5 && !showAllUAVs && (
                        <SelectItem value="__show_more__" className="text-blue-600 font-medium">
                          <span className="flex items-center">
                            <span className="mr-1">更多...</span>
                          </span>
                        </SelectItem>
                      )}
                      {onAddUAV && (
                        <>
                          <div className="h-px bg-border my-1" />
                          <SelectItem value="__add_uav__" className="text-green-600 font-medium">
                            <span className="flex items-center">
                              <PlusCircle className="h-4 w-4 mr-2" />
                              追加機体
                            </span>
                          </SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="space-y-2">
                    <Select onValueChange={(value) => handleInputChange('droneModel', value)} value={formData.droneModel}>
                      <SelectTrigger>
                        <SelectValue placeholder="機種を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DJI Mini 3">DJI Mini 3</SelectItem>
                        <SelectItem value="DJI Air 2S">DJI Air 2S</SelectItem>
                        <SelectItem value="DJI Mavic 3">DJI Mavic 3</SelectItem>
                        <SelectItem value="DJI FPV">DJI FPV</SelectItem>
                        <SelectItem value="その他">その他</SelectItem>
                      </SelectContent>
                    </Select>
                    {onAddUAV && (
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={() => setIsAddUAVDialogOpen(true)}
                        className="w-full"
                      >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        追加機体
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* 🆕 飛行目的 */}
              <div className="space-y-3 md:space-y-2">
                <Label htmlFor="purpose">飛行目的 *</Label>
                <Select onValueChange={(value) => handleInputChange('purpose', value)} value={formData.purpose}>
                  <SelectTrigger>
                    <SelectValue placeholder="目的を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="空撮・撮影">空撮・撮影</SelectItem>
                    <SelectItem value="測量・調査">測量・調査</SelectItem>
                    <SelectItem value="インフラ点検">インフラ点検</SelectItem>
                    <SelectItem value="農業・農薬散布">農業・農薬散布</SelectItem>
                    <SelectItem value="物資輸送">物資輸送</SelectItem>
                    <SelectItem value="訓練・練習">訓練・練習</SelectItem>
                    <SelectItem value="その他">その他</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 🆕 飛行概要 */}
              <div className="space-y-3 md:space-y-2">
                <Label htmlFor="outline">飛行概要（任意）</Label>
                <Textarea
                  id="outline"
                  value={formData.outline}
                  onChange={(e) => setFormData(prev => ({ ...prev, outline: e.target.value }))}
                  placeholder="例: A地点からB地点へ直線飛行、高度50m、企業プロモーション撮影"
                  rows={3}
                  className="min-h-20 md:min-h-16"
                />
              </div>

              <Separator className="my-6 md:my-4" />

              {/* 🆕 特定飛行カテゴリ */}
              <div className="space-y-3 md:space-y-2">
                <Label>特定飛行（複数選択可）</Label>
                <Popover open={isTokuteiPopoverOpen} onOpenChange={setIsTokuteiPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={`w-full justify-between text-left font-normal h-auto min-h-[44px] ${
                        isTokuteiFlight ? 'border-blue-300 bg-blue-50/50' : ''
                      }`}
                    >
                      <div className="flex-1">
                        <span className={isTokuteiFlight ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                          {tokuteiSummary}
                        </span>
                        {isTokuteiFlight && (
                          <div className="mt-1 text-xs text-blue-600">
                            {selectedTokuteiLabels.length}項目選択中
                          </div>
                        )}
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${isTokuteiPopoverOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="p-0 w-[340px] md:w-[400px]">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                      <div>
                        <div className="text-sm font-semibold text-blue-900">特定飛行の選択</div>
                        <div className="text-xs text-blue-600 mt-0.5">
                          {selectedTokuteiLabels.length > 0 
                            ? `${selectedTokuteiLabels.length}項目選択中` 
                            : '該当項目を選択してください'}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {selectedTokuteiLabels.length > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setFormData(prev => ({ ...prev, tokuteiFlightCategories: [] }))}
                            className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <XIcon className="h-3 w-3 mr-1" />
                            クリア
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsTokuteiPopoverOpen(false)}
                          className="h-7 text-xs"
                        >
                          閉じる
                        </Button>
                      </div>
                    </div>
                    
                    {/* Options grouped by category */}
                    <div className="max-h-[400px] overflow-y-auto">
                      {Object.entries(
                        TOKUTEI_FLIGHT_OPTIONS.reduce((acc, option) => {
                          if (!acc[option.group]) acc[option.group] = [];
                          acc[option.group].push(option);
                          return acc;
                        }, {} as Record<string, typeof TOKUTEI_FLIGHT_OPTIONS[number][]>)
                      ).map(([group, options]) => (
                        <div key={group} className="border-b last:border-b-0">
                          <div className="px-4 py-2 bg-muted/30">
                            <span className="text-xs font-semibold text-gray-700">{group}</span>
                          </div>
                          <div className="py-1">
                            {options.map(option => {
                              const checked = formData.tokuteiFlightCategories.includes(option.value);
                              const Icon = option.icon;
                              return (
                                <button
                                  type="button"
                                  key={option.value}
                                  onClick={() => toggleTokuteiCategory(option.value)}
                                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-all hover:bg-blue-50 ${
                                    checked ? 'bg-blue-50/70 border-l-4 border-blue-500' : 'border-l-4 border-transparent'
                                  }`}
                                >
                                  <div className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-all ${
                                    checked 
                                      ? 'border-blue-600 bg-blue-600' 
                                      : 'border-gray-300 bg-white hover:border-blue-400'
                                  }`}>
                                    {checked && (
                                      <CheckCircle2 className="h-4 w-4 text-white" strokeWidth={3} />
                                    )}
                                  </div>
                                  <Icon className={`h-4 w-4 flex-shrink-0 ${checked ? 'text-blue-600' : 'text-gray-400'}`} />
                                  <span className={`text-sm flex-1 ${checked ? 'text-blue-900 font-medium' : 'text-gray-700'}`}>
                                    {option.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <p className="text-sm text-muted-foreground md:text-xs">
                  ※ 該当する飛行方法を選択してください。複数選択可能です。
                </p>
                
                {/* Selected badges */}
                {isTokuteiFlight && (
                  <div className="flex flex-wrap gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    {TOKUTEI_FLIGHT_OPTIONS
                      .filter(option => formData.tokuteiFlightCategories.includes(option.value))
                      .map(option => {
                        const Icon = option.icon;
                        return (
                          <Badge 
                            key={option.value} 
                            className="text-xs py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
                          >
                            <Icon className="h-3 w-3" />
                            {option.label}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTokuteiCategory(option.value);
                              }}
                              className="ml-1 hover:bg-blue-500 rounded-full p-0.5"
                            >
                              <XIcon className="h-2.5 w-2.5" />
                            </button>
                          </Badge>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* 🆕 飛行計画の通報（特定飛行時のみ表示） */}
              {isTokuteiFlight && (
                <div className="pl-4 md:pl-9 space-y-3 md:space-y-2 border-l-2 border-blue-200 ml-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="flightPlanNotified"
                      checked={formData.flightPlanNotified}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev, flightPlanNotified: checked as boolean }))
                      }
                    />
                    <Label htmlFor="flightPlanNotified" className="cursor-pointer">
                      飛行計画の通報を実施
                    </Label>
                  </div>
                  <p className="text-sm text-blue-600 md:text-xs">
                    ✓ 特定飛行を行う場合は、飛行計画の通報が推奨されます
                  </p>
                </div>
              )}
            </div>

            <Button 
              onClick={handleNextStep} 
              className="w-full text-base md:text-sm"
              size="lg"
              disabled={!formData.date || !formData.location || !formData.pilot || !formData.droneModel}
            >
              飛行前点検へ進む
            </Button>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6 md:space-y-4">
            <div className="text-center py-4 md:py-2">
              <h3 className="text-xl font-medium mb-2 md:text-lg">飛行前点検</h3>
              <p className="text-base text-muted-foreground md:text-sm">
                {!isChecklistVisible 
                  ? '安全な飛行のため、点検を開始してください' 
                  : '以下の項目を確認してください'
                }
              </p>
            </div>

            {!isChecklistVisible ? (
              /* Initial state - Show only the main check button */
              <div className="flex flex-col items-center space-y-6 py-12">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-10 w-10 text-blue-600" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">飛行前点検を開始</h4>
                    <p className="text-sm text-gray-600 max-w-sm">
                      安全な飛行のために必要な点検項目をまとめて確認できます
                    </p>
                  </div>
                </div>
                
                <Button
                  type="button"
                  onClick={handleCheckAllItems}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-base md:text-sm md:py-3"
                  size="lg"
                >
                  <CheckCircle2 className="h-6 w-6 mr-2 md:h-5 md:w-5" />
                  全て確認
                </Button>
              </div>
            ) : (
              /* Checklist visible state */
              <div className="space-y-4">
                {/* Quick Action Buttons */}
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCheckAllItems}
                      className="flex items-center gap-2 text-xs"
                    >
                      {allChecklistCompleted ? (
                        <>
                          <RotateCcw className="h-3 w-3" />
                          全解除
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3 w-3" />
                          全てチェック
                        </>
                      )}
                    </Button>
                    
                    <Button
                      type="button"
                      onClick={handleSetAllNormal}
                      size="sm"
                      className="flex items-center gap-2 text-xs bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      無異常
                    </Button>
                  </div>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsChecklistVisible(false)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    項目を非表示
                  </Button>
                </div>

                {/* Progress indicator */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-900">点検進捗</span>
                    <span className="text-sm text-blue-700">
                      {Object.values(checklist).filter(v => v?.checked).length} / {checklistItems.length} 完了
                    </span>
                  </div>
                  <div className="w-full bg-blue-100 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${(Object.values(checklist).filter(v => v?.checked).length / checklistItems.length) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>

                {/* Checklist Items */}
                <div className="space-y-3">
                  {checklistItems.map((item) => {
                    const itemData = checklist[item.id] || { checked: true, status: null };
                    const bgColor = itemData.status === 'normal' ? 'bg-green-50 border-green-200' :
                                    itemData.status === 'fault' ? 'bg-red-50 border-red-200' :
                                    itemData.status === 'not_applicable' ? 'bg-gray-100 border-gray-300' :
                                    'bg-white border-gray-200';
                    
                    return (
                      <div key={item.id} className={`p-4 rounded-lg border transition-all ${bgColor}`}>
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={itemData.checked}
                            onChange={(e) => handleChecklistChange(item.id, e.target.checked)}
                            className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-5 h-5 flex-shrink-0"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-sm mb-1">{item.title}</div>
                            <div className="text-xs text-gray-600 mb-2">{item.description}</div>
                            
                            {itemData.checked && (
                              <div className="flex gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(item.id, 'normal')}
                                  className={`px-3 py-1 text-xs rounded-md transition-all ${
                                    itemData.status === 'normal'
                                      ? 'bg-green-500 text-white shadow-sm'
                                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                  }`}
                                >
                                  異常なし
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(item.id, 'fault')}
                                  className={`px-3 py-1 text-xs rounded-md transition-all ${
                                    itemData.status === 'fault'
                                      ? 'bg-red-500 text-white shadow-sm'
                                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                  }`}
                                >
                                  不具合
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(item.id, 'not_applicable')}
                                  className={`px-3 py-1 text-xs rounded-md transition-all ${
                                    itemData.status === 'not_applicable'
                                      ? 'bg-gray-500 text-white shadow-sm'
                                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                  }`}
                                >
                                  非該当
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* 特記事項 - 独立した入力欄 */}
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <Label htmlFor="specialNotes" className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                    <span className="mr-2">📝</span>
                    特記事項（任意）
                  </Label>
                  <p className="text-xs text-gray-600 mb-3">
                    点検時に発見した事項や注意事項があれば記録してください
                  </p>
                  <Textarea
                    id="specialNotes"
                    placeholder="例：バッテリーの膨張あり、プロペラに軽微な傷、風が強いため注意..."
                    value={specialNotesValue}
                    onChange={(e) => setSpecialNotesValue(e.target.value)}
                    rows={3}
                    className="w-full resize-none bg-white"
                  />
                  {specialNotesValue && (
                    <div className="mt-2 text-xs text-green-600 flex items-center">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      記録されました（{specialNotesValue.length}文字）
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-3 md:space-y-2">
              <Label htmlFor="weather">天気</Label>
              <Select onValueChange={(value) => handleInputChange('weather', value)} value={formData.weather}>
                <SelectTrigger>
                  <SelectValue placeholder="天気を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="晴れ">☀️ 晴れ</SelectItem>
                  <SelectItem value="曇り">☁️ 曇り</SelectItem>
                  <SelectItem value="雨">🌧️ 雨</SelectItem>
                  <SelectItem value="雪">❄️ 雪</SelectItem>
                  <SelectItem value="霧">🌫️ 霧</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4 md:gap-3">
              <Button 
                variant="outline" 
                onClick={handlePrevStep}
                className="flex-1 text-base md:text-sm"
                size="lg"
              >
                戻る
              </Button>
              <Button 
                onClick={handleNextStepWithFaultCheck} 
                className="flex-1 text-base md:text-sm"
                size="lg"
                disabled={!formData.weather}
              >
                点検完了
              </Button>
            </div>
          </div>
        )}

        {/* Add Pilot Dialog */}
        {onAddPilot && (
          <Dialog open={isAddPilotDialogOpen} onOpenChange={setIsAddPilotDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>追加操縦者</DialogTitle>
                <DialogDescription>
                  新しい操縦者を追加します。名前のみで追加できます。
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-pilot-name">操縦者名 *</Label>
                  <Input
                    id="new-pilot-name"
                    placeholder="山田太郎"
                    value={newPilotName}
                    onChange={(e) => setNewPilotName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddPilotDialogOpen(false);
                    setNewPilotName('');
                  }}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={() => {
                    if (newPilotName.trim()) {
                      onAddPilot({
                        name: newPilotName.trim(),
                        initialFlightHours: 0,
                        totalFlightHours: 0,
                        isActive: true
                      });
                      setFormData(prev => ({ ...prev, pilot: newPilotName.trim() }));
                      setIsAddPilotDialogOpen(false);
                      setNewPilotName('');
                    }
                  }}
                  disabled={!newPilotName.trim()}
                >
                  追加
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Add UAV Dialog */}
        {onAddUAV && (
          <Dialog open={isAddUAVDialogOpen} onOpenChange={setIsAddUAVDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>追加機体</DialogTitle>
                <DialogDescription>
                  新しい機体を追加します。
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-uav-nickname">ニックネーム *</Label>
                  <Input
                    id="new-uav-nickname"
                    placeholder="例: メインドローン"
                    value={newUAVData.nickname}
                    onChange={(e) => setNewUAVData(prev => ({ ...prev, nickname: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-uav-manufacturer">メーカー *</Label>
                  <Input
                    id="new-uav-manufacturer"
                    placeholder="例: DJI"
                    value={newUAVData.manufacturer}
                    onChange={(e) => setNewUAVData(prev => ({ ...prev, manufacturer: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-uav-model">機種 *</Label>
                  <Input
                    id="new-uav-model"
                    placeholder="例: Mavic 3"
                    value={newUAVData.model}
                    onChange={(e) => setNewUAVData(prev => ({ ...prev, model: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddUAVDialogOpen(false);
                    setNewUAVData({ nickname: '', manufacturer: '', model: '' });
                  }}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={() => {
                    if (newUAVData.nickname.trim() && newUAVData.manufacturer.trim() && newUAVData.model.trim()) {
                      onAddUAV({
                        nickname: newUAVData.nickname.trim(),
                        manufacturer: newUAVData.manufacturer.trim(),
                        model: newUAVData.model.trim(),
                        category: 'uncertified',
                        totalFlightHours: 0,
                        hoursSinceLastMaintenance: 0,
                        isActive: true
                      });
                      const displayName = `${newUAVData.nickname.trim()} (${newUAVData.manufacturer.trim()} ${newUAVData.model.trim()})`;
                      setFormData(prev => ({ ...prev, droneModel: displayName }));
                      setIsAddUAVDialogOpen(false);
                      setNewUAVData({ nickname: '', manufacturer: '', model: '' });
                    }
                  }}
                  disabled={!newUAVData.nickname.trim() || !newUAVData.manufacturer.trim() || !newUAVData.model.trim()}
                >
                  追加
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {currentStep === 3 && (
          <div className="space-y-6 md:space-y-4">
            <div className="text-center py-4 md:py-2">
              <h3 className="text-xl font-medium mb-2 md:text-lg">飛行詳細記録</h3>
              <p className="text-base text-muted-foreground md:text-sm">
                {flightStatus === 'ready' && '準備完了後、飛行を開始してください'}
                {flightStatus === 'started' && '飛行中です。終了時にボタンを押してください'}
                {flightStatus === 'finished' && '飛行が完了しました。詳細情報を入力してください'}
              </p>
            </div>

            {/* Flight Timer Control */}
            <div className="flex flex-col items-center space-y-6 py-8">
              {/* Status Indicator */}
              <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                flightStatus === 'ready' ? 'bg-blue-100 text-blue-800' :
                flightStatus === 'started' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {flightStatus === 'ready' && '📱 準備完了'}
                {flightStatus === 'started' && '🚁 飛行中'}
                {flightStatus === 'finished' && '✅ 完了'}
              </div>

              {/* Timer Display */}
              {flightStatus === 'started' && (
                <div className="text-center">
                  <div className="text-4xl font-mono font-bold text-green-600 mb-2">
                    {formatElapsedTime(elapsedTime)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    開始時刻: {startTime?.toLocaleTimeString('ja-JP')}
                  </div>
                </div>
              )}

              {flightStatus === 'finished' && startTime && endTime && (
                <div className="text-center space-y-2">
                  <div className="text-2xl font-bold text-gray-900">
                    飛行時間: {Math.max(1, Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60)))}分
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {startTime.toLocaleTimeString('ja-JP')} ～ {endTime.toLocaleTimeString('ja-JP')}
                  </div>
                </div>
              )}

              {/* Main Control Button */}
              <div className="relative">
                {flightStatus === 'ready' && (
                  <Button
                    type="button"
                    onClick={handleStartFlight}
                    className="w-40 h-40 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 md:w-32 md:h-32"
                  >
                    <div className="flex flex-col items-center">
                      <Play className="h-12 w-12 mb-3 md:h-8 md:w-8 md:mb-2" />
                      <span className="text-lg font-medium md:text-sm">開始</span>
                    </div>
                  </Button>
                )}

                {flightStatus === 'started' && (
                  <AlertDialog open={isConfirmEndOpen} onOpenChange={setIsConfirmEndOpen}>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        className="w-40 h-40 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 md:w-32 md:h-32"
                      >
                        <div className="flex flex-col items-center">
                          <Square className="h-12 w-12 mb-3 md:h-8 md:w-8 md:mb-2" />
                          <span className="text-lg font-medium md:text-sm">終了</span>
                        </div>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>飛行を終了しますか？</AlertDialogTitle>
                        <AlertDialogDescription>
                          飛行を終了すると、飛行時間が自動的に記録されます。
                          本当に飛行を終了してもよろしいですか？
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>キャンセル</AlertDialogCancel>
                        <AlertDialogAction onClick={handleEndFlight} className="bg-red-500 hover:bg-red-600">
                          飛行終了
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {flightStatus === 'finished' && (
                  <div className="w-40 h-40 rounded-full bg-gray-100 border-2 border-gray-300 flex items-center justify-center md:w-32 md:h-32">
                    <div className="flex flex-col items-center text-gray-600">
                      <CheckCircle2 className="h-12 w-12 mb-3 md:h-8 md:w-8 md:mb-2" />
                      <span className="text-lg font-medium md:text-sm">完了</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Flight Details Form - Only show after flight is finished */}
            {flightStatus === 'finished' && (
              <form onSubmit={handleSubmit} className="space-y-6 pt-6 border-t md:space-y-4">
                <div className="space-y-3 md:space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="duration">飛行時間（分）</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsDurationEditable(!isDurationEditable)}
                      className="h-8 text-xs"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      {isDurationEditable ? '確定' : '修正'}
                    </Button>
                  </div>
                  <Input
                    id="duration"
                    type="number"
                    placeholder="30"
                    value={formData.duration}
                    onChange={(e) => handleInputChange('duration', e.target.value)}
                    className={isDurationEditable ? "bg-white" : "bg-gray-50"}
                    readOnly={!isDurationEditable}
                  />
                  <p className="text-sm text-muted-foreground md:text-xs">
                    {isDurationEditable ? '※ 手動で修正できます' : '※ 自動入力済み'}
                  </p>
                </div>

                <div className="space-y-3 md:space-y-2">
                  <Label htmlFor="purpose">飛行目的 *</Label>
                  <Select onValueChange={(value) => handleInputChange('purpose', value)} value={formData.purpose}>
                    <SelectTrigger className={!formData.purpose ? 'border-amber-300' : ''}>
                      <SelectValue placeholder="飛行目的を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="趣味・娯楽">趣味・娯楽</SelectItem>
                      <SelectItem value="練習・訓練">練習・訓練</SelectItem>
                      <SelectItem value="撮影・映像制作">撮影・映像制作</SelectItem>
                      <SelectItem value="点検・調査">点検・調査</SelectItem>
                      <SelectItem value="測量">測量</SelectItem>
                      <SelectItem value="その他">その他</SelectItem>
                    </SelectContent>
                  </Select>
                  {!formData.purpose && (
                    <p className="text-sm text-amber-600 md:text-xs">※ 飛行目的を選択してください</p>
                  )}
                </div>

                <div className="space-y-3 md:space-y-2">
                  <Label htmlFor="notes">飛行の安全に影響のあった事項</Label>
                  <Textarea
                    id="notes"
                    placeholder="例: 強風により一時ホバリング、電波干渉あり、バードストライク等..."
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={4}
                    className="md:rows-3"
                  />
                  <p className="text-sm text-muted-foreground md:text-xs">
                    ※ 特になければ空欄で構いません
                  </p>
                </div>

                <Separator className="my-6 md:my-4" />

                {/* 🆕 離着陸時刻 */}
                <div className="grid grid-cols-2 gap-6 md:gap-4">
                  <div className="space-y-3 md:space-y-2">
                    <Label htmlFor="takeoffTime">離陸時刻 *</Label>
                    <Input
                      id="takeoffTime"
                      type="time"
                      value={formData.takeoffTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, takeoffTime: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-3 md:space-y-2">
                    <Label htmlFor="landingTime">着陸時刻 *</Label>
                    <Input
                      id="landingTime"
                      type="time"
                      value={formData.landingTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, landingTime: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                {/* 🆕 飛行時間の自動表示 */}
                {formData.flightTimeMinutes > 0 && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-sm text-blue-600 font-medium">飛行時間（自動計算）</p>
                    <p className="text-lg text-blue-800 font-bold mt-1">
                      {formData.flightTimeMinutes}分 
                      ({Math.floor(formData.flightTimeMinutes / 60)}時間{formData.flightTimeMinutes % 60}分)
                    </p>
                  </div>
                )}

                <Separator className="my-6 md:my-4" />

                {/* 🆕 不具合情報セクション */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-4 md:p-3">
                  <h4 className="font-medium text-amber-900">不具合が発生した場合のみ記入</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-3">
                    <div className="space-y-3 md:space-y-2">
                      <Label htmlFor="faultDate">不具合発生日</Label>
                      <DatePicker
                        value={formData.faultDate}
                        onChange={(date) => setFormData(prev => ({ ...prev, faultDate: date }))}
                        placeholder="日付を選択"
                      />
                    </div>
                    
                    <div className="space-y-3 md:space-y-2">
                      <Label htmlFor="fixDate">処置実施日</Label>
                      <DatePicker
                        value={formData.fixDate}
                        onChange={(date) => setFormData(prev => ({ ...prev, fixDate: date }))}
                        placeholder="日付を選択"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 md:space-y-2">
                    <Label htmlFor="faultDetail">不具合事項</Label>
                    <Textarea
                      id="faultDetail"
                      value={formData.faultDetail}
                      onChange={(e) => setFormData(prev => ({ ...prev, faultDetail: e.target.value }))}
                      placeholder="不具合の内容を詳しく記載"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-3 md:space-y-2">
                    <Label htmlFor="fixDetail">処置内容</Label>
                    <Textarea
                      id="fixDetail"
                      value={formData.fixDetail}
                      onChange={(e) => setFormData(prev => ({ ...prev, fixDetail: e.target.value }))}
                      placeholder="実施した処置を記載"
                      rows={3}
                    />
                  </div>

                  {pilots.filter(p => p.isActive).length > 0 && (
                    <div className="space-y-3 md:space-y-2">
                      <Label htmlFor="confirmerId">確認者</Label>
                      <Select 
                        value={formData.confirmerId} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, confirmerId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="確認者を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          {pilots.filter(p => p.isActive).map((pilot) => (
                            <SelectItem key={pilot.id} value={pilot.id}>
                              {pilot.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {(!formData.duration || !formData.purpose) && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-800 md:text-xs flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        {!formData.duration && !formData.purpose && '飛行時間と飛行目的を入力してください'}
                        {formData.duration && !formData.purpose && '飛行目的を選択してください'}
                        {!formData.duration && formData.purpose && '飛行時間を入力してください'}
                      </p>
                    </div>
                  )}
                  <div className="flex gap-4 md:gap-3">
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={handlePrevStep}
                      className="flex-1 text-base md:text-sm"
                      size="lg"
                    >
                      戻る
                    </Button>
                    <Button 
                      type="submit"
                      className="flex-1 text-base md:text-sm"
                      size="lg"
                      disabled={!formData.duration || !formData.purpose}
                    >
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      フライト記録を保存
                    </Button>
                  </div>
                </div>
              </form>
            )}

            {/* Navigation for non-finished states */}
            {flightStatus !== 'finished' && (
              <div className="flex gap-4 md:gap-3">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={handlePrevStep}
                  className="flex-1 text-base md:text-sm"
                  size="lg"
                >
                  戻る
                </Button>
                <Button 
                  type="button"
                  className="flex-1 text-base md:text-sm"
                  size="lg"
                  disabled
                >
                  飛行を完了してください
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* 🚨 赤坂エリア警察署連絡リマインダーDialog */}
      <Dialog open={isAkasakaReminderOpen} onOpenChange={setIsAkasakaReminderOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              赤坂エリアでの飛行について
            </DialogTitle>
            <DialogDescription className="text-base">
              重要な連絡事項があります
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
              <p className="text-sm font-medium text-amber-900 mb-3">
                16日に飛行をする際に以下の手順で警察へのお電話をお願いします。
              </p>
              
              <div className="space-y-4">
                {/* 飛行前 */}
                <div className="bg-white rounded-lg p-3 border border-amber-200">
                  <div className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                    <span className="bg-amber-500 text-white text-xs px-2 py-1 rounded">①</span>
                    飛行前
                  </div>
                  <div className="text-sm space-y-1 ml-6">
                    <p className="font-medium">赤坂警察署　警備係　吉富様</p>
                    <a 
                      href="tel:03-3475-0110" 
                      className="text-blue-600 font-bold text-lg hover:text-blue-800 flex items-center gap-2"
                    >
                      📞 03-3475-0110
                    </a>
                  </div>
                </div>

                {/* 飛行後 */}
                <div className="bg-white rounded-lg p-3 border border-amber-200">
                  <div className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                    <span className="bg-amber-500 text-white text-xs px-2 py-1 rounded">②</span>
                    飛行後
                  </div>
                  <div className="text-sm space-y-1 ml-6">
                    <p className="font-medium">赤坂警察署　警備係　吉富様</p>
                    <a 
                      href="tel:03-3475-0110" 
                      className="text-blue-600 font-bold text-lg hover:text-blue-800 flex items-center gap-2"
                    >
                      📞 03-3475-0110
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* 注意事項 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-900 leading-relaxed">
                ※担当者がいない場合も、警備係に電話をすれば内容分かるようにしていただいています。
              </p>
              <p className="text-xs text-blue-900 leading-relaxed mt-2">
                万が一のトラブルや飛行が中断もしくは日付変更の際も電話くださいとのことです。
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsAkasakaReminderOpen(false)} className="w-full">
              確認しました
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}