import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start background services on startup."""
    try:
        from app.mqtt.subscriber import start_subscriber
        start_subscriber()
        logger.info("MQTT subscriber background thread started.")
    except Exception as e:
        logger.warning("MQTT subscriber could not start (non-fatal): %s", e)
    
    # Start APScheduler for daily jobs
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from app.services.daily_storage_costs import run_daily_cost_calculation
        from datetime import datetime, timezone
        import pytz
        
        scheduler = BackgroundScheduler()
        
        # Calculate next run time: today at 23:59 UTC (or tomorrow if past that time)
        utc = pytz.UTC
        now = datetime.now(utc)
        next_run = now.replace(hour=23, minute=59, second=0, microsecond=0)
        if next_run <= now:
            # If we're already past 23:59 today, schedule for tomorrow
            next_run = next_run.replace(day=next_run.day + 1) if next_run.month < 12 else next_run.replace(month=next_run.month + 1, day=1)
        
        logger.info(f"Scheduling daily storage cost calculation for 23:59 UTC (next run: {next_run})")
        
        scheduler.add_job(
            run_daily_cost_calculation,
            'cron',
            hour=23,
            minute=59,
            timezone='UTC',
            id='daily_storage_costs',
            name='Daily Storage Cost Calculation'
        )
        
        scheduler.start()
        logger.info("✅ APScheduler started - daily storage cost job scheduled")
        
    except ImportError:
        logger.warning("APScheduler not installed - daily jobs will need manual triggering via API")
    except Exception as e:
        logger.warning("APScheduler could not start (non-fatal): %s", e)
    
    yield


app = FastAPI(
    title="ColdSense AI Backend",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
_raw_origins = os.getenv("ALLOWED_ORIGINS", "")
_extra_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]
_allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    *_extra_origins,
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return JSONResponse({"status": "healthy", "service": "ColdSense API"})

@app.get("/")
async def root():
    return JSONResponse({"status": "healthy", "service": "ColdSense API", "docs": "/docs"})

app.include_router(router)
