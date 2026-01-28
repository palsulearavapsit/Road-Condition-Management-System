# CrackX – Offline-First Road Damage Detection System

CrackX is an offline-first mobile application that uses on-device AI to detect road damage and report issues efficiently, even in low or no internet connectivity areas. The system is designed for citizens, road safety officers, and municipal administrators, ensuring fast reporting, reliable syncing, and minimal network dependency.

---

## Problem Statement

Road damage often goes unreported or is delayed due to poor internet connectivity, manual reporting processes, and lack of real-time verification. CrackX addresses these challenges by enabling AI-powered road damage detection directly on the device and allowing reports to be created and stored fully offline.

---

## Core Design Principle

**Offline-first by default.**  
Internet connectivity is used only when absolutely necessary.

---

## Features

### Offline Features (Primary)

- Road image capture using device camera
- On-device AI detection using YOLO
- Damage classification with bounding boxes
- Confidence score display
- GPS location capture and local storage
- Multilingual user interface:
  - Marathi
  - Kannada
  - Hindi
  - English
- Offline issue queue with sync status tracking

### Online Features (Minimal)

- One-tap report synchronization
- Zone and municipal area resolution (cached for offline use)

---

## User Roles

### Citizen

- Capture road damage photos offline
- View instant AI detection results
- Store reports locally without internet
- Sync reports when connectivity is available

### Road Safety Officer (RSO)

**Offline**

- View cached assigned issues
- Upload repair proof photos
- Update repair status (stored locally)

**Online**

- Sync updates with the server
- Optional map view
- Emergency contact activation

_RSO contact details are hidden offline to prevent misuse._

### Admin

- Monitor AI model status
- View reports and summaries
- Zone-wise analytics
- Track issue lifecycle and sync status

---

## Application Flow

1. Citizen captures road image (offline)
2. AI model runs locally and detects damage
3. GPS data is stored on-device
4. Report is saved as Pending Sync
5. User syncs when internet is available
6. Zone is resolved and issue assigned to RSO
7. RSO completes repair and uploads proof
8. Admin monitors the full workflow

---

## Map Strategy

- Uses Mapbox SDK
- Municipal zone boundaries downloaded once
- Zones cached locally for offline GPS-based detection
- Internet required only for first-time setup and map updates

---

## Technology Stack

### Frontend

- React Native (Expo)
- Runs on Android devices and Expo Web

### AI / ML

- YOLO-based object detection
- Model converted to TensorFlow Lite / ONNX
- Fully on-device inference

### Local Storage

- SQLite / AsyncStorage
- Stores reports, images, GPS data, and sync status

### Backend

- Lightweight REST API
- Single endpoint:
  POST /sync-reports
- Cloud storage for images and metadata

---

## Language Support

- Offline preloaded translation files
- Supported languages:
- Marathi
- Kannada
- Hindi
- English

---

## Advantages

- Works in remote and low-connectivity areas
- Faster reporting using on-device AI
- Minimal bandwidth and backend usage
- Scalable for municipal deployment
- Privacy-friendly and cost-efficient

---

## Future Enhancements

- Incremental AI model updates
- Expanded damage categories
- Advanced analytics dashboard
- Smart city platform integration

---

## License

Developed for academic, research, and civic-tech use.
