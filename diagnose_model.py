import os
import requests
from ultralytics import YOLO
from PIL import Image
import numpy as np

def diagnose():
    print("=== MODEL DIAGNOSIS START ===")
    
    # 1. Check the image received from frontend
    debug_img_path = "backend/debug_received_image.jpg"
    if os.path.exists(debug_img_path):
        try:
            img = Image.open(debug_img_path)
            data = np.array(img)
            print(f"Debug Image found: {debug_img_path}")
            print(f"Size: {img.size}")
            print(f"Stats - Min: {data.min()}, Max: {data.max()}, Mean: {data.mean():.2f}")
            if data.max() == 0:
                print("⚠️ CRITICAL: The received image is completely BLACK (all zeros). Upload failed.")
            elif data.std() < 5:
                print("⚠️ WARNING: The received image has very low contrast (almost valid color).")
            else:
                print("✅ Image seems to contain valid pixel data.")
        except Exception as e:
            print(f"❌ Error analyzing debug image: {e}")
    else:
        print(f"❌ Debug image not found at {debug_img_path}")

    # 2. Test Model on a KNOWN Good Pothole Image
    model_path = "backend/model/best.pt"
    print(f"\nTesting Model: {model_path}")
    
    try:
        model = YOLO(model_path)
        print(f"Model classes: {model.names}")
        
        # Download sample
        sample_url = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Large_pothole_on_road.jpg/800px-Large_pothole_on_road.jpg"
        print(f"\nDownloading valid sample pothole from: {sample_url}")
        
        img_data = requests.get(sample_url).content
        with open("sample_pothole.jpg", "wb") as f:
            f.write(img_data)
            
        print("Running inference on Sample Pothole (conf=0.1)...")
        results = model("sample_pothole.jpg", conf=0.1, verbose=True)
        
        if len(results[0].boxes) > 0:
            print(f"✅ SUCCESS on Sample! Found {len(results[0].boxes)} objects.")
            for box in results[0].boxes:
                print(f"   - Class: {model.names[int(box.cls)]}, Conf: {float(box.conf):.2f}")
            print("Conclusion: The model WORKS on clear images.")
        else:
            print("❌ FAILURE on Sample! Model found NOTHING on a clear pothole.")
            print("Conclusion: The model is likely defective or under-trained.")
            
    except Exception as e:
        print(f"❌ Error running diagnostic inference: {e}")

    print("=== DIAGNOSIS END ===")

if __name__ == "__main__":
    diagnose()
