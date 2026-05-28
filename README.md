# Happy Happy Karate Soup

## Overview
エンジニアの運動不足解消と気分転換を目的にした、**空手アクション × 料理ゲーム**です。  
PC(Web)をメイン画面、iPhoneをコントローラーとして使い、空手の動きで具材を切って自分だけのスープを完成させます。

- コンセプト: 「空手の動きで具材を切り、自分だけのスープを生成する」
- 体験イメージ: Wiiのように、画面とコントローラーを分けて遊ぶ
- 提供形態: Webアプリ（メイン） + iOSアプリ（コントローラー）

## Architecture
```text
ユーザー
	├─ PC(Web / React): ログイン・ゲーム表示・結果表示
	└─ iPhone(Swift): モーション入力(突き/手刀など)

Web Frontend / iOS App
	└─ Backend API (Java / Spring Boot)
				├─ 認証・ユーザー管理
				├─ プレイログ保存（誰が/いつ/何を切ったか）
				├─ スコア計算・ランキング集計
				├─ Vertex AI 連携（プロンプト生成/呼び出し）
				└─ 画像・メタデータ管理

Infrastructure
	├─ Cloud SQL: ユーザー・プレイ履歴・ランキング
	├─ Google Cloud Storage: 生成画像などのアセット保存
	├─ Artifact Registry: コンテナ管理
	└─ GKE or Cloud Run: アプリ実行基盤
```

### Vertex AI の役割
- Front: ユーザーのアクション（モーション）を送信
- Backend(Java): 入力データを集計し、AI向けプロンプトを生成
- Vertex AI:
	- Gemini: スープの味の特徴や評価コメントを生成
	- Imagen: スープ画像を生成
- iPhone: スープ名をユーザー操作で決定
- Front: 生成結果をリザルト画面に表示（カラオケ採点のような見せ方を想定）

## Features
### ゲームの基本フロー（MVP）
1. ログイン
2. ホーム画面からゲーム開始
3. 具材をリストから選択
4. ゲームプレイ（まずは**突き(パンチ)**中心）
5. 必要に応じて「混ぜる」工程（オプション）
6. スープ完成（AIで味の評価・画像を生成、名前はiPhone側で決定）
7. リザルト表示・スコア反映

### PC側 画面遷移
1. ログイン画面
2. ホーム画面
3. ゲームスタート
4. iPhone接続画面（QR表示）
5. 具材選択画面
6. （優先度低）遊び方説明
7. ゲーム画面
	 - 7-1. 具材をパンチする画面（落下/横流れ具材をタイミングよく処理）
	 - 7-2. （優先度低）具材をかき混ぜる画面
8. リザルト画面

### iPhone側 画面遷移
1. PC連携画面
2. QR読み取り
3. ゲーム画面（拳の突き出し表示、技入力）
4. 成功時フィードバック
5. リザルト画面

### ゲーム内判定・表現
- 具材の結果判定: 完璧に鍋へ入る / 落下する / 破片だけ入る
- 入力技（例）: 突き、手刀
- キャラ要素: 帯を強調したアバター

## Tech Stack
### Frontend
- Web: React.js
- iOS Controller App: Swift

### Backend
- Java (Spring Boot)

### Infrastructure
- Cloud SQL
- Google Cloud Storage (GCS)
- Artifact Registry
- GKE または Cloud Run
- （認証候補）Google Cloud ベースのユーザー認証

## 利用者向けガイド（Terminal不要）
この章は「遊ぶ人向け」です。コマンド実行は不要です。

### 1. アプリを開く
- Web: https://karate-soup-web-486336410817.us-central1.run.app

### 2. 遊び方
1. Webで「ゲストで遊ぶ」またはログインして開始
2. iPhoneアプリでQRコードを読む
3. 具材選択 → ゲーム開始
4. iPhoneでパンチ/チョップ操作
5. リザルトでスープ画像と評価を見る

### 3. よくある表示
- 「Googleログインが利用できません」:
	- この環境ではGoogleログインが無効なだけです。
	- ゲストプレイはそのまま遊べます。
- 「AI生成の準備中です」:
	- 一時的な生成失敗です。
	- 少し待って再試行してください。

### 4. iPhone接続が不安定なとき
1. iPhone と PC を同じWi-Fiに接続
2. QRを読み直す
3. それでもだめなら運営側に連絡

## 開発者向けガイド（構築・運用）
この章は「開発/運用メンバー向け」です。

### 前提
- macOS
- Docker Desktop
- Node.js 20+
- Java 17+
- Xcode 15+

### 1. リポジトリ取得
```bash
git clone https://github.com/kaaaaaaaaya/HappyHappyKarateSoup.git
cd HappyHappyKarateSoup
```

### 2. Dockerでローカル起動（推奨）
```bash
docker compose up --build -d
```

Vertex AI をローカルから呼ぶ場合（推奨）:
- 1回だけ `gcloud auth application-default login` を実行して ADC を作成します（`~/.config/gcloud` はコンテナにマウント済み）。

補足:
- `bash scripts/local.sh up` で `docker compose` 起動と疎通確認（Vertex AI）までまとめて実行できます（推奨）。
- AIなし（ローカル生成）で起動したい場合は `bash scripts/local.sh up --no-ai` を使います。
- `docker compose` はルートの `.env` を自動読込します（必要なら `.env` に `GEMINI_PROJECT_ID` などを置けます。`.env` は Git 管理されません）。
- Vertex AI 認証（ローカルDocker）はどちらかでOK:
  - (推奨) `gcloud auth application-default login` を実行して ADC を作る（`~/.config/gcloud` はコンテナにマウント済み）
  - サービスアカウント鍵を `apps/web/backend-java/.secrets/vertex-ai-key.json` に置き、`GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/vertex-ai-key.json` を渡す

起動後:
- Web: http://localhost:8081
- Backend health: http://localhost:8080/actuator/health

停止:
```bash
docker compose down
```

#### ローカル起動＆疎通確認（スクリプト）

```bash
bash scripts/local.sh up
```

すでに起動している前提で疎通確認だけ行う場合:

```bash
bash scripts/local.sh smoke
```

AIなし（ローカル生成）で起動する場合:
```bash
bash scripts/local.sh up --no-ai
```

### 3. AI生成設定（通常運用）
`LOCAL MODE` を使わず、通常のAI生成を使う設定です。

Vertex AI 方式:
```bash
export GEMINI_USE_VERTEX_AI=true
export GEMINI_PROJECT_ID="happy-happy-karate-soup"
export GEMINI_LOCATION="us-central1"
export GEMINI_TEXT_MODEL="gemini-2.5-flash"
export APP_GCS_BUCKET_NAME="happy-soup"
export SOUP_LOCAL_FALLBACK_ENABLED=false
docker compose up -d --build --force-recreate backend
```

Gemini 3 系を試す場合（Vertex AI 側で Preview / Global の場合があります）:
```bash
export GEMINI_USE_VERTEX_AI=true
export GEMINI_PROJECT_ID="happy-happy-karate-soup"
export GEMINI_LOCATION="global"
export GEMINI_TEXT_MODEL="gemini-3-flash-preview"
docker compose up -d --build --force-recreate backend
```

`APP_GCS_BUCKET_NAME` の推奨値:
- このリポジトリの既存GCP環境（`happy-happy-karate-soup`）で動かす場合: `happy-soup`
- 自分のGCPプロジェクトで動かす場合: 自分のプロジェクト内で作成したバケット名（例: `happy-soup-dev-yourname`）

補足:
- 値は `gs://` なしで指定します（例: `happy-soup`）。
- 指定したバケットに対して、実行中サービスアカウントに読み書き権限が必要です。

Docker で Vertex AI を使う場合は、認証キーを `apps/web/backend-java/.secrets/vertex-ai-key.json` に配置してください。
このリポジトリでは backend コンテナがデフォルトで `/run/secrets/vertex-ai-key.json` を参照します。

必要なら明示指定:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/run/secrets/vertex-ai-key.json"
docker compose up -d --build --force-recreate backend
```

開発デモ用に明示的フォールバックを使う場合のみ:
```bash
export SOUP_LOCAL_FALLBACK_ENABLED=true
docker compose up -d --build --force-recreate backend
```

### 4. Googleログイン有効化（任意）
Googleログインを有効にするには、フロントエンド用の `VITE_GOOGLE_CLIENT_ID` と、バックエンドの ID トークン検証用の `GOOGLE_OAUTH_CLIENT_ID` を設定します。通常は同じ OAuth 2.0 Web Client ID を入れます。

補足:
- 未設定でもアプリは動作します（ゲストプレイ/ローカルログインで進行）。
- `VITE_GOOGLE_CLIENT_ID` だけを設定すると Google ボタンは表示されますが、バックエンド検証に `GOOGLE_OAUTH_CLIENT_ID` が必要です。

Docker Compose でローカル起動する場合は、ルートの `.env` に以下を置けます。

```bash
GOOGLE_OAUTH_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
VITE_GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
```

通常メールアドレス登録では確認リンクを送ります。SMTP を使う場合は `.env` に以下も設定してください。未設定のローカル環境では backend ログに確認リンクが出ます。

```bash
APP_WEB_BASE_URL="http://localhost:8081"
APP_MAIL_FROM="noreply@example.com"
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USERNAME="smtp-user"
SMTP_PASSWORD="smtp-password"
SMTP_STARTTLS=true
SMTP_SSL=false
```

Docker Compose のローカル環境では、SMTP 未設定でも確認リンクが画面に表示されます。本番や共有環境で画面表示を止める場合は `APP_AUTH_EXPOSE_VERIFICATION_LINK=false` を設定します。

```bash
docker build \
	--build-arg VITE_API_BASE_URL="https://YOUR_BACKEND_URL" \
	--build-arg VITE_GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID" \
	-t your-web-image \
	apps/web
```

### 5. iOSコントローラー起動
1. Xcodeで apps/ios-controller/QRCodeReader/QRCodeReader.xcodeproj を開く
2. 実機またはシミュレータで QRCodeReader を起動
3. Webの接続画面で表示されるQRコードを読み取る

### 6. トラブルシュート
- 8080ポート競合:
```bash
lsof -ti :8080 | xargs -r kill -9
```

- Backendが起動しない:
```bash
cd apps/web/backend-java
mvn -q clean package -DskipTests
```

- リザルト画面が空になる / AI生成失敗（最優先チェック）:
```bash
# 1) backend 内の設定確認
docker compose exec -T backend sh -lc 'env | grep -E "^GEMINI_|^GOOGLE_APPLICATION_CREDENTIALS"'

# 2) 認証ファイルが見えるか確認
docker compose exec -T backend sh -lc 'ls -l /run/secrets/vertex-ai-key.json'

# 3) 生成API疎通確認
curl -s -i -X POST http://localhost:8080/api/soup/generate \
	-H 'Content-Type: application/json' \
	-d '{"ingredients":["tomato"]}' | sed -n '1,80p'
```

期待値:
- `HTTP/1.1 200` が返ること
- 返却 JSON に `imageDataUrl` と `flavor` と `comment` が含まれること

`Gemini configuration is missing` が出る場合:
- `GEMINI_PROJECT_ID` が正しいか（例: `happy-happy-karate-soup`）
- `GEMINI_USE_VERTEX_AI=true` か
- `/run/secrets/vertex-ai-key.json` がコンテナ内に存在するか
- 修正後に `docker compose up -d --build --force-recreate backend` を再実行

`429 Too Many Requests` が出る場合:
- Gemini 側の一時的なクォータ超過です。
- 最新コードでは backend がローカルフォールバック応答へ自動退避するため、リザルト画面は表示継続できます。
- それでも空表示の場合は backend を再作成してください。
```bash
docker compose up -d --build --force-recreate backend
```

- Dockerデーモン未起動:
Docker Desktop を起動してから再実行

- iPhone接続が不安定:
	- 接続画面は通常、API接続先詳細を表示しません。
	- 必要時のみ「接続先の詳細設定を開く」で上書きします。
	- PCを http://localhost:8081 ではなく http://PCのLANアドレス:8081 で開くと安定する場合があります。
	- iPhone から http://PCのLANアドレス:8080/actuator/health が開けるか確認してください。

### 7. Cloud Run デプロイ手順（Artifact Registry あり）
このプロジェクトのデプロイは「コマンド貼り付け」ではなく、スクリプト/CI で再現できることを優先します。

#### GitHub Actions（推奨）

- `main` にマージすると `Cloud Run Deploy` が自動実行されます
- 手動で走らせたい場合: GitHub Actions の `Cloud Run Deploy` を `workflow_dispatch` で実行します
- 必要な Secrets / Environments の設定は `infra/README.md` を参照してください

#### 手動デプロイ（スクリプト）

CI を使えない状況や検証用途では、スクリプトでデプロイできます（パスワード等は `.env` に置くため、基本は GitHub Secrets を推奨）。

```bash
cp .env.example .env
# .env を編集してから実行
bash scripts/deploy_cloudrun.sh
```

### 8. GKE
GKE でのデプロイ手順は infra/README.md を参照してください。

## API
### 想定される責務
- ユーザー登録・認証
- プレイセッション開始/終了
- 入力イベント（技・タイミング・ヒット情報）受信
- スコア計算
- AI生成リクエスト（味の評価コメント/画像）
- リザルト保存・ランキング集計

### データ保存の要点
- 誰が
- いつ
- どんな具材を切ったか
- どんなスープができたか

### 運用上の要件
- APIキー管理
- プロンプト生成ロジックはバックエンドで管理

## Directory Structure
```text
HappyHappyKarateSoup/
	README.md
	apps/
		web/               # React.js (PCメイン画面)
			backend-java/     # Spring Boot API
		ios-controller/    # Swift (iPhoneコントローラー)
	infra/               # Docker/Kubernetes/Cloud設定
```

## Future Work
### 追加したい機能
- バイブレーション + 効果音
- 対戦モード
- 技の拡張
- 演出・サウンドの強化

### スコアリングの拡張
- カテゴリ別ランキング
- 技の完成度
- 技のヒット率
- 鍋に具材が正しく入った割合
