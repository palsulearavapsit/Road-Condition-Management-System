# Road Damage Detection Inference Backend

This service provides road damage detection using a TensorFlow frozen inference graph (SSD ResNet).
It is designed to be used by the CrackX mobile/web application.

## Prerequisites

- Python 3.8+ (Tested with 3.11)
- TensorFlow 2.16.1
- FastAPI

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Starting the Service

Run the provided script:
```bash
start.bat
```
Or manually:
```bash
python main.py
```
The server will start on port 5000: `http://0.0.0.0:5000`.

## API Endpoints

### `POST /api/detect`
Performs object detection on an image.

- **Payload**: `multipart/form-data` with `image` file.
- **Response**: JSON
  ```json
  {
      "success": true,
      "detection": {
          "damageType": "crack" | "pothole",
          "confidence": 0.85,
          "severity": "low" | "medium" | "high",
          "boundingBox": {
              "y": 0.1,
              "x": 0.2,
              "height": 0.3,
              "width": 0.4
          }
      }
  }
  ```

### `GET /health`
Returns service status.

## Model
The model is located at `model/frozen_inference_graph_resnet.pb`.
It detects:
- D00 (Longitudinal Crack) -> crack (low)
- D10 (Transverse Crack) -> crack (low)
- D20 (Alligator Crack) -> crack (medium)
- D40 (Pothole) -> pothole (high)

Severity is dynamically adjusted based on confidence and detection size within the frame.
