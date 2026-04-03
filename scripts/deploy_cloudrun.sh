#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  echo "[ERROR] .env が見つかりません: $ROOT_DIR/.env" >&2
  exit 1
fi

# Load .env safely into environment
set -a
# shellcheck disable=SC1091
source .env
set +a

: "${PROJECT_ID:?PROJECT_ID is required in .env}"
: "${REGION:?REGION is required in .env}"
: "${REPO:?REPO is required in .env}"
: "${INSTANCE_CONNECTION_NAME:?INSTANCE_CONNECTION_NAME is required in .env}"
: "${SPRING_DATASOURCE_URL:?SPRING_DATASOURCE_URL is required in .env}"

SERVICE_API="${SERVICE_API:-karate-soup-api}"
SERVICE_WEB="${SERVICE_WEB:-karate-soup-web}"
SPRING_DATASOURCE_USERNAME="${SPRING_DATASOURCE_USERNAME:-${DB_USER:-root}}"
SPRING_DATASOURCE_PASSWORD="${SPRING_DATASOURCE_PASSWORD:-}"
SPRING_JPA_DATABASE_PLATFORM="${SPRING_JPA_DATABASE_PLATFORM:-org.hibernate.dialect.MySQLDialect}"
GEMINI_USE_VERTEX_AI="${GEMINI_USE_VERTEX_AI:-true}"
GEMINI_PROJECT_ID="${GEMINI_PROJECT_ID:-$PROJECT_ID}"
GEMINI_LOCATION="${GEMINI_LOCATION:-$REGION}"
SOUP_LOCAL_FALLBACK_ENABLED="${SOUP_LOCAL_FALLBACK_ENABLED:-true}"
APP_GCS_BUCKET_NAME="${APP_GCS_BUCKET_NAME:-happy-soup}"
APP_GCS_OBJECT_PREFIX="${APP_GCS_OBJECT_PREFIX:-collections}"
VITE_GOOGLE_CLIENT_ID="${VITE_GOOGLE_CLIENT_ID:-}"
WEB_URL="${WEB_URL:-https://${SERVICE_WEB}-486336410817.${REGION}.run.app}"
TAG="${TAG:-latest}"

BACKEND_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/backend:${TAG}"
WEB_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/web:${TAG}"

echo "[INFO] project: ${PROJECT_ID}"
echo "[INFO] region:  ${REGION}"
echo "[INFO] repo:    ${REPO}"
echo "[INFO] backend: ${BACKEND_IMAGE}"
echo "[INFO] web:     ${WEB_IMAGE}"

gcloud config set project "${PROJECT_ID}"
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

echo "[STEP] Build & push backend image"
docker buildx build \
  --platform linux/amd64 \
  -t "${BACKEND_IMAGE}" \
  --push \
  apps/web/backend-java

echo "[STEP] Deploy backend service (${SERVICE_API})"
gcloud run deploy "${SERVICE_API}" \
  --image "${BACKEND_IMAGE}" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --add-cloudsql-instances "${INSTANCE_CONNECTION_NAME}" \
  --set-env-vars="^~^SPRING_DATASOURCE_URL=${SPRING_DATASOURCE_URL}~SPRING_DATASOURCE_USERNAME=${SPRING_DATASOURCE_USERNAME}~SPRING_DATASOURCE_PASSWORD=${SPRING_DATASOURCE_PASSWORD}~SPRING_JPA_DATABASE_PLATFORM=${SPRING_JPA_DATABASE_PLATFORM}~GEMINI_USE_VERTEX_AI=${GEMINI_USE_VERTEX_AI}~GEMINI_PROJECT_ID=${GEMINI_PROJECT_ID}~GEMINI_LOCATION=${GEMINI_LOCATION}~SOUP_LOCAL_FALLBACK_ENABLED=${SOUP_LOCAL_FALLBACK_ENABLED}~APP_GCS_BUCKET_NAME=${APP_GCS_BUCKET_NAME}~APP_GCS_OBJECT_PREFIX=${APP_GCS_OBJECT_PREFIX}~APP_CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8081,${WEB_URL}"

API_URL="$(gcloud run services describe "${SERVICE_API}" --region "${REGION}" --format='value(status.url)')"
if [[ -z "${API_URL}" ]]; then
  echo "[ERROR] backend URL の取得に失敗しました" >&2
  exit 1
fi

echo "[INFO] resolved API URL: ${API_URL}"

echo "[STEP] Build & push web image"
docker buildx build \
  --platform linux/amd64 \
  --build-arg VITE_API_BASE_URL="${API_URL}" \
  --build-arg VITE_GOOGLE_CLIENT_ID="${VITE_GOOGLE_CLIENT_ID}" \
  -t "${WEB_IMAGE}" \
  --push \
  apps/web

echo "[STEP] Deploy web service (${SERVICE_WEB})"
gcloud run deploy "${SERVICE_WEB}" \
  --image "${WEB_IMAGE}" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --port 80

echo "[DONE]"
echo "backend: ${API_URL}"
echo "web:     $(gcloud run services describe "${SERVICE_WEB}" --region "${REGION}" --format='value(status.url)')"
