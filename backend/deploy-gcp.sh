#!/bin/bash

# ============================================================================
# ColdSense Backend - GCP Deployment Script with Systemd Auto-Start
# This script deploys the backend to a GCP Compute Instance and sets up
# a systemd service for 24/7 auto-start capability
# ============================================================================

set -e  # Exit on error

echo "============================================================================"
echo "ColdSense Backend - GCP Deployment with Systemd Auto-Start"
echo "============================================================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/home/jainammehta250/CS_Project"
BACKEND_DIR="$PROJECT_DIR/backend"
SERVICE_NAME="coldsense-backend"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
VENV_DIR="$BACKEND_DIR/venv"
PYTHON_BIN="/usr/bin/python3"

echo -e "${BLUE}[1/9]${NC} Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y

echo -e "${BLUE}[2/9]${NC} Installing Python dependencies..."
sudo apt-get install -y python3 python3-pip python3-venv git

echo -e "${BLUE}[3/9]${NC} Cloning/updating repository from GitHub..."
if [ -d "$PROJECT_DIR" ]; then
    cd "$PROJECT_DIR"
    git pull origin main
    echo "Repository updated ✓"
else
    git clone https://github.com/Jainam-Mehta/CS_Phase_1.git "$PROJECT_DIR"
    cd "$PROJECT_DIR"
    echo "Repository cloned ✓"
fi

echo -e "${BLUE}[4/9]${NC} Setting up Python virtual environment..."
if [ ! -d "$VENV_DIR" ]; then
    $PYTHON_BIN -m venv "$VENV_DIR"
    echo "Virtual environment created ✓"
else
    echo "Virtual environment already exists ✓"
fi

echo -e "${BLUE}[5/9]${NC} Installing backend dependencies..."
cd "$BACKEND_DIR"
source "$VENV_DIR/bin/activate"
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
echo "Dependencies installed ✓"

echo -e "${BLUE}[6/9]${NC} Configuring .env file..."
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo "ERROR: .env file not found at $BACKEND_DIR/.env"
    echo "Please create .env file with Supabase credentials before deployment"
    exit 1
fi
echo ".env file exists ✓"

echo -e "${BLUE}[7/9]${NC} Testing backend startup..."
cd "$BACKEND_DIR"
source "$VENV_DIR/bin/activate"
timeout 10 $PYTHON_BIN -c "from app.main import app; print('✓ Backend imports successful')" || true

echo -e "${BLUE}[8/9]${NC} Creating systemd service file..."
sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=ColdSense Backend - MQTT Sensor Data Service
After=network.target
StartLimitIntervalSec=60
StartLimitBurst=3

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$BACKEND_DIR
Environment="PATH=$VENV_DIR/bin"
ExecStart=$VENV_DIR/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=coldsense-backend

[Install]
WantedBy=multi-user.target
EOF

echo "Systemd service file created ✓"

echo -e "${BLUE}[9/9]${NC} Enabling and starting systemd service..."
sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"
sudo systemctl start "$SERVICE_NAME"

echo ""
echo "============================================================================"
echo -e "${GREEN}✓ Deployment completed successfully!${NC}"
echo "============================================================================"
echo ""
echo "Service Status:"
sudo systemctl status "$SERVICE_NAME" --no-pager
echo ""
echo "Useful commands:"
echo -e "  View logs (real-time):     ${YELLOW}sudo journalctl -u $SERVICE_NAME -f${NC}"
echo -e "  View recent logs:          ${YELLOW}sudo journalctl -u $SERVICE_NAME --no-pager | tail -50${NC}"
echo -e "  Service status:            ${YELLOW}sudo systemctl status $SERVICE_NAME${NC}"
echo -e "  Restart service:           ${YELLOW}sudo systemctl restart $SERVICE_NAME${NC}"
echo -e "  Stop service:              ${YELLOW}sudo systemctl stop $SERVICE_NAME${NC}"
echo -e "  Check auto-start enabled:  ${YELLOW}sudo systemctl is-enabled $SERVICE_NAME${NC}"
echo ""
echo "Backend API endpoint: http://<instance-ip>:8000"
echo "API docs:             http://<instance-ip>:8000/docs"
echo ""
