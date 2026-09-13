# 🏗️ ColdSense Architecture Explanation - Supabase vs Self-Managed PostgreSQL

## 📊 CURRENT SETUP (What you have now)

```
Frontend (React)
      ↓
Supabase (Cloud)
├── PostgreSQL Database (your data)
│   ├── users table
│   ├── facilities table
│   ├── products table
│   ├── sensor_readings table
│   └── All your data is HERE
│
└── Supabase Auth (login/signup)
    ├── User authentication
    ├── JWT tokens
    └── Password management
```

**Cost:** $25/month for Supabase

---

## 🎯 NEW SETUP (What we're building)

```
Frontend (React)
      ↓
      ├──────────────────┬─────────────────┐
      │                  │                 │
Supabase Auth    GCP Compute Engine VM ($36/month)
(Login/Signup)   ├── Backend API (FastAPI)
$0 (free tier)   │   
                 ├── PostgreSQL (Docker container)
                 │   ├── users table
                 │   ├── facilities table
                 │   ├── products table
                 │   ├── sensor_readings table
                 │   └── All your data MOVED HERE
                 │
                 ├── MQTT Subscriber (Docker container)
                 └── Simulator (Docker container)
```

**Cost:** $36/month for everything!

---

## 🔄 WHAT CHANGES?

### ✅ STAYS THE SAME (No change needed):
1. **Supabase Auth** - Keep for login/signup
   - Free tier (up to 50,000 users/month)
   - No migration needed
   - Frontend still uses Supabase for authentication

2. **Frontend Code** - Minimal changes
   - Still uses Supabase for login/signup
   - Just change API endpoint URL

### ❌ WHAT CHANGES:
1. **Database Location** - MOVES from Supabase to your VM
   - All data (users, facilities, products, sensor_readings) moves
   - PostgreSQL runs in Docker on your VM
   - Self-managed (you control it)

2. **Backend API** - Runs on your VM
   - FastAPI app in Docker container
   - Connects to local PostgreSQL (same VM)
   - Cheaper and faster (no network latency)

---

## 📦 HOW IT WORKS - DETAILED

### **The VM (Compute Engine):**
```
Google Cloud Compute Engine VM (e2-medium)
├── Ubuntu 24.04 LTS
├── Docker Engine
└── 4 Docker Containers:
    
    1. PostgreSQL Container
       • Image: postgres:15-alpine
       • Port: 5432
       • Storage: 30GB disk (persistent)
       • Your database lives here
    
    2. Backend API Container
       • Your FastAPI app
       • Port: 8000 (exposed to internet)
       • Connects to PostgreSQL container
       • Handles API requests
    
    3. MQTT Subscriber Container
       • Listens to sensor data
       • Saves to PostgreSQL
    
    4. Simulator Container
       • Generates fake sensor data (for testing)
```

---

## 🔄 DATA MIGRATION - WHAT HAPPENS TO YOUR SUPABASE DATA?

### **Option 1: FRESH START (Recommended for testing)**
- Start with empty PostgreSQL
- Your old Supabase data stays there (untouched)
- New data goes to VM PostgreSQL
- **When ready**, you can migrate old data later

### **Option 2: MIGRATE ALL DATA (Production)**
1. Export data from Supabase
2. Import into VM PostgreSQL
3. All historical data preserved
4. Switch frontend to new API
5. Stop using Supabase database

---

## 🎭 HYBRID APPROACH (RECOMMENDED!)

```
Supabase                          GCP VM
├── Auth ONLY (FREE)       ←───┬  ├── Backend API
│   • Login/Signup              │  │
│   • JWT tokens                │  ├── PostgreSQL
│   • Password reset            │  │   • All business data
│                               │  │   • Sensor readings
Frontend ────────────────────────┴──┤   • Products, facilities
                                    │
                                    └── MQTT Subscriber
```

**Why this is smart:**
- ✅ Keep Supabase Auth (free tier, proven)
- ✅ Move expensive database to VM ($36/month)
- ✅ Best of both worlds!

---

## 💡 HOW AUTHENTICATION WORKS

### **User Login Flow:**
```
1. User clicks "Login" on frontend
   ↓
2. Frontend → Supabase Auth
   "Please login this user"
   ↓
3. Supabase checks password
   ↓
4. Supabase returns JWT token
   ↓
5. Frontend → Your Backend API (on VM)
   "Get user profile" + JWT token
   ↓
6. Backend verifies JWT with Supabase
   ↓
7. Backend gets user data from local PostgreSQL
   ↓
8. Returns data to frontend
```

**Key Point:** Supabase only handles authentication, your VM handles all data!

---

## 🗄️ DATABASE ARCHITECTURE

### **PostgreSQL Container on VM:**
```yaml
PostgreSQL Container:
  - Image: postgres:15-alpine (lightweight)
  - Memory: 1GB allocated
  - Storage: 30GB SSD (persistent volume)
  - Backup: You manage (can automate)
  - Network: Private (only accessible from VM)
  - Connection: Internal Docker network
```

### **Data Persistence:**
- Docker volume: `/var/lib/postgresql/data`
- Stored on VM's disk
- **Survives container restarts** ✅
- **LOST if VM is deleted** ⚠️ (we'll handle backups!)

---

## 💰 COST BREAKDOWN

### **Current (Supabase):**
```
Supabase Database: $25/month
Supabase Auth: $0 (free tier)
─────────────────────────
Total: $25/month
```

### **New (VM + Self-managed):**
```
Compute Engine VM (e2-medium): $36/month
  ├── PostgreSQL (included)
  ├── Backend API (included)
  ├── MQTT (included)
  └── All on same VM!

Supabase Auth: $0 (free tier) - KEEP THIS!
─────────────────────────────────────────
Total: $36/month
```

**Savings?** Actually $11/month MORE, but you get:
- ✅ Full control
- ✅ Better performance (everything local)
- ✅ No vendor lock-in
- ✅ Can scale as needed
- ✅ No expensive Cloud SQL ($228/month)

---

## 🔒 SECURITY

### **What's Secured:**
1. **PostgreSQL:**
   - Not exposed to internet
   - Only accessible from VM
   - Strong password
   - Inside Docker network

2. **Backend API:**
   - Public (port 8000)
   - JWT authentication
   - Validates with Supabase Auth

3. **Supabase Auth:**
   - Still handles passwords
   - Free tier security

---

## 🚀 DEPLOYMENT PROCESS

### **Step 1: Create VM with Terraform**
```bash
terraform apply
```
Creates:
- VM with Ubuntu
- Docker pre-installed
- Firewall rules
- Static IP

### **Step 2: Deploy Docker Containers**
```bash
# SSH to VM
gcloud compute ssh coldsense-production-vm

# Upload docker-compose.yml
# Run:
docker compose up -d
```

### **Step 3: Test**
```bash
curl http://VM_IP:8000/health
```

---

## 📊 WHAT YOU NEED TO MIGRATE

### **From Supabase to VM:**
1. **Schema** (table structure)
   - Copy table definitions
   - Apply to new PostgreSQL

2. **Data** (if you want historical data)
   - Export from Supabase: `pg_dump`
   - Import to VM: `psql`

3. **Backend Code**
   - Update `DATABASE_URL` environment variable
   - Point to VM PostgreSQL instead of Supabase
   - Keep Supabase Auth URLs

### **Frontend Changes:**
```javascript
// OLD
const API_URL = "http://localhost:8000";  // or Supabase URL

// NEW
const API_URL = "http://VM_EXTERNAL_IP:8000";
```

That's it! Just change the backend URL!

---

## 🎯 ADVANTAGES

### **Self-Managed PostgreSQL on VM:**
✅ **Full Control** - You own the database
✅ **Lower Cost** - $36/month vs $228/month Cloud SQL
✅ **Fast** - Backend and DB on same machine (no network latency)
✅ **Simple** - One VM, everything together
✅ **Flexible** - Customize as needed

### **Hybrid with Supabase Auth:**
✅ **Free Auth** - Keep Supabase free tier
✅ **Proven** - Supabase Auth is solid
✅ **No Migration** - Don't rebuild authentication
✅ **Best of Both** - Cheap DB + reliable auth

---

## ⚠️ CONSIDERATIONS

### **Backups:**
- ❌ Supabase: Automatic backups
- ⚠️ VM PostgreSQL: YOU manage backups

**Solution:** We'll create automated backup script!

### **High Availability:**
- ❌ Supabase: Built-in HA
- ⚠️ VM: Single point of failure

**Solution:** For $36/month, acceptable for MVP. Can add HA later if needed.

### **Scaling:**
- ❌ Supabase: Auto-scales
- ⚠️ VM: Manual scaling (upgrade VM)

**Solution:** Start small, upgrade VM when needed.

---

## 🔄 MIGRATION TIMELINE

### **Today (Setup):** 30 minutes
1. Run `terraform apply` (10 min)
2. SSH to VM, deploy Docker (5 min)
3. Test basic API (5 min)
4. Update frontend URL (5 min)
5. Test end-to-end (5 min)

### **Data Migration (Optional):** 1 hour
1. Export from Supabase (20 min)
2. Import to VM (30 min)
3. Verify data (10 min)

---

## 📝 SUMMARY

### **What's Happening:**
- ✅ Moving database from Supabase to your own VM
- ✅ Keeping Supabase Auth (smart move!)
- ✅ PostgreSQL runs in Docker container
- ✅ Everything on ONE VM ($36/month)

### **Why This is Good:**
- 💰 Cheaper than Cloud SQL ($228/month)
- 🎯 Simple architecture (one VM)
- ✅ Full control over your data
- 🚀 Good for 100-1000 users
- ⚡ Fast (local connections)

### **What You Need to Do:**
1. Run Terraform to create VM
2. Deploy Docker containers
3. Change frontend API URL
4. Optionally migrate old Supabase data

---

## ❓ QUESTIONS ANSWERED

**Q: Will my current Supabase data be deleted?**  
A: NO! It stays there until YOU decide to stop using it.

**Q: Can I test first before migrating data?**  
A: YES! Start fresh, test everything, then migrate data later.

**Q: Do I need to rewrite authentication code?**  
A: NO! Keep using Supabase Auth (free tier).

**Q: What if VM crashes?**  
A: Have backups! We'll create automated backup to Cloud Storage.

**Q: Can I go back to Supabase?**  
A: YES! Just export data and reimport to Supabase.

---

**Ready to deploy this setup?** 🚀

It's the cheapest, simplest production-ready option for your needs!
