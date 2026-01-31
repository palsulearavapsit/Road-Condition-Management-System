#!/usr/bin/env python3
"""
CrackX Application Launcher
Starts both backend and frontend services automatically
"""

import os
import sys
import subprocess
import time
import signal
from pathlib import Path

# Colors for terminal output
class Colors:
    GREEN = '\033[92m'
    BLUE = '\033[94m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_banner():
    """Print CrackX startup banner"""
    banner = f"""
{Colors.BOLD}{Colors.BLUE}╔═══════════════════════════════════════════════════════╗
║                                                       ║
║              🚀 CrackX Application Launcher 🚀       ║
║                                                       ║
║         AI-Powered Road Condition Management          ║
║              Solapur Municipal Corporation            ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝{Colors.END}
    """
    print(banner)

def check_prerequisites():
    """Check if required directories and files exist"""
    print(f"\n{Colors.YELLOW}⚙️  Checking prerequisites...{Colors.END}")
    
    current_dir = Path.cwd()
    backend_dir = current_dir / "backend"
    frontend_dir = current_dir / "crackx-app"
    
    # Check backend
    if not backend_dir.exists():
        print(f"{Colors.RED}❌ Error: 'backend' folder not found!{Colors.END}")
        return False
    
    if not (backend_dir / "server.py").exists():
        print(f"{Colors.RED}❌ Error: 'backend/server.py' not found!{Colors.END}")
        return False
    
    # Check frontend
    if not frontend_dir.exists():
        print(f"{Colors.RED}❌ Error: 'crackx-app' folder not found!{Colors.END}")
        return False
    
    if not (frontend_dir / "package.json").exists():
        print(f"{Colors.RED}❌ Error: 'crackx-app/package.json' not found!{Colors.END}")
        return False
    
    print(f"{Colors.GREEN}✅ All prerequisites found!{Colors.END}")
    return True

def start_backend():
    """Start Flask backend server"""
    print(f"\n{Colors.BLUE}🔧 Starting Backend Server...{Colors.END}")
    print(f"{Colors.YELLOW}   Location: backend/server.py{Colors.END}")
    print(f"{Colors.YELLOW}   URL: http://localhost:5000{Colors.END}\n")
    
    backend_dir = Path.cwd() / "backend"
    
    # Start backend process
    if sys.platform == "win32":
        # Windows
        backend_process = subprocess.Popen(
            ["python", "server.py"],
            cwd=str(backend_dir),
            creationflags=subprocess.CREATE_NEW_CONSOLE
        )
    else:
        # Linux/Mac
        backend_process = subprocess.Popen(
            ["python3", "server.py"],
            cwd=str(backend_dir)
        )
    
    time.sleep(2)  # Wait for backend to start
    print(f"{Colors.GREEN}✅ Backend server started!{Colors.END}")
    return backend_process

def start_frontend():
    """Start Expo frontend - WEB VERSION"""
    print(f"\n{Colors.BLUE}🌐 Starting Web App in Browser...{Colors.END}")
    print(f"{Colors.YELLOW}   Location: crackx-app/{Colors.END}")
    print(f"{Colors.YELLOW}   Opening at: http://localhost:19006{Colors.END}\n")
    
    frontend_dir = Path.cwd() / "crackx-app"
    
    # Start frontend process with --web flag to directly open web version
    if sys.platform == "win32":
        # Windows - Start web version directly
        frontend_process = subprocess.Popen(
            ["npx", "expo", "start", "--web"],
            cwd=str(frontend_dir),
            creationflags=subprocess.CREATE_NEW_CONSOLE,
            shell=True
        )
    else:
        # Linux/Mac
        frontend_process = subprocess.Popen(
            ["npx", "expo", "start", "--web"],
            cwd=str(frontend_dir),
            shell=True
        )
    
    time.sleep(3)  # Wait for frontend to start
    print(f"{Colors.GREEN}✅ Frontend app started!{Colors.END}")
    return frontend_process

def print_instructions():
    """Print usage instructions"""
    instructions = f"""
{Colors.BOLD}{Colors.GREEN}🎉 CrackX Web App is now running!{Colors.END}

{Colors.BOLD}🌐 Access Points:{Colors.END}
   • Backend API: http://localhost:5000
   • Web App: http://localhost:19006
   • The web app should open automatically in your browser
   
{Colors.BOLD}💡 For Mobile App:{Colors.END}
   • Use 'eas build' to create APK (see DEPLOYMENT_GUIDE.md)
   • APK can be distributed separately
   
{Colors.BOLD}⚠️  To Stop:{Colors.END}
   • Close this window, or
   • Press Ctrl+C in this terminal, or
   • Close the backend and frontend console windows

{Colors.BOLD}📚 Documentation:{Colors.END}
   • See SETUP_GUIDE.md for setup instructions
   • See DEPLOYMENT_GUIDE.md for APK build & deployment
   
{Colors.YELLOW}Keeping this window open...{Colors.END}
{Colors.YELLOW}Press Ctrl+C to stop all services{Colors.END}
    """
    print(instructions)

def cleanup(backend_process, frontend_process):
    """Clean up processes on exit"""
    print(f"\n{Colors.YELLOW}🛑 Stopping services...{Colors.END}")
    
    if backend_process:
        backend_process.terminate()
        print(f"{Colors.GREEN}✅ Backend stopped{Colors.END}")
    
    if frontend_process:
        frontend_process.terminate()
        print(f"{Colors.GREEN}✅ Frontend stopped{Colors.END}")
    
    print(f"\n{Colors.BOLD}👋 CrackX stopped. Goodbye!{Colors.END}\n")

def main():
    """Main execution function"""
    backend_process = None
    frontend_process = None
    
    try:
        # Print banner
        print_banner()
        
        # Check prerequisites
        if not check_prerequisites():
            print(f"\n{Colors.RED}❌ Prerequisites check failed!{Colors.END}")
            print(f"{Colors.YELLOW}Make sure you're running this from the RCMS folder{Colors.END}\n")
            sys.exit(1)
        
        # Start services
        backend_process = start_backend()
        frontend_process = start_frontend()
        
        # Print instructions
        print_instructions()
        
        # Keep running
        print(f"{Colors.BOLD}Monitoring services...{Colors.END}")
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Received stop signal (Ctrl+C){Colors.END}")
        cleanup(backend_process, frontend_process)
    except Exception as e:
        print(f"\n{Colors.RED}❌ Error: {e}{Colors.END}")
        cleanup(backend_process, frontend_process)
        sys.exit(1)

if __name__ == "__main__":
    # Change to script directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    print(f"{Colors.BLUE}Working directory: {os.getcwd()}{Colors.END}")
    
    main()
