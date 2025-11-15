// 首次使用引导流程 - 强制添加操纵士和飞机
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Check, User, Plane, ArrowRight, AlertCircle } from 'lucide-react';

interface Pilot {
  id: string;
  name: string;
  licenseNumber?: string;
  licenseType?: string;
  email?: string;
  phone?: string;
  initialFlightHours: number;
  totalFlightHours: number;
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

interface OnboardingFlowProps {
  isOpen: boolean;
  onComplete: (pilot: Omit<Pilot, 'id'>, uav: Omit<UAV, 'id'>) => void;
  onSkip: () => void;
}

export function OnboardingFlow({ isOpen, onComplete, onSkip }: OnboardingFlowProps) {
  const [step, setStep] = useState(1); // 1: 欢迎, 2: 添加操纵士, 3: 添加飞机, 4: 完成
  
  // 操纵士信息
  const [pilotName, setPilotName] = useState('');
  const [licenseType, setLicenseType] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [initialHours, setInitialHours] = useState('0');
  
  // 飞机信息
  const [uavNickname, setUavNickname] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [category, setCategory] = useState<'certified' | 'uncertified'>('uncertified');
  const [registrationId, setRegistrationId] = useState('');
  
  const [error, setError] = useState('');

  const validatePilot = () => {
    if (!pilotName.trim()) {
      setError('操縦者名を入力してください');
      return false;
    }
    setError('');
    return true;
  };

  const validateUAV = () => {
    if (!uavNickname.trim()) {
      setError('機体の愛称を入力してください');
      return false;
    }
    if (!manufacturer.trim()) {
      setError('製造者名を入力してください');
      return false;
    }
    if (!model.trim()) {
      setError('型式を入力してください');
      return false;
    }
    setError('');
    return true;
  };

  const handlePilotNext = () => {
    if (validatePilot()) {
      setStep(3);
    }
  };

  const handleComplete = () => {
    if (!validateUAV()) {
      return;
    }

    const pilot: Omit<Pilot, 'id'> = {
      name: pilotName,
      licenseType: licenseType || undefined,
      licenseNumber: licenseNumber || undefined,
      initialFlightHours: parseFloat(initialHours) * 60 || 0, // 转换为分钟
      totalFlightHours: parseFloat(initialHours) * 60 || 0,
      isActive: true,
    };

    const uav: Omit<UAV, 'id'> = {
      nickname: uavNickname,
      manufacturer,
      model,
      category,
      registrationId: registrationId || undefined,
      totalFlightHours: 0,
      hoursSinceLastMaintenance: 0,
      isActive: true,
    };

    onComplete(pilot, uav);
  };

  const progress = (step / 4) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={onSkip}>
      <DialogContent className="sm:max-w-[500px]">
        {/* 进度条 */}
        <div className="mb-4">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-gray-500 mt-2 text-center">
            ステップ {step} / 4
          </p>
        </div>

        {/* Step 1: 欢迎 */}
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                🎉 ソラログへようこそ！
              </DialogTitle>
              <DialogDescription className="text-base mt-4">
                基本情報を設定すると、よりスムーズに飛行記録を作成できます
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-600 text-white rounded-full p-2 mt-1">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-medium text-blue-900">1. 操縦者登録</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      飛行記録作成時に自動入力されます
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="bg-green-600 text-white rounded-full p-2 mt-1">
                    <Plane className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-medium text-green-900">2. 機体登録</h3>
                    <p className="text-sm text-green-700 mt-1">
                      飛行する無人航空機の情報を登録します
                    </p>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  今すぐ設定しなくても、飛行記録作成時に追加できます
                </AlertDescription>
              </Alert>
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={() => setStep(2)} className="w-full" size="lg">
                <ArrowRight className="mr-2 h-5 w-5" />
                今すぐ設定する
              </Button>
              <Button onClick={onSkip} variant="outline" className="w-full" size="lg">
                後で設定する
              </Button>
            </div>
          </>
        )}

        {/* Step 2: 添加操纵士 */}
        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                操縦者情報の登録
              </DialogTitle>
              <DialogDescription>
                最低1名の操縦者を登録してください
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="pilot-name">
                  操縦者名 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="pilot-name"
                  placeholder="例：山田太郎"
                  value={pilotName}
                  onChange={(e) => setPilotName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="license-type">技能証明の種類</Label>
                <Select value={licenseType} onValueChange={setLicenseType}>
                  <SelectTrigger id="license-type">
                    <SelectValue placeholder="選択してください（任意）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="一等無人航空機操縦士">一等無人航空機操縦士</SelectItem>
                    <SelectItem value="二等無人航空機操縦士">二等無人航空機操縦士</SelectItem>
                    <SelectItem value="その他">その他</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="license-number">技能証明番号</Label>
                <Input
                  id="license-number"
                  placeholder="例：123456789（任意）"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="initial-hours">登録時の総飛行時間（時間）</Label>
                <Input
                  id="initial-hours"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="例：50.5"
                  value={initialHours}
                  onChange={(e) => setInitialHours(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  これまでの飛行経験を入力してください（任意）
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setStep(1)} variant="outline" className="flex-1">
                戻る
              </Button>
              <Button onClick={handlePilotNext} className="flex-1">
                次へ
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {/* Step 3: 添加飞机 */}
        {step === 3 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5 text-green-600" />
                機体情報の登録
              </DialogTitle>
              <DialogDescription>
                飛行する無人航空機の情報を入力してください
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="uav-nickname">
                  機体の愛称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="uav-nickname"
                  placeholder="例：メイン機体、撮影用"
                  value={uavNickname}
                  onChange={(e) => setUavNickname(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manufacturer">
                  製造者 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="manufacturer"
                  placeholder="例：DJI"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">
                  型式 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="model"
                  placeholder="例：Mini 3 Pro"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">機体カテゴリー</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as 'certified' | 'uncertified')}>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uncertified">第一種機体認証なし</SelectItem>
                    <SelectItem value="certified">第一種機体認証あり</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="registration-id">登録記号</Label>
                <Input
                  id="registration-id"
                  placeholder="例：JA001D（任意）"
                  value={registrationId}
                  onChange={(e) => setRegistrationId(e.target.value)}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setStep(2)} variant="outline" className="flex-1">
                戻る
              </Button>
              <Button onClick={handleComplete} className="flex-1 bg-green-600 hover:bg-green-700">
                完了
                <Check className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {/* Step 4: 完成 */}
        {step === 4 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Check className="h-6 w-6 text-green-600" />
                設定完了！
              </DialogTitle>
            </DialogHeader>

            <div className="py-6 text-center">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-4">
                <div className="text-green-900 space-y-2">
                  <p className="font-medium">✅ 操縦者情報を登録しました</p>
                  <p className="font-medium">✅ 機体情報を登録しました</p>
                </div>
                <p className="text-sm text-gray-600">
                  これで飛行記録の作成を開始できます！
                </p>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

