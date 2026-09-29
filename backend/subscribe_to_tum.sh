#!/bin/bash
# Subscribe to 'tum' topic on GCP MQTT broker
# Shows real-time sensor data in terminal

BROKER_IP="34.47.199.84"
BROKER_PORT="1883"
TOPIC="tum"

echo "=================================================="
echo "ColdSense MQTT Subscriber - 'tum' Topic Monitor"
echo "=================================================="
echo ""
echo "Broker: $BROKER_IP:$BROKER_PORT"
echo "Topic:  $TOPIC"
echo ""
echo "Connecting..."
echo ""

# Subscribe with verbose output
mosquitto_sub -h $BROKER_IP -p $BROKER_PORT -t $TOPIC -v

# If mosquitto_sub is not found, show helpful message
if [ $? -eq 127 ]; then
    echo ""
    echo "Error: mosquitto_sub not found"
    echo ""
    echo "Install mosquitto-clients:"
    echo "  Windows (chocolatey): choco install mosquitto"
    echo "  Ubuntu/Debian: sudo apt-get install mosquitto-clients"
    echo "  macOS: brew install mosquitto"
    echo ""
    echo "Or use Python instead:"
    echo "  python subscribe_to_tum.py"
fi
