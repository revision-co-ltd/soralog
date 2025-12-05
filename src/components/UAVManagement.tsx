import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Plane, Plus, Edit, Trash2, Clock, AlertTriangle, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';

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

interface FlightLog {
  id: string;
  droneModel: string;
}

interface UAVManagementProps {
  uavs: UAV[];
  flights?: FlightLog[];
  onAddUAV: (uav: Omit<UAV, 'id'>) => void;
  onUpdateUAV: (id: string, uav: Partial<UAV>) => void;
  onDeleteUAV: (id: string) => void;
}

export function UAVManagement({ uavs, flights = [], onAddUAV, onUpdateUAV, onDeleteUAV }: UAVManagementProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUAV, setEditingUAV] = useState<UAV | null>(null);
  const [showRetired, setShowRetired] = useState(false);
  const [deleteConfirmUAV, setDeleteConfirmUAV] = useState<UAV | null>(null);
  const [formData, setFormData] = useState({
    nickname: '',
    registrationId: '',
    manufacturer: '',
    model: '',
    category: 'uncertified' as 'certified' | 'uncertified',
    certificationNumber: '',
    certificationDate: ''
  });

  // 检查机体是否有关联的飞行记录
  const hasUAVFlights = (uav: UAV) => {
    const displayName = `${uav.nickname} (${uav.manufacturer} ${uav.model})`;
    return flights.some(f => f.droneModel === displayName || f.droneModel.includes(uav.nickname));
  };

  // 获取关联的飞行记录数量
  const getUAVFlightCount = (uav: UAV) => {
    const displayName = `${uav.nickname} (${uav.manufacturer} ${uav.model})`;
    return flights.filter(f => f.droneModel === displayName || f.droneModel.includes(uav.nickname)).length;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const uavData = {
      ...formData,
      registrationId: formData.registrationId || undefined,
      certificationNumber: formData.certificationNumber || undefined,
      certificationDate: formData.certificationDate || undefined,
      totalFlightHours: 0,
      hoursSinceLastMaintenance: 0,
      isActive: true
    };

    if (editingUAV) {
      onUpdateUAV(editingUAV.id, uavData);
      setEditingUAV(null);
    } else {
      onAddUAV(uavData);
      setIsAddDialogOpen(false);
    }
    
    setFormData({
      nickname: '',
      registrationId: '',
      manufacturer: '',
      model: '',
      category: 'uncertified',
      certificationNumber: '',
      certificationDate: ''
    });
  };

  const handleEdit = (uav: UAV) => {
    setEditingUAV(uav);
    setFormData({
      nickname: uav.nickname,
      registrationId: uav.registrationId || '',
      manufacturer: uav.manufacturer,
      model: uav.model,
      category: uav.category,
      certificationNumber: uav.certificationNumber || '',
      certificationDate: uav.certificationDate || ''
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getMaintenanceStatus = (hours: number) => {
    if (hours >= 20) return { status: 'overdue', color: 'bg-red-500', text: '点検必要' };
    if (hours >= 15) return { status: 'due-soon', color: 'bg-yellow-500', text: '点検近い' };
    return { status: 'ok', color: 'bg-green-500', text: '良好' };
  };

  const activeUAVs = uavs.filter(u => u.isActive);
  const inactiveUAVs = uavs.filter(u => !u.isActive);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Plane className="h-5 w-5 flex-shrink-0" />
              機体管理
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  機体追加
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>新しい機体を追加</DialogTitle>
                  <DialogDescription>
                    機体の基本情報と認証情報を入力してください。
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nickname">機体名 *</Label>
                    <Input
                      id="nickname"
                      value={formData.nickname}
                      onChange={(e) => handleInputChange('nickname', e.target.value)}
                      placeholder="メイン機体"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registrationId">登録記号</Label>
                    <Input
                      id="registrationId"
                      value={formData.registrationId}
                      onChange={(e) => handleInputChange('registrationId', e.target.value)}
                      placeholder="JA001D"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manufacturer">メーカー *</Label>
                    <Select onValueChange={(value) => handleInputChange('manufacturer', value)} value={formData.manufacturer}>
                      <SelectTrigger>
                        <SelectValue placeholder="メーカーを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DJI">DJI</SelectItem>
                        <SelectItem value="Autel">Autel</SelectItem>
                        <SelectItem value="Parrot">Parrot</SelectItem>
                        <SelectItem value="Skydio">Skydio</SelectItem>
                        <SelectItem value="その他">その他</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">機種 *</Label>
                    <Input
                      id="model"
                      value={formData.model}
                      onChange={(e) => handleInputChange('model', e.target.value)}
                      placeholder="Mavic 3"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">機体区分</Label>
                    <Select onValueChange={(value: 'certified' | 'uncertified') => handleInputChange('category', value)} value={formData.category}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="uncertified">型式認証なし</SelectItem>
                        <SelectItem value="certified">型式認証あり</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.category === 'certified' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="certificationNumber">型式認証番号</Label>
                        <Input
                          id="certificationNumber"
                          value={formData.certificationNumber}
                          onChange={(e) => handleInputChange('certificationNumber', e.target.value)}
                          placeholder="TC-001"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="certificationDate">認証取得日</Label>
                        <Input
                          id="certificationDate"
                          type="date"
                          value={formData.certificationDate}
                          onChange={(e) => handleInputChange('certificationDate', e.target.value)}
                        />
                      </div>
                    </>
                  )}
                  <Button type="submit" className="w-full">
                    追加
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="font-medium mb-4">アクティブな機体</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {activeUAVs.map((uav) => {
                  const maintenance = getMaintenanceStatus(uav.hoursSinceLastMaintenance);
                  const maintenanceProgress = Math.min((uav.hoursSinceLastMaintenance / 20) * 100, 100);
                  
                  return (
                    <div key={uav.id} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium truncate">{uav.nickname}</h4>
                            {uav.registrationId && (
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                {uav.registrationId}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 truncate">
                            {uav.manufacturer} {uav.model}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge 
                              variant={uav.category === 'certified' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {uav.category === 'certified' ? '型式認証あり' : '型式認証なし'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEdit(uav)}
                            className="w-full sm:w-auto"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setDeleteConfirmUAV(uav)}
                            className="w-full sm:w-auto text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>総飛行時間</span>
                          <span className="font-medium">{uav.totalFlightHours.toFixed(1)}時間</span>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">前回点検からの飛行時間</span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span>{uav.hoursSinceLastMaintenance.toFixed(1)}時間</span>
                              {maintenance.status === 'overdue' && (
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                          </div>
                          <Progress value={maintenanceProgress} className="h-2" />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>0時間</span>
                            <span className={`font-medium ${
                              maintenance.status === 'overdue' ? 'text-red-600' : 
                              maintenance.status === 'due-soon' ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                              {maintenance.text}
                            </span>
                            <span>20時間</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {inactiveUAVs.length > 0 && (
              <div>
                <button
                  onClick={() => setShowRetired(!showRetired)}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-3"
                >
                  {showRetired ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  退役済み機体 ({inactiveUAVs.length}台)
                </button>
                {showRetired && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {inactiveUAVs.map((uav) => (
                      <div key={uav.id} className="border border-dashed rounded-lg p-4 space-y-3 bg-gray-50">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate text-gray-600">{uav.nickname}</h4>
                            <p className="text-sm text-gray-500 truncate">
                              {uav.manufacturer} {uav.model}
                            </p>
                            <Badge variant="outline" className="text-xs mt-1 text-gray-500">
                              退役済み
                            </Badge>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          飛行記録: {getUAVFlightCount(uav)}件 / 総飛行時間: {uav.totalFlightHours.toFixed(1)}時間
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => onUpdateUAV(uav.id, { isActive: true })}
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
      <Dialog open={editingUAV !== null} onOpenChange={() => setEditingUAV(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>機体情報編集</DialogTitle>
            <DialogDescription>
              機体の情報を編集してください。
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-nickname">機体名 *</Label>
              <Input
                id="edit-nickname"
                value={formData.nickname}
                onChange={(e) => handleInputChange('nickname', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-registrationId">登録記号</Label>
              <Input
                id="edit-registrationId"
                value={formData.registrationId}
                onChange={(e) => handleInputChange('registrationId', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-manufacturer">メーカー *</Label>
              <Select onValueChange={(value) => handleInputChange('manufacturer', value)} value={formData.manufacturer}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DJI">DJI</SelectItem>
                  <SelectItem value="Autel">Autel</SelectItem>
                  <SelectItem value="Parrot">Parrot</SelectItem>
                  <SelectItem value="Skydio">Skydio</SelectItem>
                  <SelectItem value="その他">その他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-model">機種 *</Label>
              <Input
                id="edit-model"
                value={formData.model}
                onChange={(e) => handleInputChange('model', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">機体区分</Label>
              <Select onValueChange={(value: 'certified' | 'uncertified') => handleInputChange('category', value)} value={formData.category}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uncertified">型式認証なし</SelectItem>
                  <SelectItem value="certified">型式認証あり</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.category === 'certified' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-certificationNumber">型式認証番号</Label>
                  <Input
                    id="edit-certificationNumber"
                    value={formData.certificationNumber}
                    onChange={(e) => handleInputChange('certificationNumber', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-certificationDate">認証取得日</Label>
                  <Input
                    id="edit-certificationDate"
                    type="date"
                    value={formData.certificationDate}
                    onChange={(e) => handleInputChange('certificationDate', e.target.value)}
                  />
                </div>
              </>
            )}
            <Button type="submit" className="w-full">
              更新
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmUAV !== null} onOpenChange={() => setDeleteConfirmUAV(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteConfirmUAV && hasUAVFlights(deleteConfirmUAV) 
                ? '機体を退役させますか？' 
                : '機体を削除しますか？'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmUAV && hasUAVFlights(deleteConfirmUAV) ? (
                <>
                  <span className="font-medium">{deleteConfirmUAV.nickname}</span> には 
                  <span className="font-medium text-blue-600"> {getUAVFlightCount(deleteConfirmUAV)}件</span> の飛行記録があります。
                  <br /><br />
                  飛行記録を保持するため、完全削除はできません。
                  「退役」状態にすると、新しい飛行記録では選択できなくなりますが、既存の記録は保持されます。
                </>
              ) : (
                <>
                  <span className="font-medium">{deleteConfirmUAV?.nickname}</span> を完全に削除します。
                  この操作は取り消せません。
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirmUAV) {
                  if (hasUAVFlights(deleteConfirmUAV)) {
                    // 有飞行记录：只能退役
                    onUpdateUAV(deleteConfirmUAV.id, { isActive: false });
                  } else {
                    // 没有飞行记录：真正删除
                    onDeleteUAV(deleteConfirmUAV.id);
                  }
                  setDeleteConfirmUAV(null);
                }
              }}
              className={deleteConfirmUAV && hasUAVFlights(deleteConfirmUAV) 
                ? 'bg-amber-600 hover:bg-amber-700' 
                : 'bg-red-600 hover:bg-red-700'}
            >
              {deleteConfirmUAV && hasUAVFlights(deleteConfirmUAV) ? '退役させる' : '削除する'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}