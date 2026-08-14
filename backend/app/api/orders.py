"""
Orders API
Manage orders with auto-generated IDs and revenue calculation
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date

from app.database.supabase import supabase

router = APIRouter()

class OrderResponse(BaseModel):
    id: str
    order_id: str
    user_id: str
    site_id: str
    customer_name: str
    customer_type: str
    product_id: Optional[str]
    quantity: float
    unit: str
    unit_price: float
    total_revenue: float
    order_date: date
    status: str

class OrderCreate(BaseModel):
    user_id: str
    site_id: str
    customer_name: str
    customer_type: str  # 'market' or 'custom_buyer'
    product_id: Optional[str] = None
    quantity: float
    unit: Optional[str] = "kg"
    unit_price: float
    order_date: Optional[date] = None

class OrderUpdate(BaseModel):
    customer_name: Optional[str] = None
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    status: Optional[str] = None

# Nearby markets for each site
NEARBY_MARKETS = {
    "hamirpur-id": [
        "Hamirpur APMC",
        "Mandi Market",
        "Kullu Market",
        "Shimla Mandi"
    ],
    "bajaura-id": [
        "Bajaura Market",
        "Kullu Market",
        "Mandi Market",
        "Aut Market"
    ]
}

@router.get("/", response_model=List[OrderResponse])
async def get_all_orders():
    """
    Get all orders
    """
    try:
        response = supabase.table("orders").select("*").order("order_date", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch orders: {str(e)}")

@router.get("/user/{user_id}", response_model=List[OrderResponse])
async def get_user_orders(user_id: str):
    """
    Get orders for a specific user
    """
    try:
        response = supabase.table("orders").select("*").eq("user_id", user_id).order("order_date", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch user orders: {str(e)}")

@router.get("/site/{site_id}", response_model=List[OrderResponse])
async def get_site_orders(site_id: str):
    """
    Get orders for a specific site
    """
    try:
        response = supabase.table("orders").select("*").eq("site_id", site_id).order("order_date", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch site orders: {str(e)}")

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

@router.post("/", response_model=OrderResponse)
async def create_order(order: OrderCreate):
    """
    Create a new order with auto-generated order ID
    """
    try:
        # Generate auto-incrementing order ID
        # Get the last order ID
        last_order = supabase.table("orders").select("order_id").order("created_at", desc=True).limit(1).execute()
        
        if last_order.data:
            last_id = last_order.data[0]["order_id"]
            # Extract number from OD_001 format
            last_num = int(last_id.split("_")[1])
            new_num = last_num + 1
        else:
            new_num = 1
        
        order_id = f"OD_{new_num:03d}"
        
        order_data = {
            "order_id": order_id,
            "user_id": order.user_id,
            "site_id": order.site_id,
            "customer_name": order.customer_name,
            "customer_type": order.customer_type,
            "product_id": order.product_id,
            "quantity": order.quantity,
            "unit": order.unit,
            "unit_price": order.unit_price,
            "order_date": order.order_date or date.today().isoformat(),
            "status": "pending"
        }
        
        response = supabase.table("orders").insert(order_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create order")
        
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create order: {str(e)}")

@router.put("/{order_id}", response_model=OrderResponse)
async def update_order(order_id: str, order: OrderUpdate):
    """
    Update an existing order
    """
    try:
        update_data = {k: v for k, v in order.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now().isoformat()
        
        response = supabase.table("orders").update(update_data).eq("order_id", order_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Order not found")
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update order: {str(e)}")

@router.delete("/{order_id}")
async def delete_order(order_id: str):
    """
    Delete an order
    """
    try:
        response = supabase.table("orders").delete().eq("order_id", order_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Order not found")
        
        return {"message": "Order deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete order: {str(e)}")
