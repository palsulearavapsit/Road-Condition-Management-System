# CrackX — Road Damage Detection & Analysis

CrackX is an AI-powered computer vision system for detecting and analyzing road surface damages such as cracks, potholes, and surface corruptions using deep learning. It is designed to help municipalities, researchers, and infrastructure teams automatically assess road conditions from images.

---

## 🚀 Features

- Detects multiple types of road damage:
  - Longitudinal cracks
  - Transverse cracks
  - Alligator cracks
  - Potholes
  - Other surface corruptions
- Trained using YOLO-based object detection.
- Outputs bounding boxes with confidence scores.
- Designed to scale for large road image datasets.
- Can be extended to support:
  - Severity scoring
  - Repair prioritization
  - Road Health Index computation

---

## 🧠 Model

- Architecture: YOLO (Ultralytics)
- Input: Road surface images
- Output: Bounding boxes + class labels + confidence scores
- Training dataset: Custom labeled dataset of road damages

---

## 📂 Repository Structure

CrackX/  
├── model/ # Trained model files (best.pt)  
├── predictions/ # Sample prediction outputs  
├── CrackX_Approach.pdf # Detailed methodology & approach  
├── Dataset_Link # Shortcut/link to dataset source  
└── README.md # This file

---

## 🔧 How It Works

1. Input road images are passed into the trained YOLO model.
2. The model detects damage types and localizes them in the image.
3. The output is saved as bounding box predictions with confidence values.
4. These predictions can be used to build:
   - Damage statistics
   - Road condition reports
   - Maintenance prioritization systems

---

## 📊 Use Cases

- Smart city infrastructure monitoring
- Automated road inspection
- Maintenance planning & optimization
- Research in civil engineering and computer vision

---

## 🛠️ Technologies Used

- Python
- PyTorch
- Ultralytics YOLO
- OpenCV

---

## 📌 Future Improvements

- Severity scoring based on crack size and density
- Repair priority ranking system
- City-level Road Health Index
- Real-time mobile or drone-based deployment

---

## 📜 License

This project is for academic and research purposes.
