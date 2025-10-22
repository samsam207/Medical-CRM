#!/usr/bin/env python3
"""
Medical CRM - Environment Setup Script
Automatically sets up the development environment for Medical CRM
"""

import subprocess
import sys
import os
from pathlib import Path

class EnvironmentSetup:
    def __init__(self):
        self.project_root = Path.cwd()
        self.backend_dir = self.project_root / "backend"
        self.frontend_dir = self.project_root / "frontend"
        
    def check_python(self):
        """Check if Python is available"""
        print("🐍 Checking Python...")
        try:
            version = sys.version_info
            print(f"✅ Python {version.major}.{version.minor}.{version.micro} found")
            return True
        except Exception as e:
            print(f"❌ Python error: {e}")
            return False
            
    def check_node(self):
        """Check if Node.js and npm are available"""
        print("📦 Checking Node.js...")
        try:
            result = subprocess.run(["node", "--version"], capture_output=True, text=True)
            if result.returncode == 0:
                print(f"✅ Node.js {result.stdout.strip()} found")
            else:
                print("❌ Node.js not found")
                return False
                
            result = subprocess.run(["npm", "--version"], capture_output=True, text=True)
            if result.returncode == 0:
                print(f"✅ npm {result.stdout.strip()} found")
                return True
            else:
                print("❌ npm not found")
                return False
        except FileNotFoundError:
            print("❌ Node.js not found. Please install Node.js from https://nodejs.org/")
            return False
            
    def setup_backend(self):
        """Set up Python backend environment"""
        print("\n🔧 Setting up backend...")
        
        # Create virtual environment
        venv_path = self.backend_dir / "venv"
        if not venv_path.exists():
            print("📦 Creating Python virtual environment...")
            try:
                subprocess.run([sys.executable, "-m", "venv", str(venv_path)], check=True)
                print("✅ Virtual environment created")
            except subprocess.CalledProcessError as e:
                print(f"❌ Failed to create virtual environment: {e}")
                return False
        else:
            print("✅ Virtual environment already exists")
            
        # Install requirements
        print("📦 Installing Python dependencies...")
        python_exe = venv_path / "Scripts" / "python.exe"
        requirements_file = self.backend_dir / "requirements.txt"
        
        if not requirements_file.exists():
            print("❌ requirements.txt not found in backend directory")
            return False
            
        try:
            subprocess.run([str(python_exe), "-m", "pip", "install", "-r", str(requirements_file)], check=True)
            print("✅ Python dependencies installed")
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to install Python dependencies: {e}")
            return False
            
        return True
        
    def setup_frontend(self):
        """Set up Node.js frontend environment"""
        print("\n🔧 Setting up frontend...")
        
        # Check if package.json exists
        package_json = self.frontend_dir / "package.json"
        if not package_json.exists():
            print("❌ package.json not found in frontend directory")
            return False
            
        # Install dependencies
        print("📦 Installing Node.js dependencies...")
        try:
            subprocess.run(["npm", "install"], cwd=str(self.frontend_dir), check=True)
            print("✅ Node.js dependencies installed")
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to install Node.js dependencies: {e}")
            return False
            
        return True
        
    def create_env_file(self):
        """Create .env file from example"""
        print("\n📝 Setting up environment file...")
        
        env_example = self.backend_dir / "env.example"
        env_file = self.backend_dir / ".env"
        
        if env_example.exists() and not env_file.exists():
            try:
                import shutil
                shutil.copy2(env_example, env_file)
                print("✅ Environment file created from example")
            except Exception as e:
                print(f"⚠️  Could not create .env file: {e}")
        else:
            print("✅ Environment file already exists")
            
        return True
        
    def run(self):
        """Run the complete setup process"""
        print("🚀 Medical CRM - Environment Setup")
        print("=" * 50)
        
        # Check requirements
        if not self.check_python():
            return False
            
        if not self.check_node():
            return False
            
        # Setup backend
        if not self.setup_backend():
            return False
            
        # Setup frontend
        if not self.setup_frontend():
            return False
            
        # Create env file
        if not self.create_env_file():
            return False
            
        print("\n" + "=" * 50)
        print("✅ Environment setup completed successfully!")
        print("   You can now run: python scripts/start_project.py")
        print("=" * 50)
        
        return True

def main():
    setup = EnvironmentSetup()
    success = setup.run()
    
    if not success:
        print("\n❌ Setup failed. Please check the error messages above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
