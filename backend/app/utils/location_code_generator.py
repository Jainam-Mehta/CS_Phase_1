"""
Auto-generate location codes for sensor_location_mapping
This ensures every new site/room automatically gets a code
"""

from app.database.supabase import supabase
import logging

logger = logging.getLogger(__name__)


def generate_site_code(owner_id: str) -> str:
    """
    Generate next site code for owner (S01, S02, S03, etc.)
    """
    try:
        # Count existing sites for this owner
        sites_resp = supabase.table("sites") \
            .select("id") \
            .eq("owner_profile_id", owner_id) \
            .execute()
        
        count = len(sites_resp.data or [])
        return f"S{str(count + 1).zfill(2)}"  # S01, S02, S03, ...
    except Exception as e:
        logger.error("Error generating site code: %s", e)
        return "S01"  # Fallback


def generate_room_code(site_id: str) -> str:
    """
    Generate next room code for site (R01, R02, R03, etc.)
    """
    try:
        # Count existing rooms for this site
        rooms_resp = supabase.table("cold_storage_rooms") \
            .select("id") \
            .eq("site_id", site_id) \
            .execute()
        
        count = len(rooms_resp.data or [])
        return f"R{str(count + 1).zfill(2)}"  # R01, R02, R03, ...
    except Exception as e:
        logger.error("Error generating room code: %s", e)
        return "R01"  # Fallback


def auto_add_location_mapping(site_id: str, location_code: str, code_type: str) -> bool:
    """
    Auto-add to sensor_location_mapping when new site/room is created
    
    Called from: OwnerSetup.tsx after site creation
    """
    try:
        supabase.table("sensor_location_mapping").insert({
            "site_id": site_id,
            "location_code": location_code,
            "code_type": code_type,
            "mapped_entity_id": site_id if code_type == "site" else site_id  # Will be room_id for rooms
        }).execute()
        
        logger.info("✓ Added location mapping: %s=%s", location_code, code_type)
        return True
    except Exception as e:
        logger.warning("Location mapping already exists or error: %s", e)
        return False
