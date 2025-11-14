// 日常点検記録フォーム（様式2）
// 国土交通省ガイドライン準拠

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { DatePicker } from './ui/date-picker';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle2, XCircle, AlertTriangle, ClipboardCheck, Zap } from 'lucide-react';
import type { CreateDailyInspectionDTO, InspectionResult } from '../types';

interface DailyInspectionFormProps {
  onSubmit: (data: CreateDailyInspectionDTO) => void;
  drones?: Array<{ id: string; name: string; registrationMark: string }>;
  operators?: Array<{ id: string; name: string }>;
  locations?: Array<{ id: string; name: string }>;
}

// 点検項目の定義（13項目）
type InspectionCategory = 'standard' | 'preflight';

const inspectionItems: Array<{
  id: string;
  title: string;
  description: string;
  icon: string;
  category: InspectionCategory;
}> = [
  {
    id: 'airframe',
    title: '機体全般',
    description: '機体の取付け状態（ネジ、コネクタ、ケーブル等）の健全性を確認してください',
    icon: '🚁',
    category: 'standard',
  },
  {
    id: 'propeller',
    title: 'プロペラ',
    description: 'プロペラが損傷なく、しっかりと固定されているか確認してください',
    icon: '🔄',
    category: 'standard',
  },
  {
    id: 'frame',
    title: 'フレーム',
    description: 'フレームにクラックや変形がないか確認してください',
    icon: '🔲',
    category: 'standard',
  },
  {
    id: 'mountedEquipment',
    title: '機体搭載装置',
    description: '機体に搭載された装置の装着部や固定の健全性を確認してください',
    icon: '🧩',
    category: 'standard',
  },
  {
    id: 'communication',
    title: '通信系統',
    description: '送信機と機体の通信が正常に行えるか確認してください',
    icon: '📡',
    category: 'standard',
  },
  {
    id: 'propulsion',
    title: '推進系統',
    description: 'モーターが正常に動作するか確認してください',
    icon: '⚙️',
    category: 'standard',
  },
  {
    id: 'power',
    title: '電源系統',
    description: 'バッテリーが十分に充電され、正常に装着されているか確認してください',
    icon: '🔋',
    category: 'standard',
  },
  {
    id: 'control',
    title: '自動制御系統',
    description: 'GPS・ジャイロ等の自動制御システムが正常に動作するか確認してください',
    icon: '🎯',
    category: 'standard',
  },
  {
    id: 'controller',
    title: '操縦装置',
    description: '送信機の操縦スティック・スイッチが正常に動作するか確認してください',
    icon: '🎮',
    category: 'standard',
  },
  {
    id: 'battery',
    title: 'バッテリー・燃料',
    description: 'バッテリー残量・温度・膨張、燃料残量に異常がないか確認してください',
    icon: '🔌',
    category: 'standard',
  },
  {
    id: 'remoteId',
    title: 'リモートID機能',
    description: 'リモートID機器が正常に動作するか確認してください',
    icon: '📍',
    category: 'standard',
  },
  {
    id: 'lights',
    title: '灯火',
    description: 'ナビゲーションライト等が正常に点灯するか確認してください',
    icon: '💡',
    category: 'standard',
  },
  {
    id: 'camera',
    title: 'カメラ',
    description: 'カメラ・ジンバルが正常に動作するか確認してください',
    icon: '📷',
    category: 'standard',
  },
  {
    id: 'preFlightSnow',
    title: '（飛行前点検）機体に雪等の付着はないか',
    description: '機体に雪・霜・泥などの付着物がないか確認してください',
    icon: '❄️',
    category: 'preflight',
  },
  {
    id: 'preFlightAttachment',
    title: '（飛行前点検）各機器は確実に取り付けられているか',
    description: 'ネジの緩みや部品の外れがないか確認してください',
    icon: '🪛',
    category: 'preflight',
  },
  {
    id: 'preFlightDamage',
    title: '（飛行前点検）機体に損傷やゆがみはないか',
    description: 'プロペラ・フレーム等に損傷・ゆがみがないか確認してください',
    icon: '🛡️',
    category: 'preflight',
  },
  {
    id: 'preFlightHeat',
    title: '（飛行前点検）各機器の異常な発熱はないか',
    description: '電装品やバッテリー等に異常な発熱がないか確認してください',
    icon: '🌡️',
    category: 'preflight',
  },
];

export function DailyInspectionForm({
  onSubmit,
  drones = [],
  operators = [],
  locations = [],
}: DailyInspectionFormProps) {
  // 基本情報
  const [formData, setFormData] = useState({
    droneId: '',
    inspectionType: 'pre-flight' as 'pre-flight' | 'post-flight',
    executionDate: new Date(),
    executionPlaceId: '',
    executorId: '',
    specialNote: '',
  });

  // 各項目の点検結果
  const [inspectionResults, setInspectionResults] = useState<{
    [key: string]: { result: InspectionResult; note: string };
  }>({});

  const visibleInspectionItems = inspectionItems.filter(
    (item) => formData.inspectionType === 'pre-flight' || item.category === 'standard'
  );

  // すべての項目が「正常」または「異常」で入力されているか
  const allItemsChecked = visibleInspectionItems.every(
    (item) => inspectionResults[item.id]?.result && inspectionResults[item.id].result !== '未選択'
  );

  // 異常項目があるか
  const hasAbnormalItems = visibleInspectionItems.some(
    (item) => inspectionResults[item.id]?.result === '異常'
  );

  // 異常項目の数
  const abnormalCount = visibleInspectionItems.filter(
    (item) => inspectionResults[item.id]?.result === '異常'
  ).length;

  const getCategoryLabel = (category: InspectionCategory) =>
    category === 'preflight' ? '飛行前点検（追加確認項目）' : '機体・装備の点検項目';

  let currentCategory: InspectionCategory | null = null;

  // 一括「正常」設定
  const handleSetAllNormal = () => {
    const newResults: typeof inspectionResults = {};
    inspectionItems.forEach((item) => {
      newResults[item.id] = { result: '正常', note: '' };
    });
    setInspectionResults(newResults);
  };

  // 項目の結果更新
  const handleResultChange = (itemId: string, result: InspectionResult) => {
    setInspectionResults((prev) => ({
      ...prev,
      [itemId]: {
        result,
        note: prev[itemId]?.note || '',
      },
    }));
  };

  // 項目の備考更新
  const handleNoteChange = (itemId: string, note: string) => {
    setInspectionResults((prev) => ({
      ...prev,
      [itemId]: {
        result: prev[itemId]?.result || '未選択',
        note,
      },
    }));
  };

  // フォーム送信
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // DTO形式に変換
    const dto: CreateDailyInspectionDTO = {
      droneId: formData.droneId,
      inspectionType: formData.inspectionType,
      executionDate: formData.executionDate,
      executionPlaceId: formData.executionPlaceId || undefined,
      executorId: formData.executorId,
      specialNote: formData.specialNote || undefined,
      // 各項目の結果を展開
      resultAirframe: inspectionResults['airframe']?.result,
      noteAirframe: inspectionResults['airframe']?.note,
      resultPropeller: inspectionResults['propeller']?.result,
      notePropeller: inspectionResults['propeller']?.note,
      resultFrame: inspectionResults['frame']?.result,
      noteFrame: inspectionResults['frame']?.note,
      resultMountedEquipment: inspectionResults['mountedEquipment']?.result,
      noteMountedEquipment: inspectionResults['mountedEquipment']?.note,
      resultCommunication: inspectionResults['communication']?.result,
      noteCommunication: inspectionResults['communication']?.note,
      resultPropulsion: inspectionResults['propulsion']?.result,
      notePropulsion: inspectionResults['propulsion']?.note,
      resultPower: inspectionResults['power']?.result,
      notePower: inspectionResults['power']?.note,
      resultControl: inspectionResults['control']?.result,
      noteControl: inspectionResults['control']?.note,
      resultController: inspectionResults['controller']?.result,
      noteController: inspectionResults['controller']?.note,
      resultBattery: inspectionResults['battery']?.result,
      noteBattery: inspectionResults['battery']?.note,
      resultRemoteId: inspectionResults['remoteId']?.result,
      noteRemoteId: inspectionResults['remoteId']?.note,
      resultLights: inspectionResults['lights']?.result,
      noteLights: inspectionResults['lights']?.note,
      resultCamera: inspectionResults['camera']?.result,
      noteCamera: inspectionResults['camera']?.note,
      resultPreFlightSnow: inspectionResults['preFlightSnow']?.result,
      notePreFlightSnow: inspectionResults['preFlightSnow']?.note,
      resultPreFlightAttachment: inspectionResults['preFlightAttachment']?.result,
      notePreFlightAttachment: inspectionResults['preFlightAttachment']?.note,
      resultPreFlightDamage: inspectionResults['preFlightDamage']?.result,
      notePreFlightDamage: inspectionResults['preFlightDamage']?.note,
      resultPreFlightHeat: inspectionResults['preFlightHeat']?.result,
      notePreFlightHeat: inspectionResults['preFlightHeat']?.note,
    };

    onSubmit(dto);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <ClipboardCheck className="h-6 w-6 text-blue-600" />
          日常点検記録（様式2）
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          飛行前または飛行後の点検結果を記録してください
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
              {/* 点検種別 */}
              <div className="space-y-3 md:space-y-2">
                <Label htmlFor="inspectionType">点検種別 *</Label>
                <Select
                  value={formData.inspectionType}
                  onValueChange={(value: 'pre-flight' | 'post-flight') =>
                    setFormData((prev) => ({ ...prev, inspectionType: value }))
                  }
                >
                  <SelectTrigger className="h-14 md:h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pre-flight">飛行前点検</SelectItem>
                    <SelectItem value="post-flight">飛行後点検</SelectItem>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-4">
              {/* 機体選択 */}
              <div className="space-y-3 md:space-y-2">
                <Label htmlFor="droneId">無人航空機 *</Label>
                <Select
                  value={formData.droneId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, droneId: value }))
                  }
                >
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
                {formData.droneId && (
                  <p className="text-xs text-muted-foreground">
                    登録記号:{' '}
                    {
                      drones.find((drone) => drone.id === formData.droneId)?.registrationMark ||
                      '未登録'
                    }
                  </p>
                )}
              </div>

              {/* 実施者選択 */}
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

          {/* 点検項目セクション */}
          <div className="space-y-6 md:space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                ✅ 点検項目
              </h3>
              <Button
                type="button"
                variant="outline"
                onClick={handleSetAllNormal}
                className="gap-2 h-12 md:h-10"
              >
                <Zap className="h-4 w-4" />
                一括「正常」
              </Button>
            </div>

            {/* 進捗表示 */}
            <div className="p-4 bg-gray-50 border rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">点検進捗</span>
                <span className="text-sm font-bold">
                  {
                    Object.entries(inspectionResults).filter(
                      ([key, value]) =>
                        visibleInspectionItems.some((item) => item.id === key) &&
                        value.result !== '未選択'
                    ).length
                  }{' '}
                  / {visibleInspectionItems.length}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    hasAbnormalItems ? 'bg-amber-500' : 'bg-green-500'
                  }`}
                  style={{
                    width: `${
                      visibleInspectionItems.length === 0
                        ? 0
                        : (Object.entries(inspectionResults).filter(
                            ([key, value]) =>
                              visibleInspectionItems.some((item) => item.id === key) &&
                              value.result !== '未選択'
                          ).length /
                            visibleInspectionItems.length) *
                          100
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* 異常項目の警告 */}
            {hasAbnormalItems && formData.inspectionType === 'pre-flight' && (
              <Alert className="border-amber-500 bg-amber-50">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <AlertDescription className="text-amber-900 font-medium">
                  {abnormalCount}件の異常項目があります。飛行前点検で異常がある場合は、処置を行ってから飛行してください。
                </AlertDescription>
              </Alert>
            )}

            {/* 点検項目リスト */}
            <div className="space-y-4">
              {(() => {
                currentCategory = null;
                return visibleInspectionItems.map((item) => {
                  const itemResult = inspectionResults[item.id];
                  const isAbnormal = itemResult?.result === '異常';
                  const isNormal = itemResult?.result === '正常';
                  const showCategoryHeader = item.category !== currentCategory;
                  if (showCategoryHeader) {
                    currentCategory = item.category;
                  }

                  return (
                    <React.Fragment key={item.id}>
                      {showCategoryHeader && (
                        <div className="pt-6 text-sm font-semibold text-gray-600">
                          {getCategoryLabel(item.category)}
                        </div>
                      )}
                      <div
                        className={`p-4 border rounded-xl transition-all ${
                          isAbnormal
                            ? 'border-red-300 bg-red-50'
                            : isNormal
                            ? 'border-green-300 bg-green-50'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="space-y-3">
                          {/* 項目タイトル */}
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{item.icon}</span>
                            <div className="flex-1">
                              <h4 className="font-medium text-base md:text-sm">{item.title}</h4>
                              <p className="text-sm text-muted-foreground md:text-xs mt-1">
                                {item.description}
                              </p>
                            </div>
                          </div>

                          {/* 結果ボタン */}
                          <div className="flex gap-3">
                            <Button
                              type="button"
                              variant={isNormal ? 'default' : 'outline'}
                              size="lg"
                              className={`flex-1 gap-2 ${
                                isNormal
                                  ? 'bg-green-600 hover:bg-green-700'
                                  : 'hover:bg-green-50 hover:border-green-300'
                              }`}
                              onClick={() => handleResultChange(item.id, '正常')}
                            >
                              <CheckCircle2 className="h-5 w-5 md:h-4 md:w-4" />
                              正常
                            </Button>
                            <Button
                              type="button"
                              variant={isAbnormal ? 'default' : 'outline'}
                              size="lg"
                              className={`flex-1 gap-2 ${
                                isAbnormal
                                  ? 'bg-red-600 hover:bg-red-700'
                                  : 'hover:bg-red-50 hover:border-red-300'
                              }`}
                              onClick={() => handleResultChange(item.id, '異常')}
                            >
                              <XCircle className="h-5 w-5 md:h-4 md:w-4" />
                              異常
                            </Button>
                          </div>

                          {/* 備考入力（異常時のみ表示） */}
                          {isAbnormal && (
                            <div className="pt-2 space-y-2">
                              <Label htmlFor={`note-${item.id}`} className="text-red-700">
                                備考（異常内容を記載してください）*
                              </Label>
                              <Textarea
                                id={`note-${item.id}`}
                                value={itemResult?.note || ''}
                                onChange={(e) => handleNoteChange(item.id, e.target.value)}
                                placeholder="異常の詳細を記載..."
                                rows={2}
                                className="bg-white"
                                required
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                });
              })()}
            </div>
          </div>

          <Separator />

          {/* 特記事項 */}
          <div className="space-y-3 md:space-y-2">
            <Label htmlFor="specialNote">日常点検特記事項</Label>
            <Textarea
              id="specialNote"
              value={formData.specialNote}
              onChange={(e) => setFormData((prev) => ({ ...prev, specialNote: e.target.value }))}
              placeholder="全体的な所見や補足事項があれば記載..."
              rows={4}
            />
          </div>

          {/* 送信ボタン */}
          <div className="flex gap-4">
            <Button
              type="submit"
              size="lg"
              className="flex-1 h-14 text-base md:h-12 md:text-sm"
              disabled={
                !formData.droneId ||
                !formData.executorId ||
                !allItemsChecked ||
                (hasAbnormalItems &&
                  visibleInspectionItems.some(
                    (item) =>
                      inspectionResults[item.id]?.result === '異常' &&
                      !inspectionResults[item.id]?.note
                  ))
              }
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              点検記録を保存
            </Button>
          </div>

          {/* 送信制約の説明 */}
          {!allItemsChecked && (
            <p className="text-sm text-amber-600 text-center">
              ⚠️ すべての点検項目で「正常」または「異常」を選択してください
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

