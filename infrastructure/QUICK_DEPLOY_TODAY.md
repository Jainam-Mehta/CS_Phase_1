# 🚀 Quick Deploy - Get Live TODAY

## ⚡ Fast Track Deployment (15 minutes)

### Prerequisites Check:
```powershell
# Check if you have gcloud
gcloud --version

# Check if you have kubectl
kubectl version --client

# Check if you have docker
docker --version
```

If any are missing, install them first (see DEPLOYMENT_GUIDE.md).

---

## 🎯 Deploy in 5 Commands

### 1. Authenticate & Configure
```powershell
gcloud auth login
gcloud config set project exalted-skein-505210-g0
gcloud container clusters get-credentials coldsense-gke --region asia-south1
```

### 2. Create Artifact Registry & Configure Docker
```powershell
gcloud artifacts repositories create coldsense --repository-format=docker --location=asia-south1 --description="ColdSense Docker images"
gcloud auth configure-docker asia-south1-docker.pkg.dev
```

### 3. Build & Push Backend Image
```powershell
cd backend
docker build -t asia-south1-docker.pkg.dev/exalted-skein-505210-g0/coldsense/backend:latest .
docker push asia-south1-docker.pkg.dev/exalted-skein-505210-g0/coldsense/backend:latest
cd ..
```

### 4. Deploy to Kubernetes
```powershell
cd infrastructure/kubernetes
kubectl apply -f namespace.yaml
kubectl apply -f backend-secrets.yaml
kubectl apply -f mosquitto-deployment.yaml
kubectl wait --for=condition=available --timeout=300s deployment/mosquitto -n coldsense
kubectl apply -f backend-deployment.yaml
kubectl wait --for=condition=available --timeout=300s deployment/coldsense-backend -n coldsense
```

### 5. Get Your Live URL
```powershell
kubectl get service coldsense-backend -n coldsense -w
```

Wait for `EXTERNAL-IP` to appear (2-3 minutes), then:
```
http://<EXTERNAL-IP>/docs
```

---

## 🧪 Test Sensor Data Flow TODAY

### Option 1: Deploy Simulator to GKE

```powershell
# Build simulator image
cd backend/simulators
docker build -t asia-south1-docker.pkg.dev/exalted-skein-505210-g0/coldsense/simulator:latest .
docker push asia-south1-docker.pkg.dev/exalted-skein-505210-g0/coldsense/simulator:latest
cd ../../infrastructure/kubernetes

# Deploy simulator
kubectl apply -f simulator-deployment.yaml

# Check simulator logs
kubectl logs -f deployment/coldsense-simulator -n coldsense
```

### Option 2: Run Simulator Locally (Faster for Testing)

```powershell
# Get the backend external IP
$BACKEND_IP = kubectl get service coldsense-backend -n coldsense -o jsonpath='{.status.loadBalancer.ingress[0].ip}'

# Update .env to point to GKE MQTT
cd backend/simulators
# Edit .env: MQTT_BROKER=<BACKEND-IP-OR-MOSQUITTO-IP>

# Run simulator locally
python simulator.py
```

---

## 📊 Verify Data Flow

### 1. Check Backend Logs:
```powershell
kubectl logs -f deployment/coldsense-backend -n coldsense
```

### 2. Check Database:
Login to Supabase and verify:
- `sensor_readings` table has new rows
- `door_events` table has entries
- `energy_consumption` table has data

### 3. Test Frontend:
Update frontend `.env`:
```
VITE_API_URL=http://<EXTERNAL-IP>
```

Restart frontend and check if dashboard shows live data!

---

## 🎉 Success Checklist

- [ ] Backend API live at `http://<EXTERNAL-IP>/docs`
- [ ] Mosquitto MQTT broker running
- [ ] Simulator sending data
- [ ] Database receiving sensor readings
- [ ] Frontend showing live data
- [ ] Owner dashboard displays charts
- [ ] Energy graph shows today's date (09/09)
- [ ] Farmer activity chart works without compression

---

## 🚨 Quick Troubleshooting

### Backend not accessible:
```powershell
kubectl get pods -n coldsense
kubectl logs -f deployment/coldsense-backend -n coldsense
```

### Simulator not sending data:
```powershell
kubectl logs -f deployment/coldsense-simulator -n coldsense
```

### No external IP yet:
```powershell
# Wait a bit more, or check events
kubectl describe service coldsense-backend -n coldsense
```

---

## 🎯 What's Next?

1. ✅ Backend deployed and live
2. ✅ Simulator generating sensor data
3. ✅ Database storing data
4. ⏳ Frontend showing live data
5. ⏳ Test all 3 user roles
6. ⏳ Verify energy graph dates are dynamic
7. ⏳ Verify farmer activity hover works

**Target: Everything working by end of today! 🚀**
