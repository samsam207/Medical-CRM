@echo off
title Python Checker
color 0E

echo.
echo ========================================
echo    Python Installation Checker
echo ========================================
echo.

echo Checking for Python installations...
echo.

echo Method 1: Checking 'python' command...
python --version >nul 2>&1
if errorlevel 1 (
    echo python: NOT FOUND
) else (
    echo python: FOUND
    for /f "tokens=*" %%i in ('python --version 2^>^&1') do echo    Version: %%i
)

echo.
echo Method 2: Checking 'py' command...
py --version >nul 2>&1
if errorlevel 1 (
    echo py: NOT FOUND
) else (
    echo py: FOUND
    for /f "tokens=*" %%i in ('py --version 2^>^&1') do echo    Version: %%i
)

echo.
echo Method 3: Checking common Python locations...
set PYTHON_FOUND=0

if exist "C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python311\python.exe" (
    echo Found: C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python311\python.exe
    set PYTHON_FOUND=1
)

if exist "C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python310\python.exe" (
    echo Found: C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python310\python.exe
    set PYTHON_FOUND=1
)

if exist "C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python39\python.exe" (
    echo Found: C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python39\python.exe
    set PYTHON_FOUND=1
)

if exist "C:\Program Files\Python311\python.exe" (
    echo Found: C:\Program Files\Python311\python.exe
    set PYTHON_FOUND=1
)

if exist "C:\Program Files\Python310\python.exe" (
    echo Found: C:\Program Files\Python310\python.exe
    set PYTHON_FOUND=1
)

if exist "C:\Program Files\Python39\python.exe" (
    echo Found: C:\Program Files\Python39\python.exe
    set PYTHON_FOUND=1
)

echo.
python --version >nul 2>&1
if not errorlevel 1 (
    echo RESULT: Python is working correctly!
    echo.
    echo SOLUTION: You can run the Medical CRM launcher now
) else (
    py --version >nul 2>&1
    if not errorlevel 1 (
        echo RESULT: Python (py command) is working correctly!
        echo.
        echo SOLUTION: You can run the Medical CRM launcher now
    ) else (
        if %PYTHON_FOUND%==1 (
            echo RESULT: Python is installed but not in PATH
            echo.
            echo SOLUTION: Run fix_python_path.bat to fix this
        ) else (
            echo RESULT: Python is not installed
            echo.
            echo SOLUTION: Install Python from https://www.python.org/downloads/
            echo    Make sure to check "Add Python to PATH" during installation
        )
    )
)

echo.
pause
