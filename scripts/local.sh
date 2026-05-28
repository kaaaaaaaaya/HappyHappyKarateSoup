#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BACKEND_URL="${BACKEND_URL:-http://localhost:8080}"
WEB_URL="${WEB_URL:-http://localhost:8081}"

ENV_FILE=""
USE_AI=true
NO_BUILD=false

usage() {
  cat <<'USAGE'
Usage:
  bash scripts/local.sh up [--env-file PATH] [--no-build] [--ai|--no-ai]
  bash scripts/local.sh smoke [--env-file PATH] [--ai|--no-ai]
  bash scripts/local.sh down [-v]
  bash scripts/local.sh logs [backend|web|mysql]

Defaults:
  - Uses Docker Compose (mysql + backend + web).
  - Vertex AI is ON by default (requires credentials).
  - When --ai is set (default), the script validates required env/secret files.

Environment:
  BACKEND_URL (default: http://localhost:8080)
  WEB_URL     (default: http://localhost:8081)
USAGE
}

require_cmd() {
  local cmd="$1"
  command -v "$cmd" >/dev/null 2>&1 || {
    echo "[ERROR] Required command not found: $cmd" >&2
    exit 1
  }
}

load_env_file_if_any() {
  if [[ -z "$ENV_FILE" ]]; then
    return 0
  fi
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "[ERROR] --env-file not found: $ENV_FILE" >&2
    exit 1
  fi
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
}

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "[ERROR] Missing env: $name" >&2
    exit 1
  fi
}

validate_ai_config() {
  # Default is Vertex AI (matches docker-compose.yml default).
  GEMINI_USE_VERTEX_AI="${GEMINI_USE_VERTEX_AI:-true}"
  SOUP_LOCAL_FALLBACK_ENABLED="${SOUP_LOCAL_FALLBACK_ENABLED:-false}"
  GEMINI_PROJECT_ID="${GEMINI_PROJECT_ID:-happy-happy-karate-soup}"
  GEMINI_LOCATION="${GEMINI_LOCATION:-us-central1}"
  GEMINI_TEXT_MODEL="${GEMINI_TEXT_MODEL:-gemini-2.5-flash}"
  export GEMINI_USE_VERTEX_AI SOUP_LOCAL_FALLBACK_ENABLED
  export GEMINI_PROJECT_ID GEMINI_LOCATION GEMINI_TEXT_MODEL

  if [[ "$GEMINI_USE_VERTEX_AI" == "true" ]]; then
    echo "[INFO] AI mode: Vertex AI"
    echo "[INFO] GEMINI_PROJECT_ID=${GEMINI_PROJECT_ID}"
    echo "[INFO] GEMINI_LOCATION=${GEMINI_LOCATION}"
    echo "[INFO] GEMINI_TEXT_MODEL=${GEMINI_TEXT_MODEL}"
    if [[ -f "apps/web/backend-java/.secrets/vertex-ai-key.json" ]]; then
      echo "[INFO] Found service account key: apps/web/backend-java/.secrets/vertex-ai-key.json"
      return 0
    fi

    # Alternative: use ADC created by `gcloud auth application-default login`
    adc_path="${HOME}/.config/gcloud/application_default_credentials.json"
    if [[ -f "$adc_path" ]]; then
      echo "[INFO] Found ADC credentials: ${adc_path}"
      return 0
    fi

    echo "[ERROR] No Vertex AI credentials found for local Docker." >&2
    echo "[HINT] Choose one:" >&2
    echo "  1) (Recommended) Run: gcloud auth application-default login" >&2
    echo "     This creates: ~/.config/gcloud/application_default_credentials.json (mounted into the container)." >&2
    echo "  2) Place a service account key at: apps/web/backend-java/.secrets/vertex-ai-key.json" >&2
    echo "     And set GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/vertex-ai-key.json when starting Docker." >&2
    exit 1
  else
    echo "[INFO] AI mode: Gemini API key"
    require_env GEMINI_API_KEY
  fi
}

parse_common_flags() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --env-file)
        ENV_FILE="${2:-}"
        if [[ -z "$ENV_FILE" ]]; then
          echo "[ERROR] --env-file requires a path" >&2
          exit 1
        fi
        shift 2
        ;;
      --ai)
        USE_AI=true
        shift
        ;;
      --no-ai)
        USE_AI=false
        shift
        ;;
      --no-build)
        NO_BUILD=true
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        break
        ;;
    esac
  done

  echo "$@"
}

compose() {
  if [[ -n "$ENV_FILE" ]]; then
    docker compose --env-file "$ENV_FILE" "$@"
  else
    docker compose "$@"
  fi
}

ensure_secrets_dir() {
  mkdir -p apps/web/backend-java/.secrets
}

wait_http_ok() {
  local url="$1"
  local name="$2"
  local retries="${3:-60}"
  local sleep_s="${4:-2}"

  for ((i=1; i<=retries; i++)); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "[OK] $name: $url"
      return 0
    fi
    sleep "$sleep_s"
  done

  echo "[ERROR] Timeout waiting for $name: $url" >&2
  return 1
}

cmd="${1:-}"
shift || true

case "$cmd" in
  up)
    rest="$(parse_common_flags "$@")"
    # shellcheck disable=SC2206
    set -- $rest

    require_cmd docker
    require_cmd curl
    ensure_secrets_dir
    load_env_file_if_any

    if [[ -n "$(compose ps -q)" ]]; then
      echo "[STEP] docker compose down (cleanup running stack)"
      compose down
    fi
    echo "[STEP] docker image prune (dangling only)"
    docker image prune -f

    if [[ "$USE_AI" == "true" ]]; then
      validate_ai_config
    else
      export GEMINI_USE_VERTEX_AI="false"
      export SOUP_LOCAL_FALLBACK_ENABLED="true"
    fi

    extra=()
    if [[ "$NO_BUILD" == "false" ]]; then
      extra+=(--build)
    fi

    echo "[STEP] docker compose up (mysql + backend + web)"
    compose up -d "${extra[@]}" mysql backend web

    echo "[STEP] wait for backend/web"
    wait_http_ok "${BACKEND_URL}/actuator/health" "backend actuator health"
    wait_http_ok "${BACKEND_URL}/api/soup/health" "backend api health"
    wait_http_ok "${WEB_URL}/" "web"
    ;;

  smoke)
    rest="$(parse_common_flags "$@")"
    # shellcheck disable=SC2206
    set -- $rest

    require_cmd docker
    require_cmd curl
    load_env_file_if_any

    if [[ "$USE_AI" == "true" ]]; then
      validate_ai_config
    else
      export GEMINI_USE_VERTEX_AI="false"
      export SOUP_LOCAL_FALLBACK_ENABLED="true"
    fi

    echo "[STEP] wait for backend/web (assumes already up)"
    wait_http_ok "${BACKEND_URL}/actuator/health" "backend actuator health"
    wait_http_ok "${BACKEND_URL}/api/soup/health" "backend api health"
    wait_http_ok "${WEB_URL}/" "web"

    echo "[STEP] POST /api/soup/generate (smoke)"
    curl -fsS "${BACKEND_URL}/api/soup/generate" \
      -H 'content-type: application/json' \
      --data '{"ingredients":["water","salt"],"referenceImageDataUrl":"","selectedDifficulty":"EASY"}' \
      >/dev/null
    echo "[OK] generate endpoint"
    ;;

  down)
    require_cmd docker
    if [[ "${1:-}" == "-v" ]]; then
      echo "[STEP] docker compose down -v"
      compose down -v
    else
      echo "[STEP] docker compose down"
      compose down
    fi
    ;;

  logs)
    require_cmd docker
    target="${1:-}"
    if [[ -z "$target" ]]; then
      compose logs -f --tail=200
    else
      compose logs -f --tail=200 "$target"
    fi
    ;;

  ""|-h|--help|help)
    usage
    ;;

  *)
    echo "[ERROR] Unknown command: $cmd" >&2
    usage
    exit 1
    ;;
esac
