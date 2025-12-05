import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from './ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { User, Plus, Edit, Trash2, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';

interface Pilot {
  id: string;
  name: string;
  licenseNumber?: string;
  licenseType?: string;
  initialFlightHours: number; // 登录时的总飞行时间（分钟）
  totalFlightHours: number; // 总飞行时间（分钟）= 初始飞行时间 + アプリ内累计时间
  isActive: boolean;
}

interface FlightLog {
  id: string;
  pilot: string;
}

interface PilotManagementProps {
  pilots: Pilot[];
  flights?: FlightLog[];
  onAddPilot: (pilot: Omit<Pilot, 'id'>) => void;
  onUpdatePilot: (id: string, pilot: Partial<Pilot>) => void;
  onDeletePilot: (id: string) => void;
}

export function PilotManagement({ pilots, flights = [], onAddPilot, onUpdatePilot, onDeletePilot }: PilotManagementProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPilot, setEditingPilot] = useState<Pilot | null>(null);
  const [showRetired, setShowRetired] = useState(false);
  const [deleteConfirmPilot, setDeleteConfirmPilot] = useState<Pilot | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    licenseNumber: '',
    licenseType: '',
    initialFlightHours: 0,
    totalFlightHours: 0,
    initialHours: 0,
    initialMinutes: 0
  });

  // 检查操纵者是否有关联的飞行记录
  const hasPilotFlights = (pilotName: string) => {
    return flights.some(f => f.pilot === pilotName);
  };

  // 获取关联的飞行记录数量
  const getPilotFlightCount = (pilotName: string) => {
    return flights.filter(f => f.pilot === pilotName).length;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 计算初始飞行时间（分钟）
    const calculatedInitialFlightHours = (formData.initialHours || 0) * 60 + (formData.initialMinutes || 0);
    
    if (editingPilot) {
      // 编辑时：计算アプリ内飞行时间，然后更新总时间
      const oldInitialFlightHours = editingPilot.initialFlightHours || 0;
      const oldTotalFlightHours = editingPilot.totalFlightHours || 0;
      const appFlightHours = Math.max(0, oldTotalFlightHours - oldInitialFlightHours); // アプリ内累计的时间
      const newTotalFlightHours = calculatedInitialFlightHours + appFlightHours; // 新的总时间 = 新的初始时间 + アプリ内时间
      
      onUpdatePilot(editingPilot.id, {
        name: formData.name,
        licenseNumber: formData.licenseNumber || undefined,
        licenseType: formData.licenseType || undefined,
        initialFlightHours: calculatedInitialFlightHours,
        totalFlightHours: newTotalFlightHours
      });
      setEditingPilot(null);
    } else {
      onAddPilot({
        name: formData.name,
        licenseNumber: formData.licenseNumber || undefined,
        licenseType: formData.licenseType || undefined,
        initialFlightHours: calculatedInitialFlightHours,
        totalFlightHours: calculatedInitialFlightHours,
        isActive: true
      });
      setIsAddDialogOpen(false);
    }
    setFormData({ name: '', licenseNumber: '', licenseType: '', initialFlightHours: 0, totalFlightHours: 0, initialHours: 0, initialMinutes: 0 });
  };

  const handleEdit = (pilot: Pilot) => {
    setEditingPilot(pilot);
    const initialHours = Math.floor((pilot.initialFlightHours || 0) / 60);
    const initialMinutes = (pilot.initialFlightHours || 0) % 60;
    const totalFlightHours = pilot.totalFlightHours || 0;
    setFormData({
      name: pilot.name,
      licenseNumber: pilot.licenseNumber || '',
      licenseType: pilot.licenseType || '',
      initialFlightHours: pilot.initialFlightHours || 0,
      totalFlightHours: totalFlightHours,
      initialHours,
      initialMinutes
    });
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const activePilots = pilots.filter(p => p.isActive);
  const inactivePilots = pilots.filter(p => !p.isActive);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 flex-shrink-0" />
              操縦者管理
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  操縦者追加
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>新しい操縦者を追加</DialogTitle>
                  <DialogDescription>
                    操縦者の基本情報とライセンス情報を入力してください。
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">氏名 *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="山田太郎"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="licenseType">ライセンス種別</Label>
                    <Input
                      id="licenseType"
                      value={formData.licenseType}
                      onChange={(e) => handleInputChange('licenseType', e.target.value)}
                      placeholder="一等無人航空機操縦士"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber">ライセンス番号</Label>
                    <Input
                      id="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                      placeholder="123456789"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>登録時の総飛行時間</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Input
                          id="initialHours"
                          type="number"
                          min="0"
                          value={formData.initialHours || ''}
                          onChange={(e) => handleInputChange('initialHours', parseInt(e.target.value) || 0)}
                          placeholder="時間"
                        />
                        <p className="text-xs text-muted-foreground mt-1">時間</p>
                      </div>
                      <div>
                        <Input
                          id="initialMinutes"
                          type="number"
                          min="0"
                          max="59"
                          value={formData.initialMinutes || ''}
                          onChange={(e) => handleInputChange('initialMinutes', Math.min(59, parseInt(e.target.value) || 0))}
                          placeholder="分"
                        />
                        <p className="text-xs text-muted-foreground mt-1">分</p>
                      </div>
                    </div>
                  </div>
                  <Button type="submit" className="w-full">
                    追加
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-3">アクティブな操縦者</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activePilots.map((pilot) => (
                  <div key={pilot.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src="" />
                        <AvatarFallback>{pilot.name.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{pilot.name}</p>
                        {pilot.licenseType && (
                          <Badge variant="secondary" className="text-xs">
                            {pilot.licenseType}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {pilot.licenseNumber && (
                      <div className="text-sm text-gray-600">
                        <span className="truncate block">ライセンス: {pilot.licenseNumber}</span>
                      </div>
                    )}
                    
                    <div className="space-y-1 bg-blue-50 border border-blue-200 rounded-lg p-2">
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">総飛行時間: </span>
                        <span className="text-blue-600 font-semibold">
                          {Math.floor(pilot.totalFlightHours / 60)}時間{pilot.totalFlightHours % 60}分
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        登録時: {Math.floor(pilot.initialFlightHours / 60)}時間{pilot.initialFlightHours % 60}分 
                        {' '}+ アプリ内: {Math.floor(Math.max(0, pilot.totalFlightHours - pilot.initialFlightHours) / 60)}時間{Math.max(0, pilot.totalFlightHours - pilot.initialFlightHours) % 60}分
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEdit(pilot)}
                        className="flex-1 text-xs"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        編集
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setDeleteConfirmPilot(pilot)}
                        className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {inactivePilots.length > 0 && (
              <div>
                <button
                  onClick={() => setShowRetired(!showRetired)}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-3"
                >
                  {showRetired ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  退役済み操縦者 ({inactivePilots.length}名)
                </button>
                {showRetired && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {inactivePilots.map((pilot) => (
                      <div key={pilot.id} className="border border-dashed rounded-lg p-4 space-y-3 bg-gray-50">
                        <div className="flex items-center gap-3">
                          <Avatar className="opacity-50">
                            <AvatarImage src="" />
                            <AvatarFallback>{pilot.name.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-gray-600">{pilot.name}</p>
                            <Badge variant="outline" className="text-xs text-gray-500">
                              退役済み
                            </Badge>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          飛行記録: {getPilotFlightCount(pilot.name)}件
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => onUpdatePilot(pilot.id, { isActive: true })}
                          className="w-full"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          復元
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editingPilot !== null} onOpenChange={() => setEditingPilot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>操縦者情報編集</DialogTitle>
            <DialogDescription>
              操縦者の情報を編集してください。
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">氏名 *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-licenseType">ライセンス種別</Label>
              <Input
                id="edit-licenseType"
                value={formData.licenseType}
                onChange={(e) => handleInputChange('licenseType', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-licenseNumber">ライセンス番号</Label>
              <Input
                id="edit-licenseNumber"
                value={formData.licenseNumber}
                onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>登録時の総飛行時間</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Input
                    id="edit-initialHours"
                    type="number"
                    min="0"
                    value={formData.initialHours || ''}
                    onChange={(e) => {
                      const hours = parseInt(e.target.value) || 0;
                      const newInitialFlightHours = hours * 60 + (formData.initialMinutes || 0);
                      const appFlightHours = Math.max(0, (editingPilot?.totalFlightHours || 0) - (editingPilot?.initialFlightHours || 0));
                      handleInputChange('initialHours', hours);
                      handleInputChange('initialFlightHours', newInitialFlightHours);
                      handleInputChange('totalFlightHours', newInitialFlightHours + appFlightHours);
                    }}
                    placeholder="時間"
                  />
                  <p className="text-xs text-muted-foreground mt-1">時間</p>
                </div>
                <div>
                  <Input
                    id="edit-initialMinutes"
                    type="number"
                    min="0"
                    max="59"
                    value={formData.initialMinutes || ''}
                    onChange={(e) => {
                      const minutes = Math.min(59, parseInt(e.target.value) || 0);
                      const newInitialFlightHours = (formData.initialHours || 0) * 60 + minutes;
                      const appFlightHours = Math.max(0, (editingPilot?.totalFlightHours || 0) - (editingPilot?.initialFlightHours || 0));
                      handleInputChange('initialMinutes', minutes);
                      handleInputChange('initialFlightHours', newInitialFlightHours);
                      handleInputChange('totalFlightHours', newInitialFlightHours + appFlightHours);
                    }}
                    placeholder="分"
                  />
                  <p className="text-xs text-muted-foreground mt-1">分</p>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900 font-medium mb-1">現在の総飛行時間</p>
              <p className="text-2xl font-bold text-blue-700">
                {Math.floor(formData.totalFlightHours / 60)}時間{formData.totalFlightHours % 60}分
              </p>
              <p className="text-xs text-blue-600 mt-2">
                登録時: {Math.floor((formData.initialHours || 0))}時間{formData.initialMinutes || 0}分 
                {' '}+ アプリ内: {Math.floor(Math.max(0, formData.totalFlightHours - formData.initialFlightHours) / 60)}時間{Math.max(0, formData.totalFlightHours - formData.initialFlightHours) % 60}分
              </p>
            </div>
            <Button type="submit" className="w-full">
              更新
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmPilot !== null} onOpenChange={() => setDeleteConfirmPilot(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteConfirmPilot && hasPilotFlights(deleteConfirmPilot.name) 
                ? '操縦者を退役させますか？' 
                : '操縦者を削除しますか？'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmPilot && hasPilotFlights(deleteConfirmPilot.name) ? (
                <>
                  <span className="font-medium">{deleteConfirmPilot.name}</span> さんには 
                  <span className="font-medium text-blue-600"> {getPilotFlightCount(deleteConfirmPilot.name)}件</span> の飛行記録があります。
                  <br /><br />
                  飛行記録を保持するため、完全削除はできません。
                  「退役」状態にすると、新しい飛行記録では選択できなくなりますが、既存の記録は保持されます。
                </>
              ) : (
                <>
                  <span className="font-medium">{deleteConfirmPilot?.name}</span> さんを完全に削除します。
                  この操作は取り消せません。
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirmPilot) {
                  if (hasPilotFlights(deleteConfirmPilot.name)) {
                    // 有飞行记录：只能退役
                    onUpdatePilot(deleteConfirmPilot.id, { isActive: false });
                  } else {
                    // 没有飞行记录：真正删除
                    onDeletePilot(deleteConfirmPilot.id);
                  }
                  setDeleteConfirmPilot(null);
                }
              }}
              className={deleteConfirmPilot && hasPilotFlights(deleteConfirmPilot.name) 
                ? 'bg-amber-600 hover:bg-amber-700' 
                : 'bg-red-600 hover:bg-red-700'}
            >
              {deleteConfirmPilot && hasPilotFlights(deleteConfirmPilot.name) ? '退役させる' : '削除する'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}