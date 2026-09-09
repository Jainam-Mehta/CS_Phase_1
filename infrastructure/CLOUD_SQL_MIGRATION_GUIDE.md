# 🚀 Cloud SQL PostgreSQL Migration Guide - Production Setup

## 📋 Overview
Migrate ColdSense from Supabase to Cloud SQL for PostgreSQL with High Availability for production launch with real farmers and owners.

**Timeline**: 48 hours  
**Estimated Cost**: $228/month (covered by GCP credits)  
**Downtime**: <5 minutes (planned maintenance window)

---

## 🎯 Final Architecture

```
Real Farmers & Owners
         ↓
    Frontend (Vercel/VM)
         ↓
         ├─── Supabase Auth (FREE - keep for authentication)
         │
         ├─── Backend API (GCP VM: 8.231.107.201)
         │         ↓
         └─── Cloud SQL PostgreSQL (GCP)
                  ├─── Primary Instance (asia-south1-a)
                  ├─── Standby Replica (asia-south1-b) [HA]
                  ├─── Automated Backups (7-day retention)
                  └─── Point-in-time Recovery
```

---

## 📊 Configuration Details

### **Cloud SQL Instance Specs:**
```yaml
Instance Name: coldsense-production-db
Instance Type: db-custom-2-7680 (2 vCPU, 7.5GB RAM)
Database Version: PostgreSQL 15
Region: asia-south1 (Mumbai, India)
Zone: asia-south1-a (primary)
High Availability: Enabled (standby in asia-south1-b)
Storage Type: SSD
Storage Size: 100GB (auto-expand enabled)
Storage Auto-increase: Yes (up to 500GB)
Backups: Automated (7-day retention)
Point-in-time Recovery: Enabled
Maintenance Window: Sunday 02:00-06:00 IST
Deletion Protection: Enabled
Public IP: Disabled (use Cloud SQL Proxy or private IP)
SSL: Required
```

### **Monthly Cost Breakdown:**
| Component | Cost |
|-----------|------|
| db-custom-2-7680 instance | $104/month |
| High Availability (standby replica) | $104/month |
| 100GB SSD storage | $17/month |
| Automated backups (7 days) | $3/month |
| **Total** | **$228/month** |

**With GCP Credits**: $0 for 3+ months! 🎉

---

## 🔧 Step 1: Create Cloud SQL Instance (30 minutes)

### **1.1: Set Environment Variables**
```powershell
# Run these in PowerShell
$PROJECT_ID = "exalted-skein-505210-g0"
$INSTANCE_NAME = "coldsense-production-db"
$REGION = "asia-south1"
$DB_VERSION = "POSTGRES_15"
$TIER = "db-custom-2-7680"  # 2 vCPU, 7.5GB RAM
$STORAGE_SIZE = "100"
$ROOT_PASSWORD = "$(New-Guid)"  # Generate secure password

# Save password for later
Write-Output "Root Password: $ROOT_PASSWORD" | Out-File -FilePath "cloud-sql-credentials.txt"
Write-Host "✅ Password saved to cloud-sql-credentials.txt" -ForegroundColor Green
```

### **1.2: Create Cloud SQL Instance with High Availability**
```powershell
gcloud sql instances create $INSTANCE_NAME `
  --project=$PROJECT_ID `
  --database-version=$DB_VERSION `
  --tier=$TIER `
  --region=$REGION `
  --availability-type=REGIONAL `
  --storage-type=SSD `
  --storage-size="${STORAGE_SIZE}GB" `
  --storage-auto-increase `
  --storage-auto-increase-limit=500 `
  --backup `
  --backup-start-time="02:00" `
  --maintenance-window-day=SUN `
  --maintenance-window-hour=2 `
  --enable-bin-log `
  --deletion-protection `
  --root-password="$ROOT_PASSWORD"
```

**Expected output:**
```
Creating Cloud SQL instance for POSTGRES_15...done.
Created [https://sqladmin.googleapis.com/sql/v1beta4/projects/exalted-skein-505210-g0/instances/coldsense-production-db].
NAME                      DATABASE_VERSION  LOCATION       TIER              PRIMARY_ADDRESS  PRIVATE_ADDRESS  STATUS
coldsense-production-db  POSTGRES_15        asia-south1    db-custom-2-7680  x.x.x.x          -                RUNNABLE
```

⏱️ **This takes 10-15 minutes. Get coffee! ☕**

### **1.3: Verify Instance Creation**
```powershell
gcloud sql instances describe $INSTANCE_NAME --project=$PROJECT_ID
```

---

## 🔐 Step 2: Configure Security (15 minutes)

### **2.1: Create Database and User**
```powershell
# Create the main database
gcloud sql databases create coldsense `
  --instance=$INSTANCE_NAME `
  --project=$PROJECT_ID

# Create application user
$APP_PASSWORD = "$(New-Guid)"
Write-Output "App Password: $APP_PASSWORD" | Out-File -Append -FilePath "cloud-sql-credentials.txt"

gcloud sql users create coldsense_app `
  --instance=$INSTANCE_NAME `
  --password="$APP_PASSWORD" `
  --project=$PROJECT_ID
```

### **2.2: Allow Backend VM to Connect**
```powershell
# Get your backend VM's external IP
$BACKEND_VM_IP = gcloud compute instances describe coldsense-backend-vm `
  --zone=asia-south1-a `
  --format="get(networkInterfaces[0].accessConfigs[0].natIP)"

Write-Host "Backend VM IP: $BACKEND_VM_IP" -ForegroundColor Cyan

# Authorize the backend VM
gcloud sql instances patch $INSTANCE_NAME `
  --authorized-networks="$BACKEND_VM_IP/32" `
  --project=$PROJECT_ID
```

### **2.3: Enable SSL Connections**
```powershell
gcloud sql instances patch $INSTANCE_NAME `
  --require-ssl `
  --project=$PROJECT_ID
```

### **2.4: Get Connection Details**
```powershell
$CONNECTION_NAME = gcloud sql instances describe $INSTANCE_NAME `
  --project=$PROJECT_ID `
  --format="get(connectionName)"

$PUBLIC_IP = gcloud sql instances describe $INSTANCE_NAME `
  --project=$PROJECT_ID `
  --format="get(ipAddresses[0].ipAddress)"

Write-Host "`n✅ Cloud SQL Connection Details:" -ForegroundColor Green
Write-Host "Connection Name: $CONNECTION_NAME" -ForegroundColor Cyan
Write-Host "Public IP: $PUBLIC_IP" -ForegroundColor Cyan
Write-Host "Database: coldsense" -ForegroundColor Cyan
Write-Host "User: coldsense_app" -ForegroundColor Cyan
Write-Host "Password: (saved in cloud-sql-credentials.txt)" -ForegroundColor Cyan

# Save connection string
$DB_URL = "postgresql://coldsense_app:$APP_PASSWORD@$PUBLIC_IP:5432/coldsense?sslmode=require"
Write-Output "`nDatabase URL: $DB_URL" | Out-File -Append -FilePath "cloud-sql-credentials.txt"
```

---

## 📦 Step 3: Export Data from Supabase (20 minutes)

### **3.1: Export Schema**
```powershell
# SSH to backend VM (where you have supabase connection)
gcloud compute ssh coldsense-backend-vm --zone=asia-south1-a

# On the VM, install postgresql-client if not installed
sudo apt-get update
sudo apt-get install -y postgresql-client

# Export schema only (structure)
pg_dump "postgresql://postgres.mmxfqodybvdlhpjbcdnq:YourSupabasePassword@aws-0-ap-south-1.pooler.supabase.com:6543/postgres" \
  --schema-only \
  --no-owner \
  --no-acl \
  > /tmp/coldsense_schema.sql

# Export data only
pg_dump "postgresql://postgres.mmxfqodybvdlhpjbcdnq:YourSupabasePassword@aws-0-ap-south-1.pooler.supabase.com:6543/postgres" \
  --data-only \
  --no-owner \
  --no-acl \
  --column-inserts \
  > /tmp/coldsense_data.sql
```

### **3.2: Download Export Files to Local Machine**
```powershell
# From your local PowerShell
gcloud compute scp coldsense-backend-vm:/tmp/coldsense_schema.sql . --zone=asia-south1-a
gcloud compute scp coldsense-backend-vm:/tmp/coldsense_data.sql . --zone=asia-south1-a
```

### **3.3: Clean Up Export (Remove Supabase-specific stuff)**
```powershell
# Create cleaned version
$schemaContent = Get-Content "coldsense_schema.sql" -Raw
$schemaContent = $schemaContent -replace "CREATE SCHEMA IF NOT EXISTS public;", ""
$schemaContent = $schemaContent -replace "COMMENT ON SCHEMA public.*", ""
$schemaContent = $schemaContent -replace "supabase_", ""
$schemaContent | Out-File "coldsense_schema_clean.sql" -Encoding UTF8

Write-Host "✅ Schema cleaned and saved to coldsense_schema_clean.sql" -ForegroundColor Green
```

---

## 📥 Step 4: Import to Cloud SQL (30 minutes)

### **4.1: Upload SQL Files to Cloud Storage**
```powershell
# Create a temporary bucket
$BUCKET_NAME = "$PROJECT_ID-sql-import"
gsutil mb -p $PROJECT_ID -l $REGION gs://$BUCKET_NAME/

# Upload SQL files
gsutil cp coldsense_schema_clean.sql gs://$BUCKET_NAME/
gsutil cp coldsense_data.sql gs://$BUCKET_NAME/

Write-Host "✅ Files uploaded to Cloud Storage" -ForegroundColor Green
```

### **4.2: Grant Cloud SQL Access to Bucket**
```powershell
# Get the service account
$SERVICE_ACCOUNT = gcloud sql instances describe $INSTANCE_NAME `
  --project=$PROJECT_ID `
  --format="get(serviceAccountEmailAddress)"

# Grant access
gsutil iam ch serviceAccount:${SERVICE_ACCOUNT}:objectViewer gs://$BUCKET_NAME

Write-Host "✅ Cloud SQL can now access the bucket" -ForegroundColor Green
```

### **4.3: Import Schema**
```powershell
gcloud sql import sql $INSTANCE_NAME `
  gs://$BUCKET_NAME/coldsense_schema_clean.sql `
  --database=coldsense `
  --project=$PROJECT_ID

Write-Host "⏳ Importing schema... (this takes 5-10 minutes)" -ForegroundColor Yellow
```

### **4.4: Import Data**
```powershell
gcloud sql import sql $INSTANCE_NAME `
  gs://$BUCKET_NAME/coldsense_data.sql `
  --database=coldsense `
  --project=$PROJECT_ID

Write-Host "⏳ Importing data... (this takes 10-20 minutes)" -ForegroundColor Yellow
```

### **4.5: Verify Import**
```powershell
# Connect to Cloud SQL from VM
gcloud compute ssh coldsense-backend-vm --zone=asia-south1-a

# On the VM, connect to Cloud SQL
psql "postgresql://coldsense_app:YourPassword@CloudSQLPublicIP:5432/coldsense?sslmode=require"

# Check tables
\dt

# Count records in key tables
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'facilities', COUNT(*) FROM facilities
UNION ALL
SELECT 'sensor_readings', COUNT(*) FROM sensor_readings
UNION ALL
SELECT 'products', COUNT(*) FROM products;

# Exit
\q
exit
```

---

## 🔄 Step 5: Update Backend Configuration (15 minutes)

### **5.1: Update .env File on VM**
```powershell
# SSH to VM
gcloud compute ssh coldsense-backend-vm --zone=asia-south1-a

# On the VM, backup current .env
cd ~/coldsense
cp backend/.env backend/.env.backup

# Edit .env
nano backend/.env
```

**Update these lines:**
```bash
# OLD (Supabase)
# DATABASE_URL=postgresql://postgres.mmxfqodybvdlhpjbcdnq:password@aws-0-ap-south-1.pooler.supabase.com:6543/postgres

# NEW (Cloud SQL)
DATABASE_URL=postgresql://coldsense_app:YOUR_APP_PASSWORD@CLOUD_SQL_PUBLIC_IP:5432/coldsense?sslmode=require

# Keep Supabase for Auth (free tier)
SUPABASE_URL=https://mmxfqodybvdlhpjbcdnq.supabase.co
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# MQTT stays same
MQTT_BROKER=broker.emqx.io
MQTT_PORT=1883
```

**Save**: `Ctrl+O`, `Enter`, `Ctrl+X`

### **5.2: Update Backend Code (if needed)**

Check if your backend code has hardcoded Supabase references:

```powershell
# On VM
cd ~/coldsense/backend
grep -r "supabase" app/ --include="*.py"
```

If you find any, update them to use the new `DATABASE_URL` from `.env`.

### **5.3: Restart Backend**
```powershell
# If using docker-compose
cd ~/coldsense
docker-compose down
docker-compose up -d

# If running directly
pkill -f "uvicorn"
cd ~/coldsense/backend
source venv/bin/activate
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 &

# Check logs
docker-compose logs -f backend
# OR
tail -f nohup.out
```

---

## ✅ Step 6: Testing & Verification (30 minutes)

### **6.1: Test API Endpoints**
```powershell
# From your local machine
$BACKEND_IP = "8.231.107.201"

# Test health endpoint
curl http://${BACKEND_IP}:8000/health

# Test products endpoint
curl http://${BACKEND_IP}:8000/api/products

# Test sensor readings
curl http://${BACKEND_IP}:8000/api/sensor/readings/latest
```

### **6.2: Test Authentication**
```powershell
# Test signup (should still work with Supabase Auth)
curl -X POST http://${BACKEND_IP}:8000/api/auth/signup `
  -H "Content-Type: application/json" `
  -d '{"email":"test@example.com","password":"Test1234!","role":"farmer"}'

# Test login
curl -X POST http://${BACKEND_IP}:8000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"test@example.com","password":"Test1234!"}'
```

### **6.3: Test Database Writes**
```powershell
# Create a test product
curl -X POST http://${BACKEND_IP}:8000/api/products `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" `
  -d '{"name":"Test Product","category":"Vegetables","quantity":100}'

# Verify in Cloud SQL
gcloud compute ssh coldsense-backend-vm --zone=asia-south1-a

psql "postgresql://coldsense_app:PASSWORD@CLOUD_SQL_IP:5432/coldsense?sslmode=require"

SELECT * FROM products WHERE name = 'Test Product';

\q
exit
```

### **6.4: Test High Availability**
```powershell
# Trigger a failover test (optional - causes 30 seconds downtime)
gcloud sql instances failover $INSTANCE_NAME --project=$PROJECT_ID

# Monitor the failover
gcloud sql operations list --instance=$INSTANCE_NAME --project=$PROJECT_ID
```

---

## 📊 Step 7: Monitoring & Alerts (15 minutes)

### **7.1: Enable Monitoring**
```powershell
# Cloud SQL monitoring is automatic, view in console:
# https://console.cloud.google.com/sql/instances/coldsense-production-db/monitoring

# Or via gcloud
gcloud sql operations list --instance=$INSTANCE_NAME --project=$PROJECT_ID --limit=10
```

### **7.2: Set Up Alerts (Recommended)**

Go to: https://console.cloud.google.com/monitoring/alerting

Create alerts for:
- CPU usage > 80% for 5 minutes
- Memory usage > 85%
- Storage usage > 90%
- Connection count > 80% of max
- Replication lag > 30 seconds

### **7.3: Monitor Backups**
```powershell
# List backups
gcloud sql backups list --instance=$INSTANCE_NAME --project=$PROJECT_ID

# Create manual backup before going live
gcloud sql backups create --instance=$INSTANCE_NAME --project=$PROJECT_ID --description="Pre-launch backup"
```

---

## 🚀 Step 8: Go Live Checklist

### **Before Going Live:**
```
☐ Cloud SQL instance running and healthy
☐ High Availability enabled and tested
☐ Automated backups configured (7-day retention)
☐ All data migrated and verified
☐ Backend connected to Cloud SQL
☐ Supabase Auth still working (for login/signup)
☐ API endpoints tested (GET, POST, PUT, DELETE)
☐ Frontend updated with new backend IP (if needed)
☐ SSL connections enforced
☐ Monitoring and alerts configured
☐ Manual backup created
☐ Load testing completed (optional)
☐ Rollback plan documented
☐ Senior informed and approved
```

### **Launch Day:**
```
1. Create final backup of Supabase (just in case)
2. Put up maintenance notice (if needed)
3. Switch backend to Cloud SQL
4. Test all critical flows:
   - Farmer signup/login
   - Owner signup/login
   - Distributor signup/login
   - View dashboards
   - Create products
   - View sensor data
5. Monitor for 2 hours
6. Remove maintenance notice
7. Announce launch!
```

---

## 🔄 Rollback Plan (If Something Goes Wrong)

### **Quick Rollback (5 minutes):**
```powershell
# SSH to VM
gcloud compute ssh coldsense-backend-vm --zone=asia-south1-a

# Restore old .env
cd ~/coldsense/backend
cp .env.backup .env

# Restart backend
docker-compose down
docker-compose up -d

# OR
pkill -f "uvicorn"
source venv/bin/activate
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 &
```

### **Database Rollback (if data corrupted):**
```powershell
# Restore from backup
$BACKUP_ID = "BACKUP_ID_HERE"  # Get from: gcloud sql backups list
gcloud sql backups restore $BACKUP_ID `
  --backup-instance=$INSTANCE_NAME `
  --backup-project=$PROJECT_ID
```

---

## 💰 Cost Tracking with GCP Credits

### **View Current Credit Usage:**
```powershell
# View billing
gcloud billing accounts list

# View current charges
# Go to: https://console.cloud.google.com/billing
```

### **Monthly Cost Estimate:**
```
Cloud SQL Instance (HA):     $228/month
Compute Engine VM:            $36/month
Storage (backups):             $5/month
Network egress:               $10/month
─────────────────────────────────────
Total GCP Cost:              $279/month
Minus Supabase savings:       -$25/month
─────────────────────────────────────
Net Additional:              $254/month

With GCP Credits: $0/month for 3+ months! 🎉
```

### **After Credits Expire:**

**Option 1**: Continue with Cloud SQL if budget allows ($279/month)
**Option 2**: Downgrade to Cloud SQL Basic ($46/month, no HA)
**Option 3**: Migrate back to Supabase ($25/month)

---

## 📱 Step 9: Update Frontend (if needed)

If your frontend is hardcoded to backend URL, update it:

```typescript
// frontend/src/config/api.ts or similar
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://8.231.107.201:8000";
```

Rebuild and redeploy frontend:
```powershell
cd frontend
npm run build
# Deploy to Vercel or wherever
```

---

## 📞 Support & Troubleshooting

### **Connection Issues:**
```powershell
# Test connectivity from VM
gcloud compute ssh coldsense-backend-vm --zone=asia-south1-a
telnet CLOUD_SQL_IP 5432

# Check firewall rules
gcloud sql instances describe $INSTANCE_NAME --format="get(settings.ipConfiguration)"
```

### **Performance Issues:**
```powershell
# Check current connections
gcloud sql instances describe $INSTANCE_NAME --format="get(currentDiskSize,settings.tier)"

# Upgrade instance if needed
gcloud sql instances patch $INSTANCE_NAME --tier=db-custom-4-15360
```

### **Backup Recovery:**
```powershell
# List all backups
gcloud sql backups list --instance=$INSTANCE_NAME

# Restore specific backup
gcloud sql backups restore BACKUP_ID --backup-instance=$INSTANCE_NAME
```

---

## ✅ Success Metrics

### **After 24 Hours:**
- [ ] 0 downtime incidents
- [ ] All API endpoints < 500ms response time
- [ ] Database CPU < 50%
- [ ] At least 10 successful farmer signups
- [ ] At least 5 owner signups
- [ ] Sensor data flowing (100+ readings)

### **After 1 Week:**
- [ ] 50+ active users
- [ ] 1000+ sensor readings
- [ ] 0 data loss incidents
- [ ] Uptime > 99.9%

---

## 🎉 You're Done!

**Cloud SQL PostgreSQL is now running in production with:**
✅ High Availability (99.95% uptime)
✅ Automated backups
✅ SSL encryption
✅ Monitoring & alerts
✅ Scalable architecture
✅ Free with GCP credits!

**Real farmers and owners can now use ColdSense!** 🚜❄️

---

## 📞 Need Help?

If you encounter issues during migration:
1. Check the rollback section above
2. Review Cloud SQL logs: `gcloud sql operations list`
3. Check backend logs: `docker-compose logs backend`
4. Test connectivity: `psql "CONNECTION_STRING"`

**Created by**: Kiro AI  
**Date**: August 26, 2026  
**Project**: ColdSense IoT Cold Storage Management
