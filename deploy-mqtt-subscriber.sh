#!/bin/bash

# Deploy MQTT Subscriber Service to GCP VM

echo "=================================="
echo "Deploying MQTT Subscriber Service"
echo "=================================="

VM_NAME="coldsense-production-vm"
ZONE="asia-south1-c"
BACKEND_DIR="/home/jainammehta250/CS_Project/backend"

echo ""
echo "[1/4] Copying subscriber files to VM..."
gcloud compute scp --zone=$ZONE \
  ./backend/app/mqtt/simple_subscriber.py \
  ./backend/mqtt_subscriber_service.py \
  ./coldsense-mqtt-subscriber.service \
  $VM_NAME:$BACKEND_DIR/ --quiet

echo "✓ Files copied"

echo ""
echo "[2/4] Installing systemd service..."
gcloud compute ssh $VM_NAME --zone=$ZONE << 'EOF'
sudo cp /home/jainammehta250/CS_Project/backend/coldsense-mqtt-subscriber.service /etc/systemd/system/
sudo systemctl daemon-reload
echo "✓ Service installed"
EOF

echo ""
echo "[3/4] Starting MQTT subscriber service..."
gcloud compute ssh $VM_NAME --zone=$ZONE --command="sudo systemctl enable coldsense-mqtt-subscriber && sudo systemctl start coldsense-mqtt-subscriber && sleep 2"

echo "✓ Service started"

echo ""
echo "[4/4] Verifying service is running..."
gcloud compute ssh $VM_NAME --zone=$ZONE --command="sudo systemctl status coldsense-mqtt-subscriber --no-pager || true"

echo ""
echo "=================================="
echo "Deployment Complete!"
echo "=================================="
echo ""
echo "Monitor logs with:"
echo "  gcloud compute ssh $VM_NAME --zone=$ZONE --command='sudo journalctl -u coldsense-mqtt-subscriber -f'"
echo ""
echo "Check service status:"
echo "  gcloud compute ssh $VM_NAME --zone=$ZONE --command='sudo systemctl status coldsense-mqtt-subscriber'"
echo ""
