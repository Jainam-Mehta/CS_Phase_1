"""
Finance API
Calculate revenue, expenses, outstanding, energy cost, diesel, profit
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date, timedelta

from app.database.supabase import supabase

router = APIRouter()

class FinanceSummary(BaseModel):
    revenue: float
    expenses: float
    outstanding: float
    energy_cost: float
    diesel_cost: float
    profit: float
    profit_margin: float

class ExpenseCreate(BaseModel):
    user_id: str
    site_id: str
    expense_type: str  # 'travel', 'energy', 'maintenance', 'other'
    amount: float
    description: str
    expense_date: Optional[date] = None

@router.get("/summary/{user_id}/{site_id}", response_model=FinanceSummary)
async def get_finance_summary(user_id: str, site_id: str):
    """
    Get finance summary for a user and site
    """
    try:
        # Calculate revenue from orders
        orders_response = supabase.table("orders").select("*").eq("user_id", user_id).eq("site_id", site_id).eq("status", "revenue_earned").execute()
        revenue = sum(order["total_revenue"] for order in orders_response.data)
        
        # Calculate expenses (for now, use energy consumption as proxy)
        # In production, would have an expenses table
        energy_response = supabase.table("energy_consumption").select("*").eq("site_id", site_id).execute()
        
        # Calculate energy cost (assuming ₹8 per kWh)
        total_kwh = sum(record["daily_kwh"] for record in energy_response.data)
        energy_cost = total_kwh * 8
        
        # Diesel cost (assuming 10% of energy cost for backup generator)
        diesel_cost = energy_cost * 0.1
        
        # Travel expenses (for now, estimate as 5% of revenue)
        travel_cost = revenue * 0.05
        
        # Total expenses
        expenses = energy_cost + diesel_cost + travel_cost
        
        # Outstanding (orders with pending status)
        pending_orders = supabase.table("orders").select("*").eq("user_id", user_id).eq("site_id", site_id).eq("status", "pending").execute()
        outstanding = sum(order["total_revenue"] for order in pending_orders.data)
        
        # Profit
        profit = revenue - expenses
        
        # Profit margin
        profit_margin = (profit / revenue * 100) if revenue > 0 else 0
        
        return FinanceSummary(
            revenue=revenue,
            expenses=expenses,
            outstanding=outstanding,
            energy_cost=energy_cost,
            diesel_cost=diesel_cost,
            profit=profit,
            profit_margin=profit_margin
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch finance summary: {str(e)}")

@router.get("/monthly-profit/{site_id}/{year}/{month}")
async def get_monthly_profit(site_id: str, year: int, month: int):
    """
    Get monthly profit data for graph
    """
    try:
        # Get orders for the month
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1)
        else:
            end_date = date(year, month + 1, 1)
        
        orders_response = supabase.table("orders").select("*").eq("site_id", site_id).gte("order_date", start_date.isoformat()).lt("order_date", end_date.isoformat()).execute()
        
        # Calculate daily profit
        daily_profit = {}
        for order in orders_response.data:
            order_date = order["order_date"]
            if order_date not in daily_profit:
                daily_profit[order_date] = 0
            if order["status"] == "revenue_earned":
                daily_profit[order_date] += order["total_revenue"]
        
        # Convert to list format for graph
        profit_data = [
            {"date": date, "profit": profit}
            for date, profit in sorted(daily_profit.items())
        ]
        
        return profit_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch monthly profit: {str(e)}")
