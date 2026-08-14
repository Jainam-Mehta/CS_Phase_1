"""
Door Event Generator for ColdSense AI
Generates realistic door opening/closing events with analytics
"""
import random
from datetime import datetime, timedelta
from typing import Dict, Any, List
from config import Config

class DoorGenerator:
    """Generates door event data with analytics tracking"""
    
    def __init__(self):
        self.daily_opens: Dict[str, int] = {}
        self.open_durations: Dict[str, List[int]] = {}
        self.last_open_time: Dict[str, datetime] = {}
    
    def generate_door_event(self, room_id: str) -> Dict[str, Any]:
        """Generate a door event (open/close)"""
        is_open = random.random() < Config.DOOR_OPEN_PROBABILITY
        
        if is_open:
            # Door opened
            duration = random.randint(
                Config.DOOR_OPEN_DURATION_MIN,
                Config.DOOR_OPEN_DURATION_MAX
            )
            
            # Track daily opens
            if room_id not in self.daily_opens:
                self.daily_opens[room_id] = 0
            self.daily_opens[room_id] += 1
            
            # Track durations
            if room_id not in self.open_durations:
                self.open_durations[room_id] = []
            self.open_durations[room_id].append(duration)
            
            # Keep only last 100 durations
            if len(self.open_durations[room_id]) > 100:
                self.open_durations[room_id] = self.open_durations[room_id][-100:]
            
            # Track last open time
            self.last_open_time[room_id] = datetime.now()
            
            return {
                'event_type': 'door_open',
                'room_id': room_id,
                'duration_seconds': duration,
                'timestamp': datetime.now().isoformat()
            }
        else:
            # Door closed
            return {
                'event_type': 'door_close',
                'room_id': room_id,
                'duration_seconds': 0,
                'timestamp': datetime.now().isoformat()
            }
    
    def get_door_opens_today(self, room_id: str) -> int:
        """Get number of door opens today for a room"""
        return self.daily_opens.get(room_id, 0)
    
    def get_average_open_duration(self, room_id: str) -> float:
        """Get average door open duration for a room"""
        if room_id not in self.open_durations or len(self.open_durations[room_id]) == 0:
            return 0.0
        
        durations = self.open_durations[room_id]
        return round(sum(durations) / len(durations), 1)
    
    def get_longest_open_duration(self, room_id: str) -> int:
        """Get longest door open duration for a room"""
        if room_id not in self.open_durations or len(self.open_durations[room_id]) == 0:
            return 0
        
        return max(self.open_durations[room_id])
    
    def get_last_open_time(self, room_id: str) -> str:
        """Get last door open time for a room"""
        if room_id not in self.last_open_time:
            return None
        
        return self.last_open_time[room_id].isoformat()
    
    def get_door_analytics(self, room_id: str) -> Dict[str, Any]:
        """Get complete door analytics for a room"""
        return {
            'opens_today': self.get_door_opens_today(room_id),
            'average_open_duration': self.get_average_open_duration(room_id),
            'longest_open_duration': self.get_longest_open_duration(room_id),
            'last_open_time': self.get_last_open_time(room_id)
        }
    
    def get_door_history(self, room_id: str, hours: int = 24) -> List[Dict[str, Any]]:
        """Generate historical door events for graphing"""
        history = []
        now = datetime.now()
        
        # Generate realistic historical data
        for i in range(hours):
            timestamp = now - timedelta(hours=hours - i)
            
            # More likely to have door events during daytime
            hour = timestamp.hour
            if 8 <= hour <= 18:
                open_probability = Config.DOOR_OPEN_PROBABILITY * 2
            else:
                open_probability = Config.DOOR_OPEN_PROBABILITY * 0.5
            
            if random.random() < open_probability:
                duration = random.randint(
                    Config.DOOR_OPEN_DURATION_MIN,
                    Config.DOOR_OPEN_DURATION_MAX
                )
                history.append({
                    'timestamp': timestamp.isoformat(),
                    'event_type': 'door_open',
                    'duration_seconds': duration
                })
        
        return history
