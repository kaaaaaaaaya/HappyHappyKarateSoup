# Container / GKE / Cloud Run Guide

## 1. Docker local run

### Start all (MySQL + Backend + Web)

```bash
docker compose up --build
```

- Web: http://localhost:8081
- Backend health: http://localhost:8080/actuator/health

Notes:
- If Gemini env is not configured, backend now returns a local fallback response for soup generation (dev/demo friendly).
- Google login is optional for local play. Without VITE_GOOGLE_CLIENT_ID, Google login UI shows a warning but guest play still works.

### Stop

```bash
docker compose down
```

## 2. Build and push images to Artifact Registry

Replace variables before running:

```bash
PROJECT_ID="your-gcp-project"
REGION="us-central1"
REPO="happy-soup"

# Backend image
docker build -t "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/backend:latest" apps/web/backend-java
docker push "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/backend:latest"

# Web image
# VITE_API_BASE_URL should point to the public backend URL.
docker build \
  --build-arg VITE_API_BASE_URL="https://YOUR_BACKEND_URL" \
  --build-arg VITE_GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID" \
  -t "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/web:latest" \
  apps/web
docker push "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/web:latest"
```

### Current deployed resources (as of 2026-03-20)

Production is already deployed. Current runtime resources are:

- GCP project: happy-happy-karate-soup
- Artifact Registry repo: us-central1-docker.pkg.dev/happy-happy-karate-soup/happy-soup
- Web image: us-central1-docker.pkg.dev/happy-happy-karate-soup/happy-soup/web:latest
- Backend image: us-central1-docker.pkg.dev/happy-happy-karate-soup/happy-soup/backend:latest
- Cloud Run Web URL: https://karate-soup-web-486336410817.us-central1.run.app
- Cloud Run API URL: https://karate-soup-api-486336410817.us-central1.run.app

Current API runtime notes:

- GEMINI_USE_VERTEX_AI=true
- GEMINI_PROJECT_ID=happy-happy-karate-soup
- GEMINI_LOCATION=us-central1
- APP_CORS_ALLOWED_ORIGINS includes https://karate-soup-web-486336410817.us-central1.run.app

## 3. Cloud Run deploy

### Backend

1. Edit placeholders in `infra/cloudrun/backend-service.yaml`.
2. Deploy:

```bash
gcloud run services replace infra/cloudrun/backend-service.yaml --region "$REGION" --project "$PROJECT_ID"
```

### Web

1. Edit placeholders in `infra/cloudrun/web-service.yaml`.
2. Deploy:

```bash
gcloud run services replace infra/cloudrun/web-service.yaml --region "$REGION" --project "$PROJECT_ID"
```

## 4. GKE deploy

1. Edit image path and env placeholders in:
- `infra/gke/backend-deployment.yaml`
- `infra/gke/web-deployment.yaml`

2. Apply manifests:

```bash
kubectl apply -f infra/gke/namespace.yaml
kubectl apply -f infra/gke/backend-deployment.yaml
kubectl apply -f infra/gke/backend-service.yaml
kubectl apply -f infra/gke/web-deployment.yaml
kubectl apply -f infra/gke/web-service.yaml
kubectl apply -f infra/gke/ingress.yaml
```

3. Get endpoint:

```bash
kubectl get ingress -n happy-soup
kubectl get svc -n happy-soup
```

## Notes

- Backend uses MySQL. For production, use Cloud SQL and set `DB_HOST`, `DB_USERNAME`, `DB_PASSWORD` accordingly.
- If you use OAuth login, set `GOOGLE_OAUTH_CLIENT_ID` on backend and `VITE_GOOGLE_CLIENT_ID` at web build time.
- `APP_CORS_ALLOWED_ORIGINS` must include your deployed web origin.

## iPhone controller connection behavior

- Connect page now keeps API endpoint details under an optional advanced section.
- In most cases, leave advanced input empty.
- If iPhone cannot connect, open web using LAN host (example: http://192.168.x.x:8081) and retry QR scan.
- Verify iPhone network reachability with: http://PC_LAN_IP:8080/actuator/health
