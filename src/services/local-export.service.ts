// 📦 ローカルエクスポートサービス - localStorage から直接データを読み取る

interface FlightLog {
  id: string;
  date: string;
  time?: string;
  duration: number;
  location: string;
  locationAddressDetail?: string;
  droneModel: string;
  weather: string;
  purpose: string;
  outline?: string; // 飛行概要
  notes: string;
  pilot: string;
  tokuteiFlightCategories?: string[];
  isTokuteiFlight?: boolean;
  flightPlanNotified?: boolean;
  clientName?: string;
  // 🆕 追加フィールド
  takeoffTime?: string;
  landingTime?: string;
  flightTimeMinutes?: number;
}

export class LocalExportService {
  /**
   * 📋 様式1：飛行記録のCSVエクスポート
   */
  static exportFlightLogsToCSV(): void {
    const flightsStr = localStorage.getItem('flightLogs');
    if (!flightsStr) {
      alert('❌ エクスポートするデータがありません');
      return;
    }

    const flights: FlightLog[] = JSON.parse(flightsStr);
    if (flights.length === 0) {
      alert('❌ エクスポートするデータがありません');
      return;
    }

    // UTF-8 BOM
    const BOM = '\uFEFF';
    
    // ヘッダー行 - 様式1標準フォーマット（バックエンドと同じ）
    const headers = [
      'No',
      '飛行年月日',
      '操縦者氏名',
      '操縦者技能証明番号',
      '無人航空機の登録記号',
      '機体名',
      '飛行目的',
      '飛行概要',
      '特定飛行',
      '飛行計画の通報',
      '離陸場所',
      '離陸時刻',
      '着陸場所',
      '着陸時刻',
      '飛行時間(分)',
      '総飛行時間(時間)',
      '飛行の安全に影響のあった事項',
      '不具合発生日',
      '不具合事項',
      '処置実施日',
      '処置内容',
      '確認者氏名',
    ].join(',');

    // データ行
    const rows = flights.map((flight, index) => {
      return [
        index + 1, // No
        this.formatDate(flight.date), // 飛行年月日
        this.escapeCSV(flight.pilot), // 操縦者氏名
        '', // 操縦者技能証明番号（localStorageにはない）
        '', // 無人航空機の登録記号（localStorageにはない）
        this.escapeCSV(flight.droneModel), // 機体名
        this.escapeCSV(flight.purpose), // 飛行目的
        this.escapeCSV(flight.outline || ''), // 飛行概要
        flight.isTokuteiFlight ? '○' : '', // 特定飛行
        flight.flightPlanNotified ? '○' : '', // 飛行計画の通報
        this.escapeCSV(flight.location), // 離陸場所
        flight.takeoffTime || flight.time || '', // 離陸時刻
        this.escapeCSV(flight.location), // 着陸場所（離陸と同じ場合）
        flight.landingTime || '', // 着陸時刻
        flight.duration || '', // 飛行時間(分)
        flight.duration ? (flight.duration / 60).toFixed(1) : '', // 総飛行時間(時間)
        this.escapeCSV(flight.notes), // 飛行の安全に影響のあった事項
        '', // 不具合発生日（localStorageにはない）
        '', // 不具合事項（localStorageにはない）
        '', // 処置実施日（localStorageにはない）
        '', // 処置内容（localStorageにはない）
        '', // 確認者氏名（localStorageにはない）
      ].join(',');
    });

    const csv = BOM + headers + '\n' + rows.join('\n');

    // ダウンロード
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `飛行記録_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    alert(`✅ 飛行記録をエクスポートしました！\n件数: ${flights.length}件`);
  }

  /**
   * 📋 様式2：日常点検記録のCSVエクスポート
   */
  static exportDailyInspectionsToCSV(): void {
    const inspectionsStr = localStorage.getItem('dailyInspections');
    if (!inspectionsStr) {
      alert('❌ エクスポートするデータがありません');
      return;
    }

    const inspections = JSON.parse(inspectionsStr);
    if (inspections.length === 0) {
      alert('❌ エクスポートするデータがありません');
      return;
    }

    const BOM = '\uFEFF';
    
    const headers = [
      '実施年月日',
      '機体',
      '実施者',
      '実施場所',
      '点検結果',
      '特記事項'
    ].join(',');

    const rows = inspections.map((inspection: any) => {
      return [
        this.formatDate(inspection.executionDate || inspection.createdAt),
        this.escapeCSV(inspection.droneId || ''),
        this.escapeCSV(inspection.operatorId || ''),
        this.escapeCSV(inspection.locationId || ''),
        '点検完了',
        this.escapeCSV(inspection.specialNote || '')
      ].join(',');
    });

    const csv = BOM + headers + '\n' + rows.join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `日常点検記録_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    alert(`✅ 日常点検記録をエクスポートしました！\n件数: ${inspections.length}件`);
  }

  /**
   * 📋 様式3：点検整備記録のCSVエクスポート
   */
  static exportMaintenanceRecordsToCSV(): void {
    const recordsStr = localStorage.getItem('maintenanceRecords');
    if (!recordsStr) {
      alert('❌ エクスポートするデータがありません');
      return;
    }

    const records = JSON.parse(recordsStr);
    if (records.length === 0) {
      alert('❌ エクスポートするデータがありません');
      return;
    }

    const BOM = '\uFEFF';
    
    const headers = [
      '実施年月日',
      '機体',
      '実施者',
      '実施場所',
      '作業内容',
      '総飛行時間',
      '備考'
    ].join(',');

    const rows = records.map((record: any) => {
      return [
        this.formatDate(record.executionDate || record.createdAt),
        this.escapeCSV(record.droneId || ''),
        this.escapeCSV(record.operatorId || ''),
        this.escapeCSV(record.locationId || ''),
        this.escapeCSV(record.workContent || ''),
        record.totalFlightTime || '',
        this.escapeCSV(record.note || '')
      ].join(',');
    });

    const csv = BOM + headers + '\n' + rows.join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `点検整備記録_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    alert(`✅ 点検整備記録をエクスポートしました！\n件数: ${records.length}件`);
  }

  /**
   * 🛠️ ヘルパー関数: 日付フォーマット
   */
  private static formatDate(date: string | Date): string {
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}/${month}/${day}`;
    } catch {
      return '';
    }
  }

  /**
   * 🛠️ ヘルパー関数: CSVエスケープ
   */
  private static escapeCSV(value: string | null | undefined): string {
    if (!value) return '';
    const str = String(value);
    // カンマ、改行、ダブルクォートを含む場合はダブルクォートで囲む
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
}

