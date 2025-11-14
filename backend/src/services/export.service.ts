// 導出サービス - CSV/Excel/PDF生成
import ExcelJS from 'exceljs';
import puppeteer from 'puppeteer';
import { prisma } from '../index';

interface FlightLogWithRelations {
  id: string;
  flightDate: Date;
  purpose: string;
  outline?: string | null;
  isTokuteiFlight: boolean;
  flightPlanNotified?: boolean | null;
  takeoffTime?: Date | null;
  landingTime?: Date | null;
  flightTimeMinutes?: number | null;
  totalFlightTimeSinceManufactured?: number | null;
  safetyImpactNote?: string | null;
  faultDate?: Date | null;
  faultDetail?: string | null;
  fixDate?: Date | null;
  fixDetail?: string | null;
  drone: { name: string; registrationMark?: string | null };
  operator: { name: string; licenseNumber?: string | null };
  takeoffLocation?: { name: string; address?: string | null } | null;
  landingLocation?: { name: string; address?: string | null } | null;
  confirmer?: { name: string } | null;
}

interface DailyInspectionWithRelations {
  id: string;
  executionDate: Date;
  type: string;
  resultAirframe: string;
  resultPropeller: string;
  resultFrame: string;
  resultMountedEquipment: string | null;
  resultCommunication: string;
  resultPropulsion: string;
  resultPower: string;
  resultControl: string;
  resultController: string;
  resultBattery: string;
  resultRemoteId: string;
  resultLights: string;
  resultCamera: string;
  resultPreFlightSnow: string | null;
  resultPreFlightAttachment: string | null;
  resultPreFlightDamage: string | null;
  resultPreFlightHeat: string | null;
  noteAirframe?: string | null;
  notePropeller?: string | null;
  noteFrame?: string | null;
  noteMountedEquipment?: string | null;
  noteCommunication?: string | null;
  notePropulsion?: string | null;
  notePower?: string | null;
  noteControl?: string | null;
  noteController?: string | null;
  noteBattery?: string | null;
  noteRemoteId?: string | null;
  noteLights?: string | null;
  noteCamera?: string | null;
  notePreFlightSnow?: string | null;
  notePreFlightAttachment?: string | null;
  notePreFlightDamage?: string | null;
  notePreFlightHeat?: string | null;
  specialNote?: string | null;
  drone: { name: string; registrationMark?: string | null };
  executor: { name: string };
  executionPlace?: { name: string } | null;
}

interface MaintenanceRecordWithRelations {
  id: string;
  executionDate: Date;
  totalFlightTimeAtMoment: number;
  workContent: string;
  reason?: string | null;
  nextDueNote?: string | null;
  drone: { name: string; registrationMark?: string | null };
  executor: { name: string };
  executionPlace?: { name: string } | null;
}

export class ExportService {
  // ==================== CSV Export ====================
  
  static generateFlightLogCSV(data: FlightLogWithRelations[]): string {
    const BOM = '\uFEFF'; // UTF-8 BOM
    
    const headers = [
      'No',
      '飛行年月日',
      '操縦者氏名',
      '操縦者技能証明番号',
      '無人航空機の登録記号',
      '機体名',
      '飛行目的',
      '飛行経路',
      '特定飛行',
      '飛行計画通報',
      '離陸場所',
      '離陸時刻',
      '着陸場所',
      '着陸時刻',
      '飛行時間（分）',
      '総飛行時間（時間）',
      '飛行の安全に影響のあった事項',
      '不具合発生日',
      '不具合事項',
      '処置実施日',
      '処置内容',
      '確認者氏名',
    ].join(',');

    const rows = data.map((log, index) => {
      return [
        index + 1,
        this.formatDate(log.flightDate),
        log.operator.name,
        log.operator.licenseNumber || '',
        log.drone.registrationMark || '',
        log.drone.name,
        log.purpose,
        log.outline || '',
        log.isTokuteiFlight ? '特定飛行' : '非特定飛行',
        log.flightPlanNotified ? '通報済' : '通報なし',
        log.takeoffLocation?.name || '',
        log.takeoffTime ? this.formatTime(log.takeoffTime) : '',
        log.landingLocation?.name || '',
        log.landingTime ? this.formatTime(log.landingTime) : '',
        log.flightTimeMinutes || '',
        log.totalFlightTimeSinceManufactured || '',
        this.escapeCSV(log.safetyImpactNote),
        log.faultDate ? this.formatDate(log.faultDate) : '',
        this.escapeCSV(log.faultDetail),
        log.fixDate ? this.formatDate(log.fixDate) : '',
        this.escapeCSV(log.fixDetail),
        log.confirmer?.name || '',
      ].join(',');
    });

    return BOM + headers + '\n' + rows.join('\n');
  }

  static generateDailyInspectionCSV(data: DailyInspectionWithRelations[]): string {
    const BOM = '\uFEFF';
    
    const headers = [
      'No',
      '実施年月日',
      '点検種類',
      '登録記号',
      '機体名',
      '機体全般',
      'プロペラ',
      'フレーム',
      '機体搭載装置',
      '通信系統',
      '推進系統',
      '電源系統',
      '自動制御系統',
      '操縦装置',
      'バッテリー・燃料',
      'リモートID',
      '灯火',
      'カメラ',
      '（飛行前点検）機体に雪等の付着はないか',
      '（飛行前点検）各機器の取付状態',
      '（飛行前点検）損傷・ゆがみの有無',
      '（飛行前点検）異常な発熱の有無',
      '特記事項',
      '実施者',
      '実施場所',
    ].join(',');

    const rows = data.map((inspection, index) => {
      return [
        index + 1,
        this.formatDate(inspection.executionDate),
        inspection.type === 'PRE_FLIGHT' ? '飛行前' : '飛行後',
        inspection.drone.registrationMark || '',
        inspection.drone.name,
        this.formatInspectionResult(inspection.resultAirframe, inspection.noteAirframe),
        this.formatInspectionResult(inspection.resultPropeller, inspection.notePropeller),
        this.formatInspectionResult(inspection.resultFrame, inspection.noteFrame),
        this.formatInspectionResult(inspection.resultMountedEquipment, inspection.noteMountedEquipment),
        this.formatInspectionResult(inspection.resultCommunication, inspection.noteCommunication),
        this.formatInspectionResult(inspection.resultPropulsion, inspection.notePropulsion),
        this.formatInspectionResult(inspection.resultPower, inspection.notePower),
        this.formatInspectionResult(inspection.resultControl, inspection.noteControl),
        this.formatInspectionResult(inspection.resultController, inspection.noteController),
        this.formatInspectionResult(inspection.resultBattery, inspection.noteBattery),
        this.formatInspectionResult(inspection.resultRemoteId, inspection.noteRemoteId),
        this.formatInspectionResult(inspection.resultLights, inspection.noteLights),
        this.formatInspectionResult(inspection.resultCamera, inspection.noteCamera),
        this.formatInspectionResult(inspection.resultPreFlightSnow, inspection.notePreFlightSnow),
        this.formatInspectionResult(inspection.resultPreFlightAttachment, inspection.notePreFlightAttachment),
        this.formatInspectionResult(inspection.resultPreFlightDamage, inspection.notePreFlightDamage),
        this.formatInspectionResult(inspection.resultPreFlightHeat, inspection.notePreFlightHeat),
        this.escapeCSV(inspection.specialNote),
        inspection.executor.name,
        inspection.executionPlace?.name || '',
      ].join(',');
    });

    return BOM + headers + '\n' + rows.join('\n');
  }

  static generateMaintenanceRecordCSV(data: MaintenanceRecordWithRelations[]): string {
    const BOM = '\uFEFF';
    
    const headers = [
      'No',
      '実施年月日',
      '登録記号',
      '機体名',
      '総飛行時間（時間）',
      '点検・整備内容',
      '実施理由',
      '次回実施予定',
      '実施者',
      '実施場所',
    ].join(',');

    const rows = data.map((record, index) => {
      return [
        index + 1,
        this.formatDate(record.executionDate),
        record.drone.registrationMark || '',
        record.drone.name,
        record.totalFlightTimeAtMoment.toFixed(1),
        this.escapeCSV(record.workContent),
        this.escapeCSV(record.reason),
        this.escapeCSV(record.nextDueNote),
        record.executor.name,
        record.executionPlace?.name || '',
      ].join(',');
    });

    return BOM + headers + '\n' + rows.join('\n');
  }

  // ==================== Excel Export ====================
  
  static async generateFlightLogExcel(data: FlightLogWithRelations[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('飛行記録', {
      pageSetup: {
        paperSize: 9, // A4
        orientation: 'landscape', // 横向き
        fitToPage: true,
        fitToWidth: 1,
        margins: {
          left: 0.5,
          right: 0.5,
          top: 0.75,
          bottom: 0.75,
          header: 0.3,
          footer: 0.3,
        },
      },
    });

    // ヘッダー行
    const headers = [
      'No',
      '飛行年月日',
      '操縦者氏名',
      '技能証明番号',
      '登録記号',
      '機体名',
      '飛行目的',
      '飛行経路',
      '特定飛行',
      '離陸場所',
      '離陸時刻',
      '着陸場所',
      '着陸時刻',
      '飛行時間(分)',
      '総飛行時間(h)',
      '安全影響事項',
      '不具合日',
      '不具合内容',
      '処置日',
      '処置内容',
      '確認者',
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.font = { bold: true, size: 10 };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    headerRow.height = 30;

    // 列幅設定
    sheet.columns = [
      { width: 5 },  // No
      { width: 11 }, // 飛行年月日
      { width: 12 }, // 操縦者氏名
      { width: 12 }, // 技能証明番号
      { width: 12 }, // 登録記号
      { width: 12 }, // 機体名
      { width: 15 }, // 飛行目的
      { width: 20 }, // 飛行経路
      { width: 10 }, // 特定飛行
      { width: 15 }, // 離陸場所
      { width: 9 },  // 離陸時刻
      { width: 15 }, // 着陸場所
      { width: 9 },  // 着陸時刻
      { width: 10 }, // 飛行時間
      { width: 10 }, // 総飛行時間
      { width: 20 }, // 安全影響事項
      { width: 11 }, // 不具合日
      { width: 20 }, // 不具合内容
      { width: 11 }, // 処置日
      { width: 20 }, // 処置内容
      { width: 12 }, // 確認者
    ];

    // データ行
    data.forEach((log, index) => {
      const row = sheet.addRow([
        index + 1,
        this.formatDate(log.flightDate),
        log.operator.name,
        log.operator.licenseNumber || '',
        log.drone.registrationMark || '',
        log.drone.name,
        log.purpose,
        log.outline || '',
        log.isTokuteiFlight ? '特定' : '非特定',
        log.takeoffLocation?.name || '',
        log.takeoffTime ? this.formatTime(log.takeoffTime) : '',
        log.landingLocation?.name || '',
        log.landingTime ? this.formatTime(log.landingTime) : '',
        log.flightTimeMinutes || '',
        log.totalFlightTimeSinceManufactured || '',
        log.safetyImpactNote || '',
        log.faultDate ? this.formatDate(log.faultDate) : '',
        log.faultDetail || '',
        log.fixDate ? this.formatDate(log.fixDate) : '',
        log.fixDetail || '',
        log.confirmer?.name || '',
      ]);

      row.alignment = { vertical: 'top', wrapText: true };
      row.font = { size: 9 };
      row.height = 25;

      // 罫線
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // ヘッダー行に罫線
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    return await workbook.xlsx.writeBuffer() as Buffer;
  }

  static async generateDailyInspectionExcel(data: DailyInspectionWithRelations[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('日常点検記録', {
      pageSetup: {
        paperSize: 9,
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75 },
      },
    });

    const headers = [
      'No',
      '実施日',
      '種類',
      '登録記号',
      '機体名',
      '機体全般',
      'プロペラ',
      'フレーム',
      '機体搭載装置',
      '通信系統',
      '推進系統',
      '電源系統',
      '自動制御系統',
      '操縦装置',
      'バッテリー・燃料',
      'リモートID機能',
      '灯火',
      'カメラ',
      '（飛行前）雪等の付着',
      '（飛行前）取付状態',
      '（飛行前）損傷・ゆがみ',
      '（飛行前）異常な発熱',
      '特記事項',
      '実施者',
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.font = { bold: true, size: 10 };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    headerRow.height = 30;

    sheet.columns = [
      { width: 5 },
      { width: 11 },
      { width: 8 },
      { width: 12 },
      { width: 12 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 12 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 14 },
      { width: 14 },
      { width: 14 },
      { width: 14 },
      { width: 25 },
      { width: 12 },
    ];

    data.forEach((inspection, index) => {
      const row = sheet.addRow([
        index + 1,
        this.formatDate(inspection.executionDate),
        inspection.type === 'PRE_FLIGHT' ? '飛行前' : '飛行後',
        inspection.drone.registrationMark || '',
        inspection.drone.name,
        this.normalizeInspectionResult(inspection.resultAirframe),
        this.normalizeInspectionResult(inspection.resultPropeller),
        this.normalizeInspectionResult(inspection.resultFrame),
        this.normalizeInspectionResult(inspection.resultMountedEquipment),
        this.normalizeInspectionResult(inspection.resultCommunication),
        this.normalizeInspectionResult(inspection.resultPropulsion),
        this.normalizeInspectionResult(inspection.resultPower),
        this.normalizeInspectionResult(inspection.resultControl),
        this.normalizeInspectionResult(inspection.resultController),
        this.normalizeInspectionResult(inspection.resultBattery),
        this.normalizeInspectionResult(inspection.resultRemoteId),
        this.normalizeInspectionResult(inspection.resultLights),
        this.normalizeInspectionResult(inspection.resultCamera),
        this.normalizeInspectionResult(inspection.resultPreFlightSnow),
        this.normalizeInspectionResult(inspection.resultPreFlightAttachment),
        this.normalizeInspectionResult(inspection.resultPreFlightDamage),
        this.normalizeInspectionResult(inspection.resultPreFlightHeat),
        inspection.specialNote || '',
        inspection.executor.name,
      ]);

      row.alignment = { vertical: 'top', wrapText: true };
      row.font = { size: 9 };
      row.height = 25;

      row.eachCell((cell, colNum) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };

        // 結果セルの色付け
        if (colNum >= 6 && colNum <= 22) {
          const value = cell.value?.toString();
          if (value === '異常なし') {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFD4EDDA' },
            };
          } else if (value === '異常') {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF8D7DA' },
            };
          }
        }
      });
    });

    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    return await workbook.xlsx.writeBuffer() as Buffer;
  }

  static async generateMaintenanceRecordExcel(data: MaintenanceRecordWithRelations[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('点検整備記録', {
      pageSetup: {
        paperSize: 9,
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75 },
      },
    });

    const headers = [
      'No',
      '実施年月日',
      '登録記号',
      '機体名',
      '総飛行時間(h)',
      '点検・整備内容',
      '実施理由',
      '次回実施予定',
      '実施者',
      '実施場所',
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.font = { bold: true, size: 10 };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    headerRow.height = 30;

    sheet.columns = [
      { width: 5 },
      { width: 11 },
      { width: 12 },
      { width: 15 },
      { width: 12 },
      { width: 40 },
      { width: 15 },
      { width: 25 },
      { width: 12 },
      { width: 15 },
    ];

    data.forEach((record, index) => {
      const row = sheet.addRow([
        index + 1,
        this.formatDate(record.executionDate),
        record.drone.registrationMark || '',
        record.drone.name,
        record.totalFlightTimeAtMoment.toFixed(1),
        record.workContent,
        record.reason || '',
        record.nextDueNote || '',
        record.executor.name,
        record.executionPlace?.name || '',
      ]);

      row.alignment = { vertical: 'top', wrapText: true };
      row.font = { size: 9 };
      row.height = 40;

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    return await workbook.xlsx.writeBuffer() as Buffer;
  }

  // ==================== PDF Export ====================
  
  static async generateFlightLogPDF(data: FlightLogWithRelations[], organizationName: string = '組織名'): Promise<Buffer> {
    const html = this.generateFlightLogHTML(data, organizationName);
    return await this.htmlToPDF(html, { landscape: true });
  }

  static async generateDailyInspectionPDF(data: DailyInspectionWithRelations[], organizationName: string = '組織名'): Promise<Buffer> {
    const html = this.generateDailyInspectionHTML(data, organizationName);
    return await this.htmlToPDF(html, { landscape: false });
  }

  static async generateMaintenanceRecordPDF(data: MaintenanceRecordWithRelations[], organizationName: string = '組織名'): Promise<Buffer> {
    const html = this.generateMaintenanceRecordHTML(data, organizationName);
    return await this.htmlToPDF(html, { landscape: true });
  }

  private static generateFlightLogHTML(data: FlightLogWithRelations[], organizationName: string): string {
    const rows = data.map((log, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${this.formatDate(log.flightDate)}</td>
        <td>${log.operator.name}</td>
        <td>${log.operator.licenseNumber || ''}</td>
        <td>${log.drone.registrationMark || ''}</td>
        <td>${log.drone.name}</td>
        <td>${log.purpose}</td>
        <td>${log.outline || ''}</td>
        <td>${log.isTokuteiFlight ? '特定' : '非特定'}</td>
        <td>${log.takeoffLocation?.name || ''}</td>
        <td>${log.takeoffTime ? this.formatTime(log.takeoffTime) : ''}</td>
        <td>${log.landingLocation?.name || ''}</td>
        <td>${log.landingTime ? this.formatTime(log.landingTime) : ''}</td>
        <td>${log.flightTimeMinutes || ''}</td>
        <td>${log.totalFlightTimeSinceManufactured || ''}</td>
        <td>${log.safetyImpactNote || ''}</td>
        <td>${log.confirmer?.name || ''}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <style>
          @page { size: A4 landscape; margin: 15mm; }
          body { font-family: 'Noto Sans JP', sans-serif; font-size: 8pt; margin: 0; }
          h1 { text-align: center; font-size: 14pt; margin: 10px 0; }
          .org-name { text-align: right; font-size: 10pt; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #333; padding: 4px; text-align: center; }
          th { background-color: #e0e0e0; font-weight: bold; font-size: 7pt; }
          td { font-size: 7pt; }
          .date-printed { text-align: right; font-size: 8pt; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="org-name">${organizationName}</div>
        <h1>飛行記録（様式1）</h1>
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>飛行年月日</th>
              <th>操縦者氏名</th>
              <th>技能証明番号</th>
              <th>登録記号</th>
              <th>機体名</th>
              <th>飛行目的</th>
              <th>飛行経路</th>
              <th>特定飛行</th>
              <th>離陸場所</th>
              <th>離陸時刻</th>
              <th>着陸場所</th>
              <th>着陸時刻</th>
              <th>飛行時間(分)</th>
              <th>総飛行時間(h)</th>
              <th>安全影響事項</th>
              <th>確認者</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <div class="date-printed">出力日: ${new Date().toLocaleDateString('ja-JP')}</div>
      </body>
      </html>
    `;
  }

  private static generateDailyInspectionHTML(data: DailyInspectionWithRelations[], organizationName: string): string {
    const records = data.map((inspection) => {
      const inspectionRows = [
        {
          label: '機体全般',
          description: '機体の取付け状態（ネジ、コネクタ、ケーブル等）',
          result: inspection.resultAirframe,
          note: inspection.noteAirframe,
        },
        {
          label: 'プロペラ',
          description: '外観、損傷、ゆがみ',
          result: inspection.resultPropeller,
          note: inspection.notePropeller,
        },
        {
          label: 'フレーム',
          description: '外観、損傷、ゆがみ',
          result: inspection.resultFrame,
          note: inspection.noteFrame,
        },
        {
          label: '機体搭載装置',
          description: '機械または装置の装着部の健全性',
          result: inspection.resultMountedEquipment,
          note: inspection.noteMountedEquipment,
        },
        {
          label: '通信系統',
          description: '通信機器の健全性',
          result: inspection.resultCommunication,
          note: inspection.noteCommunication,
        },
        {
          label: '推進系統',
          description: 'モーター又は関連機器の健全性',
          result: inspection.resultPropulsion,
          note: inspection.notePropulsion,
        },
        {
          label: '電源系統',
          description: '機体及び操縦機器の電源の健全性',
          result: inspection.resultPower,
          note: inspection.notePower,
        },
        {
          label: '自動制御系統',
          description: '飛行制御機器の健全性',
          result: inspection.resultControl,
          note: inspection.noteControl,
        },
        {
          label: '操縦装置',
          description: '外観、スティックの健全性、スイッチの健全性',
          result: inspection.resultController,
          note: inspection.noteController,
        },
        {
          label: 'バッテリー・燃料',
          description: 'バッテリーの充電状況・残量状態の健全性',
          result: inspection.resultBattery,
          note: inspection.noteBattery,
        },
        {
          label: 'リモートID機能',
          description: 'リモートID機能の健全性（常時機能）',
          result: inspection.resultRemoteId,
          note: inspection.noteRemoteId,
        },
        {
          label: '灯火',
          description: '外観、灯火の健全性（夜間飛行）',
          result: inspection.resultLights,
          note: inspection.noteLights,
        },
        {
          label: 'カメラ',
          description: '外観、カメラの健全性（目視外飛行）',
          result: inspection.resultCamera,
          note: inspection.noteCamera,
        },
        {
          label: '（飛行前点検）機体に雪等の付着はないか',
          description: '',
          result: inspection.resultPreFlightSnow,
          note: inspection.notePreFlightSnow,
        },
        {
          label: '（飛行前点検）各機器は確実に取り付けられているか',
          description: 'ネジの緩み等を確認',
          result: inspection.resultPreFlightAttachment,
          note: inspection.notePreFlightAttachment,
        },
        {
          label: '（飛行前点検）機体に損傷やゆがみはないか',
          description: '',
          result: inspection.resultPreFlightDamage,
          note: inspection.notePreFlightDamage,
        },
        {
          label: '（飛行前点検）各機器の異常な発熱はないか',
          description: '',
          result: inspection.resultPreFlightHeat,
          note: inspection.notePreFlightHeat,
        },
      ];

      const rowsHtml = inspectionRows
        .map((item) => {
          const resultText = this.normalizeInspectionResult(item.result);
          const resultClass = resultText === '異常' ? 'ng' : resultText === '異常なし' ? 'ok' : '';
          const noteHtml = item.note ? this.escapeHTML(item.note).replace(/\n/g, '<br>') : '&nbsp;';

          return `
            <tr>
              <th>
                <div class="item-label">${this.escapeHTML(item.label)}</div>
                ${item.description ? `<div class="item-desc">${this.escapeHTML(item.description)}</div>` : ''}
              </th>
              <td class="result ${resultClass}">${resultText || '&nbsp;'}</td>
              <td class="remarks">${noteHtml}</td>
            </tr>
          `;
        })
        .join('');

      const specialNoteHtml = inspection.specialNote
        ? this.escapeHTML(inspection.specialNote).replace(/\n/g, '<br>')
        : '&nbsp;';

      const organizationHeader = organizationName ? `<div class="org-name">${this.escapeHTML(organizationName)}</div>` : '';
      const registrationMark = inspection.drone.registrationMark || '';
      const droneName = inspection.drone.name || '';
      const inspectionTypeLabel = inspection.type === 'PRE_FLIGHT' ? '飛行前点検' : '飛行後点検';
      const executionPlace = inspection.executionPlace?.name || '';

      return `
        <div class="record">
          ${organizationHeader}
          <table class="header-table">
            <tr>
              <td class="registration-cell">
                <div class="registration-label">
                  無人航空機の登録記号
                  <span class="en-label">REGISTRATION ID OF UAS</span>
                </div>
                <div class="registration-value">${this.escapeHTML(registrationMark)}</div>
              </td>
              <td class="title-cell">
                <div class="title-jp">無人航空機の日常点検記録</div>
                <div class="title-en">DAILY INSPECTION RECORD OF UAS</div>
                <div class="title-code">(NR.1)</div>
              </td>
            </tr>
          </table>

          <table class="info-table">
            <tr>
              <th>機体名</th>
              <td>${this.escapeHTML(droneName)}</td>
              <th>点検種類</th>
              <td>${inspectionTypeLabel}</td>
            </tr>
          </table>

          <table class="inspection-table">
            <thead>
              <tr>
                <th>
                  点検項目
                  <span class="en-label">INSPECTION ITEMS</span>
                </th>
                <th>
                  結果
                  <span class="en-label">RESULT</span>
                </th>
                <th>
                  備考
                  <span class="en-label">REMARKS</span>
                </th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="notes-box">
            <div class="notes-label">特記事項 NOTES</div>
            <div class="notes-value">${specialNoteHtml}</div>
          </div>

          <table class="footer-table">
            <tr>
              <th>実施場所 PLACE</th>
              <td>${this.escapeHTML(executionPlace)}</td>
              <th>実施年月日 DATE</th>
              <td>${this.formatDate(inspection.executionDate)}</td>
              <th>実施者 INSPECTOR</th>
              <td>${this.escapeHTML(inspection.executor.name)}</td>
            </tr>
          </table>
        </div>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html lang="ja">
        <head>
          <meta charset="UTF-8" />
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body { font-family: 'Noto Sans JP', sans-serif; font-size: 8.5pt; margin: 0; color: #000; }
            .record { page-break-after: always; padding-bottom: 12mm; }
            .record:last-child { page-break-after: auto; }
            .org-name { text-align: right; font-size: 8pt; margin-bottom: 6px; color: #333; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 6mm; }
            .registration-cell { width: 36%; border: 1px solid #333; vertical-align: top; }
            .registration-label { font-size: 8pt; font-weight: bold; border-bottom: 1px solid #333; padding: 6px; text-align: center; }
            .en-label { display: block; font-size: 7pt; font-weight: normal; margin-top: 2px; }
            .registration-value { font-size: 16pt; letter-spacing: 2px; text-align: center; padding: 16px 4px; font-weight: bold; }
            .title-cell { border: 1px solid #333; text-align: center; padding: 10px 4px; }
            .title-jp { font-size: 16pt; font-weight: bold; }
            .title-en { font-size: 9pt; margin-top: 4px; }
            .title-code { font-size: 9pt; margin-top: 4px; }
            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 6mm; }
            .info-table th, .info-table td { border: 1px solid #333; padding: 4px 6px; font-size: 8pt; text-align: left; }
            .info-table th { background: #f7f7f7; width: 18%; }
            .inspection-table { width: 100%; border-collapse: collapse; }
            .inspection-table thead th { background: #f0f0f0; font-size: 8pt; border: 1px solid #333; padding: 6px; }
            .inspection-table th { width: 60%; text-align: left; vertical-align: top; border: 1px solid #333; padding: 6px; }
            .inspection-table td { border: 1px solid #333; padding: 6px; font-size: 8pt; vertical-align: top; }
            .item-label { font-weight: bold; font-size: 8.5pt; }
            .item-desc { font-weight: normal; font-size: 7pt; margin-top: 2px; color: #333; }
            .result { text-align: center; font-size: 9pt; font-weight: bold; }
            .result.ok { background: #f3faf3; color: #1b5e20; }
            .result.ng { background: #fdecea; color: #b71c1c; }
            .remarks { font-size: 8pt; }
            .notes-box { border: 1px solid #333; margin-top: 8mm; }
            .notes-label { border-bottom: 1px solid #333; padding: 4px 6px; font-weight: bold; font-size: 8pt; background: #f7f7f7; }
            .notes-value { min-height: 40px; padding: 6px; font-size: 8pt; }
            .footer-table { width: 100%; border-collapse: collapse; margin-top: 6mm; }
            .footer-table th, .footer-table td { border: 1px solid #333; padding: 4px 6px; font-size: 8pt; text-align: left; }
            .footer-table th { background: #f7f7f7; width: 18%; }
          </style>
        </head>
        <body>
          ${records}
        </body>
      </html>
    `;
  }

  private static generateMaintenanceRecordHTML(data: MaintenanceRecordWithRelations[], organizationName: string): string {
    
    const fallbackRecord: MaintenanceRecordWithRelations = {
      id: 'sample-record',
      executionDate: new Date('2025-09-17'),
      totalFlightTimeAtMoment: 0,
      workContent: '【サンプル】プロペラ4枚交換／固定トルク確認／動作確認飛行',
      reason: '定期点検',
      nextDueNote: '次回整備: 2026年03月（100時間点検）',
      remarks: '天候: 晴れ／整備責任者: 山田太郎',
      drone: {
        name: 'SoraLog Demo機',
        registrationMark: 'JU-000001',
      },
      executor: { name: '山田太郎' },
      executionPlace: { name: '神奈川県川崎市久本1丁目' },
    } as MaintenanceRecordWithRelations;

    const displayData = data.length > 0 ? data : [fallbackRecord];

    const registrationMark = displayData[0].drone.registrationMark || 'JU';
    
    const rowsHtml = displayData.map((record) => `
      <tr>
        <td style="width: 10%; text-align: center;">${this.formatDate(record.executionDate)}</td>
        <td style="width: 8%; text-align: center;">${record.totalFlightTimeAtMoment ? Math.floor(record.totalFlightTimeAtMoment) + '時間' + Math.round((record.totalFlightTimeAtMoment % 1) * 60) + '分' : '0時間0分'}</td>
        <td style="width: 30%; text-align: left; padding: 4px; white-space: pre-wrap;">${record.workContent}</td>
        <td style="width: 12%; text-align: center;">${record.reason || ''}</td>
        <td style="width: 12%; text-align: center;">${record.executionPlace?.name || ''}</td>
        <td style="width: 10%; text-align: center;">${record.executor.name}</td>
        <td style="width: 18%; text-align: left; padding: 4px;">${record.remarks || record.nextDueNote || ''}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <style>
          @page { size: A4 landscape; margin: 8mm 10mm; }
          body { font-family: 'MS Gothic', 'Noto Sans JP', sans-serif; font-size: 9pt; margin: 0; padding: 4px; }
          .form-number { text-align: left; font-size: 10pt; margin-bottom: 3px; }
          .header-box { border: 2px solid #000; padding: 5px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; }
          .header-left { flex: 1; }
          .header-center { flex: 2; text-align: center; }
          .header-right { flex: 1; text-align: right; }
          .registration-label { font-size: 8pt; margin-bottom: 2px; line-height: 1.2; }
          .registration-id { font-size: 12pt; font-weight: bold; text-align: center; padding: 3px; border: 1px solid #000; margin-top: 2px; }
          .title-jp { font-size: 11pt; font-weight: bold; margin-bottom: 1px; }
          .title-en { font-size: 9pt; margin-bottom: 1px; }
          .nr-label { font-size: 8pt; }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; }
          th, td { border: 1px solid #000; padding: 4px; vertical-align: top; }
          th { background-color: #fff; font-weight: bold; font-size: 8pt; text-align: center; line-height: 1.2; }
          td { font-size: 8pt; }
          .footer-note { margin-top: 6px; font-size: 7pt; line-height: 1.3; }
        </style>
      </head>
      <body>
        <div class="form-number">（様式3）点検整備記録</div>
        <div class="header-box">
          <div class="header-left">
            <div class="registration-label">無人航空機の登録記号<br>REGISTRATION ID OF UAS</div>
            <div class="registration-id">${registrationMark}</div>
          </div>
          <div class="header-center">
            <div class="title-jp">無人航空機の点検整備記録</div>
            <div class="title-en">INSPECTION AND MAINTENANCE RECORD OF UAS</div>
          </div>
          <div class="header-right">
            <div class="nr-label">(NR.1)</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 10%;">実施年月日<br>DATE</th>
              <th style="width: 8%;">総飛行時間※<br>TOTAL FLIGHT<br>TIME</th>
              <th style="width: 30%;">点検、修理、改造及び整備の内容<br>DETAIL</th>
              <th style="width: 12%;">実施理由<br>REASON</th>
              <th style="width: 12%;">実施場所<br>PLACE</th>
              <th style="width: 10%;">実施者<br>ENGINEER</th>
              <th style="width: 18%;">備考<br>REMARKS</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            ${Array(Math.max(0, 8 - displayData.length)).fill(0).map(() => `
              <tr>
                <td style="height: 28px;">&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer-note">
          ※ 前回の機体認証を受検するにあたり実施した点検整備以降の双飛行時間を記入する。機体認証を受けていない無人航空機は、点検整備作業を実施した時点での双飛行時間を記入するものとする
        </div>
      </body>
      </html>
    `;
    
    return html;
  }

  private static async htmlToPDF(html: string, options: { landscape?: boolean } = {}): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      landscape: options.landscape ?? true,
      printBackground: true,
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm',
      },
    });

    await browser.close();
    return Buffer.from(pdf);
  }

  // ==================== Helper Functions ====================
  
  private static formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  private static formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private static escapeCSV(value: string | null | undefined): string {
    if (!value) return '';
    const escaped = value.replace(/"/g, '""');
    if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
      return `"${escaped}"`;
    }
    return escaped;
  }

  private static normalizeInspectionResult(result: string | null | undefined): string {
    if (!result) return '';
    const value = result.toString().trim();
    const upper = value.toUpperCase();

    const normalKeywords = ['NORMAL', '正常', '異常なし', '異常ナシ', 'OK', '○', '〇'];
    const abnormalKeywords = ['ABNORMAL', '異常', '異常あり', 'NG', '×'];
    const notSelectedKeywords = ['NOT_SELECTED', '未選択', '未実施', ''];

    if (normalKeywords.some((keyword) => keyword === value || keyword === upper)) {
      return '異常なし';
    }

    if (abnormalKeywords.some((keyword) => keyword === value || keyword === upper)) {
      return '異常';
    }

    if (notSelectedKeywords.some((keyword) => keyword === value || keyword === upper)) {
      return '';
    }

    return value;
  }

  private static formatInspectionResult(result: string | null | undefined, note: string | null | undefined): string {
    const normalized = this.normalizeInspectionResult(result);
    if (normalized === '異常' && note) {
      return `異常(${note})`;
    }
    return normalized;
  }

  private static escapeHTML(value: string | null | undefined): string {
    if (!value) return '';
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

