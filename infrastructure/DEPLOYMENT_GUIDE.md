# ColdSense GCP Deployment Guide

## 📋 Overview

This guide walks you through deploying the ColdSense backend to Google Cloud Platform (GCP) using Google Kubernetes Engine (GKE).

## 🏗️ Infrastructure Summary

### **Current Setup:**
- **GCP Project**: `exalted-skein-505210-g0`
- **Region**: `asia-south1` (Mumbai)
- **GKE Cluster**: `coldsense-gke` (Autopilot mode)
- **Cluster Status**: ✅ Already Created
- **Cluster Endpoint**: `35.200.241.207`

### **What Will Be Deployed:**
1. **Namespace**: `coldsense` - Isolated environment for all resources
2. **MQTT Broker**: Mosquitto for sensor data communication
3. **Backend API**: FastAPI application connected to Supabase
4. **Secrets**: Environment variables and credentials
5. **Load Balancer**: External IP to access the API

---

## 🚀 Quick Start (Automated Deployment)

### Prerequisites:
1. **Google Cloud SDK** installed (`gcloud`)
2. **kubectl** installed
3. **Docker** installed
4. **GCP Authentication** configured

### One-Command Deployment:

```bash
cd infrastructure
chmod +x deploy.sh
./deploy.sh
```

This script will:
- ✅ Verify prerequisites
- ✅ Configure GCP project
- ✅ Get cluster credentials
- ✅ Create Artifact Registry
- ✅ Build & push Docker images
- ✅ Deploy all Kubernetes resources
- ✅ Provide access URLs

---

## 📝 Manual Step-by-Step Deployment

### Step 1: Install Prerequisites

#### Install Google Cloud SDK:
```bash
# Windows (via PowerShell)
(New-Object Net.WebClient).DownloadFile("https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe", "$env:Temp\GoogleCloudSDKInstaller.exe")
& $env:Temp\GoogleCloudSDKInstaller.exe
```

#### Install kubectl:
```bash
gcloud components install kubectl
```

#### Verify installations:
```bash
gcloud --version
kubectl version --client
docker --version
```

### Step 2: Authenticate with GCP

```bash
# Login to Google Cloud
gcloud auth login

# Set the project
gcloud config set project exalted-skein-505210-g0

# Set the region
gcloud config set compute/region asia-south1
```

### Step 3: Get GKE Credentials

```bash
gcloud container clusters get-credentials coldsense-gke --region asia-south1
```

Verify connection:
```bash
kubectl cluster-info
kubectl get nodes
```

### Step 4: Create Artifact Registry

```bash
gcloud artifacts repositories create coldsense \
    --repository-format=docker \
    --location=asia-south1 \
    --description="ColdSense Docker images"
```

Configure Docker authentication:
```bash
gcloud auth configure-docker asia-south1-docker.pkg.dev
```

### Step 5: Build and Push Backend Image

```bash
cd backend

# Build the Docker image
docker build -t asia-south1-docker.pkg.dev/exalted-skein-505210-g0/coldsense/backend:latest .

# Push to Artifact Registry
docker push asia-south1-docker.pkg.dev/exalted-skein-505210-g0/coldsense/backend:latest

cd ..
```

### Step 6: Deploy to Kubernetes

```bash
cd infrastructure/kubernetes

# Create namespace
kubectl apply -f namespace.yaml

# Apply secrets (IMPORTANT: Contains sensitive data)
kubectl apply -f backend-secrets.yaml

# Deploy MQTT broker
kubectl apply -f mosquitto-deployment.yaml

# Wait for Mosquitto to be ready
kubectl wait --for=condition=available --timeout=300s deployment/mosquitto -n coldsense

# Deploy backend
kubectl apply -f backend-deployment.yaml

# Wait for backend to be ready
kubectl wait --for=condition=available --timeout=300s deployment/coldsense-backend -n coldsense
```

### Step 7: Get External IP

```bash
# Watch until EXTERNAL-IP appears (may take 2-3 minutes)
kubectl get service coldsense-backend -n coldsense -w
```

Once you see an IP like `34.xx.xx.xx`, press `Ctrl+C` and access your API at:
```
http://<EXTERNAL-IP>/docs
```

---

## 🔍 Verification & Testing

### Check Deployment Status:
```bash
# View all resources
kubectl get all -n coldsense

# View pods
kubectl get pods -n coldsense

# View services
kubectl get services -n coldsense
```

### View Logs:
```bash
# Backend logs
kubectl logs -f deployment/coldsense-backend -n coldsense

# Mosquitto logs
kubectl logs -f deployment/mosquitto -n coldsense
```

### Test API Health:
```bash
# Get the external IP
EXTERNAL_IP=$(kubectl get service coldsense-backend -n coldsense -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Test health endpoint
curl http://$EXTERNAL_IP/health

# Expected response: {"status": "ok"}
```

### Access API Documentation:
Open in browser:
```
http://<EXTERNAL-IP>/docs
```

---

## 📊 Monitoring

### View Resource Usage:
```bash
kubectl top pods -n coldsense
kubectl top nodes
```

### View Events:
```bash
kubectl get events -n coldsense --sort-by='.lastTimestamp'
```

### Describe Resources:
```bash
kubectl describe deployment coldsense-backend -n coldsense
kubectl describe pod <pod-name> -n coldsense
```

---

## 🔄 Updates & Rollbacks

### Update Backend Image:
```bash
# Build new image
cd backend
docker build -t asia-south1-docker.pkg.dev/exalted-skein-505210-g0/coldsense/backend:latest .
docker push asia-south1-docker.pkg.dev/exalted-skein-505210-g0/coldsense/backend:latest

# Restart deployment to pull new image
kubectl rollout restart deployment/coldsense-backend -n coldsense

# Watch rollout status
kubectl rollout status deployment/coldsense-backend -n coldsense
```

### Rollback to Previous Version:
```bash
kubectl rollout undo deployment/coldsense-backend -n coldsense
```

### Scale Replicas:
```bash
# Scale up to 4 replicas
kubectl scale deployment coldsense-backend --replicas=4 -n coldsense

# Scale down to 1 replica
kubectl scale deployment coldsense-backend --replicas=1 -n coldsense
```

---

## 🧹 Cleanup

### Delete Deployment (Keep Cluster):
```bash
kubectl delete namespace coldsense
```

### Delete Everything Including Cluster:
```bash
cd infrastructure/terraform
terraform destroy
```

---

## 🐛 Troubleshooting

### Pod Not Starting:
```bash
# Check pod status
kubectl get pods -n coldsense

# View detailed pod information
kubectl describe pod <pod-name> -n coldsense

# View logs
kubectl logs <pod-name> -n coldsense
```

### Image Pull Errors:
```bash
# Verify Docker authentication
gcloud auth configure-docker asia-south1-docker.pkg.dev

# Check if image exists
gcloud artifacts docker images list asia-south1-docker.pkg.dev/exalted-skein-505210-g0/coldsense
```

### Service Not Getting External IP:
```bash
# Check service status
kubectl describe service coldsense-backend -n coldsense

# Check load balancer events
kubectl get events -n coldsense | grep LoadBalancer
```

### Connection Refused:
```bash
# Check if pods are running
kubectl get pods -n coldsense

# Check service endpoints
kubectl get endpoints coldsense-backend -n coldsense

# Test from within the cluster
kubectl run test-pod --rm -it --image=curlimages/curl --restart=Never -- curl http://coldsense-backend.coldsense.svc.cluster.local/health
```

---

## 📞 Support

### View Cluster Info:
```bash
gcloud container clusters describe coldsense-gke --region asia-south1
```

### GKE Dashboard:
```
https://console.cloud.google.com/kubernetes/workload?project=exalted-skein-505210-g0
```

### Kubernetes Dashboard:
```bash
kubectl proxy
# Then open: http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/
```

---

## 🎯 Next Steps

After successful deployment:

1. **Update Frontend**: Point frontend to the new backend URL
2. **Deploy Simulators**: Generate test sensor data
3. **Configure DNS**: Set up a custom domain (optional)
4. **Enable HTTPS**: Add SSL certificate (recommended for production)
5. **Set up Monitoring**: Configure Cloud Monitoring and Logging
6. **Backup Strategy**: Schedule regular database backups

---

## 📈 Cost Optimization

### Current Setup Cost Estimate:
- **GKE Autopilot**: ~$70-100/month
- **Load Balancer**: ~$18/month
- **Artifact Registry**: ~$0.10/GB/month
- **Network Egress**: Variable

### To Reduce Costs:
- Use smaller machine types
- Enable cluster autoscaler
- Set up resource quotas
- Schedule non-critical workloads
- Use preemptible nodes for testing

---

## ✅ Deployment Checklist

- [ ] Prerequisites installed (gcloud, kubectl, docker)
- [ ] GCP authentication configured
- [ ] Cluster credentials obtained
- [ ] Artifact Registry created
- [ ] Backend image built and pushed
- [ ] Kubernetes namespace created
- [ ] Secrets applied
- [ ] Mosquitto deployed and running
- [ ] Backend deployed and running
- [ ] External IP obtained
- [ ] API health endpoint accessible
- [ ] API documentation accessible
- [ ] Logs showing normal operation

