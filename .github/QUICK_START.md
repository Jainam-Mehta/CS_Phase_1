# CI/CD Pipeline - Quick Start Guide

## 5-Minute Setup

### Step 1: Add GitHub Secrets (2 min)

Go to **Settings → Secrets and variables → Actions → New repository secret**

Copy-paste these (get values from your GCP account):

```
GCP_PROJECT_ID = exalted-skein-505210-g0
GCP_REGION = asia-south1
GCP_SA_KEY = [paste full JSON from sa-key.json]
GCP_SSH_PRIVATE_KEY = [paste private key content]
GCP_ARTIFACT_REPO = coldsense
VITE_SUPABASE_URL = [your Supabase URL]
VITE_SUPABASE_ANON_KEY = [your Supabase key]
```

### Step 2: Verify GCP Setup (2 min)

```bash
# Check project
gcloud config set project exalted-skein-505210-g0

# Check VMs exist
gcloud compute instances list

# Check Artifact Registry
gcloud artifacts repositories describe coldsense --location=asia-south1
```

### Step 3: Test Workflow (1 min)

1. Push to `develop` branch
2. Go to **Actions** tab
3. Watch CI workflow run
4. Once CI passes, build-push workflow starts
5. Once build passes, deploy to staging

## Deployment Flow

```
Push code to develop/main
       ↓
CI: Test, Lint, Build (8-12 min)
       ↓
Build: Docker images (10-15 min)
       ↓
Deploy: SSH to VM, restart (3-5 min)
       ↓
Status: Success/Failure notification
```

## Common Commands

### View workflow runs
- Go to **Actions** tab in GitHub
- Click on workflow to see details

### Manual deployment
- Go to **Actions** → **Deploy** 
- Click **Run workflow**
- Select environment (staging/production)

### Manual rollback
- Go to **Actions** → **Manual Rollback**
- Click **Run workflow**
- Select environment and version

### View VM logs
```bash
gcloud compute ssh coldsense-production-vm --zone=asia-south1-c
docker logs -f coldsense-backend
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Workflow not running | Check .github/workflows/ files are in repository |
| Auth fails | Verify GCP_SA_KEY is correct JSON |
| Deployment hangs | VM might be stopped, restart via GCP Console |
| Docker image not found | Verify Artifact Registry repo exists |
| Health check fails | SSH to VM, check `docker ps` and logs |

## Files Created

```
.github/
├── workflows/
│   ├── ci.yml                 # Main CI pipeline
│   ├── build-push.yml         # Docker build & push
│   ├── deploy.yml             # Deployment
│   └── manual-rollback.yml    # Rollback
├── CI_CD_SETUP.md             # Full documentation
├── SECRETS_TEMPLATE.md        # Secret configuration
└── QUICK_START.md             # This file
```

## Next Steps

1. ✅ Add all secrets to GitHub
2. ✅ Push to develop branch
3. ✅ Monitor first CI run (Actions tab)
4. ✅ Verify build completes
5. ✅ Check deployment to staging
6. ✅ Test manual rollback (optional)
7. ✅ Set up Slack notifications (optional)

## Support

- Check CI_CD_SETUP.md for detailed docs
- Check workflow logs for errors
- SSH to VM for container debugging
- Review SECRETS_TEMPLATE.md for configuration

---

**Ready to deploy? Push to develop and watch the magic happen! 🚀**
