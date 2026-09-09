# ColdSense Backend Development Startup Script
# PowerShell script to start the FastAPI backend with proper environment

Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 59) -ForegroundColor Cyan
Write-Host "  ColdSense FastAPI Backend - Development Server" -ForegroundColor Green
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 59) -ForegroundColor Cyan

# Check if virtual environment exists
if (Test-Path ".\venv\Scripts\Activate.ps1") {
    Write-Host "[✓] Virtual environment found" -ForegroundColor Green
    Write-Host "[*] Activating virtual environment..." -ForegroundColor Yellow
    & .\venv\Scripts\Activate.ps1
} else {
    Write-Host "[!] Virtual environment not found at .\venv" -ForegroundColor Red
    Write-Host "[*] Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
    & .\venv\Scripts\Activate.ps1
    Write-Host "[*] Installing dependencies..." -ForegroundColor Yellow
    pip install -r requirements.txt
}

# Check if .env file exists
if (Test-Path ".\.env") {
    Write-Host "[✓] Environment file found" -ForegroundColor Green
} else {
    Write-Host "[!] WARNING: .env file not found!" -ForegroundColor Red
    Write-Host "[*] Copy .env.example to .env and configure it" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Starting FastAPI server..." -ForegroundColor Cyan
Write-Host ""

# Start the server
python run.py

# Deactivate virtual environment on exit
deactivate
