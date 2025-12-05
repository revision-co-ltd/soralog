# 📊 導出機能ガイド

## 概要

国土交通省様式に準拠した **CSV / Excel / PDF** 出力機能。  
すべてのフォーマットで**横版A4**レイアウトを採用し、印刷に最適化されています。

---

## 🎯 対応様式

### 様式1: 飛行記録
- ✅ 15フィールド完全対応
- ✅ 飛行年月日、操縦者、機体、飛行時間等
- ✅ 不具合記録と処置内容

### 様式2: 日常点検記録
- ✅ 13項目点検結果
- ✅ 正常/異常の色分け（Excel/PDF）
- ✅ 特記事項記録

### 様式3: 点検整備記録
- ✅ 作業内容詳細
- ✅ 総飛行時間記録
- ✅ 次回実施予定

---

## 📁 出力形式

### CSV
**特徴**:
- BOM付きUTF-8エンコーディング
- Excelで直接開ける
- 日本語ヘッダー
- カンマ区切り

**使用例**:
```bash
# API経由
GET /api/export/flight-logs/csv?from=2025-01-01&to=2025-12-31
```

**ファイル名**: `flight-logs-1699999999999.csv`

### Excel (xlsx)
**特徴**:
- A4横版レイアウト
- 自動列幅調整
- 罫線付き
- ヘッダー行の背景色（グレー）
- 点検結果の色分け（正常=緑、異常=赤）

**詳細仕様**:
- ページ設定: A4横向き
- マージン: 上下15mm、左右15mm
- フォントサイズ: ヘッダー10pt、データ9pt
- 行の高さ: ヘッダー30px、データ25px

**使用例**:
```bash
GET /api/export/daily-inspections/excel
```

**ファイル名**: `daily-inspections-1699999999999.xlsx`

### PDF
**特徴**:
- A4横版
- Puppeteer生成
- 印刷最適化
- 組織名表示
- 出力日自動記録

**詳細仕様**:
- ページサイズ: A4 landscape (297mm x 210mm)
- マージン: 15mm
- フォント: Noto Sans JP
- 表組み: 罫線付き
- 背景色印刷: 有効

**使用例**:
```bash
GET /api/export/maintenance-records/pdf?from=2025-01-01&to=2025-03-31
```

**ファイル名**: `maintenance-records-1699999999999.pdf`

---

## 🔧 APIエンドポイント

### 基本構造
```
GET /api/export/{record-type}/{format}?from={date}&to={date}
```

### パラメータ

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `record-type` | string | ✅ | `flight-logs`, `daily-inspections`, `maintenance-records` |
| `format` | string | ✅ | `csv`, `excel`, `pdf` |
| `from` | date | ❌ | 開始日 (YYYY-MM-DD) |
| `to` | date | ❌ | 終了日 (YYYY-MM-DD) |
| `droneId` | string | ❌ | 特定機体のみ |

### 認証
```http
Authorization: Bearer {JWT_TOKEN}
```

### レスポンス
- **Content-Type**: 
  - CSV: `text/csv; charset=utf-8`
  - Excel: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - PDF: `application/pdf`
- **Content-Disposition**: `attachment; filename="..."`

---

## 💻 フロントエンド使用方法

### 1. UIから使用

```typescript
// src/components/ExportUtils.tsx
<ExportUtils />
```

**操作手順**:
1. 記録種類を選択（様式1〜3）
2. 期間を指定（任意）
3. フォーマットボタンをクリック
4. ファイルが自動ダウンロード

### 2. プログラマティック使用

```typescript
// 例: 飛行記録をPDFで出力
const exportFlightLogPDF = async (from: Date, to: Date) => {
  const apiUrl = 'http://localhost:3000';
  const token = localStorage.getItem('token');
  
  const params = new URLSearchParams({
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  });

  const response = await fetch(
    `${apiUrl}/api/export/flight-logs/pdf?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `flight-logs-${Date.now()}.pdf`;
  link.click();
};
```

---

## 🎨 PDFレイアウトサンプル

### 様式1: 飛行記録

```
┌───────────────────────────────────────────────────────────────┐
│                           組織名                             │
│                  飛行記録（様式1）                          │
├──┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬──┤
│No│飛行│操縦│技能│登録│機体│飛行│飛行│特定│離陸│離陸│...│  │
│  │年月│者氏│証明│記号│名  │目的│経路│飛行│場所│時刻│   │  │
│  │日  │名  │番号│    │    │    │    │    │    │    │   │  │
├──┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼──┼──┤
│1 │2025│山田│12345│JA123│DJI│測量│...│特定│東京│09:00│...│  │
│  │-01 │太郎│    │    │    │    │   │    │    │    │   │  │
│  │-15 │    │    │    │    │    │   │    │    │    │   │  │
└──┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴──┴──┘
                            出力日: 2025-11-13
```

### 様式2: 日常点検記録

```
┌─────────────────────────────────────────────────────────────┐
│                         組織名                              │
│                日常点検記録（様式2）                       │
├──┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬──┤
│No│実施│種類│登録│機体│機体│プロ│フレ│通信│推進│電源│...│
│  │日  │    │記号│名  │全般│ペラ│ーム│    │    │    │  │
├──┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼──┤
│1 │2025│飛行│JA123│DJI│正常│正常│正常│正常│正常│正常│  │
│  │-01 │前  │    │    │    │    │    │    │    │    │  │
│  │-15 │    │    │    │    │    │    │    │    │    │  │
└──┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴──┘
```

**色分け**:
- 🟢 **正常**: 緑色背景 (#d4edda)
- 🔴 **異常**: 赤色背景 (#f8d7da)

### 様式3: 点検整備記録

```
┌─────────────────────────────────────────────────────────────────┐
│                           組織名                                │
│                  点検整備記録（様式3）                         │
├──┬────┬────┬────┬────┬──────────┬────┬────┬────┬────┤
│No│実施│登録│機体│総飛│点検・整備内容│実施│次回│実施│実施│
│  │年月│記号│名  │行時│              │理由│実施│者  │場所│
│  │日  │    │    │間  │              │    │予定│    │    │
├──┼────┼────┼────┼────┼──────────┼────┼────┼────┼────┤
│1 │2025│JA123│DJI│50.0│【外観点検】  │定期│2025│山田│東京│
│  │-01 │    │    │    │- 機体全般OK  │点検│-04 │太郎│営業│
│  │-15 │    │    │    │- プロペラ交換│    │-15 │    │所  │
│  │    │    │    │    │【動作確認】  │    │    │    │    │
│  │    │    │    │    │- 正常動作確認│    │    │    │    │
└──┴────┴────┴────┴────┴──────────┴────┴────┴────┴────┘
```

---

## 🚀 セットアップ

### 1. 依存関係インストール

```bash
npm install exceljs puppeteer
```

### 2. 環境変数設定

```bash
# .env
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
```

### 3. バックエンド起動

```bash
npm run backend
```

### 4. フロントエンド起動

```bash
npm run dev
```

---

## 📊 パフォーマンス

| 形式 | 100レコード | 500レコード | 1000レコード |
|------|-------------|-------------|--------------|
| CSV | < 0.1秒 | < 0.2秒 | < 0.5秒 |
| Excel | < 1秒 | < 2秒 | < 4秒 |
| PDF | 2-3秒* | 4-6秒 | 8-12秒 |

*初回起動時はPuppeteerの起動に追加で3-5秒

### 最適化ヒント

1. **PDF生成の高速化**:
   ```typescript
   // Puppeteerブラウザの再利用
   const browser = await puppeteer.launch({ headless: true });
   // ... 複数PDF生成
   await browser.close();
   ```

2. **ストリーミング出力**:
   ```typescript
   // 大量データの場合
   res.setHeader('Transfer-Encoding', 'chunked');
   ```

3. **バッチ処理**:
   ```typescript
   // 複数様式を一括ZIP
   const zip = new JSZip();
   zip.file('style1.pdf', pdfBuffer1);
   zip.file('style2.pdf', pdfBuffer2);
   const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
   ```

---

## 🐛 トラブルシューティング

### エラー1: Puppeteer起動失敗

```bash
Error: Failed to launch the browser process
```

**解決方法**:
```bash
# macOS
brew install chromium

# Ubuntu/Debian
sudo apt-get install chromium-browser

# または環境変数設定
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### エラー2: フォントが表示されない

```bash
# 日本語フォントインストール
# macOS: デフォルトで利用可能
# Ubuntu/Debian:
sudo apt-get install fonts-noto-cjk
```

### エラー3: メモリ不足

```bash
# Node.jsのヒープサイズ拡大
NODE_OPTIONS=--max-old-space-size=4096 npm run backend
```

---

## 📝 カスタマイズ

### PDFヘッダーに会社ロゴ追加

```typescript
// backend/src/services/export.service.ts
const html = `
  <div class="header">
    <img src="data:image/png;base64,${logoBase64}" alt="Logo" />
    <h1>飛行記録（様式1）</h1>
  </div>
`;
```

### Excelテーマ変更

```typescript
// 背景色変更
headerRow.fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF4472C4' }, // 青色
};
```

### CSV区切り文字変更

```typescript
// カンマをタブに変更
const csv = rows.map(row => row.join('\t')).join('\n');
```

---

## 🔐 セキュリティ

### 1. 認証必須
```typescript
router.use(authMiddleware); // すべての導出エンドポイントで認証チェック
```

### 2. データスコープ制限
```typescript
where: {
  organizationId: req.organizationId, // 自組織のデータのみ
  deletedAt: null, // 削除済みデータは除外
}
```

### 3. ファイル名サニタイズ
```typescript
const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
```

---

## 📞 サポート

### 関連ファイル

| ファイル | 説明 |
|---------|------|
| `backend/src/services/export.service.ts` | 導出ロジック |
| `backend/src/controllers/export.controller.ts` | APIコントローラー |
| `backend/src/routes/export.routes.ts` | ルート定義 |
| `src/components/ExportUtils.tsx` | フロントエンドUI |
| `test-api.http` | API テストケース |

### デバッグモード

```typescript
// Puppeteerのデバッグ
const browser = await puppeteer.launch({
  headless: false, // ブラウザを表示
  devtools: true,  // DevTools を自動オープン
});
```

---

**更新日**: 2025-11-13  
**バージョン**: v1.0.0  
**ライセンス**: MIT

🎉 **国交省様式完全対応の導出機能が完成しました！**

