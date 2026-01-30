# CrackX Mobile Application

A comprehensive offline-first road damage detection and reporting system built with React Native (Expo).

## Features

### Core Functionality
- ✅ **Offline-First Architecture** - Works without internet at road sites
- ✅ **Role-Based Access** - Citizen, RSO, and Admin roles
- ✅ **AI Damage Detection** - Mock YOLO-based detection (ready for real model integration)
- ✅ **GPS Location Tracking** - Automatic zone detection
- ✅ **Photo Capture** - Camera and gallery support
- ✅ **Multilingual Support** - English, Marathi, Hindi, Kannada
- ✅ **Sync Queue** - Offline reports sync when online

### User Roles

#### Citizen
- Report road damages with photos
- On-site or remote reporting modes
- View personal reports
- Sync reports when online

#### Road Safety Officer (RSO)
- View zone-specific complaints
- Sort by severity
- Mark repairs as completed
- Zone-isolated access

#### Admin
- System-wide analytics dashboard
- Zone performance monitoring
- Road Health Index (RHI) tracking
- Severity distribution visualization

## Demo Credentials

```
Username: demo
Password: demo123
```

Works for all three account types (select from dropdown on login screen).

## Tech Stack

- **Framework**: React Native (Expo)
- **Language**: TypeScript
- **Storage**: AsyncStorage
- **Location**: Expo Location
- **Camera**: Expo Camera + Image Picker
- **i18n**: react-i18next
- **Network**: @react-native-community/netinfo

## Installation

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on Android
npm run android

# Run on Web
npm run web
```

## Project Structure

```
crackx-app/
├── src/
│   ├── screens/          # All screen components
│   │   ├── LoginScreen.tsx
│   │   ├── LocationPermissionScreen.tsx
│   │   ├── CitizenHomeScreen.tsx
│   │   ├── RSOHomeScreen.tsx
│   │   ├── AdminHomeScreen.tsx
│   │   ├── ReportDamageScreen.tsx
│   │   └── MyReportsScreen.tsx
│   ├── services/         # Business logic services
│   │   ├── auth.ts
│   │   ├── storage.ts
│   │   ├── location.ts
│   │   ├── ai.ts
│   │   └── sync.ts
│   ├── types/            # TypeScript type definitions
│   ├── constants/        # App constants and configuration
│   ├── i18n/             # Internationalization
│   └── utils/            # Utility functions
├── App.tsx               # Main app component
└── app.json              # Expo configuration
```

## Key Features Implementation

### Offline-First
- All reports stored locally in AsyncStorage
- Sync queue for pending uploads
- Network detection before sync attempts

### Location & Zones
- GPS permission flow on first launch
- Automatic zone detection (Zone 1, Zone 4, Zone 18)
- Manual address entry fallback

### AI Detection (Mock)
- Simulates YOLO model inference
- Generates damage type, confidence, severity
- Ready for TensorFlow Lite integration

### Multilingual
- Bundled language files
- Offline language switching
- English and Marathi translations included

## Permissions Required

- **Location** - For accurate damage reporting and zone routing
- **Camera** - For capturing damage photos
- **Media Library** - For selecting existing photos

## Future Enhancements

1. **Real AI Model Integration**
   - Convert `model/best.pt` to TensorFlow Lite
   - Integrate on-device inference
   - Real bounding box visualization

2. **Backend Integration**
   - REST API for sync
   - Cloud storage for images
   - Real-time updates

3. **Enhanced Features**
   - Offline maps with Mapbox
   - Push notifications
   - Advanced analytics

## License

Developed for academic, research, and civic-tech use.
