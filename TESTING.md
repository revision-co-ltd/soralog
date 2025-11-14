# 🧪 テスト手順書

## クイックテストガイド

### 前提条件
```bash
✅ Node.js 18+ インストール済み
✅ PostgreSQL 実行中（Dockerまたはローカル）
✅ npm依存関係インストール済み
```

---

## 📝 テスト手順

### Step 1: 環境チェック
```bash
cd "/Users/yang/Desktop/20251113无人机飞行记录APP "
npm run check
```

**期待結果**:
```
✅ .env file exists
✅ All dependencies installed
✅ Prisma Client generated
✅ Docker is running
✅ Environment setup complete!
```

---

### Step 2: データベース起動
```bash
# Docker使用の場合
docker-compose up -d

# 確認
docker ps
```

**期待結果**:
```
CONTAINER ID   IMAGE              STATUS        PORTS
xxxxx          postgres:15-alpine Up 10 seconds 0.0.0.0:5432->5432
```

---

### Step 3: マイグレーション & シード
```bash
npm run setup
```

**期待結果**:
```
✅ Prisma Client generated
✅ Migrations applied
✅ Seed data inserted
```

---

### Step 4: バックエンド起動
```bash
# 新しいターミナル
npm run backend
```

**期待結果**:
```
✅ Server running on http://localhost:3000
```

---

### Step 5: フロントエンド起動
```bash
# 別の新しいターミナル
npm run dev
```

**期待結果**:
```
  ➜  Local:   http://localhost:5173/
  ➜  press h + enter to show help
```

---

### Step 6: ブラウザテスト

#### 6.1 アプリケーション起動
```
http://localhost:5173/
```

**確認項目**:
- ✅ アプリが表示される
- ✅ 右上に同期ステータスバー表示
- ✅ タブナビゲーション動作

#### 6.2 様式1テスト（飛行記録）
1. 「追加」タブをクリック
2. 「様式1」を選択
3. フォーム入力:
   - 機体選択
   - 操縦者選択
   - 飛行年月日選択
   - 飛行目的入力
   - 離陸時刻・着陸時刻入力
4. 「飛行記録を保存」クリック

**期待結果**:
- ✅ 飛行時間が自動計算される
- ✅ 保存成功メッセージ表示
- ✅ 右上の同期ステータスが更新

#### 6.3 様式2テスト（日常点検）
1. 「様式2」を選択
2. 「すべて正常」クリック
3. 「日常点検記録を保存」クリック

**期待結果**:
- ✅ 全項目が「正常」に変わる
- ✅ 進捗バーが100%に
- ✅ 保存成功

#### 6.4 様式3テスト（点検整備）
1. 「様式3」を選択
2. 「テンプレート」をクリック
3. 「定期点検（標準）」を選択
4. 保存

**期待結果**:
- ✅ 作業内容が自動入力される
- ✅ 総飛行時間が自動入力
- ✅ 保存成功

---

### Step 7: オフラインテスト

#### 7.1 オフラインモード有効化
1. ブラウザDevTools開く（F12）
2. Network タブ
3. 「Offline」にチェック

#### 7.2 データ追加
1. 様式1で飛行記録追加
2. 保存

**期待結果**:
- ✅ 「ローカルに保存しました」メッセージ
- ✅ 右上ステータス: 「オフライン」
- ✅ 未同期数: 1件

#### 7.3 オンライン復帰
1. 「Offline」チェック外す
2. 数秒待つ

**期待結果**:
- ✅ 自動同期開始
- ✅ 右上ステータス: 「同期中...」→「オンライン」
- ✅ 未同期数: 0件

---

### Step 8: 導出テスト

#### 8.1 導出画面表示
1. 「統計」タブクリック
2. ExportUtilsコンポーネント確認

#### 8.2 CSV導出
1. 記録種類: 「様式1」選択
2. 「CSV」ボタンクリック

**期待結果**:
- ✅ ファイルダウンロード開始
- ✅ ファイル名: `flight-logs-xxxxx.csv`
- ✅ Excel で開ける

#### 8.3 Excel導出
1. 「Excel」ボタンクリック

**期待結果**:
- ✅ .xlsx ファイルダウンロード
- ✅ 罫線付き
- ✅ A4横版レイアウト

#### 8.4 PDF導出
1. 「PDF」ボタンクリック
2. 初回は5-8秒待つ

**期待結果**:
- ✅ PDF ファイルダウンロード
- ✅ A4 横版
- ✅ 組織名表示
- ✅ 印刷最適化

---

### Step 9: API直接テスト

#### 9.1 REST Clientで認証
```http
# test-api.http を開く
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123"
}
```

**期待結果**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

#### 9.2 導出APIテスト
```http
GET http://localhost:3000/api/export/flight-logs/csv
Authorization: Bearer {token}
```

**期待結果**:
- ✅ CSV データ返却
- ✅ Content-Disposition ヘッダー有り

---

### Step 10: モバイルテスト

#### 10.1 デバイスエミュレーション
1. DevTools開く
2. デバイスツールバートグル (Ctrl+Shift+M)
3. iPhone 14 Pro 選択

#### 10.2 UI確認
**確認項目**:
- ✅ ボタンが大きい（h-14）
- ✅ 入力フィールドが大きい
- ✅ タッチしやすい
- ✅ レスポンシブ動作

---

## 🐛 トラブルシューティング

### エラー1: Port 3000 already in use
```bash
# プロセス確認
lsof -i :3000

# 終了
kill -9 {PID}
```

### エラー2: Prisma Client not generated
```bash
npm run prisma:generate
```

### エラー3: Database connection error
```bash
# .env 確認
cat .env

# Docker起動確認
docker-compose ps
```

### エラー4: Puppeteer launch error
```bash
# macOS
brew install chromium

# または環境変数設定
export PUPPETEER_EXECUTABLE_PATH=/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome
```

---

## ✅ 完全チェックリスト

### 基本機能
- [ ] フロントエンド起動成功
- [ ] バックエンド起動成功
- [ ] ログイン成功
- [ ] 様式1保存成功
- [ ] 様式2保存成功
- [ ] 様式3保存成功

### オフライン機能
- [ ] オフライン時保存可能
- [ ] 同期ステータス表示
- [ ] オンライン復帰時自動同期
- [ ] 未同期数表示正確

### 導出機能
- [ ] CSV導出成功
- [ ] Excel導出成功（横版A4）
- [ ] PDF導出成功（横版A4）
- [ ] 日付フィルター動作
- [ ] ファイル名正しい

### モバイル対応
- [ ] レスポンシブ動作
- [ ] タッチターゲット適切
- [ ] 地図操作可能
- [ ] フォーム入力しやすい

### API
- [ ] 認証API動作
- [ ] CRUD API動作
- [ ] 導出API動作
- [ ] エラーハンドリング適切

---

## 📊 パフォーマンステスト

### レスポンスタイム計測
```bash
# API レスポンスタイム
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/flight-logs
```

**期待値**:
- GET /flight-logs: < 100ms
- POST /flight-logs: < 200ms
- CSV導出: < 500ms
- Excel導出: < 3秒
- PDF導出: < 8秒

---

## 🎯 受け入れ基準

### 最低要件
✅ すべての様式が保存できる  
✅ オフラインモードで動作する  
✅ CSV/Excel/PDF導出ができる  
✅ モバイルで使いやすい  
✅ Lint エラー0  

### 推奨要件
✅ レスポンスタイム基準達成  
✅ ドキュメント完全  
✅ エラーハンドリング適切  
✅ セキュリティ対策済み  

---

## 📝 テスト報告書テンプレート

```markdown
# テスト報告

**日付**: YYYY-MM-DD
**テスター**: [名前]
**環境**: [OS, Browser]

## 結果サマリー
- 総テスト数: X
- 成功: X
- 失敗: X
- スキップ: X

## 詳細
### 成功項目
- [ ] ...

### 失敗項目
- [ ] ...
  - エラー内容: ...
  - 再現手順: ...

### 備考
...
```

---

**テストガイド更新日**: 2025-11-13  
**バージョン**: v1.0.0  
**テスト所要時間**: 約30分

