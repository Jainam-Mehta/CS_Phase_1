# 🏗️ ColdSense GCP Infrastructure - Complete Analysis

## 📊 Current Infrastructure State

### **GCP Project Details:**
- **Project ID**: `exalted-skein-505210-g0`
- **Region**: `asia-south1` (Mumbai, India)
- **Project Type**: Standard GCP Project

### **GKE Cluster (Already Created):**
- **Cluster Name**: `coldsense-gke`
- **Type**: GKE Autopilot (Fully Managed)
- **Status**: ✅ **ACTIVE**
- **Master Version**: `1.35.6-gke.1641000`
- **Endpoint**: `35.200.241.207`
- **Cluster DNS**: `gke-d0ccfba5e5cc473b808cf0a4ae0507feafcc-622812534519.asia-south1.gke.goog`

### **Network Configuration:**
- **Network**: VPC Native
- **Cluster CIDR**: `10.83.128.0/17`
- **Services CIDR**: `34.118.224.0/20`
- **Pod Range**: `gke-coldsense-gke-pods-d0ccfba5`
- **Networking Mode**: Advanced Datapath (high performance)

### **Node Pools:**
1. **default-pool**:
   - Machine Type: `ek-standard-8`
   - Disk: 100 GB SSD (pd-balanced)
   - Locations: asia-south1-a, asia-south1-b, asia-south1-c
   - Autoscaling: 0-1000 nodes
   - Image: COS (Container-Optimized OS)

2. **pool-1**:
   - Machine Type: `ek-standard-8`
   - Disk: 100 GB SSD (pd-balanced)
   - Autoscaling: 0-1000 nodes
   - Image: COS

### **Security & Access:**
- **Shielded Nodes**: ✅ Enabled
- **Secure Boot**: ✅ Enabled
- **Workload Identity**: ✅ Enabled
- **Binary Authorization**: ❌ Disabled
- **Anonymous Authentication**: Limited Mode

### **Monitoring & Logging:**
- **Cloud Logging**: ✅ Enabled (System + Workloads)
- **Cloud Monitoring**: ✅ Enabled
- **Managed Prometheus**: ✅ Enabled
- **Log Types**: ALL

### **Add-ons Enabled:**
- ✅ DNS Cache
- ✅ GCE Persistent Disk CSI Driver
- ✅ GCP Filestore CSI Driver
- ✅ GCS Fuse CSI Driver
- ✅ Stateful HA

---

## 📁 Terraform Configuration Analysis

### **providers.tf**
```hcl
terraform {
  required_version = ">= 1.15.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
  }
}
```
- **Terraform Version**: 1.15.0+
- **Provider**: Google Cloud Platform v7.x
- **Region**: asia-south1

### **main.tf**
Creates:
1. **google_project_service.container** - Enables GKE API
2. **google_project_service.artifact_registry** - Enables Artifact Registry API
3. **google_container_cluster.coldsense** - GKE Autopilot cluster

Key features:
- Autopilot mode (fully managed, no node management needed)
- VPC-native networking
- Deletion protection: OFF (can be destroyed easily)

### **variables.tf**
- `project_id`: exalted-skein-505210-g0
- `region`: asia-south1
- `cluster_name`: coldsense-gke

---

## 🎯 Deployment Architecture

```
┌─────────────────────────────────────────────────────┐
│                  GCP Project                        │
│          exalted-skein-505210-g0                    │
└─────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│            GKE Cluster (coldsense-gke)              │
│                  asia-south1                        │
└─────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│            Namespace: coldsense                     │
└─────────────────────────────────────────────────────┘
         │                    │                │
         ▼                    ▼                ▼
┌─────────────┐    ┌──────────────┐    ┌──────────────┐
│  Mosquitto  │    │   Backend    │    │  Simulator   │
│   (MQTT)    │◄───│   (FastAPI)  │◄───│  (Python)    │
└─────────────┘    └──────────────┘    └──────────────┘
         │                    │
         │                    │
         ▼                    ▼
┌─────────────┐    ┌──────────────┐
│   Service   │    │Load Balancer │
│ (ClusterIP) │    │  (External)  │
└─────────────┘    └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Public IP   │
                    │ 34.xx.xx.xx  │
                    └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Frontend   │
                    │ (React/Vite) │
                    └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Supabase   │
                    │  (Database)  │
                    └──────────────┘
```

---

## 📦 What Will Be Deployed

### **1. Kubernetes Namespace**
- **Name**: `coldsense`
- **Purpose**: Isolate all ColdSense resources

### **2. Secrets**
- **Name**: `coldsense-backend-secrets`
- **Contains**:
  - MQTT broker connection details
  - Supabase URL and API key
  - Logging configuration

### **3. Mosquitto MQTT Broker**
- **Deployment**: `mosquitto`
- **Replicas**: 1
- **Image**: `eclipse-mosquitto:2`
- **Port**: 1883 (MQTT)
- **Service**: ClusterIP (internal only)
- **Resources**:
  - CPU: 100m - 500m
  - Memory: 128Mi - 512Mi

### **4. Backend API**
- **Deployment**: `coldsense-backend`
- **Replicas**: 2 (for high availability)
- **Image**: `asia-south1-docker.pkg.dev/exalted-skein-505210-g0/coldsense/backend:latest`
- **Port**: 8000 (HTTP)
- **Service**: LoadBalancer (external access)
- **Resources**:
  - CPU: 250m - 1000m
  - Memory: 512Mi - 1Gi
- **Health Checks**:
  - Liveness: `/health` endpoint
  - Readiness: `/health` endpoint

### **5. Simulator (Optional)**
- **Deployment**: `coldsense-simulator`
- **Replicas**: 1
- **Image**: `asia-south1-docker.pkg.dev/exalted-skein-505210-g0/coldsense/simulator:latest`
- **Purpose**: Generate test sensor data
- **Resources**:
  - CPU: 100m - 500m
  - Memory: 256Mi - 512Mi

---

## 💰 Cost Breakdown

### **Monthly Estimated Costs:**

| Resource | Cost | Notes |
|----------|------|-------|
| GKE Autopilot | $70-100 | Pay per pod resource usage |
| Load Balancer | $18 | Fixed cost for external IP |
| Network Egress | $12-20 | Data transfer out |
| Artifact Registry | $0.10/GB | Docker image storage |
| **Total** | **~$100-140/month** | Can be optimized |

### **Cost Optimization Tips:**
1. Use smaller resource requests
2. Scale down replicas during off-hours
3. Use preemptible nodes for testing
4. Monitor and set budgets
5. Enable cluster autoscaler

---

## 🔒 Security Considerations

### **Current Security:**
- ✅ Shielded nodes with secure boot
- ✅ Workload identity for GCP API access
- ✅ Network policies possible
- ✅ Secrets stored in Kubernetes secrets
- ⚠️ Secrets not encrypted at rest (use GCP KMS for production)
- ⚠️ MQTT broker allows anonymous access (OK for internal testing)
- ⚠️ No SSL/TLS on backend (HTTP only)

### **Production Recommendations:**
1. **Enable Binary Authorization** - Ensure only signed images run
2. **Encrypt Secrets** - Use Google KMS for secret encryption
3. **Add SSL/TLS** - Use cert-manager and Let's Encrypt
4. **Private GKE** - Use private cluster with Cloud NAT
5. **MQTT Authentication** - Add username/password or certificates
6. **Network Policies** - Restrict pod-to-pod communication
7. **Workload Identity** - Bind service accounts to GCP IAM
8. **Security Scanning** - Enable vulnerability scanning in Artifact Registry

---

## 🎛️ Operations & Management

### **Accessing the Cluster:**
```bash
gcloud container clusters get-credentials coldsense-gke --region asia-south1
```

### **Viewing Resources:**
```bash
kubectl get all -n coldsense
```

### **Viewing Logs:**
```bash
# Backend logs
kubectl logs -f deployment/coldsense-backend -n coldsense

# Mosquitto logs
kubectl logs -f deployment/mosquitto -n coldsense
```

### **Scaling:**
```bash
# Scale backend replicas
kubectl scale deployment coldsense-backend --replicas=4 -n coldsense
```

### **Updating:**
```bash
# Rebuild and push image
docker build -t asia-south1-docker.pkg.dev/exalted-skein-505210-g0/coldsense/backend:latest .
docker push asia-south1-docker.pkg.dev/exalted-skein-505210-g0/coldsense/backend:latest

# Restart deployment
kubectl rollout restart deployment/coldsense-backend -n coldsense
```

---

## 📈 Performance & Scalability

### **Current Limits:**
- **Max Pods per Node**: 32
- **Max Nodes**: 1000 (autoscaling)
- **Backend Replicas**: 2 (can scale horizontally)
- **MQTT Broker**: 1 replica (can add clustering)

### **Load Testing Recommendations:**
1. Test with 1000 concurrent sensor messages
2. Monitor CPU/memory usage
3. Test load balancer distribution
4. Verify database connection pooling

---

## 🚀 Today's Deployment Plan

### **Phase 1: Infrastructure (Done)**
- ✅ GKE cluster exists
- ✅ Terraform state tracked
- ✅ Network configured

### **Phase 2: Deploy Backend (Today)**
1. Build backend Docker image
2. Push to Artifact Registry
3. Deploy to Kubernetes
4. Get external IP
5. Verify API health

### **Phase 3: Deploy Simulator (Today)**
1. Build simulator Docker image
2. Push to Artifact Registry
3. Deploy to Kubernetes
4. Verify sensor data flow

### **Phase 4: Test Frontend (Today)**
1. Update frontend API URL
2. Test login/signup
3. Verify dashboard shows live data
4. Test energy graph (shows today's date: 09/09)
5. Test farmer activity (no page compression)

---

## ✅ Success Criteria

By end of today, you should have:
- [ ] Backend API live with public IP
- [ ] MQTT broker running
- [ ] Simulator sending sensor data every 30 seconds
- [ ] Database receiving and storing data
- [ ] Frontend connected to backend
- [ ] Owner dashboard showing live charts
- [ ] Energy consumption graph showing correct dates (02/09 - 09/09)
- [ ] Farmer activity chart working without UI bugs
- [ ] All 3 user roles (Owner, Farmer, Stakeholder) can login
- [ ] Owner can create facilities
- [ ] Farmer can see dashboard
- [ ] Stakeholder can see map

---

## 📞 Next Actions

Run this command to get started:
```bash
cd infrastructure
./deploy.sh
```

Or follow the quick guide:
```bash
cat QUICK_DEPLOY_TODAY.md
```

🎯 **Goal: Live system by end of today!**

