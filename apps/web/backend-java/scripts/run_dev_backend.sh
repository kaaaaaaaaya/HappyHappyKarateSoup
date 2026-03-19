#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

PORT="${BACKEND_PORT:-8080}"
KILL_PORT_CONFLICT=false

if [[ "${1:-}" == "--kill-port" ]]; then
  KILL_PORT_CONFLICT=true
fi

cd "$PROJECT_DIR"

# Load env files automatically for local development.
# .env is loaded first, then .env.local overrides values.
if [[ -f ".env" ]]; then
  set -a
  # shellcheck source=/dev/null
  source ".env"
  set +a
fi

if [[ -f ".env.local" ]]; then
  set -a
  # shellcheck source=/dev/null
  source ".env.local"
  set +a
fi

if [[ "${GEMINI_USE_VERTEX_AI:-true}" == "true" ]]; then
  : "${GEMINI_PROJECT_ID:?GEMINI_PROJECT_ID is required when GEMINI_USE_VERTEX_AI=true}"
  : "${GEMINI_LOCATION:?GEMINI_LOCATION is required when GEMINI_USE_VERTEX_AI=true}"
  : "${GOOGLE_APPLICATION_CREDENTIALS:?GOOGLE_APPLICATION_CREDENTIALS is required when GEMINI_USE_VERTEX_AI=true}"
fi

LISTEN_PID="$(lsof -ti :"$PORT" -sTCP:LISTEN || true)"
if [[ -n "$LISTEN_PID" ]]; then
  if [[ "$KILL_PORT_CONFLICT" == "true" ]]; then
    echo "[run_dev_backend] Port $PORT is in use by PID $LISTEN_PID. Killing it..."
    kill "$LISTEN_PID"
    sleep 1
  else
    echo "[run_dev_backend] Port $PORT is already in use by PID $LISTEN_PID."
    echo "[run_dev_backend] Stop it first or run: bash scripts/run_dev_backend.sh --kill-port"
    exit 1
  fi
fi

exec mvn org.springframework.boot:spring-boot-maven-plugin:3.4.3:run
