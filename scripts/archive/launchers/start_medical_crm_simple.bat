@echo off
title Medical CRM - One-Click Launcher
color 0A

echo.
echo ========================================
echo    MEDICAL CRM SYSTEM
echo    One-Click Launcher
echo ========================================
echo.

:: Check if we're in the right directory
if not exist "backend" (
    echo ERROR: Please run this script from the Medical CRM project root directory
    echo    Make sure you can see the 'backend' and 'frontend' folders
    echo.
    pause
    exit /b 1
)

:: Check Python
echo Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found!
    echo.
    echo Please install Python 3.8+ from: https://www.python.org/downloads/
    echo.
    echo After installing Python:
    echo 1. Make sure to check "Add Python to PATH" during installation
    echo 2. Restart your computer
    echo 3. Run this script again
    echo.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('python --version 2^>^&1') do echo SUCCESS: %%i
)

:: Check Node.js
echo.
echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found!
    echo.
    echo Please install Node.js 16+ from: https://nodejs.org/
    echo.
    echo After installing Node.js:
    echo 1. Restart your computer
    echo 2. Run this script again
    echo.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version 2^>^&1') do echo SUCCESS: %%i
)

echo.
echo Starting Medical CRM Setup...
echo.

:: Setup Backend
echo [1/6] Setting up backend environment...
cd backend
if not exist "venv" (
    echo    Creating Python virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
    echo SUCCESS: Virtual environment created
) else (
    echo SUCCESS: Virtual environment already exists
)

echo [2/6] Installing backend dependencies...
call venv\Scripts\activate.bat
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo ERROR: Failed to install backend dependencies
    echo    Please check your internet connection and try again
    pause
    exit /b 1
)
echo SUCCESS: Backend dependencies installed

echo [3/6] Initializing database...
python -c "from app import create_app, db; app = create_app(); app.app_context().push(); db.create_all(); print('Database initialized')" 2>nul
if errorlevel 1 (
    echo ERROR: Failed to initialize database
    pause
    exit /b 1
)
echo SUCCESS: Database initialized

echo [4/6] Seeding database with sample data...
python seed.py >nul 2>&1
if errorlevel 1 (
    echo ERROR: Failed to seed database
    pause
    exit /b 1
)
echo SUCCESS: Database seeded with sample data

echo [5/6] Setting up frontend...
cd ..\frontend
if not exist "node_modules" (
    echo    Installing frontend dependencies...
    npm install --silent
    if errorlevel 1 (
        echo ERROR: Failed to install frontend dependencies
        echo    Please check your internet connection and try again
        pause
        exit /b 1
    )
    echo SUCCESS: Frontend dependencies installed
) else (
    echo SUCCESS: Frontend dependencies already installed
)

echo [6/6] Starting servers...
cd ..\backend
echo    Starting backend server on http://localhost:5000...
start "Medical CRM Backend" cmd /k "title Medical CRM - Backend Server && call venv\Scripts\activate.bat && echo Backend server starting... && echo API URL: http://localhost:5000 && echo Health Check: http://localhost:5000/api/health && echo. && python run.py"

cd ..\frontend
echo    Starting frontend server on http://localhost:3000...
start "Medical CRM Frontend" cmd /k "title Medical CRM - Frontend Server && echo Frontend server starting... && echo App URL: http://localhost:3000 && echo. && npm run dev"

echo.
echo Waiting for servers to start (this may take 30-60 seconds)...
echo    Please wait while the servers initialize...
timeout /t 10 /nobreak >nul

echo.
echo Testing server connectivity...

:: Test Backend
curl -s http://localhost:5000/api/health >nul 2>&1
if errorlevel 1 (
    echo WARNING: Backend server not responding yet
    echo    Please wait a moment and check the backend window
) else (
    echo SUCCESS: Backend server is running
)

:: Test Frontend (may take longer to start)
curl -s http://localhost:3000 >nul 2>&1
if errorlevel 1 (
    echo INFO: Frontend server is starting up...
    echo    This may take another 30-60 seconds
) else (
    echo SUCCESS: Frontend server is running
)

echo.
echo ========================================
echo    SETUP COMPLETE!
echo ========================================
echo.
echo Application URLs:
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:5000
echo    Health:   http://localhost:5000/api/health
echo.
echo Login Credentials:
echo    Admin:        admin / admin123
echo    Receptionist: sara_reception / sara123
echo    Doctor:       dr_mohamed / doctor123
echo.
echo Opening application in your browser...
start http://localhost:3000

echo.
echo The Medical CRM application should now open in your browser!
echo.
echo Important Notes:
echo    - Keep the server windows open to run the application
echo    - If the browser doesn't open, manually go to: http://localhost:3000
echo    - To stop the servers, close the command windows
echo    - If you see any errors, check the server windows for details
echo.
echo Troubleshooting:
echo    - If frontend doesn't load, wait 1-2 minutes and refresh the page
echo    - If backend fails, check the backend window for error messages
echo    - Make sure ports 3000 and 5000 are not used by other applications
echo.
pause
