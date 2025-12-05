// 点検整備記録フォーム（様式3）
// 国土交通省ガイドライン準拠
// CSV字段: 点検整備ID, 作成年月日, 実施年月日, 点検整備総時間, 前回実施年月日,
//          実施者ID, 実施者名, ドローンID, ドローン名, ドローン登録記号,
//          実施場所ID, 実施場所名, 実施場所地番, 備考, 実施理由,
//          点検整備内容(装備品等の交換), 点検整備内容(定期点検の実施),
//          点検整備内容(装置等の取付け・取卸し記録), 点検整備内容(その他点検整備等)

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { DatePicker } from './ui/date-picker';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import { Wrench, Info, CheckCircle2 } from 'lucide-react';
import type { CreateMaintenanceRecordDTO } from '../types';

interface MaintenanceRecordFormProps {
  onSubmit: (data: CreateMaintenanceRecordDTO) => void;
  drones?: Array<{ 
    id: string; 
    name: string; 
    registrationMark: string;
    totalFlightHours: number;
  }>;
  operators?: Array<{ id: string; name: string }>;
  locations?: Array<{ id: string; name: string; address?: string }>;
}

// 実施理由の選択肢
const maintenanceReasons = [
  '定期点検',
  '100時間点検',
  '不具合対応',
  '部品交換',
  'プロペラ交換',
  'バッテリー交換',
  'モーター交換',
  'ファームウェア更新',
  '機体認証更新',
  '改造・カスタマイズ',
  'その他',
];

// 作業内容のテンプレート
const workTemplates = [
  {
    name: '定期点検（標準）',
    content: `【外観点検】
- 機体全般の損傷・汚れ確認
- プロペラの損傷・固定状態確認
- フレームのクラック・変形確認

【機能点検】
- 通信系統の動作確認
- 推進系統（モーター）の動作確認
- 電源系統の動作確認
- 自動制御系統の動作確認
- 操縦装置の動作確認

【消耗品確認】
- バッテリー状態確認
- プロペラ摩耗確認

【総合判定】
- 異常なし、飛行可能`,
  },
  {
    name: 'プロペラ交換',
    content: `【作業内容】
- 既存プロペラの取り外し
- 新品プロペラの取り付け
- 固定ナットのトルク確認
- 回転バランス確認
- 動作確認飛行

【使用部品】
- プロペラ型番: 
- 交換本数: 4本

【確認事項】
- 正常に動作することを確認`,
  },
  {
    name: 'バッテリー交換',
    content: `【作業内容】
- 旧バッテリーの取り外し
- 新バッテリーの取り付け
- 充電状態の確認
- 電圧・温度の確認
- 飛行テスト

【使用部品】
- バッテリー型番: 
- シリアル番号: 

【確認事項】
- 正常に充電・放電できることを確認`,
  },
];

export function MaintenanceRecordForm({
  onSubmit,
  drones = [],
  operators = [],
  locations = [],
}: MaintenanceRecordFormProps) {
  const [formData, setFormData] = useState({
    // 基本情報
    droneId: '',
    droneName: '',
    droneRegistrationMark: '',
    executionDate: new Date(),
    previousExecutionDate: null as Date | null,
    totalFlightTimeAtMoment: '',
    
    // 実施者情報
    executorId: '',
    executorName: '',
    
    // 実施場所情報
    executionPlaceId: '',
    executionPlaceName: '',
    executionPlaceAddress: '',
    
    // 備考・理由
    reason: '',
    remarks: '',
    
    // 点検整備内容（4つのカテゴリ）
    contentEquipmentReplacement: '',   // 装備品等の交換
    contentRegularInspection: '',      // 定期点検の実施
    contentInstallationRemoval: '',    // 装置等の取付け・取卸し記録
    contentOther: '',                  // その他点検整備等
    
    // 後方互換性
    workContent: '',
    nextDueNote: '',
  });

  const [selectedDrone, setSelectedDrone] = useState<any>(null);
  const [selectedOperator, setSelectedOperator] = useState<any>(null);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [activeContentTab, setActiveContentTab] = useState<'equipment' | 'regular' | 'installation' | 'other'>('regular');

  const handleDroneChange = (droneId: string) => {
    const drone = drones.find((d) => d.id === droneId);
    setSelectedDrone(drone);
    setFormData((prev) => ({
      ...prev,
      droneId,
      droneName: drone?.name || '',
      droneRegistrationMark: drone?.registrationMark || '',
      totalFlightTimeAtMoment: drone ? `${Math.floor(drone.totalFlightHours)}時間${Math.round((drone.totalFlightHours % 1) * 60)}分` : '',
    }));
  };

  const handleOperatorChange = (operatorId: string) => {
    const operator = operators.find((o) => o.id === operatorId);
    setSelectedOperator(operator);
    setFormData((prev) => ({
      ...prev,
      executorId: operatorId,
      executorName: operator?.name || '',
    }));
  };

  const handleLocationChange = (locationId: string) => {
    const location = locations.find((l) => l.id === locationId);
    setSelectedLocation(location);
    setFormData((prev) => ({
      ...prev,
      executionPlaceId: locationId,
      executionPlaceName: location?.name || '',
      executionPlaceAddress: location?.address || '',
    }));
  };

  const handleTemplateSelect = (template: typeof workTemplates[0]) => {
    // テンプレートは「定期点検の実施」カテゴリに適用
    setFormData((prev) => ({
      ...prev,
      contentRegularInspection: template.content,
      workContent: template.content, // 後方互換性
    }));
    setActiveContentTab('regular');
    setShowTemplates(false);
  };

  // 点検整備内容を結合
  const getCombinedWorkContent = (): string => {
    const parts: string[] = [];
    if (formData.contentEquipmentReplacement) {
      parts.push(`【装備品等の交換】\n${formData.contentEquipmentReplacement}`);
    }
    if (formData.contentRegularInspection) {
      parts.push(`【定期点検の実施】\n${formData.contentRegularInspection}`);
    }
    if (formData.contentInstallationRemoval) {
      parts.push(`【装置等の取付け・取卸し記録】\n${formData.contentInstallationRemoval}`);
    }
    if (formData.contentOther) {
      parts.push(`【その他点検整備等】\n${formData.contentOther}`);
    }
    return parts.join('\n\n') || formData.workContent;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const dto: CreateMaintenanceRecordDTO = {
      // 基本情報
      executionDate: formData.executionDate,
      totalFlightTimeAtMoment: formData.totalFlightTimeAtMoment || undefined,
      previousExecutionDate: formData.previousExecutionDate || undefined,
      
      // 実施者情報
      executorId: formData.executorId,
      executorName: formData.executorName || undefined,
      
      // ドローン情報
      droneId: formData.droneId,
      droneName: formData.droneName || undefined,
      droneRegistrationMark: formData.droneRegistrationMark || undefined,
      
      // 実施場所情報
      executionPlaceId: formData.executionPlaceId || undefined,
      executionPlaceName: formData.executionPlaceName || undefined,
      executionPlaceAddress: formData.executionPlaceAddress || undefined,
      
      // 備考・理由
      remarks: formData.remarks || undefined,
      reason: formData.reason || undefined,
      
      // 点検整備内容（4つのカテゴリ）
      contentEquipmentReplacement: formData.contentEquipmentReplacement || undefined,
      contentRegularInspection: formData.contentRegularInspection || undefined,
      contentInstallationRemoval: formData.contentInstallationRemoval || undefined,
      contentOther: formData.contentOther || undefined,
      
      // 後方互換性
      workContent: getCombinedWorkContent() || undefined,
      nextDueNote: formData.nextDueNote || undefined,
    };

    onSubmit(dto);
  };

  // 有効な点検整備内容があるかチェック
  const hasValidContent = () => {
    return formData.contentEquipmentReplacement || 
           formData.contentRegularInspection || 
           formData.contentInstallationRemoval || 
           formData.contentOther ||
           formData.workContent;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Wrench className="h-6 w-6 text-amber-600" />
          点検整備記録（様式3）
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          定期点検・修理・改造及び整備の記録を作成してください
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8 md:space-y-6">
          {/* 基本情報セクション */}
          <div className="space-y-6 md:space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              📋 基本情報
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-4">
              {/* 機体選択 */}
              <div className="space-y-3 md:space-y-2">
                <Label htmlFor="droneId">無人航空機 *</Label>
                <Select value={formData.droneId} onValueChange={handleDroneChange}>
                  <SelectTrigger className="h-14 md:h-10">
                    <SelectValue placeholder="機体を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {drones.map((drone) => (
                      <SelectItem key={drone.id} value={drone.id}>
                        {drone.name} ({drone.registrationMark})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 実施日 */}
              <div className="space-y-3 md:space-y-2">
                <Label htmlFor="executionDate">実施年月日 *</Label>
                <DatePicker
                  value={formData.executionDate}
                  onChange={(date) => {
                    if (date) {
                      setFormData((prev) => ({ ...prev, executionDate: date }));
                    }
                  }}
                  placeholder="日付を選択"
                />
              </div>
            </div>

            {/* 機体情報表示 */}
            {selectedDrone && (
              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <div className="flex flex-col gap-1">
                    <p className="font-medium">
                      {selectedDrone.name} - {selectedDrone.registrationMark}
                    </p>
                    <p className="text-sm">
                      現在の総飛行時間: {selectedDrone.totalFlightHours.toFixed(1)}時間
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-4">
              {/* 総飛行時間 */}
              <div className="space-y-3 md:space-y-2">
                <Label htmlFor="totalFlightTime">
                  点検整備総時間（この時点での総飛行時間）
                </Label>
                <Input
                  id="totalFlightTime"
                  type="text"
                  value={formData.totalFlightTimeAtMoment}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      totalFlightTimeAtMoment: e.target.value,
                    }))
                  }
                  placeholder="例: 10時間30分"
                  className="h-14 md:h-10"
                />
                <p className="text-sm text-muted-foreground md:text-xs">
                  ※ 機体選択時に自動入力されます
                </p>
              </div>

              {/* 前回実施年月日 */}
              <div className="space-y-3 md:space-y-2">
                <Label htmlFor="previousExecutionDate">前回実施年月日</Label>
                <DatePicker
                  value={formData.previousExecutionDate || undefined}
                  onChange={(date) => {
                    setFormData((prev) => ({ ...prev, previousExecutionDate: date || null }));
                  }}
                  placeholder="前回の点検日（任意）"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-4">
              {/* 実施者 */}
              <div className="space-y-3 md:space-y-2">
                <Label htmlFor="executorId">実施者 *</Label>
                <Select
                  value={formData.executorId}
                  onValueChange={handleOperatorChange}
                >
                  <SelectTrigger className="h-14 md:h-10">
                    <SelectValue placeholder="実施者を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map((operator) => (
                      <SelectItem key={operator.id} value={operator.id}>
                        {operator.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.executorName && (
                  <p className="text-xs text-muted-foreground">
                    実施者名: {formData.executorName}
                  </p>
                )}
              </div>

              {/* 実施場所 */}
              <div className="space-y-3 md:space-y-2">
                <Label htmlFor="executionPlaceId">実施場所</Label>
                {locations.length > 0 ? (
                  <Select
                    value={formData.executionPlaceId}
                    onValueChange={handleLocationChange}
                  >
                    <SelectTrigger className="h-14 md:h-10">
                      <SelectValue placeholder="場所を選択（任意）" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="executionPlaceName"
                    type="text"
                    value={formData.executionPlaceName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        executionPlaceName: e.target.value,
                      }))
                    }
                    placeholder="実施場所名を入力"
                    className="h-14 md:h-10"
                  />
                )}
              </div>
            </div>

            {/* 実施場所地番（住所詳細） */}
            <div className="space-y-3 md:space-y-2">
              <Label htmlFor="executionPlaceAddress">実施場所地番（住所詳細）</Label>
              <Input
                id="executionPlaceAddress"
                type="text"
                value={formData.executionPlaceAddress}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    executionPlaceAddress: e.target.value,
                  }))
                }
                placeholder="例: 神奈川県川崎市久本1丁目"
                className="h-14 md:h-10"
              />
            </div>
          </div>

          <Separator />

          {/* 作業内容セクション */}
          <div className="space-y-6 md:space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                🔧 点検・整備内容
              </h3>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowTemplates(!showTemplates)}
                className="gap-2"
              >
                📝 テンプレート
              </Button>
            </div>

            {/* テンプレート選択 */}
            {showTemplates && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {workTemplates.map((template, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleTemplateSelect(template)}
                    className="p-4 border-2 rounded-xl hover:border-amber-500 hover:bg-amber-50 transition-all text-left"
                  >
                    <p className="font-medium text-sm">{template.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      クリックで内容を入力
                    </p>
                  </button>
                ))}
              </div>
            )}

            {/* 実施理由 */}
            <div className="space-y-3 md:space-y-2">
              <Label htmlFor="reason">実施理由</Label>
              <Select
                value={formData.reason}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, reason: value }))}
              >
                <SelectTrigger className="h-14 md:h-10">
                  <SelectValue placeholder="理由を選択（任意）" />
                </SelectTrigger>
                <SelectContent>
                  {maintenanceReasons.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 点検整備内容（4つのカテゴリタブ） */}
            <div className="space-y-3 md:space-y-2">
              <Label>点検、修理、改造及び整備の内容 *</Label>
              
              {/* タブ切り替え */}
              <div className="flex flex-wrap gap-2 mb-3">
                <Button
                  type="button"
                  variant={activeContentTab === 'equipment' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveContentTab('equipment')}
                  className={activeContentTab === 'equipment' ? 'bg-amber-600 hover:bg-amber-700' : ''}
                >
                  装備品等の交換
                </Button>
                <Button
                  type="button"
                  variant={activeContentTab === 'regular' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveContentTab('regular')}
                  className={activeContentTab === 'regular' ? 'bg-amber-600 hover:bg-amber-700' : ''}
                >
                  定期点検の実施
                </Button>
                <Button
                  type="button"
                  variant={activeContentTab === 'installation' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveContentTab('installation')}
                  className={activeContentTab === 'installation' ? 'bg-amber-600 hover:bg-amber-700' : ''}
                >
                  取付け・取卸し
                </Button>
                <Button
                  type="button"
                  variant={activeContentTab === 'other' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveContentTab('other')}
                  className={activeContentTab === 'other' ? 'bg-amber-600 hover:bg-amber-700' : ''}
                >
                  その他
                </Button>
              </div>

              {/* 装備品等の交換 */}
              {activeContentTab === 'equipment' && (
                <Textarea
                  id="contentEquipmentReplacement"
                  value={formData.contentEquipmentReplacement}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, contentEquipmentReplacement: e.target.value }))
                  }
                  placeholder="装備品等の交換内容を記載&#10;&#10;例:&#10;- プロペラ全4枚を新品に交換（型番: xxx）&#10;- バッテリー交換（シリアル: xxx）&#10;- カメラジンバルモーター交換"
                  rows={8}
                  className="font-mono text-sm"
                />
              )}

              {/* 定期点検の実施 */}
              {activeContentTab === 'regular' && (
                <Textarea
                  id="contentRegularInspection"
                  value={formData.contentRegularInspection}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, contentRegularInspection: e.target.value }))
                  }
                  placeholder="定期点検の内容を記載&#10;&#10;例:&#10;【外観点検】&#10;- 機体全般の損傷・汚れ確認&#10;- プロペラの損傷・固定状態確認&#10;&#10;【機能点検】&#10;- 通信系統の動作確認&#10;- 推進系統の動作確認"
                  rows={8}
                  className="font-mono text-sm"
                />
              )}

              {/* 装置等の取付け・取卸し記録 */}
              {activeContentTab === 'installation' && (
                <Textarea
                  id="contentInstallationRemoval"
                  value={formData.contentInstallationRemoval}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, contentInstallationRemoval: e.target.value }))
                  }
                  placeholder="装置等の取付け・取卸し記録&#10;&#10;例:&#10;- サーマルカメラ取付け&#10;- スピーカー取卸し&#10;- 農薬散布装置の取付け"
                  rows={8}
                  className="font-mono text-sm"
                />
              )}

              {/* その他点検整備等 */}
              {activeContentTab === 'other' && (
                <Textarea
                  id="contentOther"
                  value={formData.contentOther}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, contentOther: e.target.value }))
                  }
                  placeholder="その他の点検整備内容を記載&#10;&#10;例:&#10;- ファームウェアアップデート（v2.0.1 → v2.1.0）&#10;- キャリブレーション実施&#10;- 動作確認飛行を実施、異常なし"
                  rows={8}
                  className="font-mono text-sm"
                />
              )}

              {/* 入力済みカテゴリ表示 */}
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {formData.contentEquipmentReplacement && (
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded">✓ 装備品等の交換</span>
                )}
                {formData.contentRegularInspection && (
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded">✓ 定期点検</span>
                )}
                {formData.contentInstallationRemoval && (
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded">✓ 取付け・取卸し</span>
                )}
                {formData.contentOther && (
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded">✓ その他</span>
                )}
              </div>

              <p className="text-sm text-muted-foreground md:text-xs">
                ※ 実施した作業を具体的に記録してください（部品交換の場合は型番・数量も記載）
              </p>
            </div>

            {/* 備考 */}
            <div className="space-y-3 md:space-y-2">
              <Label htmlFor="remarks">備考</Label>
              <Textarea
                id="remarks"
                value={formData.remarks}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, remarks: e.target.value }))
                }
                placeholder="その他補足情報があれば記載&#10;&#10;例:&#10;- 天候: 晴れ&#10;- 整備担当者の所見&#10;- 次回点検予定: 2025年12月"
                rows={4}
              />
            </div>
          </div>

          {/* 送信ボタン */}
          <div className="flex gap-4">
            <Button
              type="submit"
              size="lg"
              className="flex-1 h-14 text-base md:h-12 md:text-sm bg-amber-600 hover:bg-amber-700"
              disabled={!formData.droneId || !formData.executorId || !hasValidContent()}
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              点検整備記録を保存
            </Button>
          </div>

          {/* 必須項目の説明 */}
          {(!formData.droneId || !formData.executorId || !hasValidContent()) && (
            <p className="text-sm text-amber-600 text-center">
              ⚠️ 必須項目をすべて入力してください（機体、実施者、点検整備内容）
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

