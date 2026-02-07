import requests
import time

url = "http://localhost:5000/api/detect"
image_path = "crackx-app/assets/icon.png"

try:
    with open(image_path, "rb") as image_file:
        files = {"image": image_file}
        response = requests.post(url, files=files)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Error: {e}")
