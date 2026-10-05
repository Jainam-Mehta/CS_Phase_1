# GitHub Actions CI/CD Pipeline for ColdSense

Welcome! This folder contains the complete CI/CD pipeline for ColdSense AI.

## 📁 File Structure

```
.github/
├── workflows/                    # GitHub Actions workflows
│   ├── ci.yml                   # Build & Test (frontend, backend, security)
│   ├── build-push.yml           # Docker build & push to Artifact Registry
│   ├── deploy.yml               # Deploy to GCP Compute Engine
│   └── manual-rollback.yml      # Emergency rollback workflow
│
├── CI_CD_SETUP.md               # 📖 Comprehensive setup guide (START HERE)
├── SECRETS_TEMPLATE.md          # 🔐 Secrets configuration & how to set up
├── QUICK_START.md               # ⚡ 5-minute quick start guide
└── README.md                    # This file

root/
└── CI_CD_PIPELINE_SUMMARY.md    # 📊 Full implementation overview
```

## 🚀 Getting Started (5 Minutes)

### 1. Read the Quick Start
📖 **Start here:** [`QUICK_START.md`](QUICK_START.md) (5 min read)

### 2. Configure Secrets
🔐 **Follow this guide:** [`SECRETS_TEMPLATE.md`](SECRETS_TEMPLATE.md)

### 3. Push and Deploy
```bash
git push origin develop
```
Watch the magic happen in the **Actions** tab! ✨

## 📚 Documentation Guide

### For Setup & Configuration
| Document | Time | Purpose |
|----------|------|---------|
| [QUICK_START.md](QUICK_START.md) | 5 min | Quick reference, 5-minute setup |
| [CI_CD_SETUP.md](CI_CD_SETUP.md) | 20 min | Detailed setup instructions |
| [SECRETS_TEMPLATE.md](SECRETS_TEMPLATE.md) | 15 min | All secrets & how to obtain them |

### For Understanding & Reference
| Document | Time | Purpose |
|----------|------|---------|
| [../CI_CD_PIPELINE_SUMMARY.md](../CI_CD_PIPELINE_SUMMARY.md) | 30 min | Complete overview & architecture |
| [CI_CD_SETUP.md](CI_CD_SETUP.md) | 20 min | Detailed architecture section |

## 🔄 Pipeline Overview

```
Push to GitHub
    ↓
CI Workflow (8-12 min)
├─ Frontend tests
├─ Backend tests
└─ Security scan
    ↓
Build Workflow (10-15 min)
├─ Build Docker images
├─ Scan images
└─ Push to registry
    ↓
Deploy Workflow (5-10 min)
├─ Deploy to staging/production
├─ Health checks
└─ Notifications
```

**Total Time:** ~25-40 minutes from push to live ⏱️

## 📋 Workflow Files

### 1. `ci.yml` - Continuous Integration
**Triggers:** Push to main/develop or PR

**Features:**
- Frontend: Node.js 18.x & 20.x test matrix
- Backend: Python 3.11 & 3.12 test matrix
- Security: Trivy + GitGuardian scanning
- Duration: 8-12 minutes

### 2. `build-push.yml` - Docker Build & Push
**Triggers:** After successful CI

**Features:**
- Multi-stage Docker builds
- Automatic tagging (latest, develop-{sha}, v1.0.0)
- Container vulnerability scanning
- Push to GCP Artifact Registry
- Duration: 10-15 minutes

### 3. `deploy.yml` - Deployment to GCP
**Triggers:** After successful build

**Features:**
- Staging: Auto-deploy from develop
- Production: Requires approval
- Health check verification
- Slack/email notifications
- Duration: 5-10 minutes

### 4. `manual-rollback.yml` - Emergency Rollback
**Triggers:** Manual dispatch from Actions tab

**Features:**
- Quick rollback to any previous version
- Target: staging or production
- Duration: 3-5 minutes

## ✅ Setup Checklist

### GCP Configuration (30 min)
- [ ] Create service account `github-actions`
- [ ] Grant IAM roles (compute.admin, artifactregistry.writer, etc.)
- [ ] Create Artifact Registry repository
- [ ] Add SSH keys to VMs

### GitHub Configuration (15 min)
- [ ] Create 2 environments: staging, production
- [ ] Add 7 required secrets (see SECRETS_TEMPLATE.md)
- [ ] (Optional) Add notification secrets

### Repository Files (5 min)
- [ ] Copy workflow files to `.github/workflows/`
- [ ] Commit and push

### Testing (15 min)
- [ ] Push to develop branch
- [ ] Verify CI passes
- [ ] Verify build succeeds
- [ ] Verify deploy to staging works

## 🎯 First Deployment

### Step 1: Configure Secrets
```
Settings → Secrets and variables → Actions → New repository secret

Add these 7 secrets:
  GCP_PROJECT_ID
  GCP_REGION
  GCP_SA_KEY
  GCP_SSH_PRIVATE_KEY
  GCP_ARTIFACT_REPO
  VITE_SUPABASE_URL
  VITE_SUPABASE_ANON_KEY
```

### Step 2: Push to Develop
```bash
git push origin develop
```

### Step 3: Watch Actions
Go to **Actions** tab and watch the pipeline run!

## 🔧 Common Commands

### View Workflow Runs
- Go to **Actions** tab
- Click on workflow (CI, Build, Deploy, etc.)
- View real-time logs

### Deploy to Production
**Option 1: From GitHub UI**
1. Go to **Actions** → **Deploy**
2. Click **Run workflow**
3. Select environment: **production**
4. Wait for approval prompt
5. Approve and deploy

**Option 2: Manual Deployment**
Push to `main` branch and approve when prompted

### Emergency Rollback
1. Go to **Actions** → **Manual Rollback**
2. Click **Run workflow**
3. Select environment: **staging** or **production**
4. Enter target version (e.g., `v1.0.0`, `latest`)
5. Submit

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Workflows not running | Check files are in `.github/workflows/` |
| GCP auth fails | Verify GCP_SA_KEY secret is valid JSON |
| Deployment hangs | SSH to VM, check `docker ps` |
| Health check fails | Run `docker logs coldsense-backend` |
| Can't SSH to VM | VM may be stopped, restart in GCP |

**Full troubleshooting:** See [CI_CD_SETUP.md](CI_CD_SETUP.md#troubleshooting)

## 📊 Performance

### Build Times
| Stage | Time | Notes |
|-------|------|-------|
| CI | 8-12 min | Includes all tests |
| Build | 10-15 min | Docker build + scan |
| Deploy | 5-10 min | SSH + restart |
| **Total** | **23-37 min** | From push to live |

### Monthly Effort Saved
```
✅ Automated testing:    1-2 hours/week
✅ Docker builds:        30 min/week
✅ Deployments:          1 hour/week
─────────────────────────────────
TOTAL SAVED:             4-5 hours/month
```

## 🔐 Security

### Built-in Scanning
- ✅ Python linting (flake8)
- ✅ Code formatting (black, isort)
- ✅ Type checking (mypy)
- ✅ Container scanning (Trivy)
- ✅ Secret detection (GitGuardian)
- ✅ Dependency scanning (Trivy)

### Access Control
- ✅ Production requires approval
- ✅ SSH key-based authentication
- ✅ IAM role-based permissions
- ✅ GitHub secrets encryption

## 💰 Cost

```
GitHub Actions:     Free (within 2000 min/month limit)
GCP Artifact Registry: ~$0.10/GB (<$5/month)
Total impact:       Negligible
```

## 📞 Support

### For Setup
See [QUICK_START.md](QUICK_START.md) or [CI_CD_SETUP.md](CI_CD_SETUP.md)

### For Secrets
See [SECRETS_TEMPLATE.md](SECRETS_TEMPLATE.md)

### For Full Details
See [../CI_CD_PIPELINE_SUMMARY.md](../CI_CD_PIPELINE_SUMMARY.md)

## 🎓 Learning Resources

- [GitHub Actions Docs](https://docs.github.com/actions)
- [GCP Artifact Registry](https://cloud.google.com/artifact-registry/docs)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

## ✨ Next Steps

1. ✅ Read [QUICK_START.md](QUICK_START.md)
2. ✅ Configure secrets from [SECRETS_TEMPLATE.md](SECRETS_TEMPLATE.md)
3. ✅ Push to develop branch
4. ✅ Watch deployment in Actions tab
5. ✅ Celebrate! 🎉

---

**Ready to deploy?** Push to develop and watch the pipeline handle everything! 🚀

**Last Updated:** August 26, 2026  
**Status:** Production Ready
