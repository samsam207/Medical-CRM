@echo off
title Medical CRM Launcher
color 0A

echo.
echo ========================================
echo    MEDICAL CRM - SIMPLE LAUNCHER
echo ========================================
echo.

:: Check if we're in the right directory
if not exist "backend" (
    echo ERROR: Run this from the Medical CRM folder
    pause
    exit /b 1
)

:: Try to find Python
echo Looking for Python...
set PYTHON_CMD=
python --version >nul 2>&1
if not errorlevel 1 (
    set PYTHON_CMD=python
    echo Found: python
) else (
    py --version >nul 2>&1
    if not errorlevel 1 (
        set PYTHON_CMD=py
        echo Found: py
    ) else (
        echo ERROR: No Python found!
        echo Install Python from: https://www.python.org/downloads/
        pause
        exit /b 1
    )
)

:: Check Node.js
echo Looking for Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: No Node.js found!
    echo Install Node.js from: https://nodejs.org/
    pause
    exit /b 1
) else (
    echo Found: node
)

echo.
echo Starting setup...

:: Backend setup
echo Setting up backend...
cd backend

:: Create venv if not exists
if not exist "venv" (
    echo Creating virtual environment...
    %PYTHON_CMD% -m venv venv
)

:: Activate and install
echo Installing backend dependencies...
call venv\Scripts\activate.bat
pip install -r requirements.txt --quiet

:: Initialize database
echo Setting up database...
%PYTHON_CMD% -c "from app import create_app, db; app = create_app(); app.app_context().push(); db.create_all()" 2>nul
%PYTHON_CMD% seed.py 2>nul

:: Start backend
echo Starting backend server...
start "Backend" cmd /k "cd /d %CD% && call venv\Scripts\activate.bat && %PYTHON_CMD% run.py"

:: Frontend setup
echo Setting up frontend...
cd ..\frontend

:: Install if needed
if not exist "node_modules" (
    echo Installing frontend dependencies...
    npm install --silent
)

:: Start frontend
echo Starting frontend server...
start "Frontend" cmd /k "cd /d %CD% && npm run dev"

:: Wait a bit
echo.
echo Waiting for servers to start...
timeout /t 8 /nobreak >nul

:: Open browser
echo Opening application...
start http://localhost:3000

echo.
echo ========================================
echo    DONE! Application should be open
echo ========================================
echo.
echo URLs:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:5000
echo.
echo Login:
echo   admin / admin123
echo   sara_reception / sara123
echo   dr_mohamed / doctor123
echo.
pause
