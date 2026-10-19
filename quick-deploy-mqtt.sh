#!/bin/bash

# Quick deploy MQTT subscriber to GCP

VM_NAME="coldsense-production-vm"
ZONE="asia-south1-c"

echo "Deploying MQTT Subscriber to GCP..."

# 1. Pull latest code
echo ""
echo "[1/5] Pulling latest code from GitHub..."
gcloud compute ssh $VM_NAME --zone=$ZONE --command="cd /home/jainammehta250/CS_Project && git pull"

# 2. Install service file
echo ""
echo "[2/5] Installing systemd service..."
gcloud compute ssh $VM_NAME --zone=$ZONE --command="sudo cp /home/jainammehta250/CS_Project/coldsense-mqtt-subscriber.service /etc/systemd/system/"

# 3. Reload systemd
echo ""
echo "[3/5] Reloading systemd daemon..."
gcloud compute ssh $VM_NAME --zone=$ZONE --command="sudo systemctl daemon-reload"

# 4. Enable and start service
echo ""
echo "[4/5] Starting MQTT subscriber service..."
gcloud compute ssh $VM_NAME --zone=$ZONE --command="sudo systemctl enable coldsense-mqtt-subscriber && sudo systemctl start coldsense-mqtt-subscriber"

# 5. Check status
echo ""
echo "[5/5] Checking status..."
gcloud compute ssh $VM_NAME --zone=$ZONE --command="sleep 2 && sudo systemctl status coldsense-mqtt-subscriber --no-pager"

echo ""
echo "✓ Deployment complete!"
echo ""
echo "Monitor logs:"
echo "  gcloud compute ssh $VM_NAME --zone=$ZONE --command='sudo journalctl -u coldsense-mqtt-subscriber -f'"
