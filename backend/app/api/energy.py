"""
Energy API
Calculate hourly energy consumption based on quantity and product
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta

from app.database.supabase import supabase

router = APIRouter()

class EnergyResponse(BaseModel):
    id: str
    site_id: str
    product_id: Optional[str]
    quantity: float
    hourly_kwh: float
    daily_kwh: float
    recorded_at: str

class EnergyCreate(BaseModel):
    site_id: str
    product_id: Optional[str] = None
    quantity: float

@router.get("/site/{site_id}", response_model=List[EnergyResponse])
async def get_site_energy(site_id: str):
    """
    Get energy consumption for a specific site
    """
    try:
        response = supabase.table("energy_consumption").select("*").eq("site_id", site_id).order("recorded_at", desc=True).limit(24).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch energy data: {str(e)}")

@router.get("/latest/{site_id}")
async def get_latest_energy(site_id: str):
    """
    Get latest energy consumption for a site
    """
    try:
        response = supabase.table("energy_consumption").select("*").eq("site_id", site_id).order("recorded_at", desc=True).limit(1).execute()
        
        if not response.data:
            return {"hourly_kwh": 0, "daily_kwh": 0}
        
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch latest energy: {str(e)}")

@router.post("/calculate")
async def calculate_energy(energy: EnergyCreate):
    """
    Calculate hourly energy consumption based on quantity and product
    Formula: Hourly Energy = (Base Daily Consumption × Quantity / Base Capacity) / 24
    """
    try:
        # Get product details if product_id is provided
        base_daily_kwh = 10.0  # Default base consumption
        base_capacity = 1000.0  # Default base capacity
        
        if energy.product_id:
            product_response = supabase.table("products").select("*").eq("id", energy.product_id).execute()
            if product_response.data:
                product = product_response.data[0]
                base_daily_kwh = product["base_daily_kwh"]
                base_capacity = product["base_capacity"]
        
        # Calculate hourly energy
        hourly_kwh = (base_daily_kwh * energy.quantity / base_capacity) / 24
        daily_kwh = hourly_kwh * 24
        
        # Store in database
        energy_data = {
            "site_id": energy.site_id,
            "product_id": energy.product_id,
            "quantity": energy.quantity,
            "hourly_kwh": hourly_kwh,
            "daily_kwh": daily_kwh,
            "recorded_at": datetime.now().isoformat()
        }
        
        response = supabase.table("energy_consumption").insert(energy_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to store energy data")
        
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate energy: {str(e)}")

@router.post("/update-hourly")
async def update_hourly_energy():
    """
    Hourly job to update energy consumption for all sites
    Should be called once per hour
    """
    try:
        # Get all sites
        sites_response = supabase.table("sites").select("*").execute()
        
        updated_count = 0
        
        for site in sites_response.data:
            # Get inventory for this site
            inventory_response = supabase.table("inventory").select("*").eq("site_id", site["id"]).execute()
            
            if inventory_response.data:
                # Calculate total quantity
                total_quantity = sum(item["quantity"] for item in inventory_response.data)
                
                # Use first product's energy model (simplified)
                if inventory_response.data:
                    product_id = inventory_response.data[0]["product_id"]
                    
                    # Calculate energy
                    base_daily_kwh = 10.0
                    base_capacity = 1000.0
                    
                    product_response = supabase.table("products").select("*").eq("id", product_id).execute()
                    if product_response.data:
                        product = product_response.data[0]
                        base_daily_kwh = product["base_daily_kwh"]
                        base_capacity = product["base_capacity"]
                    
                    hourly_kwh = (base_daily_kwh * total_quantity / base_capacity) / 24
                    daily_kwh = hourly_kwh * 24
                    
                    # Store energy data
                    energy_data = {
                        "site_id": site["id"],
                        "product_id": product_id,
                        "quantity": total_quantity,
                        "hourly_kwh": hourly_kwh,
                        "daily_kwh": daily_kwh,
                        "recorded_at": datetime.now().isoformat()
                    }
                    
                    supabase.table("energy_consumption").insert(energy_data).execute()
                    updated_count += 1
        
        return {"message": f"Updated energy for {updated_count} sites"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update hourly energy: {str(e)}")
