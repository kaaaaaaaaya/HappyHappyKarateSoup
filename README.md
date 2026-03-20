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

起動後:
- Web: http://localhost:8081
- Backend health: http://localhost:8080/actuator/health

停止:
```bash
docker compose down
```

### 3. AI生成設定（通常運用）
`LOCAL MODE` を使わず、通常のAI生成を使う設定です。

Gemini API Key 方式:
```bash
export GEMINI_USE_VERTEX_AI=false
export GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
export SOUP_LOCAL_FALLBACK_ENABLED=false
docker compose up -d --build --force-recreate backend
```

Vertex AI 方式:
```bash
export GEMINI_USE_VERTEX_AI=true
export GEMINI_PROJECT_ID="your-gcp-project"
export GEMINI_LOCATION="us-central1"
export SOUP_LOCAL_FALLBACK_ENABLED=false
docker compose up -d --build --force-recreate backend
```

開発デモ用に明示的フォールバックを使う場合のみ:
```bash
export SOUP_LOCAL_FALLBACK_ENABLED=true
docker compose up -d --build --force-recreate backend
```

### 4. Googleログイン有効化（任意）
Googleログインを有効にするには、Webビルド時に `VITE_GOOGLE_CLIENT_ID` を設定します。

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

- Dockerデーモン未起動:
Docker Desktop を起動してから再実行

- iPhone接続が不安定:
	- 接続画面は通常、API接続先詳細を表示しません。
	- 必要時のみ「接続先の詳細設定を開く」で上書きします。
	- PCを http://localhost:8081 ではなく http://PCのLANアドレス:8081 で開くと安定する場合があります。
	- iPhone から http://PCのLANアドレス:8080/actuator/health が開けるか確認してください。

### 7. Cloud Run デプロイ手順（Artifact Registry あり）
この手順で、Web と Backend を Cloud Run にデプロイできます。

```bash
# 0) 変数
export PROJECT_ID="happy-happy-karate-soup"
export REGION="us-central1"
export REPO="happy-soup"

# 1) gcloud 設定
gcloud config set project "$PROJECT_ID"
gcloud auth configure-docker "$REGION-docker.pkg.dev"

# 2) Artifact Registry 作成（初回のみ）
gcloud artifacts repositories create "$REPO" \
	--repository-format=docker \
	--location="$REGION" \
	--description="HappyHappyKarateSoup containers"
```

Backend イメージ build/push:
```bash
docker buildx build \
	--platform linux/amd64 \
	-t "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/backend:latest" \
	--push \
	apps/web/backend-java
```

Web イメージ build/push:
```bash
docker buildx build \
	--platform linux/amd64 \
	--build-arg VITE_API_BASE_URL="https://karate-soup-api-486336410817.us-central1.run.app" \
	--build-arg VITE_GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID" \
	-t "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/web:latest" \
	--push \
	apps/web
```

Cloud Run deploy:
```bash
gcloud run deploy karate-soup-api \
	--image "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/backend:latest" \
	--region "$REGION" \
	--platform managed \
	--allow-unauthenticated

gcloud run deploy karate-soup-web \
	--image "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/web:latest" \
	--region "$REGION" \
	--platform managed \
	--allow-unauthenticated
```

本番WebからAPIにアクセスできるよう CORS を設定:
```bash
gcloud run services update karate-soup-api \
	--region "$REGION" \
	--project "$PROJECT_ID" \
	--set-env-vars='^~^SPRING_DATASOURCE_URL=jdbc:h2:mem:testdb~SPRING_DATASOURCE_DRIVER_CLASS_NAME=org.h2.Driver~SPRING_JPA_DATABASE_PLATFORM=org.hibernate.dialect.H2Dialect~GEMINI_USE_VERTEX_AI=true~GEMINI_PROJECT_ID=happy-happy-karate-soup~GEMINI_LOCATION=us-central1~APP_CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8081,https://karate-soup-web-486336410817.us-central1.run.app'
```

補足:
- 2026-03-20 時点の本番復旧では、`GEMINI_USE_VERTEX_AI=true` で Cloud Run backend を運用。
- `GEMINI_API_KEY` 未設定でも、サービスアカウント権限で Vertex AI 呼び出しが可能。

デプロイ確認:
```bash
curl -s https://karate-soup-web-486336410817.us-central1.run.app | head -20
curl -s https://karate-soup-api-486336410817.us-central1.run.app/actuator/health
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