# 🚧 CrackX

CrackX is an **offline-first, lightweight road damage detection system** that uses **on-device AI** to detect road cracks, estimate severity, and support efficient repair workflows.  
It is designed to work reliably in **low-network or no-network environments** and runs smoothly on **Android mobile devices and laptops**.

---

## 🧠 Core Principle

- 📴 Offline-first architecture
- 🚫 Works even without internet at the road site
- 🌐 Internet is used **only when absolutely required**
- ⚡ Lightweight, fast, and reliable
- 📱💻 Supports Android mobile and laptop (Expo Web / Emulator)

---

## 🔌 ONLINE vs OFFLINE (Very Clear)

### 📴 Works OFFLINE (Most of the App)

- 📸 Photo capture
- 🤖 AI detection (YOLO model)
- 🟥 Bounding boxes with 📊 confidence score
- 🛣️ Damage type identification
- 🚦 Crack severity estimation (Low / Medium / High)
- 📍 GPS capture (stored locally)
- 📦 Offline submission queue
- 🛣️ Road-wise data aggregation (for road health analysis)
- 🌍 Multilingual UI (works fully offline)

---

### 🌐 ONLINE (ONLY WHEN REQUIRED)

1. 🔄 Sync reported issues to server
2. 🗺️ Map / Zone resolution (when network is available)

👉 Everything else works offline.

---

## 👥 USERS & FEATURES (OFFLINE-FIRST)

### 👤 Citizen / Customer

#### 📴 What Works OFFLINE

- 📸 **Capture Photo**
  - Uses phone camera

- 🤖 **On-Device AI Detection**
  - YOLO model runs locally
  - Displays:
    - 🛣️ Damage type
    - 🟥 Bounding box
    - 📊 Confidence score
    - 🚦 Crack severity level

- 📍 **GPS Capture**
  - Location saved locally
  - No internet required

- 📦 **Offline Submission Queue**
  - 📴 If no internet:
    - 📁 Report is saved locally
    - ⏳ Marked as **“Pending Sync”**

---

#### 🌐 What Needs INTERNET (Minimal)

- 🔄 **One-Tap Sync**
  - Upload photo + detection result + GPS when internet is available

- 🗺️ **Zone Mapping**
  - Nearest municipal zone fetched once
  - Zone data cached for future offline use

---

#### ✅ Citizen Benefits

- Works in low-network and no-network areas
- No dependency on continuous internet
- Fast reporting using on-device AI
- Smooth performance even on low-end Android devices

---

### 🚓 Road Safety Officer (RSO)

#### 📴 What Works OFFLINE

- 📋 View assigned issues (cached locally)
- 🚦 View crack severity for prioritization
- 📸 Upload repair proof photos
- 📝 Status updates saved locally until sync

#### 🌐 What Needs INTERNET

- 🔄 Sync with municipal server
- 🗺️ Map view (optional)
- 🚨 Emergency contact activation

🔒 RSO phone number is never visible offline  
➡️ Prevents misuse for non-critical issues

---

### 🧑‍💼 Admin (Mostly Online, Lightweight)

- 📊 Model status monitoring
- 📑 Reports & summaries
- 🛣️ Road Health Index monitoring
- 🗺️ Zone-wise analytics
- 🚦 Severity-based repair prioritization
- 🔄 Sync monitoring

---

## 🔁 OFFLINE-FIRST APP FLOW

1. 📴 Citizen captures photo
2. 🤖 AI runs locally and detects damage + severity
3. 📍 GPS stored and report saved locally
4. 🌐 User taps **Sync Reports** when internet is available
5. 🗺️ Zone resolved using maps
6. 📴/🌐 RSO repairs road and uploads proof
7. 🌐 Admin monitors full lifecycle and road condition trends

---

## 🗺️ Map Strategy (Offline-Optimized)

- 🗺️ Uses **Mapbox SDK**
- 📥 Municipal / zone boundaries downloaded once
- 💾 Cached locally for offline GPS-based detection
- Used for:
  - Road-wise issue grouping
  - Repair tracking
  - Road Health Index calculation

🌐 Internet required only for:

- First-time setup
- Map / zone updates

---

## 🛣️ Road Health Index (RHI)

- Calculates overall condition of each road segment
- Based on:
  - Number of reported damages
  - 🚦 Severity of cracks
  - 🔧 Repair frequency and history
  - 📍 GPS-based road mapping

- Helps authorities:
  - Identify frequently damaged roads
  - Prioritize repairs efficiently
  - Plan long-term infrastructure maintenance

---

## 🌍 Multilingual Support (Offline)

- UI works fully offline in multiple languages
- Supported languages:
  - 🇮🇳 Marathi
  - 🇮🇳 Hindi
  - 🇮🇳 Kannada
  - 🇬🇧 English
- Language files bundled inside the app
- No internet required for language switching

---

## 🧰 VERY LIGHTWEIGHT TECH STACK

### 📱 Frontend (Mobile + Laptop)

- React Native (Expo)
- Optimized for low memory and power usage
- Runs on:
  - 📱 Android mobile devices
  - 💻 Laptop (Expo Web / Android Emulator)

---

### 🤖 AI (Offline)

- YOLO-based detection model
- Converted to ONNX / TensorFlow Lite
- Runs fully on-device (no cloud inference)

---

### 💾 Local Storage

- SQLite / AsyncStorage
- Stores:
  - Reports
  - Images
  - GPS data
  - Severity level
  - Road health data
  - Sync status

---

### ☁️ Minimal Backend (Only for Sync)

- Simple REST API
- Single endpoint:
  POST /sync-reports
- Cloud storage for images and metadata

---

## ⭐ Unique Selling Points

- 📴 **True Offline-First Design**  
  Fully functional at road sites with zero internet dependency

- ⚡ **Ultra-Lightweight**  
  Runs smoothly on low-end Android devices and laptops

- 🤖 **On-Device AI**  
  No cloud inference → faster, private, and cost-efficient

- 🚦 **Severity-Aware Reporting**  
  Enables priority-based and faster repairs

- 🛣️ **Road Health Index**  
  Shifts from reactive fixing to data-driven road maintenance

- 🌍 **Multilingual & Inclusive**  
  Fully offline multilingual UI for wide public adoption

---

## 📄 License

Developed for academic, research, and civic-tech use.
