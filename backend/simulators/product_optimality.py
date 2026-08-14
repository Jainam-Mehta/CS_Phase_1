"""
Product Optimality Calculator for ColdSense AI
Calculates optimal storage conditions and freshness based on real agricultural data
"""
from typing import Dict, Any, List
from config import Config

# Real agricultural storage conditions for each product
PRODUCT_STORAGE_CONDITIONS = {
    'Apple': {
        'optimal_temp_min': 0.0,
        'optimal_temp_max': 4.0,
        'optimal_humidity_min': 90,
        'optimal_humidity_max': 95,
        'shelf_life_days': 180,
        'storage_type': 'Cold Storage'
    },
    'Avocado': {
        'optimal_temp_min': 4.0,
        'optimal_temp_max': 13.0,
        'optimal_humidity_min': 85,
        'optimal_humidity_max': 90,
        'shelf_life_days': 14,
        'storage_type': 'Cool Storage'
    },
    'Dragon Fruit': {
        'optimal_temp_min': 5.0,
        'optimal_temp_max': 7.0,
        'optimal_humidity_min': 85,
        'optimal_humidity_max': 95,
        'shelf_life_days': 21,
        'storage_type': 'Cold Storage'
    },
    'Mango': {
        'optimal_temp_min': 10.0,
        'optimal_temp_max': 13.0,
        'optimal_humidity_min': 85,
        'optimal_humidity_max': 90,
        'shelf_life_days': 14,
        'storage_type': 'Cool Storage'
    },
    'Banana': {
        'optimal_temp_min': 13.0,
        'optimal_temp_max': 14.0,
        'optimal_humidity_min': 90,
        'optimal_humidity_max': 95,
        'shelf_life_days': 7,
        'storage_type': 'Cool Storage'
    },
    'Potato': {
        'optimal_temp_min': 7.0,
        'optimal_temp_max': 10.0,
        'optimal_humidity_min': 85,
        'optimal_humidity_max': 90,
        'shelf_life_days': 180,
        'storage_type': 'Cool Storage'
    },
    'Tomato': {
        'optimal_temp_min': 10.0,
        'optimal_temp_max': 15.0,
        'optimal_humidity_min': 85,
        'optimal_humidity_max': 90,
        'shelf_life_days': 14,
        'storage_type': 'Cool Storage'
    },
    'Onion': {
        'optimal_temp_min': 0.0,
        'optimal_temp_max': 4.0,
        'optimal_humidity_min': 65,
        'optimal_humidity_max': 70,
        'shelf_life_days': 180,
        'storage_type': 'Cold Storage'
    },
    'Grapes': {
        'optimal_temp_min': -1.0,
        'optimal_temp_max': 2.0,
        'optimal_humidity_min': 90,
        'optimal_humidity_max': 95,
        'shelf_life_days': 60,
        'storage_type': 'Cold Storage'
    },
    'Orange': {
        'optimal_temp_min': 3.0,
        'optimal_temp_max': 9.0,
        'optimal_humidity_min': 85,
        'optimal_humidity_max': 90,
        'shelf_life_days': 28,
        'storage_type': 'Cool Storage'
    },
    'Carrot': {
        'optimal_temp_min': 0.0,
        'optimal_temp_max': 5.0,
        'optimal_humidity_min': 90,
        'optimal_humidity_max': 95,
        'shelf_life_days': 120,
        'storage_type': 'Cold Storage'
    },
    'Capsicum': {
        'optimal_temp_min': 7.0,
        'optimal_temp_max': 10.0,
        'optimal_humidity_min': 90,
        'optimal_humidity_max': 95,
        'shelf_life_days': 14,
        'storage_type': 'Cool Storage'
    },
    'Milk': {
        'optimal_temp_min': 2.0,
        'optimal_temp_max': 4.0,
        'optimal_humidity_min': 85,
        'optimal_humidity_max': 90,
        'shelf_life_days': 7,
        'storage_type': 'Cold Storage'
    }
}

class ProductOptimalityCalculator:
    """Calculates product optimality based on storage conditions"""
    
    def calculate_temp_optimality(self, current_temp: float, product_name: str) -> float:
        """Calculate temperature optimality percentage"""
        conditions = PRODUCT_STORAGE_CONDITIONS.get(product_name)
        
        if not conditions:
            return 50.0  # Default if product not found
        
        optimal_min = conditions['optimal_temp_min']
        optimal_max = conditions['optimal_temp_max']
        
        if optimal_min <= current_temp <= optimal_max:
            return 100.0
        elif current_temp < optimal_min:
            # Below optimal - calculate how far off
            diff = optimal_min - current_temp
            if diff <= 2:
                return 90.0
            elif diff <= 5:
                return 70.0
            else:
                return 50.0
        else:
            # Above optimal - calculate how far off
            diff = current_temp - optimal_max
            if diff <= 2:
                return 90.0
            elif diff <= 5:
                return 70.0
            else:
                return 50.0
    
    def calculate_humidity_optimality(self, current_humidity: int, product_name: str) -> float:
        """Calculate humidity optimality percentage"""
        conditions = PRODUCT_STORAGE_CONDITIONS.get(product_name)
        
        if not conditions:
            return 50.0  # Default if product not found
        
        optimal_min = conditions['optimal_humidity_min']
        optimal_max = conditions['optimal_humidity_max']
        
        if optimal_min <= current_humidity <= optimal_max:
            return 100.0
        elif current_humidity < optimal_min:
            # Below optimal
            diff = optimal_min - current_humidity
            if diff <= 5:
                return 90.0
            elif diff <= 10:
                return 70.0
            else:
                return 50.0
        else:
            # Above optimal
            diff = current_humidity - optimal_max
            if diff <= 5:
                return 90.0
            elif diff <= 10:
                return 70.0
            else:
                return 50.0
    
    def calculate_overall_optimality(
        self, 
        current_temp: float, 
        current_humidity: int, 
        product_name: str
    ) -> float:
        """Calculate overall optimality (average of temp and humidity)"""
        temp_opt = self.calculate_temp_optimality(current_temp, product_name)
        humidity_opt = self.calculate_humidity_optimality(current_humidity, product_name)
        
        return round((temp_opt + humidity_opt) / 2, 1)
    
    def calculate_freshness(
        self, 
        harvest_date: str, 
        product_name: str,
        current_conditions: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate freshness and shelf life remaining"""
        from datetime import datetime, timedelta
        
        conditions = PRODUCT_STORAGE_CONDITIONS.get(product_name)
        
        if not conditions:
            return {
                'freshness_percentage': 50.0,
                'shelf_life_remaining_days': 0,
                'spoilage_risk': 'Medium'
            }
        
        try:
            harvest_dt = datetime.fromisoformat(harvest_date.replace('Z', '+00:00'))
        except:
            harvest_dt = datetime.now() - timedelta(days=7)
        
        days_stored = (datetime.now() - harvest_dt).days
        base_shelf_life = conditions['shelf_life_days']
        
        # Adjust shelf life based on storage conditions
        temp_opt = self.calculate_temp_optimality(current_conditions['temperature'], product_name)
        humidity_opt = self.calculate_humidity_optimality(current_conditions['humidity'], product_name)
        overall_opt = (temp_opt + humidity_opt) / 2
        
        # If conditions are optimal, extend shelf life by 20%
        # If conditions are poor, reduce shelf life by 30%
        if overall_opt >= 90:
            adjusted_shelf_life = base_shelf_life * 1.2
        elif overall_opt >= 70:
            adjusted_shelf_life = base_shelf_life
        else:
            adjusted_shelf_life = base_shelf_life * 0.7
        
        shelf_life_remaining = max(0, adjusted_shelf_life - days_stored)
        freshness_percentage = max(0, min(100, (shelf_life_remaining / adjusted_shelf_life) * 100))
        
        # Determine spoilage risk
        if freshness_percentage >= 70:
            spoilage_risk = 'Low'
        elif freshness_percentage >= 40:
            spoilage_risk = 'Medium'
        else:
            spoilage_risk = 'High'
        
        return {
            'freshness_percentage': round(freshness_percentage, 1),
            'shelf_life_remaining_days': int(shelf_life_remaining),
            'spoilage_risk': spoilage_risk
        }
    
    def calculate_product_optimality_for_room(
        self, 
        current_temp: float, 
        current_humidity: int, 
        products_in_room: List[str]
    ) -> List[Dict[str, Any]]:
        """Calculate optimality for all products in a room"""
        results = []
        
        for product_name in products_in_room:
            temp_opt = self.calculate_temp_optimality(current_temp, product_name)
            humidity_opt = self.calculate_humidity_optimality(current_humidity, product_name)
            overall_opt = self.calculate_overall_optimality(current_temp, current_humidity, product_name)
            
            conditions = PRODUCT_STORAGE_CONDITIONS.get(product_name)
            
            results.append({
                'product_name': product_name,
                'optimal_temp_range': f"{conditions['optimal_temp_min']}–{conditions['optimal_temp_max']}°C" if conditions else "N/A",
                'current_temp': current_temp,
                'temp_optimality': temp_opt,
                'optimal_humidity_range': f"{conditions['optimal_humidity_min']}–{conditions['optimal_humidity_max']}%" if conditions else "N/A",
                'current_humidity': current_humidity,
                'humidity_optimality': humidity_opt,
                'overall_optimality': overall_opt
            })
        
        return results
