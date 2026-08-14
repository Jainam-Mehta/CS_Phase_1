"""
Alerts API
Generate alerts for door >10min warning, >20min critical, and other system alerts
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.database.supabase import supabase

router = APIRouter()

class AlertResponse(BaseModel):
    id: str
    site_id: str
    alert_type: str
    severity: str
    title: str
    message: str
    sensor_id: Optional[str]
    status: str
    duration_minutes: Optional[int]
    created_at: str

class AlertCreate(BaseModel):
    site_id: str
    alert_type: str
    severity: str
    title: str
    message: str
    sensor_id: Optional[str] = None
    duration_minutes: Optional[int] = None

@router.get("/", response_model=List[AlertResponse])
async def get_all_alerts():
    """
    Get all alerts
    """
    try:
        response = supabase.table("alerts").select("*").order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch alerts: {str(e)}")

@router.get("/site/{site_id}", response_model=List[AlertResponse])
async def get_site_alerts(site_id: str):
    """
    Get alerts for a specific site
    """
    try:
        response = supabase.table("alerts").select("*").eq("site_id", site_id).order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch site alerts: {str(e)}")

@router.get("/active/{site_id}", response_model=List[AlertResponse])
async def get_active_alerts(site_id: str):
    """
    Get active (open) alerts for a specific site
    """
    try:
        response = supabase.table("alerts").select("*").eq("site_id", site_id).eq("status", "open").order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch active alerts: {str(e)}")

@router.post("/", response_model=AlertResponse)
async def create_alert(alert: AlertCreate):
    """
    Create a new alert
    """
    try:
        alert_data = alert.dict()
        alert_data["created_at"] = datetime.now().isoformat()
        
        response = supabase.table("alerts").insert(alert_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create alert")
        
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create alert: {str(e)}")

@router.put("/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str):
    """
    Acknowledge an alert
    """
    try:
        response = supabase.table("alerts").update({
            "status": "acknowledged",
            "updated_at": datetime.now().isoformat()
        }).eq("id", alert_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        return {"message": "Alert acknowledged successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to acknowledge alert: {str(e)}")

@router.put("/{alert_id}/resolve")
async def resolve_alert(alert_id: str):
    """
    Resolve an alert
    """
    try:
        response = supabase.table("alerts").update({
            "status": "resolved",
            "updated_at": datetime.now().isoformat()
        }).eq("id", alert_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        return {"message": "Alert resolved successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to resolve alert: {str(e)}")

@router.post("/check-door-alerts/{site_id}")
async def check_door_alerts(site_id: str):
    """
    Check door duration and generate alerts if needed
    >10 min: warning
    >20 min: critical
    """
    try:
        # Get latest door reading
        door_response = supabase.table("door_readings").select("*").eq("site_id", site_id).order("recorded_at", desc=True).limit(1).execute()
        
        if not door_response.data:
            return {"message": "No door readings found"}
        
        door_reading = door_response.data[0]
        
        # Check if door is open
        if door_reading["final_status"] == "open":
            duration = door_reading["duration_open_today"]
            
            # Check thresholds
            if duration > 20:
                # Critical alert
                await create_alert(AlertCreate(
                    site_id=site_id,
                    alert_type="door_critical",
                    severity="critical",
                    title="Door Open Critical",
                    message=f"Door has been open for {duration} minutes. Immediate action required.",
                    sensor_id="door_sensor",
                    duration_minutes=duration
                ))
            elif duration > 10:
                # Warning alert
                await create_alert(AlertCreate(
                    site_id=site_id,
                    alert_type="door_warning",
                    severity="warning",
                    title="Door Open Warning",
                    message=f"Door has been open for {duration} minutes. Please close the door.",
                    sensor_id="door_sensor",
                    duration_minutes=duration
                ))
        
        return {"message": "Door alerts checked successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check door alerts: {str(e)}")
