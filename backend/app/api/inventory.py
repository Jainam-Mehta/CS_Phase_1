"""
Inventory API — ColdSense Backend

Real tables:
  batches              (id, batch_code, farmer_id, product_id, harvest_date,
                        expiry_date, initial_quantity_kg, remaining_quantity_kg,
                        quality_grade, remarks)
  batch_room_allocations (batch_id, room_id, quantity_kg, assigned_at, removed_at)
  products             (id, name, shelf_life_days, storage_temp_min/max, ...)
  farmer_room_access   (farmer_id, room_id, status)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, date, timedelta

from app.database.supabase import supabase

router = APIRouter()


class BatchResponse(BaseModel):
    id: str
    batch_code: str
    farmer_id: str
    product_id: str
    harvest_date: Optional[str] = None
    expiry_date: Optional[str] = None
    initial_quantity_kg: float
    remaining_quantity_kg: float
    quality_grade: Optional[str] = None
    product_name: Optional[str] = None


class BatchCreate(BaseModel):
    farmer_id: str
    product_id: str
    room_id: str
    quantity_kg: float
    harvest_date: Optional[date] = None
    quality_grade: Optional[str] = "GOOD"
    remarks: Optional[str] = None


@router.get("/room/{room_id}", response_model=List[BatchResponse])
async def get_room_inventory(room_id: str):
    """Return all active (not removed) batch allocations for a room."""
    try:
        resp = (
            supabase.table("batch_room_allocations")
            .select("""
                quantity_kg, assigned_at,
                batches!inner(
                  id, batch_code, farmer_id, product_id,
                  harvest_date, expiry_date,
                  initial_quantity_kg, remaining_quantity_kg,
                  quality_grade, remarks,
                  products(name)
                )
            """)
            .eq("room_id", room_id)
            .is_("removed_at", "null")
            .execute()
        )

        result = []
        for alloc in (resp.data or []):
            b = alloc["batches"]
            prod = b.get("products") or {}
            if isinstance(prod, list):
                prod = prod[0] if prod else {}
            result.append({
                "id": b["id"],
                "batch_code": b["batch_code"],
                "farmer_id": b["farmer_id"],
                "product_id": b["product_id"],
                "harvest_date": b.get("harvest_date"),
                "expiry_date": b.get("expiry_date"),
                "initial_quantity_kg": float(b.get("initial_quantity_kg") or 0),
                "remaining_quantity_kg": float(alloc.get("quantity_kg") or b.get("remaining_quantity_kg") or 0),
                "quality_grade": b.get("quality_grade"),
                "product_name": prod.get("name"),
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch room inventory: {e}")


@router.get("/farmer/{profile_id}", response_model=List[BatchResponse])
async def get_farmer_inventory(profile_id: str):
    """Return all active batch allocations for a farmer across all rooms."""
    try:
        resp = (
            supabase.table("batch_room_allocations")
            .select("""
                quantity_kg, room_id,
                batches!inner(
                  id, batch_code, farmer_id, product_id,
                  harvest_date, expiry_date,
                  initial_quantity_kg, remaining_quantity_kg, quality_grade,
                  products(name)
                )
            """)
            .eq("batches.farmer_id", profile_id)
            .is_("removed_at", "null")
            .execute()
        )

        result = []
        for alloc in (resp.data or []):
            b = alloc["batches"]
            prod = b.get("products") or {}
            if isinstance(prod, list):
                prod = prod[0] if prod else {}
            result.append({
                "id": b["id"],
                "batch_code": b["batch_code"],
                "farmer_id": b["farmer_id"],
                "product_id": b["product_id"],
                "harvest_date": b.get("harvest_date"),
                "expiry_date": b.get("expiry_date"),
                "initial_quantity_kg": float(b.get("initial_quantity_kg") or 0),
                "remaining_quantity_kg": float(alloc.get("quantity_kg") or b.get("remaining_quantity_kg") or 0),
                "quality_grade": b.get("quality_grade"),
                "product_name": prod.get("name"),
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch farmer inventory: {e}")


@router.post("/batch/", response_model=BatchResponse)
async def create_batch(data: BatchCreate):
    """Create a batch and allocate it to a room in one step."""
    try:
        # Get product shelf life for expiry calculation
        prod_resp = (
            supabase.table("products")
            .select("name, shelf_life_days")
            .eq("id", data.product_id)
            .maybeSingle()
            .execute()
        )
        product = prod_resp.data or {}
        shelf_life = int(product.get("shelf_life_days") or 30)
        harvest = data.harvest_date or date.today()
        expiry = harvest + timedelta(days=shelf_life)

        batch_code = f"BTH-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
        batch_payload = {
            "batch_code": batch_code,
            "farmer_id": data.farmer_id,
            "product_id": data.product_id,
            "harvest_date": str(harvest),
            "expiry_date": str(expiry),
            "initial_quantity_kg": data.quantity_kg,
            "remaining_quantity_kg": data.quantity_kg,
            "quality_grade": data.quality_grade or "GOOD",
            "remarks": data.remarks,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        batch_resp = supabase.table("batches").insert(batch_payload).execute()
        if not batch_resp.data:
            raise HTTPException(status_code=500, detail="Failed to create batch")
        batch = batch_resp.data[0]

        # Allocate to room
        alloc_payload = {
            "batch_id": batch["id"],
            "room_id": data.room_id,
            "quantity_kg": data.quantity_kg,
            "assigned_at": datetime.now(timezone.utc).isoformat(),
        }
        supabase.table("batch_room_allocations").insert(alloc_payload).execute()

        return {
            "id": batch["id"],
            "batch_code": batch["batch_code"],
            "farmer_id": batch["farmer_id"],
            "product_id": batch["product_id"],
            "harvest_date": batch.get("harvest_date"),
            "expiry_date": batch.get("expiry_date"),
            "initial_quantity_kg": float(batch.get("initial_quantity_kg") or 0),
            "remaining_quantity_kg": float(batch.get("remaining_quantity_kg") or 0),
            "quality_grade": batch.get("quality_grade"),
            "product_name": product.get("name"),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create batch: {e}")
