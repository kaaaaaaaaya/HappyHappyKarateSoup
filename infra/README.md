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

## 2. デプロイ（推奨: CI/CD）

本リポジトリは「誰でも同じ手順で再現できる」ことを優先し、デプロイは GitHub Actions を推奨します。

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

Cloud Run への反映は以下のいずれかで行います。

- 推奨: GitHub Actions（`.github/workflows/cloudrun-deploy.yml`）
- 手動: `bash scripts/deploy_cloudrun.sh`（`.env` が必要）

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
  - `scripts/deploy_cloudrun.sh` は `APP_CORS_ALLOWED_ORIGINS` を `.env` から渡します（未設定の場合のみ localhost + 既定のWEB_URLを使います）。

## iPhone コントローラー接続動作

- 接続ページはオプションの詳細設定セクション下に API エンドポイント詳細を保持するようになりました。
- ほとんどの場合、詳細入力を空のままにしてください。
- iPhone が接続できない場合、LAN ホスト（例：http://192.168.x.x:8081）を使用して Web を開き、QR スキャンをやり直してください。
- iPhone ネットワーク到達可能性を検証してください: http://PC_LAN_IP:8080/actuator/health

## 3/21追記 デプロイ方法

手動デプロイの手順は `scripts/deploy_cloudrun.sh` に集約しました。

```bash
cp .env.example .env
# .env を編集してから実行
bash scripts/deploy_cloudrun.sh
```

---

## CI/CD（GitHub Actions）で Cloud Run へ自動デプロイ

このリポジトリには Cloud Run へデプロイする GitHub Actions を用意しています：

- Workflow: `.github/workflows/cloudrun-deploy.yml`
- トリガー:
  - `main` ブランチへの push（`apps/web/**` などが変更された場合）
  - 手動実行（`workflow_dispatch`）

### 0. 事前条件（ざっくり）

- GCP プロジェクトがある
- Cloud Run / Artifact Registry / Cloud SQL（使うなら）/ Vertex AI（使うなら）が有効
- GitHub Actions から `gcloud run deploy` と Docker push ができる権限を用意する

このリポジトリでは Workload Identity Federation（OIDC）で GitHub Actions から GCP に認証する想定です（サービスアカウントキーを GitHub に置かない）。

### 1. GCP 側セットアップ（1回だけ）

以下は一例です。既に同等の設定がある場合はスキップしてください。

#### 1-1) サービスアカウント作成

```bash
PROJECT_ID="your-gcp-project"
SA_NAME="hhks-github-actions"

gcloud iam service-accounts create "$SA_NAME" --project "$PROJECT_ID"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
```

#### 1-2) 必要な権限を付与

プロジェクトや運用により必要権限は変わりますが、最低限は「Artifact Registry に push」「Cloud Run を更新」が必要です。

例:
```bash
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member "serviceAccount:${SA_EMAIL}" \
  --role "roles/run.admin"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member "serviceAccount:${SA_EMAIL}" \
  --role "roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member "serviceAccount:${SA_EMAIL}" \
  --role "roles/iam.serviceAccountUser"
```

Cloud SQL を使う場合（`--add-cloudsql-instances` を使うので）:
```bash
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member "serviceAccount:${SA_EMAIL}" \
  --role "roles/cloudsql.client"
```

Vertex AI を使う場合:
```bash
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member "serviceAccount:${SA_EMAIL}" \
  --role "roles/aiplatform.user"
```

GCS を使う場合（バケットの権限はバケット単位で付けるのが推奨）:
```bash
BUCKET="your-bucket"
gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" \
  --member "serviceAccount:${SA_EMAIL}" \
  --role "roles/storage.objectAdmin"
```

#### 1-3) Workload Identity Federation（GitHub OIDC）

GitHub Actions からの認証用に provider を作成し、上の SA に impersonate 権限を付与します。

以下は **GitHub の特定リポジトリからのみ** SA を impersonate できるようにする例です（推奨）。

```bash
PROJECT_ID="your-gcp-project"
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"

# GitHub repo（例: "kaaaaaaaaya/HappyHappyKarateSoup"）
GITHUB_REPO="OWNER/REPO"

# Workload Identity Pool / Provider 名（任意の識別子）
POOL_ID="github-pool"
PROVIDER_ID="github"

gcloud config set project "$PROJECT_ID"

# Pool 作成
gcloud iam workload-identity-pools create "$POOL_ID" \
  --location="global" \
  --display-name="GitHub Actions Pool"

# Provider 作成（GitHub OIDC）
gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
  --location="global" \
  --workload-identity-pool="$POOL_ID" \
  --display-name="GitHub Actions Provider" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref,attribute.actor=assertion.actor" \
  --attribute-condition="assertion.repository == '${GITHUB_REPO}'"

# SA に impersonate 権限付与（この repo のみ）
gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository/${GITHUB_REPO}"
```

作成後、GitHub 側（Repository secrets または Environment secrets）に以下を設定します：

- `GCP_WORKLOAD_IDENTITY_PROVIDER`
  - `projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/providers/${PROVIDER_ID}`
- `GCP_SERVICE_ACCOUNT_EMAIL`
  - 上で作成した SA の email（例: `hhks-github-actions@${PROJECT_ID}.iam.gserviceaccount.com`）

補足:
- 既に `GCP_CREDENTIALS_JSON`（SA鍵JSON）で動いている場合でも、WIFへ移行したら **`GCP_CREDENTIALS_JSON` は空**にしてOKです。
- 複数環境（`staging` / `prod`）を分ける場合は GitHub Environments + Environment secrets を推奨します。

### 事前に GitHub Secrets に設定する値

以下を GitHub リポジトリの Secrets に登録してください（環境ごとに `staging` / `prod` を分けたい場合は Environment secrets を推奨）:

（認証はいずれか1つ）

- 推奨: Workload Identity Federation（OIDC）
  - `GCP_WORKLOAD_IDENTITY_PROVIDER`（Workload Identity Federation の provider resource 名）
  - `GCP_SERVICE_ACCOUNT_EMAIL`（GitHub Actions が impersonate する SA）
- 代替: サービスアカウント鍵 JSON（簡単だが鍵管理が必要）
  - `GCP_CREDENTIALS_JSON`（サービスアカウント鍵の JSON をそのまま入れる）

- `GCP_PROJECT_ID`（例: `happy-happy-karate-soup`）
- `CLOUDSQL_INSTANCE_CONNECTION_NAME`（例: `happy-happy-karate-soup:us-central1:karate-soup-instance`）
- `SPRING_DATASOURCE_URL` / `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD`
- `APP_CORS_ALLOWED_ORIGINS`（Web の URL を含める）
- `APP_GCS_BUCKET_NAME`（例: `happy-soup`）
- `APP_GCS_OBJECT_PREFIX`（例: `collections`）

（任意）

- `VITE_GOOGLE_CLIENT_ID`（Web の Google ログインを有効化したい場合のみ。未設定ならゲスト/ローカルログインで動作）

### 運用のおすすめ

- PR: 既存の CI（Backend CI）でテストまで自動化し、デプロイは行わない
- `main` マージ: staging に自動デプロイ
- 本番: `workflow_dispatch` で `prod` を選んでデプロイ（または Environment の承認を有効化）
