from fastapi import APIRouter, Query
from typing import Optional

from app.services.sensor_service import get_latest_sensor_reading, get_latest_condition
from app.services.door_service import get_door_status
from app.api import auth, sites, products, inventory, orders, finance, energy, alerts, market, sensor, storage

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
router.include_router(sensor.router, prefix="/sensors", tags=["sensors"])
router.include_router(storage.router, prefix="/storage", tags=["storage"])

# Legacy sensor endpoints (keep for MQTT compatibility)
@router.get("/latest-reading")
def latest_reading(
    room_id: Optional[str] = Query(None, description="Room ID to get latest condition"),
    room_sensor_id: Optional[str] = Query(None, description="Room sensor ID to get latest reading")
):
    """
    Get latest sensor reading.
    - If room_id provided: returns latest condition from cold_storage_conditions
    - If room_sensor_id provided: returns latest reading from sensor_readings  
    - If neither: returns empty response
    """
    if room_id:
        return get_latest_condition(room_id) or {}
    elif room_sensor_id:
        return get_latest_sensor_reading(room_sensor_id) or {}
    return {"message": "Please provide either room_id or room_sensor_id"}


@router.get("/door-status")
def door_status():
    """
    Get comprehensive door status including current states, frequency, duration, and alerts.
    """
    return get_door_status()