#!/usr/bin/env python3
"""
Verify the activity logging and notification flow
Run this after: 1) Farmer submits request, 2) Owner approves it
"""
from app.database.supabase import supabase

def verify_flow():
    print("=" * 80)
    print("VERIFYING ACTIVITY LOGGING & NOTIFICATION FLOW")
    print("=" * 80)
    
    farmer_email = 'karan@test.in'
    owner_email = 'owner@test.in'
    
    # 1. Get farmer and owner profiles
    print("\n1️⃣  Getting profiles...")
    farmer = supabase.table('profiles').select('id, email, full_name').eq('email', farmer_email).maybe_single().execute()
    owner = supabase.table('profiles').select('id, email, full_name').eq('email', owner_email).maybe_single().execute()
    
    if not farmer.data:
        print(f"❌ Farmer '{farmer_email}' not found")
        return
    if not owner.data:
        print(f"❌ Owner '{owner_email}' not found")
        return
    
    farmer_id = farmer.data['id']
    owner_id = owner.data['id']
    print(f"✅ Farmer: {farmer.data['full_name']} ({farmer_email})")
    print(f"✅ Owner: {owner.data['full_name']} ({owner_email})")
    
    # 2. Check farmer_activity_logs
    print("\n2️⃣  Checking farmer_activity_logs...")
    activity_logs = supabase.table('farmer_activity_logs').select('*').eq('farmer_id', farmer_id).order('created_at', desc=True).limit(10).execute()
    
    print(f"\n📋 Activity Logs ({len(activity_logs.data)} total):")
    for log in activity_logs.data:
        print(f"\n  Event: {log['event_type'].upper()}")
        print(f"  Title: {log['title']}")
        print(f"  Description: {log['description']}")
        print(f"  Severity: {log.get('severity', 'N/A')}")
        print(f"  Created: {log['created_at']}")
        
        if log['site_id']:
            site = supabase.table('sites').select('facility_name').eq('id', log['site_id']).maybe_single().execute()
            if site.data:
                print(f"  Site: {site.data['facility_name']}")
        
        if log['room_id']:
            room = supabase.table('cold_storage_rooms').select('room_code').eq('id', log['room_id']).maybe_single().execute()
            if room.data:
                print(f"  Room: {room.data['room_code']}")
    
    # 3. Check farmer_notifications
    print("\n3️⃣  Checking farmer_notifications...")
    notifications = supabase.table('farmer_notifications').select('*').eq('farmer_id', farmer_id).order('created_at', desc=True).limit(10).execute()
    
    print(f"\n🔔 Notifications ({len(notifications.data)} total):")
    unread = sum(1 for n in notifications.data if not n['is_read'])
    print(f"   Unread: {unread}")
    
    for notif in notifications.data:
        print(f"\n  Type: {notif['notification_type'].upper()}")
        print(f"  Title: {notif['title']}")
        print(f"  Message: {notif['message']}")
        print(f"  Status: {'✅ READ' if notif['is_read'] else '📨 UNREAD'}")
        print(f"  Created: {notif['created_at']}")
    
    # 4. Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    request_logs = [l for l in activity_logs.data if l['event_type'] in ['request_submitted', 'request_approved', 'request_rejected']]
    approvals = [n for n in notifications.data if n['notification_type'] == 'request_approved']
    
    print(f"\n✓ Room requests logged: {len(request_logs)}")
    print(f"✓ Approval notifications: {len(approvals)}")
    print(f"✓ Total activity logs: {len(activity_logs.data)}")
    print(f"✓ Unread notifications: {unread}")
    
    if len(request_logs) > 0:
        print("\n✅ Activity logging is working!")
    else:
        print("\n⚠️  No activity logs found. Make sure farmer submitted a request.")
    
    if len(approvals) > 0:
        print("✅ Notification system is working!")
    else:
        print("⚠️  No approval notifications found. Make sure owner approved the request.")

if __name__ == '__main__':
    verify_flow()
