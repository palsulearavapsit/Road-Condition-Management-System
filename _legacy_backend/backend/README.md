# CrackX Backend API

Flask-based backend server with real YOLO model integration for road damage detection.

## Features

- ✅ **Real YOLO Model Integration** - Uses converted ONNX model for inference
- ✅ **AI Detection API** - POST endpoint for damage detection
- ✅ **Report Sync** - Handles offline report synchronization
- ✅ **Analytics** - System-wide and zone-wise analytics
- ✅ **CORS Enabled** - Works with React Native mobile app
- ✅ **In-Memory Database** - Demo storage (replace with PostgreSQL/MongoDB for production)

## Installation

### Prerequisites
- Python 3.8+
- YOLO model converted to ONNX (see `convert_model_to_onnx.py`)

### Install Dependencies
```bash
pip install flask flask-cors ultralytics pillow opencv-python onnx onnxruntime
```

## Running the Server

### Start Backend Server
```bash
cd backend
python server.py
```

Server will start at: `http://localhost:5000`

## API Endpoints

### Health Check
```http
GET /health
```

Response:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "timestamp": "2026-01-30T23:30:00"
}
```

### AI Detection
```http
POST /api/detect
Content-Type: multipart/form-data

Body: image file
```

Response:
```json
{
  "success": true,
  "detection": {
    "damageType": "crack",
    "confidence": 0.87,
    "severity": "high",
    "boundingBox": {
      "x": 0.25,
      "y": 0.30,
      "width": 0.45,
      "height": 0.40
    },
    "class": 1,
    "className": "Alligator Crack"
  },
  "all_detections": [...],
  "count": 3
}
```

### Sync Reports
```http
POST /api/sync-reports
Content-Type: application/json

Body:
{
  "reports": [
    {
      "id": "report_123",
      "citizenId": "user_456",
      "location": {...},
      "photoUri": "...",
      "aiDetection": {...},
      ...
    }
  ]
}
```

Response:
```json
{
  "success": true,
  "synced": 5,
  "failed": 0,
  "total": 5
}
```

### Get Reports
```http
GET /api/reports
GET /api/reports?zone=zone1
```

Response:
```json
{
  "success": true,
  "reports": [...],
  "count": 10
}
```

### Get Single Report
```http
GET /api/reports/{report_id}
```

### Update Report
```http
PUT /api/reports/{report_id}
Content-Type: application/json

Body:
{
  "status": "completed",
  "repairProofUri": "...",
  "repairCompletedAt": "2026-01-30T23:30:00"
}
```

### Get Analytics
```http
GET /api/analytics
```

Response:
```json
{
  "success": true,
  "analytics": {
    "total": 50,
    "pending": 20,
    "in_progress": 15,
    "completed": 15,
    "zones": {
      "zone1": 20,
      "zone4": 18,
      "zone18": 12
    },
    "severity": {
      "low": 15,
      "medium": 20,
      "high": 15
    }
  }
}
```

## Configuration

### For Android Emulator
Update API URLs in mobile app to use `10.0.2.2` instead of `localhost`:
```typescript
const API_BASE_URL = 'http://10.0.2.2:5000/api';
```

### For Physical Device
1. Find your computer's local IP address:
   - Windows: `ipconfig`
   - Mac/Linux: `ifconfig`
2. Update API URLs:
```typescript
const API_BASE_URL = 'http://192.168.X.X:5000/api';
```

## YOLO Model

### Classes Detected
- 0: Crack
- 1: Alligator Crack
- 2: Longitudinal Crack
- 3: Other Corruption
- 4: Pothole

### Model Conversion
The YOLO PyTorch model (`model/best.pt`) has been converted to ONNX format (`model/best.onnx`) for efficient inference.

## Storage

### Current Implementation
- In-memory storage (demo)
- Reports saved to `backend/reports/` as JSON files
- Uploaded images saved to `backend/uploads/`

### Production Recommendations
- Replace in-memory DB with PostgreSQL or MongoDB
- Use cloud storage (AWS S3, Google Cloud Storage) for images
- Add authentication and authorization
- Implement rate limiting
- Add logging and monitoring

## Testing

### Test AI Detection
```bash
curl -X POST http://localhost:5000/api/detect \
  -F "image=@path/to/damage.jpg"
```

### Test Health Check
```bash
curl http://localhost:5000/health
```

## Troubleshooting

### Model Not Loading
- Ensure `model/best.onnx` exists
- Check ONNX runtime installation: `pip install onnxruntime`

### CORS Errors
- CORS is enabled by default
- If issues persist, check Flask-CORS configuration

### Port Already in Use
- Change port in `server.py`: `app.run(port=5001)`

## Next Steps

1. ✅ Real YOLO model integrated
2. ✅ Backend API running
3. 🔄 Test with mobile app
4. 🔄 Deploy to production server
5. 🔄 Add database (PostgreSQL/MongoDB)
6. 🔄 Add authentication
7. 🔄 Add cloud storage for images

## License

Developed for academic, research, and civic-tech use.
