#!/bin/bash

# ColdSense Deployment Script to GCP
# This script deploys the latest code to the GCP production VM

set -e

echo "🚀 Starting ColdSense deployment to GCP..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

VM_NAME="coldsense-production-vm"
ZONE="asia-south1-c"
PROJECT_PATH="/home/jainammehta250/CS_Project"

echo "1️⃣  Starting GCP VM..."
gcloud compute instances start $VM_NAME --zone=$ZONE
echo "   ✅ VM starting (waiting 30 seconds for full boot)..."
sleep 30

echo ""
echo "2️⃣  Pulling latest code from GitHub..."
gcloud compute ssh $VM_NAME --zone=$ZONE --command="cd $PROJECT_PATH && git pull"
echo "   ✅ Code pulled"

echo ""
echo "3️⃣  Stopping old Docker services..."
gcloud compute ssh $VM_NAME --zone=$ZONE --command="cd $PROJECT_PATH/infrastructure && docker compose down"
echo "   ✅ Services stopped"

echo ""
echo "4️⃣  Pulling latest Docker images..."
gcloud compute ssh $VM_NAME --zone=$ZONE --command="cd $PROJECT_PATH/infrastructure && docker compose pull"
echo "   ✅ Images pulled"

echo ""
echo "5️⃣  Starting services with fresh containers..."
gcloud compute ssh $VM_NAME --zone=$ZONE --command="cd $PROJECT_PATH/infrastructure && docker compose up -d --force-recreate"
echo "   ✅ Services started"

echo ""
echo "6️⃣  Waiting for services to be ready..."
sleep 10

echo ""
echo "7️⃣  Checking backend health..."
gcloud compute ssh $VM_NAME --zone=$ZONE --command="docker logs coldsense-backend --tail=30"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOYMENT COMPLETE!"
echo ""
echo "📊 Next steps:"
echo "   1. Check backend logs: docker logs coldsense-backend -f"
echo "   2. Test averaging endpoint:"
echo "      curl https://8.231.107.201/api/storage/averages/room/YOUR_ROOM_ID"
echo "   3. Check frontend app: https://8.231.107.201"
echo ""
echo "🔍 To view live logs:"
echo "   gcloud compute ssh $VM_NAME --zone=$ZONE --command='docker logs -f coldsense-backend'"
echo ""
