# PowerShell script to subscribe to 'tum' topic on GCP MQTT broker
# Shows real-time sensor data in terminal

$BrokerIP = "34.47.199.84"
$BrokerPort = "1883"
$Topic = "tum"

Write-Host "=================================================="
Write-Host "ColdSense MQTT Subscriber - 'tum' Topic Monitor" -ForegroundColor Cyan
Write-Host "=================================================="
Write-Host ""
Write-Host "Broker: $BrokerIP`:$BrokerPort" -ForegroundColor Yellow
Write-Host "Topic:  $Topic" -ForegroundColor Yellow
Write-Host ""
Write-Host "Connecting..." -ForegroundColor Green
Write-Host ""

# Try to use mosquitto_sub if available
$mosquitto = Get-Command mosquitto_sub -ErrorAction SilentlyContinue

if ($mosquitto) {
    Write-Host "Using mosquitto_sub..." -ForegroundColor Green
    & mosquitto_sub -h $BrokerIP -p $BrokerPort -t $Topic -v
} else {
    Write-Host "mosquitto_sub not found. Using Python script instead..." -ForegroundColor Yellow
    Write-Host ""
    
    # Check if Python is available
    $python = Get-Command python -ErrorAction SilentlyContinue
    if ($python) {
        Write-Host "Running subscribe_to_tum.py..." -ForegroundColor Green
        & python subscribe_to_tum.py
    } else {
        Write-Host "Error: Neither mosquitto_sub nor Python found!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Option 1: Install mosquitto-clients" -ForegroundColor Yellow
        Write-Host "  Download: https://mosquitto.org/download/"
        Write-Host ""
        Write-Host "Option 2: Install Python and run:" -ForegroundColor Yellow
        Write-Host "  python subscribe_to_tum.py"
    }
}
