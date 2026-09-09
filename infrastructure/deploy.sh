#!/bin/bash

# ColdSense GCP Deployment Script
# This script deploys the ColdSense backend to GKE

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}ColdSense GCP Deployment Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Configuration
PROJECT_ID="exalted-skein-505210-g0"
REGION="asia-south1"
CLUSTER_NAME="coldsense-gke"
REPOSITORY="coldsense"

# Step 1: Check prerequisites
echo -e "${YELLOW}Step 1: Checking prerequisites...${NC}"
command -v gcloud >/dev/null 2>&1 || { echo -e "${RED}gcloud CLI not found. Please install it first.${NC}"; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo -e "${RED}kubectl not found. Please install it first.${NC}"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo -e "${RED}Docker not found. Please install it first.${NC}"; exit 1; }
echo -e "${GREEN}✓ All prerequisites found${NC}"
echo ""

# Step 2: Set GCP project
echo -e "${YELLOW}Step 2: Setting GCP project...${NC}"
gcloud config set project $PROJECT_ID
echo -e "${GREEN}✓ Project set to $PROJECT_ID${NC}"
echo ""

# Step 3: Get GKE credentials
echo -e "${YELLOW}Step 3: Getting GKE cluster credentials...${NC}"
gcloud container clusters get-credentials $CLUSTER_NAME --region $REGION
echo -e "${GREEN}✓ Cluster credentials configured${NC}"
echo ""

# Step 4: Create Artifact Registry repository (if not exists)
echo -e "${YELLOW}Step 4: Checking Artifact Registry...${NC}"
if gcloud artifacts repositories describe $REPOSITORY --location=$REGION >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Artifact Registry repository already exists${NC}"
else
    echo "Creating Artifact Registry repository..."
    gcloud artifacts repositories create $REPOSITORY \
        --repository-format=docker \
        --location=$REGION \
        --description="ColdSense Docker images"
    echo -e "${GREEN}✓ Artifact Registry repository created${NC}"
fi
echo ""

# Step 5: Configure Docker authentication
echo -e "${YELLOW}Step 5: Configuring Docker authentication...${NC}"
gcloud auth configure-docker ${REGION}-docker.pkg.dev
echo -e "${GREEN}✓ Docker authentication configured${NC}"
echo ""

# Step 6: Build and push backend image
echo -e "${YELLOW}Step 6: Building and pushing backend Docker image...${NC}"
cd ../backend
docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:latest .
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:latest
echo -e "${GREEN}✓ Backend image built and pushed${NC}"
cd ../infrastructure
echo ""

# Step 7: Create Kubernetes namespace
echo -e "${YELLOW}Step 7: Creating Kubernetes namespace...${NC}"
kubectl apply -f kubernetes/namespace.yaml
echo -e "${GREEN}✓ Namespace created${NC}"
echo ""

# Step 8: Apply secrets
echo -e "${YELLOW}Step 8: Applying Kubernetes secrets...${NC}"
kubectl apply -f kubernetes/backend-secrets.yaml
echo -e "${GREEN}✓ Secrets applied${NC}"
echo ""

# Step 9: Deploy Mosquitto MQTT broker
echo -e "${YELLOW}Step 9: Deploying Mosquitto MQTT broker...${NC}"
kubectl apply -f kubernetes/mosquitto-deployment.yaml
echo -e "${GREEN}✓ Mosquitto deployed${NC}"
echo ""

# Step 10: Wait for Mosquitto to be ready
echo -e "${YELLOW}Step 10: Waiting for Mosquitto to be ready...${NC}"
kubectl wait --for=condition=available --timeout=300s deployment/mosquitto -n coldsense
echo -e "${GREEN}✓ Mosquitto is ready${NC}"
echo ""

# Step 11: Deploy backend
echo -e "${YELLOW}Step 11: Deploying backend...${NC}"
kubectl apply -f kubernetes/backend-deployment.yaml
echo -e "${GREEN}✓ Backend deployed${NC}"
echo ""

# Step 12: Wait for backend to be ready
echo -e "${YELLOW}Step 12: Waiting for backend to be ready...${NC}"
kubectl wait --for=condition=available --timeout=300s deployment/coldsense-backend -n coldsense
echo -e "${GREEN}✓ Backend is ready${NC}"
echo ""

# Step 13: Get service information
echo -e "${YELLOW}Step 13: Getting service information...${NC}"
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Backend Service:"
kubectl get service coldsense-backend -n coldsense
echo ""
echo "Getting external IP (this may take a few minutes)..."
echo "Run this command to check the external IP:"
echo -e "${YELLOW}kubectl get service coldsense-backend -n coldsense -w${NC}"
echo ""
echo "Once you have the external IP, you can access the API at:"
echo -e "${GREEN}http://<EXTERNAL-IP>/docs${NC}"
echo ""
echo "To check deployment status:"
echo -e "${YELLOW}kubectl get pods -n coldsense${NC}"
echo ""
echo "To view logs:"
echo -e "${YELLOW}kubectl logs -f deployment/coldsense-backend -n coldsense${NC}"
echo ""
