#!/usr/bin/env python3
"""
Medical CRM Setup Script
This script helps set up the Medical CRM system for development
"""

import os
import sys
import subprocess
import platform

def run_command(command, cwd=None):
    """Run a command and return the result"""
    try:
        result = subprocess.run(command, shell=True, cwd=cwd, check=True, capture_output=True, text=True)
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        return False, e.stderr

def check_python():
    """Check if Python is installed and version is correct"""
    print("Checking Python installation...")
    try:
        version = sys.version_info
        if version.major < 3 or (version.major == 3 and version.minor < 8):
            print("❌ Python 3.8+ is required")
            return False
        print(f"✅ Python {version.major}.{version.minor}.{version.micro} found")
        return True
    except Exception as e:
        print(f"❌ Python check failed: {e}")
        return False

def check_node():
    """Check if Node.js is installed"""
    print("Checking Node.js installation...")
    success, output = run_command("node --version")
    if success:
        print(f"✅ Node.js {output.strip()} found")
        return True
    else:
        print("❌ Node.js not found. Please install Node.js 16+")
        return False

def setup_backend():
    """Set up the backend"""
    print("\n🔧 Setting up backend...")
    
    # Check if we're in the right directory
    if not os.path.exists("backend"):
        print("❌ Backend directory not found. Please run this script from the project root.")
        return False
    
    # Create virtual environment
    print("Creating virtual environment...")
    success, output = run_command("python -m venv backend/venv")
    if not success:
        print(f"❌ Failed to create virtual environment: {output}")
        return False
    print("✅ Virtual environment created")
    
    # Determine activation script based on OS
    if platform.system() == "Windows":
        activate_script = "backend/venv/Scripts/activate"
        pip_command = "backend/venv/Scripts/pip"
        python_command = "backend/venv/Scripts/python"
    else:
        activate_script = "backend/venv/bin/activate"
        pip_command = "backend/venv/bin/pip"
        python_command = "backend/venv/bin/python"
    
    # Install requirements
    print("Installing Python dependencies...")
    success, output = run_command(f"{pip_command} install -r backend/requirements.txt")
    if not success:
        print(f"❌ Failed to install requirements: {output}")
        return False
    print("✅ Python dependencies installed")
    
    # Initialize database
    print("Initializing database...")
    success, output = run_command(f"{python_command} -c \"from app import create_app, db; app = create_app(); app.app_context().push(); db.create_all()\"", cwd="backend")
    if not success:
        print(f"❌ Failed to initialize database: {output}")
        return False
    print("✅ Database initialized")
    
    # Seed database
    print("Seeding database...")
    success, output = run_command(f"{python_command} seed.py", cwd="backend")
    if not success:
        print(f"❌ Failed to seed database: {output}")
        return False
    print("✅ Database seeded")
    
    print("✅ Backend setup complete!")
    return True

def setup_frontend():
    """Set up the frontend"""
    print("\n🔧 Setting up frontend...")
    
    # Check if we're in the right directory
    if not os.path.exists("frontend"):
        print("❌ Frontend directory not found. Please run this script from the project root.")
        return False
    
    # Install dependencies
    print("Installing Node.js dependencies...")
    success, output = run_command("npm install", cwd="frontend")
    if not success:
        print(f"❌ Failed to install dependencies: {output}")
        return False
    print("✅ Node.js dependencies installed")
    
    print("✅ Frontend setup complete!")
    return True

def main():
    """Main setup function"""
    print("🏥 Medical CRM Setup Script")
    print("=" * 40)
    
    # Check prerequisites
    if not check_python():
        sys.exit(1)
    
    if not check_node():
        sys.exit(1)
    
    # Setup backend
    if not setup_backend():
        print("\n❌ Backend setup failed!")
        sys.exit(1)
    
    # Setup frontend
    if not setup_frontend():
        print("\n❌ Frontend setup failed!")
        sys.exit(1)
    
    print("\n🎉 Setup complete!")
    print("\nTo start the application:")
    print("1. Start Redis: redis-server")
    print("2. Start Celery worker: cd backend && python celery_worker.py")
    print("3. Start Flask server: cd backend && python run.py")
    print("4. Start React dev server: cd frontend && npm run dev")
    print("\nDefault credentials:")
    print("- Admin: admin / admin123")
    print("- Receptionist: sara_reception / sara123")

if __name__ == "__main__":
    main()
