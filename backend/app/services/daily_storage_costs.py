"""
Daily Storage Cost Calculation Service
======================================

This module calculates daily storage costs for each farmer-room combination.
Triggered: Daily at 23:59 UTC via scheduler OR on batch_room_allocations change
Calculation: For each active allocation, multiply crates_stored × price_per_crate
Stores:  Records inserted into farmer_daily_storage_costs table

Schema: farmer_daily_storage_costs
  - farmer_id, room_id, cost_date (UNIQUE constraint)
  - daily_crate_count (# of crates stored that day)
  - price_per_crate (snapshot price for that date)
  - daily_cost = daily_crate_count × price_per_crate
  - cumulative_cost = previous_day_cumulative + daily_cost

"""

from datetime import datetime, date, timezone, timedelta
from typing import Optional, List, Dict, Tuple
from app.database.supabase import supabase
import logging

logger = logging.getLogger(__name__)

class DailyStorageCostCalculator:
    """Calculates and records daily storage costs for farmers."""
    
    KG_PER_CRATE = 25  # 1 crate = 25 kg (from schema)
    
    @staticmethod
    def calculate_for_date(target_date: Optional[date] = None) -> Dict:
        """
        Calculate and record daily storage costs for a specific date.
        
        Args:
            target_date: Date to calculate costs for (default: yesterday)
                        Using yesterday because daily job runs after midnight
                        
        Returns:
            Dict with results: {
                'success': bool,
                'date': date,
                'records_created': int,
                'records_updated': int,
                'total_revenue': float,
                'errors': List[str]
            }
        """
        try:
            if target_date is None:
                # Default to yesterday (costs calculated day-after)
                target_date = (datetime.now(timezone.utc) - timedelta(days=1)).date()
            
            logger.info(f"🔄 Starting daily storage cost calculation for {target_date}")
            
            results = {
                'success': True,
                'date': str(target_date),
                'records_created': 0,
                'records_updated': 0,
                'total_revenue': 0.0,
                'errors': []
            }
            
            # Step 1: Get all active allocations for this date
            # "Active" = assigned_at <= target_date AND (removed_at IS NULL OR removed_at > target_date)
            target_date_str = target_date.isoformat()
            
            allocations_resp = supabase.table('batch_room_allocations').select("""
                id, batch_id, room_id, quantity_kg, assigned_at, removed_at,
                batches!inner(id, farmer_id)
            """).lte('assigned_at', target_date_str).execute()
            
            allocations = allocations_resp.data or []
            logger.info(f"📍 Found {len(allocations)} total allocations")
            
            # Filter to only those active on target_date
            active_allocations = []
            for alloc in allocations:
                assigned = datetime.fromisoformat(alloc['assigned_at'].replace('Z', '+00:00')).date()
                removed = None
                if alloc.get('removed_at'):
                    removed = datetime.fromisoformat(alloc['removed_at'].replace('Z', '+00:00')).date()
                
                # Check if active on target date
                if assigned <= target_date and (removed is None or removed > target_date):
                    active_allocations.append(alloc)
            
            logger.info(f"✅ {len(active_allocations)} allocations active on {target_date}")
            
            # Step 2: Group allocations by (farmer_id, room_id)
            farmer_room_costs: Dict[Tuple[str, str], Dict] = {}
            
            for alloc in active_allocations:
                farmer_id = alloc['batches']['farmer_id']
                room_id = alloc['room_id']
                quantity_kg = float(alloc['quantity_kg'] or 0)
                
                key = (farmer_id, room_id)
                if key not in farmer_room_costs:
                    farmer_room_costs[key] = {
                        'farmer_id': farmer_id,
                        'room_id': room_id,
                        'total_quantity_kg': 0,
                        'allocations': []
                    }
                
                farmer_room_costs[key]['total_quantity_kg'] += quantity_kg
                farmer_room_costs[key]['allocations'].append(alloc)
            
            logger.info(f"📊 Grouped into {len(farmer_room_costs)} farmer-room combinations")
            
            # Step 3: For each farmer-room, calculate daily cost
            for (farmer_id, room_id), cost_data in farmer_room_costs.items():
                try:
                    total_quantity_kg = cost_data['total_quantity_kg']
                    daily_crate_count = int(total_quantity_kg / DailyStorageCostCalculator.KG_PER_CRATE)
                    
                    # Step 4: Look up price for this room on target_date
                    price_per_crate = DailyStorageCostCalculator._get_price_for_date(
                        room_id, target_date
                    )
                    
                    if price_per_crate is None:
                        logger.warning(f"⚠️  No pricing found for room {room_id} on {target_date}, skipping")
                        results['errors'].append(f"No pricing for room {room_id} on {target_date}")
                        continue
                    
                    # Step 5: Calculate daily cost
                    daily_cost = daily_crate_count * price_per_crate
                    
                    # Step 6: Get room info (site_code)
                    room_resp = supabase.table('cold_storage_rooms').select("""
                        site_id, room_code
                    """).eq('id', room_id).single().execute()
                    
                    if not room_resp.data:
                        logger.error(f"❌ Room {room_id} not found")
                        results['errors'].append(f"Room {room_id} not found")
                        continue
                    
                    room_data = room_resp.data
                    site_id = room_data['site_id']
                    
                    # Get site_code
                    site_resp = supabase.table('sites').select('site_code').eq('id', site_id).single().execute()
                    site_code = site_resp.data['site_code'] if site_resp.data else 'UNKNOWN'
                    
                    # Step 7: Get previous cumulative cost
                    prev_cumulative = DailyStorageCostCalculator._get_previous_cumulative(
                        farmer_id, room_id, target_date
                    )
                    
                    cumulative_cost = prev_cumulative + daily_cost
                    
                    # Step 8: UPSERT into farmer_daily_storage_costs
                    # Using ON CONFLICT to handle if record already exists
                    payload = {
                        'farmer_id': farmer_id,
                        'room_id': room_id,
                        'site_code': site_code,
                        'cost_date': target_date_str,
                        'daily_crate_count': daily_crate_count,
                        'price_per_crate': price_per_crate,
                        'daily_cost': daily_cost,
                        'cumulative_cost': cumulative_cost,
                        'payment_status': 'unpaid'  # Default status
                    }
                    
                    # Try update first (if record exists)
                    update_resp = supabase.table('farmer_daily_storage_costs').update(payload).eq(
                        'farmer_id', farmer_id
                    ).eq('room_id', room_id).eq('cost_date', target_date_str).execute()
                    
                    if update_resp.data:
                        results['records_updated'] += 1
                        logger.info(f"  ✏️  Updated cost for farmer {farmer_id[:8]}... in room {room_id[:8]}...")
                    else:
                        # If no record to update, insert new one
                        insert_resp = supabase.table('farmer_daily_storage_costs').insert(payload).execute()
                        if insert_resp.data:
                            results['records_created'] += 1
                            logger.info(f"  ✅ Created cost for farmer {farmer_id[:8]}... in room {room_id[:8]}...")
                        else:
                            logger.error(f"  ❌ Failed to insert cost for farmer {farmer_id[:8]}...")
                            results['errors'].append(f"Failed to insert cost for farmer {farmer_id}")
                    
                    results['total_revenue'] += daily_cost
                    
                    # Step 9: Update farmer_multi_room_summary for this farmer on target_date
                    DailyStorageCostCalculator._update_multi_room_summary(farmer_id, target_date)
                    
                except Exception as e:
                    logger.error(f"❌ Error processing farmer {farmer_id} in room {room_id}: {str(e)}")
                    results['errors'].append(f"Error for farmer {farmer_id}: {str(e)}")
                    results['success'] = False
            
            logger.info(f"✨ Daily cost calculation complete:")
            logger.info(f"   Created: {results['records_created']}, Updated: {results['records_updated']}, Total Revenue: ₹{results['total_revenue']:.2f}")
            
            return results
            
        except Exception as e:
            logger.error(f"💥 Fatal error in daily cost calculation: {str(e)}")
            return {
                'success': False,
                'date': str(target_date),
                'records_created': 0,
                'records_updated': 0,
                'total_revenue': 0.0,
                'errors': [f"Fatal error: {str(e)}"]
            }
    
    @staticmethod
    def _get_price_for_date(room_id: str, target_date: date) -> Optional[float]:
        """
        Look up the storage price for a room on a specific date.
        
        Priority:
        1. room_pricing (WHERE effective_from <= target_date AND effective_until >= target_date)
        2. room_access_pricing (if no room_pricing found, use approved price)
        
        Args:
            room_id: Room UUID
            target_date: Date to look up price for
            
        Returns:
            price_per_crate (float) or None if not found
        """
        target_date_str = target_date.isoformat()
        
        # Try room_pricing first (more recent, per-room pricing)
        pricing_resp = supabase.table('room_pricing').select('price_per_crate').eq(
            'room_id', room_id
        ).lte('effective_from', target_date_str).execute()
        
        if pricing_resp.data:
            # Find most recent pricing that's still active (effective_until is NULL or > target_date)
            for pricing in sorted(pricing_resp.data, key=lambda x: x.get('effective_from', ''), reverse=True):
                effective_until = pricing.get('effective_until')
                if effective_until is None or effective_until >= target_date_str:
                    return float(pricing['price_per_crate'])
        
        # Fallback to room_access_pricing if available
        # First, find farmer_room_access records for this room with approved pricing
        access_resp = supabase.table('farmer_room_access').select("""
            id, room_access_pricing(price_per_crate, approved_at)
        """).eq('room_id', room_id).eq('status', 'Approved').execute()
        
        if access_resp.data:
            for access in access_resp.data:
                pricing_data = access.get('room_access_pricing')
                if pricing_data:
                    if isinstance(pricing_data, list) and len(pricing_data) > 0:
                        return float(pricing_data[0]['price_per_crate'])
                    elif isinstance(pricing_data, dict):
                        return float(pricing_data['price_per_crate'])
        
        return None
    
    @staticmethod
    def _get_previous_cumulative(farmer_id: str, room_id: str, target_date: date) -> float:
        """
        Get the cumulative cost from the previous day for this farmer-room.
        
        Args:
            farmer_id: Farmer UUID
            room_id: Room UUID
            target_date: Current date (will look for yesterday)
            
        Returns:
            Previous cumulative cost (0 if no previous record)
        """
        previous_date = (target_date - timedelta(days=1)).isoformat()
        
        prev_resp = supabase.table('farmer_daily_storage_costs').select(
            'cumulative_cost'
        ).eq('farmer_id', farmer_id).eq('room_id', room_id).eq(
            'cost_date', previous_date
        ).single().execute()
        
        if prev_resp.data:
            return float(prev_resp.data['cumulative_cost'])
        
        return 0.0
    
    @staticmethod
    def _update_multi_room_summary(farmer_id: str, target_date: date) -> None:
        """
        Update farmer_multi_room_summary for a farmer on a specific date.
        Aggregates all farmer-room costs for that day.
        
        Args:
            farmer_id: Farmer UUID
            target_date: Date to summarize
        """
        try:
            target_date_str = target_date.isoformat()
            
            # Get all costs for this farmer on target_date across all rooms
            costs_resp = supabase.table('farmer_daily_storage_costs').select("""
                room_id, daily_cost, cumulative_cost, daily_crate_count
            """).eq('farmer_id', farmer_id).eq('cost_date', target_date_str).execute()
            
            costs = costs_resp.data or []
            
            if not costs:
                logger.info(f"  ℹ️  No costs to summarize for farmer {farmer_id[:8]}... on {target_date}")
                return
            
            # Calculate totals
            total_daily_cost = sum(float(c['daily_cost']) for c in costs)
            total_crates = sum(int(c['daily_crate_count']) for c in costs)
            total_quantity_kg = total_crates * DailyStorageCostCalculator.KG_PER_CRATE
            total_rooms_active = len(costs)
            
            # Get max cumulative (most recent across rooms on this date)
            total_cumulative_cost = max(float(c['cumulative_cost']) for c in costs)
            
            payload = {
                'farmer_id': farmer_id,
                'summary_date': target_date_str,
                'total_rooms_active': total_rooms_active,
                'total_daily_cost': total_daily_cost,
                'total_cumulative_cost': total_cumulative_cost,
                'total_crates_stored': total_crates,
                'total_quantity_kg': total_quantity_kg
            }
            
            # UPSERT into farmer_multi_room_summary
            update_resp = supabase.table('farmer_multi_room_summary').update(payload).eq(
                'farmer_id', farmer_id
            ).eq('summary_date', target_date_str).execute()
            
            if update_resp.data:
                logger.info(f"  ✏️  Updated multi-room summary for farmer {farmer_id[:8]}...")
            else:
                insert_resp = supabase.table('farmer_multi_room_summary').insert(payload).execute()
                if insert_resp.data:
                    logger.info(f"  ✅ Created multi-room summary for farmer {farmer_id[:8]}...")
        
        except Exception as e:
            logger.error(f"  ❌ Error updating multi-room summary: {str(e)}")


async def run_daily_cost_calculation():
    """
    Main entry point for daily cost calculation.
    To be called by: APScheduler nightly job OR FastAPI endpoint
    """
    logger.info("=" * 80)
    logger.info("START: Daily Storage Cost Calculation Job")
    logger.info("=" * 80)
    
    result = DailyStorageCostCalculator.calculate_for_date()
    
    logger.info("=" * 80)
    logger.info(f"END: Daily Storage Cost Calculation - Success: {result['success']}")
    logger.info("=" * 80)
    
    return result
