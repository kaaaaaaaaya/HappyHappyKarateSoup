# Pages ディレクトリ

Webアプリケーションのページコンポーネント集です。ユーザーインターフェースの各画面と、それに関連するロジック・ユーティリティを含みます。

## ページ構成

### トップレベルページコンポーネント

| ファイル | 説明 |
|---------|------|
| **Home.tsx** | ログイン前のホーム画面。ゲーム説明と「ログインする」ボタンを表示 |
| **Login.tsx** | ユーザー認証ページ。Google認証などを使用してログイン処理を実行 |
| **HomeLoggedIn.tsx** | ログイン後のホーム画面。ゲーム開始やプロフィール表示 |
| **Connect.tsx** | iPhone コントローラーとの接続画面。QRコードを表示し、device IDで接続管理 |
| **SelectDifficulty.tsx** | ゲーム難易度選択画面 |

### ゲームフロー関連ページ

#### **SelectIngredient/** (具材選択)
ゲーム開始時に使用する具材を選択するページ

- **SelectIngredient.tsx**: 具材選択UIのメインコンポーネント
- **useSelectIngredient.tsx**: 具材選択ロジック（状態管理）
- **useIngredientController.ts**: コントローラーからの入力を処理してゲーム操作に変換
- **emojis.ts**: 各具材に対応する絵文字の管理

#### **Game/** (ゲームプレイ)
実際のゲームプレイ画面

- **Game.tsx**: ゲーム画面のメインコンポーネント
- **useGameLogic.ts**: ゲーム状態とアクション処理の中核ロジック
- **useScoreLogic.tsx**: スコア計算と結果集計
- **timing.ts**: アクション検出のタイミング情報
- **types.ts**: ゲーム関連の型定義

#### **Result/** (結果表示)
ゲーム完了後の結果表示ページ

- **Result.tsx**: リザルト画面のメインコンポーネント
- **writeChart.tsx**: スコアチャート・グラフ描画処理

## ゲームフロー

```
Home.tsx
   ↓ (ログイン)
Login.tsx
   ↓ (認証完了)
HomeLoggedIn.tsx
   ↓ (ゲーム開始)
Connect.tsx
   ↓ (iPhone接続)
SelectDifficulty.tsx
   ↓ (難易度選択)
SelectIngredient/
   ↓ (具材選択)
Game/
   ↓ (ゲームプレイ)
Result/
   ↓ (結果確認)
HomeLoggedIn.tsx
```

## 主要なロジック

### ゲーム状態管理
- **useGameLogic.ts**: ゲーム時間、具材状態、イベント処理を一元管理
- **useScoreLogic.tsx**: スコア計算アルゴリズムと最終結果生成

### コントローラー連携
- **useIngredientController.ts**: iPhone からのモーション入力をゲームアクションに変換
- **Connect.tsx**: WebSocket接続の初期化と Device ID 管理

### データ型
- **Game/types.ts**: ゲーム内で使用される型定義
  - `Ingredient`: 具材情報
  - `GameState`: ゲーム状態
  - `ActionEvent`: ユーザーアクション

## ディレクトリ構造

```
pages/
├── Home.tsx
├── HomeLoggedIn.tsx
├── Login.tsx
├── Connect.tsx
├── SelectDifficulty.tsx
├── SelectIngredient/
│   ├── SelectIngredient.tsx
│   ├── useSelectIngredient.tsx
│   ├── useIngredientController.ts
│   └── emojis.ts
├── Game/
│   ├── Game.tsx
│   ├── useGameLogic.ts
│   ├── useScoreLogic.tsx
│   ├── timing.ts
│   └── types.ts
└── Result/
    ├── Result.tsx
    └── writeChart.tsx
```

## 開発ガイドライン

### ページの追加

新しいページを追加する手順:

1. `pages/` の直下にコンポーネントファイルを作成
   ```tsx
   // pages/NewPage.tsx
   export default function NewPage() {
     return <div>New Page</div>;
   }
   ```

2. ルーティング設定に追加（`src/App.tsx` など）

3. 必要であればカスタムフックを同じディレクトリに追加

### クロスページ通信

ページ間でのデータ共有は以下の方法で実現:

- **Context API**: グローバル状態（ユーザー情報、iPhone接続情報）
- **URL パラメータ**: ページ遷移時に必要な情報を pass
- **Redux / 状態管理**: 複雑な状態管理が必要な場合

### iPhone コントローラーとの連携

Game・SelectIngredient ページでコントローラー入力を処理する際:

1. `useIngredientController.ts` のカスタムフックを使用
2. WebSocket イベントをゲームアクション（スライス、混ぜなど）に変換
3. タイミング情報は `Game/timing.ts` を参照

## 関連ドキュメント

- [Webアプリアーキテクチャ](../../../docs/architecture/apps/web/)
- [全体アーキテクチャ](../../../docs/architecture/data_flow.md)
- [コンポーネント集](../components/)
- [API統合](../api/)
