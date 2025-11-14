// 無人航空機日誌システム - 型定義
// 国土交通省「無人航空機の飛行日誌の取扱要領」に準拠

// =====================================
// 基本エンティティ
// =====================================

/**
 * 組織（マルチテナント対応）
 */
export interface Organization {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ユーザー（操縦者）
 */
export interface User {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  licenseNumber?: string;  // 操縦者技能証明番号
  role: 'operator' | 'admin' | 'system_admin';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 無人航空機（機体）
 */
export interface Drone {
  id: string;
  organizationId: string;
  registrationMark: string;  // 登録記号（例: JU-123456）必須
  name: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  certificationNumber?: string;  // 機体認証番号
  totalFlightHours: number;  // 総飛行時間（時間）
  status: 'active' | 'maintenance' | 'retired';
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;  // 論理削除
}

/**
 * 飛行場所
 */
export interface Location {
  id: string;
  organizationId: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  isDid: boolean;  // 人口集中地区フラグ
  requiresPermit: boolean;  // 飛行許可の要否
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 特定飛行カテゴリ
 */
export type TokuteiFlightCategory =
  | 'airport_surroundings'
  | 'above_150m'
  | 'did_area'
  | 'night'
  | 'beyond_visual_line'
  | 'within_30m'
  | 'event_site'
  | 'dangerous_goods'
  | 'object_drop';

// =====================================
// 様式1: 飛行記録
// =====================================

/**
 * 飛行記録（様式1）
 * 国土交通省ガイドライン準拠
 */
export interface FlightLog {
  id: string;
  organizationId: string;
  
  // 基本情報
  droneId: string;
  drone?: Drone;  // リレーション
  operatorId: string;
  operator?: User;  // リレーション
  flightDate: Date;
  
  // 飛行詳細
  purpose: string;  // 飛行目的
  outline?: string;  // 飛行経路の概要
  isTokuteiFlight: boolean;  // 特定飛行フラグ（カテゴリーⅡ・Ⅲ）
  tokuteiFlightCategories?: TokuteiFlightCategory[];  // 特定飛行の詳細カテゴリ
  flightPlanNotified?: boolean;  // 飛行計画の通報有無
  
  // 離着陸情報
  takeoffLocationId?: string;
  takeoffLocation?: Location;
  takeoffTime: string;  // HH:mm 形式
  landingLocationId?: string;
  landingLocation?: Location;
  landingTime: string;  // HH:mm 形式
  flightTimeMinutes?: number;  // 飛行時間（分）自動計算
  totalTimeSinceManufactured?: number;  // 製造後の総飛行時間（時間）
  
  // 安全・不具合情報
  safetyImpactNote?: string;  // 飛行の安全に影響のあった事項
  faultDate?: Date;  // 不具合発生日
  faultDetail?: string;  // 不具合事項
  fixDate?: Date;  // 処置実施日
  fixDetail?: string;  // 処置内容
  confirmerId?: string;  // 確認者ID
  confirmer?: User;  // 確認者
  
  // システム情報
  retentionUntil: Date;  // 保存期限（flightDate + 3年）
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;  // 論理削除
}

/**
 * 飛行記録作成用DTO
 */
export interface CreateFlightLogDTO {
  droneId: string;
  operatorId: string;
  flightDate: Date;
  purpose: string;
  outline?: string;
  isTokuteiFlight: boolean;
  tokuteiFlightCategories?: TokuteiFlightCategory[];
  flightPlanNotified?: boolean;
  takeoffLocationId?: string;
  takeoffTime: string;
  landingLocationId?: string;
  landingTime: string;
  safetyImpactNote?: string;
  faultDate?: Date;
  faultDetail?: string;
  fixDate?: Date;
  fixDetail?: string;
  confirmerId?: string;
}

/**
 * 飛行記録更新用DTO
 */
export interface UpdateFlightLogDTO extends Partial<CreateFlightLogDTO> {
  id: string;
}

// =====================================
// 様式2: 日常点検記録
// =====================================

/**
 * 点検結果
 */
export type InspectionResult = '正常' | '異常' | '未選択';

/**
 * 日常点検記録（様式2）
 * 飛行前点検・飛行後点検
 */
export interface DailyInspection {
  id: string;
  organizationId: string;
  
  // 基本情報
  droneId: string;
  drone?: Drone;
  inspectionType: 'pre-flight' | 'post-flight';
  executionDate: Date;
  executionPlaceId?: string;
  executionPlace?: Location;
  executorId: string;
  executor?: User;
  
  // 点検項目
  // 各項目: result（正常/異常/未選択）+ note（備考）
  resultAirframe?: InspectionResult;  // 機体全般
  noteAirframe?: string;
  resultPropeller?: InspectionResult;  // プロペラ
  notePropeller?: string;
  resultFrame?: InspectionResult;  // フレーム
  noteFrame?: string;
  resultMountedEquipment?: InspectionResult; // 機体搭載装置
  noteMountedEquipment?: string;
  resultCommunication?: InspectionResult;  // 通信系統
  noteCommunication?: string;
  resultPropulsion?: InspectionResult;  // 推進系統
  notePropulsion?: string;
  resultPower?: InspectionResult;  // 電源系統
  notePower?: string;
  resultControl?: InspectionResult;  // 自動制御系統
  noteControl?: string;
  resultController?: InspectionResult;  // 操縦装置
  noteController?: string;
  resultBattery?: InspectionResult;  // バッテリー・燃料
  noteBattery?: string;
  resultRemoteId?: InspectionResult;  // リモートID機能
  noteRemoteId?: string;
  resultLights?: InspectionResult;  // 灯火
  noteLights?: string;
  resultCamera?: InspectionResult;  // カメラ
  noteCamera?: string;
  resultPreFlightSnow?: InspectionResult; // （飛行前点検）機体に雪等の付着はないか
  notePreFlightSnow?: string;
  resultPreFlightAttachment?: InspectionResult; // （飛行前点検）各機器は確実に取り付けられているか
  notePreFlightAttachment?: string;
  resultPreFlightDamage?: InspectionResult; // （飛行前点検）機体に損傷やゆがみはないか
  notePreFlightDamage?: string;
  resultPreFlightHeat?: InspectionResult; // （飛行前点検）各機器の異常な発熱はないか
  notePreFlightHeat?: string;
  
  // 特記事項・総合結果
  specialNote?: string;  // 日常点検特記事項
  overallResult?: '正常' | '異常';  // 総合判定（自動）
  
  // システム情報
  retentionUntil: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

/**
 * 日常点検記録作成用DTO
 */
export interface CreateDailyInspectionDTO {
  droneId: string;
  inspectionType: 'pre-flight' | 'post-flight';
  executionDate: Date;
  executionPlaceId?: string;
  executorId: string;
  resultAirframe?: InspectionResult;
  noteAirframe?: string;
  resultPropeller?: InspectionResult;
  notePropeller?: string;
  resultFrame?: InspectionResult;
  noteFrame?: string;
  resultMountedEquipment?: InspectionResult;
  noteMountedEquipment?: string;
  resultCommunication?: InspectionResult;
  noteCommunication?: string;
  resultPropulsion?: InspectionResult;
  notePropulsion?: string;
  resultPower?: InspectionResult;
  notePower?: string;
  resultControl?: InspectionResult;
  noteControl?: string;
  resultController?: InspectionResult;
  noteController?: string;
  resultBattery?: InspectionResult;
  noteBattery?: string;
  resultRemoteId?: InspectionResult;
  noteRemoteId?: string;
  resultLights?: InspectionResult;
  noteLights?: string;
  resultCamera?: InspectionResult;
  noteCamera?: string;
  resultPreFlightSnow?: InspectionResult;
  notePreFlightSnow?: string;
  resultPreFlightAttachment?: InspectionResult;
  notePreFlightAttachment?: string;
  resultPreFlightDamage?: InspectionResult;
  notePreFlightDamage?: string;
  resultPreFlightHeat?: InspectionResult;
  notePreFlightHeat?: string;
  specialNote?: string;
}

// =====================================
// 様式3: 点検整備記録
// =====================================

/**
 * 点検整備記録（様式3）
 * 定期点検・修理・改造
 */
export interface MaintenanceRecord {
  id: string;
  organizationId: string;
  
  // 基本情報
  droneId: string;
  drone?: Drone;
  executionDate: Date;
  totalFlightTimeAtMoment?: number;  // その時点の総飛行時間
  
  // 作業内容
  workContent: string;  // 点検・修理・改造及び整備の内容
  reason?: string;  // 実施理由
  executionPlaceId?: string;
  executionPlace?: Location;
  executorId: string;
  executor?: User;
  nextDueNote?: string;  // その他特記事項（次回実施予定等）
  remarks?: string;  // 備考
  
  // システム情報
  retentionUntil: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

/**
 * 点検整備記録作成用DTO
 */
export interface CreateMaintenanceRecordDTO {
  droneId: string;
  executionDate: Date;
  totalFlightTimeAtMoment?: number;
  workContent: string;
  reason?: string;
  executionPlaceId?: string;
  executorId: string;
  nextDueNote?: string;
  remarks?: string;
}

// =====================================
// API レスポンス型
// =====================================

/**
 * 認証レスポンス
 */
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  token: string;
}

/**
 * ページネーション情報
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * API レスポンス（ページネーション付き）
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

/**
 * API エラーレスポンス
 */
export interface ApiError {
  error: string;
  message?: string;
  details?: any;
}

// =====================================
// エクスポート用型
// =====================================

/**
 * CSV/Excel エクスポート用パラメータ
 */
export interface ExportParams {
  droneId?: string;
  operatorId?: string;
  from?: string;  // YYYY-MM-DD
  to?: string;    // YYYY-MM-DD
  format?: 'csv' | 'excel' | 'pdf';
}

/**
 * 様式別エクスポート設定
 */
export interface ExportConfig {
  style: 'style1' | 'style2' | 'style3';  // 様式1〜3
  includeHeaders: boolean;
  encoding?: 'utf8' | 'shift-jis';
  dateFormat?: string;
}

// =====================================
// フォーム用型
// =====================================

/**
 * 汎用フォームステータス
 */
export type FormStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * フォームステート
 */
export interface FormState<T> {
  data: T;
  status: FormStatus;
  error?: string;
}

// =====================================
// ローカルストレージ用型（後方互換性）
// =====================================

/**
 * localStorage に保存される飛行記録（既存形式）
 * 後方互換性のために保持
 */
export interface LegacyFlightLog {
  id: string;
  date: string;
  time?: string;
  duration: number;
  location: string;
  locationAddressDetail?: string; // 詳細住所（xxx丁目まで）
  locationLatitude?: number; // GPS緯度
  locationLongitude?: number; // GPS経度
  droneModel: string;
  weather: string;
  windSpeed?: number;
  altitude?: number;
  purpose: string;
  notes: string;
  pilot: string;
  tokuteiFlightCategories?: TokuteiFlightCategory[];
  isTokuteiFlight?: boolean;
  flightPlanNotified?: boolean;
}

/**
 * localStorage に保存される機体（既存形式）
 */
export interface LegacyUAV {
  id: string;
  name: string;
  manufacturer: string;
  serialNumber: string;
  registrationNumber: string;
  purchaseDate: string;
  isActive: boolean;
  hoursSinceLastMaintenance: number;
}

/**
 * localStorage に保存される操縦者（既存形式）
 */
export interface LegacyPilot {
  id: string;
  name: string;
  licenseNumber: string;
  licenseType?: string;
  initialFlightHours: number; // 登录时的总飞行时间（分钟）
  totalFlightHours: number; // 总飞行时间（分钟）= 初始飞行时间 + アプリ内累计时间
  isActive: boolean;
}

