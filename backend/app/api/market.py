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
import httpx

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


@router.get("/prices/site/{site_id}")
async def get_prices_by_site(site_id: str, product_name: Optional[str] = None):
    """
    Return market prices for a site based on its locality.
    
    Query logic:
    1. Get site from sites table (locality_id)
    2. Get locality name from localities table
    3. Get state from districts via locality
    4. Query market_prices with city=locality_name AND state=state_name
    
    If product_name provided, filter to that product only.
    """
    try:
        # Get site with its locality and state
        site_resp = (
            supabase.table("sites")
            .select("id, locality_id, state_id, district_id")
            .eq("id", site_id)
            .single()
            .execute()
        )
        
        if not site_resp.data:
            raise HTTPException(status_code=404, detail="Site not found")
        
        site = site_resp.data
        locality_id = site.get("locality_id")
        state_id = site.get("state_id")
        
        if not locality_id or not state_id:
            raise HTTPException(status_code=400, detail="Site missing locality or state")
        
        # Get locality name and state name
        locality_resp = (
            supabase.table("localities")
            .select("name")
            .eq("id", locality_id)
            .single()
            .execute()
        )
        
        state_resp = (
            supabase.table("states")
            .select("name")
            .eq("id", state_id)
            .single()
            .execute()
        )
        
        locality_name = locality_resp.data.get("name") if locality_resp.data else None
        state_name = state_resp.data.get("name") if state_resp.data else None
        
        if not locality_name or not state_name:
            raise HTTPException(status_code=400, detail="Could not resolve site location")
        
        # Query market prices for this locality and state
        q = (
            supabase.table("market_prices")
            .select("*")
            .eq("state", state_name)
            .eq("city", locality_name)
            .order("recorded_at", desc=True)
        )
        
        # Filter by product if provided
        if product_name:
            # Since market_prices doesn't have product_name as a field, we'll need to 
            # get prices and filter in-app. Alternative: query by market_name pattern
            q = q.order("recorded_at", desc=True).limit(500)
        else:
            q = q.limit(500)
        
        resp = q.execute()
        
        # Filter by product if needed
        result = resp.data or []
        if product_name:
            result = [r for r in result if product_name.lower() in r.get("market_name", "").lower()]
        
        return {
            "site_id": site_id,
            "locality": locality_name,
            "state": state_name,
            "prices": result,
            "count": len(result)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch prices for site: {str(e)}")


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


@router.post("/fetch-prices")
async def fetch_market_prices_manual(source: str = "nsamis"):
    """
    Manually fetch and store market prices from NSAMIS API.
    Call this endpoint to refresh prices in the database.
    Prices are stored for 7 days, then overwritten on next fetch.
    
    Usage: POST /api/market/fetch-prices?source=nsamis
    
    Returns:
        - count: Number of prices fetched and stored
        - products: Number of unique products
        - states: Number of unique states
    """
    try:
        print(f"🔄 Starting manual market price fetch from {source}...")
        
        # Fetch price data
        prices_data = await fetch_nsamis_sample_data()
        
        if not prices_data:
            raise HTTPException(status_code=500, detail="Failed to fetch price data")
        
        # Delete old prices for all states (7-day rolling window)
        try:
            states = list(set(p.get('state') for p in prices_data if p.get('state')))
            for state in states:
                supabase.table('market_prices').delete().eq('state', state).execute()
                print(f"  Cleared old prices for {state}")
        except Exception as e:
            print(f"  Warning: Could not clear old prices: {str(e)}")
        
        # Insert new prices
        records_to_insert = []
        current_time = datetime.now(timezone.utc).isoformat()
        
        for price in prices_data:
            record = {
                "product_id": None,
                "state": price.get('state'),
                "city": price.get('city'),
                "market_name": price.get('market_name'),
                "price_per_kg": float(price.get('price_per_kg', 0)),
                "recorded_at": current_time,
                "source": source,
                "api_source": source,
                "is_verified": True,
                "last_updated": current_time
            }
            records_to_insert.append(record)
        
        if records_to_insert:
            result = supabase.table('market_prices').insert(records_to_insert).execute()
            stored = len(result.data) if result.data else len(records_to_insert)
        else:
            stored = 0
        
        # Get summary
        unique_products = len(set(p['market_name'] for p in prices_data))
        unique_states = len(set(p['state'] for p in prices_data))
        
        print(f"✅ Stored {stored} prices for {unique_products} products across {unique_states} states")
        
        return {
            "success": True,
            "count": stored,
            "products": unique_products,
            "states": unique_states,
            "source": source,
            "message": f"Successfully stored {stored} market prices"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching market prices: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch prices: {str(e)}")


@router.get("/prices/summary")
async def get_price_summary():
    """
    Get a summary of available market prices in the database.
    Shows unique products, states, and cities covered.
    """
    try:
        result = supabase.table('market_prices').select('*').execute()
        
        if not result.data:
            return {
                "total_records": 0,
                "unique_products": 0,
                "unique_states": 0,
                "unique_cities": 0,
                "message": "No market prices available"
            }
        
        products = set(r['market_name'] for r in result.data if r.get('market_name'))
        states = set(r['state'] for r in result.data if r.get('state'))
        cities = set(r['city'] for r in result.data if r.get('city'))
        
        return {
            "total_records": len(result.data),
            "unique_products": len(products),
            "unique_states": len(states),
            "unique_cities": len(cities),
            "products": sorted(list(products)),
            "states": sorted(list(states)),
            "cities": sorted(list(cities))
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get summary: {str(e)}")


async def fetch_nsamis_sample_data():
    """
    Fetch sample market price data.
    This is a placeholder - replace with actual NSAMIS API integration.
    
    Sample structure:
    {
        "product_name": "Tomato",
        "state": "Karnataka",
        "city": "Bengaluru",
        "market_name": "KR Market",
        "price_per_kg": 45.50
    }
    """
    try:
        # Sample data for demonstration
        # In production, this would call the actual NSAMIS API
        sample_prices = [
            # Karnataka - Bengaluru
            {"product_name": "Artichoke", "state": "Karnataka", "city": "Bengaluru", "market_name": "KR Market", "price_per_kg": 45.50},
            {"product_name": "Arugula", "state": "Karnataka", "city": "Bengaluru", "market_name": "KR Market", "price_per_kg": 38.75},
            {"product_name": "Tomato", "state": "Karnataka", "city": "Bengaluru", "market_name": "KR Market", "price_per_kg": 32.00},
            {"product_name": "Potato", "state": "Karnataka", "city": "Bengaluru", "market_name": "KR Market", "price_per_kg": 28.50},
            
            # Maharashtra - Pune
            {"product_name": "Artichoke", "state": "Maharashtra", "city": "Pune", "market_name": "Pune Market", "price_per_kg": 46.25},
            {"product_name": "Arugula", "state": "Maharashtra", "city": "Pune", "market_name": "Pune Market", "price_per_kg": 39.50},
            {"product_name": "Tomato", "state": "Maharashtra", "city": "Pune", "market_name": "Pune Market", "price_per_kg": 33.00},
            
            # Punjab - Ludhiana
            {"product_name": "Artichoke", "state": "Punjab", "city": "Ludhiana", "market_name": "Ludhiana Market", "price_per_kg": 44.75},
            {"product_name": "Arugula", "state": "Punjab", "city": "Ludhiana", "market_name": "Ludhiana Market", "price_per_kg": 38.00},
            {"product_name": "Tomato", "state": "Punjab", "city": "Ludhiana", "market_name": "Ludhiana Market", "price_per_kg": 31.00},
        ]
        
        print(f"📊 Loaded {len(sample_prices)} sample price records")
        return sample_prices
        
    except Exception as e:
        print(f"❌ Error loading sample data: {str(e)}")
        return None
