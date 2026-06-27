# HappyHappyKarateSoup - Web Frontend

React + TypeScript + Vite で構築されたリズムゲームの Web フロントエンド。iOS コントローラーからの入力を受け取り、リアルタイムなゲーム体験を提供する。

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | React 19 |
| 言語 | TypeScript 5.9 |
| ビルドツール | Vite 8 |
| スタイリング | Tailwind CSS 4 |
| ルーティング | React Router v7 |
| チャート | Chart.js / react-chartjs-2 |
| QR コード | qrcode.react |

## セットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動（http://localhost:5173）
npm run dev

# 型チェック & プロダクションビルド
npm run build

# リント
npm run lint
```

開発サーバーは `/api` へのリクエストを `http://localhost:8080`（バックエンド）にプロキシする。

## ディレクトリ構成

```
src/
├── api/                    # バックエンド API クライアント
│   ├── apiBase.ts          #   Axios/fetch ベース設定
│   ├── authApi.ts          #   認証（ログイン・登録）
│   ├── chartApi.ts         #   チャートデータ取得
│   ├── collectionApi.ts    #   コレクション管理
│   ├── controllerRoomApi.ts#   コントローラー接続ルーム
│   ├── profileApi.ts       #   プロフィール操作
│   ├── rankingApi.ts       #   ランキング取得
│   ├── scoreApi.ts         #   スコア送信・取得
│   └── soupApi.ts          #   スープ（レシピ）操作
├── assets/                 # 静的アセット
│   ├── backgrounds/        #   画面別背景画像
│   ├── characters/         #   キャラクター画像
│   ├── icons/              #   アイコン素材
│   └── ui/                 #   ロゴ等 UI パーツ
├── components/             # 共通コンポーネント
│   ├── BrandedBackground.tsx
│   ├── BrandedConnectionBackground.tsx
│   ├── Button.tsx
│   └── WeeklyCaloriesChart.tsx
├── pages/                  # ページコンポーネント（画面単位）
│   ├── Home.tsx            #   トップ画面
│   ├── Login.tsx           #   ログイン
│   ├── VerifyEmail.tsx     #   メール認証
│   ├── HomeLoggedIn.tsx    #   ログイン後ホーム
│   ├── SelectDifficulty.tsx#   難易度選択
│   ├── SelectIngredient/   #   具材選択（複数ファイル）
│   ├── Connect.tsx         #   iOS コントローラー接続
│   ├── Game/               #   ゲーム本体（複数ファイル）
│   │   ├── Game.tsx        #     メインゲーム画面
│   │   ├── useGameLogic.ts #     ゲームループ・判定ロジック
│   │   ├── useScoreLogic.tsx#    スコア計算
│   │   ├── timing.ts       #    タイミング定数
│   │   └── types.ts        #    ゲーム関連型定義
│   ├── Result/             #   リザルト画面
│   ├── Ranking.tsx         #   ランキング
│   ├── Profile.tsx         #   プロフィール
│   └── SoupHistory.tsx     #   スープ履歴
├── App.tsx                 # ルーティング定義
├── main.tsx                # エントリーポイント
└── index.css               # グローバルスタイル
```

## 画面フロー

```
Home → Login → SelectDifficulty → SelectIngredient → Connect → Game → Result
                                                                       ↓
                                                              Ranking / Profile / SoupHistory
```

---

## フロントエンドの工夫

### 状態管理

- **状態管理ライブラリ（Redux/Zustand/Jotai）を不使用。** sessionStorage + `location.state` + カスタムフックだけで完結。画面遷移が一方向のリニアなフローなので Context が必要な状況を作らない設計。
- **`parseDifficulty` による防御的な型強制：** `sessionStorage.getItem()` は常に `string | null` を返すが、ランタイムで検証しながらコンパイル時型に昇格する関数を作り、`as Difficulty` の型アサーションで逃げない設計。

### レンダリング性能（ゲーム固有）

- **`useRef` による再レンダー回避：** `Game.tsx` に18個の `useRef`。40msポーリングと60fpsゲームループが同時に走る中で、表示に反映しなくていい値は `useRef` で持ち React のレンダリングサイクルから切り離す。
- **`handleActionRef` パターン：** 40msポーリングの `useEffect` に `handleAction` を依存配列に入れると具材リストが変わるたびに Interval が破棄→再作成される。ref を1枚噛ませることでポーリングループを状態変化から完全に切り離す。
- **`requestAnimationFrame`：** `setInterval` ではなく VSync に同期、バックグラウンドタブで自動停止。
- **`performance.now()`：** `Date.now()`（ミリ秒精度）ではなくマイクロ秒精度を使用。判定窓が 200ms / 350ms / 500ms と細かいため必須。
- **`translate3d` による GPU アクセラレーション：** ノート移動を CSS `@keyframes` で処理、JS での位置計算と分離。
- **シーケンス番号による差分取得：** ポーリング結果に変化がなければ即 return。
- **`burstingIds` Set による二重判定防止：** バーストアニメーション中の同一具材の Miss 二重判定を O(1) ルックアップで防止。

### その他

- **`withAbsoluteIconUrl` ジェネリクス関数：** 2つの異なる型に対して同じ URL 変換処理を1関数で行いながら、戻り値の型が入力の型 `T` のまま保たれる。
- **`useMemo` / `useCallback` を適切な箇所に使用**（フォームバリデーション、ゲームループ内関数など）。

---

## iOS コントローラーの工夫

- **CoreMotion** の加速度センサーでパンチ/チョップを検出し、コマンドをバックエンドに送信。
- **AVFoundation** で QR コードを読み取り、カスタム URL スキーム（`happykaratesoup://connect?roomId=...`）でバックエンドに接続。
- iOS の**バイブレーション機能**を使ったヒットフィードバック。
- **`sentAtMs`** をコマンドに埋め込み、Web が `Date.now()` との差分で E2E レイテンシを計測。
