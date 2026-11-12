"""
Seed/Demo Data API - REMOVED
This file is no longer used. Demo data endpoints have been removed.
Working with real farmer data only.
"""

from fastapi import APIRouter, HTTPException
from app.database.supabase import supabase

router = APIRouter(prefix="/seed", tags=["seed"])


@router.get("/check-data")
async def check_data():
    """Diagnostic endpoint to check why farmer_daily_storage_costs is empty"""
    try:
        # 1. Check active allocations
        allocs = supabase.table("batch_room_allocations").select("""
            id, batch_id, room_id, quantity_kg, assigned_at, removed_at
        """).is_('removed_at', None).execute()
        
        # 2. Check room pricing
        pricing = supabase.table("room_pricing").select("""
            id, room_id, price_per_crate, effective_from, effective_until
        """).execute()
        
        # 3. Check daily costs already calculated
        costs = supabase.table("farmer_daily_storage_costs").select("""
            id, farmer_id, room_id, cost_date, daily_cost, payment_status
        """).limit(5).execute()
        
        # 4. Get all rooms
        rooms = supabase.table("cold_storage_rooms").select("""
            id, room_name, site_id
        """).execute()
        
        return {
            "active_allocations": len(allocs.data or []),
            "allocation_sample": (allocs.data or [])[:3],
            "room_pricing_records": len(pricing.data or []),
            "pricing_sample": (pricing.data or [])[:3],
            "daily_costs_calculated": len(costs.data or []),
            "cost_sample": (costs.data or [])[:3],
            "total_rooms": len(rooms.data or []),
            "rooms": (rooms.data or [])[:5],
            "diagnosis": {
                "has_allocations": len(allocs.data or []) > 0,
                "has_pricing": len(pricing.data or []) > 0,
                "has_costs": len(costs.data or []) > 0,
                "issue": "Missing pricing" if len(pricing.data or []) == 0 else "Check allocation/cost sync"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
