"""
Sites API
CRUD operations for cold storage sites
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

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
    location: str
    category: str
    capacity: float
    temperature: Optional[float] = 0.0
    humidity: Optional[float] = 0.0

class SiteUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    category: Optional[str] = None
    capacity: Optional[float] = None
    current_load: Optional[float] = None
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    health_score: Optional[int] = None

@router.get("/", response_model=List[SiteResponse])
async def get_all_sites():
    """
    Get all sites
    """
    try:
        response = supabase.table("sites").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch sites: {str(e)}")

@router.get("/{site_id}", response_model=SiteResponse)
async def get_site(site_id: str):
    """
    Get a specific site by ID
    """
    try:
        response = supabase.table("sites").select("*").eq("id", site_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Site not found")
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch site: {str(e)}")

@router.get("/user/{user_id}", response_model=List[SiteResponse])
async def get_user_sites(user_id: str):
    """
    Get all sites assigned to a user
    """
    try:
        response = supabase.table("user_sites").select(
            "*, sites(*)"
        ).eq("user_id", user_id).execute()
        
        sites = []
        for site_relation in response.data:
            sites.append(site_relation["sites"])
        
        return sites
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch user sites: {str(e)}")

@router.post("/", response_model=SiteResponse)
async def create_site(site: SiteCreate):
    """
    Create a new site
    """
    try:
        site_data = site.dict()
        site_data["current_load"] = 0.0
        site_data["health_score"] = 100
        
        response = supabase.table("sites").insert(site_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create site")
        
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create site: {str(e)}")

@router.put("/{site_id}", response_model=SiteResponse)
async def update_site(site_id: str, site: SiteUpdate):
    """
    Update an existing site
    """
    try:
        # Build update dict with only provided fields
        update_data = {k: v for k, v in site.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now().isoformat()
        
        response = supabase.table("sites").update(update_data).eq("id", site_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Site not found")
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update site: {str(e)}")

@router.delete("/{site_id}")
async def delete_site(site_id: str):
    """
    Delete a site
    """
    try:
        response = supabase.table("sites").delete().eq("id", site_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Site not found")
        
        return {"message": "Site deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete site: {str(e)}")
