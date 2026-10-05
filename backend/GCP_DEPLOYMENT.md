# ColdSense Backend - GCP Deployment Guide

## Overview

This guide walks you through deploying ColdSense backend to a Google Cloud Platform (GCP) Compute Instance with 24/7 auto-start via systemd service.

**Features:**
- ✅ Automatic MQTT subscriber for sensor data
- ✅ 24/7 uptime with systemd auto-start
- ✅ Auto-restart on failure
- ✅ Real-time Supabase database sync
- ✅ Easy monitoring via journalctl logs

---

## Prerequisites

1. **GCP Account** with an active project
2. **Compute Instance** running Ubuntu 20.04 or later
3. **GitHub Repository** access (code should be public or SSH key configured)
4. **Supabase Project** with credentials (.env file)

### Instance Details (Current Setup)
- **Instance Name:** `coldsense-production-vm`
- **Zone:** `asia-south1-c`
- **Machine Type:** Recommended: `e2-medium` or higher
- **OS:** Ubuntu 20.04 LTS

---

## Step 1: Prepare Your Local Machine

### 1.1 Authenticate with GCP
```bash
gcloud init
gcloud auth login
```

### 1.2 Start the GCP Instance
```bash
gcloud compute instances start coldsense-production-vm --zone=asia-south1-c
```

### 1.3 Wait for VM to boot (~1-2 minutes)

---

## Step 2: SSH into the GCP Instance

```bash
gcloud compute ssh coldsense-production-vm --zone=asia-south1-c
```

You'll now have a terminal session on the GCP instance.

---

## Step 3: Deploy Backend with Systemd

### 3.1 Clone the Deployment Script

On the GCP instance, clone the repository:
```bash
git clone https://github.com/Jainam-Mehta/CS_Phase_1.git CS_Project
cd CS_Project/backend
```

### 3.2 Prepare .env File

Copy your Supabase credentials to `.env`:
```bash
# Example .env (adjust with your actual credentials)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
MQTT_BROKER=your-mqtt-broker.com
MQTT_PORT=8883
```

### 3.3 Make Deployment Script Executable

```bash
chmod +x deploy-gcp.sh
```

### 3.4 Run Deployment Script

```bash
./deploy-gcp.sh
```

This script will:
1. Update system packages
2. Install Python 3, pip, venv, git
3. Clone/pull the latest repository code
4. Create Python virtual environment
5. Install backend dependencies
6. Test backend startup
7. Create systemd service file
8. Enable service for auto-start
9. Start the service

**Expected Output:**
```
============================================================================
ColdSense Backend - GCP Deployment with Systemd Auto-Start
============================================================================

[1/9] Updating system packages...
[2/9] Installing Python dependencies...
[3/9] Cloning/updating repository from GitHub...
Repository updated ✓
[4/9] Setting up Python virtual environment...
[5/9] Installing backend dependencies...
Dependencies installed ✓
[6/9] Configuring .env file...
.env file exists ✓
[7/9] Testing backend startup...
✓ Backend imports successful
[8/9] Creating systemd service file...
Systemd service file created ✓
[9/9] Enabling and starting systemd service...

============================================================================
✓ Deployment completed successfully!
============================================================================
```

---

## Step 4: Verify Deployment

### 4.1 Check Service Status
```bash
sudo systemctl status coldsense-backend
```

**Expected output:**
```
● coldsense-backend.service - ColdSense Backend - MQTT Sensor Data Service
     Loaded: loaded (/etc/systemd/system/coldsense-backend.service; enabled; ...)
     Active: active (running) since Wed 2026-08-26 14:23:45 UTC; 5s ago
   Main PID: 1234 (python)
```

### 4.2 View Backend Logs (Real-time)
```bash
sudo journalctl -u coldsense-backend -f
```

**Expected logs:**
```
Aug 26 14:23:45 instance coldsense-backend[1234]: INFO:     Started server process
Aug 26 14:23:45 instance coldsense-backend[1234]: INFO:     Waiting for application startup.
Aug 26 14:23:45 instance coldsense-backend[1234]: ✓ MQTT connected to mqtt.gcp.example.com:8883
Aug 26 14:23:45 instance coldsense-backend[1234]: ✓ Subscribed to wildcard topic: coldsense/#
```

### 4.3 Check Auto-Start is Enabled
```bash
sudo systemctl is-enabled coldsense-backend
```

**Expected output:** `enabled`

### 4.4 Test Backend API Endpoint

Get the instance's external IP:
```bash
gcloud compute instances describe coldsense-production-vm --zone=asia-south1-c --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
```

Visit in browser or curl:
```bash
curl http://<INSTANCE-IP>:8000/docs
```

You should see the FastAPI Swagger documentation.

---

## Step 5: Configure Firewall (if needed)

If the API is not accessible from outside GCP, configure firewall rules:

From your local machine:
```bash
gcloud compute firewall-rules create allow-coldsense-api \
  --allow=tcp:8000 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=coldsense
```

Then tag the instance:
```bash
gcloud compute instances add-tags coldsense-production-vm \
  --tags=coldsense \
  --zone=asia-south1-c
```

---

## Step 6: Test 24/7 Auto-Start

### 6.1 Reboot the Instance
```bash
sudo reboot
```

### 6.2 Reconnect After Reboot
```bash
gcloud compute ssh coldsense-production-vm --zone=asia-south1-c
```

### 6.3 Verify Service Restarted Automatically
```bash
sudo systemctl status coldsense-backend
```

The service should show `active (running)` with an uptime of only a few seconds (since the reboot).

---

## Monitoring & Maintenance

### View Service Logs

**Last 50 lines:**
```bash
sudo journalctl -u coldsense-backend --no-pager | tail -50
```

**Real-time logs with grep filter:**
```bash
sudo journalctl -u coldsense-backend -f | grep "Door\|Temperature"
```

**Logs from last 1 hour:**
```bash
sudo journalctl -u coldsense-backend --since "1 hour ago" --no-pager
```

### Service Management

**Restart service:**
```bash
sudo systemctl restart coldsense-backend
```

**Stop service:**
```bash
sudo systemctl stop coldsense-backend
```

**Start service:**
```bash
sudo systemctl start coldsense-backend
```

**View service configuration:**
```bash
sudo systemctl cat coldsense-backend
```

### Update Backend Code

To deploy a new version after pushing changes to GitHub:

```bash
cd ~/CS_Project
git pull origin main
cd backend

# Restart the service to load new code
sudo systemctl restart coldsense-backend

# Verify it restarted successfully
sudo systemctl status coldsense-backend
```

---

## Troubleshooting

### Service Won't Start

**Check logs:**
```bash
sudo journalctl -u coldsense-backend -n 50
```

**Common issues:**
1. **Missing .env file** → Create `.env` in `/home/jainammehta250/CS_Project/backend/`
2. **Python package missing** → Run `pip install -r requirements.txt` inside venv
3. **Port 8000 in use** → Check with `sudo lsof -i :8000`

### MQTT Connection Issues

**Check broker connectivity:**
```bash
# View last MQTT connection logs
sudo journalctl -u coldsense-backend -f | grep "MQTT\|connected"
```

**Verify credentials in .env:**
```bash
cat ~/CS_Project/backend/.env | grep MQTT
```

### Database Connection Issues

**Test Supabase connection:**
```bash
cd ~/CS_Project/backend
source venv/bin/activate
python -c "from app.database.supabase import supabase; print(supabase.table('sensor_devices').select('*', count='exact').limit(1).execute())"
```

### High CPU/Memory Usage

**Monitor resource usage:**
```bash
top -p $(pgrep -f "coldsense-backend")
```

**Restart if needed:**
```bash
sudo systemctl restart coldsense-backend
```

---

## Backup & Recovery

### Create Backup Script

Create `/home/jainammehta250/backup.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/home/jainammehta250/backups"
mkdir -p "$BACKUP_DIR"
cp ~/CS_Project/backend/.env "$BACKUP_DIR/.env.backup.$(date +%s)"
tar -czf "$BACKUP_DIR/cs-project-backup-$(date +%Y%m%d-%H%M%S).tar.gz" ~/CS_Project
echo "✓ Backup completed"
```

**Run backup:**
```bash
chmod +x ~/backup.sh
~/backup.sh
```

---

## Scheduled Restarts (Optional)

To restart backend daily at 2 AM UTC for cleanup:

```bash
sudo crontab -e
```

Add line:
```
0 2 * * * /bin/systemctl restart coldsense-backend
```

---

## Next Steps

1. ✅ Deploy backend to GCP ← **YOU ARE HERE**
2. Configure frontend to use GCP backend IP
3. Monitor logs for incoming sensor data
4. Set up automated backups
5. Configure DNS (optional)

---

## Support

For issues or questions:
- Check logs: `sudo journalctl -u coldsense-backend -f`
- Review this guide section on troubleshooting
- Verify .env credentials are correct
- Check GitHub repo for latest code

---

**Last Updated:** August 26, 2026
**Deployment Version:** 1.0
