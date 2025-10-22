@echo off
title Medical CRM Launcher
color 0A

echo.
echo ███████╗████████╗ █████╗ ██████╗ ████████╗██╗███╗   ███╗
echo ██╔════╝╚══██╔══╝██╔══██╗██╔══██╗╚══██╔══╝██║████╗ ████║
echo ███████╗   ██║   ███████║██████╔╝   ██║   ██║██╔████╔██║
echo ╚════██║   ██║   ██╔══██║██╔══██╗   ██║   ██║██║╚██╔╝██║
echo ███████║   ██║   ██║  ██║██║  ██║   ██║   ██║██║ ╚═╝ ██║
echo ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝╚═╝     ╚═╝
echo.
echo                    Medical CRM System
echo                   Complete Setup & Launch
echo.

:: Check if we're in the right directory
if not exist "backend" (
    echo ERROR: Please run this script from the Medical CRM project root directory
    echo Make sure you can see the 'backend' and 'frontend' folders
    pause
    exit /b 1
)

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found! Please install Python 3.8+ from python.org
    pause
    exit /b 1
) else (
    echo ✅ Python found
)

:: Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found! Please install Node.js 16+ from nodejs.org
    pause
    exit /b 1
) else (
    echo ✅ Node.js found
)

echo.
echo 🚀 Starting Medical CRM Setup...
echo.

:: Setup Backend
echo [1/6] Setting up backend environment...
cd backend
if not exist "venv" (
    echo    Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo ❌ Failed to create virtual environment
        pause
        exit /b 1
    )
)

echo [2/6] Installing backend dependencies...
call venv\Scripts\activate.bat
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo ❌ Failed to install backend dependencies
    pause
    exit /b 1
)

echo [3/6] Initializing database...
python -c "from app import create_app, db; app = create_app(); app.app_context().push(); db.create_all(); print('Database ready')" 2>nul
if errorlevel 1 (
    echo ❌ Failed to initialize database
    pause
    exit /b 1
)

echo [4/6] Seeding database...
python seed.py >nul 2>&1
if errorlevel 1 (
    echo ❌ Failed to seed database
    pause
    exit /b 1
)

echo [5/6] Setting up frontend...
cd ..\frontend
if not exist "node_modules" (
    echo    Installing frontend dependencies...
    npm install --silent
    if errorlevel 1 (
        echo ❌ Failed to install frontend dependencies
        pause
        exit /b 1
    )
)

echo [6/6] Starting servers...
cd ..\backend
start "Medical CRM Backend" cmd /k "title Backend Server && call venv\Scripts\activate.bat && echo Starting backend server... && python run.py"

cd ..\frontend
start "Medical CRM Frontend" cmd /k "title Frontend Server && echo Starting frontend server... && npm run dev"

echo.
echo ⏳ Waiting for servers to start...
timeout /t 8 /nobreak >nul

echo.
echo 🎉 Medical CRM is now running!
echo.
echo 📱 Application URLs:
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:5000
echo.
echo 🔑 Login Credentials:
echo    Admin:        admin / admin123
echo    Receptionist: sara_reception / sara123
echo    Doctor:       dr_mohamed / doctor123
echo.

:: Test if servers are running
echo 🔍 Testing servers...
curl -s http://localhost:5000/api/health >nul 2>&1
if errorlevel 1 (
    echo ❌ Backend not responding
) else (
    echo ✅ Backend is running
)

curl -s http://localhost:3000 >nul 2>&1
if errorlevel 1 (
    echo ⏳ Frontend starting up... (may take a moment)
) else (
    echo ✅ Frontend is running
)

echo.
echo 🌐 Opening application in your browser...
start http://localhost:3000

echo.
echo ✨ Setup complete! The application should open in your browser.
echo    If it doesn't open automatically, go to: http://localhost:3000
echo.
echo 📝 Keep the server windows open to run the application.
echo    To stop the servers, close the command windows.
echo.
pause
