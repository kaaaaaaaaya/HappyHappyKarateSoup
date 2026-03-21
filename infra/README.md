# Container / GKE / Cloud Run ガイド

## 1. Docker ローカル実行

### 全て起動（MySQL + Backend + Web）

```bash
docker compose up --build
```

- Web: http://localhost:8081
- Backend health: http://localhost:8080/actuator/health

注意:
- Gemini環境が設定されていない場合、Backendはスープ生成のローカルフォールバック応答を返すようになりました（開発/デモに適しています）。
- Docker で Vertex AI を使う場合、`apps/web/backend-java/.secrets/vertex-ai-key.json` を用意してください（backend コンテナは既定で `/run/secrets/vertex-ai-key.json` を参照します）。
- Gemini から `429 Too Many Requests` が返った場合も、backend はローカルフォールバック応答へ退避します。
- ローカルプレイではGoogleログインはオプションです。VITE_GOOGLE_CLIENT_IDなしでも、Googleログインは警告を表示しますがゲストプレイはそのまま動きます。

### 停止

```bash
docker compose down
```

## 2. イメージをArtifact Registryにビルドしてプッシュ

実行前に変数を置き換えてください：

```bash
PROJECT_ID="your-gcp-project"
REGION="us-central1"
REPO="happy-soup"

# Backendイメージ
docker build -t "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/backend:latest" apps/web/backend-java
docker push "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/backend:latest"

# Webイメージ
# VITE_API_BASE_URLは公開Backend URLを指すべきです。
docker build \
  --build-arg VITE_API_BASE_URL="https://YOUR_BACKEND_URL" \
  --build-arg VITE_GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID" \
  -t "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/web:latest" \
  apps/web
docker push "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/web:latest"
```

### 本番環境デプロイ済みリソース（2026-03-20時点）

本番環境は既にデプロイされています。現在のランタイムリソースは：

- GCPプロジェクト: happy-happy-karate-soup
- Artifact Registryリポジトリ: us-central1-docker.pkg.dev/happy-happy-karate-soup/happy-soup
- Webイメージ: us-central1-docker.pkg.dev/happy-happy-karate-soup/happy-soup/web:latest
- Backendイメージ: us-central1-docker.pkg.dev/happy-happy-karate-soup/happy-soup/backend:latest
- Cloud Run Web URL: https://karate-soup-web-486336410817.us-central1.run.app
- Cloud Run API URL: https://karate-soup-api-486336410817.us-central1.run.app

現在のAPIランタイム設定：

- GEMINI_USE_VERTEX_AI=true
- GEMINI_PROJECT_ID=happy-happy-karate-soup
- GEMINI_LOCATION=us-central1
- APP_CORS_ALLOWED_ORIGINS は https://karate-soup-web-486336410817.us-central1.run.app を含む

## 3. Cloud Run デプロイ

### Backend

1. `infra/cloudrun/backend-service.yaml` のプレースホルダを編集します。
2. デプロイ：

```bash
gcloud run services replace infra/cloudrun/backend-service.yaml --region "$REGION" --project "$PROJECT_ID"
```

### Web

1. `infra/cloudrun/web-service.yaml` のプレースホルダを編集します。
2. デプロイ：

```bash
gcloud run services replace infra/cloudrun/web-service.yaml --region "$REGION" --project "$PROJECT_ID"
```

## 4. GKE デプロイ

1. 以下のファイルのイメージパスと環境プレースホルダを編集します：
- `infra/gke/backend-deployment.yaml`
- `infra/gke/web-deployment.yaml`

2. マニフェストを適用：

```bash
kubectl apply -f infra/gke/namespace.yaml
kubectl apply -f infra/gke/backend-deployment.yaml
kubectl apply -f infra/gke/backend-service.yaml
kubectl apply -f infra/gke/web-deployment.yaml
kubectl apply -f infra/gke/web-service.yaml
kubectl apply -f infra/gke/ingress.yaml
```

3. エンドポイントを取得：

```bash
kubectl get ingress -n happy-soup
kubectl get svc -n happy-soup
```

## 注記

- Backendは MySQL を使用します。本番環境では Cloud SQL を使用し、`DB_HOST`、`DB_USERNAME`、`DB_PASSWORD` を設定してください。
- OAuth ログインを使用する場合、Backend で `GOOGLE_OAUTH_CLIENT_ID` を設定し、Web ビルド時に `VITE_GOOGLE_CLIENT_ID` を設定してください。
- `APP_CORS_ALLOWED_ORIGINS` にはデプロイされた Web オリジンを含める必要があります。

## iPhone コントローラー接続動作

- 接続ページはオプションの詳細設定セクション下に API エンドポイント詳細を保持するようになりました。
- ほとんどの場合、詳細入力を空のままにしてください。
- iPhone が接続できない場合、LAN ホスト（例：http://192.168.x.x:8081）を使用して Web を開き、QR スキャンをやり直してください。
- iPhone ネットワーク到達可能性を検証してください: http://PC_LAN_IP:8080/actuator/health

## 3/21追記 デプロイ方法
### 7. Cloud Run デプロイ手順（Artifact Registry あり）
この手順で、Web と Backend を Cloud Run にデプロイできます。
このプロジェクトは、バックエンド（Spring Boot + MySQL）とフロントエンド（React/Vite）を Google Cloud Run にデプロイして動作させます。

#### 0. 前提条件 (Prerequisites)
- Google Cloud CLI (`gcloud`) がインストール・ログイン済みであること
- Docker がインストールされ、起動していること
- 以下の GCP リソースが作成済みであること
  - プロジェクト: `happy-happy-karate-soup`
  - Cloud SQL インスタンス (MySQL): `karate-soup-instance`
  - Cloud Storage バケット: `happy-soup`

#### 1. データベースの初回セットアップ (1回のみ)
Cloud SQL インスタンスの中に、アプリケーション用のデータベースを作成します。

```bash
# 'happysoup' という名前のデータベースを作成
gcloud sql databases create happysoup --instance=karate-soup-instance
```

**ルートディレクトリの.envにこれを記述**
```bash
PROJECT_ID=happy-happy-karate-soup
REGION=us-central1
REPO=happy-soup

GEMINI_USE_VERTEX_AI=true
GEMINI_PROJECT_ID=happy-happy-karate-soup
GEMINI_LOCATION=us-central1
SOUP_LOCAL_FALLBACK_ENABLED=true

APP_GCS_BUCKET_NAME=happy-soup
APP_GCS_OBJECT_PREFIX=collections

VITE_API_BASE_URL=http://localhost:8080

DB_NAME=mysql
INSTANCE_NAME=karate-soup-instance
SPRING_JPA_DATABASE_PLATFORM=org.hibernate.dialect.MySQLDialect
INSTANCE_CONNECTION_NAME=happy-happy-karate-soup:us-central1:karate-soup-instance
SPRING_DATASOURCE_URL=jdbc:mysql:///happysoup?cloudSqlInstance=happy-happy-karate-soup:us-central1:karate-soup-instance&socketFactory=com.google.cloud.sql.mysql.SocketFactory

SPRING_DATASOURCE_PASSWORD="ここにパスワードを入力"
```
**.envの設定を反映**
```bash
export $(grep -v '^#' .env | xargs)
```

```bash
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
    --image "us-central1-docker.pkg.dev/happy-happy-karate-soup/happy-soup/backend:latest" \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --add-cloudsql-instances happy-happy-karate-soup:us-central1:karate-soup-instance \
    --set-env-vars SPRING_DATASOURCE_URL=$SPRING_DATASOURCE_URL \
    --set-env-vars SPRING_DATASOURCE_USERNAME=$SPRING_DATASOURCE_USERNAME \
    --set-env-vars SPRING_DATASOURCE_PASSWORD=$SPRING_DATASOURCE_PASSWORD

gcloud run deploy karate-soup-web \
  --image "us-central1-docker.pkg.dev/happy-happy-karate-soup/happy-soup/web:latest" \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 80
```

本番WebからAPIにアクセスできるよう CORS を設定:
```bash
gcloud run deploy karate-soup-api \
  --image "us-central1-docker.pkg.dev/happy-happy-karate-soup/happy-soup/backend:latest" \
  --region "us-central1" \
  --platform managed \
  --allow-unauthenticated \
  --add-cloudsql-instances "happy-happy-karate-soup:us-central1:karate-soup-instance" \
  --set-env-vars='^~^SPRING_DATASOURCE_URL=jdbc:mysql:///happysoup?cloudSqlInstance=happy-happy-karate-soup:us-central1:karate-soup-instance&socketFactory=com.google.cloud.sql.mysql.SocketFactory~SPRING_DATASOURCE_USERNAME=root~SPRING_DATASOURCE_PASSWORD=ここにデータベースのパスワードを入力~GEMINI_USE_VERTEX_AI=true~GEMINI_PROJECT_ID=happy-happy-karate-soup~GEMINI_LOCATION=us-central1~APP_CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8081,https://karate-soup-web-486336410817.us-central1.run.app~APP_GCS_BUCKET_NAME=happy-soup'
```

補足:
- 2026-03-20 時点の本番復旧では、`GEMINI_USE_VERTEX_AI=true` で Cloud Run backend を運用。
- `GEMINI_API_KEY` 未設定でも、サービスアカウント権限で Vertex AI 呼び出しが可能。

デプロイ確認:
```bash
curl -s https://karate-soup-web-486336410817.us-central1.run.app | head -20
curl -s https://karate-soup-api-486336410817.us-central1.run.app/actuator/health
```
**アプリの起動**
https://karate-soup-web-486336410817.us-central1.run.app

