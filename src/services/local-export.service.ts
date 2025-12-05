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
   * 📋 様式3：点検整備記録のCSVエクスポート（新フォーマット）
   * CSV字段: 点検整備ID, 作成年月日, 実施年月日, 点検整備総時間, 前回実施年月日,
   *          実施者ID, 実施者名, ドローンID, ドローン名, ドローン登録記号,
   *          実施場所ID, 実施場所名, 実施場所地番, 備考, 実施理由,
   *          点検整備内容(装備品等の交換), 点検整備内容(定期点検の実施),
   *          点検整備内容(装置等の取付け・取卸し記録), 点検整備内容(その他点検整備等)
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
    
    // 新しいCSVヘッダー（様式3標準フォーマット）
    const headers = [
      '点検整備ID',
      '作成年月日',
      '実施年月日',
      '点検整備総時間',
      '前回実施年月日',
      '実施者ID',
      '実施者名',
      'ドローンID',
      'ドローン名',
      'ドローン登録記号',
      '実施場所ID',
      '実施場所名',
      '実施場所地番',
      '備考',
      '実施理由',
      '点検整備内容(装備品等の交換)',
      '点検整備内容(定期点検の実施)',
      '点検整備内容(装置等の取付け・取卸し記録)',
      '点検整備内容(その他点検整備等)'
    ].join(',');

    const rows = records.map((record: any) => {
      return [
        this.escapeCSV(record.id || ''),                              // 点検整備ID
        this.formatDate(record.createdAt),                            // 作成年月日
        this.formatDate(record.executionDate),                        // 実施年月日
        this.escapeCSV(record.totalFlightTimeAtMoment || ''),         // 点検整備総時間
        this.formatDate(record.previousExecutionDate),                // 前回実施年月日
        this.escapeCSV(record.executorId || ''),                      // 実施者ID
        this.escapeCSV(record.executorName || ''),                    // 実施者名
        this.escapeCSV(record.droneId || ''),                         // ドローンID
        this.escapeCSV(record.droneName || ''),                       // ドローン名
        this.escapeCSV(record.droneRegistrationMark || ''),           // ドローン登録記号
        this.escapeCSV(record.executionPlaceId || ''),                // 実施場所ID
        this.escapeCSV(record.executionPlaceName || ''),              // 実施場所名
        this.escapeCSV(record.executionPlaceAddress || ''),           // 実施場所地番
        this.escapeCSV(record.remarks || record.note || ''),          // 備考
        this.escapeCSV(record.reason || ''),                          // 実施理由
        this.escapeCSV(record.contentEquipmentReplacement || ''),     // 装備品等の交換
        this.escapeCSV(record.contentRegularInspection || ''),        // 定期点検の実施
        this.escapeCSV(record.contentInstallationRemoval || ''),      // 装置等の取付け・取卸し記録
        this.escapeCSV(record.contentOther || record.workContent || '') // その他点検整備等
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
   * 📋 様式3：点検整備記録のPDFエクスポート
   * 国土交通省フォーマット準拠
   */
  static exportMaintenanceRecordsToPDF(droneRegistrationMark?: string): void {
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

    // ドローン登録記号でフィルタリング（指定がある場合）
    const filteredRecords = droneRegistrationMark
      ? records.filter((r: any) => r.droneRegistrationMark === droneRegistrationMark)
      : records;

    if (filteredRecords.length === 0) {
      alert('❌ 指定されたドローンの点検整備記録がありません');
      return;
    }

    // 登録記号を取得（最初のレコードから）
    const regMark = droneRegistrationMark || filteredRecords[0].droneRegistrationMark || '未登録';

    // HTML生成
    const html = this.generateMaintenanceRecordPDFHTML(filteredRecords, regMark);
    
    // 新しいウィンドウで開いて印刷
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }

  /**
   * 🛠️ 点検整備記録PDF用HTML生成
   */
  private static generateMaintenanceRecordPDFHTML(records: any[], registrationMark: string): string {
    const pageNumber = 'NR.1';
    
    // 点検整備内容を結合
    const formatMaintenanceDetail = (record: any): string => {
      const details: string[] = [];
      if (record.contentEquipmentReplacement) {
        details.push(record.contentEquipmentReplacement);
      }
      if (record.contentRegularInspection) {
        details.push(record.contentRegularInspection);
      }
      if (record.contentInstallationRemoval) {
        details.push(record.contentInstallationRemoval);
      }
      if (record.contentOther) {
        details.push(record.contentOther);
      }
      // 後方互換性: workContentがある場合
      if (details.length === 0 && record.workContent) {
        return record.workContent;
      }
      return details.join('\n');
    };

    // テーブル行を生成
    const tableRows = records.map((record: any) => `
      <tr>
        <td class="date-cell">${this.formatDateJapanese(record.executionDate)}</td>
        <td class="time-cell">${record.totalFlightTimeAtMoment || '0時間0分'}</td>
        <td class="detail-cell">${this.escapeHTML(formatMaintenanceDetail(record))}</td>
        <td class="reason-cell">${this.escapeHTML(record.reason || '')}</td>
        <td class="place-cell">${this.escapeHTML(record.executionPlaceName || record.executionPlaceAddress || '')}</td>
        <td class="engineer-cell">${this.escapeHTML(record.executorName || '')}</td>
        <td class="remarks-cell">${this.escapeHTML(record.remarks || '')}</td>
      </tr>
    `).join('');

    // 空の行を追加（12行まで）
    const emptyRows = Array(Math.max(0, 12 - records.length))
      .fill('')
      .map(() => `
        <tr>
          <td class="date-cell"></td>
          <td class="time-cell"></td>
          <td class="detail-cell"></td>
          <td class="reason-cell"></td>
          <td class="place-cell"></td>
          <td class="engineer-cell"></td>
          <td class="remarks-cell"></td>
        </tr>
      `).join('');

    return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>無人航空機の点検整備記録</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 10mm;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: "MS Gothic", "ヒラギノ角ゴ Pro", "Hiragino Kaku Gothic Pro", sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      padding: 10mm;
    }
    
    .header {
      margin-bottom: 5mm;
    }
    
    .form-title {
      font-size: 9pt;
      margin-bottom: 3mm;
    }
    
    .main-header {
      display: flex;
      align-items: flex-start;
      margin-bottom: 5mm;
    }
    
    .registration-box {
      border: 1px solid black;
      padding: 2mm 5mm;
      margin-right: 10mm;
      font-size: 9pt;
    }
    
    .registration-box .label {
      font-size: 8pt;
    }
    
    .registration-box .value {
      font-weight: bold;
      font-size: 12pt;
      margin-left: 10mm;
    }
    
    .title-section {
      flex: 1;
      text-align: center;
    }
    
    .main-title {
      font-size: 14pt;
      font-weight: bold;
      margin-bottom: 2mm;
    }
    
    .sub-title {
      font-size: 10pt;
    }
    
    .page-number {
      font-size: 9pt;
      margin-left: auto;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    
    th, td {
      border: 1px solid black;
      padding: 2mm;
      text-align: center;
      vertical-align: middle;
      font-size: 9pt;
    }
    
    th {
      background-color: #f5f5f5;
      font-weight: normal;
    }
    
    .th-bilingual {
      line-height: 1.2;
    }
    
    .th-bilingual .jp {
      display: block;
      font-size: 9pt;
    }
    
    .th-bilingual .en {
      display: block;
      font-size: 7pt;
    }
    
    .date-cell { width: 10%; }
    .time-cell { width: 8%; }
    .detail-cell { width: 30%; text-align: left; white-space: pre-wrap; }
    .reason-cell { width: 12%; }
    .place-cell { width: 18%; }
    .engineer-cell { width: 10%; }
    .remarks-cell { width: 12%; }
    
    tr {
      height: 20mm;
    }
    
    .footer-note {
      margin-top: 5mm;
      font-size: 8pt;
      line-height: 1.5;
    }
    
    @media print {
      body {
        padding: 0;
      }
      
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="form-title">（様式3）点検整備記録</div>
    
    <div class="main-header">
      <div class="registration-box">
        <span class="label">無人航空機の登録記号<br>REGISTRATION ID OF UAS</span>
        <span class="value">${this.escapeHTML(registrationMark)}</span>
      </div>
      
      <div class="title-section">
        <div class="main-title">無人航空機の点検整備記録</div>
        <div class="sub-title">INSPECTION AND MAINTENANCE RECORD OF UAS</div>
      </div>
      
      <div class="page-number">（${pageNumber}）</div>
    </div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th class="date-cell th-bilingual">
          <span class="jp">実施年月日</span>
          <span class="en">DATE</span>
        </th>
        <th class="time-cell th-bilingual">
          <span class="jp">総飛行時間※</span>
          <span class="en">TOTAL FLIGHT TIME</span>
        </th>
        <th class="detail-cell th-bilingual">
          <span class="jp">点検、修理、改造及び整備の内容</span>
          <span class="en">DETAIL</span>
        </th>
        <th class="reason-cell th-bilingual">
          <span class="jp">実施理由</span>
          <span class="en">REASON</span>
        </th>
        <th class="place-cell th-bilingual">
          <span class="jp">実施場所</span>
          <span class="en">PLACE</span>
        </th>
        <th class="engineer-cell th-bilingual">
          <span class="jp">実施者</span>
          <span class="en">ENGINEER</span>
        </th>
        <th class="remarks-cell th-bilingual">
          <span class="jp">備考</span>
          <span class="en">REMARKS</span>
        </th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
      ${emptyRows}
    </tbody>
  </table>
  
  <div class="footer-note">
    ※　前回の機体認証を受検するにあたり実施した点検整備以降の双飛行時間を記入する。機体認証を受けていない無人航空機は、点検整備作業を実施した時点での双飛行時間を記入するものとする
  </div>
</body>
</html>
    `;
  }

  /**
   * 🛠️ ヘルパー関数: 日本語日付フォーマット（YYYY年MM月DD日）
   */
  private static formatDateJapanese(date: string | Date | undefined): string {
    if (!date) return '';
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(d.getTime())) return '';
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const day = d.getDate();
      return `${year}年${month}月${day}日`;
    } catch {
      return '';
    }
  }

  /**
   * 🛠️ ヘルパー関数: HTMLエスケープ
   */
  private static escapeHTML(str: string | null | undefined): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\n/g, '<br>');
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

