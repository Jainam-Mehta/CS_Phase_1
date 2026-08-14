"""
Inventory API
Manage farmer inventory with persistence in database
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date, timedelta

from app.database.supabase import supabase

router = APIRouter()

class InventoryResponse(BaseModel):
    id: str
    user_id: str
    site_id: str
    product_id: str
    quantity: float
    unit: str
    batch_number: str
    storage_date: date
    expiry_date: date
    temperature: Optional[float]
    status: str
    shelf_life_remaining: int
    selling_price: float
    spoilage_percentage: float

class InventoryCreate(BaseModel):
    user_id: str
    site_id: str
    product_id: str
    quantity: float
    unit: Optional[str] = "kg"
    temperature: Optional[float] = None
    selling_price: Optional[float] = None

class InventoryUpdate(BaseModel):
    quantity: Optional[float] = None
    temperature: Optional[float] = None
    status: Optional[str] = None
    selling_price: Optional[float] = None
    spoilage_percentage: Optional[float] = None

@router.get("/", response_model=List[InventoryResponse])
async def get_all_inventory():
    """
    Get all inventory items
    """
    try:
        response = supabase.table("inventory").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch inventory: {str(e)}")

@router.get("/user/{user_id}", response_model=List[InventoryResponse])
async def get_user_inventory(user_id: str):
    """
    Get inventory for a specific user
    """
    try:
        response = supabase.table("inventory").select("*").eq("user_id", user_id).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch user inventory: {str(e)}")

@router.get("/site/{site_id}", response_model=List[InventoryResponse])
async def get_site_inventory(site_id: str):
    """
    Get inventory for a specific site
    """
    try:
        response = supabase.table("inventory").select("*, products(*)").eq("site_id", site_id).execute()
        
        # Enrich with product data
        enriched_inventory = []
        for item in response.data:
            item_data = item.copy()
            if "products" in item:
                item_data["product_name"] = item["products"]["name"]
                item_data["product_category"] = item["products"]["category"]
            enriched_inventory.append(item_data)
        
        return enriched_inventory
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch site inventory: {str(e)}")

@router.post("/", response_model=InventoryResponse)
async def create_inventory(inventory: InventoryCreate):
    """
    Create a new inventory item
    Automatically calculates shelf life, expiry date, and status
    """
    try:
        # Get product details for shelf life and price
        product_response = supabase.table("products").select("*").eq("id", inventory.product_id).execute()
        
        if not product_response.data:
            raise HTTPException(status_code=404, detail="Product not found")
        
        product = product_response.data[0]
        
        # Calculate dates
        storage_date = date.today()
        expiry_date = storage_date + timedelta(days=product["shelf_life_days"])
        shelf_life_remaining = product["shelf_life_days"]
        
        # Use product selling price if not provided
        selling_price = inventory.selling_price or product["selling_price"]
        
        # Generate batch number
        batch_number = f"BATCH-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Determine status based on shelf life
        status = "good"
        if shelf_life_remaining <= 1:
            status = "critical"
        elif shelf_life_remaining <= 5:
            status = "warning"
        
        inventory_data = {
            "user_id": inventory.user_id,
            "site_id": inventory.site_id,
            "product_id": inventory.product_id,
            "quantity": inventory.quantity,
            "unit": inventory.unit,
            "batch_number": batch_number,
            "storage_date": storage_date.isoformat(),
            "expiry_date": expiry_date.isoformat(),
            "temperature": inventory.temperature,
            "status": status,
            "shelf_life_remaining": shelf_life_remaining,
            "selling_price": selling_price,
            "spoilage_percentage": 0.0
        }
        
        response = supabase.table("inventory").insert(inventory_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create inventory item")
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create inventory: {str(e)}")

@router.put("/{inventory_id}", response_model=InventoryResponse)
async def update_inventory(inventory_id: str, inventory: InventoryUpdate):
    """
    Update an existing inventory item
    """
    try:
        update_data = {k: v for k, v in inventory.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now().isoformat()
        
        response = supabase.table("inventory").update(update_data).eq("id", inventory_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Inventory item not found")
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update inventory: {str(e)}")

@router.delete("/{inventory_id}")
async def delete_inventory(inventory_id: str):
    """
    Delete an inventory item
    """
    try:
        response = supabase.table("inventory").delete().eq("id", inventory_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Inventory item not found")
        
        return {"message": "Inventory item deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete inventory: {str(e)}")

@router.post("/update-shelf-life")
async def update_shelf_life():
    """
    Daily job to update shelf life remaining for all inventory items
    Should be called once per day
    """
    try:
        # Get all inventory items
        response = supabase.table("inventory").select("*").execute()
        
        updated_count = 0
        
        for item in response.data:
            # Calculate days since storage
            storage_date = datetime.strptime(item["storage_date"], "%Y-%m-%d").date()
            days_stored = (date.today() - storage_date).days
            
            # Get product shelf life
            product_response = supabase.table("products").select("shelf_life_days").eq("id", item["product_id"]).execute()
            if product_response.data:
                total_shelf_life = product_response.data[0]["shelf_life_days"]
                remaining = max(0, total_shelf_life - days_stored)
                
                # Update status based on remaining days
                status = "good"
                if remaining <= 1:
                    status = "critical"
                elif remaining <= 5:
                    status = "warning"
                
                # Update inventory item
                supabase.table("inventory").update({
                    "shelf_life_remaining": remaining,
                    "status": status,
                    "updated_at": datetime.now().isoformat()
                }).eq("id", item["id"]).execute()
                
                updated_count += 1
        
        return {"message": f"Updated shelf life for {updated_count} inventory items"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update shelf life: {str(e)}")
