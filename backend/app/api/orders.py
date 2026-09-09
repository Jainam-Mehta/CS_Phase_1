"""
Orders / Sales API — ColdSense Backend

Real table: `sales`
  id, batch_id, quantity_kg, selling_price, buyer, sold_at
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone

from app.database.supabase import supabase

router = APIRouter()


class SaleResponse(BaseModel):
    id: str
    batch_id: Optional[str] = None
    quantity_kg: Optional[float] = None
    selling_price: Optional[float] = None
    buyer: Optional[str] = None
    sold_at: Optional[str] = None
    total_value: Optional[float] = None


class SaleCreate(BaseModel):
    batch_id: str
    quantity_kg: float
    selling_price: float
    buyer: Optional[str] = None


@router.get("/farmer/{profile_id}", response_model=List[SaleResponse])
async def get_farmer_sales(profile_id: str):
    """Return all sales for batches belonging to this farmer."""
    try:
        batches_resp = (
            supabase.table("batches")
            .select("id")
            .eq("farmer_id", profile_id)
            .execute()
        )
        batch_ids = [b["id"] for b in (batches_resp.data or [])]
        if not batch_ids:
            return []

        resp = (
            supabase.table("sales")
            .select("*")
            .in_("batch_id", batch_ids)
            .order("sold_at", desc=True)
            .execute()
        )
        result = []
        for s in (resp.data or []):
            qty = float(s.get("quantity_kg") or 0)
            price = float(s.get("selling_price") or 0)
            result.append({**s, "total_value": round(qty * price, 2)})
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch sales: {e}")


@router.get("/batch/{batch_id}", response_model=List[SaleResponse])
async def get_batch_sales(batch_id: str):
    try:
        resp = (
            supabase.table("sales")
            .select("*")
            .eq("batch_id", batch_id)
            .order("sold_at", desc=True)
            .execute()
        )
        return [
            {**s, "total_value": round(float(s.get("quantity_kg") or 0) * float(s.get("selling_price") or 0), 2)}
            for s in (resp.data or [])
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch batch sales: {e}")


@router.post("/", response_model=SaleResponse)
async def create_sale(sale: SaleCreate):
    """Record a sale and reduce remaining_quantity_kg on the batch."""
    try:
        # Verify batch exists
        batch_resp = (
            supabase.table("batches")
            .select("id, remaining_quantity_kg")
            .eq("id", sale.batch_id)
            .maybeSingle()
            .execute()
        )
        if not batch_resp.data:
            raise HTTPException(status_code=404, detail="Batch not found")

        remaining = float(batch_resp.data.get("remaining_quantity_kg") or 0)
        if sale.quantity_kg > remaining:
            raise HTTPException(
                status_code=400,
                detail=f"Sale quantity {sale.quantity_kg}kg exceeds remaining {remaining}kg in batch",
            )

        # Insert sale
        payload = {
            "batch_id": sale.batch_id,
            "quantity_kg": sale.quantity_kg,
            "selling_price": sale.selling_price,
            "buyer": sale.buyer,
            "sold_at": datetime.now(timezone.utc).isoformat(),
        }
        resp = supabase.table("sales").insert(payload).execute()
        if not resp.data:
            raise HTTPException(status_code=500, detail="Insert returned no data")

        # Update remaining quantity on batch
        new_remaining = max(0.0, remaining - sale.quantity_kg)
        supabase.table("batches").update({"remaining_quantity_kg": new_remaining}).eq("id", sale.batch_id).execute()

        s = resp.data[0]
        return {**s, "total_value": round(sale.quantity_kg * sale.selling_price, 2)}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create sale: {e}")


@router.delete("/{sale_id}")
async def delete_sale(sale_id: str):
    try:
        resp = supabase.table("sales").delete().eq("id", sale_id).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Sale not found")
        return {"message": "Sale deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete sale: {e}")
