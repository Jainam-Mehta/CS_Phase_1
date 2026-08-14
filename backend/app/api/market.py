"""
Market Intelligence API
Current prices, changes, nearby markets per site
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from app.database.supabase import supabase

router = APIRouter()

class MarketValueResponse(BaseModel):
    id: str
    product_id: str
    site_id: str
    current_price: float
    price_change: float
    demand_level: str
    supply_level: str
    forecast: str

class MarketValueCreate(BaseModel):
    product_id: str
    site_id: str
    current_price: float
    price_change: float
    demand_level: str
    supply_level: str
    forecast: str

# Nearby markets for each site
NEARBY_MARKETS = {
    "hamirpur-id": [
        {"name": "Hamirpur APMC", "distance": "5 km", "avg_price": "₹115/kg", "demand": "high"},
        {"name": "Mandi Market", "distance": "35 km", "avg_price": "₹125/kg", "demand": "moderate"},
        {"name": "Kullu Market", "distance": "50 km", "avg_price": "₹130/kg", "demand": "high"},
        {"name": "Shimla Mandi", "distance": "120 km", "avg_price": "₹140/kg", "demand": "high"}
    ],
    "bajaura-id": [
        {"name": "Bajaura Market", "distance": "2 km", "avg_price": "₹80/kg", "demand": "moderate"},
        {"name": "Kullu Market", "distance": "45 km", "avg_price": "₹88/kg", "demand": "high"},
        {"name": "Mandi Market", "distance": "60 km", "avg_price": "₹90/kg", "demand": "moderate"},
        {"name": "Aut Market", "distance": "15 km", "avg_price": "₹82/kg", "demand": "moderate"}
    ]
}

@router.get("/values/{site_id}", response_model=List[MarketValueResponse])
async def get_market_values(site_id: str):
    """
    Get market values for a specific site
    """
    try:
        response = supabase.table("market_values").select("*, products(*)").eq("site_id", site_id).execute()
        
        # Enrich with product names
        enriched_values = []
        for item in response.data:
            item_data = item.copy()
            if "products" in item:
                item_data["product_name"] = item["products"]["name"]
            enriched_values.append(item_data)
        
        return enriched_values
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch market values: {str(e)}")

@router.get("/markets/{site_id}")
async def get_nearby_markets(site_id: str):
    """
    Get nearby markets for a specific site
    """
    try:
        markets = NEARBY_MARKETS.get(site_id, [])
        return {"site_id": site_id, "markets": markets}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch nearby markets: {str(e)}")

@router.post("/values", response_model=MarketValueResponse)
async def create_market_value(market_value: MarketValueCreate):
    """
    Create a new market value entry
    """
    try:
        market_data = market_value.dict()
        
        response = supabase.table("market_values").insert(market_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create market value")
        
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create market value: {str(e)}")

@router.put("/values/{market_value_id}", response_model=MarketValueResponse)
async def update_market_value(market_value_id: str, market_value: MarketValueCreate):
    """
    Update an existing market value
    """
    try:
        market_data = market_value.dict()
        
        response = supabase.table("market_values").update(market_data).eq("id", market_value_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Market value not found")
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update market value: {str(e)}")
