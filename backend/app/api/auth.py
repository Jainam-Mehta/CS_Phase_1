"""
Auth API — ColdSense Backend

NOTE: The primary auth mechanism is Supabase Auth (JWT tokens) via the
frontend Supabase JS SDK. This REST endpoint is a supplementary layer
for server-side profile lookups — it does NOT replace Supabase Auth.

Real tables used:
  profiles (auth_user_id, first_name, last_name, role_id, ...)
  roles    (id, name)
  facilities (owner_profile_id → profiles.id)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import timezone, datetime

from app.database.supabase import supabase

router = APIRouter()


# ── Models ────────────────────────────────────────────────────────────────────

class ProfileResponse(BaseModel):
    id: str
    auth_user_id: str
    first_name: str
    last_name: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    created_at: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _format_profile(profile: dict) -> dict:
    """Format profile response, handling both role_id (via FK) and direct role field"""
    role_name = None
    
    # Try to get role from roles table (via role_id FK)
    role_obj = profile.get("roles")
    if role_obj:
        if isinstance(role_obj, list):
            role_name = role_obj[0].get("name") if role_obj else None
        else:
            role_name = role_obj.get("name")
    
    # Fallback: infer role from context if available
    if not role_name:
        # In future, you could infer role based on facility ownership, etc.
        role_name = None

    return {
        "id": profile["id"],
        "auth_user_id": profile["auth_user_id"],
        "first_name": profile.get("first_name", ""),
        "last_name": profile.get("last_name"),
        "role": (role_name or "").lower() if role_name else None,
        "phone": profile.get("phone"),
        "created_at": profile.get("created_at"),
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/profile/{auth_user_id}", response_model=ProfileResponse)
async def get_profile_by_auth_id(auth_user_id: str):
    """
    Return the profile row for a given Supabase Auth user ID.
    Used by backend services that need profile info from a JWT sub claim.
    
    Tries to join with roles table first; falls back to basic profile if roles FK doesn't exist.
    """
    try:
        # Try with role join first (after migration)
        resp = (
            supabase.table("profiles")
            .select("*, roles!inner(name)")
            .eq("auth_user_id", auth_user_id)
            .maybeSingle()
            .execute()
        )
        
        if resp.data:
            return _format_profile(resp.data)
        
        # Fallback: get profile without role join (before migration)
        resp = (
            supabase.table("profiles")
            .select("*")
            .eq("auth_user_id", auth_user_id)
            .maybeSingle()
            .execute()
        )
        
        if not resp.data:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        return _format_profile(resp.data)
        
    except HTTPException:
        raise
    except Exception as e:
        # If inner join fails, try without it
        try:
            resp = (
                supabase.table("profiles")
                .select("*")
                .eq("auth_user_id", auth_user_id)
                .maybeSingle()
                .execute()
            )
            if not resp.data:
                raise HTTPException(status_code=404, detail="Profile not found")
            return _format_profile(resp.data)
        except Exception as fallback_error:
            raise HTTPException(status_code=500, detail=f"Failed to fetch profile: {str(fallback_error)}")


@router.get("/profile/by-id/{profile_id}", response_model=ProfileResponse)
async def get_profile_by_id(profile_id: str):
    """
    Return profile by profiles.id (UUID PK).
    
    Tries to join with roles table first; falls back to basic profile if roles FK doesn't exist.
    """
    try:
        # Try with role join first (after migration)
        resp = (
            supabase.table("profiles")
            .select("*, roles!inner(name)")
            .eq("id", profile_id)
            .maybeSingle()
            .execute()
        )
        
        if resp.data:
            return _format_profile(resp.data)
        
        # Fallback: get profile without role join (before migration)
        resp = (
            supabase.table("profiles")
            .select("*")
            .eq("id", profile_id)
            .maybeSingle()
            .execute()
        )
        
        if not resp.data:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        return _format_profile(resp.data)
        
    except HTTPException:
        raise
    except Exception as e:
        # If inner join fails, try without it
        try:
            resp = (
                supabase.table("profiles")
                .select("*")
                .eq("id", profile_id)
                .maybeSingle()
                .execute()
            )
            if not resp.data:
                raise HTTPException(status_code=404, detail="Profile not found")
            return _format_profile(resp.data)
        except Exception as fallback_error:
            raise HTTPException(status_code=500, detail=f"Failed to fetch profile: {str(fallback_error)}")


@router.get("/facilities/{profile_id}")
async def get_owner_facilities(profile_id: str):
    """Return all facilities owned by a given owner profile ID."""
    try:
        resp = (
            supabase.table("facilities")
            .select("id, facility_name, address, is_active, created_at, total_capacity_kg, current_utilization_kg")
            .eq("owner_profile_id", profile_id)
            .execute()
        )
        return resp.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch facilities: {e}")
