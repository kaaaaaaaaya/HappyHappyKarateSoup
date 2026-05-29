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

SERVICE_WEB="${SERVICE_WEB:-karate-soup-web}"
VITE_GOOGLE_CLIENT_ID="${VITE_GOOGLE_CLIENT_ID:-}"
TAG="${TAG:-latest}"

WEB_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/web:${TAG}"

# Resolve API URL from existing backend service unless overridden.
SERVICE_API="${SERVICE_API:-karate-soup-api}"
API_URL="${API_URL:-}"
if [[ -z "${API_URL}" ]]; then
  API_URL="$(gcloud run services describe "${SERVICE_API}" --region "${REGION}" --format='value(status.url)')"
fi

if [[ -z "${API_URL}" ]]; then
  echo "[ERROR] API URL の取得に失敗しました" >&2
  exit 1
fi

echo "[INFO] project: ${PROJECT_ID}"
echo "[INFO] region:  ${REGION}"
echo "[INFO] repo:    ${REPO}"
echo "[INFO] web:     ${WEB_IMAGE}"
echo "[INFO] api:     ${API_URL}"

gcloud config set project "${PROJECT_ID}"
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

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
echo "web: $(gcloud run services describe "${SERVICE_WEB}" --region "${REGION}" --format='value(status.url)')"
