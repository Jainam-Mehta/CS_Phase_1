"""
Seed/Demo Data API - FOR TESTING ONLY
Creates demo facilities, rooms, farmers, and batches for testing
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone, timedelta
from app.database.supabase import supabase

router = APIRouter(prefix="/seed", tags=["seed"])


@router.post("/create-demo")
async def create_demo_data(owner_email: str = "demo@coldsense.in"):
    """
    Create a complete demo setup for an owner account.
    Useful for testing and presentation.
    
    This creates:
    - Owner profile (if not exists)
    - 1 facility (Site_A Facility)
    - 3 cold storage rooms
    - 1 farmer profile
    - Approval records linking farmer to rooms
    - 5 test batches with inventory
    """
    try:
        print(f"🔍 Creating demo data for owner: {owner_email}")
        
        # Step 1: Get or create owner profile
        # First, get the owner role ID
        roles_resp = supabase.table("roles").select("id").eq("name", "owner").maybeSingle().execute()
        owner_role_id = roles_resp.data['id'] if roles_resp.data else 1
        
        # For testing: create a demo owner if none exists
        demo_owner_data = {
            "auth_user_id": f"demo-owner-{datetime.now().timestamp()}",  # Unique ID
            "first_name": "Demo",
            "last_name": "Owner",
            "role_id": owner_role_id,  # Use role_id FK instead of role string
            "company_name": "Demo Cold Chain"
        }
        
        owner_resp = supabase.table("profiles").insert([demo_owner_data]).execute()
        if not owner_resp.data:
            raise HTTPException(status_code=500, detail="Failed to create owner profile")
        
        owner_profile = owner_resp.data[0]
        owner_profile_id = owner_profile['id']
        print(f"✅ Created owner profile: {owner_profile_id}")
        
        # Step 2: Create site
        site_data = {
            "facility_name": "Site_A Facility",
            "owner_profile_id": owner_profile_id,
            "capacity_kg": 5000,
            "current_utilization_kg": 0,
            "total_capacity_kg": 5000
        }
        
        site_resp = supabase.table("sites").insert([site_data]).execute()
        if not site_resp.data:
            raise HTTPException(status_code=500, detail="Failed to create site")
        
        site = site_resp.data[0]
        site_id = site['id']
        print(f"✅ Created site: {site_id}")
        
        # Step 3: Create 3 cold storage rooms
        rooms_data = [
            {
                "site_id": site_id,
                "room_name": "Room A1",
                "capacity_kg": 1500,
                "current_utilization_kg": 0,
                "storage_rate_per_kg_month": 2.5
            },
            {
                "site_id": site_id,
                "room_name": "Room A2",
                "capacity_kg": 1500,
                "current_utilization_kg": 0,
                "storage_rate_per_kg_month": 2.5
            },
            {
                "site_id": site_id,
                "room_name": "Room A3",
                "capacity_kg": 2000,
                "current_utilization_kg": 0,
                "storage_rate_per_kg_month": 3.0
            }
        ]
        
        rooms_resp = supabase.table("cold_storage_rooms").insert(rooms_data).execute()
        if not rooms_resp.data:
            raise HTTPException(status_code=500, detail="Failed to create rooms")
        
        rooms = rooms_resp.data
        room_ids = [r['id'] for r in rooms]
        print(f"✅ Created {len(rooms)} rooms: {room_ids}")
        
        # Step 4: Create demo farmer profile
        # Get farmer role ID
        farmer_role_resp = supabase.table("roles").select("id").eq("name", "farmer").maybeSingle().execute()
        farmer_role_id = farmer_role_resp.data['id'] if farmer_role_resp.data else 2
        
        farmer_data = {
            "auth_user_id": f"demo-farmer-{datetime.now().timestamp()}",
            "first_name": "Demo",
            "last_name": "Farmer",
            "role_id": farmer_role_id,  # Use role_id FK instead of role string
            "company_name": "Demo Farm"
        }
        
        farmer_resp = supabase.table("profiles").insert([farmer_data]).execute()
        if not farmer_resp.data:
            raise HTTPException(status_code=500, detail="Failed to create farmer profile")
        
        farmer = farmer_resp.data[0]
        farmer_id = farmer['id']
        print(f"✅ Created farmer profile: {farmer_id}")
        
        # Step 5: Create approval records (farmer access to rooms)
        approvals_data = [
            {
                "farmer_id": farmer_id,
                "room_id": room_ids[0],
                "status": "Approved",
                "price_per_crate": 1.25,
                "requested_at": datetime.now(timezone.utc).isoformat(),
                "approved_at": datetime.now(timezone.utc).isoformat(),
                "approved_by": owner_profile_id
            },
            {
                "farmer_id": farmer_id,
                "room_id": room_ids[1],
                "status": "Approved",
                "price_per_crate": 1.25,
                "requested_at": datetime.now(timezone.utc).isoformat(),
                "approved_at": datetime.now(timezone.utc).isoformat(),
                "approved_by": owner_profile_id
            },
            {
                "farmer_id": farmer_id,
                "room_id": room_ids[2],
                "status": "Approved",
                "price_per_crate": 1.50,
                "requested_at": datetime.now(timezone.utc).isoformat(),
                "approved_at": datetime.now(timezone.utc).isoformat(),
                "approved_by": owner_profile_id
            }
        ]
        
        approvals_resp = supabase.table("farmer_room_access").insert(approvals_data).execute()
        if not approvals_resp.data:
            raise HTTPException(status_code=500, detail="Failed to create approvals")
        
        print(f"✅ Created {len(approvals_resp.data)} approval records")
        
        # Step 6: Create 5 demo batches with inventory
        batches_data = []
        today = datetime.now(timezone.utc)
        
        products = [
            {"name": "Apple", "id": None},
            {"name": "Tomato", "id": None},
            {"name": "Potato", "id": None},
            {"name": "Banana", "id": None},
            {"name": "Carrot", "id": None}
        ]
        
        # Get product IDs
        for product in products:
            prod_resp = supabase.table("products").select("id").eq("name", product["name"]).single().execute()
            if prod_resp.data:
                product["id"] = prod_resp.data['id']
        
        # Create batches
        for i, product in enumerate(products):
            if not product["id"]:
                continue  # Skip if product not found
            
            batch_code = f"BATCH-DEMO-{i+1}-{int(datetime.now().timestamp())}"
            harvest_date = (today - timedelta(days=i*2)).date()
            expiry_date = (harvest_date + timedelta(days=30))
            
            batch = {
                "batch_code": batch_code,
                "farmer_id": farmer_id,
                "product_id": product["id"],
                "harvest_date": str(harvest_date),
                "expiry_date": str(expiry_date),
                "initial_quantity_kg": (i+1) * 100,
                "remaining_quantity_kg": (i+1) * 100,
                "quality_grade": "A",
                "remarks": f"Demo batch {i+1}"
            }
            batches_data.append(batch)
        
        batches_resp = supabase.table("batches").insert(batches_data).execute()
        if not batches_resp.data:
            raise HTTPException(status_code=500, detail="Failed to create batches")
        
        batches = batches_resp.data
        print(f"✅ Created {len(batches)} demo batches")
        
        # Step 7: Create batch_room_allocations
        allocations_data = []
        for i, batch in enumerate(batches):
            # Allocate to one of the rooms (rotate through rooms)
            room_id = room_ids[i % len(room_ids)]
            
            allocation = {
                "batch_id": batch['id'],
                "room_id": room_id,
                "quantity_kg": batch['initial_quantity_kg'],
                "assigned_at": datetime.now(timezone.utc).isoformat(),
                "removed_at": None
            }
            allocations_data.append(allocation)
        
        alloc_resp = supabase.table("batch_room_allocations").insert(allocations_data).execute()
        if not alloc_resp.data:
            raise HTTPException(status_code=500, detail="Failed to create allocations")
        
        print(f"✅ Created {len(alloc_resp.data)} batch allocations")
        
        return {
            "success": True,
            "message": "Demo data created successfully",
            "owner_id": owner_profile_id,
            "site_id": site_id,
            "farmer_id": farmer_id,
            "rooms": len(rooms),
            "batches": len(batches),
            "details": {
                "owner_profile_id": owner_profile_id,
                "site_name": "Site_A Facility",
                "farmer_name": f"{farmer['first_name']} {farmer['last_name']}",
                "rooms_created": len(rooms),
                "batches_created": len(batches),
                "instruction": "1. Login as owner\n2. Go to Settings → Sites\n3. See 'Site_A Facility' with farmers\n4. Go to Inventory → See all batches"
            }
        }
        
    except Exception as e:
        print(f"❌ Error creating demo data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create demo data: {str(e)}")


@router.get("/check-data")
async def check_data():
    """Quick endpoint to check if data exists"""
    try:
        facilities = supabase.table("facilities").select("id").execute()
        batches = supabase.table("batches").select("id").execute()
        approvals = supabase.table("farmer_room_access").select("id").eq("status", "Approved").execute()
        
        return {
            "facilities_count": len(facilities.data or []),
            "batches_count": len(batches.data or []),
            "approved_farmers": len(approvals.data or []),
            "has_data": len(facilities.data or []) > 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
