# Sprint 1 まとめ — 基盤構築 & データモデリング

## 実装済みタスク

| タスクID | タスク名 | 状態 |
|---|---|---|
| 1.1 | Next.js プロジェクト初期化 | 完了 |
| 1.2 | Prisma Schema定義 | 完了 |
| 1.3 | DBマイグレーション & Seed作成 | 完了 |
| 1.4 | Auth.js (v5) セットアップ | 完了 |
| 1.5 | 共有レイアウト（Nav/Sidebar）実装 | 完了 |

---

## 実装ファイル一覧

| ファイル | 内容 |
|---|---|
| `prisma/schema.prisma` | テーブル定義（User, ThoughtLog, AnalysisResult, AnalysisScore） |
| `prisma/migrations/` | スキーマをDBに反映したマイグレーションファイル |
| `prisma/seed.ts` | 開発用ダミーデータの投入スクリプト |
| `auth.ts` | Auth.js 本体（PrismaAdapter・Google Provider設定） |
| `auth.config.ts` | 認証設定（Providerとサインインページの指定） |
| `app/api/auth/[...nextauth]/route.ts` | Auth.jsのハンドラをNext.jsに接続 |
| `app/components/layout/Nav.tsx` | ナビゲーションバー（ロゴ・ユーザー名・ログアウト） |
| `app/components/layout/Sidebar.tsx` | サイドバー（思考ログ・ポートフォリオへのリンク） |
| `app/layout.tsx` | 全画面共通レイアウト |

---

## DBスキーマ設計

### テーブル構成とリレーション

```
users
  └── thought_logs（1対多）
        └── analysis_results（1対1）
              └── analysis_scores（1対多）
```

### 各テーブルの役割

| テーブル | 役割 |
|---|---|
| users | ユーザー情報（Google認証と紐づく） |
| thought_logs | ユーザーが投稿した思考ログ本文 |
| analysis_results | Gemini分析の結果レコード（ログと1対1） |
| analysis_scores | 5カテゴリ別のスコア（分析結果と1対多） |

### ThinkingCategory（enum）

```
analytical  / strategic / exploratory / reflective / social
```

---

## 認証設計（Auth.js v5）

- **Provider**: Google OAuth
- **Adapter**: PrismaAdapter（セッション情報をDBで管理）
- **サインインページ**: `/login`（カスタムページ）
- **セッション取得**: `auth()` 関数でサーバーサイドから取得

---

## Seed データ

開発用として以下を投入。

- ユーザー: 1件（test@receptor.dev）
- 思考ログ: 3件（論理思考・探索思考・内省思考の偏りを持つサンプル）
- 分析スコア: 合計15件（3ログ × 5カテゴリ）

---

## 学習ポイント

### Next.js App Router
- `app/` 配下がページ・API・レイアウトのすべてを管理する構成。
- `layout.tsx` に共通UIを置くことで全画面に適用できる。

### Prisma の3要素

| 要素 | 役割 |
|---|---|
| Prisma Schema | テーブル設計・ルール定義 |
| Prisma Migrate | スキーマをDBに反映 |
| Prisma Client | コードからDBを操作する窓口 |

### Auth.js (v5)
- `auth.ts` と `auth.config.ts` を分離する構成が推奨パターン。
- PrismaAdapter を使うことでセッション・アカウント情報を自動的にDBへ保存。

---

## ブランチ・PR履歴

| ブランチ | 内容 |
|---|---|
| feat/sprint-1-2-3-prisma-setup | Prisma Schema・マイグレーション・Seed |
| feat/sprint-1-4-auth-js | Auth.js セットアップ |
| feat/sprint-1-5-shared-layout | Nav・Sidebar 実装 |
