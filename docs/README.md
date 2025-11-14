# 無人航空機日誌システム

## プロジェクト概要

国土交通省「無人航空機の飛行日誌の取扱要領」に準拠した、特定飛行時の義務化された飛行日誌の作成・保存を支援するシステムです。

### 主要機能

1. **飛行記録（様式1）管理**
   - 各飛行ごとの詳細記録
   - 総飛行時間の自動計算
   - 不具合記録と対応履歴

2. **日常点検記録（様式2）管理**
   - 飛行前・飛行後点検
   - 13項目のチェックリスト
   - 異常検出時の飛行不可フラグ

3. **点検整備記録（様式3）管理**
   - 定期点検・修理・改造の記録
   - メンテナンス履歴の追跡
   - 次回予定の管理

4. **データ入出力**
   - CSV入出力（DroneLog互換形式）
   - Excel出力（国交省様式準拠）
   - PDF出力（印刷最適化）
   - 一括エクスポート（ZIP）

5. **マスタデータ管理**
   - 機体管理
   - 操縦者管理
   - 場所管理（地図統合）

## ドキュメント

- [📋 開発要件定義書](./開発要件定義書.md) - システム全体の要件と仕様
- [🗓️ 実装計画](./実装計画.md) - 段階的な実装ロードマップ
- [🔧 現在の状態](#現在の実装状況) - 既存機能と次のステップ

## 現在の実装状況

### ✅ 完了済み機能

#### フロントエンド
- React 18 + TypeScript + Vite セットアップ
- Tailwind CSS 3.4 + Radix UI コンポーネント
- モバイル最適化（タッチターゲット 56px以上）
- 日付選択コンポーネント（react-day-picker + date-fns）
- 地図選択コンポーネント（Leaflet + OpenStreetMap）
- 基本的な飛行記録フォーム
- UAV（機体）管理画面
- 操縦者管理画面

#### データ管理
- ローカルストレージによる一時的なデータ保存
- CSV エクスポート（基本実装）

### 🚧 現在の課題

1. **バックエンドが未実装**
   - データベースなし（すべてローカルストレージ）
   - 認証機能なし
   - API なし

2. **国交省様式への対応が不完全**
   - 現在のフォームは簡易版
   - 様式1〜3の完全な項目が揃っていない
   - 総飛行時間の自動計算が未実装
   - Excel/PDF 出力が未実装

3. **組織・権限管理なし**
   - マルチテナント未対応
   - ユーザー権限なし

## 次のステップ

### Phase 1: データベース構築（3日）
```bash
# 1. PostgreSQL + Prisma のセットアップ
cd backend
npm init -y
npm install prisma @prisma/client
npx prisma init

# 2. スキーマ定義
# prisma/schema.prisma を編集

# 3. マイグレーション実行
npx prisma migrate dev --name init

# 4. シードデータ投入
npx prisma db seed
```

### Phase 2: バックエンド基盤（4日）
```bash
# Express + TypeScript セットアップ
npm install express cors helmet bcrypt jsonwebtoken
npm install -D @types/express @types/cors @types/bcrypt @types/jsonwebtoken

# ディレクトリ構造作成
mkdir -p src/{controllers,services,repositories,middleware,models,utils,validators}
```

### Phase 3以降
実装計画.md を参照してください。

## 技術スタック

### 現在使用中
- **フロントエンド**: React 18.3, TypeScript 5.7, Vite 6.3
- **UI**: Tailwind CSS 3.4, Radix UI, Lucide Icons
- **地図**: Leaflet 1.9, React Leaflet 4.2
- **日付**: date-fns 3.x, react-day-picker 8.10
- **フォーム**: React Hook Form 7.55

### 予定（バックエンド）
- **ランタイム**: Node.js 20 LTS
- **フレームワーク**: Express.js
- **データベース**: PostgreSQL 15+
- **ORM**: Prisma
- **認証**: JWT + bcrypt
- **Excel**: exceljs
- **PDF**: puppeteer
- **CSV**: csv-parse, csv-stringify

## 開発環境のセットアップ

### フロントエンド（現在動作中）
```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev

# ブラウザで http://localhost:5173 にアクセス
```

### バックエンド（未実装）
```bash
# Phase 1 完了後に利用可能
cd backend
npm install
npm run dev
```

## プロジェクト構造

```
無人機飛行記録APP/
├── docs/                      # ドキュメント
│   ├── README.md             # このファイル
│   ├── 開発要件定義書.md      # 完全な要件定義
│   └── 実装計画.md            # 段階的実装計画
├── src/                       # フロントエンド（React）
│   ├── components/           # UIコンポーネント
│   │   ├── ui/              # 基本UIコンポーネント
│   │   ├── FlightLogForm.tsx # 飛行記録フォーム
│   │   ├── LocationInput.tsx # 場所入力
│   │   ├── MapPicker.tsx    # 地図選択
│   │   └── ...
│   ├── App.tsx              # メインアプリ
│   ├── main.tsx             # エントリーポイント
│   └── index.css            # グローバルスタイル
├── backend/                  # バックエンド（未実装）
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── utils/
│   │   └── validators/
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── vite.config.ts
```

## 法的背景と参考資料

### 法令
- **改正航空法**（令和3年6月改正）
- **航空法施行規則** 第236条の5（飛行日誌の記載事項）
- **国土交通省 無人航空機の飛行日誌の取扱いに関するガイドライン**

### 様式定義
- **様式1**: 飛行記録
- **様式2**: 日常点検記録
- **様式3**: 点検整備記録

### データ保存義務
- **保存期間**: 3年間
- **対象**: 特定飛行を行う場合に義務化
- **形式**: 紙または電磁的記録

### 参考システム
- **DroneLog**: CSV形式、内部ID管理方式を参考

## ライセンス

（プロジェクトのライセンスを記載）

## 連絡先

（開発者・組織の連絡先を記載）

---

**最終更新**: 2025年11月13日

