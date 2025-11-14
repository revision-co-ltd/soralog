// CSV エクスポートサービス - BOM付きUTF-8対応
import { stringify } from 'csv-stringify/sync';

export class CsvExportService {
  // BOM for UTF-8
  private static readonly BOM = '\uFEFF';

  /**
   * 飛行記録（様式1）を CSV にエクスポート
   */
  static exportFlightLogs(flightLogs: any[]): string {
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

    const rows = flightLogs.map((log, index) => [
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

    const csv = stringify([headers, ...rows], {
      bom: false, // 手動でBOMを追加
    });

    return this.BOM + csv;
  }

  /**
   * 日常点検記録（様式2）を CSV にエクスポート
   */
  static exportDailyInspections(inspections: any[]): string {
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

    const rows = inspections.map((inspection, index) => [
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

    const csv = stringify([headers, ...rows], {
      bom: false,
    });

    return this.BOM + csv;
  }

  /**
   * 点検整備記録（様式3）を CSV にエクスポート
   */
  static exportMaintenanceRecords(records: any[]): string {
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

    const rows = records.map((record, index) => [
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

    const csv = stringify([headers, ...rows], {
      bom: false,
    });

    return this.BOM + csv;
  }

  /**
   * 日付をフォーマット (YYYY-MM-DD)
   */
  private static formatDate(date: Date | string | null): string {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 時刻をフォーマット (HH:MM)
   */
  private static formatTime(time: Date | string | null): string {
    if (!time) return '';
    const d = new Date(time);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * 点検結果をフォーマット
   */
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

