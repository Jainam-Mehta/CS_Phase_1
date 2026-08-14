"""
Energy Data Generator for ColdSense AI
Generates realistic energy consumption data with historical records
"""
import random
from datetime import datetime, timedelta
from typing import Dict, Any, List
from config import Config

class EnergyGenerator:
    """Generates energy consumption data with historical tracking"""
    
    def __init__(self):
        self.hourly_history: Dict[str, List[float]] = {}
        self.daily_history: Dict[str, List[float]] = {}
        self.weekly_history: Dict[str, List[float]] = {}
    
    def generate_hourly_energy(self, room_id: str, base_consumption: float) -> float:
        """Generate hourly energy consumption (kWh)"""
        # Slight variation from base consumption
        variation = base_consumption * 0.1  # 10% variation
        hourly = round(base_consumption + random.uniform(-variation, variation), 2)
        
        # Store in history
        if room_id not in self.hourly_history:
            self.hourly_history[room_id] = []
        
        self.hourly_history[room_id].append(hourly)
        
        # Keep only last 24 hours
        if len(self.hourly_history[room_id]) > 24:
            self.hourly_history[room_id] = self.hourly_history[room_id][-24:]
        
        return hourly
    
    def generate_daily_energy(self, room_id: str) -> float:
        """Generate daily energy consumption (kWh)"""
        if room_id not in self.hourly_history or len(self.hourly_history[room_id]) == 0:
            return 0.0
        
        # Sum last 24 hours
        recent_hours = self.hourly_history[room_id][-24:]
        daily = round(sum(recent_hours), 2)
        
        # Store in daily history
        if room_id not in self.daily_history:
            self.daily_history[room_id] = []
        
        self.daily_history[room_id].append(daily)
        
        # Keep only last 7 days
        if len(self.daily_history[room_id]) > 7:
            self.daily_history[room_id] = self.daily_history[room_id][-7:]
        
        return daily
    
    def generate_weekly_energy(self, room_id: str) -> float:
        """Generate weekly energy consumption (kWh)"""
        if room_id not in self.daily_history or len(self.daily_history[room_id]) == 0:
            return 0.0
        
        # Sum last 7 days
        recent_days = self.daily_history[room_id][-7:]
        weekly = round(sum(recent_days), 2)
        
        # Store in weekly history
        if room_id not in self.weekly_history:
            self.weekly_history[room_id] = []
        
        self.weekly_history[room_id].append(weekly)
        
        # Keep only last 4 weeks
        if len(self.weekly_history[room_id]) > 4:
            self.weekly_history[room_id] = self.weekly_history[room_id][-4:]
        
        return weekly
    
    def get_hourly_history(self, room_id: str) -> List[Dict[str, Any]]:
        """Get hourly energy history for graphing"""
        if room_id not in self.hourly_history:
            return []
        
        history = []
        now = datetime.now()
        
        for i, energy in enumerate(self.hourly_history[room_id]):
            timestamp = now - timedelta(hours=len(self.hourly_history[room_id]) - 1 - i)
            history.append({
                'timestamp': timestamp.isoformat(),
                'energy_kwh': energy
            })
        
        return history
    
    def get_daily_history(self, room_id: str) -> List[Dict[str, Any]]:
        """Get daily energy history for graphing"""
        if room_id not in self.daily_history:
            return []
        
        history = []
        now = datetime.now()
        
        for i, energy in enumerate(self.daily_history[room_id]):
            timestamp = now - timedelta(days=len(self.daily_history[room_id]) - 1 - i)
            history.append({
                'timestamp': timestamp.isoformat(),
                'energy_kwh': energy
            })
        
        return history
    
    def get_weekly_history(self, room_id: str) -> List[Dict[str, Any]]:
        """Get weekly energy history for graphing"""
        if room_id not in self.weekly_history:
            return []
        
        history = []
        now = datetime.now()
        
        for i, energy in enumerate(self.weekly_history[room_id]):
            timestamp = now - timedelta(weeks=len(self.weekly_history[room_id]) - 1 - i)
            history.append({
                'timestamp': timestamp.isoformat(),
                'energy_kwh': energy
            })
        
        return history
