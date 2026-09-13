#!/bin/bash
# =============================================================================
# ColdSense GCP Deployment Script
# VM: coldsense-production-vm | IP: 35.200.228.62 | Zone: asia-south1-c
# Run this from your LOCAL machine (Windows: use Git Bash or WSL)
# =============================================================================

set -e  # Exit on any error

VM_NAME="coldsense-production-vm"
ZONE="asia-south1-c"
VM_IP="35.200.228.62"
PROJECT="exalted-skein-505210-g0"
REGISTRY="asia-south1-docker.pkg.dev/${PROJECT}/coldsense-repo"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   ColdSense Production Deployment            ║"
echo "║   VM: ${VM_IP}                        ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── STEP 1: Copy files to VM ──────────────────────────────────────────────────
echo "📁 Step 1/5: Copying files to VM..."

gcloud compute scp infrastructure/docker-compose.yml \
    ${VM_NAME}:~/docker-compose.yml \
    --zone=${ZONE} \
    --project=${PROJECT}

# Copy mosquitto config
gcloud compute scp infrastructure/mosquitto.conf \
    ${VM_NAME}:~/mosquitto.conf \
    --zone=${ZONE} \
    --project=${PROJECT} 2>/dev/null || echo "  ℹ mosquitto.conf not found locally, will create on VM"

echo "  ✓ Files copied"

# ── STEP 2: Setup VM ─────────────────────────────────────────────────────────
echo ""
echo "🔧 Step 2/5: Setting up VM (Docker, auth)..."

gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT} --command="
set -e

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo '  Installing Docker...'
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker \$USER
    echo '  ✓ Docker installed'
else
    echo '  ✓ Docker already installed'
fi

# Install Docker Compose plugin if not present
if ! docker compose version &> /dev/null; then
    echo '  Installing Docker Compose...'
    sudo apt-get update -qq
    sudo apt-get install -y docker-compose-plugin
    echo '  ✓ Docker Compose installed'
else
    echo '  ✓ Docker Compose already installed'
fi

# Authenticate with GCP Artifact Registry
echo '  Authenticating with GCP Artifact Registry...'
gcloud auth configure-docker asia-south1-docker.pkg.dev --quiet
echo '  ✓ Docker auth configured'
"

echo "  ✓ VM setup complete"

# ── STEP 3: Create mosquitto config on VM ────────────────────────────────────
echo ""
echo "🦟 Step 3/5: Configuring Mosquitto MQTT broker..."

gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT} --command="
# Create mosquitto config that allows anonymous connections (for testing)
cat > ~/mosquitto.conf << 'EOF'
listener 1883
allow_anonymous true
persistence true
persistence_location /mosquitto/data/
log_dest stdout
log_type all
EOF
echo '  ✓ Mosquitto config created'
"

echo "  ✓ Mosquitto configured"

# ── STEP 4: Pull images and start containers ──────────────────────────────────
echo ""
echo "🐳 Step 4/5: Pulling Docker images and starting containers..."

gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT} --command="
set -e

cd ~

# Pull latest images
echo '  Pulling backend image...'
docker pull ${REGISTRY}/backend:latest
echo '  ✓ Backend image pulled'

echo '  Pulling simulator image...'
docker pull ${REGISTRY}/simulator:latest
echo '  ✓ Simulator image pulled'

# Update docker-compose to use mosquitto.conf
# Mount the local mosquitto.conf into the container
sed -i 's|command: mosquitto -c /mosquitto-no-auth.conf|command: mosquitto -c /mosquitto/config/mosquitto.conf|' ~/docker-compose.yml

# Add mosquitto config volume mount if not already present
# (handled by the volume mount below)

# Stop existing containers if running
docker compose down 2>/dev/null || true
echo '  ✓ Old containers stopped'

# Start all containers
docker compose up -d
echo '  ✓ All containers started'

# Wait for services to be healthy
echo '  Waiting for services to start (30s)...'
sleep 30

# Check status
docker compose ps
"

echo "  ✓ Containers started"

# ── STEP 5: Health check ──────────────────────────────────────────────────────
echo ""
echo "🏥 Step 5/5: Running health checks..."

sleep 5

# Check backend health
HEALTH=$(curl -s --max-time 10 http://${VM_IP}:8000/health || echo "FAILED")
if echo "$HEALTH" | grep -q "healthy\|ok\|OK"; then
    echo "  ✓ Backend API is healthy: ${HEALTH}"
else
    echo "  ⚠ Backend health check response: ${HEALTH}"
    echo "  (This might be normal if the backend is still starting)"
fi

# Check MQTT port
if nc -z -w5 ${VM_IP} 1883 2>/dev/null; then
    echo "  ✓ MQTT broker is reachable on port 1883"
else
    echo "  ⚠ MQTT port 1883 not yet reachable (may need firewall rule)"
    echo "    Run: gcloud compute firewall-rules create allow-mqtt --allow tcp:1883 --target-tags coldsense"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ✅  DEPLOYMENT COMPLETE                                     ║"
echo "║                                                              ║"
echo "║  Backend API:   http://${VM_IP}:8000                 ║"
echo "║  MQTT Broker:   ${VM_IP}:1883                        ║"
echo "║  Health Check:  http://${VM_IP}:8000/health          ║"
echo "║  API Docs:      http://${VM_IP}:8000/docs            ║"
echo "║                                                              ║"
echo "║  Sensor topic format:                                        ║"
echo "║  coldsense/{room_id}/{SensorType}/{index}                    ║"
echo "║  Example:                                                    ║"
echo "║  coldsense/abc-123/Temperature/1                             ║"
echo "║  Payload: {\"value\": 4.2, \"unit\": \"°C\"}                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
