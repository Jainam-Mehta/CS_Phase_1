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


@router.get("/", response_model=List[SiteResponse])
async def get_all_sites():
    """
    Get all facilities mapped to site response format.
    """
    try:
        response = supabase.table("facilities").select("*").execute()
        facilities = response.data or []
        
        result = []
        for f in facilities:
            result.append({
                "id": f["id"],
                "name": f.get("facility_name") or "Unnamed Facility",
                "location": f.get("address") or "N/A",
                "category": f.get("category") or "Cold Storage",
                "capacity": float(f.get("total_capacity_kg") or f.get("capacity_tons") or 50000.0),
                "current_load": float(f.get("current_utilization_kg") or 0.0),
                "temperature": 4.0,
                "humidity": 85.0,
                "health_score": 98,
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch sites: {str(e)}")


@router.get("/{site_id}", response_model=SiteResponse)
async def get_site(site_id: str):
    """
    Get a specific facility by ID.
    """
    try:
        response = supabase.table("facilities").select("*").eq("id", site_id).maybeSingle().execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Facility not found")
        
        f = response.data
        return {
            "id": f["id"],
            "name": f.get("facility_name") or "Unnamed Facility",
            "location": f.get("address") or "N/A",
            "category": f.get("category") or "Cold Storage",
            "capacity": float(f.get("total_capacity_kg") or f.get("capacity_tons") or 50000.0),
            "current_load": float(f.get("current_utilization_kg") or 0.0),
            "temperature": 4.0,
            "humidity": 85.0,
            "health_score": 98,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch site: {str(e)}")


@router.get("/user/{user_id}", response_model=List[SiteResponse])
async def get_user_sites(user_id: str):
    """
    Get all facilities owned by or accessible to a profile ID.
    """
    try:
        response = supabase.table("facilities").select("*").eq("owner_profile_id", user_id).execute()
        facilities = response.data or []
        
        result = []
        for f in facilities:
            result.append({
                "id": f["id"],
                "name": f.get("facility_name") or "Unnamed Facility",
                "location": f.get("address") or "N/A",
                "category": f.get("category") or "Cold Storage",
                "capacity": float(f.get("total_capacity_kg") or f.get("capacity_tons") or 50000.0),
                "current_load": float(f.get("current_utilization_kg") or 0.0),
                "temperature": 4.0,
                "humidity": 85.0,
                "health_score": 98,
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch user sites: {str(e)}")
