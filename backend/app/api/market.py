"""
Market Intelligence API — ColdSense Backend

Real tables:
  market_prices      (product_id, state, city, market_name, price_per_kg, recorded_at)
  market_predictions (product_id, state, city, predicted_price, prediction_date, confidence)
  products           (id, name, ...)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, date

from app.database.supabase import supabase

router = APIRouter()


class MarketPriceResponse(BaseModel):
    id: str
    product_id: str
    product_name: Optional[str] = None
    state: str
    city: Optional[str] = None
    market_name: Optional[str] = None
    price_per_kg: float
    recorded_at: str


class MarketPriceCreate(BaseModel):
    product_id: str
    state: str
    city: Optional[str] = None
    market_name: Optional[str] = None
    price_per_kg: float
    source: Optional[str] = None


@router.get("/prices/product/{product_id}", response_model=List[MarketPriceResponse])
async def get_product_prices(product_id: str, state: Optional[str] = None):
    """Return market prices for a product, optionally filtered by state."""
    try:
        q = (
            supabase.table("market_prices")
            .select("*, products(name)")
            .eq("product_id", product_id)
            .order("recorded_at", desc=True)
            .limit(50)
        )
        if state:
            q = q.eq("state", state)

        resp = q.execute()
        result = []
        for row in (resp.data or []):
            prod = row.get("products") or {}
            if isinstance(prod, list):
                prod = prod[0] if prod else {}
            result.append({
                **row,
                "product_name": prod.get("name"),
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch market prices: {e}")


@router.get("/prices/state/{state}")
async def get_state_prices(state: str):
    """Return all latest market prices for a state."""
    try:
        resp = (
            supabase.table("market_prices")
            .select("*, products(name)")
            .eq("state", state)
            .order("recorded_at", desc=True)
            .limit(100)
            .execute()
        )
        result = []
        for row in (resp.data or []):
            prod = row.get("products") or {}
            if isinstance(prod, list):
                prod = prod[0] if prod else {}
            result.append({**row, "product_name": prod.get("name")})
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch state prices: {e}")


@router.get("/predictions/product/{product_id}")
async def get_price_predictions(product_id: str):
    """Return AI price predictions for a product."""
    try:
        resp = (
            supabase.table("market_predictions")
            .select("*")
            .eq("product_id", product_id)
            .order("prediction_date", desc=True)
            .limit(30)
            .execute()
        )
        return resp.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch predictions: {e}")


@router.post("/prices/", response_model=MarketPriceResponse)
async def create_market_price(data: MarketPriceCreate):
    """Insert a new market price record."""
    try:
        payload = data.dict()
        payload["recorded_at"] = datetime.now(timezone.utc).isoformat()
        payload["created_at"] = payload["recorded_at"]

        resp = supabase.table("market_prices").insert(payload).execute()
        if not resp.data:
            raise HTTPException(status_code=500, detail="Insert returned no data")
        row = resp.data[0]
        return {**row, "product_name": None}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create price record: {e}")
