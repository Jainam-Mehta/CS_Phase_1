# 🧊 ColdSense AI - Cold Chain Management System

<div align="center">

[![GitHub Actions](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-blue)](/.github/workflows)
[![Python](https://img.shields.io/badge/Python-3.12-green)](https://www.python.org/downloads/release/python-3120/)
[![Node.js](https://img.shields.io/badge/Node.js-18%20%7C%2020-green)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.3-61dafb)](https://react.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

**A real-time IoT monitoring and management system for agricultural cold storage facilities across India**

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [Development](#-development) • [Deployment](#-deployment) • [Contributing](#-contributing)

</div>

---

## 📋 Table of Contents

1. [About](#-about)
2. [Features](#-features)
3. [Tech Stack](#-tech-stack)
4. [Quick Start](#-quick-start)
5. [Project Structure](#-project-structure)
6. [Development Guide](#-development-guide)
7. [API Documentation](#-api-documentation)
8. [Database Schema](#-database-schema)
9. [Deployment](#-deployment)
10. [CI/CD Pipeline](#-cicd-pipeline)
11. [Troubleshooting](#-troubleshooting)
12. [Contributing](#-contributing)
13. [Support](#-support)

---

## 🎯 About

**ColdSense AI** is an intelligent cold chain management platform designed for Indian agricultural cold storage facilities. It provides:

- **Real-time IoT monitoring** of temperature, humidity, and environmental conditions
- **Smart investment tracking** for farmers investing in cold storage
- **Automated financial calculations** for profits, payouts, and incentives
- **Demand forecasting** powered by AI/ML
- **Multi-stakeholder support** (farmers, facility owners, coordinators, admins)
- **Geographic distribution** across Indian states, districts, and localities

### Problem Solved

🌾 **For Farmers:**
- Lack of affordable cold storage access
- Uncertainty about market prices
- Complex investment processes
- Manual tracking of produce

❄️ **For Facility Owners:**
- Low facility utilization
- Manual farmer coordination
- Difficulty tracking investments
- Energy optimization challenges

### Solution

ColdSense connects farmers with idle cold storage capacity, handles financial reconciliation automatically, and provides market intelligence for better pricing decisions.

---

## ✨ Features

### 📊 Dashboard & Monitoring

- **Real-time sensor data** - Temperature, humidity, pressure, door status
- **Historical analytics** - 24h, 7d, 30d views with trends
- **Alert system** - Configurable thresholds with instant notifications
- **Energy tracking** - Power consumption monitoring and optimization
- **2D facility diagrams** - Visual representation of storage conditions

### 💰 Financial Management

- **Investment tracking** - From pending to active to completed status
- **Automated profit calculation** - Based on commodity prices and storage rates
- **Payout management** - Multi-stakeholder revenue distribution
- **Real-time sync** - Investment status updates reflected instantly
- **Payment history** - Complete audit trail of all transactions

### 🚜 Farmer Interface

- **Browse facilities** - Find nearby cold storage options
- **Quick investment** - One-click investment in available capacity
- **Track produce** - Monitor crates, commodities, and storage duration
- **Profit calculator** - Estimate returns before investing
- **Payment tracking** - View all historical and pending payouts

### 🏭 Owner Interface

- **Facility management** - Configure rooms, sensors, and capacity
- **Sensor setup** - Easy sensor device registration and assignment
- **Investment approval** - Review and approve/reject farmer requests
- **Revenue dashboard** - Track facility utilization and earnings
- **Settings management** - Manage users, permissions, and facility details

### 🤖 Admin Features

- **System administration** - User management, role assignments
- **Geographic data** - State/district/locality hierarchy management
- **Analytics** - Facility network utilization and performance
- **Compliance** - Audit logs, data retention policies

### 🌐 Geographical Coverage

- **50+ Indian states & territories**
- **700+ districts**
- **10,000+ localities**
- Real-time facility mapping and location-based search

---

## 🏗️ Tech Stack

### Frontend

```
Framework:      React 18.3 + TypeScript 6.0
Build Tool:     Vite 8.1
Styling:        Tailwind CSS 3.4
State:          Zustand 5.0
Data Fetching:  TanStack React Query 5.1
Forms:          React Hook Form 7.8 + Zod validation
Charts:         Chart.js 4.5 + Recharts 3.9
Maps:           D3.js (choropleth) + React Simple Maps
Database:       Supabase (PostgreSQL)
```

### Backend

```
Framework:      FastAPI 0.115
Server:         Uvicorn 0.30
Language:       Python 3.12
Database:       Supabase PostgreSQL
Message Queue:  MQTT (Paho 2.1, EMQ X Broker)
IoT Protocol:   MQTT + NBSense API
Scheduler:      APScheduler 3.10
```

### Infrastructure & DevOps

```
IaC:            Terraform
Container:      Docker & Docker Compose
Cloud Provider: Google Cloud Platform (GCP)
Compute:        Compute Engine (e2-medium VM)
Registry:       GCP Artifact Registry
CI/CD:          GitHub Actions
Monitoring:     GCP Cloud Monitoring
Database:       Supabase (managed PostgreSQL)
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (frontend development)
- **Python** 3.12+ (backend development)
- **Docker & Docker Compose** (containerized development)
- **Git** (version control)
- **GCP Account** (production deployment)
- **Supabase Account** (database)

### Option 1: Using Docker (Recommended)

```bash
# 1. Clone repository
git clone https://github.com/Jainam-Mehta/CS_Phase_1.git
cd CS_Project

# 2. Configure environment
cd infrastructure
cp .env.production .env.local
# Edit .env.local with your Supabase credentials

# 3. Start all services
docker compose up -d

# Services will be available at:
# Frontend:  http://localhost:5173
# Backend:   http://localhost:8000
# MQTT:      localhost:1883
# API Docs:  http://localhost:8000/docs
```

### Option 2: Local Development Setup

#### Backend Setup

```bash
# 1. Navigate to backend
cd backend

# 2. Create virtual environment
python -m venv venv

# 3. Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Create .env file
cp .env.example .env
# Edit .env with your configuration

# 6. Start MQTT broker (in separate terminal)
docker run -d -p 1883:1883 -p 8083:8083 emqx/emqx

# 7. Run backend server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend runs at: `http://localhost:8000`  
API Docs (Swagger): `http://localhost:8000/docs`

#### Frontend Setup

```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env.local
# Edit .env.local with Supabase and API URL

# 4. Start development server
npm run dev
```

Frontend runs at: `http://localhost:5173`

### First Login

1. Go to `http://localhost:5173`
2. Click **Sign Up**
3. Create account with role (Owner/Farmer/Coordinator)
4. Verify email (or use Supabase dashboard for testing)
5. Login and explore!

---

## 📂 Project Structure

```
CS_Project/
│
├── frontend/                          # React web application
│   ├── src/
│   │   ├── features/                 # Feature modules
│   │   │   ├── auth/                # Authentication
│   │   │   ├── dashboard/           # Dashboards (owner, farmer)
│   │   │   ├── monitoring/          # Sensor monitoring
│   │   │   ├── finance/             # Financial tracking
│   │   │   ├── orders/              # Order management
│   │   │   ├── settings/            # Settings & configuration
│   │   │   ├── stakeholder/         # Farmer/coordinator views
│   │   │   └── admin/               # Admin interface
│   │   ├── components/              # Reusable UI components
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── services/                # API & external services
│   │   ├── stores/                  # Zustand state management
│   │   ├── types/                   # TypeScript interfaces
│   │   ├── utils/                   # Utility functions
│   │   └── App.tsx                  # Root component
│   ├── package.json                 # Dependencies
│   ├── vite.config.ts              # Vite configuration
│   └── tsconfig.json               # TypeScript config
│
├── backend/                           # FastAPI application
│   ├── app/
│   │   ├── api/                     # API route handlers
│   │   │   ├── routes.py            # Main router
│   │   │   ├── auth.py              # Authentication endpoints
│   │   │   ├── sensors.py           # Sensor management
│   │   │   ├── finance.py           # Financial endpoints
│   │   │   ├── orders.py            # Order endpoints
│   │   │   ├── sites.py             # Facility endpoints
│   │   │   └── ...                  # Other endpoints
│   │   ├── database/                # Database layer
│   │   │   ├── connection.py        # Supabase connection
│   │   │   └── supabase.py          # DB utilities
│   │   ├── mqtt/                    # MQTT integration
│   │   │   ├── subscriber.py        # MQTT consumer
│   │   │   └── publisher.py         # MQTT producer
│   │   ├── services/                # Business logic
│   │   │   ├── sensor_service.py
│   │   │   └── door_service.py
│   │   ├── models/                  # Data models
│   │   ├── schemas/                 # Request/response schemas
│   │   ├── utils/                   # Utilities
│   │   ├── config.py                # Configuration
│   │   └── main.py                  # FastAPI app
│   ├── requirements.txt             # Python dependencies
│   ├── Dockerfile                   # Container image
│   └── .env                         # Environment variables
│
├── ingestion/                         # Data ingestion pipeline
│   ├── collector.py                 # NBSense API polling
│   ├── nbsense_ingestion.py        # MQTT publishing
│   └── config.py                    # Configuration
│
├── infrastructure/                    # Deployment configs
│   ├── docker-compose.yml           # Multi-container setup
│   ├── Dockerfile                   # Backend image
│   ├── terraform/                   # IaC for GCP
│   ├── kubernetes/                  # K8s configs (future)
│   ├── DEPLOYMENT_GUIDE.md         # Deployment instructions
│   └── GCP_ARCHITECTURE.md         # GCP architecture
│
├── datasets/                          # Geographic data
│   ├── processed/                   # Cleaned data
│   │   ├── states.csv              # Indian states
│   │   ├── districts.csv           # Districts
│   │   └── localities.csv          # Cities/towns
│   └── raw/                         # Raw data files
│
├── docs/                              # Documentation
│   ├── SENSOR_BUGS_FIXED.md        # Bug fix documentation
│   ├── SIGNUP_FLOW_FIX.md          # Flow documentation
│   └── ...                          # Other docs
│
├── .github/
│   ├── workflows/                   # GitHub Actions
│   │   ├── ci.yml                  # Build & Test
│   │   ├── build-push.yml          # Docker build
│   │   ├── deploy.yml              # Deployment
│   │   └── manual-rollback.yml     # Rollback
│   ├── CI_CD_SETUP.md              # CI/CD guide
│   ├── QUICK_START.md              # Quick reference
│   └── SECRETS_TEMPLATE.md         # Secrets config
│
├── TECHNICAL_DOCUMENTATION.md       # Full technical docs
├── CI_CD_PIPELINE_SUMMARY.md       # Pipeline overview
├── README.md                        # This file
├── LICENSE                          # MIT License
├── .gitignore                       # Git ignore rules
└── docker-compose.yml               # Development compose
```

---

## 👨‍💻 Development Guide

### Setting Up Development Environment

#### 1. Install Prerequisites

```bash
# Node.js (check: node -v, should be 18+)
# Python (check: python --version, should be 3.12+)
# Docker (check: docker --version)
# Git (check: git --version)
```

#### 2. Clone and Setup

```bash
git clone https://github.com/Jainam-Mehta/CS_Phase_1.git
cd CS_Project

# Backend
cd backend
python -m venv venv
source venv/bin/activate  # or: venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env

# Frontend (new terminal)
cd frontend
npm install
cp .env.example .env.local
```

#### 3. Start Services

```bash
# Terminal 1: MQTT Broker
docker run -d -p 1883:1883 -p 8083:8083 emqx/emqx

# Terminal 2: Backend
cd backend
source venv/bin/activate
python -m uvicorn app.main:app --reload

# Terminal 3: Frontend
cd frontend
npm run dev
```

### Code Style & Conventions

#### Frontend (TypeScript/React)

```typescript
// ✅ Use functional components with hooks
export const MyComponent: React.FC<Props> = ({ prop }) => {
  return <div>{prop}</div>
}

// ✅ Use TypeScript interfaces
interface Props {
  prop: string
}

// ✅ Use hooks for state
const [value, setValue] = useState<string>('')

// ❌ Avoid class components
// ❌ Avoid any types
// ❌ Avoid inline styles (use Tailwind)
```

#### Backend (Python)

```python
# ✅ Use type hints
def get_sensor_reading(sensor_id: str) -> SensorReading:
    pass

# ✅ Use Pydantic models for validation
class SensorReadingCreate(BaseModel):
    value: float
    unit: str

# ✅ Use async/await for I/O
async def fetch_data():
    pass

# ❌ Avoid untyped functions
# ❌ Avoid bare except clauses
# ❌ Avoid SQL string concatenation (use parameterized queries)
```

### Running Tests

#### Frontend Tests

```bash
cd frontend
npm run lint      # Run linter (oxlint)
npm run build     # Build for production
# Run tests (to be added)
```

#### Backend Tests

```bash
cd backend
pytest tests/           # Run all tests
pytest tests/ -v        # Verbose output
pytest tests/ --cov     # With coverage report
flake8 app              # Lint code
black app               # Format code
mypy app                # Type checking
```

### Git Workflow

```bash
# 1. Create feature branch
git checkout -b feature/my-feature
git checkout -b fix/bug-name

# 2. Make changes and commit
git add .
git commit -m "type: description"
# Types: feat, fix, docs, style, refactor, test, chore

# 3. Push branch
git push origin feature/my-feature

# 4. Create Pull Request
# Go to GitHub, create PR with description

# 5. After approval and merge
git checkout main
git pull
```

### Debugging Tips

#### Frontend

```typescript
// Check Redux DevTools
// Console logs
console.log('Value:', value)

// Check Network tab for API calls
// Check Application tab for localStorage/cookies
```

#### Backend

```python
# Check logs
docker logs coldsense-backend --tail=50

# Check database
docker exec coldsense-postgres psql -U coldsense -d coldsense_db -c "SELECT * FROM sensor_readings LIMIT 10;"

# Debug with breakpoints (VS Code)
# Run with: python -m debugpy --listen 5678 -m uvicorn app.main:app --reload
```

---

## 📚 API Documentation

### Interactive API Docs

When backend is running:
- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

### Main API Endpoints

#### Authentication

```
POST   /auth/signup              # Register new user
POST   /auth/login               # Login (returns JWT)
POST   /auth/refresh             # Refresh token
GET    /auth/me                  # Current user profile
POST   /auth/logout              # Logout
```

#### Sensors

```
GET    /sensors                  # List all sensors
GET    /sensors/{id}             # Get sensor details
POST   /sensors                  # Create sensor
PUT    /sensors/{id}             # Update sensor
GET    /sensors/{id}/readings    # Get historical readings
```

#### Finance

```
GET    /finance/investments      # List investments
POST   /finance/investments      # Create investment
PUT    /finance/investments/{id}/approve   # Approve
GET    /finance/investments/{id}/profit    # Calculate profit
```

#### Sites (Facilities)

```
GET    /sites                    # List all facilities
GET    /sites/{id}               # Get facility details
POST   /sites                    # Create facility
GET    /sites/{id}/conditions    # Current conditions
```

#### Orders

```
GET    /orders                   # List orders
POST   /orders                   # Create order
PUT    /orders/{id}/allocate     # Allocate crates
```

### Authentication

All endpoints (except auth) require JWT token:

```
Authorization: Bearer <your-jwt-token>
```

---

## 🗄️ Database Schema

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `users` | User accounts | id, email, role, created_at |
| `sites` | Facilities | id, name, location, owner_id, capacity_crates |
| `cold_storage_rooms` | Storage rooms | id, site_id, room_name, capacity_crates |
| `sensor_devices` | IoT sensors | id, room_id, sensor_type, mqtt_topic, device_id |
| `sensor_readings` | Sensor data | id, sensor_id, value, unit, timestamp |
| `stakeholder_investments` | Farmer investments | id, farmer_id, site_id, quantity_crates, status |
| `orders` | Purchase orders | id, farmer_id, site_id, commodity_id, quantity_crates |
| `products` | Commodities | id, name, category, storage_temp_min/max |
| `alerts` | System alerts | id, room_id, alert_type, severity, message |

### Relationships

```
users
├── sites (owner_id → id)
├── stakeholder_investments (farmer_id → id)
└── orders (farmer_id → id)

sites
├── cold_storage_rooms (site_id → id)
├── stakeholder_investments (site_id → id)
└── orders (site_id → id)

cold_storage_rooms
├── sensor_devices (room_id → id)
├── cold_storage_conditions (room_id → id)
└── alerts (room_id → id)

sensor_devices
└── sensor_readings (sensor_id → id)

stakeholder_investments
└── stakeholder_allocations (investment_id → id)

products
├── stakeholder_investments (commodity_id → id)
└── orders (commodity_id → id)
```

### Database Connection

```
Supabase Project: exalted-skein-505210
Region: asia-south1 (Mumbai)
Connection: PostgreSQL SSL
Port: 5432
```

---

## 🚀 Deployment

### Staging Deployment (Automatic)

```
Push to develop branch
    ↓
CI/CD pipeline runs
    ↓
Deploys to staging VM
    ↓
Status: Staging updated
```

### Production Deployment (Approval Required)

```
Push to main branch (or create release tag)
    ↓
CI/CD pipeline runs
    ↓
Waits for approval
    ↓
Admin approves in GitHub
    ↓
Deploys to production VM
    ↓
Health checks verify
    ↓
Team notified on Slack
```

### Manual Deployment

```bash
# SSH to GCP VM
gcloud compute ssh coldsense-production-vm --zone=asia-south1-c

# Pull latest code
cd CS_Project
git pull

# Restart services
cd infrastructure
docker compose pull
docker compose up -d
```

### View Deployment Status

1. Go to **Actions** tab on GitHub
2. Select workflow (CI, Build, Deploy)
3. View real-time logs
4. Check for errors or successes

### Emergency Rollback

```
GitHub Actions → Manual Rollback workflow
    ↓
Select environment (staging/production)
    ↓
Select target version (previous release tag)
    ↓
Workflow executes rollback
    ↓
Services restarted with old version
```

For details: See `.github/QUICK_START.md`

---

## 🔄 CI/CD Pipeline

### What Happens Automatically

```
1. Push/PR to GitHub
   ↓
2. CI Workflow (8-12 min)
   ├─ Frontend: Tests, lint, build
   ├─ Backend: Tests, lint, type check
   └─ Security: Vulnerability scanning
   ↓
3. Build Workflow (10-15 min)
   ├─ Build Docker images
   ├─ Scan for vulnerabilities
   └─ Push to Artifact Registry
   ↓
4. Deploy Workflow (5-10 min)
   ├─ Staging: Auto-deploy
   ├─ Production: Requires approval
   └─ Health checks
   ↓
5. Notifications
   ├─ Slack message
   ├─ Email alert (on failure)
   └─ GitHub status check
```

### CI/CD Documentation

- **Setup Guide:** See `.github/CI_CD_SETUP.md`
- **Quick Reference:** See `.github/QUICK_START.md`
- **Secrets Config:** See `.github/SECRETS_TEMPLATE.md`
- **Pipeline Overview:** See `CI_CD_PIPELINE_SUMMARY.md`

### View Workflow Runs

1. Go to **Actions** tab
2. Select workflow (CI, Build & Push, Deploy)
3. Click on run to see logs
4. Review step-by-step execution

---

## 🐛 Troubleshooting

### Frontend Issues

#### Issue: `npm install` fails

```bash
# Solution: Clear cache and try again
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

#### Issue: Port 5173 already in use

```bash
# Solution: Kill process or use different port
npm run dev -- --port 5174
```

#### Issue: Supabase connection fails

- Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`
- Verify keys are correct from Supabase dashboard
- Check internet connection

### Backend Issues

#### Issue: `pip install` fails

```bash
# Solution: Upgrade pip
python -m pip install --upgrade pip
pip install -r requirements.txt
```

#### Issue: MQTT connection fails

```bash
# Solution: Ensure broker is running
docker ps | grep emqx
# If not running:
docker run -d -p 1883:1883 -p 8083:8083 emqx/emqx
```

#### Issue: Supabase connection fails

```
Error: "SUPABASE_URL or SUPABASE_KEY not set"

Solution:
1. Check .env file has both variables
2. Verify credentials from Supabase dashboard
3. Ensure no typos or extra spaces
```

#### Issue: Port 8000 already in use

```bash
# Solution: Kill process or use different port
python -m uvicorn app.main:app --port 8001
```

### Docker Issues

#### Issue: `docker compose up` fails

```bash
# Solution: Check logs
docker compose logs -f

# Solution: Rebuild images
docker compose down
docker compose build --no-cache
docker compose up
```

#### Issue: Container crashes immediately

```bash
# Solution: Check logs
docker logs <container-name> --tail=50

# Solution: Check environment variables
docker inspect <container-name> | grep -A 20 Env
```

### Database Issues

#### Issue: "Unable to connect to database"

```bash
# Check Supabase is running
# Check connection string in .env
# Verify network connectivity
```

#### Issue: "Table not found" error

```bash
# Solution: Run migrations or check schema
# Schema should be created automatically by Supabase
# If missing, contact admin
```

### Deployment Issues

See `.github/CI_CD_SETUP.md` → **Troubleshooting** section

---

## 🤝 Contributing

### How to Contribute

1. **Fork the repository** - Create your own copy
2. **Create feature branch** - `git checkout -b feature/amazing-feature`
3. **Make changes** - Follow code style guidelines
4. **Commit changes** - `git commit -m "feat: add amazing feature"`
5. **Push to branch** - `git push origin feature/amazing-feature`
6. **Open Pull Request** - Describe changes and ask for review

### Commit Message Format

```
type(scope): description

feat:       New feature
fix:        Bug fix
docs:       Documentation changes
style:      Code style changes (formatting, missing semicolons, etc)
refactor:   Code refactoring without feature changes
test:       Test additions or updates
chore:      Build process, dependency updates, etc

Examples:
feat(sensors): add new sensor type support
fix(auth): resolve login redirect issue
docs(readme): update setup instructions
```

### Code Style

Follow existing code style:
- **Frontend:** Prettier formatting (auto-formatted)
- **Backend:** Black/isort (auto-formatted)
- **Comments:** Explain "why", not "what"

### Testing Requirements

- Frontend: Build passes (`npm run build`)
- Backend: Tests pass (`pytest tests/`)
- All: No linting errors

### Pull Request Process

1. Update README if needed
2. Update TECHNICAL_DOCUMENTATION.md if architecture changes
3. Ensure CI/CD pipeline passes
4. Request review from maintainers
5. Address review comments
6. Merge once approved

---

## 📞 Support

### Getting Help

| Issue | Resource |
|-------|----------|
| Setup problems | See "Quick Start" section above |
| Code questions | Check TECHNICAL_DOCUMENTATION.md |
| Deployment issues | See `.github/CI_CD_SETUP.md` |
| Bug reports | Create GitHub issue with details |
| Feature requests | Discuss in GitHub discussions |

### Contact

- **Email:** admin@coldsense.example.com
- **GitHub Issues:** For bug reports and feature requests
- **Discussions:** For questions and ideas

### Documentation

| Document | Purpose |
|----------|---------|
| README.md (this file) | Project overview & quick start |
| TECHNICAL_DOCUMENTATION.md | Complete technical reference |
| CI_CD_PIPELINE_SUMMARY.md | CI/CD pipeline documentation |
| .github/CI_CD_SETUP.md | Detailed CI/CD setup guide |
| .github/QUICK_START.md | 5-minute CI/CD reference |
| docs/SENSOR_BUGS_FIXED.md | Bug fix documentation |

---

## 📜 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

MIT License means:
- ✅ Commercial use allowed
- ✅ Modification allowed
- ✅ Distribution allowed
- ✅ Private use allowed
- ❌ Liability warranty not provided
- ❌ No warranty

---

## 🌟 Acknowledgments

### Technologies Used

- **FastAPI** - Modern Python web framework
- **React** - JavaScript UI library
- **Supabase** - Open-source Firebase alternative
- **GCP** - Cloud infrastructure
- **MQTT** - IoT protocol
- **Tailwind CSS** - Utility-first CSS
- **Docker** - Containerization

### Team

Built with ❤️ by the ColdSense team

---

## 🗺️ Roadmap

### Phase 1 (Current) ✅
- [x] Core IoT monitoring
- [x] Basic financial tracking
- [x] Multi-user support
- [x] Geographic data
- [x] CI/CD pipeline

### Phase 2 (Next)
- [ ] Advanced analytics
- [ ] Machine learning forecasting
- [ ] Mobile app
- [ ] Video monitoring
- [ ] Multi-language support

### Phase 3 (Future)
- [ ] Blockchain integration
- [ ] Real-time market data
- [ ] Supply chain tracking
- [ ] IoT device partnerships
- [ ] Global expansion

---

## 📊 Stats

```
Frontend:       ~12,000 lines of TypeScript/React
Backend:        ~8,000 lines of Python
Database:       50+ tables, normalized schema
API:            30+ endpoints
Tests:          Coverage reports in CI/CD
Docs:           500+ pages across multiple files
Deployment:     2 environments (staging, production)
```

---

## 🚀 Getting Started RIGHT NOW

```bash
# 1. Clone
git clone https://github.com/Jainam-Mehta/CS_Phase_1.git
cd CS_Project

# 2. Setup with Docker (easiest)
docker compose up -d

# 3. Open browser
# Frontend: http://localhost:5173
# Backend:  http://localhost:8000/docs

# 4. Sign up and explore!
```

**That's it! You're ready to go.** 🎉

For detailed setup: See "Quick Start" section above.

---

## 📝 Latest Updates

**August 26, 2026**
- ✅ Complete project cleanup (107 files removed)
- ✅ CI/CD pipeline implementation
- ✅ Comprehensive technical documentation
- ✅ Production-ready deployment setup

**Next:** Deploy to production and monitor metrics

---

<div align="center">

**Made with 💙 for Indian agriculture**

[⬆ Back to top](#-coldsense-ai---cold-chain-management-system)

</div>
