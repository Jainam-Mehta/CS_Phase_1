from fastapi import APIRouter

from app.services.sensor_service import latest_sensor_reading
from app.services.door_service import get_door_status
from app.api import auth, sites, products, inventory, orders, finance, energy, alerts, market

router = APIRouter()

# Include all API routers
router.include_router(auth.router, prefix="/auth", tags=["authentication"])
router.include_router(sites.router, prefix="/sites", tags=["sites"])
router.include_router(products.router, prefix="/products", tags=["products"])
router.include_router(inventory.router, prefix="/inventory", tags=["inventory"])
router.include_router(orders.router, prefix="/orders", tags=["orders"])
router.include_router(finance.router, prefix="/finance", tags=["finance"])
router.include_router(energy.router, prefix="/energy", tags=["energy"])
router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
router.include_router(market.router, prefix="/market", tags=["market"])

# Legacy sensor endpoints (keep for MQTT compatibility)
@router.get("/latest-reading")
def latest():
    return latest_sensor_reading()


@router.get("/door-status")
def door_status():
    """
    Get comprehensive door status including current states, frequency, duration, and alerts.
    """
    return get_door_status()