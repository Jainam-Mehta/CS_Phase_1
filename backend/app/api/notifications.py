"""
Notifications API - Manage notification preferences for farmers and owners

Features:
- Get current notification preferences
- Update preferences (email, push, thresholds)
- Role-based settings (farmer vs owner)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from app.database.supabase import supabase

router = APIRouter()


# ── Pydantic Models ────────────────────────────────────────────────────────────

class NotificationPreferencesResponse(BaseModel):
    """Response model for notification preferences"""
    door_alerts_enabled: bool
    door_alerts_via_email: bool
    door_alerts_via_push: bool
    market_updates_enabled: Optional[bool] = None
    market_updates_via_email: Optional[bool] = None
    market_updates_via_push: Optional[bool] = None
    market_update_threshold_percent: Optional[float] = None
    weekly_reports_enabled: bool
    weekly_reports_via_email: bool
    weekly_reports_day_of_week: str
    ai_recommendations_enabled: bool
    ai_recommendations_via_email: bool
    ai_recommendations_via_push: bool
    owner_insights_enabled: Optional[bool] = None
    owner_insights_via_email: Optional[bool] = None
    owner_insights_via_push: Optional[bool] = None


class NotificationPreferencesUpdate(BaseModel):
    """Request model for updating preferences"""
    door_alerts_enabled: Optional[bool] = None
    door_alerts_via_email: Optional[bool] = None
    door_alerts_via_push: Optional[bool] = None
    market_updates_enabled: Optional[bool] = None
    market_updates_via_email: Optional[bool] = None
    market_updates_via_push: Optional[bool] = None
    market_update_threshold_percent: Optional[float] = None
    weekly_reports_enabled: Optional[bool] = None
    weekly_reports_via_email: Optional[bool] = None
    weekly_reports_day_of_week: Optional[str] = None
    ai_recommendations_enabled: Optional[bool] = None
    ai_recommendations_via_email: Optional[bool] = None
    ai_recommendations_via_push: Optional[bool] = None
    owner_insights_enabled: Optional[bool] = None
    owner_insights_via_email: Optional[bool] = None
    owner_insights_via_push: Optional[bool] = None


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/preferences/{profile_id}", response_model=NotificationPreferencesResponse)
async def get_notification_preferences(profile_id: str):
    """
    Get notification preferences for a user.
    
    If preferences don't exist, creates defaults.
    """
    try:
        # Try to fetch existing preferences
        resp = supabase.table("notification_preferences") \
            .select("*") \
            .eq("profile_id", profile_id) \
            .maybeSingle() \
            .execute()
        
        if resp.data:
            return resp.data
        
        # Create default preferences if don't exist
        defaults = {
            "profile_id": profile_id,
            "door_alerts_enabled": True,
            "door_alerts_via_email": False,
            "door_alerts_via_push": True,
            "market_updates_enabled": True,
            "market_updates_via_email": False,
            "market_updates_via_push": True,
            "market_update_threshold_percent": 10.0,
            "weekly_reports_enabled": True,
            "weekly_reports_via_email": True,
            "weekly_reports_day_of_week": "Monday",
            "ai_recommendations_enabled": True,
            "ai_recommendations_via_email": False,
            "ai_recommendations_via_push": True,
            "owner_insights_enabled": True,
            "owner_insights_via_email": False,
            "owner_insights_via_push": True,
        }
        
        create_resp = supabase.table("notification_preferences") \
            .insert([defaults]) \
            .select() \
            .single() \
            .execute()
        
        return create_resp.data
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get preferences: {str(e)}")


@router.put("/preferences/{profile_id}", response_model=NotificationPreferencesResponse)
async def update_notification_preferences(profile_id: str, updates: NotificationPreferencesUpdate):
    """
    Update notification preferences for a user.
    
    Only updates provided fields, others remain unchanged.
    """
    try:
        # Build update dictionary (only non-None fields)
        update_data = updates.model_dump(exclude_none=True)
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        if not update_data or len(update_data) == 1:  # Only updated_at
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Update preferences
        resp = supabase.table("notification_preferences") \
            .update(update_data) \
            .eq("profile_id", profile_id) \
            .select() \
            .single() \
            .execute()
        
        if not resp.data:
            raise HTTPException(status_code=404, detail="Preferences not found")
        
        return resp.data
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update preferences: {str(e)}")


@router.get("/preferences/{profile_id}/role/{role_type}")
async def get_role_specific_preferences(profile_id: str, role_type: str):
    """
    Get role-specific notification settings (farmer vs owner).
    
    Farmer gets: door_alerts, market_updates, weekly_reports, ai_recommendations
    Owner gets: door_alerts, weekly_reports, owner_insights
    """
    try:
        resp = supabase.table("notification_preferences") \
            .select("*") \
            .eq("profile_id", profile_id) \
            .maybeSingle() \
            .execute()
        
        if not resp.data:
            raise HTTPException(status_code=404, detail="Preferences not found")
        
        prefs = resp.data
        
        if role_type.lower() == "farmer":
            return {
                "door_alerts": {
                    "enabled": prefs.get("door_alerts_enabled"),
                    "via_email": prefs.get("door_alerts_via_email"),
                    "via_push": prefs.get("door_alerts_via_push")
                },
                "market_updates": {
                    "enabled": prefs.get("market_updates_enabled"),
                    "via_email": prefs.get("market_updates_via_email"),
                    "via_push": prefs.get("market_updates_via_push"),
                    "threshold_percent": prefs.get("market_update_threshold_percent")
                },
                "weekly_reports": {
                    "enabled": prefs.get("weekly_reports_enabled"),
                    "via_email": prefs.get("weekly_reports_via_email"),
                    "day_of_week": prefs.get("weekly_reports_day_of_week")
                },
                "ai_recommendations": {
                    "enabled": prefs.get("ai_recommendations_enabled"),
                    "via_email": prefs.get("ai_recommendations_via_email"),
                    "via_push": prefs.get("ai_recommendations_via_push")
                }
            }
        
        elif role_type.lower() == "owner":
            return {
                "door_alerts": {
                    "enabled": prefs.get("door_alerts_enabled"),
                    "via_email": prefs.get("door_alerts_via_email"),
                    "via_push": prefs.get("door_alerts_via_push")
                },
                "weekly_reports": {
                    "enabled": prefs.get("weekly_reports_enabled"),
                    "via_email": prefs.get("weekly_reports_via_email"),
                    "day_of_week": prefs.get("weekly_reports_day_of_week")
                },
                "owner_insights": {
                    "enabled": prefs.get("owner_insights_enabled"),
                    "via_email": prefs.get("owner_insights_via_email"),
                    "via_push": prefs.get("owner_insights_via_push")
                }
            }
        
        else:
            raise HTTPException(status_code=400, detail="Invalid role type. Use 'farmer' or 'owner'")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get role preferences: {str(e)}")
