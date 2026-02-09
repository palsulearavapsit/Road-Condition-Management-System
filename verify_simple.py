from ultralytics import YOLO
import sys

# Mute stdout buffering
sys.stdout.reconfigure(line_buffering=True)

print("Starting Simple Model Verification...")

try:
    model = YOLO("backend/model/best.pt")
    # Download sample manually if needed, or just create a dummy if requests fails
    # But let's assume sample_pothole.jpg exists from previous attempt
    
    print("Running inference...")
    # Using save=False to avoid unexpected path issues
    # Using conf=0.01 to see if it sees ANYTHING
    results = model("sample_pothole.jpg", conf=0.01, verbose=True)
    
    if not results:
        print("❌ MODEL FAILURE: No results object returned.")
    else:
        count = len(results[0].boxes)
        if count > 0:
            print(f"✅ MODEL SUCCESS: Detected {count} objects in sample_pothole.jpg")
            for box in results[0].boxes:
                cls_id = int(box.cls[0])
                name = model.names[cls_id]
                conf = float(box.conf[0])
                print(f"   + {name} ({conf:.2f})")
        else:
            print("❌ MODEL WEAKNESS: Model found 0 objects in clear pothole image even at 1% confidence.")

except Exception as e:
    print(f"❌ CRITICAL ERROR: {e}")
    import traceback
    traceback.print_exc()

print("Verification Complete.")
