"""
Finance API — ColdSense Backend

Real tables used:
  sales     (batch_id, quantity_kg, selling_price, buyer, sold_at)
  expenses  (room_id, category, amount, expense_date, notes)
  energy_usage (room_id, total_kwh, solar_kwh, grid_kwh)
  batches   (farmer_id, product_id, ...)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, date

from app.database.supabase import supabase

router = APIRouter()


class FinanceSummary(BaseModel):
    revenue: float
    expenses: float
    energy_cost: float
    profit: float
    profit_margin: float


class ExpenseCreate(BaseModel):
    room_id: str
    category: str   # 'energy' | 'maintenance' | 'travel' | 'other'
    amount: float
    notes: Optional[str] = None
    expense_date: Optional[date] = None


@router.get("/summary/farmer/{profile_id}")
async def get_farmer_finance_summary(profile_id: str):
    """
    Finance summary for a farmer.
    Revenue = sum of sales for their batches.
    Expenses = sum of expenses for their approved rooms.
    """
    try:
        # Revenue: join sales → batches where farmer_id = profile_id
        batches_resp = (
            supabase.table("batches")
            .select("id")
            .eq("farmer_id", profile_id)
            .execute()
        )
        batch_ids = [b["id"] for b in (batches_resp.data or [])]

        revenue = 0.0
        if batch_ids:
            sales_resp = (
                supabase.table("sales")
                .select("quantity_kg, selling_price")
                .in_("batch_id", batch_ids)
                .execute()
            )
            for sale in (sales_resp.data or []):
                qty = float(sale.get("quantity_kg") or 0)
                price = float(sale.get("selling_price") or 0)
                revenue += qty * price

        # Expenses: via approved rooms
        access_resp = (
            supabase.table("farmer_room_access")
            .select("room_id")
            .eq("farmer_id", profile_id)
            .eq("status", "Approved")
            .execute()
        )
        room_ids = [r["room_id"] for r in (access_resp.data or [])]

        expenses = 0.0
        energy_cost = 0.0
        if room_ids:
            for rid in room_ids:
                # Fetch all active allocations in room to compute farmer's volume share
                alloc_resp = (
                    supabase.table("batch_room_allocations")
                    .select("quantity_kg, batches(farmer_id)")
                    .eq("room_id", rid)
                    .is_("removed_at", None)
                    .execute()
                )
                allocations = alloc_resp.data or []
                total_room_kg = sum(float(a.get("quantity_kg") or 0) for a in allocations)
                farmer_room_kg = sum(
                    float(a.get("quantity_kg") or 0)
                    for a in allocations
                    if (a.get("batches") or {}).get("farmer_id") == profile_id
                )

                # Ratio: farmer's share of room volume (defaults to 1.0 if sole user or no volume)
                ratio = (farmer_room_kg / total_room_kg) if total_room_kg > 0 and farmer_room_kg > 0 else 1.0

                exp_resp = (
                    supabase.table("expenses")
                    .select("amount, category")
                    .eq("room_id", rid)
                    .execute()
                )
                for exp in (exp_resp.data or []):
                    amt = float(exp.get("amount") or 0) * ratio
                    expenses += amt
                    if exp.get("category") == "energy":
                        energy_cost += amt

        profit = revenue - expenses
        profit_margin = (profit / revenue * 100) if revenue > 0 else 0.0

        return FinanceSummary(
            revenue=round(revenue, 2),
            expenses=round(expenses, 2),
            energy_cost=round(energy_cost, 2),
            profit=round(profit, 2),
            profit_margin=round(profit_margin, 2),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Finance summary failed: {e}")


@router.get("/sales/farmer/{profile_id}")
async def get_farmer_sales(profile_id: str):
    """Return all sales for a farmer's batches."""
    try:
        batches_resp = (
            supabase.table("batches")
            .select("id, batch_code, product_id, products(name)")
            .eq("farmer_id", profile_id)
            .execute()
        )
        batch_ids = [b["id"] for b in (batches_resp.data or [])]
        if not batch_ids:
            return []

        sales_resp = (
            supabase.table("sales")
            .select("*, batches(batch_code, products(name))")
            .in_("batch_id", batch_ids)
            .order("sold_at", desc=True)
            .execute()
        )
        return sales_resp.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch sales: {e}")


@router.post("/expenses/", )
async def create_expense(expense: ExpenseCreate):
    """Log an expense for a room."""
    try:
        payload = expense.dict()
        payload["expense_date"] = str(expense.expense_date or date.today())
        payload["created_at"] = datetime.now(timezone.utc).isoformat()

        resp = supabase.table("expenses").insert(payload).execute()
        if not resp.data:
            raise HTTPException(status_code=500, detail="Insert returned no data")
        return resp.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create expense: {e}")
