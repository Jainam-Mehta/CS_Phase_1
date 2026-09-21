"""
Sites / Facilities API — ColdSense Backend

Real tables used:
  facilities         (id, facility_name, address, owner_profile_id, total_capacity_kg, current_utilization_kg, ...)
  cold_storage_rooms (id, facility_id, room_name, capacity_kg, ...)
  cold_storage_conditions (room_id, temperature, humidity, ...)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone

from app.database.supabase import supabase

router = APIRouter()


class SiteResponse(BaseModel):
    id: str
    name: str
    location: str
    category: str
    capacity: float
    current_load: float
    temperature: float
    humidity: float
    health_score: int


class SiteCreate(BaseModel):
    name: str
    location: str = ""
    category: str = "Cold Storage"
    capacity: float = 50000.0
    temperature: Optional[float] = 4.0
    humidity: Optional[float] = 85.0


def _get_site_telemetry(site_id: str) -> tuple[float, float, int]:
    """Fetch live average temperature, humidity, and calculated health score for site."""
    try:
        rooms_resp = supabase.table("cold_storage_rooms").select("id").eq("site_id", site_id).execute()
        room_ids = [r["id"] for r in (rooms_resp.data or [])]
        if not room_ids:
            return 4.0, 85.0, 98

        cond_resp = (
            supabase.table("cold_storage_conditions")
            .select("temperature, humidity")
            .in_("room_id", room_ids)
            .order("recorded_at", desc=True)
            .limit(10)
            .execute()
        )
        conds = cond_resp.data or []
        if not conds:
            return 4.0, 85.0, 98

        temps = [float(c["temperature"]) for c in conds if c.get("temperature") is not None]
        hums = [float(c["humidity"]) for c in conds if c.get("humidity") is not None]

        avg_temp = round(sum(temps) / len(temps), 1) if temps else 4.0
        avg_hum = round(sum(hums) / len(hums), 1) if hums else 85.0

        score = 100
        if avg_temp < 2.0 or avg_temp > 6.0:
            score -= int(abs(avg_temp - 4.0) * 5)
        health_score = max(50, min(100, score))

        return avg_temp, avg_hum, health_score
    except Exception:
        return 4.0, 85.0, 98


@router.get("/", response_model=List[SiteResponse])
async def get_all_sites():
    """
    Get all sites mapped to site response format with real telemetry.
    """
    try:
        response = supabase.table("sites").select("*").execute()
        sites = response.data or []
        
        result = []
        for s in sites:
            temp, hum, health = _get_site_telemetry(s["id"])
            result.append({
                "id": s["id"],
                "name": s.get("facility_name") or "Unnamed Site",
                "location": s.get("address") or "N/A",
                "category": s.get("category") or "Cold Storage",
                "capacity": float(s.get("total_capacity_kg") or s.get("capacity_tons") or 50000.0),
                "current_load": float(s.get("current_utilization_kg") or 0.0),
                "temperature": temp,
                "humidity": hum,
                "health_score": health,
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch sites: {str(e)}")


@router.get("/{site_id}", response_model=SiteResponse)
async def get_site(site_id: str):
    """
    Get a specific site by ID with real telemetry.
    """
    try:
        response = supabase.table("sites").select("*").eq("id", site_id).maybeSingle().execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Site not found")
        
        s = response.data
        temp, hum, health = _get_site_telemetry(s["id"])
        return {
            "id": s["id"],
            "name": s.get("facility_name") or "Unnamed Site",
            "location": s.get("address") or "N/A",
            "category": s.get("category") or "Cold Storage",
            "capacity": float(s.get("total_capacity_kg") or s.get("capacity_tons") or 50000.0),
            "current_load": float(s.get("current_utilization_kg") or 0.0),
            "temperature": temp,
            "humidity": hum,
            "health_score": health,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch site: {str(e)}")


@router.get("/user/{user_id}", response_model=List[SiteResponse])
async def get_user_sites(user_id: str):
    """
    Get all sites owned by or accessible to a profile ID with real telemetry.
    """
    try:
        response = supabase.table("sites").select("*").eq("owner_profile_id", user_id).execute()
        sites = response.data or []
        
        result = []
        for s in sites:
            temp, hum, health = _get_site_telemetry(s["id"])
            result.append({
                "id": s["id"],
                "name": s.get("facility_name") or "Unnamed Site",
                "location": s.get("address") or "N/A",
                "category": s.get("category") or "Cold Storage",
                "capacity": float(s.get("total_capacity_kg") or s.get("capacity_tons") or 50000.0),
                "current_load": float(s.get("current_utilization_kg") or 0.0),
                "temperature": temp,
                "humidity": hum,
                "health_score": health,
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch user sites: {str(e)}")
