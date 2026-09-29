#!/usr/bin/env python3
"""
Test script to verify MQTT subscriber can startup without errors.
This validates all the bug fixes before attempting real E2E testing.
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

def test_imports():
    """Test that all modules can be imported without errors."""
    print("🧪 Testing module imports...")
    try:
        print("  - Importing door_service...")
        from app.services.door_service import process_door_state_change, close_door_open_event
        print("    ✓ door_service imported successfully")
        
        print("  - Importing sensor_service...")
        from app.services.sensor_service import save_sensor_reading, save_cold_storage_condition
        print("    ✓ sensor_service imported successfully")
        
        print("  - Importing subscriber...")
        from app.mqtt.subscriber import on_message, _update_sensor_device, SENSOR_TYPE_MAPPING
        print("    ✓ subscriber imported successfully")
        
        return True
    except Exception as e:
        print(f"    ✗ Import failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_sensor_type_mapping():
    """Test that the sensor type mapping covers required variants."""
    print("\n🧪 Testing sensor type mapping...")
    try:
        from app.mqtt.subscriber import SENSOR_TYPE_MAPPING
        
        test_cases = [
            ("temperature", "temperature"),
            ("temp", "temperature"),
            ("ambient_temperature", "ambient_temperature"),
            ("ambienttemperature", "ambient_temperature"),
            ("humid", "humidity"),
            ("door", "door"),
            ("suctionpressure", "suction_pressure"),
            ("energy", "energy"),
            ("solar", "solar"),
        ]
        
        all_passed = True
        for input_type, expected_output in test_cases:
            result = SENSOR_TYPE_MAPPING.get(input_type, input_type)
            if result == expected_output:
                print(f"  ✓ '{input_type}' → '{result}'")
            else:
                print(f"  ✗ '{input_type}' → '{result}' (expected '{expected_output}')")
                all_passed = False
        
        return all_passed
    except Exception as e:
        print(f"  ✗ Mapping test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_door_service():
    """Test that door_service doesn't have syntax errors."""
    print("\n🧪 Testing door_service functions...")
    try:
        from app.services.door_service import get_door_status
        print("  ✓ get_door_status function is callable")
        return True
    except Exception as e:
        print(f"  ✗ door_service test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    print("=" * 60)
    print("ColdSense MQTT Subscriber - Startup Verification Test")
    print("=" * 60)
    
    results = {
        "imports": test_imports(),
        "sensor_mapping": test_sensor_type_mapping(),
        "door_service": test_door_service(),
    }
    
    print("\n" + "=" * 60)
    print("Test Summary:")
    print("=" * 60)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"  {status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n✅ All startup tests passed! Backend is ready for E2E testing.")
        return 0
    else:
        print(f"\n❌ {total - passed} test(s) failed. Fix these before proceeding.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
