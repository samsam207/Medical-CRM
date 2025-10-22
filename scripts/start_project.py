#!/usr/bin/env python3
"""
Medical CRM - Unified Launcher
One-click startup for the entire Medical CRM system

This script replaces all the individual .bat files with a single,
cross-platform Python launcher that handles both backend and frontend startup.
"""

import subprocess
import time
import webbrowser
import os
import sys
import signal
from pathlib import Path

class MedicalCRMLauncher:
    def __init__(self):
        self.backend_process = None
        self.frontend_process = None
        self.project_root = Path.cwd()
        
    def check_requirements(self):
        """Check if we're in the right directory and have required tools"""
        print("🔍 Checking requirements...")
        
        # Check if we're in the right directory
        if not (self.project_root / "backend").exists() or not (self.project_root / "frontend").exists():
            print("❌ Error: Please run this script from the Medical CRM project root directory")
            print("   Make sure you can see the 'backend' and 'frontend' folders")
            return False
            
        # Check Python
        try:
            python_version = sys.version_info
            print(f"✅ Python {python_version.major}.{python_version.minor}.{python_version.micro} found")
        except Exception as e:
            print(f"❌ Python error: {e}")
            return False
            
        # Check if backend requirements are installed
        backend_venv = self.project_root / "backend" / "venv"
        if not backend_venv.exists():
            print("⚠️  Backend virtual environment not found. Please run setup first.")
            print("   You can use: python scripts/setup_environment.py")
            return False
            
        # Check if frontend node_modules exist
        frontend_modules = self.project_root / "frontend" / "node_modules"
        if not frontend_modules.exists():
            print("⚠️  Frontend dependencies not found. Please run setup first.")
            print("   You can use: python scripts/setup_environment.py")
            return False
            
        return True
        
    def start_backend(self):
        """Start the Flask backend server"""
        print("📡 Starting Flask backend...")
        
        try:
            # Change to backend directory and activate virtual environment
            backend_dir = self.project_root / "backend"
            python_exe = backend_dir / "venv" / "Scripts" / "python.exe"
            
            if not python_exe.exists():
                print("❌ Backend virtual environment not found")
                return False
                
            self.backend_process = subprocess.Popen([
                str(python_exe), "run.py"
            ], cwd=str(backend_dir))
            
            # Wait a moment for backend to start
            time.sleep(3)
            
            # Check if backend started successfully
            if self.backend_process.poll() is not None:
                print("❌ Backend failed to start")
                return False
                
            print("✅ Backend started successfully on http://localhost:5000")
            return True
            
        except Exception as e:
            print(f"❌ Error starting backend: {e}")
            return False
            
    def start_frontend(self):
        """Start the React frontend development server"""
        print("⚛️ Starting React frontend...")
        
        try:
            frontend_dir = self.project_root / "frontend"
            
            # Check if npm is available
            try:
                subprocess.run(["npm", "--version"], check=True, capture_output=True)
            except (subprocess.CalledProcessError, FileNotFoundError):
                print("❌ npm not found. Please install Node.js")
                return False
                
            self.frontend_process = subprocess.Popen([
                "npm", "run", "dev"
            ], cwd=str(frontend_dir))
            
            # Wait for frontend to start
            time.sleep(5)
            
            # Check if frontend started successfully
            if self.frontend_process.poll() is not None:
                print("❌ Frontend failed to start")
                return False
                
            print("✅ Frontend started successfully on http://localhost:3000")
            return True
            
        except Exception as e:
            print(f"❌ Error starting frontend: {e}")
            return False
            
    def open_browser(self):
        """Open the application in the default browser"""
        print("🌐 Opening browser...")
        try:
            webbrowser.open("http://localhost:3000")
            print("✅ Browser opened to http://localhost:3000")
        except Exception as e:
            print(f"⚠️  Could not open browser automatically: {e}")
            print("   Please manually open http://localhost:3000")
            
    def stop_services(self):
        """Stop all running services"""
        print("\n🛑 Stopping services...")
        
        if self.frontend_process:
            try:
                self.frontend_process.terminate()
                print("✅ Frontend stopped")
            except:
                pass
                
        if self.backend_process:
            try:
                self.backend_process.terminate()
                print("✅ Backend stopped")
            except:
                pass
                
        print("✅ All services stopped")
        
    def run(self):
        """Main launcher function"""
        print("🚀 Medical CRM - Unified Launcher")
        print("=" * 50)
        
        # Check requirements
        if not self.check_requirements():
            return False
            
        # Start backend
        if not self.start_backend():
            return False
            
        # Start frontend
        if not self.start_frontend():
            self.stop_services()
            return False
            
        # Open browser
        self.open_browser()
        
        # Success message
        print("\n" + "=" * 50)
        print("✅ Medical CRM is running successfully!")
        print("   Backend:  http://localhost:5000")
        print("   Frontend: http://localhost:3000")
        print("   Press Ctrl+C to stop all services")
        print("=" * 50)
        
        # Set up signal handler for graceful shutdown
        def signal_handler(sig, frame):
            self.stop_services()
            sys.exit(0)
            
        signal.signal(signal.SIGINT, signal_handler)
        
        # Keep running until interrupted
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            self.stop_services()
            
        return True

def main():
    launcher = MedicalCRMLauncher()
    success = launcher.run()
    
    if not success:
        print("\n❌ Failed to start Medical CRM")
        print("   Please check the error messages above and try again")
        sys.exit(1)

if __name__ == "__main__":
    main()
