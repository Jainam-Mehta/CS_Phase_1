"""
Daily Jobs API
==============

Endpoints to manually trigger or monitor daily background jobs.
In production, these should be called by APScheduler or a cron job.

Currently implemented:
- POST /daily-jobs/calculate-storage-costs - Calculate costs for yesterday
- GET /daily-jobs/calculate-storage-costs - Trigger for specific date
- GET /daily-jobs/status - Check job execution status
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime, date, timezone, timedelta
from typing import Optional
from pydantic import BaseModel
from app.services.daily_storage_costs import DailyStorageCostCalculator
from app.database.supabase import supabase
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class DateRequest(BaseModel):
    target_date: Optional[date] = None  # Default: yesterday


@router.post("/daily-jobs/calculate-storage-costs", response_model=dict)
async def calculate_daily_storage_costs(request: Optional[DateRequest] = None):
    """
    Manually trigger the daily storage cost calculation.
    
    Args:
        target_date: Date to calculate costs for (default: yesterday)
                    This should be called AFTER the day ends (e.g., 23:59:59)
    
    Returns:
        Calculation results:
        {
            'success': bool,
            'date': str,
            'records_created': int,
            'records_updated': int,
            'total_revenue': float,
            'errors': List[str]
        }
    
    Typical Use:
    - POST /daily-jobs/calculate-storage-costs (runs for yesterday)
    - POST /daily-jobs/calculate-storage-costs {'target_date': '2026-11-03'}
    """
    try:
        target_date = None
        if request and request.target_date:
            target_date = request.target_date
        
        logger.info(f"📅 Manual trigger: calculating storage costs for {target_date or 'yesterday'}")
        
        result = DailyStorageCostCalculator.calculate_for_date(target_date)
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Error in calculate_daily_storage_costs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to calculate daily storage costs: {str(e)}")


@router.get("/daily-jobs/status", response_model=dict)
async def get_job_status():
    """
    Health check endpoint to verify daily jobs system is working.
    
    Returns:
        {
            'status': 'ok' | 'error',
            'last_calculation': date (latest date with cost records),
            'latest_revenue': float,
            'records_count': int (total farmer_daily_storage_costs records)
        }
    """
    try:
        # Check the latest daily storage cost record
        latest_resp = supabase.table('farmer_daily_storage_costs').select("""
            cost_date, COUNT(*) as record_count, SUM(daily_cost) as total_daily
        """).order('cost_date', ascending=False).limit(1).execute()
        
        if not latest_resp.data or len(latest_resp.data) == 0:
            return {
                'status': 'ok',
                'last_calculation': None,
                'latest_revenue': 0.0,
                'records_count': 0,
                'message': 'No cost records found yet'
            }
        
        latest = latest_resp.data[0]
        
        # Get total record count
        count_resp = supabase.table('farmer_daily_storage_costs').select('id').execute()
        total_count = len(count_resp.data or [])
        
        return {
            'status': 'ok',
            'last_calculation': latest.get('cost_date'),
            'latest_revenue': float(latest.get('total_daily') or 0),
            'records_count': total_count,
            'message': 'Daily jobs system operational'
        }
        
    except Exception as e:
        logger.error(f"❌ Error in get_job_status: {str(e)}")
        return {
            'status': 'error',
            'error': str(e),
            'message': 'Failed to check job status'
        }


# ============================================================================
# SCHEDULER INTEGRATION (Optional - for production deployment)
# ============================================================================
# 
# To automatically run this job daily, integrate with APScheduler:
#
# from apscheduler.schedulers.background import BackgroundScheduler
# from app.api.daily_jobs import run_scheduled_daily_costs
#
# scheduler = BackgroundScheduler()
# 
# # Run at 23:59 UTC daily (after all current day transactions complete)
# scheduler.add_job(
#     run_scheduled_daily_costs,
#     'cron',
#     hour=23,
#     minute=59,
#     timezone='UTC',
#     id='daily_storage_costs'
# )
#
# scheduler.start()
#
# Or with a time-based interval:
#
# scheduler.add_job(
#     run_scheduled_daily_costs,
#     'interval',
#     hours=24,
#     start_date=datetime(2026, 11, 2, 23, 59),  # Start at first run time
#     id='daily_storage_costs'
# )
#
# See backend/main.py for integration example
