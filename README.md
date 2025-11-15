# 🚁 ソラログ (SoraLog)

**無人航空機日誌システム | 国土交通省様式完全対応 | クラウド同期 | オフライン優先**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/your-repo)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Ready-green)](https://supabase.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## 🎯 概要

**ソラログ (SoraLog)** は、国土交通省が定める無人航空機の飛行日誌管理システム。Supabase をバックエンドとした、クラウド同期・オフライン優先・多デバイス対応の次世代アプリケーションです。

### 主要機能

✅ **飛行記録管理** - 飛行時間自動計算、地図選択、詳細記録  
✅ **操縦者管理** - 飛行時間追跡、資格情報管理  
✅ **機体管理** - 複数機体登録、飛行時間記録  
✅ **完全オフライン対応** - ネットなしでも動作、自動同期  
✅ **クラウド同期** - 多デバイス間でデータ自動同期  
✅ **データ完全隔離** - ユーザーごとにデータ分離、セキュア  
✅ **CSV/Excel/PDF 導出** - データ分析・印刷対応  
✅ **モバイル最適化** - タッチフレンドリー UI  

---

## 🚀 5分でスタート

### 必要なもの

- Node.js 18+ / npm
- モダンブラウザ（Chrome/Firefox/Safari/Edge）
- Supabase アカウント（無料）

### ステップ 1: Supabase セットアップ

1. **Supabase プロジェクト作成**  
   → https://supabase.com で新規プロジェクト作成

2. **データベース構築**  
   → SQL Editor で `supabase-migration.sql` を実行

3. **環境変数設定**  
   プロジェクトルートに `.env` ファイルを作成：

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

詳細は → **[QUICK-START-SUPABASE.md](QUICK-START-SUPABASE.md)** 📘

### ステップ 2: アプリ起動

```bash
# 依存パッケージインストール
npm install

# 開発サーバー起動
npm run dev
```

ブラウザで http://localhost:5173 を開く → **完成！** 🎉

### ステップ 3: アカウント登録

1. 右上の「ログイン」ボタンをクリック
2. 「新規登録」タブに切り替え
3. メール・パスワードを入力して登録
4. すぐに使用開始！

---

## 🏗️ アーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│                フロントエンド                        │
│      React + TypeScript + Tailwind CSS              │
│  ┌──────────────────────────────────────────────┐  │
│  │  飛行記録 │ 操縦者管理 │ 機体管理 │ 統計     │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │  IndexedDB (離線ストレージ)                   │  │
│  │  自動同期サービス                              │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                     ↕ REST API + Auth
┌─────────────────────────────────────────────────────┐
│                   Supabase                          │
│  ┌──────────────┐  ┌──────────────┐               │
│  │  PostgreSQL  │  │  Auth (JWT)  │               │
│  │  データベース │  │  ユーザー管理 │               │
│  └──────────────┘  └──────────────┘               │
│  ┌──────────────────────────────────────────────┐  │
│  │  Row Level Security (RLS)                    │  │
│  │  - ユーザーごとにデータ分離                    │  │
│  │  - 不正アクセス防止                           │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### なぜ Supabase？

- ✅ **開発速度**: バックエンド開発不要、5分で稼働
- ✅ **セキュリティ**: Row Level Security で完全なデータ分離
- ✅ **スケーラビリティ**: 自動スケーリング、高可用性
- ✅ **無料枠**: 個人使用に十分（500MB DB、2GB ストレージ）
- ✅ **リアルタイム**: 多デバイス同期対応（オプション）

---

## 📁 プロジェクト構造

```
.
├── src/                           # フロントエンドコード
│   ├── components/                # UIコンポーネント
│   │   ├── AuthModal.tsx          # 認証モーダル
│   │   ├── UserMenu.tsx           # ユーザーメニュー
│   │   ├── FlightLogForm.tsx      # 飛行記録フォーム
│   │   ├── PilotManagement.tsx    # 操縦者管理
│   │   ├── UAVManagement.tsx      # 機体管理
│   │   ├── FlightHistory.tsx      # 飛行履歴
│   │   ├── FlightStatistics.tsx   # 統計表示
│   │   ├── ExportPanel.tsx        # データ導出
│   │   ├── MapPicker.tsx          # 地図選択
│   │   └── ui/                    # 再利用UIコンポーネント
│   ├── contexts/
│   │   └── AuthContext.tsx        # 認証コンテキスト
│   ├── services/                  # サービス層
│   │   ├── supabase.service.ts    # Supabase クライアント
│   │   ├── supabase-sync.service.ts # 同期サービス
│   │   ├── storage.service.ts     # IndexedDB
│   │   └── local-export.service.ts # CSV/Excel/PDF 導出
│   ├── types/
│   │   └── index.ts               # TypeScript 型定義
│   └── App.tsx                    # メインアプリ
│
├── docs/                          # ドキュメント
│   ├── QUICK-START-SUPABASE.md    # 🔥 5分スタートガイド
│   ├── SUPABASE-SETUP.md          # 詳細セットアップ
│   └── SUPABASE-MIGRATION-SUMMARY.md # 移行サマリー
│
├── supabase-migration.sql         # データベーススキーマ
├── package.json                   # 依存パッケージ
└── README.md                      # このファイル
```

---

## 🔧 技術スタック

### フロントエンド
- **React 18.3** - UI フレームワーク
- **TypeScript 5.7** - 型安全
- **Vite 6.3** - 高速ビルドツール
- **Tailwind CSS 3.4** - ユーティリティファーストCSS
- **Radix UI** - アクセシブル UI コンポーネント
- **Leaflet** - 地図ライブラリ
- **date-fns** - 日付処理
- **ExcelJS** - Excel 生成
- **Puppeteer** - PDF 生成

### バックエンド (Supabase)
- **PostgreSQL 15** - リレーショナルデータベース
- **PostgREST** - 自動 REST API
- **GoTrue** - JWT 認証
- **Row Level Security** - データ分離

### ストレージ
- **IndexedDB** - ブラウザ内オフラインストレージ
- **Supabase Database** - クラウドストレージ

---

## 📖 ドキュメント

### スタートガイド
- 📘 **[5分クイックスタート](QUICK-START-SUPABASE.md)** - すぐに始める
- 📗 **[Supabase セットアップ詳細](SUPABASE-SETUP.md)** - 完全ガイド
- 📕 **[導出機能ガイド](EXPORT-GUIDE.md)** - CSV/Excel/PDF

### 技術ドキュメント
- 📙 **[移行サマリー](SUPABASE-MIGRATION-SUMMARY.md)** - アーキテクチャ説明
- 📔 **[オフラインサポート](OFFLINE-SUPPORT.md)** - オフライン機能

---

## ✨ 主要機能詳細

### 🛫 飛行記録管理

- **15+ フィールド**: 日時、場所、機体、操縦者、天候、目的など
- **飛行時間自動計算**: 開始/終了時刻から自動算出
- **地図統合**: Leaflet で場所を地図から選択
- **リアルタイム統計**: 総飛行時間、フライト回数など

### 👨‍✈️ 操縦者管理

- **資格情報**: 免許番号、免許種別
- **飛行時間追跡**: 初期値 + 累計飛行時間
- **連絡先管理**: メール、電話番号
- **アクティブ状態**: 現役/退役管理

### 🚁 機体管理

- **複数機体対応**: 無制限の機体登録
- **認証管理**: 認定機/非認定機、認証番号
- **飛行時間記録**: 総飛行時間、整備後飛行時間
- **メーカー/モデル**: 詳細情報管理

### 📊 統計・分析

- **リアルタイム統計**: 総飛行回数、総飛行時間
- **チャート表示**: 月別フライト数、機体別分析
- **フィルタリング**: 日付、操縦者、機体で絞り込み

### 💾 オフライン優先

- **完全オフライン動作**: ネットなしでも使用可能
- **自動同期**: 接続復帰時に自動クラウド同期
- **競合解決**: 最新データ優先
- **同期状態表示**: オンライン/オフライン/同期中

### 🔐 セキュリティ

- **ユーザー認証**: メール/パスワードログイン
- **データ分離**: RLS でユーザーごとにデータ完全分離
- **JWT トークン**: セキュアな認証
- **HTTPS 通信**: データ暗号化

---

## 📱 マルチデバイス対応

### デスクトップ
- ✅ Windows 10+
- ✅ macOS 11+
- ✅ Linux

### モバイル
- ✅ iOS 14+ (Safari)
- ✅ Android 8+ (Chrome)

### ブラウザ
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

---

## 🚀 デプロイ

### フロントエンド

**Vercel でデプロイ（推奨）**
```bash
npm run build
# Vercel にデプロイ
```

**Netlify でデプロイ**
```bash
npm run build
# Netlify にデプロイ
```

### 環境変数設定

デプロイ先で以下の環境変数を設定：
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 🎓 国土交通省ガイドライン対応

本システムは以下の規範に対応：

### 飛行記録
> 「無人航空機の飛行日誌の取扱要領」  
> 飛行年月日、操縦者、機体情報、飛行目的、飛行経路、  
> 離着陸場所・時刻、飛行時間、総飛行時間等

---

## 🤝 コントリビューション

プルリクエスト歓迎！

1. Fork このリポジトリ
2. Feature ブランチ作成 (`git checkout -b feature/AmazingFeature`)
3. 変更コミット (`git commit -m 'Add some AmazingFeature'`)
4. ブランチプッシュ (`git push origin feature/AmazingFeature`)
5. Pull Request 作成

---

## 📄 ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

**商用利用可能** | 改変可能 | 再配布可能

---

## 📞 サポート

### 問題報告
- GitHub Issues: [issues](https://github.com/your-repo/issues)

### ドキュメント
- 📚 [完全ドキュメント](docs/)

---

## 🎉 謝辞

- **Supabase** - 素晴らしいバックエンドプラットフォーム
- **Radix UI** - アクセシブル UI コンポーネント
- **Tailwind CSS** - ユーティリティファーストCSS
- **Leaflet** - オープンソース地図ライブラリ
- **国土交通省** - ガイドライン提供

---

<div align="center">

**ソラログ (SoraLog) v1.0.0**

無人航空機日誌システム | Supabase 駆動 | オフライン優先 | クラウド同期

Made with ❤️ for Drone Pilots

[⭐ Star](https://github.com/your-repo) | [📖 Docs](docs/) | [🐛 Report Bug](https://github.com/your-repo/issues)

</div>
