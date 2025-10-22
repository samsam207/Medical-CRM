# Medical CRM - Complete Setup & Launch Script
# PowerShell Version

Write-Host "========================================" -ForegroundColor Green
Write-Host "   Medical CRM - Complete Setup & Launch" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "[1/8] Python found: $pythonVersion" -ForegroundColor Yellow
} catch {
    Write-Host "ERROR: Python is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Python 3.8+ and try again" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if Node.js is installed
try {
    $nodeVersion = node --version 2>&1
    Write-Host "[2/8] Node.js found: $nodeVersion" -ForegroundColor Yellow
} catch {
    Write-Host "ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js 16+ and try again" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[3/8] Setting up project directory..." -ForegroundColor Yellow
Set-Location $PSScriptRoot

Write-Host "[4/8] Creating virtual environment for backend..." -ForegroundColor Yellow
Set-Location "backend"
if (-not (Test-Path "venv")) {
    python -m venv venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to create virtual environment" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host "[5/8] Activating virtual environment and installing backend dependencies..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"
pip install --upgrade pip
pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install backend dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[6/8] Initializing database and running migrations..." -ForegroundColor Yellow
python -c "from app import create_app, db; app = create_app(); app.app_context().push(); db.create_all(); print('Database initialized successfully')"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to initialize database" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[7/8] Seeding database with initial data..." -ForegroundColor Yellow
python seed.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to seed database" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[8/8] Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location "..\frontend"
if (-not (Test-Path "node_modules")) {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install frontend dependencies" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Medical CRM Successfully Launched!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend API:  http://localhost:5000" -ForegroundColor Cyan
Write-Host "Frontend App: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Default Login Credentials:" -ForegroundColor Yellow
Write-Host "- Admin: admin / admin123" -ForegroundColor White
Write-Host "- Receptionist: sara_reception / sara123" -ForegroundColor White
Write-Host "- Doctor: dr_mohamed / doctor123" -ForegroundColor White
Write-Host ""

# Start backend server
Write-Host "Starting backend server..." -ForegroundColor Yellow
Set-Location "..\backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "& '.\venv\Scripts\Activate.ps1'; python run.py"

# Start frontend server
Write-Host "Starting frontend server..." -ForegroundColor Yellow
Set-Location "..\frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"

# Wait a moment for servers to start
Write-Host "Waiting for servers to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Open the application in default browser
Write-Host "Opening application in your browser..." -ForegroundColor Green
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "Application opened in your browser!" -ForegroundColor Green
Write-Host "Keep the server windows open to monitor the application." -ForegroundColor Yellow
Write-Host ""
Write-Host "To stop the servers, close the command windows or press Ctrl+C" -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to exit this setup script"
