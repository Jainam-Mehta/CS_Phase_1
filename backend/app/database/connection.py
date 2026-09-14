"""
Database Connection Manager — ColdSense Backend
Provides access to Supabase Client instance and database helper functions.
"""

from app.database.supabase import supabase, get_latest_reading, get_previous_door_state

def get_db():
    """Dependency / Helper to obtain database client instance."""
    return supabase
