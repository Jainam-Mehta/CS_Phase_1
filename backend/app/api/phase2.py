"""
Phase 2 APIs - Product Selection, Pricing, Billing, Investments
SystmII Cold Chain Platform - Phase 2 Complete Implementation

Flows:
1. Farmer requests site + selects products
2. Owner approves + sets pricing
3. Daily billing calculation (cumulative)
4. Stakeholder investments tracking
5. Revenue & payments
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date, timezone
from decimal import Decimal

from app.database.supabase import supabase

router = APIRouter()

# ============================================================================
# PHASE 2.1: PRODUCT SELECTION & FARMER SITE REQUESTS
# ============================================================================

class ProductSelectionItem(BaseModel):
    product_id: str
    quantity_kg: float
    product_type: Optional[str] = None

class FarmerSiteRequestCreate(BaseModel):
    farmer_id: str
    room_id: str
    products: List[ProductSelectionItem]
    remarks: Optional[str] = None

class FarmerSiteRequestResponse(BaseModel):
    id: str
    farmer_id: str
    room_id: str
    status: str
    requested_at: str
    approved_at: Optional[str]
    products: List[dict]
    remarks: Optional[str]

@router.post("/farmer/sites/request", response_model=dict)
async def create_farmer_site_request(data: FarmerSiteRequestCreate):
    """
    FLOW 1: Farmer requests site access + selects products
    
    1. Creates farmer_room_access record (status=Pending)
    2. Adds products to farmer_batch_products
    
    Response: {request_id, status, products}
    """
    try:
        # Step 1: Create farmer_room_access request
        access_data = {
            "farmer_id": data.farmer_id,
            "room_id": data.room_id,
            "status": "Pending",
            "requested_at": datetime.now(timezone.utc).isoformat(),
            "remarks": data.remarks or ""
        }
        
        access_response = supabase.table("farmer_room_access").insert(access_data).execute()
        
        if not access_response.data:
            raise HTTPException(status_code=500, detail="Failed to create site request")
        
        access_id = access_response.data[0]["id"]
        
        # Step 2: Add products to farmer_batch_products
        products_data = []
        for product in data.products:
            products_data.append({
                "farmer_room_access_id": access_id,
                "product_id": product.product_id,
                "quantity_kg": product.quantity_kg,
                "product_type": product.product_type,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        
        if products_data:
            products_response = supabase.table("farmer_batch_products").insert(products_data).execute()
            if not products_response.data:
                raise HTTPException(status_code=500, detail="Failed to add products")
        
        return {
            "request_id": access_id,
            "status": "Pending",
            "farmer_id": data.farmer_id,
            "room_id": data.room_id,
            "products_count": len(data.products),
            "total_quantity_kg": sum(p.quantity_kg for p in data.products),
            "requested_at": access_data["requested_at"],
            "message": "Site request submitted successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create request: {str(e)}")

@router.get("/farmer/sites/{farmer_id}", response_model=List[dict])
async def get_farmer_site_requests(farmer_id: str):
    """
    Get all site requests for a farmer (with products)
    """
    try:
        # Get all farmer_room_access records
        access_response = supabase.table("farmer_room_access").select("*").eq("farmer_id", farmer_id).execute()
        requests = access_response.data or []
        
        result = []
        for req in requests:
            # Get products for this request
            products_response = supabase.table("farmer_batch_products").select("*").eq("farmer_room_access_id", req["id"]).execute()
            products = products_response.data or []
            
            # Get room details
            room_response = supabase.table("cold_storage_rooms").select("*").eq("id", req["room_id"]).execute()
            room = room_response.data[0] if room_response.data else {}
            
            result.append({
                "request_id": req["id"],
                "farmer_id": req["farmer_id"],
                "room_id": req["room_id"],
                "room_name": room.get("room_name", "Unknown"),
                "status": req["status"],
                "requested_at": req["requested_at"],
                "approved_at": req.get("approved_at"),
                "products": [
                    {
                        "product_id": p["product_id"],
                        "quantity_kg": p["quantity_kg"],
                        "product_type": p.get("product_type")
                    }
                    for p in products
                ],
                "remarks": req.get("remarks")
            })
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch requests: {str(e)}")

@router.get("/products", response_model=List[dict])
async def get_all_products_phase2():
    """
    Get all products with temp/humidity ranges for product selection
    """
    try:
        response = supabase.table("products").select("*").execute()
        
        products = response.data or []
        return [
            {
                "id": p["id"],
                "name": p.get("name"),
                "storage_temp_min": p.get("storage_temp_min"),
                "storage_temp_max": p.get("storage_temp_max"),
                "storage_humidity_min": p.get("storage_humidity_min"),
                "storage_humidity_max": p.get("storage_humidity_max"),
                "shelf_life_days": p.get("shelf_life_days"),
                "ethylene_producer": p.get("ethylene_producer"),
                "ethylene_sensitive": p.get("ethylene_sensitive"),
                "category_id": p.get("category_id")
            }
            for p in products
        ]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch products: {str(e)}")

# ============================================================================
# PHASE 2.2: OWNER APPROVALS WITH PRODUCT DISPLAY
# ============================================================================

class ApprovalDecision(BaseModel):
    request_id: str
    approved: bool
    price_per_crate: Optional[float] = None
    remarks: Optional[str] = None

@router.get("/owner/approvals/pending", response_model=List[dict])
async def get_pending_approvals(owner_id: str):
    """
    Get all pending farmer requests for owner approval
    Shows: Farmer name, products, quantities, investment amounts
    """
    try:
        # Get all Pending farmer_room_access records
        access_response = supabase.table("farmer_room_access").select("*").eq("status", "Pending").execute()
        pending_requests = access_response.data or []
        
        result = []
        for req in pending_requests:
            # Get room details (verify owner owns this room)
            room_response = supabase.table("cold_storage_rooms").select("site_id").eq("id", req["room_id"]).execute()
            if not room_response.data:
                continue
            
            room_site_id = room_response.data[0]["site_id"]
            
            # Verify owner owns this site
            site_response = supabase.table("sites").select("owner_profile_id").eq("id", room_site_id).execute()
            if not site_response.data or site_response.data[0]["owner_profile_id"] != owner_id:
                continue
            
            # Get farmer details
            farmer_response = supabase.table("profiles").select("*").eq("id", req["farmer_id"]).execute()
            farmer = farmer_response.data[0] if farmer_response.data else {}
            
            # Get products for this request
            products_response = supabase.table("farmer_batch_products").select("*").eq("farmer_room_access_id", req["id"]).execute()
            products = products_response.data or []
            
            # Calculate investment amount (product values × quantities)
            total_investment = 0
            products_detail = []
            for p in products:
                # Get product details
                prod_response = supabase.table("products").select("*").eq("id", p["product_id"]).execute()
                if prod_response.data:
                    prod = prod_response.data[0]
                    # Estimate investment = quantity × 5 (rough estimate per kg)
                    inv = p["quantity_kg"] * 5
                    total_investment += inv
                    products_detail.append({
                        "product_id": p["product_id"],
                        "product_name": prod.get("name"),
                        "quantity_kg": p["quantity_kg"],
                        "storage_temp_min": prod.get("storage_temp_min"),
                        "storage_temp_max": prod.get("storage_temp_max"),
                        "storage_humidity_min": prod.get("storage_humidity_min"),
                        "storage_humidity_max": prod.get("storage_humidity_max"),
                        "estimated_investment": inv
                    })
            
            result.append({
                "request_id": req["id"],
                "farmer_id": req["farmer_id"],
                "farmer_name": farmer.get("farm_name", "Unknown"),
                "room_id": req["room_id"],
                "requested_at": req["requested_at"],
                "products": products_detail,
                "total_investment_estimate": total_investment,
                "remarks": req.get("remarks")
            })
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch approvals: {str(e)}")

@router.post("/owner/approvals/{request_id}/approve", response_model=dict)
async def approve_site_request(request_id: str, decision: ApprovalDecision):
    """
    FLOW 2: Owner approves farmer request + sets pricing
    
    1. Updates farmer_room_access status to Approved
    2. Creates room_access_pricing record
    3. Returns confirmation
    """
    try:
        # Update farmer_room_access
        now = datetime.now(timezone.utc).isoformat()
        update_data = {
            "status": "Approved",
            "approved_at": now,
            "approved_by": decision.remarks or None,
            "remarks": decision.remarks
        }
        
        access_response = supabase.table("farmer_room_access").update(update_data).eq("id", request_id).execute()
        
        if not access_response.data:
            raise HTTPException(status_code=404, detail="Request not found")
        
        # Create room_access_pricing record
        if decision.price_per_crate:
            pricing_data = {
                "room_access_id": request_id,
                "price_per_crate": decision.price_per_crate,
                "approved_at": now
            }
            
            pricing_response = supabase.table("room_access_pricing").insert(pricing_data).execute()
            if not pricing_response.data:
                raise HTTPException(status_code=500, detail="Failed to set pricing")
        
        return {
            "request_id": request_id,
            "status": "Approved",
            "price_per_crate": decision.price_per_crate,
            "approved_at": now,
            "message": "Request approved successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to approve request: {str(e)}")

@router.post("/owner/approvals/{request_id}/reject", response_model=dict)
async def reject_site_request(request_id: str, remarks: Optional[str] = None):
    """
    FLOW 2: Owner rejects farmer request
    """
    try:
        update_data = {
            "status": "Rejected",
            "remarks": remarks or "Request rejected by owner"
        }
        
        response = supabase.table("farmer_room_access").update(update_data).eq("id", request_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Request not found")
        
        return {
            "request_id": request_id,
            "status": "Rejected",
            "message": "Request rejected"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reject request: {str(e)}")

# ============================================================================
# PHASE 2.3: ROOM PRICING SETUP
# ============================================================================

class RoomPricingCreate(BaseModel):
    room_id: str
    owner_id: str
    price_per_crate: float
    effective_from: date
    effective_until: Optional[date] = None

@router.post("/owner/rooms/pricing", response_model=dict)
async def set_room_pricing(data: RoomPricingCreate):
    """
    FLOW 3: Owner sets daily pricing per room (₹/crate/day)
    """
    try:
        # Get room details to get site_code
        room_response = supabase.table("cold_storage_rooms").select("site_id, room_code").eq("id", data.room_id).execute()
        if not room_response.data:
            raise HTTPException(status_code=404, detail="Room not found")
        
        room = room_response.data[0]
        
        # Get site details
        site_response = supabase.table("sites").select("site_code").eq("id", room["site_id"]).execute()
        if not site_response.data:
            raise HTTPException(status_code=404, detail="Site not found")
        
        site_code = site_response.data[0]["site_code"]
        
        # Create room_pricing record
        pricing_data = {
            "room_id": data.room_id,
            "site_code": site_code,
            "owner_id": data.owner_id,
            "price_per_crate": data.price_per_crate,
            "effective_from": data.effective_from.isoformat(),
            "effective_until": data.effective_until.isoformat() if data.effective_until else None,
            "currency": "INR"
        }
        
        response = supabase.table("room_pricing").insert(pricing_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to set pricing")
        
        return {
            "pricing_id": response.data[0]["id"],
            "room_id": data.room_id,
            "price_per_crate": data.price_per_crate,
            "effective_from": data.effective_from.isoformat(),
            "message": "Pricing set successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to set pricing: {str(e)}")

@router.get("/owner/rooms/{room_id}/pricing", response_model=dict)
async def get_room_pricing(room_id: str):
    """
    Get current pricing for a room
    """
    try:
        today = date.today().isoformat()
        
        # Get active pricing for today
        response = supabase.table("room_pricing").select("*").eq("room_id", room_id).lte("effective_from", today).execute()
        
        if not response.data:
            return {
                "room_id": room_id,
                "price_per_crate": None,
                "message": "No active pricing found"
            }
        
        # Get most recent pricing
        pricing = sorted(response.data, key=lambda x: x["effective_from"], reverse=True)[0]
        
        # Check if it's still active
        if pricing.get("effective_until") and pricing["effective_until"] < today:
            return {
                "room_id": room_id,
                "price_per_crate": None,
                "message": "Pricing has expired"
            }
        
        return {
            "room_id": room_id,
            "price_per_crate": pricing["price_per_crate"],
            "effective_from": pricing["effective_from"],
            "effective_until": pricing.get("effective_until"),
            "updated_at": pricing["updated_at"]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch pricing: {str(e)}")

# ============================================================================
# PHASE 2.4: DAILY BILLING (Farmer View)
# ============================================================================

@router.get("/farmer/billing/{farmer_id}", response_model=dict)
async def get_farmer_billing(farmer_id: str):
    """
    FLOW 4: Get daily billing history (cumulative pattern)
    
    Returns: [{date, daily_cost, cumulative_cost}, ...]
    """
    try:
        response = supabase.table("farmer_daily_storage_costs").select("*").eq("farmer_id", farmer_id).order("cost_date").execute()
        
        costs = response.data or []
        
        return {
            "farmer_id": farmer_id,
            "billing_history": [
                {
                    "date": c["cost_date"],
                    "daily_cost": c["daily_cost"],
                    "cumulative_cost": c["cumulative_cost"],
                    "daily_crate_count": c.get("daily_crate_count"),
                    "payment_status": c.get("payment_status", "unpaid")
                }
                for c in costs
            ],
            "total_records": len(costs),
            "current_cumulative": costs[-1]["cumulative_cost"] if costs else 0
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch billing: {str(e)}")

@router.get("/farmer/billing/{farmer_id}/summary", response_model=dict)
async def get_farmer_billing_summary(farmer_id: str):
    """
    Get monthly billing summary
    """
    try:
        response = supabase.table("farmer_multi_room_summary").select("*").eq("farmer_id", farmer_id).execute()
        
        summary = response.data or []
        
        return {
            "farmer_id": farmer_id,
            "daily_summaries": [
                {
                    "date": s["summary_date"],
                    "total_daily_cost": s["total_daily_cost"],
                    "total_cumulative_cost": s["total_cumulative_cost"],
                    "total_rooms_active": s.get("total_rooms_active"),
                    "total_crates_stored": s.get("total_crates_stored")
                }
                for s in summary
            ],
            "total_owed": summary[-1]["total_cumulative_cost"] if summary else 0
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch summary: {str(e)}")

# ============================================================================
# PHASE 2.5: OWNER REVENUE DASHBOARD
# ============================================================================

@router.get("/owner/revenue/summary/{owner_id}", response_model=dict)
async def get_owner_revenue_summary(owner_id: str):
    """
    FLOW 5: Owner revenue summary from all rooms
    
    Returns: {total_daily_revenue, total_cumulative_revenue, by_room}
    """
    try:
        # Get all sites for this owner
        sites_response = supabase.table("sites").select("id").eq("owner_profile_id", owner_id).execute()
        site_ids = [s["id"] for s in (sites_response.data or [])]
        
        if not site_ids:
            return {
                "owner_id": owner_id,
                "total_daily_revenue": 0,
                "total_cumulative_revenue": 0,
                "rooms": []
            }
        
        # Get all rooms for these sites
        rooms_response = supabase.table("cold_storage_rooms").select("id").in_("site_id", site_ids).execute()
        room_ids = [r["id"] for r in (rooms_response.data or [])]
        
        if not room_ids:
            return {
                "owner_id": owner_id,
                "total_daily_revenue": 0,
                "total_cumulative_revenue": 0,
                "rooms": []
            }
        
        # Get all daily costs for these rooms
        costs_response = supabase.table("farmer_daily_storage_costs").select("*").in_("room_id", room_ids).execute()
        all_costs = costs_response.data or []
        
        today = date.today().isoformat()
        today_costs = [c for c in all_costs if c["cost_date"] == today]
        
        total_daily = sum(c["daily_cost"] for c in today_costs)
        total_cumulative = max((c["cumulative_cost"] for c in all_costs), default=0)
        
        # Group by room
        by_room = {}
        for cost in all_costs:
            room_id = cost["room_id"]
            if room_id not in by_room:
                by_room[room_id] = {"daily": 0, "cumulative": 0, "farmers": 0}
            
            if cost["cost_date"] == today:
                by_room[room_id]["daily"] += cost["daily_cost"]
            by_room[room_id]["cumulative"] = max(by_room[room_id]["cumulative"], cost["cumulative_cost"])
            by_room[room_id]["farmers"] = len(set(c["farmer_id"] for c in all_costs if c["room_id"] == room_id))
        
        return {
            "owner_id": owner_id,
            "total_daily_revenue": total_daily,
            "total_cumulative_revenue": total_cumulative,
            "active_rooms": len(by_room),
            "by_room": [
                {
                    "room_id": room_id,
                    "daily_revenue": data["daily"],
                    "cumulative_revenue": data["cumulative"],
                    "active_farmers": data["farmers"]
                }
                for room_id, data in by_room.items()
            ]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch revenue summary: {str(e)}")

# ============================================================================
# PHASE 2.6: STAKEHOLDER INVESTMENTS
# ============================================================================

class StakeholderInvestmentCreate(BaseModel):
    site_id: str
    stakeholder_id: str
    owner_id: str
    investment_amount_inr: float
    equity_percentage: float
    expected_return_date: Optional[date] = None
    roi_percentage_estimate: Optional[float] = None

@router.post("/stakeholder/invest", response_model=dict)
async def create_stakeholder_investment(data: StakeholderInvestmentCreate):
    """
    FLOW 6: Create stakeholder investment record
    """
    try:
        investment_data = {
            "site_id": data.site_id,
            "stakeholder_id": data.stakeholder_id,
            "owner_id": data.owner_id,
            "investment_amount_inr": data.investment_amount_inr,
            "investment_date": date.today().isoformat(),
            "approval_status": "pending",
            "expected_return_date": data.expected_return_date.isoformat() if data.expected_return_date else None,
            "roi_percentage_estimate": data.roi_percentage_estimate
        }
        
        response = supabase.table("stakeholder_investment_approvals").insert(investment_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create investment")
        
        return {
            "investment_id": response.data[0]["id"],
            "status": "pending",
            "amount": data.investment_amount_inr,
            "message": "Investment request created"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create investment: {str(e)}")

@router.get("/stakeholder/investments/{stakeholder_id}", response_model=dict)
async def get_stakeholder_investments(stakeholder_id: str):
    """
    Get all investments for a stakeholder
    """
    try:
        response = supabase.table("stakeholder_investment_approvals").select("*").eq("stakeholder_id", stakeholder_id).execute()
        
        investments = response.data or []
        
        return {
            "stakeholder_id": stakeholder_id,
            "investments": [
                {
                    "investment_id": i["id"],
                    "site_id": i["site_id"],
                    "amount": i["investment_amount_inr"],
                    "status": i["approval_status"],
                    "investment_date": i["investment_date"],
                    "roi_percentage": i.get("roi_percentage_estimate"),
                    "expected_return": i.get("expected_return_date")
                }
                for i in investments
            ],
            "total_invested": sum(i["investment_amount_inr"] for i in investments)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch investments: {str(e)}")

# ============================================================================
# PHASE 2.7: STAKEHOLDER PAYMENTS & FARMER SETTLEMENTS
# ============================================================================

class StakeholderPaymentCreate(BaseModel):
    stakeholder_id: str
    site_id: str
    amount_inr: float
    payment_date: date

@router.post("/owner/payments/stakeholder", response_model=dict)
async def record_stakeholder_payment(data: StakeholderPaymentCreate):
    """
    FLOW 7: Record payment to stakeholder
    """
    try:
        # Find the investment record
        inv_response = supabase.table("stakeholder_investment_approvals").select("id").eq("stakeholder_id", data.stakeholder_id).eq("site_id", data.site_id).eq("approval_status", "approved").execute()
        
        if not inv_response.data:
            raise HTTPException(status_code=404, detail="Investment not found")
        
        investment_id = inv_response.data[0]["id"]
        
        payment_data = {
            "investment_id": investment_id,
            "stakeholder_id": data.stakeholder_id,
            "amount_inr": data.amount_inr,
            "payment_status": "Completed",
            "payment_date": datetime.now(timezone.utc).isoformat()
        }
        
        response = supabase.table("stakeholder_payments").insert(payment_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to record payment")
        
        return {
            "payment_id": response.data[0]["id"],
            "status": "Completed",
            "amount": data.amount_inr,
            "message": "Payment recorded"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record payment: {str(e)}")

@router.post("/farmer/settlements", response_model=dict)
async def create_farmer_settlement(farmer_id: str, room_id: str, checkout_date: date, settlement_amount: float):
    """
    FLOW 8: Create farmer settlement (after storage period)
    """
    try:
        # Get room details
        room_response = supabase.table("cold_storage_rooms").select("site_id").eq("id", room_id).execute()
        if not room_response.data:
            raise HTTPException(status_code=404, detail="Room not found")
        
        site_id = room_response.data[0]["site_id"]
        
        settlement_data = {
            "site_id": site_id,
            "room_id": room_id,
            "farmer_id": farmer_id,
            "period_end": checkout_date.isoformat(),
            "total_amount": settlement_amount,
            "cumulative_daily_cost": settlement_amount,
            "payment_status": "Pending"
        }
        
        response = supabase.table("farmer_payments").insert(settlement_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create settlement")
        
        return {
            "settlement_id": response.data[0]["id"],
            "status": "Pending",
            "amount": settlement_amount,
            "message": "Settlement created"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create settlement: {str(e)}")

@router.get("/farmer/settlements/{farmer_id}", response_model=dict)
async def get_farmer_settlements(farmer_id: str):
    """
    Get settlement history for farmer
    """
    try:
        response = supabase.table("farmer_payments").select("*").eq("farmer_id", farmer_id).execute()
        
        settlements = response.data or []
        
        return {
            "farmer_id": farmer_id,
            "settlements": [
                {
                    "settlement_id": s["id"],
                    "room_id": s.get("room_id"),
                    "period_end": s.get("period_end"),
                    "amount": s["total_amount"],
                    "cumulative_cost": s.get("cumulative_daily_cost"),
                    "status": s["payment_status"]
                }
                for s in settlements
            ],
            "total_settlements": len(settlements)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch settlements: {str(e)}")

# ============================================================================
# PHASE 2.8: ALERTS (Expanded)
# ============================================================================

@router.get("/alerts/active/{room_id}", response_model=List[dict])
async def get_active_alerts(room_id: str):
    """
    Get active alerts for room
    """
    try:
        response = supabase.table("alerts").select("*").eq("room_id", room_id).eq("status", "active").execute()
        
        alerts = response.data or []
        
        return [
            {
                "alert_id": a["id"],
                "type": a["alert_type"],
                "level": a["alert_level"],
                "message": a["message"],
                "triggered_value": a.get("triggered_value"),
                "threshold": a.get("threshold_value"),
                "triggered_at": a["triggered_at"]
            }
            for a in alerts
        ]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch alerts: {str(e)}")

@router.post("/alerts/{alert_id}/acknowledge", response_model=dict)
async def acknowledge_alert(alert_id: str):
    """
    Mark alert as acknowledged
    """
    try:
        update_data = {
            "status": "acknowledged",
            "acknowledged_at": datetime.now(timezone.utc).isoformat()
        }
        
        response = supabase.table("alerts").update(update_data).eq("id", alert_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        return {
            "alert_id": alert_id,
            "status": "acknowledged",
            "message": "Alert acknowledged"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to acknowledge alert: {str(e)}")

# ============================================================================
# PHASE 2.9: LIVE MONITORING
# ============================================================================

@router.get("/rooms/{room_id}/conditions", response_model=dict)
async def get_room_current_conditions(room_id: str):
    """
    Get current room conditions (latest sensor readings)
    """
    try:
        # Get latest condition reading
        response = supabase.table("cold_storage_conditions").select("*").eq("room_id", room_id).order("recorded_at", desc=True).limit(1).execute()
        
        if not response.data:
            return {"room_id": room_id, "message": "No readings available"}
        
        condition = response.data[0]
        
        return {
            "room_id": room_id,
            "temperature": condition.get("temperature_1"),
            "humidity": condition.get("humidity_1"),
            "door_status": condition.get("door_status_1"),
            "pressure_suction": condition.get("suction_pressure"),
            "pressure_discharge": condition.get("discharge_pressure"),
            "recorded_at": condition["recorded_at"]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch conditions: {str(e)}")

@router.get("/rooms/{room_id}/readings/history", response_model=dict)
async def get_room_readings_history(room_id: str, hours: int = 24):
    """
    Get last N hours of sensor readings
    """
    try:
        response = supabase.table("cold_storage_conditions").select("*").eq("room_id", room_id).order("recorded_at", desc=True).limit(hours).execute()
        
        readings = response.data or []
        
        return {
            "room_id": room_id,
            "readings": [
                {
                    "timestamp": r["recorded_at"],
                    "temperature": r.get("temperature_1"),
                    "humidity": r.get("humidity_1")
                }
                for r in reversed(readings)
            ],
            "count": len(readings)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch history: {str(e)}")
