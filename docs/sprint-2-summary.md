# Sprint 2 まとめ — AI分析エンジン & 入力フロー

## 実装済みタスク

| タスクID | タスク名 | 状態 | 備考 |
|---|---|---|---|
| 2.1 | Gemini API 連携 Service実装 | 完了 | 完全手動 |
| 2.2 | POST /api/logs エンドポイント | 完了 | |
| 2.3 | 思考ログ入力フォーム UI | 完了 | 別PJ実装済み・統合時に移植 |
| 2.4 | 分析中のLoading状態管理 | 完了 | 別PJ実装済み・統合時に移植 |
| 2.5 | ログ履歴一覧コンポーネント | 完了 | 別PJ実装済み・統合時に移植 |
| 2.6 | GET /api/logs エンドポイント | 完了 | |

---

## 実装ファイル一覧

| ファイル | 内容 |
|---|---|
| `app/lib/gemini.ts` | Logic A: Gemini API連携・5カテゴリスコア取得 |
| `app/lib/prisma.ts` | Prisma Client シングルトン初期化 |
| `app/types/api.ts` | APIリクエスト・レスポンスの型定義 |
| `app/api/logs/route.ts` | POST / GET /api/logs 本体 |

---

## 処理フロー

### POST /api/logs（新規ログ投稿）
1. セッション確認（未認証は 401）
2. ThoughtLog を DB に保存
3. Gemini API で5カテゴリ分析
4. AnalysisResult + AnalysisScore を DB に保存
5. `{ success: true, logId }` を返す

### GET /api/logs（ログ一覧取得）
1. セッション確認（未認証は 401）
2. ログインユーザーの ThoughtLog を新着順で取得
3. AnalysisResult・AnalysisScore を同時取得
4. カテゴリスコアを整形して返す

---

## 設計上の判断

| 判断 | 選択 | 理由 |
|---|---|---|
| Gemini失敗時 | ThoughtLogを残す | ユーザーの入力を失わないため |
| POSTレスポンス | 完了通知のみ | フロントは別途GETで取得するため |
| 分析未完了ログ | scores: null で返す | フロントでEmpty Stateを表示するため |
| PATCH/DELETE | 後回し | agility-logic.ts（Sprint 3.1）への依存があるため |

---

## 学習ポイント

### Prisma
- ORM（Object-Relational Mapper）。LaravelのEloquent、Spring BootのJPAに相当。
- SQLを書かずにTypeScriptのコードでDBを操作できる。
- Prisma Client はシングルトンパターンで初期化（Next.jsのホットリロード対策）。

### シングルトンパターン
- インスタンスをアプリ全体で1つだけに制限する設計パターン。
- `globalThis` を使ってPrisma Clientの増殖を防ぐ。

### API設計
- 同一ファイル（route.ts）に `POST` と `GET` を並列で定義できる。
- 認証は `auth()` でセッションを取得し、`session?.user?.id` で確認する。

---

## ブランチ・PR履歴

| ブランチ | PR | 内容 |
|---|---|---|
| feat/sprint-2-2-api-logs | #8 → develop | Prisma初期化・型定義・POST /api/logs |
| feat/sprint-2-6-get-logs | #9 → develop | GET /api/logs |
