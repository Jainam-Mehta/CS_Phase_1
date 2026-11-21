"""
Farmer Room Access API — Feature 7

Allows farmers to:
- Query rooms they have access to
- Get products in a room (multi-product support)
- Check room compatibility for multiple products
- Track room status across all their facilities

SAFETY:
- All endpoints check farmer ownership via room_id FK
- No cross-farmer data leakage
- Read-only queries (no mutations)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone

from app.database.supabase import supabase

router = APIRouter()


# ── Pydantic models ────────────────────────────────────────────────────────────

class RoomInfoResponse(BaseModel):
    room_id: str
    room_name: str
    facility_id: str
    facility_name: str
    farmer_id: str
    current_temp: Optional[float] = None
    current_humidity: Optional[float] = None
    door_status: Optional[str] = None
    products_stored: List[str] = []
    alert_count: int = 0


class RoomProductResponse(BaseModel):
    product_id: str
    product_name: str
    in_storage: bool
    quantity: Optional[float] = None
    batch_id: Optional[str] = None
    compatible: Optional[bool] = None


class FarmerRoomsResponse(BaseModel):
    farmer_id: str
    room_count: int
    rooms: List[RoomInfoResponse] = []


# ── Helper functions ──────────────────────────────────────────────────────────

def _get_latest_conditions(room_id: str) -> dict:
    """Get latest temperature and humidity for a room."""
    try:
        resp = (
            supabase.table("cold_storage_conditions")
            .select("temperature_1, humidity_1, created_at")
            .eq("room_id", room_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if resp.data:
            row = resp.data[0]
            return {
                "temp": row.get("temperature_1"),
                "humidity": row.get("humidity_1"),
                "recorded_at": row.get("created_at")
            }
    except Exception:
        pass
    return {"temp": None, "humidity": None, "recorded_at": None}


def _count_room_alerts(room_id: str) -> int:
    """Count unacknowledged alerts for a room."""
    try:
        resp = (
            supabase.table("sensor_alerts")
            .select("id", count="exact")
            .eq("room_id", room_id)
            .eq("acknowledged", False)
            .execute()
        )
        return resp.count or 0
    except Exception:
        return 0


def _get_room_products(room_id: str) -> List[str]:
    """Get list of products currently stored in room."""
    try:
        resp = (
            supabase.table("farmer_batch_products")
            .select("product_id, products(name)")
            .eq("room_id", room_id)
            .order("created_at", desc=True)
            .execute()
        )
        if resp.data:
            # Deduplicate product names
            product_names = set()
            for row in resp.data:
                if row.get("products") and isinstance(row["products"], list):
                    for prod in row["products"]:
                        product_names.add(prod.get("name", "Unknown"))
                elif row.get("products") and isinstance(row["products"], dict):
                    product_names.add(row["products"].get("name", "Unknown"))
            return sorted(list(product_names))
    except Exception:
        pass
    return []


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/farmer/{farmer_id}", response_model=FarmerRoomsResponse)
async def get_farmer_rooms(farmer_id: str):
    """
    FEATURE 7: Get all rooms accessible by a farmer with status summary.
    
    Returns:
    - List of rooms farmer owns/manages
    - Current conditions (temp, humidity)
    - Products stored in each room
    - Alert count per room
    """
    try:
        # Get all rooms for this farmer
        rooms_resp = supabase.table("farmer_room_access").select("room_id").eq("farmer_id", farmer_id).execute()
        
        if not rooms_resp.data:
            return FarmerRoomsResponse(farmer_id=farmer_id, room_count=0, rooms=[])
        
        room_infos = []
        for room_access in rooms_resp.data:
            room_id = room_access["room_id"]
            
            # Get room details
            room_resp = (
                supabase.table("cold_storage_rooms")
                .select("*")
                .eq("id", room_id)
                .single()
                .execute()
            )
            if not room_resp.data:
                continue
            room = room_resp.data
            
            # Get facility name
            facility_resp = (
                supabase.table("sites")
                .select("facility_name")
                .eq("id", room.get("site_id", ""))
                .execute()
            )
            facility_name = facility_resp.data[0]["facility_name"] if facility_resp.data else "Unknown"
            
            # Get latest conditions
            conditions = _get_latest_conditions(room_id)
            
            # Get products in room
            products = _get_room_products(room_id)
            
            # Count alerts
            alert_count = _count_room_alerts(room_id)
            
            room_infos.append(RoomInfoResponse(
                room_id=room_id,
                room_name=room.get("room_code", f"Room {room_id[:8]}"),
                facility_id=room.get("site_id", ""),
                facility_name=facility_name,
                farmer_id=farmer_id,
                current_temp=conditions["temp"],
                current_humidity=conditions["humidity"],
                products_stored=products,
                alert_count=alert_count
            ))
        
        return FarmerRoomsResponse(
            farmer_id=farmer_id,
            room_count=len(room_infos),
            rooms=room_infos
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch farmer rooms: {str(e)}")


@router.get("/room/{room_id}/products", response_model=List[RoomProductResponse])
async def get_room_products_detailed(room_id: str, farmer_id: Optional[str] = None):
    """
    FEATURE 7: Get detailed product list for a room.
    
    Shows:
    - All products currently stored
    - Compatibility status with current room conditions
    - Batch and quantity information
    
    SAFETY: If farmer_id provided, verify ownership before returning.
    """
    try:
        # Verify access if farmer_id provided
        if farmer_id:
            access_resp = supabase.table("farmer_room_access").select("id").eq("room_id", room_id).eq("farmer_id", farmer_id).execute()
            if not access_resp.data:
                raise HTTPException(status_code=403, detail="Access denied: Not your room")
        
        # Get batches in room
        batch_resp = (
            supabase.table("farmer_batch_products")
            .select("id, product_id, quantity, products(id, name, min_temp, max_temp, min_humidity, max_humidity)")
            .eq("room_id", room_id)
            .execute()
        )
        
        if not batch_resp.data:
            return []
        
        # Get current room conditions for compatibility check
        conditions = _get_latest_conditions(room_id)
        current_temp = conditions["temp"]
        current_humidity = conditions["humidity"]
        
        product_responses = []
        for batch in batch_resp.data:
            product_data = batch.get("products")
            
            # Handle nested product data
            if isinstance(product_data, list) and len(product_data) > 0:
                product_data = product_data[0]
            elif not isinstance(product_data, dict):
                continue
            
            # Check compatibility
            compatible = None
            if current_temp is not None and current_humidity is not None:
                compatible = (
                    current_temp >= product_data.get("min_temp", 0) and
                    current_temp <= product_data.get("max_temp", 100) and
                    current_humidity >= product_data.get("min_humidity", 0) and
                    current_humidity <= product_data.get("max_humidity", 100)
                )
            
            product_responses.append(RoomProductResponse(
                product_id=product_data.get("id", ""),
                product_name=product_data.get("name", "Unknown"),
                in_storage=True,
                quantity=batch.get("quantity"),
                batch_id=batch.get("id"),
                compatible=compatible
            ))
        
        return product_responses
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get room products: {str(e)}")


@router.post("/room/{room_id}/check-all-compatible")
async def check_all_products_compatible(room_id: str, farmer_id: Optional[str] = None):
    """
    FEATURE 7: Batch check all stored products for compatibility.
    
    Returns:
    - Products compatible with current conditions
    - Products needing attention
    - Recommended actions
    """
    try:
        if farmer_id:
            access_resp = supabase.table("farmer_room_access").select("id").eq("room_id", room_id).eq("farmer_id", farmer_id).execute()
            if not access_resp.data:
                raise HTTPException(status_code=403, detail="Access denied")
        
        # Get all products in room with compatibility
        products = await get_room_products_detailed(room_id, farmer_id)
        
        compatible_products = [p for p in products if p.compatible]
        at_risk_products = [p for p in products if p.compatible is False]
        unknown_products = [p for p in products if p.compatible is None]
        
        return {
            "room_id": room_id,
            "total_products": len(products),
            "compatible": {
                "count": len(compatible_products),
                "products": [{"name": p.product_name, "batch_id": p.batch_id} for p in compatible_products]
            },
            "at_risk": {
                "count": len(at_risk_products),
                "products": [{"name": p.product_name, "batch_id": p.batch_id} for p in at_risk_products],
                "recommendation": "Adjust room conditions or move products to compatible storage"
            },
            "unknown": {
                "count": len(unknown_products),
                "reason": "Sensor data not available"
            },
            "last_checked": datetime.now(timezone.utc).isoformat()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check compatibility: {str(e)}")


@router.post("/room/{room_id}/initialize-alerts")
async def initialize_room_alerts(room_id: str, farmer_id: Optional[str] = None):
    """
    Initialize sensor thresholds for all products in a room.
    Called when farmer adds a product to a room.
    
    This enables automatic alert generation when temperature/humidity violates product requirements.
    
    SAFETY: If farmer_id provided, verify ownership before initializing.
    """
    try:
        # Verify access if farmer_id provided
        if farmer_id:
            access_resp = supabase.table("farmer_room_access").select("id").eq("room_id", room_id).eq("farmer_id", farmer_id).execute()
            if not access_resp.data:
                raise HTTPException(status_code=403, detail="Access denied: Not your room")
        
        # Get all products in this room
        batch_products = supabase.table("farmer_batch_products") \
            .select("product_id") \
            .eq("room_id", room_id) \
            .execute()
        
        if not batch_products.data:
            return {
                "message": "No products in room",
                "room_id": room_id,
                "alerts_initialized": 0
            }
        
        # Initialize thresholds for each product (this enables alerts)
        product_ids = [p["product_id"] for p in batch_products.data]
        initialized_count = 0
        
        for product_id in product_ids:
            from app.services.sensor_service import init_thresholds_from_product
            success = init_thresholds_from_product(room_id, product_id)
            if success:
                initialized_count += 1
        
        return {
            "message": f"Alert thresholds initialized for {initialized_count}/{len(product_ids)} products in room",
            "room_id": room_id,
            "alerts_initialized": initialized_count,
            "total_products": len(product_ids),
            "note": "Alerts will now be automatically generated when conditions exceed product thresholds"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize alerts: {str(e)}")
