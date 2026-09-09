# 🚀 ColdSense Fresh Start - Compute Engine Deployment

## 💰 Cost Optimization Strategy

**OLD APPROACH (Deleted):** GKE Autopilot = ~$100-140/month  
**NEW APPROACH:** Single Compute Engine VM = ~$10-20/month ✅

---

## 📋 Project Configuration

### New Setup:
- **Project ID**: `exalted-skein-505210-g0`
- **Region**: `asia-south1` (Mumbai)
- **Zone**: `asia-south1-a`
- **VM Name**: `coldsense-backend-vm`
- **Machine Type**: `e2-medium` (2 vCPU, 4GB RAM)
- **Disk**: 20GB SSD
- **OS**: Ubuntu 24.04 LTS
- **External IP**: Static (will be assigned)

---

## 🎯 Complete Step-by-Step Commands

Copy and paste these commands **one by one** in PowerShell.

---

## PHASE 1: Setup & Authentication

### Step 1.1: Login to Google Cloud
```powershell
gcloud auth login
```
**Action**: Browser will open → Login → Allow permissions

### Step 1.2: Set Project
```powershell
gcloud config set project exalted-skein-505210-g0
```

### Step 1.3: Set Default Region & Zone
```powershell
gcloud config set compute/region asia-south1
gcloud config set compute/zone asia-south1-a
```

### Step 1.4: Enable Required APIs
```powershell
gcloud services enable compute.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

---

## PHASE 2: Create VM Instance

### Step 2.1: Create the VM
```powershell
gcloud compute instances create coldsense-backend-vm `
    --zone=asia-south1-a `
    --machine-type=e2-medium `
    --image-family=ubuntu-2404-lts-amd64 `
    --image-project=ubuntu-os-cloud `
    --boot-disk-size=20GB `
    --boot-disk-type=pd-balanced `
    --tags=http-server,https-server `
    --metadata=startup-script='#!/bin/bash
apt-get update
apt-get install -y docker.io docker-compose git
systemctl enable docker
systemctl start docker
usermod -aG docker $USER
'
```

**Wait**: VM creation takes 1-2 minutes

### Step 2.2: Create Firewall Rules
```powershell
# Allow HTTP traffic
gcloud compute firewall-rules create allow-http `
    --allow tcp:80 `
    --target-tags http-server `
    --description="Allow HTTP traffic to backend"

# Allow backend API port
gcloud compute firewall-rules create allow-backend `
    --allow tcp:8000 `
    --target-tags http-server `
    --description="Allow access to FastAPI backend"

# Allow MQTT port
gcloud compute firewall-rules create allow-mqtt `
    --allow tcp:1883 `
    --target-tags http-server `
    --description="Allow MQTT traffic"
```

### Step 2.3: Reserve Static External IP
```powershell
gcloud compute addresses create coldsense-backend-ip `
    --region=asia-south1

# Get the IP address
gcloud compute addresses describe coldsense-backend-ip `
    --region=asia-south1 `
    --format="value(address)"
```

**Save this IP address!** You'll need it for frontend configuration.

### Step 2.4: Assign Static IP to VM
```powershell
# Stop the VM
gcloud compute instances stop coldsense-backend-vm --zone=asia-south1-a

# Assign static IP
gcloud compute instances delete-access-config coldsense-backend-vm `
    --zone=asia-south1-a `
    --access-config-name="external-nat"

gcloud compute instances add-access-config coldsense-backend-vm `
    --zone=asia-south1-a `
    --access-config-name="external-nat" `
    --address=coldsense-backend-ip

# Start the VM
gcloud compute instances start coldsense-backend-vm --zone=asia-south1-a
```

---

## PHASE 3: Deploy Backend to VM

### Step 3.1: SSH into the VM
```powershell
gcloud compute ssh coldsense-backend-vm --zone=asia-south1-a
```

**You are now inside the VM!** Continue with these commands:

### Step 3.2: Install Docker Compose (inside VM)
```bash
# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### Step 3.3: Create Project Directory (inside VM)
```bash
mkdir -p ~/coldsense
cd ~/coldsense
```

### Step 3.4: Create docker-compose.yml (inside VM)
```bash
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  mosquitto:
    image: eclipse-mosquitto:2
    container_name: coldsense-mosquitto
    restart: unless-stopped
    ports:
      - "1883:1883"
    volumes:
      - ./mosquitto/config:/mosquitto/config
      - ./mosquitto/data:/mosquitto/data
      - ./mosquitto/log:/mosquitto/log
    networks:
      - coldsense-network

  backend:
    image: asia-south1-docker.pkg.dev/exalted-skein-505210-g0/coldsense/backend:latest
    container_name: coldsense-backend
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - MQTT_BROKER=mosquitto
      - MQTT_PORT=1883
      - MQTT_TOPIC=coldsense/sensors
      - SUPABASE_URL=https://vzoypfctadgyflzwodmp.supabase.co
      - SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6b3lwZmN0YWRneWZsendvZG1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNDc5NzcsImV4cCI6MjEwMDcyMzk3N30.oL-WZUgX2FQ2hvmahkDkqQLCuqdGoctrZiN8BtFw6y8
      - LOG_LEVEL=INFO
    depends_on:
      - mosquitto
    networks:
      - coldsense-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  simulator:
    image: asia-south1-docker.pkg.dev/exalted-skein-505210-g0/coldsense/simulator:latest
    container_name: coldsense-simulator
    restart: unless-stopped
    environment:
      - MQTT_BROKER=mosquitto
      - MQTT_PORT=1883
      - SUPABASE_URL=https://vzoypfctadgyflzwodmp.supabase.co
      - SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6b3lwZmN0YWRneWZsendvZG1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNDc5NzcsImV4cCI6MjEwMDcyMzk3N30.oL-WZUgX2FQ2hvmahkDkqQLCuqdGoctrZiN8BtFw6y8
    depends_on:
      - mosquitto
      - backend
    networks:
      - coldsense-network

networks:
  coldsense-network:
    driver: bridge
EOF
```

### Step 3.5: Create Mosquitto Config (inside VM)
```bash
mkdir -p mosquitto/config mosquitto/data mosquitto/log

cat > mosquitto/config/mosquitto.conf << 'EOF'
listener 1883
allow_anonymous true
persistence true
persistence_location /mosquitto/data/
log_dest file /mosquitto/log/mosquitto.log
log_dest stdout
log_type all
EOF
```

### Step 3.6: Authenticate Docker with Artifact Registry (inside VM)
```bash
gcloud auth configure-docker asia-south1-docker.pkg.dev
```

---

## PHASE 4: Build & Push Images (Back to Local)

**Exit the VM first:**
```bash
exit
```

**You're back on your local machine now.**

### Step 4.1: Create Artifact Registry
```powershell
gcloud artifacts repositories create coldsense `
    --repository-format=docker `
    --location=asia-south1 `
    --description="ColdSense Docker images"
```

### Step 4.2: Configure Docker Authentication (Local)
```powershell
gcloud auth configure-docker asia-south1-docker.pkg.dev
```

### Step 4.3: Build Backend Image
```powershell
cd "c:\Users\Jainam Mehta\OneDrive\Desktop\CS_Project\backend"

docker build -t asia-south1-docker.pkg.dev/exalted-skein-505210-g0/coldsense/backend:latest .
```

### Step 4.4: Build Simulator Image
```powershell
cd simulators

docker build -t asia-south1-docker.pkg.dev/exalted-skein-505210-g0/coldsense/simulator:latest .
```

### Step 4.5: Push Images to Registry
```powershell
docker push asia-south1-docker.pkg.dev/exalted-skein-505210-g0/coldsense/backend:latest
docker push asia-south1-docker.pkg.dev/exalted-skein-505210-g0/coldsense/simulator:latest
```

---

## PHASE 5: Start Services on VM

### Step 5.1: SSH back into VM
```powershell
gcloud compute ssh coldsense-backend-vm --zone=asia-south1-a
```

### Step 5.2: Pull and Start Containers (inside VM)
```bash
cd ~/coldsense

# Pull latest images
docker-compose pull

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

**Expected output**: All 3 containers (mosquitto, backend, simulator) should be "Up"

### Step 5.3: Test Backend (inside VM)
```bash
curl http://localhost:8000/health
```

Expected: `{"status":"ok"}`

### Step 5.4: Exit VM
```bash
exit
```

---

## PHASE 6: Verify External Access

### Step 6.1: Get External IP
```powershell
$EXTERNAL_IP = gcloud compute addresses describe coldsense-backend-ip --region=asia-south1 --format="value(address)"
Write-Host "External IP: $EXTERNAL_IP" -ForegroundColor Green
Write-Host "API URL: http://${EXTERNAL_IP}:8000" -ForegroundColor Cyan
Write-Host "API Docs: http://${EXTERNAL_IP}:8000/docs" -ForegroundColor Cyan
```

### Step 6.2: Test External Access
```powershell
curl "http://${EXTERNAL_IP}:8000/health"
```

### Step 6.3: Open API Docs in Browser
```powershell
Start-Process "http://${EXTERNAL_IP}:8000/docs"
```

---

## PHASE 7: Update Frontend

### Step 7.1: Update Frontend .env
```powershell
cd "c:\Users\Jainam Mehta\OneDrive\Desktop\CS_Project\frontend"

# Create or update .env.local
@"
VITE_API_URL=http://${EXTERNAL_IP}:8000
"@ | Out-File -FilePath .env.local -Encoding utf8
```

### Step 7.2: Restart Frontend
```powershell
# If dev server is running, stop it (Ctrl+C), then:
npm run dev
```

---

## ✅ Verification Checklist

### Check Services:
```powershell
# SSH into VM
gcloud compute ssh coldsense-backend-vm --zone=asia-south1-a

# Check containers
docker-compose ps

# Check logs
docker-compose logs backend
docker-compose logs simulator
docker-compose logs mosquitto

# Exit
exit
```

### Check Database:
1. Open Supabase: https://supabase.com/dashboard
2. Go to Table Editor
3. Check these tables for new data:
   - `sensor_readings`
   - `energy_consumption`
   - `door_events`

### Check Frontend:
1. Open: http://localhost:5173
2. Login or signup
3. Navigate to dashboard
4. Verify charts show data

---

## 🔄 Useful Management Commands

### View Logs:
```powershell
gcloud compute ssh coldsense-backend-vm --zone=asia-south1-a --command "cd ~/coldsense && docker-compose logs -f"
```

### Restart Services:
```powershell
gcloud compute ssh coldsense-backend-vm --zone=asia-south1-a --command "cd ~/coldsense && docker-compose restart"
```

### Stop Services:
```powershell
gcloud compute ssh coldsense-backend-vm --zone=asia-south1-a --command "cd ~/coldsense && docker-compose down"
```

### Start Services:
```powershell
gcloud compute ssh coldsense-backend-vm --zone=asia-south1-a --command "cd ~/coldsense && docker-compose up -d"
```

### Update Backend Image:
```powershell
# Local: Rebuild and push
cd "c:\Users\Jainam Mehta\OneDrive\Desktop\CS_Project\backend"
docker build -t asia-south1-docker.pkg.dev/exalted-skein-505210-g0/coldsense/backend:latest .
docker push asia-south1-docker.pkg.dev/exalted-skein-505210-g0/coldsense/backend:latest

# VM: Pull and restart
gcloud compute ssh coldsense-backend-vm --zone=asia-south1-a --command "cd ~/coldsense && docker-compose pull backend && docker-compose up -d backend"
```

---

## 🧹 Cleanup (To Save Money)

### Stop VM (keeps data, stops charges):
```powershell
gcloud compute instances stop coldsense-backend-vm --zone=asia-south1-a
```

### Start VM again:
```powershell
gcloud compute instances start coldsense-backend-vm --zone=asia-south1-a
```

### Delete Everything:
```powershell
# Delete VM
gcloud compute instances delete coldsense-backend-vm --zone=asia-south1-a --quiet

# Delete static IP
gcloud compute addresses delete coldsense-backend-ip --region=asia-south1 --quiet

# Delete firewall rules
gcloud compute firewall-rules delete allow-http --quiet
gcloud compute firewall-rules delete allow-backend --quiet
gcloud compute firewall-rules delete allow-mqtt --quiet

# Delete Artifact Registry
gcloud artifacts repositories delete coldsense --location=asia-south1 --quiet
```

---

## 💰 Cost Breakdown

### Monthly Costs:
- **VM (e2-medium)**: ~$25/month (24/7)
- **Static IP**: ~$3/month (when VM is running)
- **Disk (20GB SSD)**: ~$3/month
- **Network Egress**: ~$2-5/month
- **Artifact Registry**: ~$0.10/GB/month
- **Total**: **~$33-36/month**

### Cost Saving Tips:
1. **Stop VM when not in use** (nights/weekends)
2. **Use spot instances** (70% cheaper, but can be terminated)
3. **Downgrade to e2-small** (1 vCPU, 2GB RAM) = ~$15/month
4. **Delete old Docker images** from Artifact Registry

---

## 🚨 Troubleshooting

### VM won't start:
```powershell
gcloud compute instances describe coldsense-backend-vm --zone=asia-south1-a
```

### Can't SSH:
```powershell
gcloud compute ssh coldsense-backend-vm --zone=asia-south1-a --troubleshoot
```

### Backend not accessible:
```powershell
# Check firewall
gcloud compute firewall-rules list

# Check VM external IP
gcloud compute instances describe coldsense-backend-vm --zone=asia-south1-a --format="get(networkInterfaces[0].accessConfigs[0].natIP)"
```

### Containers not running:
```powershell
gcloud compute ssh coldsense-backend-vm --zone=asia-south1-a
cd ~/coldsense
docker-compose ps
docker-compose logs
```

---

## 📞 Quick Reference

### VM Info:
```powershell
gcloud compute instances describe coldsense-backend-vm --zone=asia-south1-a
```

### External IP:
```powershell
gcloud compute addresses describe coldsense-backend-ip --region=asia-south1 --format="value(address)"
```

### SSH:
```powershell
gcloud compute ssh coldsense-backend-vm --zone=asia-south1-a
```

### View Logs:
```powershell
gcloud compute ssh coldsense-backend-vm --zone=asia-south1-a --command "cd ~/coldsense && docker-compose logs -f backend"
```

---

**🎯 Total Time Estimate: 45-60 minutes**

**Ready? Start with PHASE 1! 🚀**

