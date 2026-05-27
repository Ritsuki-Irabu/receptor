# Receptor（リセプター）

> 思考アジリティ可視化アプリ
> ユーザーの思考ログをAIが分析し、思考の偏りを構造的に可視化することで、客観的な自己理解と柔軟な思考を育てる支援を行うWebアプリケーション。

![Status](https://img.shields.io/badge/Status-In%20Development-yellow)
![MVP](https://img.shields.io/badge/MVP-2026%2F06-blue)

-----

## 📌 概要

「食わず嫌い」による思考の固定化を可視化し、RadarChartで自己診断できるHRテック寄りサービス。思考ログを入力するだけで、AIが5カテゴリでスコアリングし、Agility Scoreとして思考の柔軟性を0〜100で数値化する。

-----

## 🛠 技術スタック

| レイヤー       | 技術                                                                   |
| -------------- | ---------------------------------------------------------------------- |
| フロントエンド | Next.js (App Router) / TypeScript / Framer Motion / @use-gesture/react |
| データ可視化   | カスタムSVG（RadarChart・MindMap）                                     |
| 認証           | Auth.js (NextAuth v5)                                                  |
| DB / ORM       | PostgreSQL / Prisma                                                    |
| AI連携         | Google AI SDK / Gemini 1.5 Flash                                       |
| 開発支援       | ChatGPT / Claude Code / CLAUDE.md運用                                            |
| デプロイ       | Vercel + Neon（Vercel公式連携）                                        |

-----

## 🏗 システム構成

### システムコンテキスト図

```mermaid
flowchart TD
    User((ユーザー))
    System["思考アジリティ可視化アプリ\n(本システム)"]
    Gemini["Gemini API\n(Google AI SDK)"]

    User -- "思考ログを入力\nポートフォリオを閲覧" --> System
    System -- "プロンプトおよびログを送信\n分析結果(JSON)を受信" --> Gemini
```

### アーキテクチャ図

```mermaid
flowchart LR
    subgraph Client ["Client Side"]
        UI["Web Browser\n(Next.js)"]
    end

    subgraph Server ["Server Side (Next.js)"]
        API["API Routes\n(分析・集計ロジック)"]
        Auth["Auth.js\n(認証管理)"]
    end

    subgraph Data ["Data Store"]
        DB[("PostgreSQL\n(Prisma)")]
    end

    subgraph External ["External Services"]
        AI["Gemini 1.5 Flash\n(Google AI Studio)"]
    end

    UI -- "JSON / Auth" --> Server
    API --> DB
    API -- "API Call" --> AI
```

-----

## 📁 ディレクトリ構成

```
app/                           # App Router (Pages, Layouts, API)
├── (auth)/                    # 認証関連 (Login/Register)
├── api/                       # API Endpoints
│   ├── auth/                  # Auth.js (NextAuth) 設定
│   ├── logs/                  # POST(新規分析)/PATCH(編集)/DELETE(削除)
│   │   └── [id]/              # 個別ログ操作用
│   └── portfolio/             # GET(統計データ取得)
├── components/                # UI Components（カスタム実装、Shadcn不使用）
├── lib/                       # Shared Utilities & Logic
│   ├── prisma.ts              # Prisma Client 初期化
│   ├── gemini.ts              # Logic A: Gemini API 連携（新規投稿時のみ使用）
│   └── agility-logic.ts      # Logic B: スコア算出（編集・削除・取得時の再計算）
├── types/                     # TypeScript 型定義
│   ├── index.d.ts             # 共通型定義
│   └── api.ts                 # APIレスポンス等の型定義
├── layout.tsx                 # 共通レイアウト・フォント設定
└── page.tsx                   # ホーム画面
prisma/
└── schema.prisma              # Prisma Schema (Table definitions)
```

-----

## 🧠 独自ロジック

### Logic A：AI思考分析（`lib/gemini.ts`）

Gemini 1.5 Flashを使用し、単一ログから5カテゴリのスコアをJSON形式で取得。新規投稿時のみAPIを呼び出し、編集・削除時はコストゼロで再計算する設計。

**思考カテゴリ**

| カテゴリ    | 説明                                 |
| ----------- | ------------------------------------ |
| Analytical  | 論理思考・問題分解・根拠に基づく判断 |
| Strategic   | 長期視点・目標設計・全体最適         |
| Exploratory | 未知への好奇心・仮説検証・アイデア   |
| Reflective  | 自己客観化・振り返り・気づきの言語化 |
| Social      | 他者理解・共感・チーム協働           |

### Logic B：Agility Score算出（`lib/agility-logic.ts`）

過去ログから思考の柔軟性を0〜100で数値化する独自アルゴリズム。

```
Agility Score = (多様性 × 0.4) + (更新度 × 0.3) + (領域数 × 0.3)
```

| 要素   | 内容                              |
| ------ | --------------------------------- |
| 多様性 | 5カテゴリのスコア分布（標準偏差） |
| 更新度 | 直近ログと過去平均の乖離          |
| 領域数 | スコア0.5超のカテゴリ数           |

-----

## 🗄 データベース設計

```mermaid
erDiagram
    users ||--o{ thought_logs : "owns"
    thought_logs ||--o| analysis_results : "analyzed_as"
    analysis_results ||--o{ analysis_scores : "contains"

    users {
        uuid id PK
        string email UK
        string name
        timestamp created_at
    }
    thought_logs {
        uuid id PK
        uuid user_id FK
        text content
        timestamp created_at
    }
    analysis_results {
        uuid id PK
        uuid thought_log_id FK
        timestamp created_at
    }
    analysis_scores {
        uuid id PK
        uuid analysis_result_id FK
        string category
        float score
    }
```

-----

## 🗺 開発ロードマップ

> UIタスクはreframing-journeyプロトタイプ（別プロジェクト）で実装済み。Sprint 4にて本リポジトリへ統合予定。

### Sprint 1：基盤構築 ✅

- [x] Next.jsプロジェクト初期化
- [x] Prisma Schema定義・DBマイグレーション
- [x] Auth.js (v5) セットアップ・認証ガード実装
- [x] 共有レイアウト（Nav/Sidebar）作成

### Sprint 2：AI分析エンジン & 入力フロー

- [x] Gemini API連携 Service実装（`lib/gemini.ts`）※完全手動
- [x] `POST /api/logs` エンドポイント実装
- [x] 思考ログ入力フォームUI（別PJ完了）
- [x] Loading状態管理・ログ履歴一覧（別PJ完了）
- [x] `GET /api/logs` エンドポイント実装

### Sprint 3：スコア計算・可視化

- [ ] Agility Score算出アルゴリズム実装（`lib/agility-logic.ts`）※完全手動
- [ ] 算出ロジックの単体テスト（境界値対応）
- [x] カスタムSVGレーダーチャート実装（別PJ完了）
- [x] ポートフォリオ・ダッシュボード統合（別PJ完了）
- [ ] `PATCH/DELETE /api/logs/[id]` エンドポイント実装
- [ ] `GET /api/portfolio` エンドポイント実装
- [ ] パフォーマンス最適化

### Sprint 4：フロントエンド統合

- [x] reframing-journeyプロトタイプ移植
- [x] APIとの結合・動作確認（E2E疎通確認）

-----

## 🌿 ブランチ戦略

実務的な現場開発を想定し、Lightweight Git Flowを採用。

```
main        ← 本番相当（Vercelのproductionデプロイ先）
 └── develop ← 統合ブランチ（Vercelのpreviewデプロイ先）
       └── feat/sprint-1-2-prisma-schema  ← 使い捨て（マージ後削除）
       └── feat/sprint-1-4-auth-js
       └── fix/バグ名
```

| ブランチ     | 役割                               |
| ------------ | ---------------------------------- |
| `main`       | 常にデプロイ可能な本番相当ブランチ |
| `develop`    | スプリント統合・動作確認用ブランチ |
| `feat/〇〇`  | タスク単位の使い捨てフィーチャーブランチ |
| `fix/〇〇`   | バグ修正用の使い捨てブランチ       |

-----

## 💡 設計上のこだわり

- **AIコスト最適化**：編集・削除時はGemini APIを呼び出さず、既存スコアから再計算
- **型安全性**：`any`を排除し、APIレスポンス・DBモデルの型を厳格に定義
- **AIペアプロ前提**：CLAUDE.mdによる開発ガイドラインを自作し、主導権を持ちながらAIと協働
- **上流から一気通貫**：要件定義・基本設計・詳細設計・DB物理設計まで個人で業務水準のドキュメントを構築

-----

## 👤 開発者

SESでテスター業務に従事しながら、バックエンドエンジニアへの転向を目指して個人開発中。  
**目標**：2026年8月までにNext.js (App Router) でフルスタック開発を完遂し、設計・実装・品質担保まで一人で担えるエンジニアとして市場接続。
