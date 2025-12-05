import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { DatePicker } from './ui/date-picker';
import { Calendar, Clock, MapPin, User, Plane, Target, FileText, ShieldCheck, Edit, Save, X, ChevronDown } from 'lucide-react';

interface FlightLog {
  id: string;
  date: string;
  duration: number;
  location: string;
  droneModel: string;
  weather: string;
  purpose: string;
  notes: string;
  pilot: string;
  isTokuteiFlight?: boolean;
  takeoffTime?: string; // 離陸時刻 HH:mm
  landingTime?: string; // 着陸時刻 HH:mm
  outline?: string; // 飛行概要
  tokuteiFlightCategories?: string[]; // 特定飛行カテゴリ
  flightPlanNotified?: boolean; // 飛行計画の通報
}

interface Pilot {
  id: string;
  name: string;
  isActive: boolean;
}

interface UAV {
  id: string;
  nickname: string;
  manufacturer: string;
  model: string;
  isActive: boolean;
}

interface FlightDetailModalProps {
  flight: FlightLog | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (id: string, updates: Partial<FlightLog>) => void;
  pilots?: Pilot[];
  uavs?: UAV[];
}

export function FlightDetailModal({ flight, isOpen, onClose, onUpdate, pilots = [], uavs = [] }: FlightDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<FlightLog>>({});

  // Reset edit state when flight changes or modal closes
  useEffect(() => {
    if (flight) {
      setEditData({
        date: flight.date,
        duration: flight.duration,
        location: flight.location,
        droneModel: flight.droneModel,
        pilot: flight.pilot,
        weather: flight.weather,
        purpose: flight.purpose,
        notes: flight.notes,
        takeoffTime: flight.takeoffTime || '',
        landingTime: flight.landingTime || '',
        outline: flight.outline || '',
      });
    }
    setIsEditing(false);
  }, [flight, isOpen]);

  // 🆕 離陸時刻と着陸時刻から飛行時間を自動計算
  useEffect(() => {
    if (isEditing && editData.takeoffTime && editData.landingTime) {
      try {
        const takeoff = new Date(`2000-01-01T${editData.takeoffTime}:00`);
        const landing = new Date(`2000-01-01T${editData.landingTime}:00`);
        let diffMs = landing.getTime() - takeoff.getTime();
        
        // 日をまたぐ場合
        if (diffMs < 0) {
          const landing2 = new Date(`2000-01-02T${editData.landingTime}:00`);
          diffMs = landing2.getTime() - takeoff.getTime();
        }
        
        const diffMinutes = Math.round(diffMs / 60000);
        if (diffMinutes > 0 && diffMinutes !== editData.duration) {
          setEditData(prev => ({ ...prev, duration: diffMinutes }));
        }
      } catch (error) {
        console.error('飛行時間の計算エラー:', error);
      }
    }
  }, [isEditing, editData.takeoffTime, editData.landingTime]);

  if (!flight) return null;

  const getWeatherEmoji = (weather: string) => {
    switch (weather) {
      case '晴れ': return '☀️';
      case '曇り': return '☁️';
      case '雨': return '🌧️';
      case '雪': return '❄️';
      case '霧': return '🌫️';
      default: return '🌤️';
    }
  };

  const getPurposeBadgeColor = (purpose: string) => {
    switch (purpose) {
      case '趣味・娯楽': return 'bg-blue-100 text-blue-800';
      case '練習・訓練': return 'bg-green-100 text-green-800';
      case '撮影・映像制作': return 'bg-indigo-100 text-indigo-800';
      case '点検・調査': return 'bg-orange-100 text-orange-800';
      case '測量': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSave = () => {
    if (onUpdate && flight) {
      onUpdate(flight.id, editData);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditData({
      date: flight.date,
      duration: flight.duration,
      location: flight.location,
      droneModel: flight.droneModel,
      pilot: flight.pilot,
      weather: flight.weather,
      purpose: flight.purpose,
      notes: flight.notes,
      takeoffTime: flight.takeoffTime || '',
      landingTime: flight.landingTime || '',
      outline: flight.outline || '',
    });
    setIsEditing(false);
  };

  // 格式化日期显示
  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return `${year}年${month}月${day}日`;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="h-[90vh] sm:h-[85vh] rounded-t-2xl px-0 pb-0"
      >
        {/* 拖拽指示器 */}
        <div className="flex justify-center py-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        <SheetHeader className="px-4 pb-3 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <Plane className="h-5 w-5 text-blue-600" />
              {isEditing ? '記録を編集' : 'フライト詳細'}
            </SheetTitle>
            {onUpdate && !isEditing && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="gap-1.5 bg-blue-600 hover:bg-blue-700"
              >
                <Edit className="h-4 w-4" />
                編集
              </Button>
            )}
          </div>
          <SheetDescription className="text-xs">
            {isEditing ? '下記の情報を編集して保存できます' : formatDate(flight.date)}
            {!isEditing && flight.takeoffTime && ` ${flight.takeoffTime}`}
            {!isEditing && flight.landingTime && ` 〜 ${flight.landingTime}`}
          </SheetDescription>
        </SheetHeader>

        {/* スクロールエリア */}
        <div className="flex-1 overflow-y-auto px-4 py-4" style={{ height: 'calc(100% - 140px)' }}>
          <div className="space-y-5">
            
            {/* === 編集モード === */}
            {isEditing ? (
              <div className="space-y-5">
                {/* 日付 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">飛行日</Label>
                  <DatePicker
                    value={editData.date ? new Date(editData.date) : new Date(flight.date)}
                    onChange={(date) => {
                      if (date) {
                        setEditData(prev => ({ ...prev, date: date.toISOString().split('T')[0] }));
                      }
                    }}
                    placeholder="日付を選択"
                    className="w-full h-12"
                  />
                </div>

                {/* 離着陸時刻 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-green-600" />
                      離陸時刻
                    </Label>
                    <Input
                      type="time"
                      value={editData.takeoffTime || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, takeoffTime: e.target.value }))}
                      className="h-12 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-red-600" />
                      着陸時刻
                    </Label>
                    <Input
                      type="time"
                      value={editData.landingTime || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, landingTime: e.target.value }))}
                      className="h-12 text-base"
                    />
                  </div>
                </div>

                {/* 飛行時間（自動計算） */}
                {editData.duration && editData.duration > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-blue-700">飛行時間（自動計算）</span>
                      <span className="text-lg font-bold text-blue-800">{editData.duration}分</span>
                    </div>
                  </div>
                )}

                {/* 場所 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    飛行場所
                  </Label>
                  <Input
                    type="text"
                    value={editData.location || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, location: e.target.value }))}
                    className="h-12 text-base"
                    placeholder="飛行場所を入力"
                  />
                </div>

                {/* 操縦者 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <User className="h-4 w-4 text-gray-500" />
                    操縦者
                  </Label>
                  {pilots.filter(p => p.isActive).length > 0 ? (
                    <Select 
                      value={editData.pilot || flight.pilot} 
                      onValueChange={(value) => setEditData(prev => ({ ...prev, pilot: value }))}
                    >
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {pilots.filter(p => p.isActive).map((pilot) => (
                          <SelectItem key={pilot.id} value={pilot.name} className="py-3">
                            {pilot.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type="text"
                      value={editData.pilot || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, pilot: e.target.value }))}
                      className="h-12 text-base"
                      placeholder="操縦者名"
                    />
                  )}
                </div>

                {/* 機体 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <Plane className="h-4 w-4 text-gray-500" />
                    使用機体
                  </Label>
                  {uavs.filter(u => u.isActive).length > 0 ? (
                    <Select 
                      value={editData.droneModel || flight.droneModel} 
                      onValueChange={(value) => setEditData(prev => ({ ...prev, droneModel: value }))}
                    >
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {uavs.filter(u => u.isActive).map((uav) => {
                          const displayName = `${uav.nickname} (${uav.manufacturer} ${uav.model})`;
                          return (
                            <SelectItem key={uav.id} value={displayName} className="py-3">
                              {displayName}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type="text"
                      value={editData.droneModel || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, droneModel: e.target.value }))}
                      className="h-12 text-base"
                      placeholder="機種名"
                    />
                  )}
                </div>

                {/* 天気・目的 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">天気</Label>
                    <Select 
                      value={editData.weather || flight.weather} 
                      onValueChange={(value) => setEditData(prev => ({ ...prev, weather: value }))}
                    >
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="晴れ" className="py-3">☀️ 晴れ</SelectItem>
                        <SelectItem value="曇り" className="py-3">☁️ 曇り</SelectItem>
                        <SelectItem value="雨" className="py-3">🌧️ 雨</SelectItem>
                        <SelectItem value="雪" className="py-3">❄️ 雪</SelectItem>
                        <SelectItem value="霧" className="py-3">🌫️ 霧</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">飛行目的</Label>
                    <Select 
                      value={editData.purpose || flight.purpose} 
                      onValueChange={(value) => setEditData(prev => ({ ...prev, purpose: value }))}
                    >
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="空撮・撮影" className="py-3">空撮・撮影</SelectItem>
                        <SelectItem value="測量・調査" className="py-3">測量・調査</SelectItem>
                        <SelectItem value="インフラ点検" className="py-3">インフラ点検</SelectItem>
                        <SelectItem value="訓練・練習" className="py-3">訓練・練習</SelectItem>
                        <SelectItem value="趣味・娯楽" className="py-3">趣味・娯楽</SelectItem>
                        <SelectItem value="その他" className="py-3">その他</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 飛行概要 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">飛行概要</Label>
                  <Textarea
                    value={editData.outline || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, outline: e.target.value }))}
                    placeholder="飛行の概要を入力"
                    rows={2}
                    className="text-base resize-none"
                  />
                </div>

                {/* 備考 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">安全に影響のあった事項</Label>
                  <Textarea
                    value={editData.notes || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="特になければ空欄"
                    rows={3}
                    className="text-base resize-none"
                  />
                </div>
              </div>
            ) : (
              /* === 閲覧モード === */
              <div className="space-y-4">
                {/* サマリーカード */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-blue-600 font-medium">飛行時間</p>
                      <p className="text-2xl font-bold text-blue-900">{flight.duration}分</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-blue-600 font-medium">天気</p>
                      <p className="text-2xl">{getWeatherEmoji(flight.weather)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <Clock className="h-4 w-4" />
                    <span>{flight.takeoffTime || '--:--'}</span>
                    <span>→</span>
                    <span>{flight.landingTime || '--:--'}</span>
                  </div>
                </div>

                {/* 詳細情報リスト */}
                <div className="bg-white rounded-xl border divide-y">
                  {/* 場所 */}
                  <div className="flex items-center gap-3 p-3.5">
                    <div className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-4 w-4 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">飛行場所</p>
                      <p className="font-medium text-gray-900 truncate">{flight.location}</p>
                    </div>
                  </div>

                  {/* 操縦者 */}
                  <div className="flex items-center gap-3 p-3.5">
                    <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">操縦者</p>
                      <p className="font-medium text-gray-900">{flight.pilot}</p>
                    </div>
                  </div>

                  {/* 機体 */}
                  <div className="flex items-center gap-3 p-3.5">
                    <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Plane className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">使用機体</p>
                      <p className="font-medium text-gray-900 truncate">{flight.droneModel}</p>
                    </div>
                  </div>

                  {/* 目的 */}
                  <div className="flex items-center gap-3 p-3.5">
                    <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Target className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">飛行目的</p>
                      <Badge className={`${getPurposeBadgeColor(flight.purpose)} mt-0.5`}>
                        {flight.purpose}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* 特定飛行 */}
                {flight.isTokuteiFlight && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">特定飛行</p>
                      <p className="text-xs text-blue-700">カテゴリーⅡ・Ⅲ該当</p>
                    </div>
                  </div>
                )}

                {/* 飛行概要 */}
                {flight.outline && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      飛行概要
                    </p>
                    <div className="bg-gray-50 rounded-xl p-3.5">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{flight.outline}</p>
                    </div>
                  </div>
                )}

                {/* 備考 */}
                {flight.notes && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      安全に影響のあった事項
                    </p>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5">
                      <p className="text-sm text-amber-900 whitespace-pre-wrap">{flight.notes}</p>
                    </div>
                  </div>
                )}

                {/* フライトID */}
                <div className="text-center pt-2">
                  <p className="text-xs text-gray-400">
                    フライトID: <span className="font-mono">{flight.id.slice(0, 8)}</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 固定フッター（編集時のみ） */}
        {isEditing && (
          <div className="absolute bottom-0 left-0 right-0 bg-white border-t px-4 py-3 flex gap-3 safe-area-inset-bottom">
            <Button 
              variant="outline" 
              onClick={handleCancel} 
              className="flex-1 h-12 text-base"
            >
              <X className="h-4 w-4 mr-2" />
              キャンセル
            </Button>
            <Button 
              onClick={handleSave} 
              className="flex-1 h-12 text-base bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2" />
              保存
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}