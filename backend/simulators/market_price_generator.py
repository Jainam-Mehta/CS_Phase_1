"""
Market Price Generator for ColdSense AI Simulator
Generates realistic daily market prices for agricultural products
"""
import random
from datetime import datetime, date
from typing import Dict, List, Any

class MarketPriceGenerator:
    """Generates realistic market prices for products"""
    
    # Base prices (₹/kg) for different products
    BASE_PRICES = {
        'Avocado': {'base': 180, 'variance': 25, 'state_factor': 1.0},
        'Mango': {'base': 115, 'variance': 20, 'state_factor': 0.9},
        'Apple': {'base': 92, 'variance': 15, 'state_factor': 1.1},
        'Tomato': {'base': 33, 'variance': 8, 'state_factor': 0.95},
        'Onion': {'base': 38, 'variance': 12, 'state_factor': 1.0},
        'Potato': {'base': 27, 'variance': 5, 'state_factor': 0.9},
        'Banana': {'base': 48, 'variance': 10, 'state_factor': 1.0},
        'Dragon Fruit': {'base': 245, 'variance': 40, 'state_factor': 1.2},
        'Grapes': {'base': 75, 'variance': 15, 'state_factor': 1.1},
        'Orange': {'base': 55, 'variance': 12, 'state_factor': 1.0},
        'Carrot': {'base': 42, 'variance': 8, 'state_factor': 0.95},
        'Capsicum': {'base': 65, 'variance': 15, 'state_factor': 1.05},
        'Milk': {'base': 48, 'variance': 3, 'state_factor': 1.0},
    }
    
    # Major agricultural states in India
    STATES = [
        'Maharashtra',
        'Uttar Pradesh',
        'Karnataka',
        'Gujarat',
        'Madhya Pradesh',
        'Punjab',
        'Tamil Nadu',
        'West Bengal',
        'Andhra Pradesh',
        'Rajasthan',
    ]
    
    # Major cities for market prices
    STATE_CITIES = {
        'Maharashtra': ['Mumbai', 'Pune', 'Nashik'],
        'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Agra'],
        'Karnataka': ['Bangalore', 'Mysore', 'Mangalore'],
        'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara'],
        'Madhya Pradesh': ['Indore', 'Bhopal', 'Jabalpur'],
        'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar'],
        'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai'],
        'West Bengal': ['Kolkata', 'Siliguri', 'Durgapur'],
        'Andhra Pradesh': ['Vijayawada', 'Visakhapatnam', 'Guntur'],
        'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur'],
    }
    
    # Market names for realism
    MARKET_NAMES = [
        'Wholesale Market',
        'APMC Market',
        'Agricultural Market',
        'Farmers Market',
        'Central Market',
        'City Market',
        'District Market',
    ]
    
    def __init__(self):
        """Initialize the market price generator"""
        # Store last generated prices to ensure smooth daily transitions
        self.last_prices: Dict[str, float] = {}
        # Seed for consistent but varied prices
        random.seed(datetime.now().date().toordinal())
    
    def generate_price_for_product(
        self,
        product_name: str,
        state: str,
        city: str = None,
        market_name: str = None
    ) -> float:
        """
        Generate a realistic price for a product in a specific location
        
        Args:
            product_name: Name of the product (e.g., 'Mango')
            state: State name (e.g., 'Maharashtra')
            city: City name (optional, will be randomly chosen if not provided)
            market_name: Market name (optional, will be randomly chosen)
        
        Returns:
            Price in ₹/kg
        """
        if product_name not in self.BASE_PRICES:
            # Unknown product, return a default price
            return 45.0
        
        price_info = self.BASE_PRICES[product_name]
        base_price = price_info['base']
        variance = price_info['variance']
        state_factor = price_info['state_factor']
        
        # Generate a unique seed for this product+state+date combination
        # This ensures same price for same product/state/date but varies daily
        seed_key = f"{product_name}_{state}_{datetime.now().date()}"
        random.seed(hash(seed_key) % (2**32))
        
        # Calculate price with realistic variance
        # - Base price ± variance
        # - State factor (some states have higher/lower prices)
        # - City variation (within ±5%)
        # - Market variation (within ±3%)
        
        price = base_price
        
        # Apply daily variance (±variance range)
        daily_change = random.uniform(-variance, variance)
        price += daily_change
        
        # Apply state factor
        price *= state_factor
        
        # Apply city variation if city is provided
        if city:
            city_variation = random.uniform(0.95, 1.05)
            price *= city_variation
        
        # Apply market variation if market is provided
        if market_name:
            market_variation = random.uniform(0.97, 1.03)
            price *= market_variation
        
        # Reset seed to normal
        random.seed()
        
        # Ensure price is reasonable (no negative prices)
        price = max(price, base_price * 0.5)
        
        # Round to 2 decimal places
        return round(price, 2)
    
    def generate_prices_for_all_products(
        self,
        products: List[str],
        state: str,
        city: str = None
    ) -> List[Dict[str, Any]]:
        """
        Generate prices for multiple products in a location
        
        Args:
            products: List of product names
            state: State name
            city: City name (optional)
        
        Returns:
            List of price records ready for database insertion
        """
        if not city:
            # Pick a random city from the state
            city = random.choice(self.STATE_CITIES.get(state, ['Unknown City']))
        
        market_name = random.choice(self.MARKET_NAMES)
        
        price_records = []
        
        for product in products:
            price = self.generate_price_for_product(product, state, city, market_name)
            
            record = {
                'product_name': product,
                'price_per_kg': price,
                'state': state,
                'city': city,
                'market_name': market_name,
                'recorded_at': datetime.now().isoformat(),
                'source': 'simulator'
            }
            
            price_records.append(record)
        
        return price_records
    
    def generate_prices_for_all_states(
        self,
        products: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Generate prices for all products in all major states
        
        Args:
            products: List of product names
        
        Returns:
            List of all price records
        """
        all_prices = []
        
        for state in self.STATES:
            # Generate for 1-2 cities per state
            cities = self.STATE_CITIES.get(state, ['Unknown City'])
            num_cities = min(2, len(cities))
            selected_cities = random.sample(cities, num_cities)
            
            for city in selected_cities:
                prices = self.generate_prices_for_all_products(products, state, city)
                all_prices.extend(prices)
        
        return all_prices
    
    def get_daily_price_summary(
        self,
        product_name: str
    ) -> Dict[str, Any]:
        """
        Get a summary of prices for a product across all states
        
        Args:
            product_name: Name of the product
        
        Returns:
            Summary dict with min, max, avg prices
        """
        prices = []
        
        for state in self.STATES:
            price = self.generate_price_for_product(product_name, state)
            prices.append(price)
        
        if not prices:
            return {'min': 0, 'max': 0, 'avg': 0, 'count': 0}
        
        return {
            'min': round(min(prices), 2),
            'max': round(max(prices), 2),
            'avg': round(sum(prices) / len(prices), 2),
            'count': len(prices),
            'date': datetime.now().date().isoformat()
        }


if __name__ == '__main__':
    """Test the market price generator"""
    generator = MarketPriceGenerator()
    
    print("Market Price Generator - Test Run")
    print("=" * 50)
    
    # Test single product
    print("\n1. Mango prices in Maharashtra:")
    price = generator.generate_price_for_product('Mango', 'Maharashtra', 'Mumbai', 'APMC Market')
    print(f"   Price: ₹{price}/kg")
    
    # Test multiple products in one location
    print("\n2. All products in Karnataka (Bangalore):")
    products = ['Mango', 'Apple', 'Tomato', 'Onion']
    prices = generator.generate_prices_for_all_products(products, 'Karnataka', 'Bangalore')
    for record in prices:
        print(f"   {record['product_name']}: ₹{record['price_per_kg']}/kg")
    
    # Test summary
    print("\n3. Avocado price summary across all states:")
    summary = generator.get_daily_price_summary('Avocado')
    print(f"   Min: ₹{summary['min']}/kg")
    print(f"   Max: ₹{summary['max']}/kg")
    print(f"   Avg: ₹{summary['avg']}/kg")
    print(f"   States: {summary['count']}")
    
    print("\n" + "=" * 50)
    print("Test completed successfully!")
