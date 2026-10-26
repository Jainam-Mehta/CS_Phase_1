# SystemII - CI/CD Pipeline Flow Documentation

**Document Version:** 1.0  
**Last Updated:** October 26, 2026  
**Tool:** GitHub Actions  

---

## Executive Summary

This document describes the complete Continuous Integration/Continuous Deployment (CI/CD) pipeline for SystemII. The pipeline automates:
- Code testing and validation
- Docker image building
- Automated deployment to GCP
- Rollback capability
- Release tracking

**Current Status:** Pipeline framework ready, manual deployment used. Automation to be enabled Week 2.

---

## Pipeline Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    Developer Workflow                            │
└──────────────────────────────────────────────────────────────────┘
                              ↓
                    git push to GitHub (main)
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│         GitHub Actions Workflow Triggered                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Stage 1: CODE VALIDATION                                        │
│  ├─ Checkout code                                                │
│  ├─ Run linters (ESLint for frontend, flake8 for backend)        │
│  ├─ Run unit tests (pytest, Jest)                                │
│  ├─ Type checking (TypeScript, mypy)                             │
│  └─ Security scanning (Snyk, SAST)                               │
│                                                                  │
│  [IF FAILED → Stop, notify developer]                            │
│                                                                  │
│  Stage 2: BUILD                                                  │
│  ├─ Build frontend (npm run build)                               │
│  ├─ Build backend (poetry install, pytest)                       │
│  ├─ Build Docker images:                                         │
│  │  ├─ coldsense-frontend:latest                                │
│  │  ├─ coldsense-backend:latest                                 │
│  │  └─ Tag with commit SHA for versioning                       │
│  └─ Push to GCP Artifact Registry                                │
│                                                                  │
│  [IF BUILD FAILED → Stop, notify developer]                      │
│                                                                  │
│  Stage 3: DEPLOY TO STAGING (Optional)                           │
│  ├─ Deploy to staging VM                                        │
│  ├─ Run smoke tests                                              │
│  ├─ Run integration tests                                        │
│  └─ Verify database migrations                                   │
│                                                                  │
│  [IF TESTS FAILED → Stop, notify developer]                      │
│                                                                  │
│  Stage 4: DEPLOY TO PRODUCTION                                   │
│  ├─ Pull Docker images from Artifact Registry                    │
│  ├─ SSH to GCP production VM                                     │
│  ├─ Run docker-compose up                                        │
│  ├─ Verify health endpoints                                      │
│  ├─ Verify database connectivity                                 │
│  ├─ Create GitHub Release (v1.2.3)                               │
│  └─ Notify Slack/Email on success                                │
│                                                                  │
│  [IF DEPLOYMENT FAILED → Auto-rollback to previous version]      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                              ↓
                  Production Running (v1.2.3)
                    Users accessing system
```

---

## GitHub Actions Workflows

### Workflow 1: Frontend CI/CD

**File:** `.github/workflows/frontend-ci-cd.yml`

```yaml
name: Frontend CI/CD

on:
  push:
    branches:
      - main
    paths:
      - 'frontend/**'
      - '.github/workflows/frontend-ci-cd.yml'
  pull_request:
    branches:
      - main
    paths:
      - 'frontend/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: 'frontend/package-lock.json'

      - name: Install dependencies
        run: npm ci
        working-directory: frontend

      - name: Lint
        run: npm run lint
        working-directory: frontend
        continue-on-error: true

      - name: Type checking
        run: npm run type-check
        working-directory: frontend

      - name: Build
        run: npm run build
        working-directory: frontend

      - name: Run tests
        run: npm run test -- --run
        working-directory: frontend
        continue-on-error: true

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run Snyk scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
        continue-on-error: true

  build-and-push:
    needs: [validate, security-scan]
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v3

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v1
        with:
          workload_identity_provider: ${{ secrets.GCP_WORKLOAD_PROVIDER }}
          service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1

      - name: Configure Docker for GCP
        run: |
          gcloud auth configure-docker asia-south1-docker.pkg.dev

      - name: Build and push Docker image
        run: |
          docker build -t asia-south1-docker.pkg.dev/exalted-skein-505210-g0/coldsense-repo/frontend:latest \
                       -t asia-south1-docker.pkg.dev/exalted-skein-505210-g0/coldsense-repo/frontend:${{ github.sha }} \
                       ./frontend
          docker push asia-south1-docker.pkg.dev/exalted-skein-505210-g0/coldsense-repo/frontend:latest
          docker push asia-south1-docker.pkg.dev/exalted-skein-505210-g0/coldsense-repo/frontend:${{ github.sha }}

  deploy-production:
    needs: build-and-push
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v3

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v1
        with:
          workload_identity_provider: ${{ secrets.GCP_WORKLOAD_PROVIDER }}
          service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1

      - name: Deploy to GCP VM
        run: |
          gcloud compute ssh coldsense-production-vm \
            --zone=asia-south1-c \
            --command="cd CS_Project/infrastructure && docker-compose pull && docker-compose up -d --force-recreate coldsense-frontend"

      - name: Verify deployment
        run: |
          curl -f http://35.200.159.76:3000 || exit 1

      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: frontend-${{ github.run_number }}
          release_name: Frontend Deployment ${{ github.run_number }}
          body: |
            Frontend deployed from commit ${{ github.sha }}
            Image: coldsense-repo/frontend:${{ github.sha }}

      - name: Notify Slack
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "✅ Frontend deployment successful",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Frontend Deployed* ✅\n*Branch:* main\n*Commit:* ${{ github.sha }}\n*Time:* ${{ github.event.head_commit.timestamp }}"
                  }
                }
              ]
            }

  rollback-on-failure:
    if: failure()
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write

    steps:
      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v1
        with:
          workload_identity_provider: ${{ secrets.GCP_WORKLOAD_PROVIDER }}
          service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1

      - name: Rollback to previous version
        run: |
          gcloud compute ssh coldsense-production-vm \
            --zone=asia-south1-c \
            --command="cd CS_Project/infrastructure && docker-compose up -d coldsense-frontend"

      - name: Notify Slack of rollback
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "⚠️ Frontend deployment FAILED and rolled back",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Frontend Deployment Failed* ⚠️\n*Action Required:* Check logs at ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
                  }
                }
              ]
            }
```

### Workflow 2: Backend CI/CD

**File:** `.github/workflows/backend-ci-cd.yml`

```yaml
name: Backend CI/CD

on:
  push:
    branches:
      - main
    paths:
      - 'backend/**'
      - '.github/workflows/backend-ci-cd.yml'
  pull_request:
    branches:
      - main
    paths:
      - 'backend/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.12'
          cache: 'pip'

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r backend/requirements.txt
          pip install pytest pytest-cov flake8 mypy

      - name: Lint (flake8)
        run: flake8 backend/app --max-line-length=100
        continue-on-error: true

      - name: Type check (mypy)
        run: mypy backend/app --ignore-missing-imports
        continue-on-error: true

      - name: Run unit tests
        run: |
          cd backend
          pytest tests/ -v --cov=app --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage.xml
          fail_ci_if_error: false

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run Snyk scan
        uses: snyk/actions/python@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high backend/
        continue-on-error: true

  build-and-push:
    needs: [validate, security-scan]
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v3

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v1
        with:
          workload_identity_provider: ${{ secrets.GCP_WORKLOAD_PROVIDER }}
          service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1

      - name: Configure Docker for GCP
        run: |
          gcloud auth configure-docker asia-south1-docker.pkg.dev

      - name: Build and push Docker image
        run: |
          docker build -t asia-south1-docker.pkg.dev/exalted-skein-505210-g0/coldsense-repo/backend:latest \
                       -t asia-south1-docker.pkg.dev/exalted-skein-505210-g0/coldsense-repo/backend:${{ github.sha }} \
                       ./backend
          docker push asia-south1-docker.pkg.dev/exalted-skein-505210-g0/coldsense-repo/backend:latest
          docker push asia-south1-docker.pkg.dev/exalted-skein-505210-g0/coldsense-repo/backend:${{ github.sha }}

  deploy-production:
    needs: build-and-push
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v3

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v1
        with:
          workload_identity_provider: ${{ secrets.GCP_WORKLOAD_PROVIDER }}
          service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1

      - name: Deploy to GCP VM
        run: |
          gcloud compute ssh coldsense-production-vm \
            --zone=asia-south1-c \
            --command="cd CS_Project/infrastructure && docker-compose pull && docker-compose up -d --force-recreate coldsense-backend"

      - name: Verify deployment
        run: |
          sleep 5
          curl -f http://35.200.159.76:8000/health || exit 1

      - name: Run smoke tests
        run: |
          curl -f http://35.200.159.76:8000/api/sites/ || exit 1

      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: backend-${{ github.run_number }}
          release_name: Backend Deployment ${{ github.run_number }}
          body: |
            Backend deployed from commit ${{ github.sha }}
            Image: coldsense-repo/backend:${{ github.sha }}

      - name: Notify Slack
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "✅ Backend deployment successful",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Backend Deployed* ✅\n*Branch:* main\n*Commit:* ${{ github.sha }}\n*Image:* backend:${{ github.sha }}"
                  }
                }
              ]
            }
```

---

## Pipeline Triggers

### Automatic Triggers

| Event | Condition | Action |
|-------|-----------|--------|
| `push to main` | Any push | Run CI/CD |
| `pull_request` | PR opened/updated | Run validation only (no deploy) |
| `cron schedule` | Daily at 2 AM UTC | Run security scans |
| `workflow_dispatch` | Manual trigger | Allow manual deployment |

### Manual Triggers

```bash
# Manually trigger deployment via GitHub UI
# Or via CLI:
gh workflow run backend-ci-cd.yml --ref main
```

---

## Secrets Management

**Required GitHub Secrets:**

```
GCP_WORKLOAD_PROVIDER     = Service account workload identity provider
GCP_SERVICE_ACCOUNT       = service-account@project.iam.gserviceaccount.com
SNYK_TOKEN               = Snyk API token for security scanning
SLACK_WEBHOOK            = Slack webhook URL for notifications
GITHUB_TOKEN             = Auto-generated by GitHub (do not set)
```

**Setup:**
```
GitHub Settings → Secrets → New repository secret
├─ GCP_WORKLOAD_PROVIDER: [from gcloud output]
├─ GCP_SERVICE_ACCOUNT: [from GCP console]
├─ SNYK_TOKEN: [from snyk.io account]
└─ SLACK_WEBHOOK: [from Slack app]
```

---

## Deployment Process

### Step-by-Step Execution

```
1. Developer commits code and pushes to main
   git push origin feature-branch
   
2. GitHub detects push to main
   → Triggers .github/workflows/frontend-ci-cd.yml (if frontend/ changed)
   → Triggers .github/workflows/backend-ci-cd.yml (if backend/ changed)

3. Job: validate
   ├─ Checkout repository
   ├─ Install dependencies
   ├─ Run linters (flake8, eslint)
   ├─ Type checking (mypy, tsc)
   ├─ Run unit tests (pytest, jest)
   └─ [FAIL → Notify, stop pipeline]
   └─ [PASS → Continue to next job]

4. Job: security-scan
   ├─ Run Snyk static analysis
   ├─ Check for vulnerable dependencies
   └─ [WARN → Continue anyway, notify]

5. Job: build-and-push
   ├─ Build Docker image
   ├─ Tag with commit SHA
   ├─ Push to GCP Artifact Registry
   └─ [FAIL → Stop, notify developer]

6. Job: deploy-production
   ├─ SSH to GCP VM
   ├─ Pull latest Docker images
   ├─ Run: docker-compose up -d --force-recreate
   ├─ Verify health endpoint
   ├─ Create GitHub Release
   └─ Notify Slack on success

7. Job: rollback-on-failure (if 6 fails)
   ├─ Revert to previous docker-compose state
   ├─ Notify Slack of rollback
   └─ Alert on-call engineer
```

### Deployment Timeline

```
T+0:    Developer pushes to main
T+30s:  GitHub workflow triggered
T+1m:   Validation phase (lint, type-check, tests)
T+3m:   Security scanning
T+4m:   Docker build
T+6m:   Push to Artifact Registry
T+8m:   SSH to GCP VM
T+9m:   docker-compose pull (if images cached, <1min)
T+10m:  Services running
T+11m:  Health checks passing
T+12m:  Release created
T+13m:  Slack notification sent

TOTAL: ~13 minutes from push to production
```

---

## Rollback Procedure

### Automatic Rollback

If deployment fails health checks:
```bash
# Automatically triggered
docker-compose up -d coldsense-backend  # Revert to previous version
```

### Manual Rollback

```bash
# SSH to VM
gcloud compute ssh coldsense-production-vm --zone=asia-south1-c

# Pull previous Docker image (by SHA)
cd CS_Project/infrastructure
docker pull asia-south1-docker.pkg.dev/exalted-skein-505210-g0/coldsense-repo/backend:abc123def456

# Update docker-compose.yml to use specific SHA
docker-compose up -d

# Verify
curl http://localhost:8000/health
```

---

## Monitoring Pipeline Health

### GitHub Actions Dashboard

```
GitHub → Your repo → Actions tab
├─ Workflow runs list
├─ Click run to see details
├─ View logs for each job
└─ Retry failed jobs
```

### Common Failures & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Test failed` | Code bug | Fix test, push |
| `Docker build failed` | Missing dependency | Update requirements.txt |
| `Deployment timeout` | GCP VM unreachable | Check VM status |
| `Health check failed` | Service not responding | Check logs on VM |
| `Secret not found` | Missing GitHub secret | Add to Settings → Secrets |

---

## Best Practices

### Commit Messages

```
Format: [TYPE] Short description

Examples:
✅ [FEAT] Add real-time temperature alerts
✅ [FIX] Fix MQTT subscriber latency issue
✅ [DOCS] Update deployment guide
❌ "fixed stuff"
❌ "update"
```

### Branch Strategy

```
main:        Production-ready code
  ├─ feature/temperature-alerts
  ├─ fix/mqtt-connection
  ├─ docs/update-readme
  └─ infrastructure/add-monitoring

Rule: Always create a feature branch, PR required before merge
```

### PR Checklist

Before merging to main:
- ✅ Tests passing
- ✅ Code reviewed
- ✅ No security warnings
- ✅ Documentation updated
- ✅ Changelog updated

---

## Future Enhancements

### Week 2 Improvements

```
├─ Slack notifications for each stage
├─ Database migration verification
├─ Performance regression testing
└─ Canary deployment (10% traffic first)
```

### Month 2 Improvements

```
├─ Multi-region deployment (failover)
├─ Blue-green deployment strategy
├─ Automated rollback on error metrics
├─ Load testing (1000+ concurrent users)
└─ Scheduled backups post-deployment
```

### Month 3+ Roadmap

```
├─ GitOps (ArgoCD) for declarative deployments
├─ Helm charts for Kubernetes
├─ Terraform for infrastructure as code
├─ Cost tracking per deployment
└─ Advanced observability (Prometheus, Grafana)
```

---

## Troubleshooting

### Pipeline Won't Trigger

```
Check:
1. Push is to 'main' branch (not 'master')
2. Files changed match path filter
3. GitHub Actions enabled in repo settings
4. Workflow file syntax is correct (YAML)
```

### Deployment Succeeds but Service Down

```
SSH to VM:
gcloud compute ssh coldsense-production-vm --zone=asia-south1-c

Check services:
docker ps
docker logs coldsense-backend
docker logs coldsense-frontend
docker logs coldsense-mqtt-broker

Restart service:
docker-compose restart coldsense-backend
```

### Secrets Not Working

```
1. Check GitHub Settings → Secrets → Repository secrets
2. Verify secret name matches workflow (case-sensitive)
3. Verify secret value is correct
4. Re-authenticate GCP if workload provider expired
```

---

**End of CI/CD Pipeline Documentation**
