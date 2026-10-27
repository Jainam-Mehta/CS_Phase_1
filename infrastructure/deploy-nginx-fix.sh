#!/bin/bash
# Deploy Nginx configuration fix to GCP VM
# Run this script from the infrastructure directory on the VM

set -e

echo "🔄 Deploying Nginx configuration fix..."

# Navigate to infrastructure directory
cd /home/jainam/SYSTEMII/infrastructure

# Show current status
echo "📊 Current container status:"
docker ps --format "table {{.Names}}\t{{.Status}}"

# Pull latest config from git (optional - if you've already pushed)
# echo "📝 Pulling latest configuration from git..."
# git pull origin main

# Recreate Nginx container with updated config
echo "🔧 Restarting Nginx with updated configuration..."
docker-compose -f docker-compose-prod.yml down nginx

# Small delay to ensure clean shutdown
sleep 2

# Restart Nginx
docker-compose -f docker-compose-prod.yml up -d nginx

# Wait for Nginx to be healthy
echo "⏳ Waiting for Nginx to become healthy..."
sleep 5

# Check Nginx status
echo "✅ Nginx container status:"
docker ps --filter "name=coldsense-nginx" --format "table {{.Names}}\t{{.Status}}"

# Test health endpoint
echo "🧪 Testing health endpoint..."
if curl -s http://localhost/health | grep -q "OK"; then
    echo "✅ Health check passed!"
else
    echo "⚠️  Health check response:"
    curl -s http://localhost/health
fi

# Check Nginx logs
echo ""
echo "📋 Recent Nginx logs:"
docker logs --tail 20 coldsense-nginx

echo ""
echo "✨ Deployment complete!"
echo "Access the application:"
echo "  - Direct IP: http://35.200.159.76"
echo "  - Domain (if DNS propagated): https://1accord.xyz"
