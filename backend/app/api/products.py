"""
Products API
Manage products (Dragon Fruit, Avocado, Apple)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.database.supabase import supabase

router = APIRouter()

class ProductResponse(BaseModel):
    id: str
    name: str
    category: str
    min_temp: float
    max_temp: float
    optimal_temp: float
    min_humidity: float
    max_humidity: float
    shelf_life_days: int
    base_daily_kwh: float
    base_capacity: float
    selling_price: float
    crate_charge: float

class ProductCreate(BaseModel):
    name: str
    category: str
    min_temp: float
    max_temp: float
    optimal_temp: float
    min_humidity: float
    max_humidity: float
    shelf_life_days: int
    base_daily_kwh: float
    base_capacity: float
    selling_price: float
    crate_charge: Optional[float] = 1.5

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    min_temp: Optional[float] = None
    max_temp: Optional[float] = None
    optimal_temp: Optional[float] = None
    min_humidity: Optional[float] = None
    max_humidity: Optional[float] = None
    shelf_life_days: Optional[int] = None
    base_daily_kwh: Optional[float] = None
    base_capacity: Optional[float] = None
    selling_price: Optional[float] = None
    crate_charge: Optional[float] = None

@router.get("/", response_model=List[ProductResponse])
async def get_all_products():
    """
    Get all products
    """
    try:
        response = supabase.table("products").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch products: {str(e)}")

@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str):
    """
    Get a specific product by ID
    """
    try:
        response = supabase.table("products").select("*").eq("id", product_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Product not found")
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch product: {str(e)}")

@router.get("/site/{site_id}", response_model=List[ProductResponse])
async def get_products_by_site(site_id: str):
    """
    Get products available for a specific site
    Based on site category and location
    """
    try:
        # Get facility details
        site_response = supabase.table("facilities").select("*").eq("id", site_id).execute()
        
        if not site_response.data:
            # Fall back to return all products if specific facility is not found
            response = supabase.table("products").select("*").execute()
            return response.data or []
        
        site = site_response.data[0]
        
        # Filter products by site category
        # Hamirpur (Exotic Fruits): Dragon Fruit, Avocado
        # Bajaura (Fruits): Apple
        if site["category"] == "Exotic Fruits":
            # Return Dragon Fruit and Avocado
            response = supabase.table("products").select("*").in_("name", ["Dragon Fruit", "Avocado"]).execute()
        elif site["category"] == "Fruits":
            # Return Apple
            response = supabase.table("products").select("*").eq("name", "Apple").execute()
        else:
            # Return all products for other categories
            response = supabase.table("products").select("*").execute()
        
        return response.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch products for site: {str(e)}")

@router.post("/", response_model=ProductResponse)
async def create_product(product: ProductCreate):
    """
    Create a new product
    """
    try:
        product_data = product.dict()
        
        response = supabase.table("products").insert(product_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create product")
        
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create product: {str(e)}")

@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(product_id: str, product: ProductUpdate):
    """
    Update an existing product
    """
    try:
        update_data = {k: v for k, v in product.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now().isoformat()
        
        response = supabase.table("products").update(update_data).eq("id", product_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Product not found")
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update product: {str(e)}")

@router.delete("/{product_id}")
async def delete_product(product_id: str):
    """
    Delete a product
    """
    try:
        response = supabase.table("products").delete().eq("id", product_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Product not found")
        
        return {"message": "Product deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete product: {str(e)}")
