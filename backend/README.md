# ColdSense FastAPI Backend 🚀

FastAPI backend for ColdSense cold storage management system.

## 📋 Features

- **FastAPI Framework** - Modern, high-performance Python web framework
- **Real-time MQTT Integration** - Sensor data streaming
- **Supabase Database** - PostgreSQL with real-time capabilities
- **RESTful API** - Well-structured endpoints for all operations
- **Auto-generated Docs** - Interactive Swagger UI and ReDoc
- **CORS Enabled** - Frontend integration ready

## 🏗️ Architecture

```
backend/
├── app/
│   ├── api/              # API endpoints
│   │   ├── auth.py       # Authentication
│   │   ├── sites.py      # Cold storage sites
│   │   ├── products.py   # Product management
│   │   ├── inventory.py  # Inventory tracking
│   │   ├── orders.py     # Order management
│   │   ├── finance.py    # Financial transactions
│   │   ├── energy.py     # Energy monitoring
│   │   ├── alerts.py     # Alert system
│   │   └── market.py     # Market intelligence
│   ├── crud/             # Database CRUD operations
│   ├── database/         # Database connections
│   ├── models/           # Pydantic models
│   ├── mqtt/             # MQTT pub/sub
│   ├── schemas/          # API schemas
│   ├── services/         # Business logic
│   ├── utils/            # Utilities
│   ├── config.py         # Configuration
│   └── main.py           # Application entry point
├── simulators/           # Data generators
├── tests/                # Unit tests
├── .env                  # Environment variables
├── requirements.txt      # Python dependencies
├── run.py                # Development server runner
└── start-dev.ps1         # Quick start script (Windows)
```

## 🚀 Quick Start

### Option 1: Using PowerShell Script (Recommended)
```powershell
.\start-dev.ps1
```

### Option 2: Using Python Runner
```powershell
# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Run the server
python run.py

# Or with custom options
python run.py --port 8080 --no-reload
```

### Option 3: Direct Uvicorn
```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 📚 API Documentation

Once the server is running, access the documentation at:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## 🔌 API Endpoints

### Authentication
- `GET /auth/profile/{auth_user_id}` - Get user profile by auth ID
- `GET /auth/profile/by-id/{profile_id}` - Get profile by profile ID
- `GET /auth/facilities/{profile_id}` - Get owner facilities

### Sites
- `GET /sites` - List all cold storage sites
- `GET /sites/{site_id}` - Get site details
- `POST /sites` - Create new site
- `PUT /sites/{site_id}` - Update site
- `DELETE /sites/{site_id}` - Delete site

### Products
- `GET /products` - List products
- `GET /products/{product_id}` - Get product details
- `POST /products` - Create product

### Inventory
- `GET /inventory` - List inventory
- `GET /inventory/farmer/{farmer_id}` - Get farmer inventory
- `POST /inventory/batch` - Create batch

### Orders
- `GET /orders` - List orders
- `POST /orders` - Create order
- `PUT /orders/{order_id}` - Update order status

### Finance
- `GET /finance/transactions` - List transactions
- `GET /finance/summary` - Financial summary

### Energy
- `GET /energy/usage` - Get energy usage
- `GET /energy/solar-vs-grid` - Solar vs grid comparison

### Alerts
- `GET /alerts` - List alerts
- `POST /alerts` - Create alert
- `PUT /alerts/{alert_id}/acknowledge` - Acknowledge alert

### Market
- `GET /market/prices` - Get market prices
- `GET /market/trends` - Get market trends

### Sensors (Legacy)
- `GET /latest-reading` - Latest sensor reading
- `GET /door-status` - Door status monitoring

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# MQTT Configuration
MQTT_BROKER=localhost
MQTT_PORT=1883
MQTT_TOPIC=coldsense/sensors

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# Server Configuration
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
LOG_LEVEL=INFO

# Door Threshold
DOOR_THRESHOLD_MINUTES=5
```

## 🧪 Development

### Install Dependencies
```powershell
pip install -r requirements.txt
```

### Run Tests
```powershell
pytest
```

### Code Formatting
```powershell
black app/
```

### Type Checking
```powershell
mypy app/
```

## 🔧 Troubleshooting

### Port Already in Use
```powershell
# Find process using port 8000
netstat -ano | findstr :8000

# Kill process by PID
taskkill /PID <PID> /F

# Or use different port
python run.py --port 8080
```

### MQTT Connection Issues
- Check if MQTT broker is running (mosquitto)
- Verify MQTT_BROKER and MQTT_PORT in .env
- Check firewall settings

### Supabase Connection Issues
- Verify SUPABASE_URL and SUPABASE_KEY in .env
- Check internet connection
- Verify Supabase project is active

### CORS Errors
- Add frontend URL to ALLOWED_ORIGINS in .env
- Restart backend server after changes

## 📦 Dependencies

- **fastapi** - Web framework
- **uvicorn** - ASGI server
- **supabase** - Database client
- **paho-mqtt** - MQTT client
- **pydantic** - Data validation
- **python-dotenv** - Environment management

## 🔐 Security

- All database operations use Supabase RLS (Row Level Security)
- Authentication via Supabase Auth JWT tokens
- CORS configured for specific origins only
- Environment variables for sensitive data

## 📊 Monitoring

The backend logs to stdout with configurable log levels:
- DEBUG - Detailed diagnostic information
- INFO - General informational messages (default)
- WARNING - Warning messages
- ERROR - Error messages
- CRITICAL - Critical issues

Set log level in .env:
```env
LOG_LEVEL=DEBUG
```

## 🚢 Production Deployment

For production deployment:

1. **Set production environment variables**
2. **Disable auto-reload**: `python run.py --no-reload`
3. **Use production ASGI server**: Gunicorn with Uvicorn workers
4. **Enable HTTPS**
5. **Configure reverse proxy** (Nginx/Caddy)
6. **Set up monitoring** (Sentry, DataDog, etc.)

Example with Gunicorn:
```bash
gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Run tests
4. Submit pull request

## 📄 License

Proprietary - ColdSense AI Project

## 📞 Support

For issues or questions, contact the development team.
