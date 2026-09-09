#!/bin/bash
# ColdSense VM Setup Script
# Run this on the VM to install Docker and deploy the application

set -e  # Exit on error

echo "======================================"
echo "  ColdSense VM Setup - Starting"
echo "======================================"

# Update system
echo "📦 Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
sudo apt-get install -y ca-certificates curl gnupg lsb-release
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add user to docker group
echo "👤 Adding user to docker group..."
sudo usermod -aG docker $USER

# Enable Docker
echo "✅ Enabling Docker service..."
sudo systemctl enable docker
sudo systemctl start docker

# Install Docker Compose standalone
echo "📦 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create project directory
echo "📁 Creating project directory..."
mkdir -p ~/coldsense
cd ~/coldsense

echo ""
echo "======================================"
echo "  ✅ Setup Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Copy docker-compose.yml to ~/coldsense/"
echo "2. Copy .env file with Supabase credentials"
echo "3. Run: docker-compose up -d"
echo ""
echo "Note: You may need to logout and login again for docker group to take effect"
echo "Or run: newgrp docker"
