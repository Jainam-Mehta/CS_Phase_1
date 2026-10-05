# GitHub Actions Secrets Configuration Template

This document provides the exact secrets and environment variables needed for the CI/CD pipeline.

## How to Add Secrets to GitHub

1. Go to repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Enter **Name** and **Value**
4. Repeat for each secret below

---

## Required Secrets

### GCP Configuration

#### `GCP_PROJECT_ID`
**Value:** `exalted-skein-505210-g0`  
**Purpose:** GCP project identifier

#### `GCP_REGION`
**Value:** `asia-south1`  
**Purpose:** GCP region for Artifact Registry and Compute Engine

#### `GCP_SA_KEY`
**Value:** (service account JSON key - see setup below)  
**Purpose:** Authentication with GCP

**How to get:**
```bash
# Create service account (if needed)
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions CI/CD"

# Create and download JSON key
gcloud iam service-accounts keys create sa-key.json \
  --iam-account=github-actions@exalted-skein-505210-g0.iam.gserviceaccount.com

# Copy entire JSON content to this secret
cat sa-key.json
```

#### `GCP_SSH_PRIVATE_KEY`
**Value:** (SSH private key)  
**Purpose:** SSH access to GCP VMs for deployment

**How to get:**
```bash
# Generate SSH key pair (if needed)
ssh-keygen -t rsa -b 4096 -f ~/.ssh/github-actions -N ""

# Copy entire private key content
cat ~/.ssh/github-actions

# Then add public key to VM:
for vm in coldsense-production-vm coldsense-staging-vm; do
  gcloud compute instances add-metadata $vm \
    --metadata=ssh-keys="jainammehta250:$(cat ~/.ssh/github-actions.pub)" \
    --zone=asia-south1-c
done
```

#### `GCP_ARTIFACT_REPO`
**Value:** `coldsense`  
**Purpose:** Artifact Registry repository name

---

### Frontend Build Secrets

#### `VITE_SUPABASE_URL`
**Value:** `https://your-project.supabase.co`  
**Purpose:** Supabase database URL for frontend

**How to get:**
1. Go to Supabase project settings
2. Copy the API URL from Project Settings → General

#### `VITE_SUPABASE_ANON_KEY`
**Value:** (Supabase anon key)  
**Purpose:** Supabase anonymous key for frontend API calls

**How to get:**
1. Go to Supabase project settings
2. Copy the anon public key from Project Settings → API

---

### Notification Secrets (Optional)

#### `SLACK_WEBHOOK_URL`
**Value:** `https://hooks.slack.com/services/T.../B.../X...`  
**Purpose:** Send Slack notifications on CI/CD events  
**Optional:** Yes (workflows have `continue-on-error: true`)

**How to get:**
1. Go to https://api.slack.com/apps
2. Create new app → "From scratch"
3. Name: "ColdSense CI/CD"
4. Choose workspace
5. Enable "Incoming Webhooks"
6. Click "Add New Webhook to Workspace"
7. Select #deployments channel
8. Copy webhook URL

#### `ALERT_EMAIL`
**Value:** `admin@example.com`  
**Purpose:** Email address for deployment alerts  
**Optional:** Yes

#### `EMAIL_SERVER`
**Value:** `smtp.gmail.com`  
**Purpose:** SMTP server for sending emails  
**Optional:** Yes

#### `EMAIL_PORT`
**Value:** `587`  
**Purpose:** SMTP port  
**Optional:** Yes

#### `EMAIL_USERNAME`
**Value:** `noreply@example.com`  
**Purpose:** SMTP authentication username  
**Optional:** Yes

#### `EMAIL_PASSWORD`
**Value:** (app-specific password, not regular Gmail password)  
**Purpose:** SMTP authentication password  
**Optional:** Yes

**How to get (for Gmail):**
1. Enable 2-Factor Authentication on Gmail account
2. Go to Google Account → Security → App passwords
3. Generate app-specific password
4. Use this password (not your regular Gmail password)

---

### Security Scanning (Optional)

#### `GITGUARDIAN_API_KEY`
**Value:** (GitGuardian API key)  
**Purpose:** Secret scanning for API keys in code  
**Optional:** Yes

**How to get:**
1. Sign up at https://dashboard.gitguardian.com
2. Go to Personal access tokens
3. Create new token
4. Copy token

---

## Environment Variables (Not Secrets)

These can be hardcoded in workflows (not sensitive data):

```yaml
env:
  GCP_PROJECT_ID: exalted-skein-505210-g0
  GCP_REGION: asia-south1
  ARTIFACT_REGISTRY: asia-south1-docker.pkg.dev
  REGISTRY_REPOSITORY: coldsense
```

---

## Deployment Environment Secrets

For production deployments, create environment-specific secrets:

**Go to:** Settings → Environments → [production/staging] → Environment secrets

### Production Environment Secrets

Same as above + any production-specific values

### Staging Environment Secrets

Same as above + any staging-specific values

---

## Verification Checklist

- [ ] `GCP_PROJECT_ID` added ✓
- [ ] `GCP_REGION` added ✓
- [ ] `GCP_SA_KEY` added ✓
- [ ] `GCP_SSH_PRIVATE_KEY` added ✓
- [ ] `GCP_ARTIFACT_REPO` added ✓
- [ ] `VITE_SUPABASE_URL` added ✓
- [ ] `VITE_SUPABASE_ANON_KEY` added ✓
- [ ] Service account has correct IAM roles ✓
- [ ] SSH public key on VMs ✓
- [ ] GitHub Actions can read secrets ✓

---

## Testing Secrets

### Test GCP Credentials

```bash
# Using the service account JSON
gcloud auth activate-service-account --key-file=sa-key.json
gcloud config set project exalted-skein-505210-g0

# Verify access
gcloud compute instances list
gcloud artifacts repositories describe coldsense --location=asia-south1
```

### Test SSH Key

```bash
# Test SSH connection
ssh -i ~/.ssh/github-actions jainammehta250@<VM_IP> "docker ps"
```

### Test Supabase Access

```bash
# From frontend code
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
```

---

## Security Best Practices

✅ **Do:**
- Rotate SSH keys every 90 days
- Rotate service account keys quarterly
- Use environment-specific secrets
- Audit secret access logs
- Keep secret values out of logs

❌ **Don't:**
- Commit secrets to git
- Share secrets via email/chat
- Use production secrets in test workflows
- Log secret values
- Reuse secrets across projects

---

## Troubleshooting

### Secret not visible in workflow

**Problem:** `${{ secrets.MY_SECRET }}` is empty

**Solutions:**
1. Check secret name is spelled correctly (case-sensitive)
2. For pull requests from forks, secrets are not available
3. Ensure workflow has access to secrets

### Authentication fails with GCP

**Problem:** `gcloud: command not found` or `permission denied`

**Solutions:**
1. Verify `GCP_SA_KEY` is valid JSON
2. Check service account has required IAM roles:
   - `roles/compute.admin`
   - `roles/artifactregistry.writer`
3. Regenerate service account key if needed

### SSH connection timeout

**Problem:** `Unable to connect to ... port 22: Connection timed out`

**Solutions:**
1. Verify VM is running: `gcloud compute instances list`
2. Check firewall allows SSH (port 22)
3. Verify SSH public key is on VM
4. Ensure private key has correct permissions: `chmod 600 ~/.ssh/github-actions`

---

## Sample Secret Configuration

Here's what your GitHub Actions secrets page should look like after setup:

```
Repository secrets:
├── GCP_PROJECT_ID              ✓ Set
├── GCP_REGION                  ✓ Set
├── GCP_SA_KEY                  ✓ Set (hidden)
├── GCP_SSH_PRIVATE_KEY         ✓ Set (hidden)
├── GCP_ARTIFACT_REPO           ✓ Set
├── VITE_SUPABASE_URL           ✓ Set
├── VITE_SUPABASE_ANON_KEY      ✓ Set (hidden)
├── SLACK_WEBHOOK_URL           ✓ Set (hidden, optional)
└── GITGUARDIAN_API_KEY         ✓ Set (hidden, optional)

Environment secrets (production):
├── GCP_PROJECT_ID              ✓ Inherited
└── [any production-specific secrets]

Environment secrets (staging):
├── GCP_PROJECT_ID              ✓ Inherited
└── [any staging-specific secrets]
```

---

## Updating Secrets

### Update a secret:
1. Go to Settings → Secrets
2. Find the secret
3. Click "Update"
4. Enter new value
5. Save

### Delete a secret:
1. Go to Settings → Secrets
2. Find the secret
3. Click "Delete"
4. Confirm

---

## Emergency Secret Rotation

If a secret is compromised:

1. **Immediately rotate SSH key:**
   ```bash
   # Generate new key
   ssh-keygen -t rsa -b 4096 -f ~/.ssh/github-actions-new -N ""
   
   # Add to VMs
   gcloud compute instances add-metadata coldsense-production-vm \
     --metadata=ssh-keys="jainammehta250:$(cat ~/.ssh/github-actions-new.pub)" \
     --zone=asia-south1-c
   
   # Update GitHub secret
   # Then delete old key
   ```

2. **Regenerate service account key:**
   ```bash
   # List existing keys
   gcloud iam service-accounts keys list \
     --iam-account=github-actions@exalted-skein-505210-g0.iam.gserviceaccount.com
   
   # Create new key
   gcloud iam service-accounts keys create new-sa-key.json \
     --iam-account=github-actions@exalted-skein-505210-g0.iam.gserviceaccount.com
   
   # Update GitHub secret
   
   # Delete old key
   gcloud iam service-accounts keys delete <KEY_ID> \
     --iam-account=github-actions@exalted-skein-505210-g0.iam.gserviceaccount.com
   ```

3. **Notify team of rotation**

---

**Last Updated:** August 26, 2026  
**Version:** 1.0
