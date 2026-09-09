import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start background services on startup."""
    # Start MQTT subscriber in a background daemon thread
    try:
        from app.mqtt.subscriber import start_subscriber
        start_subscriber()
        logger.info("MQTT subscriber background thread started.")
    except Exception as e:
        logger.warning("MQTT subscriber could not start (non-fatal): %s", e)
    yield
    # Cleanup on shutdown (nothing needed — thread is daemon)


app = FastAPI(
    title="ColdSense AI Backend",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow configured origins; fall back to localhost for local dev
_raw_origins = os.getenv("ALLOWED_ORIGINS", "")
_extra_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]
_allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    *_extra_origins,
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
