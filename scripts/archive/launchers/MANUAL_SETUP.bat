@echo off
title Medical CRM - Manual Setup
color 0E

echo.
echo ========================================
echo    MEDICAL CRM - MANUAL SETUP
echo ========================================
echo.

echo This will set up Medical CRM step by step.
echo Press any key to continue...
pause

:: Check directory
if not exist "backend" (
    echo ERROR: Run this from the Medical CRM folder
    pause
    exit /b 1
)

:: Find Python
echo Step 1: Finding Python...
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
        echo Please install Python first
        pause
        exit /b 1
    )
)

:: Check Node.js
echo.
echo Step 2: Finding Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: No Node.js found!
    echo Please install Node.js first
    pause
    exit /b 1
) else (
    echo Found: node
)

:: Backend setup
echo.
echo Step 3: Setting up backend...
cd backend

echo Creating virtual environment...
%PYTHON_CMD% -m venv venv
if errorlevel 1 (
    echo ERROR: Failed to create virtual environment
    pause
    exit /b 1
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing Python packages...
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install packages
    pause
    exit /b 1
)

echo Setting up database...
%PYTHON_CMD% -c "from app import create_app, db; app = create_app(); app.app_context().push(); db.create_all()"
if errorlevel 1 (
    echo ERROR: Failed to create database
    pause
    exit /b 1
)

echo Adding sample data...
%PYTHON_CMD% seed.py
if errorlevel 1 (
    echo ERROR: Failed to add sample data
    pause
    exit /b 1
)

:: Frontend setup
echo.
echo Step 4: Setting up frontend...
cd ..\frontend

echo Installing Node.js packages...
npm install
if errorlevel 1 (
    echo ERROR: Failed to install packages
    pause
    exit /b 1
)

echo.
echo ========================================
echo    SETUP COMPLETE!
echo ========================================
echo.
echo Now you can run START.bat to launch the application
echo.
pause
