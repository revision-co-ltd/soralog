// データエクスポートパネル - CSV/Excel/PDF対応
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Download, FileSpreadsheet, FileText, Package, Calendar, HardDrive } from 'lucide-react';
import { DatePicker } from './ui/date-picker';
import { LocalExportService } from '../services/local-export.service';

interface ExportPanelProps {
  drones?: Array<{ id: string; name: string; registrationMark: string }>;
}

export function ExportPanel({ drones = [] }: ExportPanelProps) {
  const [exportType, setExportType] = useState<'style1' | 'style2' | 'style3'>('style1');
  const [format, setFormat] = useState<'csv' | 'pdf'>('csv');
  const [droneId, setDroneId] = useState<string>('');
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      // 构建查询参数
      const params = new URLSearchParams();
      if (droneId && droneId !== 'all') params.append('droneId', droneId);
      if (fromDate) params.append('from', fromDate.toISOString());
      if (toDate) params.append('to', toDate.toISOString());

      // 确定API端点
      let endpoint = '';
      switch (exportType) {
        case 'style1':
          endpoint = `/api/export/flight-logs/${format}`;
          break;
        case 'style2':
          endpoint = `/api/export/daily-inspections/${format}`;
          break;
        case 'style3':
          endpoint = `/api/export/maintenance-records/${format}`;
          break;
      }

      const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${endpoint}?${params}`;

      // 下载文件
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // 从响应头获取文件名
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `export-${new Date().toISOString().split('T')[0]}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      } else {
        filename += format === 'csv' ? '.csv' : '.pdf';
      }

      // 下载文件
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      alert(`✅ ${filename} をダウンロードしました！`);
    } catch (error) {
      console.error('Export error:', error);
      alert('❌ エクスポートに失敗しました。\nサーバーが起動しているか確認してください。');
    } finally {
      setIsExporting(false);
    }
  };

  const getExportTypeLabel = () => {
    switch (exportType) {
      case 'style1':
        return '飛行記録（様式1）';
      case 'style2':
        return '日常点検記録（様式2）';
      case 'style3':
        return '点検整備記録（様式3）';
    }
  };

  // 🆕 ローカルエクスポート（localStorage から直接ダウンロード）
  const handleLocalExport = () => {
    try {
      switch (exportType) {
        case 'style1':
          LocalExportService.exportFlightLogsToCSV();
          break;
        case 'style2':
          LocalExportService.exportDailyInspectionsToCSV();
          break;
        case 'style3':
          LocalExportService.exportMaintenanceRecordsToCSV();
          break;
      }
    } catch (error) {
      console.error('Local export error:', error);
      alert('❌ エクスポートに失敗しました');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Download className="h-6 w-6 text-blue-600" />
          データエクスポート
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          国土交通省様式に準拠した CSV / PDF ファイルをダウンロード
        </p>
      </CardHeader>
      <CardContent className="space-y-8 md:space-y-6">
        {/* エクスポート種類選択 */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            📋 エクスポート種類
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => setExportType('style1')}
              className={`p-4 rounded-xl transition-all border-2 text-left ${
                exportType === 'style1'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
              }`}
            >
              <Package className={`h-6 w-6 mb-2 ${exportType === 'style1' ? 'text-white' : 'text-blue-600'}`} />
              <div className="font-medium">様式1</div>
              <div className="text-xs mt-1 opacity-80">飛行記録</div>
            </button>

            <button
              onClick={() => setExportType('style2')}
              className={`p-4 rounded-xl transition-all border-2 text-left ${
                exportType === 'style2'
                  ? 'bg-green-600 text-white border-green-600 shadow-lg'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-green-300'
              }`}
            >
              <FileText className={`h-6 w-6 mb-2 ${exportType === 'style2' ? 'text-white' : 'text-green-600'}`} />
              <div className="font-medium">様式2</div>
              <div className="text-xs mt-1 opacity-80">日常点検</div>
            </button>

            <button
              onClick={() => setExportType('style3')}
              className={`p-4 rounded-xl transition-all border-2 text-left ${
                exportType === 'style3'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-lg'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-amber-300'
              }`}
            >
              <FileSpreadsheet className={`h-6 w-6 mb-2 ${exportType === 'style3' ? 'text-white' : 'text-amber-600'}`} />
              <div className="font-medium">様式3</div>
              <div className="text-xs mt-1 opacity-80">点検整備</div>
            </button>
          </div>
        </div>

        <Separator />

        {/* フィルター設定 */}
        <div className="space-y-6 md:space-y-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            🔍 フィルター設定
          </h3>

          {/* 機体選択 */}
          {drones.length > 0 && (
            <div className="space-y-3 md:space-y-2">
              <Label htmlFor="drone">機体（任意）</Label>
              <Select value={droneId} onValueChange={setDroneId}>
                <SelectTrigger className="h-14 md:h-10">
                  <SelectValue placeholder="すべての機体" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべての機体</SelectItem>
                  {drones.map((drone) => (
                    <SelectItem key={drone.id} value={drone.id}>
                      {drone.name} ({drone.registrationMark})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 日付範囲 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-4">
            <div className="space-y-3 md:space-y-2">
              <Label htmlFor="fromDate">
                <Calendar className="h-4 w-4 inline mr-1" />
                開始日（任意）
              </Label>
              <DatePicker
                value={fromDate}
                onChange={(date) => setFromDate(date || undefined)}
                placeholder="開始日を選択"
              />
            </div>

            <div className="space-y-3 md:space-y-2">
              <Label htmlFor="toDate">
                <Calendar className="h-4 w-4 inline mr-1" />
                終了日（任意）
              </Label>
              <DatePicker
                value={toDate}
                onChange={(date) => setToDate(date || undefined)}
                placeholder="終了日を選択"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* ファイル形式選択 */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            💾 ファイル形式
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={() => setFormat('csv')}
              className={`p-4 rounded-xl transition-all border-2 flex items-center gap-3 ${
                format === 'csv'
                  ? 'bg-blue-50 border-blue-500'
                  : 'bg-white border-gray-200 hover:border-blue-300'
              }`}
            >
              <FileText className={`h-6 w-6 ${format === 'csv' ? 'text-blue-600' : 'text-gray-400'}`} />
              <div className="text-left">
                <div className="font-medium">CSV</div>
                <div className="text-xs text-muted-foreground">BOM付きUTF-8</div>
              </div>
            </button>

            <button
              onClick={() => setFormat('pdf')}
              className={`p-4 rounded-xl transition-all border-2 flex items-center gap-3 ${
                format === 'pdf'
                  ? 'bg-red-50 border-red-500'
                  : 'bg-white border-gray-200 hover:border-red-300'
              }`}
            >
              <FileText className={`h-6 w-6 ${format === 'pdf' ? 'text-red-600' : 'text-gray-400'}`} />
              <div className="text-left">
                <div className="font-medium">PDF</div>
                <div className="text-xs text-muted-foreground">A4横版、印刷最適化</div>
              </div>
            </button>
          </div>
        </div>

        {/* エクスポートボタン */}
        <div className="flex flex-col gap-4">
          {/* 🆕 ローカルエクスポートボタン（優先） */}
          <Button
            onClick={handleLocalExport}
            size="lg"
            className="w-full h-14 text-base md:h-12 md:text-sm bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
          >
            <HardDrive className="h-5 w-5 mr-2" />
            ローカルデータをCSVダウンロード（推奨）
          </Button>

          {/* サーバー経由エクスポート */}
          <Button
            onClick={handleExport}
            disabled={isExporting}
            size="lg"
            variant="outline"
            className="w-full h-14 text-base md:h-12 md:text-sm"
          >
            <Download className="h-5 w-5 mr-2" />
            {isExporting ? 'エクスポート中...' : 'サーバー経由でダウンロード'}
          </Button>

          {/* 情報表示 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>エクスポート内容:</strong> {getExportTypeLabel()}
              <br />
              <strong>ファイル形式:</strong> {format.toUpperCase()}
              <br />
              {droneId && (
                <>
                  <strong>機体:</strong> {drones.find(d => d.id === droneId)?.name || '選択中'}
                  <br />
                </>
              )}
              {fromDate && (
                <>
                  <strong>期間:</strong> {fromDate.toLocaleDateString('ja-JP')}
                  {toDate && ` 〜 ${toDate.toLocaleDateString('ja-JP')}`}
                </>
              )}
            </p>
          </div>
        </div>

        {/* 注意事項 */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-2 text-sm">📝 注意事項</h4>
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong className="text-green-600">🟢 ローカルデータをCSVダウンロード（推奨）:</strong></p>
            <p className="ml-4">• アプリ内で保存した全データをCSV形式で直接ダウンロード</p>
            <p className="ml-4">• サーバー不要、オフラインでも使用可能</p>
            <p className="ml-4">• Excel等で開けます（BOM付きUTF-8で日本語対応）</p>
            <p className="mt-2"><strong>⚪ サーバー経由でダウンロード:</strong></p>
            <p className="ml-4">• サーバーが起動している必要があります</p>
            <p className="ml-4">• PDF出力やフィルター機能が使用可能</p>
            <p className="ml-4">• 機体や期間を指定できます</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

