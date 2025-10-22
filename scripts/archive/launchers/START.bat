@echo off
title Medical CRM - Quick Start
color 0A

echo.
echo ========================================
echo    MEDICAL CRM - QUICK START
echo ========================================
echo.

:: Check if we're in the right directory
if not exist "backend" (
    echo ERROR: Run this from the Medical CRM folder
    pause
    exit /b 1
)

:: Find Python
set PYTHON_CMD=
python --version >nul 2>&1
if not errorlevel 1 (
    set PYTHON_CMD=python
) else (
    py --version >nul 2>&1
    if not errorlevel 1 (
        set PYTHON_CMD=py
    ) else (
        echo ERROR: No Python found!
        pause
        exit /b 1
    )
)

:: Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: No Node.js found!
    pause
    exit /b 1
)

echo Starting servers...

:: Start Backend
cd backend
if exist "venv" (
    echo Starting backend...
    start "Backend" cmd /k "cd /d %CD% && call venv\Scripts\activate.bat && %PYTHON_CMD% run.py"
) else (
    echo ERROR: Backend not set up! Run LAUNCH.bat first
    pause
    exit /b 1
)

:: Start Frontend
cd ..\frontend
if exist "node_modules" (
    echo Starting frontend...
    start "Frontend" cmd /k "cd /d %CD% && npm run dev"
) else (
    echo ERROR: Frontend not set up! Run LAUNCH.bat first
    pause
    exit /b 1
)

:: Wait and open
timeout /t 5 /nobreak >nul
start http://localhost:3000

echo.
echo Application started!
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000
echo.
pause
