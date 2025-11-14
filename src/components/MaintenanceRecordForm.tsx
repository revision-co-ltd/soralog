// 点検整備記録フォーム（様式3）
// 国土交通省ガイドライン準拠

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
  locations?: Array<{ id: string; name: string }>;
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
    droneId: '',
    executionDate: new Date(),
    totalFlightTimeAtMoment: 0,
    workContent: '',
    reason: '',
    executionPlaceId: '',
    executorId: '',
    nextDueNote: '',
    remarks: '',
  });

  const [selectedDrone, setSelectedDrone] = useState<any>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const handleDroneChange = (droneId: string) => {
    const drone = drones.find((d) => d.id === droneId);
    setSelectedDrone(drone);
    setFormData((prev) => ({
      ...prev,
      droneId,
      totalFlightTimeAtMoment: drone?.totalFlightHours || 0,
    }));
  };

  const handleTemplateSelect = (template: typeof workTemplates[0]) => {
    setFormData((prev) => ({
      ...prev,
      workContent: template.content,
    }));
    setShowTemplates(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const dto: CreateMaintenanceRecordDTO = {
      droneId: formData.droneId,
      executionDate: formData.executionDate,
      totalFlightTimeAtMoment: formData.totalFlightTimeAtMoment,
      workContent: formData.workContent,
      reason: formData.reason || undefined,
      executionPlaceId: formData.executionPlaceId || undefined,
      executorId: formData.executorId,
      nextDueNote: formData.nextDueNote || undefined,
      remarks: formData.remarks || undefined,
    };

    onSubmit(dto);
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
                  この時点での総飛行時間（時間）
                </Label>
                <Input
                  id="totalFlightTime"
                  type="number"
                  step="0.1"
                  value={formData.totalFlightTimeAtMoment}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      totalFlightTimeAtMoment: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="h-14 md:h-10"
                />
                <p className="text-sm text-muted-foreground md:text-xs">
                  ※ 機体選択時に自動入力されます
                </p>
              </div>

              {/* 実施者 */}
              <div className="space-y-3 md:space-y-2">
                <Label htmlFor="executorId">実施者 *</Label>
                <Select
                  value={formData.executorId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, executorId: value }))
                  }
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
              </div>
            </div>

            {/* 実施場所（オプション） */}
            {locations.length > 0 && (
              <div className="space-y-3 md:space-y-2">
                <Label htmlFor="executionPlaceId">実施場所</Label>
                <Select
                  value={formData.executionPlaceId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, executionPlaceId: value }))
                  }
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
              </div>
            )}
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

            {/* 作業内容 */}
            <div className="space-y-3 md:space-y-2">
              <Label htmlFor="workContent">
                点検・修理・改造及び整備の内容 *
              </Label>
              <Textarea
                id="workContent"
                value={formData.workContent}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, workContent: e.target.value }))
                }
                placeholder="実施した作業内容を詳しく記載してください&#10;&#10;例:&#10;- 定期点検を実施&#10;- プロペラ全4枚を新品に交換&#10;- 動作確認飛行を実施、異常なし"
                rows={12}
                className="font-mono text-sm"
                required
              />
              <p className="text-sm text-muted-foreground md:text-xs">
                ※ 実施した作業を具体的に記録してください（部品交換の場合は型番・数量も記載）
              </p>
            </div>

            {/* 次回実施予定・特記事項 */}
            <div className="space-y-3 md:space-y-2">
              <Label htmlFor="nextDueNote">その他特記事項（次回実施予定等）</Label>
              <Textarea
                id="nextDueNote"
                value={formData.nextDueNote}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, nextDueNote: e.target.value }))
                }
                placeholder="次回点検予定、注意事項などを記載&#10;&#10;例:&#10;- 次回定期点検: 2025年12月（総飛行時間100時間時）&#10;- プロペラは50時間ごとに点検推奨"
                rows={4}
              />
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
                placeholder="その他補足情報があれば記載&#10;&#10;例:&#10;- 天候: 晴れ&#10;- 整備担当者の所見など"
                rows={3}
              />
            </div>
          </div>

          {/* 送信ボタン */}
          <div className="flex gap-4">
            <Button
              type="submit"
              size="lg"
              className="flex-1 h-14 text-base md:h-12 md:text-sm bg-amber-600 hover:bg-amber-700"
              disabled={!formData.droneId || !formData.executorId || !formData.workContent}
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              点検整備記録を保存
            </Button>
          </div>

          {/* 必須項目の説明 */}
          {(!formData.droneId || !formData.executorId || !formData.workContent) && (
            <p className="text-sm text-amber-600 text-center">
              ⚠️ 必須項目をすべて入力してください
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

