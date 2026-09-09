# 🚀 ColdSense Terraform + Kubernetes Deployment Guide

## ✅ CURRENT STATUS

Your infrastructure is **ALREADY SET UP**:

- ✅ **GKE Cluster:** coldsense-gke (RUNNING)
- ✅ **Region:** asia-south1
- ✅ **Endpoint:** 35.200.241.207
- ✅ **Autopilot:** Enabled (fully managed)
- ✅ **Terraform:** Initialized and applied
- ✅ **Kubernetes YAMLs:** Ready to deploy

---

## 🎯 WHAT WE'LL DO

**NO CLOUD SQL** - We'll use self-managed PostgreSQL in Kubernetes (saves money!)

**Architecture:**
```
GKE Cluster (coldsense-gke)
├── PostgreSQL Pod (self-managed database)
├── Backend API Pods (2 replicas)
├── MQTT Subscriber Pod
└── Simulator Pod
```

**Cost:** ~$70-100/month (no Cloud SQL fees!)

---

## 📋 STEP-BY-STEP DEPLOYMENT

### STEP 1: Connect to existing GKE cluster (1 minute)

```powershell
# Get cluster credentials
gcloud container clusters get-credentials coldsense-gke --region=asia-south1 --project=exalted-skein-505210-g0

# Verify connection
kubectl cluster-info
kubectl get nodes
```

---

### STEP 2: Create namespace (30 seconds)

```powershell
kubectl create namespace coldsense
```

---

### STEP 3: Create PostgreSQL deployment (self-managed, NO Cloud SQL)

```powershell
cd "C:\Users\Jainam Mehta\OneDrive\Desktop\CS_Project\infrastructure\kubernetes"

# Apply PostgreSQL deployment
kubectl apply -f postgres-deployment.yaml
```

---

### STEP 4: Create secrets (2 minutes)

```powershell
# Database secret (self-managed PostgreSQL)
kubectl create secret generic db-credentials --namespace=coldsense --from-literal=database-url="postgresql://coldsense_user:coldsense_secure_pass@postgres-service:5432/coldsense"

# Supabase Auth secret (REPLACE WITH YOUR REAL VALUES!)
kubectl create secret generic supabase-credentials --namespace=coldsense --from-literal=supabase-url="https://mmxfqodybvdlhpjbcdnq.supabase.co" --from-literal=supabase-key="YOUR_SUPABASE_ANON_KEY" --from-literal=supabase-service-key="YOUR_SUPABASE_SERVICE_KEY"

# MQTT secret
kubectl create secret generic mqtt-credentials --namespace=coldsense --from-literal=mqtt-broker="broker.emqx.io" --from-literal=mqtt-port="1883"
```

---

### STEP 5: Build and push Docker images (10 minutes)

```powershell
# Set variables
$PROJECT_ID = "exalted-skein-505210-g0"
$REGION = "asia-south1"

# Configure Docker auth
gcloud auth configure-docker ${REGION}-docker.pkg.dev

# Build backend image
cd "C:\Users\Jainam Mehta\OneDrive\Desktop\CS_Project\backend"
docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/coldsense-repo/backend:v1.0 .
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/coldsense-repo/backend:v1.0

# Build simulator image
docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/coldsense-repo/simulator:v1.0 -f simulators/Dockerfile simulators/
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/coldsense-repo/simulator:v1.0
```

---

### STEP 6: Deploy all services (5 minutes)

```powershell
cd "C:\Users\Jainam Mehta\OneDrive\Desktop\CS_Project\infrastructure\kubernetes"

# Deploy backend
kubectl apply -f backend-deployment.yaml
kubectl apply -f backend-service.yaml

# Deploy MQTT subscriber
kubectl apply -f mqtt-subscriber.yaml

# Deploy simulator
kubectl apply -f simulator-deployment.yaml

# Check status
kubectl get pods --namespace=coldsense
kubectl get svc --namespace=coldsense
```

---

### STEP 7: Get LoadBalancer IP (3 minutes)

```powershell
# Wait for external IP
kubectl get svc backend-service --namespace=coldsense --watch

# When EXTERNAL-IP appears (not <pending>), press Ctrl+C
# Your backend will be at: http://EXTERNAL-IP:8000
```

---

### STEP 8: Test deployment (2 minutes)

```powershell
# Replace with your actual LoadBalancer IP
$EXTERNAL_IP = "GET_THIS_FROM_STEP_7"

# Test health endpoint
curl http://${EXTERNAL_IP}:8000/health

# Test products endpoint
curl http://${EXTERNAL_IP}:8000/api/products
```

---

## 🛑 STOP CLUSTER AFTER 8 HOURS (Save costs!)

```powershell
# To stop cluster after 8 hours (saves money)
# NOTE: This will DELETE the cluster! Data in PostgreSQL will be lost!
# Use this only for testing/demo

cd "C:\Users\Jainam Mehta\OneDrive\Desktop\CS_Project\infrastructure\terraform"
terraform destroy

# Or manually delete cluster:
gcloud container clusters delete coldsense-gke --region=asia-south1 --project=exalted-skein-505210-g0
```

---

## 🔄 RESTART CLUSTER NEXT TIME

```powershell
cd "C:\Users\Jainam Mehta\OneDrive\Desktop\CS_Project\infrastructure\terraform"
terraform apply

# Then re-deploy all services (Steps 2-6 above)
```

---

## 📊 COST BREAKDOWN

| Component | Monthly Cost | Daily Cost (8 hrs) |
|-----------|--------------|---------------------|
| GKE Autopilot (3 pods) | ~$70 | ~$1.85 |
| Self-managed PostgreSQL | $0 (included) | $0 |
| LoadBalancer | ~$18 | ~$0.48 |
| Network | ~$5 | ~$0.13 |
| **Total** | **~$93/month** | **~$2.46/day** |

**No Cloud SQL = Saves $228/month!** 🎉

---

## 🆘 TROUBLESHOOTING

### Pods not starting
```powershell
kubectl describe pod POD_NAME --namespace=coldsense
kubectl logs POD_NAME --namespace=coldsense
```

### Can't connect to cluster
```powershell
gcloud container clusters get-credentials coldsense-gke --region=asia-south1
```

### Image pull errors
```powershell
# Verify Artifact Registry exists
gcloud artifacts repositories list --location=asia-south1

# Create if missing
gcloud artifacts repositories create coldsense-repo --repository-format=docker --location=asia-south1
```

---

## ✅ SUCCESS CHECKLIST

- [ ] Connected to GKE cluster
- [ ] Created namespace `coldsense`
- [ ] Deployed PostgreSQL (self-managed)
- [ ] Created all secrets
- [ ] Built and pushed Docker images
- [ ] Deployed backend, MQTT, simulator
- [ ] Got LoadBalancer external IP
- [ ] Tested API endpoints
- [ ] Backend responding at http://EXTERNAL-IP:8000

---

## 🎯 NEXT STEPS

1. Update frontend with new backend URL (LoadBalancer IP)
2. Test farmer/owner/distributor signup/login
3. Monitor pods: `kubectl get pods -n coldsense --watch`
4. Check logs: `kubectl logs -f deployment/coldsense-backend -n coldsense`
5. Show to senior! 🚀

---

**Total Deployment Time:** ~25 minutes  
**Cost:** ~$2.46 for 8 hours  
**Architecture:** Production-ready Kubernetes with self-managed PostgreSQL  

🎉 **Ready to deploy!**
