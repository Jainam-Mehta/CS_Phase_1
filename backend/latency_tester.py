"""
ColdSense End-to-End Latency Tester
Measures: Gateway Reading → Dashboard Display

Usage:
    python latency_tester.py --messages 50 --interval 5

This script:
1. Sends test MQTT messages with timestamps
2. Polls the database to check when data arrives
3. Calculates latency at each step
4. Generates report
"""

import paho.mqtt.client as mqtt
import time
import json
import argparse
from datetime import datetime
from typing import List, Dict
import statistics
from app.database.supabase import supabase
from app.config import MQTT_BROKER, MQTT_PORT
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

# Test configuration
TEST_ROOM_CODE = "R01"  # Adjust to your test room
TEST_SITE_CODE = "S01"
TEST_GATEWAY_ID = "LATENCY-TEST-001"

class LatencyTester:
    def __init__(self, num_messages: int = 50, interval: int = 5):
        """
        Args:
            num_messages: Number of test messages to send
            interval: Seconds between messages
        """
        self.num_messages = num_messages
        self.interval = interval
        self.results: List[Dict] = []
        self.mqtt_client = None
        
    def setup_mqtt(self):
        """Connect to MQTT broker"""
        self.mqtt_client = mqtt.Client(
            callback_api_version=mqtt.CallbackAPIVersion.VERSION1,
            client_id="latency-tester"
        )
        self.mqtt_client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
        self.mqtt_client.loop_start()
        time.sleep(2)  # Wait for connection
        logger.info(f"✓ Connected to MQTT broker: {MQTT_BROKER}:{MQTT_PORT}")
    
    def send_test_message(self, message_num: int) -> Dict:
        """
        Send test message with timestamp
        Returns dict with send details
        """
        timestamp_send = time.time()
        timestamp_send_ms = int(timestamp_send * 1000)
        
        # Create test payload
        payload = {
            "TS": datetime.now().strftime("%y%m%d%H%M%S"),
            "fver": 0.1,
            "SS": -75,
            "device": [
                {
                    "id": 1,
                    "slave_id": 1,
                    "data": {
                        "Temp1": "25.5",
                        "Humidity1": "65.0"
                    }
                }
            ],
            "DIGI": "Off",
            "test_id": f"LATENCY-TEST-{message_num}",
            "test_timestamp_send_ms": timestamp_send_ms
        }
        
        topic = f"cdsense/gw/{TEST_GATEWAY_ID}/{TEST_SITE_CODE}/{TEST_ROOM_CODE}"
        
        # Send via MQTT
        self.mqtt_client.publish(topic, json.dumps(payload), qos=1)
        
        logger.info(f"[{message_num}] Sent MQTT message at {timestamp_send:.3f}")
        
        return {
            "message_num": message_num,
            "test_id": f"LATENCY-TEST-{message_num}",
            "timestamp_send": timestamp_send,
            "timestamp_send_ms": timestamp_send_ms,
            "topic": topic
        }
    
    def wait_for_database_entry(self, test_id: str, timeout: int = 10) -> float:
        """
        Poll database until reading appears
        Returns latency in milliseconds
        """
        start_wait = time.time()
        
        while True:
            elapsed = time.time() - start_wait
            if elapsed > timeout:
                logger.warning(f"  ⏱️ TIMEOUT: Message not found in {timeout}s")
                return None
            
            # Check cold_storage_conditions table
            try:
                result = supabase.table("cold_storage_conditions") \
                    .select("recorded_at, sensor_id") \
                    .like("reading_source", f"%{test_id}%") \
                    .limit(1) \
                    .execute()
                
                if result.data:
                    timestamp_received = time.time()
                    latency_ms = (timestamp_received - start_wait) * 1000
                    
                    logger.info(f"  ✓ Found in DB after {latency_ms:.1f}ms")
                    return latency_ms
                
                time.sleep(0.1)  # Poll every 100ms
                
            except Exception as e:
                logger.error(f"  ✗ DB query error: {e}")
                time.sleep(0.5)
    
    def run_test(self):
        """Run full latency test"""
        logger.info(f"\n{'='*70}")
        logger.info(f"ColdSense Latency Test: {self.num_messages} messages")
        logger.info(f"{'='*70}\n")
        
        self.setup_mqtt()
        
        latencies = []
        failures = 0
        
        for msg_num in range(1, self.num_messages + 1):
            logger.info(f"\n[Message {msg_num}/{self.num_messages}]")
            
            # Send message
            send_info = self.send_test_message(msg_num)
            
            # Wait for it to appear in database
            latency = self.wait_for_database_entry(send_info["test_id"], timeout=10)
            
            if latency is not None:
                latencies.append(latency)
                self.results.append({
                    **send_info,
                    "latency_ms": latency,
                    "status": "success"
                })
            else:
                failures += 1
                self.results.append({
                    **send_info,
                    "latency_ms": None,
                    "status": "timeout"
                })
            
            # Wait before next message
            if msg_num < self.num_messages:
                logger.info(f"  Waiting {self.interval}s before next message...")
                time.sleep(self.interval)
        
        # Generate report
        self.print_report(latencies, failures)
        
        # Cleanup
        self.mqtt_client.loop_stop()
    
    def print_report(self, latencies: List[float], failures: int):
        """Print latency test report"""
        if not latencies:
            logger.error("No successful measurements!")
            return
        
        logger.info(f"\n{'='*70}")
        logger.info("LATENCY TEST REPORT")
        logger.info(f"{'='*70}\n")
        
        # Calculate statistics
        min_lat = min(latencies)
        max_lat = max(latencies)
        avg_lat = statistics.mean(latencies)
        median_lat = statistics.median(latencies)
        
        if len(latencies) > 1:
            std_dev = statistics.stdev(latencies)
        else:
            std_dev = 0
        
        # Percentiles
        sorted_lat = sorted(latencies)
        p50 = sorted_lat[len(sorted_lat) // 2]
        p95 = sorted_lat[int(len(sorted_lat) * 0.95)]
        p99 = sorted_lat[int(len(sorted_lat) * 0.99)] if len(sorted_lat) > 100 else sorted_lat[-1]
        
        # Print results
        logger.info(f"Messages Sent:        {self.num_messages}")
        logger.info(f"Successful:           {len(latencies)} ({len(latencies)*100/self.num_messages:.1f}%)")
        logger.info(f"Failed/Timeout:       {failures}\n")
        
        logger.info("LATENCY STATISTICS (milliseconds):")
        logger.info(f"  Minimum:            {min_lat:.1f} ms")
        logger.info(f"  Maximum:            {max_lat:.1f} ms")
        logger.info(f"  Average:            {avg_lat:.1f} ms")
        logger.info(f"  Median (P50):       {median_lat:.1f} ms")
        logger.info(f"  Std Dev:            {std_dev:.1f} ms\n")
        
        logger.info("PERCENTILE BREAKDOWN:")
        logger.info(f"  P50 (50%):          {p50:.1f} ms")
        logger.info(f"  P95 (95%):          {p95:.1f} ms")
        logger.info(f"  P99 (99%):          {p99:.1f} ms\n")
        
        # Classification
        logger.info("LATENCY CLASSIFICATION:")
        excellent = len([l for l in latencies if l < 300])
        good = len([l for l in latencies if 300 <= l < 500])
        acceptable = len([l for l in latencies if 500 <= l < 1000])
        poor = len([l for l in latencies if l >= 1000])
        
        logger.info(f"  Excellent (<300ms): {excellent} messages ({excellent*100/len(latencies):.1f}%)")
        logger.info(f"  Good (300-500ms):   {good} messages ({good*100/len(latencies):.1f}%)")
        logger.info(f"  Acceptable (500-1s):{acceptable} messages ({acceptable*100/len(latencies):.1f}%)")
        logger.info(f"  Poor (>1s):         {poor} messages ({poor*100/len(latencies):.1f}%)\n")
        
        # Overall verdict
        logger.info("OVERALL VERDICT:")
        if avg_lat < 300:
            verdict = "✓ EXCELLENT - Ready for production (< 300ms average)"
        elif avg_lat < 500:
            verdict = "✓ GOOD - Production ready (300-500ms average)"
        elif avg_lat < 1000:
            verdict = "⚠ ACCEPTABLE - Monitor performance (500ms-1s)"
        else:
            verdict = "✗ POOR - Needs optimization (> 1s)"
        
        logger.info(f"  {verdict}\n")
        
        # Recommendation
        logger.info("RECOMMENDATION:")
        if avg_lat < 500:
            logger.info("  ✓ System latency is acceptable for cold chain monitoring")
            logger.info("  ✓ Can promise < 500ms to customers")
        else:
            logger.info("  ⚠ System may need optimization:")
            logger.info("  - Check database write speed")
            logger.info("  - Verify MQTT broker CPU/memory")
            logger.info("  - Check network congestion")
            logger.info("  - Consider using local DB instead of Supabase")
        
        logger.info(f"\n{'='*70}\n")
        
        # Save detailed results
        self.save_results()
    
    def save_results(self):
        """Save detailed results to file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"latency_results_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump({
                "test_date": datetime.now().isoformat(),
                "broker": MQTT_BROKER,
                "num_messages": self.num_messages,
                "interval": self.interval,
                "results": self.results
            }, f, indent=2)
        
        logger.info(f"Results saved to: {filename}")


def main():
    parser = argparse.ArgumentParser(
        description="ColdSense Latency Tester"
    )
    parser.add_argument(
        "--messages",
        type=int,
        default=50,
        help="Number of test messages (default: 50)"
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=5,
        help="Seconds between messages (default: 5)"
    )
    
    args = parser.parse_args()
    
    tester = LatencyTester(
        num_messages=args.messages,
        interval=args.interval
    )
    
    try:
        tester.run_test()
    except KeyboardInterrupt:
        logger.info("\n\nTest interrupted by user")
    except Exception as e:
        logger.error(f"Test failed: {e}", exc_info=True)


if __name__ == "__main__":
    main()
