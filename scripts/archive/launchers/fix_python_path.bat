@echo off
title Fix Python PATH Issue
color 0C

echo.
echo ========================================
echo    Fix Python PATH Issue
echo ========================================
echo.

echo This script will help fix Python PATH issues.
echo.

echo Checking current Python installation...
python --version >nul 2>&1
if not errorlevel 1 (
    echo SUCCESS: Python is already working!
    for /f "tokens=*" %%i in ('python --version 2^>^&1') do echo Found: %%i
    echo.
    echo You can now run the Medical CRM launcher.
    pause
    exit /b 0
)

echo Python not found in PATH. Let's fix this...
echo.

echo Method 1: Try common Python locations...
set PYTHON_FOUND=0

:: Try Python 3.11
if exist "C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python311\python.exe" (
    echo Found Python 3.11 in user directory
    set "PATH=%PATH%;C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python311;C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python311\Scripts"
    set PYTHON_FOUND=1
)

:: Try Python 3.10
if exist "C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python310\python.exe" (
    echo Found Python 3.10 in user directory
    set "PATH=%PATH%;C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python310;C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python310\Scripts"
    set PYTHON_FOUND=1
)

:: Try Python 3.9
if exist "C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python39\python.exe" (
    echo Found Python 3.9 in user directory
    set "PATH=%PATH%;C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python39;C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python39\Scripts"
    set PYTHON_FOUND=1
)

:: Try system-wide Python
if exist "C:\Program Files\Python311\python.exe" (
    echo Found Python 3.11 in Program Files
    set "PATH=%PATH%;C:\Program Files\Python311;C:\Program Files\Python311\Scripts"
    set PYTHON_FOUND=1
)

if exist "C:\Program Files\Python310\python.exe" (
    echo Found Python 3.10 in Program Files
    set "PATH=%PATH%;C:\Program Files\Python310;C:\Program Files\Python310\Scripts"
    set PYTHON_FOUND=1
)

if exist "C:\Program Files\Python39\python.exe" (
    echo Found Python 3.9 in Program Files
    set "PATH=%PATH%;C:\Program Files\Python39;C:\Program Files\Python39\Scripts"
    set PYTHON_FOUND=1
)

if %PYTHON_FOUND%==1 (
    echo.
    echo Testing Python with updated PATH...
    python --version >nul 2>&1
    if not errorlevel 1 (
        echo SUCCESS: Python is now working!
        for /f "tokens=*" %%i in ('python --version 2^>^&1') do echo Found: %%i
        echo.
        echo You can now run the Medical CRM launcher.
        pause
        exit /b 0
    ) else (
        py --version >nul 2>&1
        if not errorlevel 1 (
            echo SUCCESS: Python (py command) is now working!
            for /f "tokens=*" %%i in ('py --version 2^>^&1') do echo Found: %%i
            echo.
            echo You can now run the Medical CRM launcher.
            pause
            exit /b 0
        )
    )
)

echo.
echo Python still not found. Please try these solutions:
echo.
echo 1. Install Python from https://www.python.org/downloads/
echo    - Make sure to check "Add Python to PATH" during installation
echo.
echo 2. Install Python from Microsoft Store
echo    - Search for "Python 3.11" in Microsoft Store
echo.
echo 3. Manually add Python to PATH:
echo    - Open System Properties ^> Environment Variables
echo    - Add Python installation folder to PATH
echo    - Common locations:
echo      - C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python3x\
echo      - C:\Program Files\Python3x\
echo.
echo 4. Restart your computer after installing Python
echo.

pause
