#!/usr/bin/env pwsh

# ============================================================================
# AUTOMATED FRONTEND DEPLOYMENT TO GCP
# ============================================================================

$VM_NAME = "coldsense-production-vm"
$GCP_ZONE = "asia-south1-c"
$REGISTRY = "asia-south1-docker.pkg.dev/exalted-skein-505210-g0/coldsense-repo"
$IMAGE = "$REGISTRY/frontend:latest"

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🚀 FRONTEND DEPLOYMENT TO GCP" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan

# Step 1: Kill old containers
Write-Host "`n[1/5] Killing old containers..." -ForegroundColor Yellow
gcloud compute ssh $VM_NAME --zone=$GCP_ZONE --command="docker kill coldsense-backend coldsense-mqtt coldsense-postgres coldsense-mqtt-broker coldsense-frontend 2>/dev/null; true"

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Some containers were not running (OK)" -ForegroundColor Yellow
}

# Step 2: Remove old containers
Write-Host "`n[2/5] Removing old containers..." -ForegroundColor Yellow
gcloud compute ssh $VM_NAME --zone=$GCP_ZONE --command="docker rm coldsense-backend coldsense-mqtt coldsense-postgres coldsense-mqtt-broker coldsense-frontend 2>/dev/null; true"

# Step 3: Pull latest image
Write-Host "`n[3/5] Pulling latest frontend image..." -ForegroundColor Yellow
gcloud compute ssh $VM_NAME --zone=$GCP_ZONE --command="docker pull $IMAGE"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to pull image" -ForegroundColor Red
    exit 1
}

# Step 4: Start frontend container
Write-Host "`n[4/5] Starting frontend container..." -ForegroundColor Yellow
gcloud compute ssh $VM_NAME --zone=$GCP_ZONE --command="docker run -d --name coldsense-frontend -p 80:3000 --restart always -e VITE_SUPABASE_URL=https://vzoypfctadgyflzwodmp.supabase.co -e VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6b3lwZmN0YWRneWZsendvZG1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNDc5NzcsImV4cCI6MjEwMDcyMzk3N30.oL-WZUgX2FQ2hvmahkDkqQLCuqdGoctrZiN8BtFw6y8 $IMAGE"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start container" -ForegroundColor Red
    exit 1
}

# Step 5: Verify deployment
Write-Host "`n[5/5] Verifying deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

$result = gcloud compute ssh $VM_NAME --zone=$GCP_ZONE --command="docker ps | grep coldsense-frontend"

if ($result) {
    Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "✅ DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "`n🌐 Your app is now live at:" -ForegroundColor Cyan
    Write-Host "   http://1accord.xyz" -ForegroundColor Green
    Write-Host "   http://35.200.159.76" -ForegroundColor Green
    Write-Host "`n📊 Updated features:" -ForegroundColor Cyan
    Write-Host "   ✓ India map legend (white → deep blue gradient)" -ForegroundColor Green
    Write-Host "   ✓ Removed light blue colors (unused in data)" -ForegroundColor Green
    Write-Host "   ✓ Frontend-only deployment (saves costs)" -ForegroundColor Green
} else {
    Write-Host "`n❌ Deployment verification failed" -ForegroundColor Red
    Write-Host "Checking logs..." -ForegroundColor Yellow
    gcloud compute ssh $VM_NAME --zone=$GCP_ZONE --command="docker logs coldsense-frontend"
    exit 1
}
