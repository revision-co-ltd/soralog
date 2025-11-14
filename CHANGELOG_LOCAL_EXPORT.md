# ローカルストレージとデータエクスポート機能の追加

## 変更日時
2025年11月13日

## 実装内容

### 1. ローカルストレージへのデータ保存 📦

すべてのデータがブラウザのlocalStorageに自動保存されるようになりました：

#### 保存されるデータ
- **飛行記録 (flightLogs)**: すべての飛行ログデータ
- **操縦者情報 (pilots)**: 操縦者のプロフィールと飛行時間
- **機体情報 (uavs)**: ドローンの登録情報と飛行時間
- **日常点検記録 (dailyInspections)**: 日常点検の記録
- **点検整備記録 (maintenanceRecords)**: 点検整備の記録

#### 実装詳細 (src/App.tsx)

```typescript
// 初期読み込み時にlocalStorageからデータを復元
const [flights, setFlights] = useState<FlightLog[]>(() => {
  const saved = localStorage.getItem('flightLogs');
  return saved ? JSON.parse(saved) : mockFlights;
});

// データ変更時に自動保存
useEffect(() => {
  localStorage.setItem('flightLogs', JSON.stringify(flights));
}, [flights]);
```

### 2. ローカルデータエクスポート機能 📤

新しい `LocalExportUtils` コンポーネントを追加し、オフラインでもデータを出力できるようになりました。

#### 機能
- **飛行記録の出力**
  - CSV形式（Excel対応のBOM付きUTF-8）
  - JSON形式（バックアップ・インポート用）
  - 日付範囲フィルタリング対応

- **日常点検記録の出力**
  - CSV形式で出力
  - localStorageから直接読み込み

- **点検整備記録の出力**
  - CSV形式で出力
  - localStorageから直接読み込み

#### CSV出力の特徴
- BOM付きUTF-8エンコーディング（Excelで文字化けしない）
- カンマや改行を含むデータの自動エスケープ
- 日本語対応

#### 出力データ項目（飛行記録）
1. 飛行日
2. 操縦者
3. 使用機体
4. 飛行場所
5. 飛行時間（分）
6. 飛行目的
7. 特定飛行（該当/非該当）
8. 飛行計画通報（通報済/未通報）
9. 飛行概要
10. 天候
11. 緯度
12. 経度

### 3. オフライン対応の改善 🔄

#### 日常点検記録 (handleAddDailyInspection)
```typescript
// 1. まずローカルストレージに保存（必ず成功）
const inspections = JSON.parse(localStorage.getItem('dailyInspections') || '[]');
inspections.push(newInspection);
localStorage.setItem('dailyInspections', JSON.stringify(inspections));

// 2. サーバー同期を試行（失敗してもローカルには保存済み）
try {
  await syncService.saveDailyInspection(data);
} catch (syncError) {
  console.warn('同期失敗、ローカル保存のみ:', syncError);
}
```

#### 点検整備記録 (handleAddMaintenanceRecord)
同様の二段階保存方式を実装

### 4. UI改善 🎨

#### エクスポート画面の構成
「その他」→「エクスポート・設定」画面で以下の順序で表示：

1. **ローカルデータ出力** (新規)
   - ネットワーク接続不要
   - 即座にダウンロード可能
   - 現在保存されているデータ件数を表示

2. **オンライン出力（API経由）** (既存)
   - サーバー側での高度な処理
   - PDF生成など

### 5. データ構造の改善 🔧

#### FlightLogインターフェースの統一
```typescript
export interface FlightLog {
  id: string;
  date: string;
  time?: string;
  duration: number;
  location: string | LocationSelection; // オブジェクトにも対応
  locationAddressDetail?: string;
  locationLatitude?: number;
  locationLongitude?: number;
  droneModel: string;
  weather: string;
  windSpeed?: number;
  altitude?: number;
  purpose: string;
  notes: string;
  pilot: string;
  summary?: string; // 飛行概要
  tokuteiFlightCategories?: TokuteiFlightCategory[];
  isTokuteiFlight?: boolean;
  flightPlanNotified?: boolean;
  clientName?: string; // 案件名
}
```

## ファイル変更一覧

### 新規作成
- `src/components/LocalExportUtils.tsx` - ローカルデータエクスポートコンポーネント

### 変更
- `src/App.tsx`
  - localStorage読み込み・保存ロジックの追加
  - 日常点検・点検整備記録の保存ロジック改善
  - LocalExportUtilsコンポーネントのインポートと配置

- `src/components/FlightLogForm.tsx`
  - FlightLogインターフェースをexport
  - locationフィールドの型を拡張

## 使用方法

### データのエクスポート
1. アプリ下部の「その他」タブをタップ
2. 「エクスポート・設定」を選択
3. 「ローカルデータ出力」セクションで：
   - 飛行記録：日付範囲を指定（オプション）→「CSV出力」または「JSON出力」
   - 日常点検記録：「CSV出力」
   - 点検整備記録：「CSV出力」

### データの確認
- ブラウザの開発者ツール → Application → Local Storage で保存データを確認可能
- キー名:
  - `flightLogs`
  - `pilots`
  - `uavs`
  - `dailyInspections`
  - `maintenanceRecords`

## 注意事項

### データの永続性
- ブラウザのlocalStorageに保存されるため、ブラウザキャッシュをクリアするとデータが消失します
- 定期的にエクスポート（バックアップ）することを推奨します

### ストレージ容量
- localStorageの容量制限（通常5-10MB）に注意
- 大量のデータを保存する場合は定期的に古いデータをエクスポートして削除

### オフライン同期
- オフライン時に保存されたデータは、オンライン復帰後に自動同期を試行します
- ただし、localStorage内のデータは保持されるため、同期失敗時もデータは安全です

## 今後の拡張案

1. **JSONインポート機能**
   - エクスポートしたJSONファイルを再インポートできる機能

2. **データ圧縮**
   - localStorageの容量を節約するためのデータ圧縮

3. **自動バックアップ**
   - 定期的に自動でJSONファイルをダウンロード

4. **データ同期ステータス**
   - どのデータがサーバーと同期済みかを視覚的に表示

5. **PDF出力（ローカル版）**
   - jsPDFなどを使用してクライアント側でPDF生成

## トラブルシューティング

### Q: エクスポートボタンを押してもダウンロードされない
A: ブラウザのポップアップブロックを確認してください

### Q: CSVをExcelで開くと文字化けする
A: BOM付きUTF-8で出力しているため、通常は文字化けしません。問題が発生する場合は、テキストエディタで開いて文字コードを確認してください

### Q: 日常点検記録が「データなし」と表示される
A: 日常点検記録を1件以上追加してから再度エクスポートしてください

### Q: localStorageのデータを手動で削除したい
A: ブラウザの開発者ツール → Application → Local Storage → 該当のキーを選択して削除

## 開発者向け情報

### localStorage構造

```javascript
// flightLogs
[
  {
    "id": "1699999999999",
    "date": "2025-11-13T10:30:00.000Z",
    "pilot": "山田太郎",
    "droneModel": "DJI Mavic 3",
    "location": {
      "displayName": "東京都渋谷区",
      "address": "東京都渋谷区神南1丁目",
      "latitude": 35.6628,
      "longitude": 139.6982
    },
    "duration": 45,
    "purpose": "空撮",
    ...
  }
]

// dailyInspections
[
  {
    "id": "1699999999999",
    "date": "2025-11-13",
    "droneId": "drone_001",
    "operatorId": "pilot_001",
    "passed": true,
    "notes": "異常なし",
    "createdAt": "2025-11-13T10:30:00.000Z"
  }
]
```

### エクスポート関数の実装

```typescript
// CSV生成の例
const csvContent = [
  headers.join(','),
  ...rows.map(row => 
    row.map(cell => {
      const str = String(cell);
      // エスケープ処理
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  )
].join('\n');

// BOM付きUTF-8でダウンロード
const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
```

## 関連Issue・PR
- Issue #xxx: ローカルストレージ対応の要望
- Issue #xxx: オフラインエクスポート機能の実装



