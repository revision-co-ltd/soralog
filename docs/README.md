# 📚 ドキュメント - ソラログ (SoraLog)

**無人航空機日誌システム | Supabase 駆動 | オフライン優先**

---

## 🚀 クイックスタート

新規ユーザーの方は、こちらから始めてください：

### 1. **[QUICK-START-SUPABASE.md](archive/20251204_root_cleanup/QUICK-START-SUPABASE.md)** 🔥
   **5分でアプリを起動！**
   - Supabase プロジェクト作成
   - データベース構築
   - アプリ起動
   - アカウント登録

### 2. **[SUPABASE-SETUP.md](archive/20251204_root_cleanup/SUPABASE-SETUP.md)** 📖
   **詳細なセットアップガイド**
   - 環境変数の設定
   - トラブルシューティング
   - よくある質問

---

## 📖 ユーザーガイド

### 基本機能
- **[README.md](../README.md)** - プロジェクト概要と主要機能
- **[OFFLINE-SUPPORT.md](archive/20251204_root_cleanup/OFFLINE-SUPPORT.md)** - オフライン機能の使い方
- **[EXPORT-GUIDE.md](archive/20251204_root_cleanup/EXPORT-GUIDE.md)** - CSV/Excel/PDF 導出ガイド

### UI/UX
- **[UI-LANGUAGE-JAPANESE.md](archive/20251204_root_cleanup/UI-LANGUAGE-JAPANESE.md)** - 日本語対応について
- **[BRANDING.md](archive/20251204_root_cleanup/BRANDING.md)** - ブランディングガイド

---

## 🔧 開発者向け

### アーキテクチャ
- **[SUPABASE-MIGRATION-SUMMARY.md](archive/20251204_root_cleanup/SUPABASE-MIGRATION-SUMMARY.md)** - Supabase アーキテクチャ詳細
- **[AUTH-SUMMARY.md](archive/20251204_root_cleanup/AUTH-SUMMARY.md)** - 認証システム
- **[supabase-migration.sql](../supabase-migration.sql)** - データベーススキーマ

### 開発ログ
- **[CLEANUP-REPORT.md](archive/20251204_root_cleanup/CLEANUP-REPORT.md)** - コードクリーンアップレポート
- **[PROJECT-STATUS.md](archive/20251204_root_cleanup/PROJECT-STATUS.md)** - プロジェクト状態
- **[CHANGELOG.md](../CHANGELOG.md)** - 変更履歴

---

## 🗂️ アーカイブ

### [archive/](./archive/)
旧アーキテクチャ（Express + Prisma）に関連する古いドキュメントは、参照用にアーカイブされています：

- 開発要件定義書
- 実装計画
- 旧セットアップガイド
- 進捗記録

**注意**: アーカイブされたドキュメントは現在のシステムには適用されません。

---

## 📊 プロジェクト構造

```
/Users/yang/Downloads/20251113无人机飞行记录APP /
├── docs/                          # このフォルダ
│   ├── README.md                  # このファイル
│   └── archive/                   # 旧ドキュメント
│
├── src/                           # フロントエンドコード
│   ├── components/                # UI コンポーネント
│   ├── services/                  # サービス層
│   │   ├── supabase.service.ts
│   │   └── supabase-sync.service.ts
│   └── contexts/                  # React コンテキスト
│
├── QUICK-START-SUPABASE.md        # 🔥 スタートここから
├── SUPABASE-SETUP.md              # 詳細ガイド
├── supabase-migration.sql         # DB スキーマ
└── README.md                      # プロジェクト README
```

---

## 🆘 困ったときは

### よくある質問

**Q: アプリが起動しない**  
A: `QUICK-START-SUPABASE.md` のトラブルシューティングセクションを参照

**Q: データが同期されない**  
A: `.env` ファイルの設定を確認し、アプリを再起動

**Q: オフラインで使いたい**  
A: `OFFLINE-SUPPORT.md` を参照

**Q: 旧バックエンドのドキュメントは？**  
A: `archive/` フォルダに移動されました

### サポート

- 📧 GitHub Issues: [issues](https://github.com/your-repo/issues)
- 💬 質問: README の各ドキュメントを参照

---

## 🎯 推奨読む順番

### 新規ユーザー
1. **README.md** (プロジェクト概要)
2. **QUICK-START-SUPABASE.md** (5分セットアップ)
3. **OFFLINE-SUPPORT.md** (オフライン機能)
4. **EXPORT-GUIDE.md** (データ導出)

### 開発者
1. **SUPABASE-MIGRATION-SUMMARY.md** (アーキテクチャ)
2. **supabase-migration.sql** (DB スキーマ)
3. **AUTH-SUMMARY.md** (認証)
4. **src/services/** (コードを読む)

### コントリビューター
1. **CLEANUP-REPORT.md** (最近の変更)
2. **PROJECT-STATUS.md** (現在の状態)
3. **CHANGELOG.md** (変更履歴)

---

## 📅 最終更新

**日付**: 2025-11-15  
**バージョン**: 1.0.0  
**アーキテクチャ**: Supabase (PostgreSQL + Auth + API)

---

## 🎉 始めましょう！

準備ができたら、**[QUICK-START-SUPABASE.md](archive/20251204_root_cleanup/QUICK-START-SUPABASE.md)** を開いて、5分でアプリを起動しましょう！

**がんばってください！** 🚀






