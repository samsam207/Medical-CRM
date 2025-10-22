@echo off
title Python Installation Helper
color 0E

echo.
echo ========================================
echo    Python Installation Helper
echo ========================================
echo.

echo This script will help you install Python correctly.
echo.

echo Step 1: Download Python
echo ------------------------
echo Please download Python from: https://www.python.org/downloads/
echo.
echo Step 2: Install Python
echo ----------------------
echo When installing Python, make sure to:
echo 1. Check "Add Python to PATH" checkbox
echo 2. Check "Add Python to environment variables" checkbox
echo 3. Choose "Install for all users" if possible
echo.

echo Step 3: Verify Installation
echo ----------------------------
echo After installation, this script will test if Python is working.
echo.

pause

echo.
echo Testing Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo Python is still not found in PATH.
    echo.
    echo Please try these solutions:
    echo.
    echo 1. Restart your computer after installing Python
    echo 2. Manually add Python to PATH:
    echo    - Open System Properties ^> Environment Variables
    echo    - Add Python installation folder to PATH
    echo    - Usually: C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python3x\
    echo.
    echo 3. Try installing Python again with "Add to PATH" checked
    echo.
    echo 4. Use the Microsoft Store version of Python
    echo.
) else (
    for /f "tokens=*" %%i in ('python --version 2^>^&1') do echo SUCCESS: %%i found!
    echo.
    echo Python is working correctly!
    echo You can now run the Medical CRM launcher.
)

echo.
pause
