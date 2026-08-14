"""
Authentication API
Handles user login, registration, and session management using database
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timedelta
import hashlib
import secrets

from app.database.supabase import supabase

router = APIRouter()

# Models
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str  # 'farmer', 'stakeholder', 'admin'

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    sites: list
    primary_site: Optional[dict]

class AuthResponse(BaseModel):
    user: UserResponse
    token: str

def hash_password(password: str) -> str:
    """Simple password hashing (in production, use bcrypt)"""
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token() -> str:
    """Generate a simple session token"""
    return secrets.token_urlsafe(32)

@router.post("/login")
async def login(request: LoginRequest):
    """
    Authenticate user with email and password
    Returns user data with their assigned sites and a session token
    """
    try:
        # Query user from database
        response = supabase.table("users").select("*").eq("email", request.email).execute()
        
        if not response.data:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        user = response.data[0]
        
        # Verify password (in production, use bcrypt)
        password_hash = hash_password(request.password)
        if user["password_hash"] != password_hash:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Get user's sites
        sites_response = supabase.table("user_sites").select(
            "*, sites(*)"
        ).eq("user_id", user["id"]).execute()
        
        sites = []
        primary_site = None
        
        for site_relation in sites_response.data:
            site_data = site_relation["sites"]
            sites.append({
                "id": site_data["id"],
                "name": site_data["name"],
                "location": site_data["location"],
                "category": site_data["category"],
                "is_primary": site_relation["is_primary"]
            })
            
            if site_relation["is_primary"]:
                primary_site = site_data
        
        # Generate session token
        token = generate_token()
        
        # Store token in database (in production, use proper session management)
        # For now, we'll return the token and user data
        
        return AuthResponse(
            user=UserResponse(
                id=user["id"],
                email=user["email"],
                name=user["name"],
                role=user["role"],
                sites=sites,
                primary_site=primary_site
            ),
            token=token
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")

@router.post("/register")
async def register(request: RegisterRequest):
    """
    Register a new user
    """
    try:
        # Check if email already exists
        existing_user = supabase.table("users").select("*").eq("email", request.email).execute()
        
        if existing_user.data:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Validate role
        if request.role not in ['farmer', 'stakeholder', 'admin']:
            raise HTTPException(status_code=400, detail="Invalid role")
        
        # Hash password
        password_hash = hash_password(request.password)
        
        # Create user
        user_data = {
            "email": request.email,
            "password_hash": password_hash,
            "name": request.name,
            "role": request.role
        }
        
        response = supabase.table("users").insert(user_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create user")
        
        user = response.data[0]
        
        return {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "message": "User registered successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@router.get("/user/{user_id}")
async def get_user(user_id: str):
    """
    Get user details by ID
    """
    try:
        response = supabase.table("users").select("*").eq("id", user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        user = response.data[0]
        
        # Get user's sites
        sites_response = supabase.table("user_sites").select(
            "*, sites(*)"
        ).eq("user_id", user_id).execute()
        
        sites = []
        for site_relation in sites_response.data:
            site_data = site_relation["sites"]
            sites.append({
                "id": site_data["id"],
                "name": site_data["name"],
                "location": site_data["location"],
                "category": site_data["category"],
                "is_primary": site_relation["is_primary"]
            })
        
        return {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "sites": sites
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get user: {str(e)}")
