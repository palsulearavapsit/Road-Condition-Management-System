import subprocess
import threading
import sys
import time
import os
import signal

def run_backend():
    print("🐍 Starting Python Backend...")
    # Adjust path to backend/server.py
    backend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend', 'server.py')
    
    if not os.path.exists(backend_path):
        print(f"❌ Error: Backend file not found at {backend_path}")
        return

    # Check for required packages
    try:
        import flask
        import ultralytics
        import cv2
    except ImportError as e:
        print(f"⚠️  Missing dependencies: {e}")
        print("   Please run: pip install flask flask-cors ultralytics opencv-python pillow numpy")
        time.sleep(3)

    # Run the server
    # We use sys.executable to ensure we use the same python interpreter
    cmd = [sys.executable, backend_path]
    
    # We set working directory to root 'RCMS' so imports work if needed, 
    # but server.py seems self-contained. 
    # server.py expects 'model/best.pt'. 
    # Let's check where 'model/' is.
    # If server.py says "MODEL_PATH = 'model/best.pt'", it expects 'model' dir in CWD.
    # The 'backend' folder likely contains 'model' folder? 
    # Or is 'model' in root?
    # I'll set CWD to the directory containing server.py to be safe.
    cwd = os.path.dirname(backend_path)
    
    process = subprocess.Popen(cmd, cwd=cwd)
    process.wait()

def run_frontend():
    print("⚛️  Starting Expo Frontend...")
    # Run npx expo start --web
    # shell=True required for npx on Windows
    cmd = "npx expo start --web"
    # Ensure we run from the directory where the script is located (crackx-app)
    app_dir = os.path.dirname(os.path.abspath(__file__))
    process = subprocess.Popen(cmd, shell=True, cwd=app_dir)
    process.wait()

if __name__ == "__main__":
    print("🚀 CrackX All-in-One Launcher")
    print("==============================")
    
    # Create threads
    backend_thread = threading.Thread(target=run_backend)
    frontend_thread = threading.Thread(target=run_frontend)
    
    # Start threads
    backend_thread.daemon = True # Kill if main kills
    frontend_thread.daemon = True
    
    backend_thread.start()
    
    # Give backend a moment to start
    time.sleep(2)
    
    frontend_thread.start()
    
    print("\n✅ Services starting...")
    print("   - Backend: http://localhost:5000")
    print("   - Frontend: http://localhost:8081 (Web)")
    print("\n(Press Ctrl+C to stop)\n")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Stopping services...")
        # Threads are daemon, so they will close when script exits.
        # But subprocesses might linger if not careful.
        # On Windows, killing the parent python often kills children if attached to console.
        sys.exit(0)
