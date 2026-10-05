# GitHub Actions CI/CD Pipeline Setup Guide

**Project:** ColdSense AI  
**Updated:** August 26, 2026  
**Status:** Ready for Implementation

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Setup Instructions](#setup-instructions)
5. [Workflows](#workflows)
6. [Secrets Configuration](#secrets-configuration)
7. [Environment Variables](#environment-variables)
8. [Deployment Environments](#deployment-environments)
9. [Monitoring & Debugging](#monitoring--debugging)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This CI/CD pipeline automates the entire deployment process for ColdSense:

- **Continuous Integration (CI):** Automatic testing and linting on every push/PR
- **Container Building:** Docker image creation and publishing to GCP Artifact Registry
- **Continuous Deployment (CD):** Automated deployment to GCP Compute Engine VMs
- **Health Checks:** Post-deployment verification
- **Rollback:** Manual rollback capability for quick recovery

### Pipeline Features

✅ **Frontend Testing:**
- Node.js 18.x and 20.x compatibility testing
- TypeScript type checking
- Code linting with Oxlint
- Build artifact generation

✅ **Backend Testing:**
- Python 3.11 and 3.12 compatibility
- Unit tests with pytest
- Code quality checks (flake8, black, isort)
- Type checking with mypy
- Coverage reporting to Codecov

✅ **Security:**
- Dependency vulnerability scanning (Trivy)
- Secret detection (GitGuardian)
- Container image scanning
- SARIF report uploads to GitHub Security

✅ **Docker Builds:**
- Multi-stage builds for optimization
- Caching for faster builds
- Automatic tagging (latest, branch, version)
- Push to GCP Artifact Registry

✅ **Deployment:**
- Staging and production environments
- Rolling updates with health checks
- SSH-based deployment to VMs
- Slack notifications
- Email alerts on failure

---

## Architecture

### Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                       GitHub Repository                         │
│                    (main, develop branches)                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                    git push / PR
                         │
        ┌────────────────┴────────────────┐
        │                                 │
        ▼                                 ▼
   ┌─────────────┐             ┌──────────────────┐
   │ CI Workflow │             │ Security Scan    │
   ├─────────────┤             ├──────────────────┤
   │ Frontend    │             │ Trivy scanning   │
   │ Backend     │             │ GitGuardian      │
   │ Tests       │             │ Dependency check │
   └────┬────────┘             └──────────────────┘
        │                               │
        └───────────────┬───────────────┘
                        │
              ✅ All checks pass?
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
   ┌──────────────────┐        ┌──────────────────┐
   │ Build Workflow   │        │ Skip (on fail)   │
   ├──────────────────┤        └──────────────────┘
   │ Build Backend    │
   │ Build Simulator  │
   │ Scan Images      │
   │ Push to Registry │
   └────┬─────────────┘
        │
        ▼
   ┌──────────────────┐
   │ Deploy Workflow  │
   ├──────────────────┤
   │ Pre-deployment   │
   │ SSH to VM        │
   │ Pull images      │
   │ Restart services │
   │ Health checks    │
   └────┬─────────────┘
        │
        ▼
   ┌──────────────────┐
   │ Notifications    │
   ├──────────────────┤
   │ Slack message    │
   │ Email alert      │
   │ Status badge     │
   └──────────────────┘
```

---

## Prerequisites

### Required Access & Permissions

- **GitHub Repository:** Admin access to enable Actions and create secrets
- **GCP Project:** `exalted-skein-505210-g0` with:
  - Compute Engine instances (production, staging VMs)
  - Artifact Registry repository
  - Cloud Build (optional)
- **GCP Service Account:** With roles:
  - `roles/compute.admin` - VM management
  - `roles/artifactregistry.writer` - Push Docker images
  - `roles/artifactregistry.reader` - Pull images
- **SSH Access:** Private key for VM access
- **GCP Artifact Registry:** Repository created at `asia-south1-docker.pkg.dev/{project}/coldsense`

### Tools & Services

- GitHub Actions (included with GitHub)
- GCP Artifact Registry
- Slack webhook (optional, for notifications)
- Email SMTP server (optional, for alerts)

---

## Setup Instructions

### Step 1: Create GitHub Repository Secrets

Navigate to: **Settings → Secrets and variables → Actions → New repository secret**

```yaml
# GCP Configuration
GCP_PROJECT_ID: "exalted-skein-505210-g0"
GCP_REGION: "asia-south1"
GCP_SA_KEY: <paste service account JSON key>
GCP_SSH_PRIVATE_KEY: <paste SSH private key>
GCP_ARTIFACT_REPO: "coldsense"

# Supabase (for frontend builds)
VITE_SUPABASE_URL: "https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY: "your-anon-key"

# Optional: Notifications
SLACK_WEBHOOK_URL: "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
ALERT_EMAIL: "admin@example.com"
EMAIL_SERVER: "smtp.gmail.com"
EMAIL_PORT: "587"
EMAIL_USERNAME: "noreply@example.com"
EMAIL_PASSWORD: "<app-specific-password>"

# Security scanning
GITGUARDIAN_API_KEY: "<optional-for-secret-scanning>"
```

### Step 2: Create GCP Service Account

```bash
# 1. Set project
export PROJECT_ID="exalted-skein-505210-g0"
gcloud config set project $PROJECT_ID

# 2. Create service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions CI/CD"

# 3. Grant required roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/compute.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.admin"

# 4. Create and download JSON key
gcloud iam service-accounts keys create sa-key.json \
  --iam-account=github-actions@${PROJECT_ID}.iam.gserviceaccount.com

# 5. Add SSH public key to VMs
gcloud compute instances add-metadata coldsense-production-vm \
  --metadata=ssh-keys="jainammehta250:$(cat ~/.ssh/id_rsa.pub)" \
  --zone=asia-south1-c
```

### Step 3: Create Artifact Registry Repository

```bash
# Create repository if it doesn't exist
gcloud artifacts repositories create coldsense \
  --repository-format=docker \
  --location=asia-south1 \
  --description="ColdSense Docker images" \
  || echo "Repository already exists"
```

### Step 4: Add Deployment Environments

Navigate to: **Settings → Environments → New environment**

**Create 2 environments:**

#### Environment 1: Staging
- Name: `staging`
- Deployment branches: `develop`
- (Optional) Require approvals: Unchecked

#### Environment 2: Production
- Name: `production`
- Deployment branches: `main`
- Require approvals: **Checked**
- Approvers: @jainam-mehta (or your GitHub username)

### Step 5: Enable GitHub Actions

1. Go to **Settings → Actions → General**
2. Ensure "Allow all actions and reusable workflows" is selected
3. Allow read/write permissions for workflows

### Step 6: Add Workflow Files

Copy the workflow YAML files to `.github/workflows/`:

```
.github/
└── workflows/
    ├── ci.yml                 # Build & Test workflow
    ├── build-push.yml         # Docker build & push
    ├── deploy.yml             # Deployment to GCP
    └── manual-rollback.yml    # Manual rollback
```

All files are included in this repository.

---

## Workflows

### 1. CI Workflow (`ci.yml`)

**Trigger:** Push to `main`/`develop` or PR

**Jobs:**
- **frontend-ci:** Node.js 18.x & 20.x, lint, type check, build
- **backend-ci:** Python 3.11 & 3.12, tests, code quality
- **security-scan:** Trivy + GitGuardian scanning
- **ci-status:** Overall CI status check

**Duration:** ~8-12 minutes

**Output:** Build artifacts, coverage reports, security scans

### 2. Build & Push Workflow (`build-push.yml`)

**Trigger:** 
- After successful CI workflow
- Manual push to `main`/`develop`
- Git tags (v*.*.*)

**Jobs:**
- **setup:** Generate image tags
- **build-backend:** Build FastAPI backend image
- **build-simulator:** Build sensor simulator image
- **scan-images:** Scan images with Trivy
- **notify:** Send build status

**Image Tags:**
- `main` → `latest`
- `develop` → `develop-{commit-sha}`
- Tags → `v1.0.0`

**Duration:** ~10-15 minutes

**Output:** Docker images in Artifact Registry

### 3. Deploy Workflow (`deploy.yml`)

**Trigger:**
- After successful Build & Push workflow
- Manual trigger with environment selection

**Jobs:**
- **setup:** Determine target environment/VM
- **pre-deployment-check:** Verify VM is running
- **deploy:** SSH to VM, pull images, restart services
- **post-deployment-check:** Health checks
- **notify-deployment:** Send results

**Environments:**
- `develop` branch → Staging VM
- `main` branch → Production VM (requires approval)
- Manual trigger → Choose environment

**Duration:** ~5-10 minutes

**Output:** Deployed services, health check results

### 4. Manual Rollback Workflow (`manual-rollback.yml`)

**Trigger:** Manual dispatch (Actions tab)

**Inputs:**
- Environment: `staging` or `production`
- Target version: Docker tag to rollback to

**Action:** SSH to VM, pull specific image version, restart

**Duration:** ~3-5 minutes

---

## Secrets Configuration

### GCP Service Account Key Setup

```bash
# 1. Create key file (if not already done)
gcloud iam service-accounts keys create sa-key.json \
  --iam-account=github-actions@exalted-skein-505210-g0.iam.gserviceaccount.com

# 2. Read and base64 encode (for reference)
cat sa-key.json | base64

# 3. Copy entire sa-key.json content to GitHub secret GCP_SA_KEY
cat sa-key.json  # Copy this entire JSON block
```

### SSH Private Key Setup

```bash
# 1. Generate SSH key pair (if not already done)
ssh-keygen -t rsa -b 4096 -f ~/.ssh/github-actions -N ""

# 2. Add public key to VMs
for vm in coldsense-production-vm coldsense-staging-vm; do
  gcloud compute instances add-metadata $vm \
    --metadata=ssh-keys="jainammehta250:$(cat ~/.ssh/github-actions.pub)" \
    --zone=asia-south1-c
done

# 3. Add private key to GitHub secret GCP_SSH_PRIVATE_KEY
cat ~/.ssh/github-actions  # Copy this entire key
```

### Slack Webhook Setup (Optional)

```bash
# 1. Go to https://api.slack.com/apps
# 2. Create new app → From scratch
# 3. Name: "ColdSense CI/CD", Workspace: select your workspace
# 4. Enable Incoming Webhooks
# 5. Add New Webhook to Workspace, select channel #deployments
# 6. Copy webhook URL to SLACK_WEBHOOK_URL secret
```

---

## Environment Variables

### Frontend Build Environment

Required for frontend builds:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=https://api.example.com
```

### Backend Runtime Environment

Stored in `infrastructure/.env.production`:
```
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=eyJ...

# MQTT
MQTT_BROKER=localhost
MQTT_PORT=1883

# CORS
ALLOWED_ORIGINS=https://coldsense.example.com,https://api.example.com

# Logging
LOG_LEVEL=INFO
```

---

## Deployment Environments

### Staging Environment

- **Branch:** `develop`
- **VM:** `coldsense-staging-vm` (asia-south1-c)
- **Auto-deploy:** Yes (no approval required)
- **Purpose:** Testing before production
- **Approval:** None required

### Production Environment

- **Branch:** `main`
- **VM:** `coldsense-production-vm` (asia-south1-c)
- **Auto-deploy:** No (requires manual approval)
- **Purpose:** Live user environment
- **Approval:** Required from repository admin

### Approval Process

```
1. Developer pushes to main
   ↓
2. CI/CD pipeline runs automatically
   ↓
3. Tests pass, images built
   ↓
4. Deployment workflow waits for approval
   ↓
5. Admin reviews and approves in GitHub UI
   ↓
6. Deployment proceeds to production
```

---

## Monitoring & Debugging

### View Workflow Runs

1. Go to **Actions** tab in GitHub
2. Select workflow (CI, Build & Push, Deploy, etc.)
3. Click on run to see detailed logs

### Common Log Locations

- **Frontend build:** `frontend-ci` → "Build frontend" step
- **Backend tests:** `backend-ci` → "Run unit tests" step
- **Docker build:** `build-push` → "Build backend image" step
- **Deployment:** `deploy` → "Deploy via SSH" step

### Debug Mode

Enable debug logging in actions:

```yaml
# Add to workflow step
env:
  ACTIONS_STEP_DEBUG: true
```

### View Container Logs on VM

```bash
# SSH to VM
gcloud compute ssh coldsense-production-vm --zone=asia-south1-c

# View container logs
docker logs -f coldsense-backend      # Backend API
docker logs -f coldsense-mqtt         # MQTT subscriber
docker logs -f coldsense-simulator    # Sensor simulator

# Check container status
docker ps

# Tail last 20 lines
docker logs coldsense-backend --tail=20
```

---

## Troubleshooting

### Issue: Workflow fails at "Build backend image"

**Error:** `denied: User: arn:aws:iam::... is not authorized`

**Solution:**
1. Verify GCP_SA_KEY is correctly base64-encoded
2. Check service account has `artifactregistry.writer` role
3. Ensure Artifact Registry repository exists in `asia-south1`

```bash
# Verify repository exists
gcloud artifacts repositories describe coldsense \
  --location=asia-south1
```

### Issue: Deployment hangs at "Deploy via SSH"

**Error:** Timeout connecting to VM

**Solution:**
1. Check VM is running:
   ```bash
   gcloud compute instances describe coldsense-production-vm \
     --zone=asia-south1-c --format='value(status)'
   ```

2. Verify SSH public key is added to VM:
   ```bash
   gcloud compute instances describe coldsense-production-vm \
     --zone=asia-south1-c \
     --format='value(metadata[ssh-keys])'
   ```

3. Check SSH private key in GitHub secret matches public key on VM

### Issue: Health check fails after deployment

**Error:** `curl: (7) Failed to connect to port 8000`

**Solution:**
1. SSH to VM and check container status:
   ```bash
   docker ps -a  # See all containers
   docker logs coldsense-backend --tail=50
   ```

2. Check if containers started:
   ```bash
   docker compose ps
   ```

3. Verify environment variables loaded:
   ```bash
   cat infrastructure/.env.production
   ```

### Issue: Tests fail locally but pass in CI

**Causes:**
1. Missing environment variables
2. Node.js/Python version mismatch
3. Docker cache issues

**Solution:**
```bash
# Run exact CI environment locally

# Frontend
npm ci  # Instead of npm install
npm run build

# Backend
python -m pip install --upgrade pip
pip install -r requirements.txt
pip install pytest pytest-cov
pytest tests/ -v
```

### Issue: Secret not available in workflow

**Error:** `${{ secrets.MY_SECRET }}` is empty

**Solution:**
1. Verify secret exists in Settings → Secrets
2. Check secret name spelling (case-sensitive)
3. Ensure workflow has permission to access secret
4. For pull requests from forks, secrets are not available

---

## Best Practices

### Workflow Design

✅ **Do:**
- Use matrix strategy for multiple versions (Node 18/20, Python 3.11/3.12)
- Cache dependencies (npm, pip) for faster builds
- Set `continue-on-error: true` for non-critical checks
- Use environment files for sensitive data
- Tag Docker images with multiple tags (latest + version)

❌ **Don't:**
- Commit secrets to repository
- Use `secrets` in PR workflows from forks
- Run long-running tests on every PR
- Push Docker images without scanning

### Deployment Strategy

✅ **Best Practices:**
1. **Staging First:** Deploy to staging before production
2. **Require Approval:** Manual approval for production deploys
3. **Health Checks:** Always verify deployment succeeded
4. **Rollback Ready:** Keep previous versions available for quick rollback
5. **Notifications:** Alert team on deployment status

### Versioning

- **Branches:** `main` (production), `develop` (staging)
- **Tags:** Semantic versioning `v1.0.0`, `v1.1.0`
- **Docker:** Latest on `main`, branch name on `develop`

### Secrets Management

- Rotate SSH keys every 90 days
- Use separate service accounts per environment
- Store secrets in GitHub only (not in code)
- Audit access regularly

---

## Next Steps

### Immediate (1-2 weeks)

- [ ] Create GitHub repository (if not already done)
- [ ] Set up GCP service account and secrets
- [ ] Add workflow YAML files to `.github/workflows/`
- [ ] Test CI workflow on develop branch
- [ ] Verify build-push workflow completes

### Short-term (2-4 weeks)

- [ ] Test deployment to staging environment
- [ ] Verify post-deployment health checks
- [ ] Set up Slack/email notifications
- [ ] Test manual rollback workflow
- [ ] Document team deployment process

### Medium-term (1-3 months)

- [ ] Set up monitoring/alerting (Cloud Monitoring)
- [ ] Implement automated rollback on health check failure
- [ ] Add performance benchmarking
- [ ] Set up Blue-Green deployment strategy
- [ ] Implement feature flags for safer deployments

---

## Support & Maintenance

### Workflow Updates

Update workflows when:
- GCP project IDs change
- VM names/zones change
- Service account roles update
- New services added to docker-compose

### Monitoring

- Check workflow runs weekly
- Monitor build times (should stay < 15 min)
- Review failure patterns
- Update dependencies regularly

### Cleanup

- Archive old builds after 30 days
- Delete unused Docker images
- Review and revoke old SSH keys
- Audit service account permissions quarterly

---

## Additional Resources

- **GitHub Actions Docs:** https://docs.github.com/actions
- **GCP Artifact Registry:** https://cloud.google.com/artifact-registry/docs
- **GCP Compute Engine:** https://cloud.google.com/compute/docs
- **Docker Best Practices:** https://docs.docker.com/develop/dev-best-practices/
- **ColdSense Technical Docs:** See TECHNICAL_DOCUMENTATION.md

---

**Document Version:** 1.0  
**Last Updated:** August 26, 2026  
**Author:** ColdSense Engineering Team
