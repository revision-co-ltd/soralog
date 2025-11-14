// Excel エクスポートサービス - exceljs 使用
import ExcelJS from 'exceljs';

export class ExcelExportService {
  /**
   * 飛行記録（様式1）を Excel にエクスポート
   */
  static async exportFlightLogs(flightLogs: any[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('飛行記録（様式1）');

    // ヘッダー行
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
    ];

    sheet.addRow(headers);

    // ヘッダーのスタイル
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // データ行
    flightLogs.forEach((log, index) => {
      const row = sheet.addRow([
        index + 1,
        this.formatDate(log.flightDate),
        log.operator?.name || '',
        log.operator?.licenseNumber || '',
        log.drone?.registrationMark || '',
        log.drone?.name || '',
        log.purpose || '',
        log.outline || '',
        log.isTokuteiFlight ? '○' : '',
        log.flightPlanNotified ? '○' : '',
        log.takeoffLocation?.name || '',
        this.formatTime(log.takeoffTime),
        log.landingLocation?.name || '',
        this.formatTime(log.landingTime),
        log.flightTimeMinutes || '',
        log.totalTimeSinceManufactured?.toFixed(1) || '',
        log.safetyImpactNote || '',
        log.faultDate ? this.formatDate(log.faultDate) : '',
        log.faultDetail || '',
        log.fixDate ? this.formatDate(log.fixDate) : '',
        log.fixDetail || '',
        log.confirmer?.name || '',
      ]);

      // 奇数行に背景色
      if ((index + 1) % 2 === 1) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' },
        };
      }
    });

    // 列幅を自動調整
    sheet.columns.forEach((column, i) => {
      if (i === 0) {
        column.width = 6; // No
      } else if ([6, 7, 16, 18, 20].includes(i)) {
        column.width = 30; // 長いテキスト列
      } else {
        column.width = 15;
      }
    });

    // 枠線
    sheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    return await workbook.xlsx.writeBuffer() as Buffer;
  }

  /**
   * 日常点検記録（様式2）を Excel にエクスポート
   */
  static async exportDailyInspections(inspections: any[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('日常点検記録（様式2）');

    const headers = [
      'No',
      '点検日',
      '無人航空機の登録記号',
      '機体名',
      '実施者氏名',
      '実施場所',
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
      '（飛行前）機体付着',
      '（飛行前）取付状態',
      '（飛行前）損傷・ゆがみ',
      '（飛行前）異常な発熱',
      '特記事項',
    ];

    sheet.addRow(headers);

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF70AD47' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    inspections.forEach((inspection, index) => {
      const row = sheet.addRow([
        index + 1,
        this.formatDate(inspection.executionDate),
        inspection.drone?.registrationMark || '',
        inspection.drone?.name || '',
        inspection.executor?.name || '',
        inspection.executionPlace?.name || '',
        this.formatInspectionResult(inspection.resultAirframe),
        this.formatInspectionResult(inspection.resultPropeller),
        this.formatInspectionResult(inspection.resultFrame),
        this.formatInspectionResult(inspection.resultMountedEquipment),
        this.formatInspectionResult(inspection.resultCommunication),
        this.formatInspectionResult(inspection.resultPropulsion),
        this.formatInspectionResult(inspection.resultPower),
        this.formatInspectionResult(inspection.resultControl),
        this.formatInspectionResult(inspection.resultController),
        this.formatInspectionResult(inspection.resultBattery),
        this.formatInspectionResult(inspection.resultRemoteId),
        this.formatInspectionResult(inspection.resultLights),
        this.formatInspectionResult(inspection.resultCamera),
        this.formatInspectionResult(inspection.resultPreFlightSnow),
        this.formatInspectionResult(inspection.resultPreFlightAttachment),
        this.formatInspectionResult(inspection.resultPreFlightDamage),
        this.formatInspectionResult(inspection.resultPreFlightHeat),
        inspection.specialNote || '',
      ]);

      if ((index + 1) % 2 === 1) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' },
        };
      }
    });

    sheet.columns.forEach((column, i) => {
      if (i === 0) {
        column.width = 6;
      } else if (i === headers.length - 1) {
        column.width = 30; // 特記事項
      } else {
        column.width = 15;
      }
    });

    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    return await workbook.xlsx.writeBuffer() as Buffer;
  }

  /**
   * 点検整備記録（様式3）を Excel にエクスポート
   */
  static async exportMaintenanceRecords(records: any[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('点検整備記録（様式3）');

    const headers = [
      'No',
      '実施年月日',
      '無人航空機の登録記号',
      '機体名',
      'この時点での総飛行時間(時間)',
      '点検・修理・改造及び整備の内容',
      '実施理由',
      '実施場所',
      '実施者氏名',
      'その他特記事項',
    ];

    sheet.addRow(headers);

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFC000' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    records.forEach((record, index) => {
      const row = sheet.addRow([
        index + 1,
        this.formatDate(record.executionDate),
        record.drone?.registrationMark || '',
        record.drone?.name || '',
        record.totalFlightTimeAtMoment?.toFixed(1) || '',
        record.workContent || '',
        record.reason || '',
        record.executionPlace?.name || '',
        record.executor?.name || '',
        record.nextDueNote || '',
      ]);

      if ((index + 1) % 2 === 1) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' },
        };
      }

      // 作業内容のセルは自動改行
      row.getCell(6).alignment = { wrapText: true, vertical: 'top' };
    });

    sheet.columns.forEach((column, i) => {
      if (i === 0) {
        column.width = 6;
      } else if ([5, 9].includes(i)) {
        column.width = 40; // 作業内容、特記事項
      } else {
        column.width = 15;
      }
    });

    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    return await workbook.xlsx.writeBuffer() as Buffer;
  }

  private static formatDate(date: Date | string | null): string {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private static formatTime(time: Date | string | null): string {
    if (!time) return '';
    const d = new Date(time);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
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

  private static formatInspectionResult(result: string | null | undefined): string {
    return this.normalizeInspectionResult(result);
  }
}

