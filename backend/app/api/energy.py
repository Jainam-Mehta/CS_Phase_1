"""
Energy API — ColdSense Backend

Real table: `energy_usage`
  id, room_id, solar_kwh, grid_kwh, total_kwh, recorded_at
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone

from app.database.supabase import supabase

router = APIRouter()


class EnergyUsageResponse(BaseModel):
    id: str
    room_id: Optional[str] = None
    solar_kwh: Optional[float] = None
    grid_kwh: Optional[float] = None
    total_kwh: Optional[float] = None
    recorded_at: Optional[str] = None


class EnergyUsageCreate(BaseModel):
    room_id: str
    solar_kwh: float = 0.0
    grid_kwh: float = 0.0
    total_kwh: Optional[float] = None


@router.get("/room/{room_id}", response_model=List[EnergyUsageResponse])
async def get_room_energy(room_id: str, limit: int = 24):
    """Get recent energy readings for a room."""
    try:
        resp = (
            supabase.table("energy_usage")
            .select("*")
            .eq("room_id", room_id)
            .order("recorded_at", desc=True)
            .limit(limit)
            .execute()
        )
        return resp.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch room energy: {e}")


@router.get("/facility/{facility_id}/summary")
async def get_facility_energy_summary(facility_id: str):
    """
    Aggregate energy across all rooms of a facility.
    Returns totals: solar_kwh, grid_kwh, total_kwh, cost_saved (₹8/kWh solar).
    """
    try:
        # Get rooms for this facility
        rooms_resp = (
            supabase.table("cold_storage_rooms")
            .select("id")
            .eq("facility_id", facility_id)
            .execute()
        )
        room_ids = [r["id"] for r in (rooms_resp.data or [])]
        if not room_ids:
            return {"solar_kwh": 0, "grid_kwh": 0, "total_kwh": 0, "cost_saved": 0}

        # Get latest reading per room
        energy_resp = (
            supabase.table("energy_usage")
            .select("room_id, solar_kwh, grid_kwh, total_kwh")
            .in_("room_id", room_ids)
            .order("recorded_at", desc=True)
            .execute()
        )

        seen: set = set()
        solar_total = grid_total = kwh_total = 0.0
        for row in (energy_resp.data or []):
            if row["room_id"] in seen:
                continue
            seen.add(row["room_id"])
            solar_total += float(row.get("solar_kwh") or 0)
            grid_total += float(row.get("grid_kwh") or 0)
            kwh_total += float(row.get("total_kwh") or 0)

        return {
            "solar_kwh": round(solar_total, 2),
            "grid_kwh": round(grid_total, 2),
            "total_kwh": round(kwh_total, 2),
            "cost_saved": round(solar_total * 8, 2),  # ₹8/kWh solar saving
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch facility energy: {e}")


@router.post("/", response_model=EnergyUsageResponse)
async def create_energy_reading(data: EnergyUsageCreate):
    """Insert a new energy reading (called by the simulator / MQTT pipeline)."""
    try:
        payload = data.dict()
        if payload.get("total_kwh") is None:
            payload["total_kwh"] = payload["solar_kwh"] + payload["grid_kwh"]
        payload["recorded_at"] = datetime.now(timezone.utc).isoformat()

        resp = supabase.table("energy_usage").insert(payload).execute()
        if not resp.data:
            raise HTTPException(status_code=500, detail="Insert returned no data")
        return resp.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to insert energy reading: {e}")
